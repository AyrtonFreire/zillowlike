import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadAutoReplyService } from "@/lib/lead-auto-reply-service";
import { evaluateVisitRequestState } from "@/lib/visit-request-lifecycle";

export const runtime = "nodejs";

function safeString(x: any) {
  return String(x ?? "").trim();
}

function safeDate(x: any): Date | null {
  const d = x ? new Date(x) : null;
  if (!d) return null;
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseRange(range: string | null): { since: Date; label: "24h" | "7d" } {
  const now = new Date();
  if (range === "24h") {
    return { since: new Date(now.getTime() - 24 * 60 * 60 * 1000), label: "24h" };
  }
  return { since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), label: "7d" };
}

function asObject(x: any): Record<string, any> | null {
  if (!x || typeof x !== "object") return null;
  if (Array.isArray(x)) return null;
  return x as any;
}

function readAiJsonFromEventMeta(meta: any) {
  const aiJson = asObject(asObject(meta)?.aiJson);
  if (!aiJson) return null;
  return {
    handoffNeeded:
      aiJson?.handoffNeeded === null || aiJson?.handoffNeeded === undefined ? null : Boolean(aiJson?.handoffNeeded),
    finalHandoffNeeded:
      aiJson?.finalHandoffNeeded === null || aiJson?.finalHandoffNeeded === undefined
        ? null
        : Boolean(aiJson?.finalHandoffNeeded),
    visitHandoffNeeded:
      aiJson?.visitHandoffNeeded === null || aiJson?.visitHandoffNeeded === undefined
        ? null
        : Boolean(aiJson?.visitHandoffNeeded),
    conversationMode: safeString(aiJson?.conversationMode) || null,
  };
}

function readQualificationFromEventMeta(meta: any) {
  return asObject(asObject(meta)?.qualification) || null;
}

function readHandoffFromEventMeta(meta: any) {
  return asObject(asObject(meta)?.handoff) || null;
}

function readPolicyFromEventMeta(meta: any) {
  return asObject(asObject(meta)?.policy) || null;
}

function readPropertyContextFromEventMeta(meta: any) {
  return asObject(asObject(meta)?.propertyContext) || null;
}

function readOperationalPlaybookFromEventMeta(meta: any) {
  return asObject(asObject(meta)?.operationalPlaybook) || null;
}

function readExperimentFromEventMeta(meta: any) {
  return asObject(asObject(meta)?.experiment) || null;
}

