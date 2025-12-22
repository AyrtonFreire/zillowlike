import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPusherServer } from "@/lib/pusher-server";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

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

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        realtorId: true,
        userId: true,
        pipelineStage: true,
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

    const messages = await (prisma as any).leadMessage.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching lead messages:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar as mensagens deste lead agora." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        realtorId: true,
        userId: true,
        pipelineStage: true,
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

    const json = await req.json().catch(() => null);
    const parsed = messageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const previousStage = (lead as any)?.pipelineStage as string | null | undefined;

    const message = await (prisma as any).leadMessage.create({
      data: {
        leadId: id,
        senderId: userId,
        senderRole: (role as any) || "USER",
        content: parsed.data.content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // 🆕 Automatizar funil: primeira resposta profissional move de NEW para CONTACT
    try {
      const isProfessional = role === "REALTOR" || role === "AGENCY" || role === "ADMIN";
      const currentStage = previousStage;
      if (isProfessional && (!currentStage || currentStage === "NEW")) {
        await (prisma as any).lead.update({
          where: { id },
          data: {
            pipelineStage: "CONTACT",
            respondedAt: (lead as any)?.respondedAt ? undefined : new Date(),
          },
        });
      } else if (isProfessional && !(lead as any)?.respondedAt) {
        await (prisma as any).lead.update({
          where: { id },
          data: { respondedAt: new Date() },
        });
      }
    } catch (updateError) {
      console.error("Error auto-updating lead pipelineStage on message:", updateError);
    }

    await LeadEventService.record({
      leadId: id,
      type: "INTERNAL_MESSAGE",
      actorId: userId,
      actorRole: role,
      title: "Mensagem interna adicionada",
      description: parsed.data.content.trim().slice(0, 200),
      fromStage: previousStage || null,
      toStage: previousStage === "NEW" ? "CONTACT" : previousStage || null,
    });

    try {
      const pusher = getPusherServer();
      await pusher.trigger(`private-lead-${id}`, "lead-message", {
        leadId: id,
        message,
      });
    } catch (pusherError) {
      console.error("Error triggering pusher for lead message:", pusherError);
    }

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(lead.realtorId);
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error creating lead message:", error);
    return NextResponse.json(
      { error: "Não conseguimos enviar esta mensagem agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
