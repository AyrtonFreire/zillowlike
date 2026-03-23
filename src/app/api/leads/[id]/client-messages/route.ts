import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";
import { sendEmail, getRealtorReplyNotificationEmail } from "@/lib/email";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { LeadConversationLifecycleService } from "@/lib/lead-conversation-lifecycle";
import { createAuditLog } from "@/lib/audit-log";
import { captureException } from "@/lib/sentry";
import { logger } from "@/lib/logger";

const messageSchema = z.object({
  content: z.string().min(1, "Escreva uma mensagem antes de enviar.").max(2000, "A mensagem está muito longa."),
});

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

function canAccessLead(role: string | null, userId: string, lead: any) {
  if (role === "ADMIN") return true;
  if (lead.realtorId && lead.realtorId === userId) return true;
  if (lead.userId && lead.userId === userId) return true;
  if (lead.property?.ownerId && lead.property.ownerId === userId) return true;
  if (lead.team && lead.team.ownerId === userId) return true;
  return false;
}

// GET - Buscar mensagens do chat cliente (LeadClientMessage)
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role === "AGENCY") {
      return NextResponse.json(
        { error: "Perfil de agência não tem permissão para visualizar o chat do cliente." },
        { status: 403 }
      );
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        teamId: true,
        realtorId: true,
        userId: true,
        pipelineStage: true,
        respondedAt: true,
        conversationState: true,
        conversationArchivedAt: true,
        conversationClosedAt: true,
        conversationLastActivityAt: true,
        property: {
          select: { ownerId: true },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    if (!canAccessLead(role, userId, lead)) {
      return NextResponse.json(
        { error: "Você só pode ver mensagens dos leads dos quais participa." },
        { status: 403 }
      );
    }

    // Buscar mensagens de LeadClientMessage (chat público)
    const messages = await (prisma as any).leadClientMessage.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "asc" },
    });

    // Transformar para o formato esperado pelo frontend
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.fromClient ? null : userId, // Se não é do cliente, é do corretor/owner atual
      senderType: msg.fromClient ? "CLIENT" : String(msg?.source) === "AUTO_REPLY_AI" ? "ASSISTANT" : role || "REALTOR",
      source: msg?.source || null,
      createdAt: msg.createdAt,
      read: true, // Marcamos como lido quando visualizado
    }));

    void createAuditLog({
      level: "INFO",
      action: "LEAD_CHAT_VIEW",
      actorId: String(userId),
      actorRole: String(role || ""),
      targetType: "LEAD",
      targetId: String(id),
      metadata: {
        count: formattedMessages.length,
      },
    });

    return NextResponse.json({
      messages: formattedMessages,
      conversation: {
        state: String(lead.conversationState || "ACTIVE"),
        archivedAt: lead.conversationArchivedAt ? new Date(lead.conversationArchivedAt).toISOString() : null,
        closedAt: lead.conversationClosedAt ? new Date(lead.conversationClosedAt).toISOString() : null,
        lastActivityAt: lead.conversationLastActivityAt ? new Date(lead.conversationLastActivityAt).toISOString() : null,
      },
    });
  } catch (error) {
    captureException(error, { route: "/api/leads/[id]/client-messages" });
    logger.error("Error fetching client messages", { error });
    return NextResponse.json(
      { error: "Não conseguimos carregar as mensagens deste lead agora." },
      { status: 500 }
    );
  }
}

