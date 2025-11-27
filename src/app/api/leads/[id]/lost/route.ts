import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadEventService } from "@/lib/lead-event-service";
import { QueueService } from "@/lib/queue-service";

const ALLOWED_REASONS = [
  "CLIENT_DESISTIU",
  "FECHOU_OUTRO_IMOVEL",
  "CONDICAO_FINANCEIRA",
  "NAO_RESPONDEU",
  "OUTRO",
] as const;

export type LeadLostReason = (typeof ALLOWED_REASONS)[number];

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
    const reason = (body?.reason || null) as LeadLostReason | null;

    if (reason && !ALLOWED_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Motivo de perda inválido." }, { status: 400 });
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        status: true,
        pipelineStage: true,
        realtorId: true,
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
        { error: "Você só pode marcar perda em leads que está atendendo ou dos times que lidera." },
        { status: 403 }
      );
    }

    const updated = await (prisma as any).lead.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        pipelineStage: "LOST",
        lostReason: reason,
      },
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        lostReason: true,
      },
    });

    // Se o lead estava em atendimento, decrementa contador de ativos da fila
    if (lead.status === "ACCEPTED" && lead.realtorId) {
      try {
        await QueueService.decrementActiveLeads(String(lead.realtorId));
      } catch (err) {
        console.error("Error decrementing active leads after marking lost:", err);
      }
    }

    await LeadEventService.record({
      leadId: id,
      type: "LEAD_LOST",
      actorId: String(userId),
      actorRole: role,
      title: "Lead marcado como perdido",
      description: reason || undefined,
      fromStage: lead.pipelineStage || null,
      toStage: updated.pipelineStage || null,
      fromStatus: lead.status,
      toStatus: updated.status,
      metadata: { reason },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error("Error marking lead as lost:", error);
    const message = error?.message || "Não conseguimos salvar este resultado agora.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
