import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadAutoReplyService } from "@/lib/lead-auto-reply-service";

export const runtime = "nodejs";

function parseRange(range: string | null): { since: Date; label: "24h" | "7d" } {
  const now = new Date();
  if (range === "7d") {
    return { since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), label: "7d" };
  }
  return { since: new Date(now.getTime() - 24 * 60 * 60 * 1000), label: "24h" };
}

function safeString(x: any) {
  return String(x ?? "").trim();
}

function clampText(input: string, maxLen: number) {
  const s = safeString(input);
  if (!s) return "";
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trim();
}

function asObject(x: any): Record<string, any> | null {
  if (!x || typeof x !== "object") return null;
  if (Array.isArray(x)) return null;
  return x as any;
}

function readOfflineAssistantStateFromEventMeta(meta: any) {
  const s = asObject(meta)?.offlineAssistantState;
  const state = asObject(s) || null;
  const clientSlots = asObject(state?.clientSlots) || null;

  const asked = asObject(state?.asked) || null;
  const visitPreferences = asObject(state?.visitPreferences) || null;

  const vpDaysRaw = Array.isArray(visitPreferences?.days) ? visitPreferences?.days : null;
  const vpDays = Array.isArray(vpDaysRaw) ? vpDaysRaw.map((d: any) => safeString(d)).filter(Boolean) : null;

  return {
    lastQuestion: safeString(state?.lastQuestion) || null,
    visitRequested: Boolean(state?.visitRequested),
    visitPreferences: visitPreferences
      ? {
          period: safeString(visitPreferences?.period) || null,
          days: vpDays,
          time: safeString(visitPreferences?.time) || null,
        }
      : null,
    clientSlots: clientSlots || null,
    asked: asked || null,
    conversationMode: safeString(state?.conversationMode) || null,
    qualification: asObject(state?.qualification) || null,
    handoff: asObject(state?.handoff) || null,
    lastRecommendedAction: safeString(state?.lastRecommendedAction) || null,
    lastIntent: safeString(state?.lastIntent) || null,
    commercialSummary: safeString(state?.commercialSummary) || null,
  };
}

