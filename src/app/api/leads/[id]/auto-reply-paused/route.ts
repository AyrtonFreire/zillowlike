import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadEventService } from "@/lib/lead-event-service";
import { getPusherServer, PUSHER_CHANNELS } from "@/lib/pusher-server";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const paused = Boolean((body as any)?.paused);

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        autoReplyPaused: true,
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

    const isTeamOwner = !!lead.team && lead.team.ownerId === userId;

    if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
      return NextResponse.json(
        { error: "Você só pode pausar/reativar o assistente em leads que está atendendo ou dos times que lidera." },
        { status: 403 }
      );
    }

    const updated = await (prisma as any).lead.update({
      where: { id },
      data: {
        autoReplyPaused: paused,
      },
      select: {
        id: true,
        autoReplyPaused: true,
      },
    });

    await LeadEventService.record({
      leadId: id,
      type: "INTERNAL_MESSAGE" as any,
      actorId: String(userId),
      actorRole: role,
      title: paused ? "Assistente pausado" : "Assistente reativado",
      metadata: {
        autoReplyPaused: paused,
      },
    });

    try {
      const pusher = getPusherServer();
      await pusher.trigger(`private-lead-${id}`, "lead-auto-reply-paused", {
        leadId: id,
        autoReplyPaused: paused,
        ts: new Date().toISOString(),
      });

      await pusher.trigger(PUSHER_CHANNELS.CHAT(id), "lead-auto-reply-paused", {
        leadId: id,
        autoReplyPaused: paused,
        ts: new Date().toISOString(),
      });
    } catch {
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error("Error updating auto reply paused flag:", error);
    return NextResponse.json(
      { error: error?.message || "Não conseguimos atualizar o assistente agora." },
      { status: 500 }
    );
  }
}
