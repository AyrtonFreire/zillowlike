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

    const ETAG_VERSION = 1;
    const leadScope: any = {
      realtorId: String(userId),
    };

    let receiptAgg: any = { _max: { updatedAt: null } };
    try {
      receiptAgg = await (prisma as any).leadChatReadReceipt.aggregate({
        where: { userId: String(userId), lead: leadScope },
        _max: { updatedAt: true },
      });
    } catch (err: any) {
      if (err?.code !== "P2021") throw err;
    }

    const [leadAgg, clientAgg, internalAgg, propertyAgg] = await Promise.all([
      (prisma as any).lead.aggregate({
        where: leadScope,
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      (prisma as any).leadClientMessage.aggregate({
        where: { lead: leadScope },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      (prisma as any).leadMessage.aggregate({
        where: { lead: leadScope },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      (prisma as any).property.aggregate({
        where: { leads: { some: leadScope } },
        _max: { updatedAt: true },
      }),
    ]);

    const leadCount = Number(leadAgg?._count?._all || 0);
    const maxLeadUpdatedAtMs = leadAgg?._max?.updatedAt ? new Date(leadAgg._max.updatedAt).getTime() : 0;
    const clientCount = Number(clientAgg?._count?._all || 0);
    const maxClientCreatedAtMs = clientAgg?._max?.createdAt ? new Date(clientAgg._max.createdAt).getTime() : 0;
    const internalCount = Number(internalAgg?._count?._all || 0);
    const maxInternalCreatedAtMs = internalAgg?._max?.createdAt ? new Date(internalAgg._max.createdAt).getTime() : 0;
    const maxReceiptUpdatedAtMs = receiptAgg?._max?.updatedAt ? new Date(receiptAgg._max.updatedAt).getTime() : 0;
    const maxPropertyUpdatedAtMs = propertyAgg?._max?.updatedAt ? new Date(propertyAgg._max.updatedAt).getTime() : 0;

    const etag =
      `W/\"my-pipeline:${ETAG_VERSION}:${String(userId)}:${String(role || "")}` +
      `:${leadCount}:${maxLeadUpdatedAtMs}:${clientCount}:${maxClientCreatedAtMs}` +
      `:${internalCount}:${maxInternalCreatedAtMs}:${maxReceiptUpdatedAtMs}:${maxPropertyUpdatedAtMs}\"`;

    const ifNoneMatch = _request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
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
            street: true,
            bedrooms: true,
            bathrooms: true,
            areaM2: true,
            builtAreaM2: true,
            usableAreaM2: true,
            lotAreaM2: true,
            privateAreaM2: true,
            suites: true,
            parkingSpots: true,
            floor: true,
            furnished: true,
            petFriendly: true,
            condoFee: true,
            purpose: true,
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

    const [lastClientMsgs, lastInternalMsgs, lastClientFromClientAgg] = await Promise.all([
      leadIds.length
        ? (prisma as any).leadClientMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            distinct: ["leadId"],
            select: { leadId: true, createdAt: true, content: true, fromClient: true },
          })
        : Promise.resolve([] as any[]),
      leadIds.length
        ? (prisma as any).leadMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            distinct: ["leadId"],
            select: { leadId: true, createdAt: true, content: true },
          })
        : Promise.resolve([] as any[]),
      leadIds.length
        ? (prisma as any).leadClientMessage.groupBy({
            by: ["leadId"],
            where: { leadId: { in: leadIds }, fromClient: true },
            _max: { createdAt: true },
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

    const lastClientFromClientAtByLeadId = new Map<string, Date>();
    for (const g of lastClientFromClientAgg as any[]) {
      const leadId = String((g as any)?.leadId || "");
      const ts = (g as any)?._max?.createdAt ? new Date((g as any)._max.createdAt) : null;
      if (!leadId || !ts) continue;
      if (Number.isNaN(ts.getTime())) continue;
      lastClientFromClientAtByLeadId.set(leadId, ts);
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
      const lastClientFromClientAt = lastClientFromClientAtByLeadId.get(leadId) || null;
      if (lastClientFromClientAt) {
        const lastReadAt = readMap.get(leadId) || null;
        if (!lastReadAt || lastClientFromClientAt.getTime() > lastReadAt.getTime()) {
          hasUnreadMessages = true;
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
              condoFee: jsonSafe((lead.property as any).condoFee),
            }
          : lead.property,
      };
    });

    const res = NextResponse.json(normalized);
    res.headers.set("ETag", etag);
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    console.error("Error getting pipeline leads:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar seus leads do funil agora." },
      { status: 500 }
    );
  }
}
