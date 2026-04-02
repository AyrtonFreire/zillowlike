import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/sms";
import { createAuditLog } from "@/lib/audit-log";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import {
  assertAgencyClientTeamAccess,
  buildAgencyClientPlaybookSnapshot,
  getAgencyClientSessionContext,
  listAgencyClientAssignableMembers,
  resolveAgencyClientTeamId,
  selectAgencyClientAssignee,
  serializeAgencyClient,
} from "@/lib/agency-clients";

const ListQuerySchema = z.object({
  teamId: z.string().trim().min(1).optional(),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ANY"]).optional(),
  pipelineStage: z.enum(["NEW", "CONTACT", "QUALIFYING", "MATCHING", "VISIT", "NURTURE", "WON", "LOST", "ANY"]).optional(),
  intent: z.enum(["BUY", "RENT", "LIST", "ANY"]).optional(),
  assignedUserId: z.string().trim().min(1).optional(),
  sla: z.enum(["ANY", "PENDING_REPLY", "NO_FIRST_CONTACT", "OVERDUE_NEXT_ACTION", "UNASSIGNED"]).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  pageSize: z.string().regex(/^\d+$/).optional(),
});

const CreateClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .string()
    .trim()
    .email()
    .transform((v) => v.toLowerCase())
    .nullable()
    .optional(),
  phone: z.string().trim().min(6).max(40).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  intent: z.enum(["BUY", "RENT", "LIST"]).nullable().optional(),
  assignedUserId: z.string().trim().min(1).nullable().optional(),
  pipelineStage: z.enum(["NEW", "CONTACT", "QUALIFYING", "MATCHING", "VISIT", "NURTURE", "WON", "LOST"]).optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  nextActionNote: z.string().trim().max(500).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await getAgencyClientSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN" && role !== "REALTOR") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const parsed = ListQuerySchema.safeParse({
      teamId: url.searchParams.get("teamId") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      status: (url.searchParams.get("status") || "ANY").toUpperCase(),
      pipelineStage: (url.searchParams.get("pipelineStage") || "ANY").toUpperCase(),
      intent: (url.searchParams.get("intent") || "ANY").toUpperCase(),
      assignedUserId: url.searchParams.get("assignedUserId") ?? undefined,
      sla: (url.searchParams.get("sla") || "ANY").toUpperCase(),
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const teamId = await resolveAgencyClientTeamId({ userId, role, teamIdParam: parsed.data.teamId || null });

    if (!teamId) {
      return NextResponse.json({ success: true, team: null, clients: [], page: 1, pageSize: 24, total: 0 });
    }

    const { team, error } = await assertAgencyClientTeamAccess({ userId, role, teamId });
    if (error) return NextResponse.json(error.body, { status: error.status });

    const pageRaw = Number(parsed.data.page || 1);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSizeRaw = Number(parsed.data.pageSize || 24);
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(pageSizeRaw, 100) : 24;
    const now = new Date();
    const firstContactThreshold = new Date(now.getTime() - 30 * 60 * 1000);

    const where: any = { teamId: String(teamId) };

    const status = String(parsed.data.status || "ANY");
    if (status !== "ANY") where.status = status;

    const pipelineStage = String(parsed.data.pipelineStage || "ANY");
    if (pipelineStage !== "ANY") where.pipelineStage = pipelineStage;

    const intent = String(parsed.data.intent || "ANY");
    if (intent !== "ANY") where.intent = intent;

    const assignedUserId = parsed.data.assignedUserId ? String(parsed.data.assignedUserId) : "";
    if (assignedUserId) {
      if (assignedUserId === "UNASSIGNED") where.assignedUserId = null;
      else where.assignedUserId = assignedUserId;
    }

    const sla = String(parsed.data.sla || "ANY");
    if (sla === "UNASSIGNED") {
      where.assignedUserId = null;
    } else if (sla === "NO_FIRST_CONTACT") {
      where.firstContactAt = null;
      where.createdAt = { lte: firstContactThreshold };
      where.status = "ACTIVE";
      where.pipelineStage = { notIn: ["WON", "LOST"] };
    } else if (sla === "OVERDUE_NEXT_ACTION") {
      where.nextActionAt = { lte: now };
      where.status = "ACTIVE";
      where.pipelineStage = { notIn: ["WON", "LOST"] };
    } else if (sla === "PENDING_REPLY") {
      where.lastInboundAt = { not: null };
      where.status = "ACTIVE";
      where.pipelineStage = { notIn: ["WON", "LOST"] };
    }

    const q = parsed.data.q ? String(parsed.data.q).trim() : "";
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const summaryWhere: any = { teamId: String(teamId) };

    const [assignableMembers, transactionResults] = await Promise.all([
      listAgencyClientAssignableMembers(String(teamId)),
      (prisma as any).$transaction([
        (prisma as any).client.count({ where }),
        (prisma as any).client.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            source: true,
            intent: true,
            pipelineStage: true,
            notes: true,
            assignedAt: true,
            firstContactAt: true,
            lastContactAt: true,
            lastInboundAt: true,
            lastInboundChannel: true,
            nextActionAt: true,
            nextActionNote: true,
            consentAcceptedAt: true,
            consentText: true,
            sourceSlug: true,
            playbookSnapshot: true,
            createdAt: true,
            updatedAt: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            preference: {
              select: {
                city: true,
                state: true,
                neighborhoods: true,
                purpose: true,
                types: true,
                minPrice: true,
                maxPrice: true,
                bedroomsMin: true,
                bathroomsMin: true,
                areaMin: true,
                flags: true,
                scope: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        }),
        (prisma as any).client.groupBy({ by: ["pipelineStage"], where: summaryWhere, _count: { _all: true } }),
        (prisma as any).client.groupBy({ by: ["intent"], where: { ...summaryWhere, intent: { not: null } }, _count: { _all: true } }),
        (prisma as any).client.count({ where: { ...summaryWhere, status: "ACTIVE" } }),
        (prisma as any).client.count({ where: { ...summaryWhere, status: "PAUSED" } }),
        (prisma as any).client.count({ where: { ...summaryWhere, assignedUserId: null, status: "ACTIVE", pipelineStage: { notIn: ["WON", "LOST"] } } }),
        (prisma as any).client.count({ where: { ...summaryWhere, status: "ACTIVE", pipelineStage: { notIn: ["WON", "LOST"] }, firstContactAt: null, createdAt: { lte: firstContactThreshold } } }),
        (prisma as any).client.count({ where: { ...summaryWhere, status: "ACTIVE", pipelineStage: { notIn: ["WON", "LOST"] }, nextActionAt: { lte: now } } }),
        (prisma as any).client.findMany({
          where: { ...summaryWhere, status: "ACTIVE", pipelineStage: { notIn: ["WON", "LOST"] }, lastInboundAt: { not: null } },
          select: { lastInboundAt: true, lastContactAt: true },
          take: 2500,
        }),
      ]),
    ]);

    const [total, rows, stageCounts, intentCounts, activeCount, pausedCount, unassignedCount, noFirstContactCount, overdueNextActionCount, pendingReplyRows] = transactionResults;

    const clients = (rows as any[]).map((c) => serializeAgencyClient(c));
    const pendingReply = (Array.isArray(pendingReplyRows) ? pendingReplyRows : []).filter((row: any) => {
      const lastInboundAt = row?.lastInboundAt ? new Date(row.lastInboundAt) : null;
      if (!lastInboundAt || Number.isNaN(lastInboundAt.getTime())) return false;
      const lastContactAt = row?.lastContactAt ? new Date(row.lastContactAt) : null;
      if (!lastContactAt || Number.isNaN(lastContactAt.getTime())) return true;
      return lastInboundAt.getTime() > lastContactAt.getTime();
    }).length;

    const byStage = Object.fromEntries(
      (Array.isArray(stageCounts) ? stageCounts : []).map((row: any) => [String(row.pipelineStage || "NEW"), Number(row?._count?._all || 0)])
    );

    const byIntent = Object.fromEntries(
      (Array.isArray(intentCounts) ? intentCounts : []).map((row: any) => [String(row.intent || "UNKNOWN"), Number(row?._count?._all || 0)])
    );

    return NextResponse.json({
      success: true,
      team: { id: String((team as any).id), name: String((team as any).name || "Time") },
      clients,
      assignableMembers: (Array.isArray(assignableMembers) ? assignableMembers : []).map((member: any) => ({
        userId: String(member.userId),
        name: member.user?.name ? String(member.user.name) : null,
        email: member.user?.email ? String(member.user.email) : null,
        queuePosition: Number(member.queuePosition || 0),
      })),
      summary: {
        active: Number(activeCount || 0),
        paused: Number(pausedCount || 0),
        unassigned: Number(unassignedCount || 0),
        pendingReply: Number(pendingReply || 0),
        noFirstContact: Number(noFirstContactCount || 0),
        overdueNextAction: Number(overdueNextActionCount || 0),
        byStage,
        byIntent,
      },
      page,
      pageSize,
      total: Number(total || 0),
    });
  } catch (error) {
    console.error("Error listing clients:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos carregar os clientes agora." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await getAgencyClientSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN" && role !== "REALTOR") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const teamId = await resolveAgencyClientTeamId({ userId, role, teamIdParam: url.searchParams.get("teamId") });

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 });
    }

    const { team, error: teamError } = await assertAgencyClientTeamAccess({ userId, role, teamId });
    if (teamError) return NextResponse.json(teamError.body, { status: teamError.status });

    const body = await req.json().catch(() => null);
    const parsed = CreateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const email = parsed.data.email !== undefined ? parsed.data.email : null;
    const phone = parsed.data.phone !== undefined ? parsed.data.phone : null;

    const normalized = String(phone || "").trim() ? normalizePhoneE164(String(phone)) : "";
    const phoneNormalized = normalized ? normalized : null;

    const assignableMembers = await listAgencyClientAssignableMembers(String(teamId));
    const assignableSet = new Set(assignableMembers.map((member: any) => String(member.userId)));
    const assignableByUserId = new Map(
      assignableMembers.map((member: any) => [String(member.userId), member])
    );

    let assignedUserId = parsed.data.assignedUserId ? String(parsed.data.assignedUserId) : null;
    let routingStrategy: "EXPLICIT" | "PRIMARY" | "BALANCED" | "UNASSIGNED" | "MANUAL" = "MANUAL";
    let assigneeName: string | null = null;
    if (assignedUserId && !assignableSet.has(assignedUserId)) {
      return NextResponse.json({ success: false, error: "Responsável inválido para este time." }, { status: 400 });
    }

    if (assignedUserId) {
      const explicitMember = assignableByUserId.get(String(assignedUserId));
      assigneeName = explicitMember?.user?.name ? String(explicitMember.user.name) : explicitMember?.user?.email ? String(explicitMember.user.email) : null;
      routingStrategy = "EXPLICIT";
    }

    if (!assignedUserId) {
      const suggested = await selectAgencyClientAssignee({ teamId: String(teamId), intent: parsed.data.intent ?? null });
      assignedUserId = suggested.userId ? String(suggested.userId) : null;
      routingStrategy = suggested.userId ? suggested.strategy : "UNASSIGNED";
      assigneeName = suggested.name ? String(suggested.name) : null;
    }

    const playbookSnapshot = await buildAgencyClientPlaybookSnapshot({
      teamId: String(teamId),
      intent: parsed.data.intent ?? null,
      assigneeName,
      strategy: routingStrategy,
    });

    if (email) {
      const conflict = await (prisma as any).client.findFirst({
        where: { teamId: String(teamId), email: String(email) },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json({ success: false, error: "Já existe um cliente com este e-mail neste time." }, { status: 400 });
      }
    }

    if (phoneNormalized) {
      const conflict = await (prisma as any).client.findFirst({
        where: { teamId: String(teamId), phoneNormalized },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json({ success: false, error: "Já existe um cliente com este telefone neste time." }, { status: 400 });
      }
    }

    const nextActionAt = parsed.data.nextActionAt ? new Date(parsed.data.nextActionAt) : null;

    const created = await (prisma as any).client.create({
      data: {
        teamId: String(teamId),
        createdByUserId: String(userId),
        assignedUserId,
        assignedAt: assignedUserId ? new Date() : null,
        name: parsed.data.name,
        email,
        phone,
        phoneNormalized,
        source: "MANUAL",
        intent: parsed.data.intent ?? null,
        pipelineStage: parsed.data.pipelineStage || "NEW",
        nextActionAt,
        nextActionNote: parsed.data.nextActionNote ?? null,
        notes: parsed.data.notes ?? null,
        playbookSnapshot,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        source: true,
        intent: true,
        pipelineStage: true,
        notes: true,
        assignedAt: true,
        firstContactAt: true,
        lastContactAt: true,
        lastInboundAt: true,
        lastInboundChannel: true,
        nextActionAt: true,
        nextActionNote: true,
        consentAcceptedAt: true,
        consentText: true,
        sourceSlug: true,
        playbookSnapshot: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        preference: {
          select: {
            city: true,
            state: true,
            neighborhoods: true,
            purpose: true,
            types: true,
            minPrice: true,
            maxPrice: true,
            bedroomsMin: true,
            bathroomsMin: true,
            areaMin: true,
            flags: true,
            scope: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    await createAuditLog({
      action: "AGENCY_CLIENT_CREATED",
      level: "SUCCESS",
      actorId: String(userId),
      actorRole: role,
      targetType: "Client",
      targetId: String(created.id),
      metadata: {
        teamId: String(teamId),
        assignedUserId,
        routingStrategy,
        intent: parsed.data.intent ?? null,
        pipelineStage: parsed.data.pipelineStage || "NEW",
      },
    });

    if ((team as any)?.ownerId) {
      void RealtorAssistantService.recalculateForAgencyTeam(String((team as any).ownerId), String(teamId));
    }

    return NextResponse.json({
      success: true,
      client: serializeAgencyClient(created),
    });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos criar o cliente agora." }, { status: 500 });
  }
}
