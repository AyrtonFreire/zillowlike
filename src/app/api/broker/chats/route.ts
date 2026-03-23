import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

const jsonSafe = <T,>(value: T): T | number =>
  typeof value === "bigint" ? Number(value) : value;

export async function GET(_req: NextRequest) {
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

    // Aceita REALTOR e ADMIN
    if (!["REALTOR", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Acesso não permitido." },
        { status: 403 }
      );
    }

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    console.log("[Broker Chats] userId:", userId, "role:", role);

    const ETAG_VERSION = 1;
    const leadScope: any = {
      AND: [
        {
          OR: [{ realtorId: String(userId) }, { property: { ownerId: String(userId) } }],
        },
        { status: { not: "COMPLETED" } },
      ],
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
        where: {
          OR: [
            { ownerId: String(userId) },
            { leads: { some: { realtorId: String(userId), status: { not: "COMPLETED" } } } },
          ],
        },
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
      `W/"broker-chats:${ETAG_VERSION}:${String(userId)}:${String(role || "")}` +
      `:${leadCount}:${maxLeadUpdatedAtMs}:${clientCount}:${maxClientCreatedAtMs}` +
      `:${internalCount}:${maxInternalCreatedAtMs}:${maxReceiptUpdatedAtMs}:${maxPropertyUpdatedAtMs}"`;

    const ifNoneMatch = _req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
    }

    // Buscar última mensagem (LeadClientMessage) por lead (sem N+1)
    const lastClientByLead = await (prisma as any).leadClientMessage.findMany({
      where: {
        lead: {
          AND: [
            {
              OR: [{ realtorId: String(userId) }, { property: { ownerId: String(userId) } }],
            },
            { status: { not: "COMPLETED" } },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: {
        leadId: true,
        createdAt: true,
        content: true,
        fromClient: true,
        lead: {
          select: {
            id: true,
            clientChatToken: true,
            conversationState: true,
            conversationArchivedAt: true,
            conversationClosedAt: true,
            conversationLastActivityAt: true,
            contact: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
            property: {
              select: {
                id: true,
                title: true,
                price: true,
                city: true,
                state: true,
                images: {
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    const leads = (lastClientByLead || []).map((row: any) => row.lead);
    const leadIds = leads.map((l: any) => String(l.id));

    console.log("[Broker Chats] Leads únicos com mensagens:", leadIds.length);

    // Buscar receipts de leitura (persistidos) para calcular unreadCount
    let readReceipts: any[] = [];
    try {
      readReceipts = await (prisma as any).leadChatReadReceipt.findMany({
        where: { userId: String(userId), leadId: { in: leadIds } },
        select: { leadId: true, lastReadAt: true },
      });
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

    const lastClientFromClientAgg = leadIds.length
      ? await (prisma as any).leadClientMessage.groupBy({
          by: ["leadId"],
          where: { leadId: { in: leadIds }, fromClient: true },
          _max: { createdAt: true },
        })
      : ([] as any[]);

    const lastClientFromClientAtByLeadId = new Map<string, Date>();
    for (const g of lastClientFromClientAgg as any[]) {
      const leadId = String((g as any)?.leadId || "");
      const ts = (g as any)?._max?.createdAt ? new Date((g as any)._max.createdAt) : null;
      if (!leadId || !ts) continue;
      if (Number.isNaN(ts.getTime())) continue;
      lastClientFromClientAtByLeadId.set(leadId, ts);
    }

    const lastInternalMsgs = leadIds.length
      ? await (prisma as any).leadMessage.findMany({
          where: { leadId: { in: leadIds } },
          orderBy: { createdAt: "desc" },
          distinct: ["leadId"],
          select: { leadId: true, content: true, createdAt: true },
        })
      : ([] as any[]);

    const lastInternalByLeadId = new Map<string, any>();
    for (const m of lastInternalMsgs || []) {
      const k = String(m.leadId);
      if (!lastInternalByLeadId.has(k)) lastInternalByLeadId.set(k, m);
    }

    const chatsWithMessages = (lastClientByLead || []).map((row: any) => {
      const lead = row.lead;
      const leadId = String(lead.id);
      const conversationState = String((lead as any)?.conversationState || "ACTIVE");

      const lastClientAt = row?.createdAt ? new Date(row.createdAt) : null;
      const lastInternal = lastInternalByLeadId.get(leadId) || null;
      const lastInternalAt = lastInternal?.createdAt ? new Date(lastInternal.createdAt) : null;

      // Determinar última mensagem e se ela foi enviada pelo cliente
      let lastMessage: string | undefined;
      let lastMessageAt: string | undefined;
      let lastMessageFromClient = false;

      if (lastClientAt && lastInternalAt) {
        if (lastClientAt.getTime() >= lastInternalAt.getTime()) {
          lastMessage = row.content;
          lastMessageAt = new Date(row.createdAt).toISOString();
          lastMessageFromClient = !!row.fromClient;
        } else {
          lastMessage = lastInternal.content;
          lastMessageAt = new Date(lastInternal.createdAt).toISOString();
          lastMessageFromClient = false;
        }
      } else if (lastClientAt) {
        lastMessage = row.content;
        lastMessageAt = new Date(row.createdAt).toISOString();
        lastMessageFromClient = !!row.fromClient;
      } else if (lastInternalAt) {
        lastMessage = lastInternal.content;
        lastMessageAt = new Date(lastInternal.createdAt).toISOString();
        lastMessageFromClient = false;
      }

      // unreadCount indica se há mensagem do cliente após o último "visto" do corretor
      let unreadCount = 0;
      const lastClientFromClientAt = lastClientFromClientAtByLeadId.get(leadId) || null;
      if (lastClientFromClientAt) {
        const lastReadAt = readMap.get(leadId) || null;
        if (!lastReadAt || lastClientFromClientAt.getTime() > lastReadAt.getTime()) unreadCount = 1;
      }

      // Calcular dias até arquivamento (10 dias sem atividade)
      const ARCHIVE_DAYS = 10;
      let daysUntilArchive: number | null = null;
      const lastConversationActivity = (lead as any)?.conversationLastActivityAt
        ? new Date((lead as any).conversationLastActivityAt)
        : lastMessageAt
          ? new Date(lastMessageAt)
          : null;
      if (conversationState === "ACTIVE" && lastConversationActivity) {
        const lastActivity = lastConversationActivity;
        const archiveDate = new Date(lastActivity.getTime() + ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
        const now = new Date();
        const daysRemaining = Math.ceil((archiveDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        daysUntilArchive = Math.max(0, daysRemaining);
      }

      return {
        leadId: lead.id,
        clientChatToken: lead.clientChatToken,
        clientName: lead.contact?.name || "Cliente",
        clientEmail: lead.contact?.email || "",
        clientPhone: lead.contact?.phone || null,
        lastMessage: lastMessage
          ? lastMessage.length > 50
            ? lastMessage.slice(0, 50) + "..."
            : lastMessage
          : undefined,
        lastMessageAt,
        lastMessageFromClient,
        unreadCount,
        daysUntilArchive,
        conversationState,
        conversationArchivedAt: (lead as any)?.conversationArchivedAt
          ? new Date((lead as any).conversationArchivedAt).toISOString()
          : null,
        conversationClosedAt: (lead as any)?.conversationClosedAt
          ? new Date((lead as any).conversationClosedAt).toISOString()
          : null,
        conversationLastActivityAt: lastConversationActivity ? lastConversationActivity.toISOString() : null,
        property: {
          id: lead.property.id,
          title: lead.property.title,
          price: jsonSafe(lead.property.price),
          city: lead.property.city,
          state: lead.property.state,
          image: lead.property.images[0]?.url || null,
        },
      };
    });

    // Ordenar por última mensagem (mais recente primeiro), depois por leads sem mensagem
    const sortedChats = chatsWithMessages.sort((a: any, b: any) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    const res = NextResponse.json({ success: true, chats: sortedChats });
    res.headers.set("ETag", etag);
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    console.error("Error fetching broker chats:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar suas conversas. Tente novamente." },
      { status: 500 }
    );
  }
}
