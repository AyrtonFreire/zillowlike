import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, LeadPipelineStage, LeadStatus } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { DEFAULT_AGENCY_AI_CONFIG, getAgencyAiConfig } from "@/lib/agency-profile";
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

function isOperationalClientStage(stage: string | null | undefined) {
  const value = String(stage || "NEW").toUpperCase();
  return value !== "WON" && value !== "LOST";
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function average(values: Array<number | null | undefined>) {
  const nums = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
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
        clients: {
          total: 0,
          activeTotal: 0,
          newLast24h: 0,
          unassigned: 0,
          byStage: {},
          byIntent: {},
        },
        sla: {
          pendingReplyTotal: 0,
          pendingReplyLeads: [],
          clientPendingReplyTotal: 0,
          pendingReplyClients: [],
          clientNoFirstContact: 0,
          clientOverdueNextAction: 0,
        },
        aiConfig: DEFAULT_AGENCY_AI_CONFIG,
        coaching: {
          teamExecutionScore: 100,
          minExecutionScoreTarget: DEFAULT_AGENCY_AI_CONFIG.coaching.minExecutionScore,
          avgFirstResponseMinutes: null,
          workloadImbalanceIndex: 0,
          automationCoverage: {
            enabledRules: Object.values(DEFAULT_AGENCY_AI_CONFIG.automations).filter(Boolean).length,
            totalRules: Object.keys(DEFAULT_AGENCY_AI_CONFIG.automations).length,
            activeChannels: Object.values(DEFAULT_AGENCY_AI_CONFIG.channels).filter(Boolean).length,
            totalChannels: Object.keys(DEFAULT_AGENCY_AI_CONFIG.channels).length,
          },
          alerts: [],
          members: [],
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
            user: { select: { id: true, name: true, email: true, username: true } },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    const aiConfig = await getAgencyAiConfig(String(teamId));

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

    const leads = await (prisma as any).lead.findMany({
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
        realtor: { select: { id: true, name: true, email: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 2500,
    });

    const clients = await (prisma as any).client.findMany({
      where: { teamId: String(teamId) },
      select: {
        id: true,
        name: true,
        status: true,
        intent: true,
        pipelineStage: true,
        createdAt: true,
        updatedAt: true,
        assignedUserId: true,
        firstContactAt: true,
        lastContactAt: true,
        lastInboundAt: true,
        lastInboundChannel: true,
        nextActionAt: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 2500,
    });

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const clientFirstContactGraceMinutes = Math.max(5, Number(aiConfig.thresholds.clientFirstContactGraceMinutes || 30));
    const staleLeadDays = Math.max(1, Number(aiConfig.thresholds.staleLeadDays || 3));
    const firstContactThreshold = new Date(now.getTime() - clientFirstContactGraceMinutes * 60 * 1000);
    const activeLeadIds = new Set<string>();
    const byStageActive: Record<string, number> = {};
    const clientByStageActive: Record<string, number> = {};
    const clientByIntentActive: Record<string, number> = {};

    let activeTotal = 0;
    let newLast24h = 0;
    let unassigned = 0;
    let clientActiveTotal = 0;
    let clientNewLast24h = 0;
    let clientUnassigned = 0;
    let clientPendingReplyTotal = 0;
    let clientNoFirstContact = 0;
    let clientOverdueNextAction = 0;
    const clientPendingReplyRows: Array<{
      clientId: string;
      name: string | null;
      pipelineStage: string | null;
      assignedUserId: string | null;
      assignedUserName: string | null;
      lastInboundAt: string;
      lastInboundChannel: string | null;
    }> = [];

    const isClientPendingReply = (client: any) => {
      const lastInboundAt = client?.lastInboundAt ? new Date(client.lastInboundAt) : null;
      if (!lastInboundAt || Number.isNaN(lastInboundAt.getTime())) return false;
      const lastContactAt = client?.lastContactAt ? new Date(client.lastContactAt) : null;
      if (!lastContactAt || Number.isNaN(lastContactAt.getTime())) return true;
      return lastInboundAt.getTime() > lastContactAt.getTime();
    };

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

    for (const client of clients as any[]) {
      const stage = String(client.pipelineStage || "NEW");
      const isActive = String(client.status || "ACTIVE") === "ACTIVE" && isOperationalClientStage(stage);
      if (!isActive) continue;

      clientActiveTotal += 1;
      clientByStageActive[stage] = Number(clientByStageActive[stage] || 0) + 1;

      const intent = client.intent ? String(client.intent) : "UNKNOWN";
      clientByIntentActive[intent] = Number(clientByIntentActive[intent] || 0) + 1;

      if (!client.assignedUserId) clientUnassigned += 1;
      if (client.createdAt && new Date(client.createdAt).getTime() >= last24h.getTime()) clientNewLast24h += 1;

      const createdAt = client.createdAt ? new Date(client.createdAt) : null;
      if ((!client.firstContactAt || Number.isNaN(new Date(client.firstContactAt).getTime())) && createdAt && createdAt <= firstContactThreshold) {
        clientNoFirstContact += 1;
      }

      const nextActionAt = client.nextActionAt ? new Date(client.nextActionAt) : null;
      if (nextActionAt && !Number.isNaN(nextActionAt.getTime()) && nextActionAt <= now) {
        clientOverdueNextAction += 1;
      }

      if (isClientPendingReply(client)) {
        clientPendingReplyTotal += 1;
        const lastInboundAt = new Date(client.lastInboundAt);
        clientPendingReplyRows.push({
          clientId: String(client.id),
          name: client.name ? String(client.name) : null,
          pipelineStage: client.pipelineStage ? String(client.pipelineStage) : null,
          assignedUserId: client.assignedUserId ? String(client.assignedUserId) : null,
          assignedUserName: client.assignedTo?.name
            ? String(client.assignedTo.name)
            : client.assignedTo?.email
              ? String(client.assignedTo.email)
              : null,
          lastInboundAt: Number.isNaN(lastInboundAt.getTime()) ? now.toISOString() : lastInboundAt.toISOString(),
          lastInboundChannel: client.lastInboundChannel ? String(client.lastInboundChannel) : null,
        });
      }
    }

    clientPendingReplyRows.sort((a, b) => new Date(b.lastInboundAt).getTime() - new Date(a.lastInboundAt).getTime());

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

    const pendingIdSet = new Set(pendingReplyRowsAll.map((x: any) => x.leadId));
    const leadById = new Map((leads as any[]).map((l: any) => [String(l.id), l]));

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
          realtorName:
            lead.realtor?.name
              ? String(lead.realtor.name)
              : (lead as any)?.realtor?.username
                ? String((lead as any).realtor.username)
                : null,
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

    const staleThreshold = addDays(now, -staleLeadDays);
    const unassignedThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const memberStats = (members as any[])
      .filter((m) => String(m.role || "").toUpperCase() !== "ASSISTANT")
      .map((m) => {
        const mid = String(m.userId);
        const activeLeads = (leads as any[]).filter(
          (l: any) => activeLeadIds.has(String(l.id)) && String(l.realtorId || "") === mid,
        );
        const activeClients = (clients as any[]).filter((c: any) => {
          const stage = String(c.pipelineStage || "NEW");
          return String(c.assignedUserId || "") === mid && String(c.status || "ACTIVE") === "ACTIVE" && isOperationalClientStage(stage);
        });
        const pending = activeLeads.filter((l: any) => pendingIdSet.has(String(l.id)));
        const pendingClients = activeClients.filter((c: any) => isClientPendingReply(c));
        const noFirstContactClients = activeClients.filter((c: any) => {
          if (c.firstContactAt && !Number.isNaN(new Date(c.firstContactAt).getTime())) return false;
          const createdAt = c.createdAt ? new Date(c.createdAt) : null;
          if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
          return createdAt <= firstContactThreshold;
        });
        const stalled = activeLeads.filter((l: any) => {
          const u = l.updatedAt ? new Date(l.updatedAt) : null;
          if (!u || Number.isNaN(u.getTime())) return false;
          return u < staleThreshold;
        });

        const won = (leads as any[]).filter((l: any) => {
          if (String(l.realtorId || "") !== mid) return false;
          const stage = normalizeStage((l.pipelineStage as any) ?? null, l.status as any);
          return stage === "WON";
        });

        const lost = (leads as any[]).filter((l: any) => {
          if (String(l.realtorId || "") !== mid) return false;
          const stage = normalizeStage((l.pipelineStage as any) ?? null, l.status as any);
          return stage === "LOST";
        });

        const firstResponseSamples = leads
          .filter((l: any) => String(l.realtorId || "") === mid)
          .map((l: any) => {
            const createdAt = l.createdAt ? new Date(l.createdAt) : null;
            const respondedAt = (l as any).respondedAt ? new Date((l as any).respondedAt) : null;
            if (!createdAt || Number.isNaN(createdAt.getTime())) return null;
            if (!respondedAt || Number.isNaN(respondedAt.getTime())) return null;
            const minutes = Math.max(0, Math.round((respondedAt.getTime() - createdAt.getTime()) / 60000));
            return minutes;
          })
          .filter((x: number | null): x is number => typeof x === "number");

        const avgFirstResponseMinutes = firstResponseSamples.length
          ? Math.round(
              firstResponseSamples.reduce((a: number, b: number) => a + b, 0) / firstResponseSamples.length,
            )
          : null;

        let executionScore = 100;
        executionScore -= pending.length * 10;
        executionScore -= pendingClients.length * 8;
        executionScore -= noFirstContactClients.length * 7;
        executionScore -= stalled.length * 6;
        if (avgFirstResponseMinutes && avgFirstResponseMinutes > Number(aiConfig.thresholds.leadPendingReplyMinutesForm || 30)) {
          executionScore -= Math.min(
            18,
            Math.round((avgFirstResponseMinutes - Number(aiConfig.thresholds.leadPendingReplyMinutesForm || 30)) / 10)
          );
        }
        if (activeLeads.length > Number(aiConfig.coaching.overloadLeadsPerAgent || 25)) {
          executionScore -= Math.min(20, (activeLeads.length - Number(aiConfig.coaching.overloadLeadsPerAgent || 25)) * 2);
        }
        executionScore += Math.min(10, won.length * 2);
        executionScore = clampNumber(executionScore, 0, 100);

        const workloadStatus =
          activeLeads.length > Number(aiConfig.coaching.overloadLeadsPerAgent || 25) ||
          pending.length + pendingClients.length > Number(aiConfig.coaching.maxPendingReplyPerAgent || 5)
            ? "overloaded"
            : executionScore < Number(aiConfig.coaching.minExecutionScore || 70)
              ? "attention"
              : "balanced";

        return {
          userId: mid,
          name: m.user?.name ? String(m.user.name) : null,
          email: m.user?.email ? String(m.user.email) : null,
          username: m.user?.username ? String(m.user.username) : null,
          role: String(m.role || ""),
          activeLeads: activeLeads.length,
          pendingReply: pending.length,
          stalledLeads: stalled.length,
          activeClients: activeClients.length,
          clientPendingReply: pendingClients.length,
          clientNoFirstContact: noFirstContactClients.length,
          wonLeads: won.length,
          lostLeads: lost.length,
          avgFirstResponseMinutes,
          executionScore,
          workloadStatus,
        };
      })
      .sort((a, b) => {
        if (b.pendingReply !== a.pendingReply) return b.pendingReply - a.pendingReply;
        if (b.stalledLeads !== a.stalledLeads) return b.stalledLeads - a.stalledLeads;
        return b.activeLeads - a.activeLeads;
      });

    const coachingMembers = memberStats
      .map((member) => ({
        ...member,
        totalPending: Number(member.pendingReply || 0) + Number(member.clientPendingReply || 0),
      }))
      .sort((a, b) => Number(a.executionScore || 0) - Number(b.executionScore || 0));

    const teamExecutionScore = average(coachingMembers.map((member) => Number(member.executionScore || 0))) ?? 100;
    const avgFirstResponseMinutes = average(coachingMembers.map((member) => member.avgFirstResponseMinutes ?? null));
    const workloadSamples = coachingMembers.map((member) => Number(member.activeLeads || 0));
    const workloadImbalanceIndex = workloadSamples.length > 1 ? Math.max(...workloadSamples) - Math.min(...workloadSamples) : 0;
    const automationCoverage = {
      enabledRules: Object.values(aiConfig.automations).filter(Boolean).length,
      totalRules: Object.keys(aiConfig.automations).length,
      activeChannels: Object.values(aiConfig.channels).filter(Boolean).length,
      totalChannels: Object.keys(aiConfig.channels).length,
    };

    const coachingAlerts: AgencyInsight[] = [];
    const weakestMembers = coachingMembers.filter((member) => Number(member.executionScore || 0) < Number(aiConfig.coaching.minExecutionScore || 70));
    if (weakestMembers.length > 0) {
      const focus = weakestMembers[0];
      coachingAlerts.push({
        title: "Execução abaixo da meta",
        detail: `${focus.name || focus.email || "Um corretor"} está com score ${focus.executionScore}/100 e precisa de coaching operacional.`,
        severity: Number(focus.executionScore || 0) < 50 ? "critical" : "warning",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm?realtorId=${encodeURIComponent(focus.userId)}`,
        hrefLabel: "Abrir carteira",
      });
    }

    if (
      aiConfig.coaching.alertOnWorkloadImbalance &&
      workloadImbalanceIndex >= Math.max(5, Math.round(Number(aiConfig.coaching.overloadLeadsPerAgent || 25) / 2))
    ) {
      coachingAlerts.push({
        title: "Carga do time desequilibrada",
        detail: `A diferença entre as carteiras ativas chegou a ${workloadImbalanceIndex} leads.`,
        severity: workloadImbalanceIndex >= Number(aiConfig.coaching.overloadLeadsPerAgent || 25) ? "critical" : "warning",
        href: "/agency/team#distribution",
        hrefLabel: "Ajustar distribuição",
      });
    }

    if (teamExecutionScore < Number(aiConfig.coaching.minExecutionScore || 70)) {
      coachingAlerts.push({
        title: "Meta de execução do time em risco",
        detail: `O score médio do time está em ${teamExecutionScore}/100, abaixo da meta de ${aiConfig.coaching.minExecutionScore}.`,
        severity: teamExecutionScore < 55 ? "critical" : "warning",
        href: "/agency",
        hrefLabel: "Abrir central IA",
      });
    }

    const highlights: AgencyInsight[] = [];

    if (pendingReplyTotal > 0) {
      highlights.push({
        title: "Clientes aguardando resposta",
        detail: `${pendingReplyTotal} lead${pendingReplyTotal === 1 ? "" : "s"} com última mensagem do cliente sem retorno.`,
        severity: pendingReplyTotal >= 10 ? "critical" : "warning",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm`,
        hrefLabel: "Abrir painel do time",
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
        hrefLabel: "Ver no painel",
      });

      const unassignedAging = (leads as any[]).filter((l: any) => {
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

    if (clientPendingReplyTotal > 0) {
      highlights.push({
        title: "Clientes institucionais aguardando retorno",
        detail: `${clientPendingReplyTotal} cliente${clientPendingReplyTotal === 1 ? "" : "s"} com inbound sem retorno registrado.`,
        severity: clientPendingReplyTotal >= 10 ? "critical" : "warning",
        href: `/agency/clients?sla=PENDING_REPLY`,
        hrefLabel: "Abrir clientes",
      });
    }

    if (clientNoFirstContact > 0) {
      highlights.push({
        title: "Clientes sem primeiro contato",
        detail: `${clientNoFirstContact} cliente${clientNoFirstContact === 1 ? "" : "s"} ativo${clientNoFirstContact === 1 ? "" : "s"} sem primeiro contato registrado.`,
        severity: clientNoFirstContact >= 8 ? "critical" : "warning",
        href: `/agency/clients?sla=NO_FIRST_CONTACT`,
        hrefLabel: "Ver clientes",
      });
    }

    if (clientOverdueNextAction > 0) {
      highlights.push({
        title: "Próximas ações de clientes vencidas",
        detail: `${clientOverdueNextAction} cliente${clientOverdueNextAction === 1 ? "" : "s"} com próxima ação vencida.`,
        severity: clientOverdueNextAction >= 8 ? "warning" : "info",
        href: `/agency/clients?sla=OVERDUE_NEXT_ACTION`,
        hrefLabel: "Priorizar agora",
      });
    }

    if (clientUnassigned > 0) {
      highlights.push({
        title: "Clientes sem responsável",
        detail: `${clientUnassigned} cliente${clientUnassigned === 1 ? "" : "s"} ativo${clientUnassigned === 1 ? "" : "s"} sem responsável atribuído.`,
        severity: clientUnassigned >= 5 ? "warning" : "info",
        href: `/agency/clients?sla=UNASSIGNED`,
        hrefLabel: "Distribuir clientes",
      });
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

    const stalledTotal = (leads as any[]).filter((l: any) => {
      if (!activeLeadIds.has(String(l.id))) return false;
      const u = l.updatedAt ? new Date(l.updatedAt) : null;
      if (!u || Number.isNaN(u.getTime())) return false;
      return u < staleThreshold;
    }).length;
    if (stalledTotal > 0) {
      highlights.push({
        title: `Leads parados (${staleLeadDays}+ dias sem atualização)`,
        detail: `${stalledTotal} lead${stalledTotal === 1 ? "" : "s"} sem atualização há mais de ${staleLeadDays} dia${staleLeadDays === 1 ? "" : "s"}.`,
        severity: stalledTotal >= 10 ? "warning" : "info",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm`,
        hrefLabel: "Abrir painel",
      });
    }

    highlights.push(...coachingAlerts);

    const activeByStage = Object.entries(byStageActive)
      .filter(([k]) => k !== "WON" && k !== "LOST")
      .sort((a, b) => Number(b[1]) - Number(a[1]));

    const topStage = activeByStage[0]?.[0] || null;
    if (topStage && Number(activeByStage[0]?.[1] || 0) > 0) {
      highlights.push({
        title: "Maior acúmulo no funil",
        detail: `Etapa ${topStage}: ${Number(activeByStage[0]?.[1] || 0)} lead${Number(activeByStage[0]?.[1] || 0) === 1 ? "" : "s"}.`,
        severity: "info",
        href: `/agency/teams/${encodeURIComponent(String(teamId))}/crm?stage=${encodeURIComponent(String(topStage))}`,
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
      parts.push(`clientes ativos: ${clientActiveTotal}`);
      if (pendingReplyTotal > 0) parts.push(`pendentes de resposta: ${pendingReplyTotal}`);
      if (clientPendingReplyTotal > 0) parts.push(`clientes aguardando retorno: ${clientPendingReplyTotal}`);
      if (unassigned > 0) parts.push(`sem responsável: ${unassigned}`);
      if (clientUnassigned > 0) parts.push(`clientes sem responsável: ${clientUnassigned}`);
      if (newLast24h > 0) parts.push(`novos 24h: ${newLast24h}`);
      parts.push(`score do time: ${teamExecutionScore}`);
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
      clients: {
        total: clients.length,
        activeTotal: clientActiveTotal,
        newLast24h: clientNewLast24h,
        unassigned: clientUnassigned,
        byStage: clientByStageActive,
        byIntent: clientByIntentActive,
      },
      sla: {
        pendingReplyTotal,
        pendingReplyLeads,
        clientPendingReplyTotal,
        pendingReplyClients: clientPendingReplyRows.slice(0, 25),
        clientNoFirstContact,
        clientOverdueNextAction,
      },
      aiConfig,
      coaching: {
        teamExecutionScore,
        minExecutionScoreTarget: Number(aiConfig.coaching.minExecutionScore || 70),
        avgFirstResponseMinutes,
        workloadImbalanceIndex,
        automationCoverage,
        alerts: coachingAlerts,
        members: coachingMembers,
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
