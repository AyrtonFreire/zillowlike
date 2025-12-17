import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, getClientMessageNotificationEmail, getRealtorReplyNotificationEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/sms";
import { getPusherServer, PUSHER_EVENTS, PUSHER_CHANNELS } from "@/lib/pusher-server";
import { logger } from "@/lib/logger";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Escreva uma mensagem antes de enviar.")
    .max(2000, "A mensagem está muito longa."),
});

export async function GET(_req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;

    const lead: any = await (prisma as any).lead.findFirst({
      where: { clientChatToken: token },
      select: {
        id: true,
        createdAt: true,
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            neighborhood: true,
            price: true,
            type: true,
            purpose: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
              select: { url: true },
            },
            owner: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        },
        realtor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
          },
        },
        clientMessages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fromClient: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Chat não encontrado" }, { status: 404 });
    }

    // Determinar quem é o responsável pelo chat (corretor atribuído ou dono do imóvel)
    const responsible = lead.realtor || lead.property?.owner;

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        createdAt: lead.createdAt,
        property: {
          ...lead.property,
          image: lead.property?.images?.[0]?.url || null,
        },
        contact: lead.contact,
        responsible: responsible ? {
          id: responsible.id,
          name: responsible.name,
          image: responsible.image,
          role: lead.realtor ? "REALTOR" : lead.property?.owner?.role,
        } : null,
      },
      messages: lead.clientMessages,
    });
  } catch (error) {
    console.error("Error fetching client chat:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar este chat agora." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const json = await req.json().catch(() => null);
    const parsed = messageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const session: any = await getServerSession(authOptions).catch(() => null);

    const lead: any = await (prisma as any).lead.findFirst({
      where: { clientChatToken: token },
      select: {
        id: true,
        realtorId: true,
        property: {
          select: {
            ownerId: true,
          },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Chat não encontrado" }, { status: 404 });
    }

    let fromClient = true;
    let actorId: string | undefined;
    let actorRole: string | undefined;

    if (session) {
      const userId = session.userId || session.user?.id;
      const role = session.role || session.user?.role;

      console.log("[CHAT] Verificando permissão:", {
        userId,
        role,
        leadRealtorId: lead.realtorId,
        propertyOwnerId: lead.property?.ownerId,
        teamOwnerId: lead.team?.ownerId,
      });

      // Se o usuário está logado e tem um papel profissional (ou é dono do imóvel)
      if (userId) {
        actorId = String(userId);
        actorRole = role || undefined;
        const isRealtor = lead.realtorId && lead.realtorId === userId;
        const isPropertyOwner = lead.property?.ownerId && lead.property.ownerId === userId;
        const isTeamOwner = lead.team?.ownerId && lead.team.ownerId === userId;
        const isAdmin = role === "ADMIN";
        // Qualquer role profissional que seja dono do imóvel pode responder
        const isProfessionalOwner = isPropertyOwner && (role === "REALTOR" || role === "AGENCY" || role === "OWNER");

        console.log("[CHAT] Resultado verificação:", {
          isRealtor,
          isPropertyOwner,
          isTeamOwner,
          isAdmin,
          isProfessionalOwner,
        });

        // Se é corretor atribuído, dono do imóvel, dono da equipe ou admin, responde como profissional
        if (isRealtor || isPropertyOwner || isTeamOwner || isAdmin) {
          fromClient = false;
        }
        // Caso contrário (incluindo outros corretores), envia como cliente
        // Isso permite que corretores interessados em imóveis de outros corretores possam usar o chat
      }
    }

    const lastMessageBefore = await (prisma as any).leadClientMessage.findFirst({
      where: { leadId: lead.id },
      orderBy: { createdAt: "desc" },
    });

    const message = await (prisma as any).leadClientMessage.create({
      data: {
        leadId: lead.id,
        fromClient,
        content: parsed.data.content.trim(),
      },
    });

    if (fromClient) {
      await LeadEventService.record({
        leadId: lead.id,
        type: "CLIENT_MESSAGE",
        actorId,
        actorRole,
        title: "Mensagem do cliente",
        description: parsed.data.content.trim().slice(0, 200),
      });
    }

    // Enviar notificação em tempo real via Pusher
    try {
      const pusher = getPusherServer();
      await pusher.trigger(
        PUSHER_CHANNELS.CHAT(lead.id),
        PUSHER_EVENTS.NEW_CHAT_MESSAGE,
        {
          id: message.id,
          leadId: lead.id,
          fromClient,
          content: message.content,
          createdAt: message.createdAt,
        }
      );
    } catch (pusherError) {
      console.error("Error sending Pusher notification:", pusherError);
      // Não bloqueia a resposta se Pusher falhar
    }

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(lead.realtorId);
      } catch {
        // ignore
      }
    }

    // Enviar email e WhatsApp de notificação para o corretor quando cliente envia mensagem
    if (fromClient && lead.realtorId) {
      try {
        // Buscar dados completos para o email
        const leadWithDetails = await prisma.lead.findUnique({
          where: { id: lead.id },
          select: {
            clientChatToken: true,
            realtor: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
            contact: {
              select: {
                name: true,
              },
            },
            property: {
              select: {
                title: true,
              },
            },
          },
        });

        if (leadWithDetails?.realtor?.email) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const chatUrl = `${siteUrl}/broker/leads/${lead.id}`;
          
          const emailData = getClientMessageNotificationEmail({
            realtorName: leadWithDetails.realtor.name || "Corretor",
            clientName: leadWithDetails.contact?.name || "Cliente",
            propertyTitle: leadWithDetails.property?.title || "Imóvel",
            messagePreview: parsed.data.content.trim().substring(0, 200),
            chatUrl,
          });

          // Enviar email em background (não bloqueia a resposta)
          sendEmail({
            to: leadWithDetails.realtor.email,
            subject: emailData.subject,
            html: emailData.html,
          }).catch((err) => {
            console.error("Error sending client message notification email:", err);
          });
        }

        // Enviar WhatsApp apenas na "primeira" mensagem nova do cliente, para evitar spam
        if (leadWithDetails?.realtor?.phone) {
          try {
            const isFirstAfterRealtor =
              !lastMessageBefore || lastMessageBefore.fromClient === false;

            if (isFirstAfterRealtor) {
              const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
              const chatUrl = `${siteUrl}/broker/leads/${lead.id}`;
              const preview = parsed.data.content.trim().substring(0, 120);

              const body = [
                `Novo contato no ZillowLike`,
                `Imóvel: ${leadWithDetails.property?.title || "Imóvel"}`,
                leadWithDetails.contact?.name ? `Cliente: ${leadWithDetails.contact.name}` : null,
                `Mensagem: ${preview}`,
                "",
                `Responder pelo painel: ${chatUrl}`,
              ]
                .filter(Boolean)
                .join("\n");

              // Não bloqueia a resposta se o WhatsApp falhar
              sendWhatsApp(leadWithDetails.realtor.phone, body).catch((err) => {
                console.error("Error sending WhatsApp notification to realtor:", err);
              });
            }
          } catch (whatsError) {
            console.error("Error preparing WhatsApp notification to realtor:", whatsError);
          }
        }
      } catch (emailError) {
        // Não bloqueia a criação da mensagem se o email falhar
        console.error("Error preparing client message notification email:", emailError);
      }
    }

    // Enviar email de notificação para o cliente quando profissional responde pelo chat
    if (!fromClient) {
      try {
        const leadWithDetails = await prisma.lead.findUnique({
          where: { id: lead.id },
          select: {
            clientChatToken: true,
            contact: {
              select: {
                name: true,
                email: true,
              },
            },
            property: {
              select: {
                title: true,
              },
            },
          },
        });

        if (leadWithDetails?.contact?.email && leadWithDetails.clientChatToken) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const chatUrl = `${siteUrl}/chat/${leadWithDetails.clientChatToken}`;

          const emailData = getRealtorReplyNotificationEmail({
            clientName: leadWithDetails.contact.name || "Cliente",
            propertyTitle: leadWithDetails.property?.title || "Imóvel",
            messagePreview: parsed.data.content.trim().substring(0, 200),
            chatUrl,
          });

          sendEmail({
            to: leadWithDetails.contact.email,
            subject: emailData.subject,
            html: emailData.html,
          }).catch((err) => {
            console.error("Error sending realtor reply notification email to client:", err);
          });
        }
      } catch (emailError) {
        console.error("Error preparing realtor reply notification email to client:", emailError);
      }
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Error posting client chat message:", error);
    return NextResponse.json(
      { error: "Não conseguimos enviar esta mensagem agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
