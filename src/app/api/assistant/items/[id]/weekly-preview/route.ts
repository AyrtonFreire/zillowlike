import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function computeWeekStartMonday(now: Date) {
  const d = startOfDay(now);
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

function formatIso(d: Date | null | undefined) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function clip(s: any, n: number) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, n);
}

function leadReasonLabel(params: {
  awaitingResponse: boolean;
  visitSoon: boolean;
  nextActionDueOrOverdue: boolean;
}) {
  if (params.awaitingResponse) return "msg pendente";
  if (params.visitSoon) return "visita";
  if (params.nextActionDueOrOverdue) return "próxima ação";
  return "priorizar";
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
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const reqContext = (url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR"))
      .trim()
      .toUpperCase();

    let teamId: string | null = url.searchParams.get("teamId") || null;
    if (!teamId && role === "AGENCY" && reqContext === "AGENCY") {
      const agencyProfile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      teamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
    }

    if (role === "AGENCY" && reqContext !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (reqContext === "AGENCY" && !teamId) {
      return NextResponse.json({ error: "Não foi possível identificar o time da agência." }, { status: 400 });
    }

    const { id } = await context.params;

    const item = await (prisma as any).assistantItem.findFirst({
      where: {
        id: String(id),
        context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
        ownerId: String(userId),
        ...(reqContext === "AGENCY" && teamId ? { teamId: String(teamId) } : {}),
      },
      select: {
        id: true,
        type: true,
        metadata: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    if (String(item.type || "").trim() !== "WEEKLY_SUMMARY") {
      return NextResponse.json({ error: "Este preview só está disponível para o resumo da semana." }, { status: 400 });
    }

    const now = new Date();
    const meta = (item as any)?.metadata as any;
    const metaWeekStart = meta?.weekStart ? new Date(String(meta.weekStart)) : null;
    const weekStart =
      metaWeekStart && !Number.isNaN(metaWeekStart.getTime())
        ? startOfDay(metaWeekStart)
        : computeWeekStartMonday(now);
    const until = new Date(Math.min(now.getTime(), weekStart.getTime() + 7 * 24 * 60 * 60 * 1000));

    const whereBase: any =
      reqContext === "AGENCY" ? { teamId: String(teamId || "") } : { realtorId: String(userId) };

    const leads = await prisma.lead.findMany({
      where: {
        ...whereBase,
        pipelineStage: { notIn: ["WON", "LOST"] as any },
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        updatedAt: true,
        nextActionDate: true,
        nextActionNote: true,
        visitDate: true,
        visitTime: true,
        ownerApproved: true,
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
          },
        },
        contact: { select: { name: true } },
      },
    });

    const leadIds = leads.map((l) => String(l.id));
    const propertyIds = Array.from(
      new Set(leads.map((l: any) => (l.property?.id ? String(l.property.id) : null)).filter(Boolean))
    ) as string[];

    const [lastClientMsgs, lastInternalMsgs, propertyViewCounts] = await Promise.all([
      leadIds.length
        ? prisma.leadClientMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            take: 350,
            select: { leadId: true, createdAt: true, content: true, fromClient: true },
          })
        : Promise.resolve([] as any[]),
      leadIds.length
        ? prisma.leadMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            take: 350,
            select: { leadId: true, createdAt: true },
          })
        : Promise.resolve([] as any[]),
      propertyIds.length
        ? prisma.propertyView.groupBy({
            by: ["propertyId"],
            where: {
              propertyId: { in: propertyIds },
              viewedAt: { gte: weekStart, lt: until },
            },
            _count: { _all: true },
          })
        : Promise.resolve([] as any[]),
    ]);

    const lastClientByLead = new Map<string, any>();
    for (const m of lastClientMsgs as any[]) {
      const k = String(m.leadId);
      if (!lastClientByLead.has(k)) lastClientByLead.set(k, m);
    }

    const lastInternalByLead = new Map<string, any>();
    for (const m of lastInternalMsgs as any[]) {
      const k = String(m.leadId);
      if (!lastInternalByLead.has(k)) lastInternalByLead.set(k, m);
    }

    const viewCountByProperty = new Map<string, number>();
    for (const row of propertyViewCounts as any[]) {
      const k = String(row.propertyId);
      const count = Number(row?._count?._all ?? 0);
      viewCountByProperty.set(k, count);
    }

    const scored = leads.map((l: any) => {
      const leadId = String(l.id);
      const clientName = clip(l.contact?.name || "", 60) || "Cliente";
      const propertyId = l.property?.id ? String(l.property.id) : null;
      const propertyTitle = clip(l.property?.title || "", 90) || "(sem título)";

      const lastClient = lastClientByLead.get(leadId) || null;
      const lastInternal = lastInternalByLead.get(leadId) || null;

      const lastClientAt = lastClient?.createdAt ? new Date(lastClient.createdAt) : null;
      const lastInternalAt = lastInternal?.createdAt ? new Date(lastInternal.createdAt) : null;
      const awaitingResponse =
        !!lastClient?.fromClient && !!lastClientAt && (!lastInternalAt || lastClientAt.getTime() > lastInternalAt.getTime());

      const nextActionMs = l.nextActionDate && !Number.isNaN(new Date(l.nextActionDate).getTime())
        ? new Date(l.nextActionDate).getTime()
        : 0;
      const nowMs = now.getTime();
      const nextActionDueOrOverdue = nextActionMs > 0 && nextActionMs <= nowMs + 24 * 60 * 60 * 1000;

      const visitSoon =
        l.visitDate &&
        (() => {
          const v = new Date(l.visitDate);
          const diffDays = (startOfDay(v).getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000);
          return diffDays >= 0 && diffDays <= 3;
        })();

      let score = 0;
      if (awaitingResponse) score += 60;
      if (visitSoon) score += 55;
      if (nextActionDueOrOverdue) score += 45;
      if (String(l.status || "") === "WAITING_OWNER_APPROVAL") score += 35;
      if (String(l.status || "") === "CONFIRMED") score += 30;
      if (String(l.status || "") === "ACCEPTED") score += 22;

      return {
        score,
        leadId,
        clientName,
        propertyId,
        propertyTitle,
        status: String(l.status || ""),
        stage: String(l.pipelineStage || ""),
        reason: leadReasonLabel({ awaitingResponse, visitSoon: !!visitSoon, nextActionDueOrOverdue }),
        lastClientAt: formatIso(lastClientAt),
        lastClientSnippet: lastClient ? clip(lastClient.content, 120) : null,
        nextActionDate: formatIso(l.nextActionDate),
        nextActionNote: clip(l.nextActionNote, 140) || null,
        visitDate: formatIso(l.visitDate),
        visitTime: l.visitTime ? String(l.visitTime) : null,
        views7d: propertyId ? Number(viewCountByProperty.get(propertyId) || 0) : 0,
      };
    });

    const topLeads = [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const propertyMetaById = new Map<string, { title: string; city: string | null; state: string | null }>();
    for (const l of leads as any[]) {
      const pid = l.property?.id ? String(l.property.id) : null;
      if (!pid || propertyMetaById.has(pid)) continue;
      propertyMetaById.set(pid, {
        title: clip(l.property?.title || "", 90) || "(sem título)",
        city: l.property?.city ? String(l.property.city) : null,
        state: l.property?.state ? String(l.property.state) : null,
      });
    }

    const topProperties = Array.from(propertyMetaById.entries())
      .map(([propertyId, meta]) => ({
        propertyId,
        title: meta.title,
        city: meta.city,
        state: meta.state,
        views7d: Number(viewCountByProperty.get(propertyId) || 0),
      }))
      .sort((a, b) => b.views7d - a.views7d)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString(),
      until: until.toISOString(),
      topLeads,
      topProperties,
    });
  } catch (error) {
    console.error("Error building weekly preview:", error);
    return NextResponse.json({ error: "Não conseguimos carregar o resumo agora." }, { status: 500 });
  }
}
