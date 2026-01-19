import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { LeadStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

const jsonSafe = <T>(value: T): T | number => (typeof value === "bigint" ? Number(value) : value);

function clip(s: any, n: number) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, n);
}

export async function GET(_request: NextRequest) {
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
      return NextResponse.json({ error: "Você não tem permissão para ver este funil." }, { status: 403 });
    }

    const leads = await (prisma as any).lead.findMany({
      where: {
        realtorId: userId,
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
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const leadIds = (leads as any[]).map((l) => String(l.id));

    const [lastClientMsgs, lastInternalMsgs] = await Promise.all([
      leadIds.length
        ? (prisma as any).leadClientMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            take: 5000,
            select: { leadId: true, createdAt: true, content: true, fromClient: true },
          })
        : Promise.resolve([] as any[]),
      leadIds.length
        ? (prisma as any).leadMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            take: 5000,
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

    let readReceipts: any[] = [];
    try {
      readReceipts = leadIds.length
        ? await (prisma as any).leadChatReadReceipt.findMany({
            where: { userId: String(userId), leadId: { in: leadIds } },
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

    // Fallback simples: se por algum motivo pipelineStage não existir, inferir algo a partir do status
    const mapStatusToStage = (status: LeadStatus): PipelineStage => {
      if (status === "ACCEPTED") return "CONTACT";
      if (status === "CONFIRMED") return "VISIT";
      if (status === "COMPLETED") return "WON";
      if (status === "CANCELLED" || status === "EXPIRED" || status === "OWNER_REJECTED") return "LOST";
      return "NEW";
    };

    const normalized = (leads as any[]).map((lead) => {
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
              price:
                lead.property.price !== null && lead.property.price !== undefined
                  ? jsonSafe(lead.property.price)
                  : lead.property.price,
            }
          : lead.property,
      };
    });

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error getting pipeline leads:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar seus leads do funil agora." },
      { status: 500 }
    );
  }
}