function readGuardrailsFromEventMeta(meta: any) {
  return asObject(asObject(meta)?.guardrails) || null;
}

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (user.role !== "REALTOR" && user.role !== "AGENCY" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { since: windowSince, label: windowLabel } = parseRange(req.nextUrl.searchParams.get("range"));
    const seenAtRaw = safeString(req.nextUrl.searchParams.get("seenAt"));
    const seenAt = safeDate(seenAtRaw);

    const settings = await LeadAutoReplyService.getSettings(user.id);

    let windowLogs: any[] = [];
    try {
      windowLogs = await (prisma as any).leadAutoReplyLog.findMany({
        where: {
          realtorId: user.id,
          createdAt: { gte: windowSince },
          decision: { in: ["SENT", "FAILED"] as any },
        },
        orderBy: { createdAt: "desc" },
        take: 800,
        select: {
          leadId: true,
          decision: true,
          createdAt: true,
        },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") throw error;
      windowLogs = [];
    }

    const byLead = new Map<
      string,
      {
        leadId: string;
        lastActivityAt: Date;
        sent: number;
        failed: number;
      }
    >();

    for (const row of Array.isArray(windowLogs) ? windowLogs : []) {
      const leadId = safeString(row?.leadId);
      if (!leadId) continue;
      const createdAt = safeDate(row?.createdAt);
      if (!createdAt) continue;

      const decision = safeString(row?.decision).toUpperCase();
      const existing = byLead.get(leadId);

      if (!existing) {
        byLead.set(leadId, {
          leadId,
          lastActivityAt: createdAt,
          sent: decision === "SENT" ? 1 : 0,
          failed: decision === "FAILED" ? 1 : 0,
        });
        continue;
      }

      if (decision === "SENT") existing.sent += 1;
      if (decision === "FAILED") existing.failed += 1;
    }

    const windowLeads = Array.from(byLead.values()).sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

    const windowTotals = {
      leads: windowLeads.length,
      sent: windowLeads.reduce((acc, x) => acc + x.sent, 0),
      failed: windowLeads.reduce((acc, x) => acc + x.failed, 0),
      lastActivityAt: windowLeads.length ? windowLeads[0].lastActivityAt.toISOString() : null,
      handoffLeads: 0,
      visitRequestedLeads: 0,
      hotLeads: 0,
      urgentLeads: 0,
      qualifiedLeads: 0,
      avgDataCompleteness: 0,
      topVariant: null as string | null,
      topGuardrailScenario: null as string | null,
    };

    const windowLeadIds = windowLeads.map((x) => x.leadId);

    let eventsRaw: any[] = [];
    let leadVisitRows: any[] = [];
    let latestVisitRequestedEvents: any[] = [];
    let latestVisitConfirmedEvents: any[] = [];
    let latestVisitRejectedEvents: any[] = [];
    if (windowLeadIds.length) {
      try {
        eventsRaw = await (prisma as any).leadEvent.findMany({
          where: {
            leadId: { in: windowLeadIds },
            createdAt: { gte: windowSince },
            type: { in: ["AUTO_REPLY_SENT", "VISIT_REQUESTED"] as any },
          },
          orderBy: { createdAt: "desc" },
          take: 1500,
          select: { leadId: true, type: true, createdAt: true, metadata: true },
        });
      } catch (error: any) {
        if (error?.code !== "P2021") throw error;
        eventsRaw = [];
      }

      [leadVisitRows, latestVisitRequestedEvents, latestVisitConfirmedEvents, latestVisitRejectedEvents] = await Promise.all([
        (prisma as any).lead.findMany({
          where: { id: { in: windowLeadIds } },
          select: { id: true, visitDate: true, ownerApproved: true },
        }).catch(() => []),
        (prisma as any).leadEvent.findMany({
          where: { leadId: { in: windowLeadIds }, type: "VISIT_REQUESTED" as any },
          orderBy: { createdAt: "desc" },
          distinct: ["leadId"],
          select: { leadId: true, createdAt: true, metadata: true },
        }).catch(() => []),
        (prisma as any).leadEvent.findMany({
          where: { leadId: { in: windowLeadIds }, type: "VISIT_CONFIRMED" as any },
          orderBy: { createdAt: "desc" },
          distinct: ["leadId"],
          select: { leadId: true, createdAt: true },
        }).catch(() => []),
        (prisma as any).leadEvent.findMany({
          where: { leadId: { in: windowLeadIds }, type: "VISIT_REJECTED" as any },
          orderBy: { createdAt: "desc" },
          distinct: ["leadId"],
          select: { leadId: true, createdAt: true },
        }).catch(() => []),
      ]);
    }

    const latestSentByLead = new Map<string, any>();
    for (const e of Array.isArray(eventsRaw) ? eventsRaw : []) {
      const leadId = safeString(e?.leadId);
      if (!leadId) continue;
      const t = safeString(e?.type);
      if (t === "AUTO_REPLY_SENT" && !latestSentByLead.has(leadId)) latestSentByLead.set(leadId, e);
    }

    const leadVisitMap = new Map<string, any>((Array.isArray(leadVisitRows) ? leadVisitRows : []).map((row: any) => [safeString(row?.id), row]));
    const latestVisitRequestedByLead = new Map<string, any>((Array.isArray(latestVisitRequestedEvents) ? latestVisitRequestedEvents : []).map((row: any) => [safeString(row?.leadId), row]));
    const latestVisitConfirmedByLead = new Map<string, any>((Array.isArray(latestVisitConfirmedEvents) ? latestVisitConfirmedEvents : []).map((row: any) => [safeString(row?.leadId), row]));
    const latestVisitRejectedByLead = new Map<string, any>((Array.isArray(latestVisitRejectedEvents) ? latestVisitRejectedEvents : []).map((row: any) => [safeString(row?.leadId), row]));

    const handoffLeadIds = new Set<string>();
    const visitLeadIds = new Set<string>();
    const hotLeadIds = new Set<string>();
    const urgentLeadIds = new Set<string>();
    const qualifiedLeadIds = new Set<string>();
    const variantCounts = new Map<string, number>();
    const guardrailScenarioCounts = new Map<string, number>();
    let completenessTotal = 0;
    let completenessCount = 0;

    for (const leadId of windowLeadIds) {
      const sentEvt = latestSentByLead.get(leadId);
      const sentMeta = asObject(sentEvt?.metadata) || null;
      const aiJson = readAiJsonFromEventMeta(sentEvt?.metadata);
      const qualification = readQualificationFromEventMeta(sentMeta);
      const handoff = readHandoffFromEventMeta(sentMeta);
      const experiment = readExperimentFromEventMeta(sentMeta);
      const guardrails = readGuardrailsFromEventMeta(sentMeta);
      const finalHandoffNeeded = aiJson?.finalHandoffNeeded;
      const handoffNeeded = aiJson?.handoffNeeded;
      const leadTemperature = safeString(qualification?.leadTemperature).toUpperCase();
      const responsePriority = safeString(handoff?.priority || qualification?.responsePriority).toUpperCase();
      const completeness = Number(qualification?.dataCompleteness);
      const variant = safeString(experiment?.variant) || "CONTROL";
      const guardrailScenario = safeString(guardrails?.scenario) || "NONE";

      if (handoff?.needed === true || finalHandoffNeeded === true || (finalHandoffNeeded === null && handoffNeeded === true)) {
        handoffLeadIds.add(leadId);
      }

      const visitRequestedEvent = latestVisitRequestedByLead.get(leadId);
      const visitState = evaluateVisitRequestState({
        requestedAt: visitRequestedEvent?.createdAt,
        confirmedAt: latestVisitConfirmedByLead.get(leadId)?.createdAt,
        rejectedAt: latestVisitRejectedByLead.get(leadId)?.createdAt,
        leadVisitDate: leadVisitMap.get(leadId)?.visitDate,
        ownerApproved: leadVisitMap.get(leadId)?.ownerApproved,
      });

      if (visitState.isPending || (aiJson?.visitHandoffNeeded === true && !visitRequestedEvent)) {
        visitLeadIds.add(leadId);
      }

      if (leadTemperature === "HOT") hotLeadIds.add(leadId);
      if (responsePriority === "URGENT") urgentLeadIds.add(leadId);
      if (Number.isFinite(completeness) && completeness >= 70) qualifiedLeadIds.add(leadId);

      variantCounts.set(variant, Number(variantCounts.get(variant) || 0) + 1);
      guardrailScenarioCounts.set(guardrailScenario, Number(guardrailScenarioCounts.get(guardrailScenario) || 0) + 1);
      if (Number.isFinite(completeness)) {
        completenessTotal += completeness;
        completenessCount += 1;
      }
    }

    windowTotals.handoffLeads = handoffLeadIds.size;
    windowTotals.visitRequestedLeads = visitLeadIds.size;
    windowTotals.hotLeads = hotLeadIds.size;
    windowTotals.urgentLeads = urgentLeadIds.size;
    windowTotals.qualifiedLeads = qualifiedLeadIds.size;
    windowTotals.avgDataCompleteness = completenessCount ? Math.round(completenessTotal / completenessCount) : 0;
    windowTotals.topVariant = Array.from(variantCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    windowTotals.topGuardrailScenario = Array.from(guardrailScenarioCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const topLeadIds = windowLeadIds.slice(0, 3);

    let leadsInfo: any[] = [];
    if (topLeadIds.length) {
      leadsInfo = await (prisma as any).lead.findMany({
        where: { id: { in: topLeadIds } },
        select: {
          id: true,
          contact: { select: { name: true } },
          property: { select: { title: true } },
        },
      });
    }

    const infoById = new Map<string, any>();
    for (const l of Array.isArray(leadsInfo) ? leadsInfo : []) {
      infoById.set(String((l as any)?.id || ""), l);
    }

    const items = topLeadIds
      .map((leadId) => {
        const agg = byLead.get(leadId);
        const info = infoById.get(leadId) || null;

        const sentEvt = latestSentByLead.get(leadId);
        const sentMeta = asObject(sentEvt?.metadata) || null;
        const aiJson = readAiJsonFromEventMeta(sentEvt?.metadata);
        const qualification = readQualificationFromEventMeta(sentMeta);
        const handoff = readHandoffFromEventMeta(sentMeta);
        const policy = readPolicyFromEventMeta(sentMeta);
        const propertyContext = readPropertyContextFromEventMeta(sentMeta);
        const operationalPlaybook = readOperationalPlaybookFromEventMeta(sentMeta);
        const experiment = readExperimentFromEventMeta(sentMeta);
        const guardrails = readGuardrailsFromEventMeta(sentMeta);
        const finalHandoffNeeded = aiJson?.finalHandoffNeeded;
        const handoffNeeded = aiJson?.handoffNeeded;
        const needsHandoff = handoff?.needed === true || finalHandoffNeeded === true || (finalHandoffNeeded === null && handoffNeeded === true);

        const visitRequested = visitLeadIds.has(leadId);
        const commercialSummary =
          safeString(sentMeta?.commercialSummary) ||
          safeString(asObject(sentMeta?.offlineAssistantState)?.commercialSummary) ||
          safeString(qualification?.commercialSummary) ||
          null;

        return {
          leadId,
          contactName: info?.contact?.name ? String(info.contact.name) : null,
          propertyTitle: info?.property?.title ? String(info.property.title) : null,
          lastActivityAt: agg?.lastActivityAt ? agg.lastActivityAt.toISOString() : null,
          counts: {
            sent: Number(agg?.sent || 0),
            failed: Number(agg?.failed || 0),
          },
          handoffNeeded: needsHandoff,
          visitRequested,
          conversationMode: safeString(policy?.conversationMode) || aiJson?.conversationMode || null,
          leadTemperature: safeString(qualification?.leadTemperature) || null,
          responsePriority: safeString(handoff?.priority || qualification?.responsePriority) || null,
          commercialSummary,
          propertyContext,
          operationalPlaybook,
          experiment,
          guardrails,
        };
      })
      .filter(Boolean);

    const seenAtForNew = seenAt ? seenAt : null;

    let newTotals = {
      leads: 0,
      sent: 0,
      failed: 0,
      lastActivityAt: null as string | null,
    };

    if (seenAtForNew) {
      const [newSent, newFailed, newLast] = await Promise.all([
        (prisma as any).leadAutoReplyLog
          .count({
            where: {
              realtorId: user.id,
              createdAt: { gt: seenAtForNew },
              decision: "SENT" as any,
            },
          })
          .catch(() => 0),
        (prisma as any).leadAutoReplyLog
          .count({
            where: {
              realtorId: user.id,
              createdAt: { gt: seenAtForNew },
              decision: "FAILED" as any,
            },
          })
          .catch(() => 0),
        (prisma as any).leadAutoReplyLog
          .findFirst({
            where: {
              realtorId: user.id,
              createdAt: { gt: seenAtForNew },
              decision: { in: ["SENT", "FAILED"] as any },
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          })
          .catch(() => null),
      ]);

      let newLeadIds: any[] = [];
      try {
        newLeadIds = await (prisma as any).leadAutoReplyLog.findMany({
          where: {
            realtorId: user.id,
            createdAt: { gt: seenAtForNew },
            decision: { in: ["SENT", "FAILED"] as any },
          },
          distinct: ["leadId"],
          select: { leadId: true },
          take: 1000,
        });
      } catch (error: any) {
        if (error?.code !== "P2021") throw error;
        newLeadIds = [];
      }

      newTotals = {
        leads: Array.isArray(newLeadIds) ? newLeadIds.length : 0,
        sent: Number(newSent || 0),
        failed: Number(newFailed || 0),
        lastActivityAt: newLast?.createdAt ? new Date(newLast.createdAt).toISOString() : null,
      };
    }

    return NextResponse.json({
      success: true,
      enabled: Boolean(settings.enabled),
      rollout: (settings as any)?.rollout || null,
      versions: (settings as any)?.versions || null,
      range: windowLabel,
      windowSince: windowSince.toISOString(),
      seenAt: seenAtForNew ? seenAtForNew.toISOString() : null,
      windowTotals,
      newTotals,
      items,
    });
  } catch (error) {
    console.error("Erro ao buscar resumo do assistente offline no dashboard:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
