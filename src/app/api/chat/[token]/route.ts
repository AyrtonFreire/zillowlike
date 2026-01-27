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
import { LeadAutoReplyService } from "@/lib/lead-auto-reply-service";

const jsonSafe = <T>(value: T): T | number => (typeof value === "bigint" ? Number(value) : value);

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
          price: lead.property?.price ? jsonSafe(lead.property.price) : lead.property?.price,
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
        teamId: true,
        realtorId: true,
        pipelineStage: true,
        respondedAt: true,
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

    const chatContext = (req.headers.get("x-chat-context") || "").toLowerCase();
    if (chatContext === "client") {
      fromClient = true;
    }

    if (session && chatContext !== "client") {
      const userId = session.userId || session.user?.id;
      const role = session.role || session.user?.role;

      if (role === "AGENCY") {
        return NextResponse.json(
          { error: "Você não tem permissão para atender leads." },
          { status: 403 }
        );
      }

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
        const isProfessionalOwner = isPropertyOwner && (role === "REALTOR" || role === "OWNER");

        console.log("[CHAT] Resultado verificação:", {
          isRealtor,
          isPropertyOwner,
          isTeamOwner,
          isAdmin,
          isProfessionalOwner,
        });

        // Se é corretor atribuído, dono do imóvel, dono da equipe ou admin, responde como profissional
        // Apenas se o request explicitamente declarar contexto profissional, ou se não houver contexto.
        if (chatContext === "professional" || chatContext === "") {
          if (isRealtor || isPropertyOwner || isTeamOwner || isAdmin) {
            fromClient = false;
          }
        }
        // Caso contrário (incluindo outros corretores), envia como cliente
        // Isso permite que corretores interessados em imóveis de outros corretores possam usar o chat
      }
    }

    const lastMessageBefore = await (prisma as any).leadClientMessage.findFirst({
      where: { leadId: lead.id },
      orderBy: { createdAt: "desc" },
    });

    const previousStage = (lead as any)?.pipelineStage as string | null | undefined;

    const message = await (prisma as any).leadClientMessage.create({
      data: {
        leadId: lead.id,
        fromClient,
        content: parsed.data.content.trim(),
        source: fromClient ? "HUMAN" : "HUMAN",
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    });

    const nowMs = Date.now();
    const wasRecentlyNotified = async (title: string, windowMs: number) => {
      const rec = await (prisma as any).leadEvent.findFirst({
        where: {
          leadId: lead.id,
          type: "INTERNAL_MESSAGE",
          title,
          createdAt: { gte: new Date(nowMs - windowMs) },
        },
        select: { id: true },
      });
      return !!rec?.id;
    };

    try {
      // Se um profissional respondeu, marcar respondedAt e, se estiver em NEW, avançar para CONTACT
      if (!fromClient) {
        const stage = String(previousStage || "");
        const shouldAdvance = !stage || stage === "NEW";
        await (prisma as any).lead.update({
          where: { id: lead.id },
          data: {
            pipelineStage: shouldAdvance ? "CONTACT" : undefined,
            respondedAt: (lead as any)?.respondedAt ? undefined : new Date(),
          },
          select: { id: true },
        });
      }
    } catch {
      // ignore
    }

    await LeadEventService.record({
      leadId: lead.id,
      type: "CLIENT_MESSAGE",
      actorId,
      actorRole,
      title: fromClient ? "Mensagem do cliente" : "Mensagem enviada ao cliente",
      description: parsed.data.content.trim().slice(0, 200),
      fromStage: previousStage || null,
      toStage: !fromClient && (!previousStage || previousStage === "NEW") ? "CONTACT" : previousStage || null,
    });

    try {
      const pusher = getPusherServer();
      await pusher.trigger(PUSHER_CHANNELS.CHAT(String(lead.id)), PUSHER_EVENTS.NEW_CHAT_MESSAGE, {
        id: message.id,
        leadId: String(lead.id),
        fromClient,
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch {
      // ignore
    }

    try {
      const teamId = (lead as any)?.teamId ? String((lead as any).teamId) : null;
      if (teamId) {
        const pusher = getPusherServer();
        await pusher.trigger(PUSHER_CHANNELS.AGENCY(teamId), PUSHER_EVENTS.AGENCY_LEADS_UPDATED, {
          teamId,
          leadId: String(lead.id),
          ts: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }

    if (fromClient && lead.realtorId) {
      try {
        const enqueueResult = await LeadAutoReplyService.enqueueForClientMessage({
          leadId: String(lead.id),
          clientMessageId: String(message.id),
        });

        if ((enqueueResult as any)?.enqueued) {
          const timeoutMs = 6_000;
          await Promise.race([
            LeadAutoReplyService.processByClientMessageId(String(message.id)),
            new Promise((resolve) => setTimeout(resolve, timeoutMs)),
          ]);
        }
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

          const recipientEmail = leadWithDetails.realtor.email;
          const leadCreatedDedupeTitle = `EMAIL:LEAD_CREATED:${lead.id}:${recipientEmail}`;
          const chatDedupeTitle = `EMAIL:CLIENT_MESSAGE_TO_REALTOR:${lead.id}:${recipientEmail}`;
          const isDuplicate =
            (await wasRecentlyNotified(chatDedupeTitle, 10 * 60 * 1000)) ||
            (await wasRecentlyNotified(leadCreatedDedupeTitle, 10 * 60 * 1000));

          if (isDuplicate) {
            logger.info("[EMAIL] Suprimindo notificação duplicada de chat para corretor", {
              leadId: lead.id,
              to: recipientEmail,
            });
          } else {
          
          const emailData = getClientMessageNotificationEmail({
            realtorName: leadWithDetails.realtor.name || "Corretor",
            clientName: leadWithDetails.contact?.name || "Cliente",
            propertyTitle: leadWithDetails.property?.title || "Imóvel",
            messagePreview: parsed.data.content.trim().substring(0, 200),
            chatUrl,
          });

          void (async () => {
            const sent = await sendEmail({
              to: recipientEmail,
              subject: emailData.subject,
              html: emailData.html,
            });

            if (sent) {
              await LeadEventService.record({
                leadId: lead.id,
                type: "INTERNAL_MESSAGE",
                title: chatDedupeTitle,
                description: emailData.subject,
                metadata: {
                  channel: "EMAIL",
                  to: recipientEmail,
                  template: "CLIENT_MESSAGE_TO_REALTOR",
                },
              });
            }
          })().catch((err) => {
            console.error("Error sending client message notification email:", err);
          });
          }
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
                `Novo contato no OggaHub`,
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

          const recipientEmail = leadWithDetails.contact.email;
          const replyDedupeTitle = `EMAIL:REALTOR_REPLY_TO_CLIENT:${lead.id}:${recipientEmail}`;
          const isDuplicate = await wasRecentlyNotified(replyDedupeTitle, 10 * 60 * 1000);
          if (isDuplicate) {
            logger.info("[EMAIL] Suprimindo notificação duplicada de resposta para cliente", {
              leadId: lead.id,
              to: recipientEmail,
            });
            return NextResponse.json({ success: true, message });
          }

          const emailData = getRealtorReplyNotificationEmail({
            clientName: leadWithDetails.contact.name || "Cliente",
            propertyTitle: leadWithDetails.property?.title || "Imóvel",
            messagePreview: parsed.data.content.trim().substring(0, 200),
            chatUrl,
          });

          void (async () => {
            const sent = await sendEmail({
              to: recipientEmail,
              subject: emailData.subject,
              html: emailData.html,
            });

            if (sent) {
              await LeadEventService.record({
                leadId: lead.id,
                type: "INTERNAL_MESSAGE",
                title: replyDedupeTitle,
                description: emailData.subject,
                metadata: {
                  channel: "EMAIL",
                  to: recipientEmail,
                  template: "REALTOR_REPLY_TO_CLIENT",
                },
              });
            }
          })().catch((err) => {
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
