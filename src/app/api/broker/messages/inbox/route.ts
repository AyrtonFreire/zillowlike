import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const unreadEtagByUser = new Map<string, string>();

export async function GET(req: NextRequest) {
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

    if (role !== "REALTOR" && role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas corretores podem acessar esta caixa de mensagens." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "").toLowerCase();

    // Busca mensagens internas em que o corretor participa (como responsável pelo lead ou remetente)
    const isUnreadMode = mode === "unread";

    if (isUnreadMode) {
      const ifNoneMatch = req.headers.get("if-none-match");
      const cachedEtag = unreadEtagByUser.get(String(userId)) || null;
      if (cachedEtag && ifNoneMatch && ifNoneMatch === cachedEtag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: cachedEtag,
            "Cache-Control": "private, max-age=0, must-revalidate",
          },
        });
      }

      const [internalAgg, clientAgg] = await Promise.all([
        (prisma as any).leadMessage.groupBy({
          by: ["leadId"],
          where: {
            OR: [{ senderId: String(userId) }, { lead: { realtorId: String(userId) } }],
          },
          _max: { createdAt: true },
          orderBy: { _max: { createdAt: "desc" } },
          take: 200,
        }),
        (prisma as any).leadClientMessage.groupBy({
          by: ["leadId"],
          where: {
            lead: { realtorId: String(userId) },
          },
          _max: { createdAt: true },
          orderBy: { _max: { createdAt: "desc" } },
          take: 200,
        }),
      ]);

      const map = new Map<string, any>();
      for (const row of internalAgg || []) {
        const leadId = row.leadId as string;
        const createdAt = row._max?.createdAt as any;
        if (!createdAt) continue;
        map.set(leadId, { leadId, lastMessageCreatedAt: createdAt });
      }
      for (const row of clientAgg || []) {
        const leadId = row.leadId as string;
        const createdAt = row._max?.createdAt as any;
        if (!createdAt) continue;
        const existing = map.get(leadId);
        if (!existing) {
          map.set(leadId, { leadId, lastMessageCreatedAt: createdAt });
          continue;
        }
        const a = new Date(existing.lastMessageCreatedAt).getTime();
        const b = new Date(createdAt).getTime();
        if (!Number.isNaN(b) && (Number.isNaN(a) || b > a)) {
          map.set(leadId, { leadId, lastMessageCreatedAt: createdAt });
        }
      }

      const conversations = Array.from(map.values()).sort((x: any, y: any) => {
        const a = new Date(x.lastMessageCreatedAt).getTime();
        const b = new Date(y.lastMessageCreatedAt).getTime();
        if (Number.isNaN(a) && Number.isNaN(b)) return 0;
        if (Number.isNaN(a)) return 1;
        if (Number.isNaN(b)) return -1;
        return b - a;
      });

      const newest = conversations[0]?.lastMessageCreatedAt
        ? new Date(conversations[0].lastMessageCreatedAt).getTime()
        : 0;
      const etag = `W/\"unread:${String(userId)}:${newest}:${conversations.length}\"`;
      unreadEtagByUser.set(String(userId), etag);

      const res = NextResponse.json({ success: true, conversations });
      res.headers.set("ETag", etag);
      res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
      return res;
    }

    const [internalMessages, clientMessages] = await Promise.all([
      (prisma as any).leadMessage.findMany({
        where: {
          OR: [
            { senderId: String(userId) },
            { lead: { realtorId: String(userId) } },
          ],
        },
        ...(isUnreadMode
          ? {
              select: { leadId: true, createdAt: true },
            }
          : {
              include: {
                lead: {
                  select: {
                    id: true,
                    status: true,
                    property: {
                      select: {
                        id: true,
                        title: true,
                        city: true,
                        state: true,
                      },
                    },
                    contact: {
                      select: {
                        name: true,
                        phone: true,
                      },
                    },
                  },
                },
                sender: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            }),
        orderBy: { createdAt: "desc" },
      }),
      // Mensagens de cliente para leads deste corretor
      (prisma as any).leadClientMessage.findMany({
        where: {
          lead: {
            realtorId: String(userId),
          },
        },
        ...(isUnreadMode
          ? {
              select: { leadId: true, createdAt: true },
            }
          : {
              include: {
                lead: {
                  select: {
                    id: true,
                    status: true,
                    property: {
                      select: {
                        id: true,
                        title: true,
                        city: true,
                        state: true,
                      },
                    },
                    contact: {
                      select: {
                        name: true,
                        phone: true,
                      },
                    },
                  },
                },
              },
            }),
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Para cada lead, pegamos apenas a última mensagem (cliente ou interna),
    // escolhendo sempre a mais recente.
    const conversationsMap = new Map<string, any>();

    // Mensagens internas
    for (const msg of internalMessages) {
      const leadId = msg.leadId as string;
      if (conversationsMap.has(leadId)) continue;

      if (isUnreadMode) {
        conversationsMap.set(leadId, {
          leadId,
          lastMessageCreatedAt: msg.createdAt,
        });
        continue;
      }

      const lead = (msg as any).lead as any;
      const property = lead?.property;
      const contact = lead?.contact;
      const sender = (msg as any).sender as any;

      conversationsMap.set(leadId, {
        leadId,
        leadStatus: lead?.status ?? null,
        propertyId: property?.id ?? null,
        propertyTitle: property?.title ?? "Imóvel sem título",
        propertyCity: property?.city ?? null,
        propertyState: property?.state ?? null,
        contactName: contact?.name ?? null,
        contactPhone: contact?.phone ?? null,
        lastMessageId: (msg as any).id,
        lastMessageContent: (msg as any).content,
        lastMessageCreatedAt: (msg as any).createdAt,
        lastMessageSenderId: sender?.id ?? null,
        lastMessageSenderName: sender?.name ?? null,
        lastMessageSenderRole: sender?.role ?? null,
        lastMessageFromClient: false,
      });
    }

    // Mensagens do cliente
    for (const msg of clientMessages) {
      const leadId = msg.leadId as string;

      if (isUnreadMode) {
        const existing = conversationsMap.get(leadId);
        if (existing) {
          const existingTime = new Date(existing.lastMessageCreatedAt).getTime();
          const msgTime = new Date(msg.createdAt).getTime();
          if (!Number.isNaN(msgTime) && msgTime > existingTime) {
            conversationsMap.set(leadId, { ...existing, lastMessageCreatedAt: msg.createdAt });
          }
        } else {
          conversationsMap.set(leadId, { leadId, lastMessageCreatedAt: msg.createdAt });
        }
        continue;
      }

      const lead = (msg as any).lead as any;
      const property = lead?.property;
      const contact = lead?.contact;

      const existing = conversationsMap.get(leadId);
      if (existing) {
        const existingTime = new Date(existing.lastMessageCreatedAt).getTime();
        const msgTime = new Date((msg as any).createdAt).getTime();
        if (!Number.isNaN(msgTime) && msgTime > existingTime) {
          conversationsMap.set(leadId, {
            ...existing,
            leadStatus: lead?.status ?? existing.leadStatus ?? null,
            propertyId: property?.id ?? existing.propertyId ?? null,
            propertyTitle: property?.title ?? existing.propertyTitle ?? "Imóvel sem título",
            propertyCity: property?.city ?? existing.propertyCity ?? null,
            propertyState: property?.state ?? existing.propertyState ?? null,
            contactName: contact?.name ?? existing.contactName ?? null,
            contactPhone: contact?.phone ?? existing.contactPhone ?? null,
            lastMessageId: (msg as any).id,
            lastMessageContent: (msg as any).content,
            lastMessageCreatedAt: (msg as any).createdAt,
            lastMessageSenderId: null,
            lastMessageSenderName: null,
            lastMessageSenderRole: "CLIENT",
            lastMessageFromClient: true,
          });
        }
      } else {
        conversationsMap.set(leadId, {
          leadId,
          leadStatus: lead?.status ?? null,
          propertyId: property?.id ?? null,
          propertyTitle: property?.title ?? "Imóvel sem título",
          propertyCity: property?.city ?? null,
          propertyState: property?.state ?? null,
          contactName: contact?.name ?? null,
          contactPhone: contact?.phone ?? null,
          lastMessageId: (msg as any).id,
          lastMessageContent: (msg as any).content,
          lastMessageCreatedAt: (msg as any).createdAt,
          lastMessageSenderId: null,
          lastMessageSenderName: null,
          lastMessageSenderRole: "CLIENT",
          lastMessageFromClient: true,
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());

    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error("Error fetching broker message inbox:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar sua caixa de mensagens agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
