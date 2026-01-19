import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { LeadStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

const jsonSafe = <T,>(value: T): T | number =>
  typeof value === "bigint" ? Number(value) : value;

function clip(s: any, n: number) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, n);
}

export async function GET(request: NextRequest) {
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

    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Você não tem permissão para ver estes leads." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paged = (searchParams.get("paged") || "").trim() === "1";
    const limitRaw = Number(searchParams.get("limit") || "");
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 40;
    const cursor = (searchParams.get("cursor") || "").trim() || null;

    const mapStatusToStage = (status: LeadStatus): PipelineStage => {
      if (status === "ACCEPTED") return "CONTACT";
      if (status === "CONFIRMED") return "VISIT";
      if (status === "COMPLETED") return "WON";
      if (status === "CANCELLED" || status === "EXPIRED" || status === "OWNER_REJECTED") return "LOST";
      return "NEW";
    };

    const leadIndex = await (prisma as any).lead.findMany({
      where: {
        realtorId: userId,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    const allLeadIds = (leadIndex as any[]).map((l) => String(l.id));

    const [lastClientAgg, lastInternalAgg] = await Promise.all([
      allLeadIds.length
        ? (prisma as any).leadClientMessage.groupBy({
            by: ["leadId"],
            where: { lead: { realtorId: String(userId) } },
            _max: { createdAt: true },
          })
        : Promise.resolve([] as any[]),
      allLeadIds.length
        ? (prisma as any).leadMessage.groupBy({
            by: ["leadId"],
            where: { lead: { realtorId: String(userId) } },
            _max: { createdAt: true },
          })
        : Promise.resolve([] as any[]),
    ]);

    const lastClientAtByLead = new Map<string, Date>();
    for (const row of lastClientAgg as any[]) {
      if (!row?._max?.createdAt) continue;
      lastClientAtByLead.set(String(row.leadId), new Date(row._max.createdAt));
    }

    const lastInternalAtByLead = new Map<string, Date>();
    for (const row of lastInternalAgg as any[]) {
      if (!row?._max?.createdAt) continue;
      lastInternalAtByLead.set(String(row.leadId), new Date(row._max.createdAt));
    }

    let readReceipts: any[] = [];
    try {
      readReceipts = allLeadIds.length
        ? await (prisma as any).leadChatReadReceipt.findMany({
            where: { userId: String(userId), leadId: { in: allLeadIds } },
            select: { leadId: true, lastReadAt: true },
          })
        : [];
    } catch (err: any) {
      if (err?.code === "P2021") {
        readReceipts = [];
      } else {
        throw err;
      }
    }
    const readMap = new Map<string, Date>(
      (readReceipts || []).map((r: any) => [String(r.leadId), new Date(r.lastReadAt)])
    );

    const orderedLeadIds = (leadIndex as any[])
      .map((lead) => {
        const leadId = String(lead.id);
        const createdAt = new Date(lead.createdAt);
        const clientAt = lastClientAtByLead.get(leadId) || null;
        const internalAt = lastInternalAtByLead.get(leadId) || null;

        let lastMessageAt = createdAt;
        let lastMessageFromClient = false;
        if (clientAt && internalAt) {
          if (clientAt.getTime() > internalAt.getTime()) {
            lastMessageAt = clientAt;
            lastMessageFromClient = true;
          } else {
            lastMessageAt = internalAt;
          }
        } else if (clientAt) {
          lastMessageAt = clientAt;
          lastMessageFromClient = true;
        } else if (internalAt) {
          lastMessageAt = internalAt;
        }

        let hasUnreadMessages = false;
        if (lastMessageFromClient && clientAt) {
          const lastReadAt = readMap.get(leadId) || null;
          if (!lastReadAt) {
            hasUnreadMessages = true;
          } else {
            const a = lastReadAt.getTime();
            const b = clientAt.getTime();
            if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) {
              hasUnreadMessages = true;
            }
          }
        }

        return {
          id: leadId,
          createdAt,
          lastMessageAt,
          hasUnreadMessages,
        };
      })
      .sort((a, b) => {
        if (a.hasUnreadMessages !== b.hasUnreadMessages) {
          return a.hasUnreadMessages ? -1 : 1;
        }
        const aTime = a.lastMessageAt?.getTime() || 0;
        const bTime = b.lastMessageAt?.getTime() || 0;
        if (aTime !== bTime) return bTime - aTime;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .map((row) => row.id);

    const startIndex = cursor ? Math.max(orderedLeadIds.indexOf(String(cursor)) + 1, 0) : 0;
    const pageLeadIds = orderedLeadIds.slice(startIndex, startIndex + limit);
    const pagedNextCursor = pageLeadIds.length === limit ? pageLeadIds[pageLeadIds.length - 1] : null;

    const leads = await (prisma as any).lead.findMany({
      where: {
        id: { in: pageLeadIds },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            type: true,
            city: true,
            state: true,
            neighborhood: true,
            street: true,
            bedrooms: true,
            bathrooms: true,
            areaM2: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const leadById = new Map<string, any>((leads as any[]).map((lead) => [String(lead.id), lead]));
    const orderedLeads = pageLeadIds.map((id) => leadById.get(String(id))).filter(Boolean);

    const leadIds = orderedLeads.map((l) => String(l.id));

    const [lastClientMsgs, lastInternalMsgs] = await Promise.all([
      leadIds.length
        ? (prisma as any).leadClientMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            take: 2500,
            select: { leadId: true, createdAt: true, content: true, fromClient: true },
          })
        : Promise.resolve([] as any[]),
      leadIds.length
        ? (prisma as any).leadMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            take: 2500,
            select: { leadId: true, createdAt: true, content: true },
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

    const normalized = (orderedLeads as any[]).map((lead) => {
      const leadId = String(lead.id);
      const lastClient = lastClientByLead.get(leadId) || null;
      const lastInternal = lastInternalByLead.get(leadId) || null;

      const clientAt = lastClient?.createdAt ? new Date(lastClient.createdAt) : null;
      const internalAt = lastInternal?.createdAt ? new Date(lastInternal.createdAt) : null;

      let lastMessageAt: Date | null = null;
      let lastMessagePreview: string | null = null;
      let lastMessageFromClient = false;

      if (clientAt && internalAt) {
        if (clientAt.getTime() > internalAt.getTime()) {
          lastMessageAt = clientAt;
          lastMessagePreview = clip(lastClient?.content, 90) || null;
          lastMessageFromClient = !!lastClient?.fromClient;
        } else {
          lastMessageAt = internalAt;
          lastMessagePreview = clip(lastInternal?.content, 90) || null;
          lastMessageFromClient = false;
        }
      } else if (clientAt) {
        lastMessageAt = clientAt;
        lastMessagePreview = clip(lastClient?.content, 90) || null;
        lastMessageFromClient = !!lastClient?.fromClient;
      } else if (internalAt) {
        lastMessageAt = internalAt;
        lastMessagePreview = clip(lastInternal?.content, 90) || null;
        lastMessageFromClient = false;
      }

      let hasUnreadMessages = false;
      if (lastMessageFromClient && lastMessageAt) {
        const lastReadAt = readMap.get(leadId) || null;
        if (!lastReadAt) {
          hasUnreadMessages = true;
        } else {
          const a = lastReadAt.getTime();
          const b = lastMessageAt.getTime();
          if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) {
            hasUnreadMessages = true;
          }
        }
      }

      return {
        ...lead,
        pipelineStage: lead.pipelineStage || mapStatusToStage(lead.status),
        hasUnreadMessages,
        lastMessageAt: lastMessageAt ? lastMessageAt.toISOString() : null,
        lastMessagePreview,
        lastMessageFromClient,
        lastContactAt: lastMessageAt ? lastMessageAt.toISOString() : null,
        property: lead.property
          ? {
              ...lead.property,
              price: jsonSafe(lead.property.price),
            }
          : lead.property,
      };
    });

    if (!paged) {
      const sorted = [...normalized].sort((a: any, b: any) => {
        const au = a.hasUnreadMessages ? 1 : 0;
        const bu = b.hasUnreadMessages ? 1 : 0;
        if (au !== bu) return bu - au;
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
          return bTime - aTime;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return NextResponse.json(sorted);
    }

    return NextResponse.json({ items: normalized, nextCursor: pagedNextCursor || null });
  } catch (error) {
    console.error("Error getting my leads:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar seus leads agora." },
      { status: 500 }
    );
  }
}