function readAiJsonFromEventMeta(meta: any) {
  const aiJson = asObject(asObject(meta)?.aiJson);
  if (!aiJson) return null;

  return {
    nextQuestion: safeString(aiJson?.nextQuestion) || null,
    handoffNeeded: aiJson?.handoffNeeded === null || aiJson?.handoffNeeded === undefined ? null : Boolean(aiJson?.handoffNeeded),
    finalHandoffNeeded:
      aiJson?.finalHandoffNeeded === null || aiJson?.finalHandoffNeeded === undefined ? null : Boolean(aiJson?.finalHandoffNeeded),
    visitHandoffNeeded:
      aiJson?.visitHandoffNeeded === null || aiJson?.visitHandoffNeeded === undefined ? null : Boolean(aiJson?.visitHandoffNeeded),
    missingInfo: Array.isArray(aiJson?.missingInfo) ? aiJson?.missingInfo.map((x: any) => safeString(x)).filter(Boolean) : null,
    conversationMode: safeString(aiJson?.conversationMode) || null,
    handoffReason: safeString(aiJson?.handoffReason) || null,
    recommendedNextStep: safeString(aiJson?.recommendedNextStep) || null,
    leadTemperatureHint: safeString(aiJson?.leadTemperatureHint) || null,
    objectionsDetected: Array.isArray(aiJson?.objectionsDetected) ? aiJson.objectionsDetected.map((x: any) => safeString(x)).filter(Boolean) : null,
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
  const guardrails = asObject(asObject(meta)?.guardrails);
  if (!guardrails) return null;
  return {
    version: safeString(guardrails?.version) || null,
    scenario: safeString(guardrails?.scenario) || null,
    appliedRules: Array.isArray(guardrails?.appliedRules) ? guardrails.appliedRules.map((x: any) => safeString(x)).filter(Boolean) : [],
  };
}

function readVisitPreferencesFromVisitRequestedEventMeta(meta: any) {
  const prefs = asObject(asObject(meta)?.preferences);
  if (!prefs) return null;

  const daysRaw = Array.isArray(prefs?.days) ? prefs.days : null;
  const days = Array.isArray(daysRaw) ? daysRaw.map((d: any) => safeString(d)).filter(Boolean) : null;

  return {
    period: safeString(prefs?.period) || null,
    days,
    time: safeString(prefs?.time) || null,
  };
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

    const { since, label } = parseRange(req.nextUrl.searchParams.get("range"));

    const settings = await LeadAutoReplyService.getSettings(user.id);

    let logsRaw: any[] = [];
    try {
      logsRaw = await (prisma as any).leadAutoReplyLog.findMany({
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 250,
        select: {
          id: true,
          leadId: true,
          decision: true,
          reason: true,
          createdAt: true,
          lead: {
            select: {
              contact: { select: { name: true } },
              property: { select: { title: true } },
            },
          },
        },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      logsRaw = [];
    }

    const leadIds = Array.from(
      new Set((Array.isArray(logsRaw) ? logsRaw : []).map((x: any) => safeString(x?.leadId)).filter(Boolean))
    );

    if (!leadIds.length) {
      return NextResponse.json({
        range: label,
        since,
        enabled: Boolean(settings.enabled),
        rollout: (settings as any)?.rollout || null,
        versions: (settings as any)?.versions || null,
        items: [],
      });
    }

    const windowEnd = new Date();

    let lastClientMessages: any[] = [];
    let lastAssistantMessages: any[] = [];
    let eventsRaw: any[] = [];

    try {
      lastClientMessages = await (prisma as any).leadClientMessage.findMany({
        where: {
          leadId: { in: leadIds },
          fromClient: true,
          createdAt: { gte: since, lte: windowEnd },
        },
        orderBy: { createdAt: "desc" },
        select: { leadId: true, content: true, createdAt: true },
        take: 1000,
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      lastClientMessages = [];
    }

    try {
      lastAssistantMessages = await (prisma as any).leadClientMessage.findMany({
        where: {
          leadId: { in: leadIds },
          fromClient: false,
          source: "AUTO_REPLY_AI" as any,
          createdAt: { gte: since, lte: windowEnd },
        },
        orderBy: { createdAt: "desc" },
        select: { leadId: true, content: true, createdAt: true },
        take: 1000,
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      lastAssistantMessages = [];
    }

    try {
      eventsRaw = await (prisma as any).leadEvent.findMany({
        where: {
          leadId: { in: leadIds },
          createdAt: { gte: since, lte: windowEnd },
          type: {
            in: ["AUTO_REPLY_SENT", "AUTO_REPLY_SKIPPED", "AUTO_REPLY_FAILED", "VISIT_REQUESTED"] as any,
          },
        },
        orderBy: { createdAt: "desc" },
        select: { leadId: true, type: true, createdAt: true, metadata: true },
        take: 1500,
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      eventsRaw = [];
    }

    const lastClientByLead = new Map<string, any>();
    for (const m of Array.isArray(lastClientMessages) ? lastClientMessages : []) {
      const leadId = safeString(m?.leadId);
      if (!leadId || lastClientByLead.has(leadId)) continue;
      lastClientByLead.set(leadId, m);
    }

    const lastAssistantByLead = new Map<string, any>();
    for (const m of Array.isArray(lastAssistantMessages) ? lastAssistantMessages : []) {
      const leadId = safeString(m?.leadId);
      if (!leadId || lastAssistantByLead.has(leadId)) continue;
      lastAssistantByLead.set(leadId, m);
    }

    const lastEventByLead = new Map<string, any>();
    const lastSentEventByLead = new Map<string, any>();
    const lastVisitRequestedByLead = new Map<string, any>();

    for (const e of Array.isArray(eventsRaw) ? eventsRaw : []) {
      const leadId = safeString(e?.leadId);
      if (!leadId) continue;

      if (!lastEventByLead.has(leadId)) {
        lastEventByLead.set(leadId, e);
      }

      const t = safeString(e?.type);
      if (t === "AUTO_REPLY_SENT" && !lastSentEventByLead.has(leadId)) {
        lastSentEventByLead.set(leadId, e);
      }
      if (t === "VISIT_REQUESTED" && !lastVisitRequestedByLead.has(leadId)) {
        lastVisitRequestedByLead.set(leadId, e);
      }
    }

    const countsByLead = new Map<string, { sent: number; skipped: number; failed: number }>();
    for (const row of Array.isArray(logsRaw) ? logsRaw : []) {
      const leadId = safeString(row?.leadId);
      if (!leadId) continue;
      const decision = safeString(row?.decision).toUpperCase();
      const prev = countsByLead.get(leadId) || { sent: 0, skipped: 0, failed: 0 };
      if (decision === "SENT") prev.sent += 1;
      else if (decision === "FAILED") prev.failed += 1;
      else prev.skipped += 1;
      countsByLead.set(leadId, prev);
    }

    const items = leadIds
      .map((leadId) => {
        const log = (Array.isArray(logsRaw) ? logsRaw : []).find((x: any) => safeString(x?.leadId) === leadId) || null;
        const contactName = log?.lead?.contact?.name ? safeString(log.lead.contact.name) : null;
        const propertyTitle = log?.lead?.property?.title ? safeString(log.lead.property.title) : null;
        const counts = countsByLead.get(leadId) || { sent: 0, skipped: 0, failed: 0 };

        const lastClient = lastClientByLead.get(leadId) || null;
        const lastAssistant = lastAssistantByLead.get(leadId) || null;

        const lastEvent = lastEventByLead.get(leadId) || null;
        const lastSentEvent = lastSentEventByLead.get(leadId) || null;
        const lastVisitRequested = lastVisitRequestedByLead.get(leadId) || null;

        const sentMeta = lastSentEvent ? asObject(lastSentEvent?.metadata) : null;
        const aiJson = sentMeta ? readAiJsonFromEventMeta(sentMeta) : null;
        const stateFromSent = sentMeta ? readOfflineAssistantStateFromEventMeta(sentMeta) : null;
        const qualification = sentMeta ? readQualificationFromEventMeta(sentMeta) : null;
        const handoff = sentMeta ? readHandoffFromEventMeta(sentMeta) : null;
        const policy = sentMeta ? readPolicyFromEventMeta(sentMeta) : null;
        const propertyContext = sentMeta ? readPropertyContextFromEventMeta(sentMeta) : null;
        const operationalPlaybook = sentMeta ? readOperationalPlaybookFromEventMeta(sentMeta) : null;
        const experiment = sentMeta ? readExperimentFromEventMeta(sentMeta) : null;
        const guardrails = sentMeta ? readGuardrailsFromEventMeta(sentMeta) : null;

        const visitPrefsFromVisitRequested = lastVisitRequested ? readVisitPreferencesFromVisitRequestedEventMeta(lastVisitRequested?.metadata) : null;
        const visitRequested = Boolean(stateFromSent?.visitRequested) || Boolean(visitPrefsFromVisitRequested);
        const visitPreferences = visitPrefsFromVisitRequested || stateFromSent?.visitPreferences || null;

        const handoffNeeded =
          handoff?.needed === true ||
          aiJson?.finalHandoffNeeded === true ||
          (aiJson?.finalHandoffNeeded == null && aiJson?.handoffNeeded === true);
        const nextQuestion = safeString(policy?.nextQuestion) || aiJson?.nextQuestion || stateFromSent?.lastQuestion || null;
        const commercialSummary =
          safeString(sentMeta?.commercialSummary) ||
          safeString(stateFromSent?.commercialSummary) ||
          safeString(qualification?.commercialSummary) ||
          null;

        const lastActivityAt = (() => {
          const candidates = [
            lastEvent?.createdAt ? new Date(lastEvent.createdAt).getTime() : 0,
            lastAssistant?.createdAt ? new Date(lastAssistant.createdAt).getTime() : 0,
            lastClient?.createdAt ? new Date(lastClient.createdAt).getTime() : 0,
          ].filter((x) => Number.isFinite(x) && x > 0);
          const max = candidates.length ? Math.max(...candidates) : 0;
          return max ? new Date(max).toISOString() : null;
        })();

        return {
          leadId,
          contactName,
          propertyTitle,
          lastActivityAt,
          counts,
          lastClientMessagePreview: lastClient?.content ? clampText(String(lastClient.content), 160) : null,
          lastAssistantMessagePreview: lastAssistant?.content ? clampText(String(lastAssistant.content), 160) : null,
          handoffNeeded,
          nextQuestion,
          visitRequested,
          visitPreferences,
          clientSlots: stateFromSent?.clientSlots || null,
          conversationMode: safeString(policy?.conversationMode) || stateFromSent?.conversationMode || aiJson?.conversationMode || null,
          qualification,
          handoff,
          policy,
          commercialSummary,
          propertyContext,
          operationalPlaybook,
          experiment,
          guardrails,
        };
      })
      .sort((a: any, b: any) => {
        const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return tb - ta;
      });

    return NextResponse.json({
      range: label,
      since,
      enabled: Boolean(settings.enabled),
      rollout: (settings as any)?.rollout || null,
      versions: (settings as any)?.versions || null,
      items,
    });
  } catch (error) {
    console.error("Erro ao buscar resumos por lead do assistente offline:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
