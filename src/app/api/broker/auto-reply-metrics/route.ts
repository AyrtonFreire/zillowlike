import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadAutoReplyService } from "@/lib/lead-auto-reply-service";

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

function asObject(x: any): Record<string, any> | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  return x as any;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    if (user.role !== "REALTOR" && user.role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { since, label } = parseRange(req.nextUrl.searchParams.get("range"));

    const settings = await LeadAutoReplyService.getSettings(user.id);

    let counts: any[] = [];
    try {
      counts = await (prisma as any).leadAutoReplyLog.groupBy({
        by: ["decision"],
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
        },
        _count: { _all: true },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      counts = [];
    }

    const sentCount = Number(counts.find((c: any) => c.decision === "SENT")?._count?._all || 0);
    const skippedCount = Number(counts.find((c: any) => c.decision === "SKIPPED")?._count?._all || 0);
    const failedCount = Number(counts.find((c: any) => c.decision === "FAILED")?._count?._all || 0);

    let sentByReasonRaw: any[] = [];
    try {
      sentByReasonRaw = await (prisma as any).leadAutoReplyLog.groupBy({
        by: ["reason"],
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
          decision: "SENT",
        },
        _count: { _all: true },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      sentByReasonRaw = [];
    }

    const sentByReason = (Array.isArray(sentByReasonRaw) ? sentByReasonRaw : []).map((row: any) => ({
      reason: row.reason ? String(row.reason) : "(sem motivo)",
      count: Number(row?._count?._all || 0),
    }));

    let promptVersionsRaw: any[] = [];
    try {
      promptVersionsRaw = await (prisma as any).leadAutoReplyLog.groupBy({
        by: ["promptVersion"],
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
          decision: "SENT",
        },
        _count: { _all: true },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      promptVersionsRaw = [];
    }

    const promptVersions = (Array.isArray(promptVersionsRaw) ? promptVersionsRaw : [])
      .map((row: any) => ({
        promptVersion: row.promptVersion ? String(row.promptVersion) : "(sem versão)",
        count: Number(row?._count?._all || 0),
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 8);

    const quality = {
      aiJsonParseFailed: Number(sentByReason.find((x: any) => x.reason === "AI_JSON_PARSE_FAILED")?.count || 0),
      factualWithoutFacts: Number(sentByReason.find((x: any) => x.reason === "FACTUAL_WITHOUT_FACTS")?.count || 0),
      placesNearby: Number(sentByReason.find((x: any) => x.reason === "PLACES_NEARBY")?.count || 0),
      openAiKeyMissing: Number(sentByReason.find((x: any) => x.reason === "OPENAI_API_KEY_MISSING")?.count || 0),
    };

    let skippedByReasonRaw: any[] = [];
    try {
      skippedByReasonRaw = await (prisma as any).leadAutoReplyLog.groupBy({
        by: ["reason"],
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
          decision: "SKIPPED",
        },
        _count: { _all: true },
        orderBy: { _count: { reason: "desc" } },
        take: 8,
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      skippedByReasonRaw = [];
    }

    const skippedByReason = (Array.isArray(skippedByReasonRaw) ? skippedByReasonRaw : []).map((row: any) => ({
      reason: row.reason ? String(row.reason) : "(sem motivo)",
      count: Number(row?._count?._all || 0),
    }));

    let recent: any[] = [];
    try {
      recent = await (prisma as any).leadAutoReplyLog.findMany({
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          leadId: true,
          decision: true,
          reason: true,
          createdAt: true,
          lead: {
            select: {
              property: { select: { title: true } },
              contact: { select: { name: true } },
            },
          },
        },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      recent = [];
    }

    let sentEvents: any[] = [];
    try {
      sentEvents = await (prisma as any).leadEvent.findMany({
        where: {
          createdAt: { gte: since },
          type: "AUTO_REPLY_SENT" as any,
          lead: { realtorId: user.id },
        },
        orderBy: { createdAt: "desc" },
        select: { leadId: true, createdAt: true, metadata: true },
        take: 1000,
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      sentEvents = [];
    }

    const funnelLeadIds = {
      hot: new Set<string>(),
      urgent: new Set<string>(),
      handoff: new Set<string>(),
      visit: new Set<string>(),
      qualified: new Set<string>(),
    };
    const variantCounts = new Map<string, number>();
    const guardrailRuleCounts = new Map<string, number>();
    const scenarioCounts = new Map<string, number>();
    const pipelineCounts = new Map<string, number>();
    const checklistCount = { total: 0, items: 0 };
    let completenessTotal = 0;
    let completenessCount = 0;

    for (const event of Array.isArray(sentEvents) ? sentEvents : []) {
      const leadId = safeString(event?.leadId);
      const meta = asObject(event?.metadata);
      if (!leadId || !meta) continue;

      const qualification = asObject(meta?.qualification);
      const handoff = asObject(meta?.handoff);
      const experimentMeta = asObject(meta?.experiment);
      const guardrailsMeta = asObject(meta?.guardrails);
      const playbook = asObject(meta?.operationalPlaybook);

      const leadTemperature = safeString(qualification?.leadTemperature).toUpperCase();
      const responsePriority = safeString(qualification?.responsePriority).toUpperCase();
      const completeness = Number(qualification?.dataCompleteness);
      const handoffNeeded = handoff?.needed === true;
      const visitRequested = Boolean(asObject(meta?.offlineAssistantState)?.visitRequested);
      const variant = safeString(experimentMeta?.variant) || "CONTROL";
      const scenario = safeString(guardrailsMeta?.scenario) || "NONE";
      const pipelineStage = safeString(playbook?.pipelineStage) || safeString(qualification?.recommendedPipelineStage) || "NEW";
      const checklist = Array.isArray(playbook?.actionChecklist) ? playbook.actionChecklist : [];
      const appliedRules = Array.isArray(guardrailsMeta?.appliedRules) ? guardrailsMeta.appliedRules : [];

      variantCounts.set(variant, Number(variantCounts.get(variant) || 0) + 1);
      scenarioCounts.set(scenario, Number(scenarioCounts.get(scenario) || 0) + 1);
      pipelineCounts.set(pipelineStage, Number(pipelineCounts.get(pipelineStage) || 0) + 1);
      for (const rule of appliedRules.map((x: any) => safeString(x)).filter(Boolean)) {
        guardrailRuleCounts.set(rule, Number(guardrailRuleCounts.get(rule) || 0) + 1);
      }

      checklistCount.total += 1;
      checklistCount.items += checklist.length;
      if (Number.isFinite(completeness)) {
        completenessTotal += completeness;
        completenessCount += 1;
      }

      if (leadTemperature === "HOT") funnelLeadIds.hot.add(leadId);
      if (responsePriority === "URGENT") funnelLeadIds.urgent.add(leadId);
      if (handoffNeeded) funnelLeadIds.handoff.add(leadId);
      if (visitRequested) funnelLeadIds.visit.add(leadId);
      if (Number.isFinite(completeness) && completeness >= 70) funnelLeadIds.qualified.add(leadId);
    }

    const experiments = Array.from(variantCounts.entries())
      .map(([variant, count]) => ({ variant, count }))
      .sort((a, b) => b.count - a.count);

    const guardrails = {
      scenarios: Array.from(scenarioCounts.entries())
        .map(([scenario, count]) => ({ scenario, count }))
        .sort((a, b) => b.count - a.count),
      rules: Array.from(guardrailRuleCounts.entries())
        .map(([rule, count]) => ({ rule, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
    };

    const funnel = {
      hotLeads: funnelLeadIds.hot.size,
      urgentLeads: funnelLeadIds.urgent.size,
      handoffLeads: funnelLeadIds.handoff.size,
      visitLeads: funnelLeadIds.visit.size,
      qualifiedLeads: funnelLeadIds.qualified.size,
      averageDataCompleteness: completenessCount ? Math.round(completenessTotal / completenessCount) : 0,
    };

    const operational = {
      avgChecklistItems: checklistCount.total ? Number((checklistCount.items / checklistCount.total).toFixed(1)) : 0,
      pipelineStages: Array.from(pipelineCounts.entries())
        .map(([stage, count]) => ({ stage, count }))
        .sort((a, b) => b.count - a.count),
    };

    return NextResponse.json({
      range: label,
      since,
      enabled: Boolean(settings.enabled),
      rollout: (settings as any)?.rollout || null,
      versions: (settings as any)?.versions || null,
      counts: {
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      sentByReason,
      promptVersions,
      quality,
      skippedByReason,
      experiments,
      guardrails,
      funnel,
      operational,
      recent: (Array.isArray(recent) ? recent : []).map((row: any) => ({
        id: String(row.id),
        leadId: String(row.leadId),
        decision: String(row.decision),
        reason: row.reason ? String(row.reason) : null,
        createdAt: row.createdAt,
        propertyTitle: row.lead?.property?.title ? String(row.lead.property.title) : null,
        contactName: row.lead?.contact?.name ? String(row.lead.contact.name) : null,
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar métricas de auto-reply:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
