import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getAgencyWorkspaceErrorStatus, resolveAssistantScope } from "@/lib/agency-workspace";
import { getRealtorAssistantTypesForCategory } from "@/lib/realtor-assistant-ai";

const RealtorPostSchema = z
  .object({
    leadId: z.string().min(1),
    draft: z.string().min(1).max(2000),
  })
  .strict();

const AgencyManualPrioritySchema = z
  .object({
    context: z.literal("AGENCY").optional(),
    teamId: z.string().trim().min(1).optional(),
    targetType: z.enum(["LEAD", "CLIENT"]),
    targetId: z.string().trim().min(1),
    title: z.string().trim().min(3).max(120),
    message: z.string().trim().min(3).max(1000),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    actionUrl: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId");
    const requestedContext = url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR");
    const teamIdParam = url.searchParams.get("teamId") || null;
    const limitRaw = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");
    const orderRaw = url.searchParams.get("order");
    const q = url.searchParams.get("q");
    const priorityRaw = url.searchParams.get("priority");
    const categoryRaw = url.searchParams.get("category");
    const includeSnoozedRaw = url.searchParams.get("includeSnoozed");
    const limit = (() => {
      if (!limitRaw) return 100;
      const n = Number(limitRaw);
      if (!Number.isFinite(n)) return 100;
      return Math.min(200, Math.max(1, Math.floor(n)));
    })();

    const priority = (() => {
      const v = String(priorityRaw || "").trim().toUpperCase();
      if (v === "LOW" || v === "MEDIUM" || v === "HIGH") return v as any;
      return null;
    })();

    const category = (() => {
      const v = String(categoryRaw || "").trim();
      if (v === "Leads" || v === "Visitas" || v === "Lembretes" || v === "Outros" || v === "ALL") return v as any;
      return null;
    })();

    const includeSnoozed = (() => {
      if (includeSnoozedRaw == null) return true;
      const v = String(includeSnoozedRaw || "").trim().toLowerCase();
      if (v === "0" || v === "false" || v === "no") return false;
      return true;
    })();

    const order = (() => {
      const v = String(orderRaw || "").trim().toLowerCase();
      if (v === "cursor") return "CURSOR" as const;
      return "PRIORITY" as const;
    })();

    const now = new Date();

    const scope = await resolveAssistantScope({
      userId: String(userId),
      authRole: role ? String(role) : null,
      requestedContext,
      requestedTeamId: teamIdParam,
    });

    if (!scope.allowed || !scope.ownerId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: getAgencyWorkspaceErrorStatus(scope.reason) });
    }

    const baseWhere: any = {
      context: scope.context,
      ownerId: String(scope.ownerId),
      ...(leadId ? { leadId } : {}),
      ...(scope.context === "AGENCY" && scope.teamId ? { teamId: String(scope.teamId) } : {}),
    };

    baseWhere.status = includeSnoozed ? { in: ["ACTIVE", "SNOOZED"] } : "ACTIVE";

    if (priority) {
      baseWhere.priority = priority;
    }

    const qq = q ? String(q).trim() : "";
    if (qq) {
      baseWhere.OR = [
        { title: { contains: qq, mode: "insensitive" } },
        { message: { contains: qq, mode: "insensitive" } },
      ];
    }

    if (category && category !== "ALL") {
      if (category === "Outros") {
        const notIn = [
          ...getRealtorAssistantTypesForCategory("Leads"),
          ...getRealtorAssistantTypesForCategory("Visitas"),
          ...getRealtorAssistantTypesForCategory("Lembretes"),
        ];
        if (notIn.length > 0) {
          baseWhere.type = { notIn };
        }
      } else {
        const typeIn = getRealtorAssistantTypesForCategory(category);
        if (typeIn.length > 0) {
          baseWhere.type = { in: typeIn };
        }
      }
    }

    const [agg, effectiveActiveCount, snoozedFutureAgg] = await Promise.all([
      (prisma as any).assistantItem.aggregate({
        where: baseWhere,
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      includeSnoozed
        ? (prisma as any).assistantItem.count({
            where: {
              ...baseWhere,
              OR: [
                { status: "ACTIVE" },
                { status: "SNOOZED", snoozedUntil: { lte: now } },
              ],
            },
          })
        : (prisma as any).assistantItem.count({ where: baseWhere }),
      includeSnoozed
        ? (prisma as any).assistantItem.aggregate({
            where: {
              ...baseWhere,
              status: "SNOOZED",
              snoozedUntil: { gt: now },
            },
            _count: { _all: true },
            _min: { snoozedUntil: true },
          })
        : Promise.resolve({ _count: { _all: 0 }, _min: { snoozedUntil: null } } as any),
    ]);

    const totalCount = Number(agg?._count?._all || 0);
    const maxUpdatedAt = agg?._max?.updatedAt ? new Date(agg._max.updatedAt).getTime() : 0;
    const snoozedFutureCount = Number(snoozedFutureAgg?._count?._all || 0);
    const nextWakeAtMs = snoozedFutureAgg?._min?.snoozedUntil
      ? new Date(snoozedFutureAgg._min.snoozedUntil).getTime()
      : 0;

    const ETAG_VERSION = 2;
    const key = `${ETAG_VERSION}:${String(scope.ownerId)}:${scope.context}:${scope.teamId || "-"}:${leadId || "all"}:${limit}:${order}:${cursor || ""}:${qq || ""}:${priority || ""}:${category || ""}:${includeSnoozed ? "1" : "0"}`;
    const etag = `W/\"assistant-items:${key}:${maxUpdatedAt}:${totalCount}:${effectiveActiveCount}:${snoozedFutureCount}:${nextWakeAtMs}\"`;

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
    }

    const items = await RealtorAssistantService.list(String(scope.ownerId), {
      context: scope.context,
      teamId: scope.context === "AGENCY" ? scope.teamId || undefined : undefined,
      leadId: leadId || undefined,
      limit,
      order,
      cursor: cursor || undefined,
      query: qq || undefined,
      priority: priority || undefined,
      includeSnoozed,
      ...(category && category !== "ALL"
        ? category === "Outros"
          ? {
              typeNotIn: [
                ...getRealtorAssistantTypesForCategory("Leads"),
                ...getRealtorAssistantTypesForCategory("Visitas"),
                ...getRealtorAssistantTypesForCategory("Lembretes"),
              ],
            }
          : { typeIn: getRealtorAssistantTypesForCategory(category) }
        : null),
    });

    const nextCursor =
      order === "CURSOR" && Array.isArray(items) && items.length === limit
        ? String((items as any)[items.length - 1]?.id || "")
        : "";

    const res = NextResponse.json({ success: true, items, nextCursor: nextCursor || null });
    res.headers.set("ETag", etag);
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    console.error("Error fetching assistant items:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar o Assistente agora." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object" && "targetType" in (body as Record<string, unknown>)) {
      const parsed = AgencyManualPrioritySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
      }

      const scope = await resolveAssistantScope({
        userId: String(userId),
        authRole: role ? String(role) : null,
        requestedContext: parsed.data.context || "AGENCY",
        requestedTeamId: parsed.data.teamId || null,
      });

      if (!scope.allowed || scope.context !== "AGENCY" || !scope.ownerId || !scope.teamId) {
        return NextResponse.json({ error: "Acesso negado" }, { status: getAgencyWorkspaceErrorStatus(scope.reason) });
      }

      const teamId = String(scope.teamId);

      const team: any = await (prisma as any).team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          ownerId: true,
        },
      });

      if (!team) {
        return NextResponse.json({ error: "Time não encontrado." }, { status: 404 });
      }

      const ownerId = String(scope.ownerId);
      const targetId = String(parsed.data.targetId);
      const targetType = parsed.data.targetType;

      if (targetType === "LEAD") {
        const lead: any = await (prisma as any).lead.findUnique({
          where: { id: targetId },
          select: { id: true, teamId: true },
        });
        if (!lead || String(lead.teamId || "") !== String(teamId)) {
          return NextResponse.json({ error: "Lead não encontrado para este time." }, { status: 404 });
        }
      } else {
        const client: any = await (prisma as any).client.findUnique({
          where: { id: targetId },
          select: { id: true, teamId: true },
        });
        if (!client || String(client.teamId || "") !== String(teamId)) {
          return NextResponse.json({ error: "Cliente não encontrado para este time." }, { status: 404 });
        }
      }

      const actionUrl = parsed.data.actionUrl
        ? String(parsed.data.actionUrl)
        : targetType === "LEAD"
          ? `/agency/teams/${encodeURIComponent(String(teamId))}/crm?lead=${encodeURIComponent(targetId)}`
          : `/agency/clients?client=${encodeURIComponent(targetId)}`;

      const dedupeKey = `MANUAL_PRIORITY:${targetType}:${targetId}`;
      const item = await RealtorAssistantService.upsertFromRule({
        context: "AGENCY",
        ownerId,
        teamId: String(teamId),
        leadId: targetType === "LEAD" ? targetId : null,
        clientId: targetType === "CLIENT" ? targetId : null,
        type: "MANUAL_PRIORITY",
        priority: parsed.data.priority || "HIGH",
        title: String(parsed.data.title),
        message: String(parsed.data.message),
        dueAt: new Date(),
        dedupeKey,
        primaryAction: { type: "OPEN_PAGE", url: actionUrl },
        secondaryAction: null,
        metadata: {
          source: "INLINE",
          manualPriority: true,
          targetType,
          targetId,
          createdByUserId: String(userId),
        },
      });

      try {
        await RealtorAssistantService.emitItemUpdated(ownerId, item, { context: "AGENCY", teamId: String(teamId) });
      } catch {
      }

      await createAuditLog({
        level: "INFO",
        action: "AGENCY_ASSISTANT_MANUAL_PRIORITY_CREATE",
        message: `Priorização manual criada para ${targetType.toLowerCase()}.`,
        actorId: String(userId),
        actorRole: String(role || ""),
        targetType,
        targetId,
        metadata: {
          teamId: String(teamId),
          ownerId,
          assistantItemId: String(item.id),
          priority: item.priority,
        },
      });

      return NextResponse.json({ success: true, item });
    }

    if (role !== "ADMIN" && role !== "REALTOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const parsed = RealtorPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const leadId = String(parsed.data.leadId);
    const draft = String(parsed.data.draft).trim();

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        realtorId: true,
        team: {
          select: {
            ownerId: true,
          },
        },
        contact: { select: { name: true } },
        property: { select: { title: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const isTeamOwner = !!lead.team && String(lead.team.ownerId) === String(userId);
    const isAssignedRealtor = lead.realtorId && String(lead.realtorId) === String(userId);
    if (role !== "ADMIN" && !isAssignedRealtor && !isTeamOwner) {
      return NextResponse.json(
        { error: "Você só pode criar tarefas para leads que está atendendo ou dos times que lidera." },
        { status: 403 }
      );
    }

    const clientName = lead.contact?.name ? String(lead.contact.name) : "o cliente";
    const propertyTitle = lead.property?.title ? String(lead.property.title) : null;
    const title = "Responder lead";
    const message = propertyTitle
      ? `Responder ${clientName} sobre “${propertyTitle}”.`
      : `Responder ${clientName}.`;

    const dedupeKey = `AI_REPLY_TASK:${leadId}`;
    const dueAt = new Date();
    dueAt.setMinutes(dueAt.getMinutes() + 30);

    const item = await RealtorAssistantService.upsertFromRule({
      context: "REALTOR",
      ownerId: String(userId),
      leadId,
      type: "UNANSWERED_CLIENT_MESSAGE",
      priority: "HIGH",
      title,
      message,
      dueAt,
      dedupeKey,
      primaryAction: { type: "OPEN_CHAT", leadId },
      secondaryAction: { type: "OPEN_LEAD", leadId },
      metadata: {
        source: "AI",
        draft,
      },
    });

    try {
      await RealtorAssistantService.emitItemUpdated(String(userId), item);
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Error creating assistant item:", error);
    return NextResponse.json({ error: "Não conseguimos criar esta tarefa agora." }, { status: 500 });
  }
}
