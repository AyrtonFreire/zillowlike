import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    if (role !== "REALTOR" && role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas corretores podem acessar esta caixa de mensagens." },
        { status: 403 }
      );
    }

    // Busca mensagens internas em que o corretor participa (como responsável pelo lead ou remetente)
    const [internalMessages, clientMessages] = await Promise.all([
      (prisma as any).leadMessage.findMany({
        where: {
          OR: [
            {
              senderId: String(userId),
            },
            {
              lead: {
                realtorId: String(userId),
              },
            },
          ],
        },
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
        orderBy: { createdAt: "desc" },
      }),
      // Mensagens de cliente para leads deste corretor
      (prisma as any).leadClientMessage.findMany({
        where: {
          lead: {
            realtorId: String(userId),
          },
        },
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

      const lead = msg.lead as any;
      const property = lead?.property;
      const contact = lead?.contact;
      const sender = msg.sender as any;

      conversationsMap.set(leadId, {
        leadId,
        leadStatus: lead?.status ?? null,
        propertyId: property?.id ?? null,
        propertyTitle: property?.title ?? "Imóvel sem título",
        propertyCity: property?.city ?? null,
        propertyState: property?.state ?? null,
        contactName: contact?.name ?? null,
        contactPhone: contact?.phone ?? null,
        lastMessageId: msg.id,
        lastMessageContent: msg.content,
        lastMessageCreatedAt: msg.createdAt,
        lastMessageSenderId: sender?.id ?? null,
        lastMessageSenderName: sender?.name ?? null,
        lastMessageSenderRole: sender?.role ?? null,
        lastMessageFromClient: false,
      });
    }

    // Mensagens do cliente
    for (const msg of clientMessages) {
      const leadId = msg.leadId as string;
      const lead = msg.lead as any;
      const property = lead?.property;
      const contact = lead?.contact;

      const existing = conversationsMap.get(leadId);
      if (existing) {
        const existingTime = new Date(existing.lastMessageCreatedAt).getTime();
        const msgTime = new Date(msg.createdAt).getTime();
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
            lastMessageId: msg.id,
            lastMessageContent: msg.content,
            lastMessageCreatedAt: msg.createdAt,
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
          lastMessageId: msg.id,
          lastMessageContent: msg.content,
          lastMessageCreatedAt: msg.createdAt,
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
