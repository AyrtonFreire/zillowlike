import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadAutoReplyService } from "@/lib/lead-auto-reply-service";

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
    };

    const windowLeadIds = windowLeads.map((x) => x.leadId);

    let eventsRaw: any[] = [];
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
    }

    const latestSentByLead = new Map<string, any>();
    const hasVisitRequestedByLead = new Set<string>();
    for (const e of Array.isArray(eventsRaw) ? eventsRaw : []) {
      const leadId = safeString(e?.leadId);
      if (!leadId) continue;
      const t = safeString(e?.type);
      if (t === "AUTO_REPLY_SENT" && !latestSentByLead.has(leadId)) latestSentByLead.set(leadId, e);
      if (t === "VISIT_REQUESTED") hasVisitRequestedByLead.add(leadId);
    }

    const handoffLeadIds = new Set<string>();
    const visitLeadIds = new Set<string>(Array.from(hasVisitRequestedByLead));

    for (const leadId of windowLeadIds) {
      const sentEvt = latestSentByLead.get(leadId);
      const aiJson = readAiJsonFromEventMeta(sentEvt?.metadata);
      const finalHandoffNeeded = aiJson?.finalHandoffNeeded;
      const handoffNeeded = aiJson?.handoffNeeded;

      if (finalHandoffNeeded === true || (finalHandoffNeeded === null && handoffNeeded === true)) {
        handoffLeadIds.add(leadId);
      }

      if (aiJson?.visitHandoffNeeded === true) {
        visitLeadIds.add(leadId);
      }
    }

    windowTotals.handoffLeads = handoffLeadIds.size;
    windowTotals.visitRequestedLeads = visitLeadIds.size;

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
        const aiJson = readAiJsonFromEventMeta(sentEvt?.metadata);
        const finalHandoffNeeded = aiJson?.finalHandoffNeeded;
        const handoffNeeded = aiJson?.handoffNeeded;
        const needsHandoff = finalHandoffNeeded === true || (finalHandoffNeeded === null && handoffNeeded === true);

        const visitRequested = visitLeadIds.has(leadId);

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
