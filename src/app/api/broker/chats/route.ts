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

    // Aceita REALTOR, AGENCY, OWNER e ADMIN
    if (!["REALTOR", "AGENCY", "OWNER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Acesso não permitido." },
        { status: 403 }
      );
    }

    console.log("[Broker Chats] userId:", userId, "role:", role);

    // Abordagem: buscar mensagens de cliente primeiro, depois agrupar por lead
    // Similar à API de inbox que funciona
    const clientMessages = await (prisma as any).leadClientMessage.findMany({
      where: {
        lead: {
          OR: [
            { realtorId: String(userId) },
            { property: { ownerId: String(userId) } },
          ],
        },
      },
      include: {
        lead: {
          include: {
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
      orderBy: { createdAt: "desc" },
    });

    console.log("[Broker Chats] Mensagens de cliente encontradas:", clientMessages.length);

    // Agrupar por leadId para obter leads únicos
    const leadsMap = new Map<string, any>();
    for (const msg of clientMessages) {
      if (!leadsMap.has(msg.leadId)) {
        leadsMap.set(msg.leadId, msg.lead);
      }
    }
    const leads = Array.from(leadsMap.values());

    console.log("[Broker Chats] Leads únicos com mensagens:", leads.length);

    // Para cada lead, buscar última mensagem e contagem de não lidas
    const chatsWithMessages = await Promise.all(
      leads.map(async (lead) => {
        // Buscar última mensagem (cliente ou interna)
        const [lastClientMessage, lastInternalMessage] = await Promise.all([
          (prisma as any).leadClientMessage.findFirst({
            where: { leadId: lead.id },
            orderBy: { createdAt: "desc" },
            select: {
              content: true,
              createdAt: true,
              fromClient: true,
            },
          }),
          (prisma as any).leadMessage.findFirst({
            where: { leadId: lead.id },
            orderBy: { createdAt: "desc" },
            select: {
              content: true,
              createdAt: true,
            },
          }),
        ]);

        // Determinar última mensagem
        let lastMessage: string | undefined;
        let lastMessageAt: string | undefined;

        if (lastClientMessage && lastInternalMessage) {
          const clientTime = new Date(lastClientMessage.createdAt).getTime();
          const internalTime = new Date(lastInternalMessage.createdAt).getTime();
          if (clientTime > internalTime) {
            lastMessage = lastClientMessage.content;
            lastMessageAt = lastClientMessage.createdAt;
          } else {
            lastMessage = lastInternalMessage.content;
            lastMessageAt = lastInternalMessage.createdAt;
          }
        } else if (lastClientMessage) {
          lastMessage = lastClientMessage.content;
          lastMessageAt = lastClientMessage.createdAt;
        } else if (lastInternalMessage) {
          lastMessage = lastInternalMessage.content;
          lastMessageAt = lastInternalMessage.createdAt;
        }

        // Contar mensagens do cliente (não há campo de leitura no modelo atual)
        // TODO: Adicionar campo 'read' ao modelo LeadClientMessage se quiser rastrear lidas
        const unreadCount = await (prisma as any).leadClientMessage.count({
          where: {
            leadId: lead.id,
            fromClient: true,
          },
        });

        // Calcular dias até arquivamento (10 dias sem atividade)
        const ARCHIVE_DAYS = 10;
        let daysUntilArchive: number | null = null;
        if (lastMessageAt) {
          const lastActivity = new Date(lastMessageAt);
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
          lastMessage: lastMessage ? (lastMessage.length > 50 ? lastMessage.slice(0, 50) + "..." : lastMessage) : undefined,
          lastMessageAt,
          unreadCount,
          daysUntilArchive,
          property: {
            id: lead.property.id,
            title: lead.property.title,
            price: lead.property.price,
            city: lead.property.city,
            state: lead.property.state,
            image: lead.property.images[0]?.url || null,
          },
        };
      })
    );

    // Ordenar por última mensagem (mais recente primeiro), depois por leads sem mensagem
    const sortedChats = chatsWithMessages.sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    return NextResponse.json({ success: true, chats: sortedChats });
  } catch (error) {
    console.error("Error fetching broker chats:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar suas conversas. Tente novamente." },
      { status: 500 }
    );
  }
}
