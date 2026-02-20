import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { prisma } from "@/lib/prisma";
import { getRealtorAssistantTypesForCategory } from "@/lib/realtor-assistant-ai";

const PostSchema = z
  .object({
    leadId: z.string().min(1),
    draft: z.string().min(1).max(2000),
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

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId");
    const context = (url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR"))
      .trim()
      .toUpperCase();
    const teamIdParam = url.searchParams.get("teamId");
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

    let teamId: string | null = teamIdParam ? String(teamIdParam) : null;
    if (!teamId && role === "AGENCY") {
      const agencyProfile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      teamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
    }

    const baseWhere: any = {
      context: context === "AGENCY" ? "AGENCY" : "REALTOR",
      ownerId: String(userId),
      ...(leadId ? { leadId } : {}),
      ...(context === "AGENCY" && teamId ? { teamId } : {}),
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
    const key = `${ETAG_VERSION}:${String(userId)}:${leadId || "all"}:${limit}:${order}:${cursor || ""}:${qq || ""}:${priority || ""}:${category || ""}:${includeSnoozed ? "1" : "0"}`;
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

    const items = await RealtorAssistantService.list(String(userId), {
      context: context === "AGENCY" ? "AGENCY" : "REALTOR",
      teamId: context === "AGENCY" ? teamId || undefined : undefined,
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

    if (role !== "ADMIN" && role !== "REALTOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = PostSchema.safeParse(body);
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