// POST - Enviar mensagem no chat cliente (corretor/owner respondendo)
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role === "AGENCY") {
      return NextResponse.json(
        { error: "Você não tem permissão para atender leads." },
        { status: 403 }
      );
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        teamId: true,
        realtorId: true,
        userId: true,
        pipelineStage: true,
        respondedAt: true,
        conversationState: true,
        property: {
          select: { ownerId: true },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    if (!canAccessLead(role, userId, lead)) {
      return NextResponse.json(
        { error: "Você só pode enviar mensagens em leads dos quais participa." },
        { status: 403 }
      );
    }

    if (String(lead.conversationState || "") === "CLOSED") {
      return NextResponse.json(
        { error: "Esta conversa foi encerrada e não aceita novas mensagens." },
        { status: 409 }
      );
    }

    const json = await req.json().catch(() => null);
    const parsed = messageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const previousStage = (lead as any)?.pipelineStage as string | null | undefined;

    // Criar mensagem em LeadClientMessage (fromClient = false pois é o corretor/owner respondendo)
    const message = await (prisma as any).leadClientMessage.create({
      data: {
        leadId: id,
        fromClient: false,
        content: parsed.data.content.trim(),
        source: "HUMAN",
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        source: true,
      },
    });

    try {
      await (prisma as any).leadChatReadReceipt.upsert({
        where: {
          leadId_userId: {
            leadId: String(id),
            userId: String(userId),
          },
        },
        create: {
          leadId: String(id),
          userId: String(userId),
          lastReadAt: new Date(),
        },
        update: {
          lastReadAt: new Date(),
        },
        select: { leadId: true, lastReadAt: true },
      });
    } catch (err: any) {
      if (err?.code !== "P2021") {
        console.error("Error upserting chat read receipt on professional reply:", err);
      }
    }

    const nowMs = Date.now();
    const wasRecentlyNotified = async (title: string, windowMs: number) => {
      const rec = await (prisma as any).leadEvent.findFirst({
        where: {
          leadId: id,
          type: "INTERNAL_MESSAGE",
          title,
          createdAt: { gte: new Date(nowMs - windowMs) },
        },
        select: { id: true },
      });
      return !!rec?.id;
    };

    const lifecycleResult = await LeadConversationLifecycleService.syncProfessionalReplyState(String(id), {
      actorId: String(userId),
      actorRole: String(role || ""),
      reason: "PROFESSIONAL_REPLY",
      previousStage,
      respondedAt: (lead as any)?.respondedAt || null,
    });

    await LeadEventService.record({
      leadId: id,
      type: "CLIENT_MESSAGE",
      actorId: userId,
      actorRole: role,
      title: "Mensagem enviada ao cliente",
      description: parsed.data.content.trim().slice(0, 200),
      fromStage: lifecycleResult.fromStage,
      toStage: lifecycleResult.toStage,
    });

    // Enviar notificação via Pusher para o chat do cliente
    try {
      const pusher = getPusherServer();
      await pusher.trigger(`chat-${id}`, "new-chat-message", {
        id: message.id,
        leadId: id,
        fromClient: false,
        content: message.content,
        createdAt: message.createdAt,
        source: message.source,
      });
    } catch (pusherError) {
      console.error("Error triggering pusher for client message:", pusherError);
    }

    try {
      const pusher = getPusherServer();
      const recipients = new Set<string>();
      if ((lead as any)?.realtorId) recipients.add(String((lead as any).realtorId));
      if ((lead as any)?.property?.ownerId) recipients.add(String((lead as any).property.ownerId));
      if ((lead as any)?.team?.ownerId) recipients.add(String((lead as any).team.ownerId));

      for (const rid of recipients) {
        try {
          await pusher.trigger(PUSHER_CHANNELS.REALTOR(String(rid)), PUSHER_EVENTS.NEW_CHAT_MESSAGE, {
            leadId: String(id),
            messageId: String(message.id),
            fromClient: false,
            ts: new Date().toISOString(),
          });
        } catch {
          // ignore
        }
      }

      try {
        await pusher.trigger(PUSHER_CHANNELS.REALTOR(String(userId)), PUSHER_EVENTS.LEAD_CHAT_READ_RECEIPT, {
          leadId: String(id),
          lastReadAt: new Date().toISOString(),
          ts: new Date().toISOString(),
        });
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }

    // Atualizar CRM da agência em tempo real
    try {
      const teamId = (lead as any)?.teamId ? String((lead as any).teamId) : null;
      if (teamId) {
        const pusher = getPusherServer();
        await pusher.trigger(PUSHER_CHANNELS.AGENCY(teamId), PUSHER_EVENTS.AGENCY_LEADS_UPDATED, {
          teamId,
          leadId: String(id),
          ts: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(lead.realtorId);
      } catch {
        // ignore
      }
    }

    // Enviar email para o cliente avisando da nova mensagem
    try {
      const fullLead: any = await (prisma as any).lead.findUnique({
        where: { id },
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

      if (fullLead?.contact?.email && fullLead.clientChatToken) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zillowlike.vercel.app";
        const chatUrl = `${siteUrl}/chat/${fullLead.clientChatToken}`;

        const recipientEmail = fullLead.contact.email;
        const dedupeTitle = `EMAIL:REALTOR_REPLY_TO_CLIENT:${id}:${recipientEmail}`;
        const isDuplicate = await wasRecentlyNotified(dedupeTitle, 10 * 60 * 1000);
        if (isDuplicate) {
          return NextResponse.json({
            message: {
              id: message.id,
              content: message.content,
              senderId: userId,
              senderType: role || "REALTOR",
              source: message.source,
              createdAt: message.createdAt,
              read: true,
            },
          });
        }

        const emailData = getRealtorReplyNotificationEmail({
          clientName: fullLead.contact.name || "Cliente",
          propertyTitle: fullLead.property?.title || "Imóvel",
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
              leadId: id,
              type: "INTERNAL_MESSAGE",
              title: dedupeTitle,
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

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        senderId: userId,
        senderType: role || "REALTOR",
        source: message.source,
        createdAt: message.createdAt,
        read: true,
      },
      conversation: {
        state: String(lifecycleResult.lead.conversationState || "ACTIVE"),
        archivedAt: lifecycleResult.lead.conversationArchivedAt ? new Date(lifecycleResult.lead.conversationArchivedAt).toISOString() : null,
        closedAt: lifecycleResult.lead.conversationClosedAt ? new Date(lifecycleResult.lead.conversationClosedAt).toISOString() : null,
        lastActivityAt: lifecycleResult.lead.conversationLastActivityAt
          ? new Date(lifecycleResult.lead.conversationLastActivityAt).toISOString()
          : null,
      },
    });
  } catch (error) {
    if ((error as any)?.message === "CONVERSATION_CLOSED") {
      return NextResponse.json(
        { error: "Esta conversa foi encerrada e não aceita novas mensagens." },
        { status: 409 }
      );
    }

    console.error("Error creating client message:", error);
    return NextResponse.json(
      { error: "Não conseguimos enviar esta mensagem agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
