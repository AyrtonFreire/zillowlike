import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, LeadPipelineStage, LeadStatus } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { captureException } from "@/lib/sentry";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const CLOSED_STATUSES: LeadStatus[] = ["COMPLETED", "CANCELLED", "EXPIRED", "OWNER_REJECTED"];
const CLOSED_STAGES: LeadPipelineStage[] = ["WON", "LOST"];

type InsightSeverity = "info" | "warning" | "critical";

type AgencyInsight = {
  title: string;
  detail: string;
  severity: InsightSeverity;
  href?: string;
  hrefLabel?: string;
};

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId: userId ? String(userId) : null, role: role ? String(role) : null };
}

const QuerySchema = z.object({
  teamId: z.string().trim().min(1).optional(),
});

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function normalizeStage(pipelineStage: LeadPipelineStage | null, status: LeadStatus): LeadPipelineStage {
  if (pipelineStage) return pipelineStage;
  if (status === "ACCEPTED") return "CONTACT";
  if (status === "CONFIRMED") return "VISIT";
  if (status === "COMPLETED") return "WON";
  if (status === "CANCELLED" || status === "EXPIRED" || status === "OWNER_REJECTED") return "LOST";
  return "NEW";
}

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({ teamId: url.searchParams.get("teamId") || undefined });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Parâmetros inválidos", issues: parsedQuery.error.issues }, { status: 400 });
    }

    let teamId = parsedQuery.data.teamId || null;

    if (role === "AGENCY") {
      const agencyProfile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      const agencyTeamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
      if (!agencyTeamId) {
        return NextResponse.json({ error: "Perfil de agência sem time associado." }, { status: 403 });
      }
      if (teamId && String(teamId) !== String(agencyTeamId)) {
        return NextResponse.json({ error: "Você só pode acessar insights do seu time." }, { status: 403 });
      }
      teamId = agencyTeamId;
    }

    if (!teamId && role === "ADMIN") {
      const membership = await (prisma as any).teamMember.findFirst({
        where: { userId: String(userId) },
        select: { teamId: true },
        orderBy: { createdAt: "asc" },
      });
      teamId = membership?.teamId ? String(membership.teamId) : null;
    }

    if (!teamId) {
      return NextResponse.json({
        success: true,
        generatedAt: new Date().toISOString(),
        team: null,
        summary: "Não encontramos um time associado a esta agência ainda.",
        funnel: {
          total: 0,
          activeTotal: 0,
          newLast24h: 0,
          unassigned: 0,
          byStage: {},
        },
        sla: {
          pendingReplyTotal: 0,
          pendingReplyLeads: [],
        },
        members: [],
        highlights: [],
      });
    }

    const team = await (prisma as any).team.findUnique({
      where: { id: String(teamId) },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    if (role !== "ADMIN") {
      const isMember = (team.members as any[]).some((m) => String(m.userId) === String(userId));
      const isOwner = String(team.ownerId) === String(userId);
      if (!isMember && !isOwner) {
        return NextResponse.json({ error: "Você não tem acesso a este time." }, { status: 403 });
      }
    }

    const members = Array.isArray(team.members) ? (team.members as any[]) : [];
    const memberIds = members.map((m) => String(m.userId));

    const baseWhere: Prisma.LeadWhereInput = {
      OR: [{ teamId: String(teamId) }, { realtorId: { in: memberIds } }],
    };

    const leads = await prisma.lead.findMany({
      where: baseWhere,
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        createdAt: true,
        updatedAt: true,
        respondedAt: true,
        completedAt: true,
        realtorId: true,
        contact: { select: { name: true } },
        property: { select: { title: true } },
        realtor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 2500,
    });

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeLeadIds = new Set<string>();
    const byStageActive: Record<string, number> = {};

    let activeTotal = 0;
    let newLast24h = 0;
    let unassigned = 0;

    for (const lead of leads) {
      const stage = normalizeStage((lead.pipelineStage as LeadPipelineStage | null) ?? null, lead.status as LeadStatus);

      const isActive = !CLOSED_STATUSES.includes(lead.status as LeadStatus) && !CLOSED_STAGES.includes(stage);

      if (isActive) {
        activeTotal += 1;
        activeLeadIds.add(String(lead.id));
        byStageActive[String(stage)] = Number(byStageActive[String(stage)] || 0) + 1;
        if (!lead.realtorId) unassigned += 1;
        if (lead.createdAt && new Date(lead.createdAt).getTime() >= last24h.getTime()) newLast24h += 1;
      }
    }

    const activeLeadIdsList = Array.from(activeLeadIds);

    let pendingReplyRowsAll: Array<{ leadId: string; lastClientAt: string }> = [];
    let pendingReplyLeadIds: Array<{ leadId: string; lastClientAt: string }> = [];
    let pendingReplyTotal = 0;

    if (activeLeadIdsList.length > 0) {
      const leadIdsSql = Prisma.join(activeLeadIdsList.map((id) => Prisma.sql`${id}`));

      const cte = Prisma.sql`
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
      `;

      const rows = (await prisma.$queryRaw(
        Prisma.sql`${cte}
          SELECT "leadId", "createdAt" AS "lastClientAt"
          FROM last_msg
          WHERE "fromClient" = true
          ORDER BY "createdAt" DESC;
        `
      )) as any[];

      pendingReplyRowsAll = (rows || []).map((r: any) => ({
        leadId: String(r.leadId),
        lastClientAt: r.lastClientAt ? new Date(r.lastClientAt).toISOString() : new Date().toISOString(),
      }));

      pendingReplyTotal = pendingReplyRowsAll.length;
      pendingReplyLeadIds = pendingReplyRowsAll.slice(0, 25);
    }

    const pendingIdSet = new Set(pendingReplyRowsAll.map((x) => x.leadId));
    const leadById = new Map(leads.map((l) => [String(l.id), l]));

    const pendingReplyLeads = pendingReplyLeadIds
      .map((row) => {
        const lead = leadById.get(String(row.leadId));
        if (!lead) return null;
        return {
          leadId: String(lead.id),
          contactName: lead.contact?.name ? String(lead.contact.name) : null,
          propertyTitle: lead.property?.title ? String(lead.property.title) : null,
          pipelineStage: lead.pipelineStage ? String(lead.pipelineStage) : null,
          realtorId: lead.realtor?.id ? String(lead.realtor.id) : lead.realtorId ? String(lead.realtorId) : null,
          realtorName: lead.realtor?.name ? String(lead.realtor.name) : null,
          lastClientAt: row.lastClientAt,
        };
      })
      .filter(Boolean) as Array<{
      leadId: string;
      contactName: string | null;
      propertyTitle: string | null;
      pipelineStage: string | null;
      realtorId: string | null;
      realtorName: string | null;
      lastClientAt: string;
    }>;

    const staleThreshold = addDays(now, -3);
    const unassignedThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const memberStats = members
      .filter((m) => String(m.role || "").toUpperCase() !== "ASSISTANT")
      .map((m) => {
        const mid = String(m.userId);
        const activeLeads = leads.filter((l) => activeLeadIds.has(String(l.id)) && String(l.realtorId || "") === mid);
        const pending = activeLeads.filter((l) => pendingIdSet.has(String(l.id)));
        const stalled = activeLeads.filter((l) => {
          const u = l.updatedAt ? new Date(l.updatedAt) : null;
          if (!u || Number.isNaN(u.getTime())) return false;
          return u < staleThreshold;
        });

        const won = leads.filter((l) => {
          if (String(l.realtorId || "") !== mid) return false;
          const stage = normalizeStage((l.pipelineStage as any) ?? null, l.status as any);
          return stage === "WON";
        });

        const lost = leads.filter((l) => {
          if (String(l.realtorId || "") !== mid) return false;
          const stage = normalizeStage((l.pipelineStage as any) ?? null, l.status as any);
          return stage === "LOST";
        });

        const firstResponseSamples = leads
          .filter((l) => String(l.realtorId || "") === mid)
          .map((l) => {
            const createdAt = l.createdAt ? new Date(l.createdAt) : null;
            const respondedAt = (l as any).respondedAt ? new Date((l as any).respondedAt) : null;
            if (!createdAt || Number.isNaN(createdAt.getTime())) return null;
            if (!respondedAt || Number.isNaN(respondedAt.getTime())) return null;
            const minutes = Math.max(0, Math.round((respondedAt.getTime() - createdAt.getTime()) / 60000));
            return minutes;
          })
          .filter((x): x is number => typeof x === "number");

        const avgFirstResponseMinutes = firstResponseSamples.length
          ? Math.round(firstResponseSamples.reduce((a, b) => a + b, 0) / firstResponseSamples.length)
          : null;

        return {
          userId: mid,
          name: m.user?.name ? String(m.user.name) : null,
          email: m.user?.email ? String(m.user.email) : null,
          role: String(m.role || ""),
          activeLeads: activeLeads.length,
          pendingReply: pending.length,
          stalledLeads: stalled.length,
          wonLeads: won.length,
          lostLeads: lost.length,
          avgFirstResponseMinutes,
        };
      })
      .sort((a, b) => {
        if (b.pendingReply !== a.pendingReply) return b.pendingReply - a.pendingReply;
        if (b.stalledLeads !== a.stalledLeads) return b.stalledLeads - a.stalledLeads;
        return b.activeLeads - a.activeLeads;
      });

    const highlights: AgencyInsight[] = [];

    if (pendingReplyTotal > 0) {
      highlights.push({
        title: "Clientes aguardando resposta",
        detail: `${pendingReplyTotal} lead${pendingReplyTotal === 1 ? "" : "s"} com última mensagem do cliente sem retorno.`,
        severity: pendingReplyTotal >= 10 ? "critical" : "warning",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm`,
        hrefLabel: "Abrir CRM do time",
      });

      const stuck48h = pendingReplyRowsAll.filter((r) => {
        const d = new Date(r.lastClientAt);
        if (Number.isNaN(d.getTime())) return false;
        return now.getTime() - d.getTime() >= 48 * 60 * 60 * 1000;
      });
      if (stuck48h.length > 0) {
        highlights.push({
          title: "SLA crítico (48h sem resposta)",
          detail: `${stuck48h.length} lead${stuck48h.length === 1 ? "" : "s"} aguardando retorno há 48h ou mais.`,
          severity: "critical",
          href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm?onlyPendingReply=1`,
          hrefLabel: "Ver pendentes",
        });
      }
    }

    if (unassigned > 0) {
      highlights.push({
        title: "Leads sem responsável",
        detail: `${unassigned} lead${unassigned === 1 ? "" : "s"} ativo${unassigned === 1 ? "" : "s"} sem corretor atribuído.`,
        severity: unassigned >= 5 ? "warning" : "info",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm?realtorId=unassigned`,
        hrefLabel: "Ver no CRM",
      });

      const unassignedAging = leads.filter((l) => {
        if (!activeLeadIds.has(String(l.id))) return false;
        if (l.realtorId) return false;
        const c = l.createdAt ? new Date(l.createdAt) : null;
        if (!c || Number.isNaN(c.getTime())) return false;
        return c < unassignedThreshold;
      });
      if (unassignedAging.length > 0) {
        highlights.push({
          title: "Sem responsável há mais de 2h",
          detail: `${unassignedAging.length} lead${unassignedAging.length === 1 ? "" : "s"} sem responsável há mais de 2 horas.`,
          severity: "warning",
          href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm?realtorId=unassigned`,
          hrefLabel: "Distribuir agora",
        });
      }
    }

    if (newLast24h > 0) {
      highlights.push({
        title: "Entradas nas últimas 24h",
        detail: `${newLast24h} lead${newLast24h === 1 ? "" : "s"} novo${newLast24h === 1 ? "" : "s"} nas últimas 24 horas.`,
        severity: "info",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm?stage=NEW`,
        hrefLabel: "Ver etapa Novo",
      });
    }

    const worstMember = memberStats.find((m) => m.pendingReply > 0) || null;
    if (worstMember) {
      highlights.push({
        title: "SLA do time (atenção)",
        detail: `${worstMember.name || worstMember.email || "Um corretor"} está com ${worstMember.pendingReply} conversa${worstMember.pendingReply === 1 ? "" : "s"} aguardando resposta.`,
        severity: worstMember.pendingReply >= 5 ? "critical" : "warning",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm?realtorId=${encodeURIComponent(worstMember.userId)}`,
        hrefLabel: "Ver leads do corretor",
      });
    }

    const stalledTotal = leads.filter((l) => {
      if (!activeLeadIds.has(String(l.id))) return false;
      const u = l.updatedAt ? new Date(l.updatedAt) : null;
      if (!u || Number.isNaN(u.getTime())) return false;
      return u < staleThreshold;
    }).length;
    if (stalledTotal > 0) {
      highlights.push({
        title: "Leads parados (3+ dias sem atualização)",
        detail: `${stalledTotal} lead${stalledTotal === 1 ? "" : "s"} sem atualização há mais de 3 dias.`,
        severity: stalledTotal >= 10 ? "warning" : "info",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm`,
        hrefLabel: "Abrir CRM",
      });
    }

    const activeByStage = Object.entries(byStageActive)
      .filter(([k]) => k !== "WON" && k !== "LOST")
      .sort((a, b) => Number(b[1]) - Number(a[1]));

    const topStage = activeByStage[0]?.[0] || null;
    if (topStage && Number(activeByStage[0]?.[1] || 0) > 0) {
      highlights.push({
        title: "Maior acúmulo no funil",
        detail: `Etapa ${topStage}: ${Number(activeByStage[0]?.[1] || 0)} lead${Number(activeByStage[0]?.[1] || 0) === 1 ? "" : "s"}.`,
        severity: "info",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm?stage=${encodeURIComponent(topStage)}`,
        hrefLabel: "Abrir etapa",
      });
    }

    const start14d = new Date(now);
    start14d.setHours(0, 0, 0, 0);
    start14d.setDate(start14d.getDate() - 13);

    try {
      const properties = await prisma.property.findMany({
        where: { teamId: String(teamId) },
        select: {
          id: true,
          title: true,
          status: true,
        },
        take: 2000,
      });

      const activeProperties = (properties as any[]).filter((p) => String(p.status || "").toUpperCase() === "ACTIVE");
      const propertyIds = activeProperties.map((p) => String(p.id)).filter(Boolean);

      if (propertyIds.length > 0) {
        const viewsRows = (await prisma.$queryRaw(
          Prisma.sql`
            SELECT "propertyId", COUNT(*)::int AS "count"
            FROM "property_views"
            WHERE "propertyId" = ANY(${propertyIds})
              AND "viewedAt" >= ${start14d}
            GROUP BY 1
          `
        )) as any[];

        const leadsRows = (await prisma.$queryRaw(
          Prisma.sql`
            SELECT "propertyId", COUNT(*)::int AS "count"
            FROM "leads"
            WHERE "propertyId" = ANY(${propertyIds})
              AND "createdAt" >= ${start14d}
            GROUP BY 1
          `
        )) as any[];

        const views14dByProperty = new Map<string, number>(
          (viewsRows || []).map((r: any) => [String(r.propertyId), Number(r.count) || 0])
        );
        const leads14dByProperty = new Map<string, number>(
          (leadsRows || []).map((r: any) => [String(r.propertyId), Number(r.count) || 0])
        );

        const withPerf = activeProperties
          .map((p: any) => {
            const id = String(p.id);
            const views14d = views14dByProperty.get(id) || 0;
            const leads14d = leads14dByProperty.get(id) || 0;
            const conversion = views14d > 0 ? leads14d / views14d : 0;
            return {
              id,
              title: String(p.title || "Imóvel"),
              views14d,
              leads14d,
              conversion,
            };
          })
          .sort((a, b) => b.views14d - a.views14d);

        const noViews = withPerf.filter((p) => p.views14d === 0);
        const noLeads = withPerf.filter((p) => p.views14d >= 50 && p.leads14d === 0);
        const lowConversion = withPerf.filter((p) => p.views14d >= 200 && p.conversion > 0 && p.conversion < 0.005);

        if (noViews.length > 0) {
          const examples = noViews
            .slice(0, 3)
            .map((p) => p.title)
            .join(" • ");
          highlights.push({
            title: "Imóveis sem visualizações (14d)",
            detail: `${noViews.length} anúncio${noViews.length === 1 ? "" : "s"} ativo${noViews.length === 1 ? "" : "s"} sem views nos últimos 14 dias.${examples ? ` Exemplos: ${examples}` : ""}`,
            severity: noViews.length >= 5 ? "warning" : "info",
            href: "/agency/properties?insight=noViews14d",
            hrefLabel: "Abrir imóveis",
          });
        }

        if (noLeads.length > 0) {
          const examples = noLeads
            .slice(0, 3)
            .map((p) => p.title)
            .join(" • ");
          highlights.push({
            title: "Muitas views e zero leads (14d)",
            detail: `${noLeads.length} anúncio${noLeads.length === 1 ? "" : "s"} com 50+ views e 0 leads nos últimos 14 dias.${examples ? ` Exemplos: ${examples}` : ""}`,
            severity: noLeads.length >= 5 ? "critical" : "warning",
            href: "/agency/properties?insight=noLeads14d",
            hrefLabel: "Abrir imóveis",
          });
        }

        if (lowConversion.length > 0) {
          const examples = lowConversion
            .slice(0, 3)
            .map((p) => p.title)
            .join(" • ");
          highlights.push({
            title: "Baixa conversão (14d)",
            detail: `${lowConversion.length} anúncio${lowConversion.length === 1 ? "" : "s"} com 200+ views e conversão < 0,5% nos últimos 14 dias.${examples ? ` Exemplos: ${examples}` : ""}`,
            severity: "warning",
            href: "/agency/properties?insight=lowConversion14d",
            hrefLabel: "Abrir imóveis",
          });
        }
      }
    } catch {
    }

    const summary = (() => {
      const parts: string[] = [];
      parts.push(`Leads ativos: ${activeTotal}`);
      if (pendingReplyTotal > 0) parts.push(`pendentes de resposta: ${pendingReplyTotal}`);
      if (unassigned > 0) parts.push(`sem responsável: ${unassigned}`);
      if (newLast24h > 0) parts.push(`novos 24h: ${newLast24h}`);
      return parts.join(" • ");
    })();

    return NextResponse.json({
      success: true,
      generatedAt: now.toISOString(),
      team: {
        id: String(team.id),
        name: String(team.name || "Time"),
      },
      summary,
      funnel: {
        total: leads.length,
        activeTotal,
        newLast24h,
        unassigned,
        byStage: byStageActive,
      },
      sla: {
        pendingReplyTotal,
        pendingReplyLeads,
      },
      members: memberStats,
      highlights: highlights.slice(0, 8),
    });
  } catch (error) {
    captureException(error, { route: "/api/agency/insights" });
    logger.error("Error fetching agency insights", { error });
    return NextResponse.json({ error: "Não conseguimos carregar os insights agora." }, { status: 500 });
  }
}
