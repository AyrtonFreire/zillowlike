import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { LeadStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { captureException } from "@/lib/sentry";
import { logger } from "@/lib/logger";

function jsonSafe<T>(data: T): any {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await context.params;

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const stage = (url.searchParams.get("stage") || "").trim();
    const realtorIdParam = (url.searchParams.get("realtorId") || "").trim();
    const onlyPendingParam = (url.searchParams.get("onlyPendingReply") || "").trim().toLowerCase();
    const onlyPendingReply = onlyPendingParam === "1" || onlyPendingParam === "true" || onlyPendingParam === "yes";
    const cursor = (url.searchParams.get("cursor") || "").trim();
    const limitRaw = parseInt((url.searchParams.get("limit") || "50").trim(), 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(10, Math.min(200, limitRaw)) : 50;

    if (role === "AGENCY") {
      const profile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      const agencyTeamId = profile?.teamId ? String(profile.teamId) : null;
      if (!agencyTeamId || agencyTeamId !== String(id)) {
        return NextResponse.json({ error: "Você só pode acessar o funil do seu time." }, { status: 403 });
      }
    }

    const team = await (prisma as any).team.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                publicWhatsApp: true,
                phoneNormalized: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    const isMember = (team.members as any[]).some((m) => m.userId === userId);
    const isOwner = team.ownerId === userId;

    if (!isMember && !isOwner && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não tem acesso ao funil deste time." },
        { status: 403 }
      );
    }

    const sortedMembers = (team.members as any[]).slice().sort((a, b) => {
      const aPos = typeof a.queuePosition === "number" ? a.queuePosition : 0;
      const bPos = typeof b.queuePosition === "number" ? b.queuePosition : 0;
      if (aPos !== bPos) return aPos - bPos;
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aCreated - bCreated;
    });

    const memberIds = sortedMembers.map((m) => m.userId);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        team: {
          id: team.id,
          name: team.name,
        },
        leads: [],
      });
    }

    type SimplePipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

    const CLOSED_STATUSES: Array<LeadStatus | string> = ["COMPLETED", "CANCELLED", "EXPIRED", "OWNER_REJECTED"];

    const mapStatusToStage = (status: LeadStatus): SimplePipelineStage => {
      if (status === "ACCEPTED") return "CONTACT";
      if (status === "CONFIRMED") return "VISIT";
      if (status === "COMPLETED") return "WON";
      if (status === "CANCELLED" || status === "EXPIRED" || status === "OWNER_REJECTED") return "LOST";
      return "NEW";
    };

    const filters: Prisma.LeadWhereInput[] = [];
    filters.push({
      OR: [
        { teamId: id },
        {
          realtorId: {
            in: memberIds,
          },
        },
      ],
    });
    if (stage) {
      filters.push({ pipelineStage: stage as any });
    }
    if (realtorIdParam === "unassigned") {
      filters.push({ realtorId: null });
    } else if (realtorIdParam) {
      filters.push({ realtorId: realtorIdParam });
    }
    if (q) {
      const qNorm = q.toLowerCase();
      filters.push({
        OR: [
          { id: { contains: qNorm, mode: "insensitive" } },
          { contact: { is: { name: { contains: qNorm, mode: "insensitive" } } } },
          { contact: { is: { phone: { contains: qNorm, mode: "insensitive" } } } },
          { property: { is: { title: { contains: qNorm, mode: "insensitive" } } } },
          { property: { is: { city: { contains: qNorm, mode: "insensitive" } } } },
          { property: { is: { state: { contains: qNorm, mode: "insensitive" } } } },
          { realtor: { is: { name: { contains: qNorm, mode: "insensitive" } } } },
          { realtor: { is: { email: { contains: qNorm, mode: "insensitive" } } } },
        ],
      });
    }

    const baseWhere: Prisma.LeadWhereInput = filters.length ? { AND: filters } : {};

    const leadSelect = {
      id: true,
      status: true,
      pipelineStage: true,
      createdAt: true,
      realtorId: true,
      property: {
        select: {
          id: true,
          title: true,
          price: true,
          type: true,
          city: true,
          state: true,
        },
      },
      contact: {
        select: {
          name: true,
          phone: true,
        },
      },
      realtor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    } as const;

    const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];

    const computePendingMap = async (leadRows: any[]) => {
      const activeLeadIds = new Set<string>();
      for (const lead of leadRows as any[]) {
        const stageEffective = (lead.pipelineStage || mapStatusToStage(lead.status)) as SimplePipelineStage;
        const isClosed = CLOSED_STATUSES.includes(lead.status) || stageEffective === "WON" || stageEffective === "LOST";
        if (!isClosed) activeLeadIds.add(String(lead.id));
      }

      const pendingByLeadId = new Map<string, string>();
      const leadIds = Array.from(activeLeadIds);
      if (!leadIds.length) return pendingByLeadId;

      try {
        const leadIdsSql = Prisma.join(leadIds.map((lid) => Prisma.sql`${lid}`));

        const rows = (await prisma.$queryRaw(
          Prisma.sql`
            WITH m AS (
              SELECT cm."leadId" AS "leadId", cm."fromClient" AS "fromClient", cm."createdAt" AS "createdAt"
              FROM "lead_client_messages" cm
              WHERE cm."leadId" IN (${leadIdsSql})

              UNION ALL

              SELECT im."leadId" AS "leadId", false AS "fromClient", im."createdAt" AS "createdAt"
              FROM "lead_messages" im
              WHERE im."leadId" IN (${leadIdsSql})
            ),
            last_msg AS (
              SELECT DISTINCT ON (m."leadId")
                m."leadId" AS "leadId",
                m."fromClient" AS "fromClient",
                m."createdAt" AS "createdAt"
              FROM m
              ORDER BY m."leadId", m."createdAt" DESC
            )
            SELECT "leadId", "createdAt" AS "lastClientAt"
            FROM last_msg
            WHERE "fromClient" = true;
          `
        )) as any[];

        for (const r of rows || []) {
          if (!r?.leadId) continue;
          const ts = r?.lastClientAt ? new Date(r.lastClientAt).toISOString() : null;
          if (!ts) continue;
          pendingByLeadId.set(String(r.leadId), ts);
        }
      } catch {
        // ignore
      }

      return pendingByLeadId;
    };

    let pageLeads: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = false;

    if (!onlyPendingReply) {
      const rows = await prisma.lead.findMany({
        where: baseWhere as any,
        select: leadSelect as any,
        orderBy: orderBy as any,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const sliced = rows.slice(0, limit);
      hasMore = rows.length > limit;
      nextCursor = hasMore && sliced.length ? String(sliced[sliced.length - 1].id) : null;

      const pendingByLeadId = await computePendingMap(sliced);
      pageLeads = sliced.map((lead: any) => ({
        ...lead,
        pendingReplyAt: pendingByLeadId.get(String(lead.id)) || null,
      }));
    } else {
      const batchSize = Math.min(500, Math.max(limit * 3, 100));
      let scanCursor = cursor || "";
      let lastScannedId: string | null = null;
      let scanHasMore = false;

      for (let guard = 0; guard < 10 && pageLeads.length < limit; guard++) {
        const batch = await prisma.lead.findMany({
          where: baseWhere as any,
          select: leadSelect as any,
          orderBy: orderBy as any,
          take: batchSize,
          ...(scanCursor ? { cursor: { id: scanCursor }, skip: 1 } : {}),
        });

        if (!batch.length) {
          scanHasMore = false;
          break;
        }

        const pendingByLeadId = await computePendingMap(batch);

        for (const lead of batch as any[]) {
          lastScannedId = String(lead.id);
          const pendingAt = pendingByLeadId.get(String(lead.id)) || null;
          if (!pendingAt) continue;
          pageLeads.push({
            ...lead,
            pendingReplyAt: pendingAt,
          });
          if (pageLeads.length >= limit) break;
        }

        if (pageLeads.length >= limit) {
          scanHasMore = true;
          break;
        }

        if (batch.length < batchSize) {
          scanHasMore = false;
          break;
        }

        scanHasMore = true;
        scanCursor = lastScannedId || "";
      }

      hasMore = scanHasMore && !!lastScannedId;
      nextCursor = hasMore ? lastScannedId : null;
    }

    const normalized = pageLeads.map((lead: any) => ({
      id: lead.id,
      status: lead.status,
      pipelineStage: lead.pipelineStage || mapStatusToStage(lead.status),
      createdAt: lead.createdAt,
      property: lead.property,
      contact: lead.contact,
      realtor: lead.realtor,
      pendingReplyAt: (lead as any)?.pendingReplyAt ?? null,
    }));

    const members = sortedMembers.map((m) => ({
      userId: m.userId,
      name: m.user?.name ?? null,
      email: m.user?.email ?? null,
      publicWhatsApp: (m.user as any)?.publicWhatsApp ?? null,
      phoneNormalized: (m.user as any)?.phoneNormalized ?? null,
      phone: (m.user as any)?.phone ?? null,
      role: m.role as string,
      queuePosition: typeof m.queuePosition === "number" ? m.queuePosition : 0,
    }));

    const actorEmail = session.user?.email || null;
    void createAuditLog({
      level: "INFO",
      action: "AGENCY_CRM_PIPELINE_VIEW",
      actorId: String(userId),
      actorEmail,
      actorRole: String(role || ""),
      targetType: "TEAM",
      targetId: String(id),
      metadata: {
        q: q || null,
        stage: stage || null,
        realtorId: realtorIdParam || null,
        onlyPendingReply,
        cursor: cursor || null,
        limit,
        returned: normalized.length,
      },
    });

    return NextResponse.json(
      jsonSafe({
        success: true,
        team: {
          id: team.id,
          name: team.name,
        },
        members,
        leads: normalized,
        pageInfo: {
          nextCursor,
          hasMore,
        },
      })
    );
  } catch (error) {
    captureException(error, { route: "/api/teams/[id]/pipeline" });
    logger.error("Error fetching team pipeline", { error });
    return NextResponse.json(
      { error: "Não conseguimos carregar o funil deste time agora." },
      { status: 500 }
    );
  }
}
