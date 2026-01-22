import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePipelineStageSchema } from "@/lib/validations/lead";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";
import { captureException } from "@/lib/sentry";
import { logger } from "@/lib/logger";

const PIPELINE_ORDER = ["NEW", "CONTACT", "VISIT", "PROPOSAL", "DOCUMENTS", "WON", "LOST"] as const;
type PipelineStage = (typeof PIPELINE_ORDER)[number];

function stageRank(stage: PipelineStage | null | undefined): number {
  const normalized = (stage || "NEW") as PipelineStage;
  const idx = PIPELINE_ORDER.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

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

    if (role === "AGENCY") {
      return NextResponse.json(
        { error: "Perfil de agência não pode alterar etapas de leads. Você pode apenas distribuir/redistribuir." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { stage } = updatePipelineStageSchema.parse(body);

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        status: true,
        pipelineStage: true,
        realtorId: true,
        teamId: true,
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
        { error: "Você só pode mudar a etapa de leads que está atendendo ou dos times que lidera." },
        { status: 403 }
      );
    }

    const currentStage = (lead.pipelineStage || "NEW") as PipelineStage;
    const nextStage = stage as PipelineStage;

    // Nunca permitir retroceder no funil
    // - Se já está fechado (WON/LOST), não volta para nenhuma etapa
    // - Em etapas abertas, só permite manter ou avançar
    if (currentStage === "WON" || currentStage === "LOST") {
      if (nextStage !== currentStage) {
        return NextResponse.json(
          { error: "Este lead já está fechado e não pode voltar para etapas anteriores." },
          { status: 400 }
        );
      }
    } else {
      const currentRank = stageRank(currentStage);
      const nextRank = stageRank(nextStage);
      if (nextRank < currentRank) {
        return NextResponse.json(
          { error: "Não é possível retroceder a etapa do lead. Você só pode manter ou avançar no funil." },
          { status: 400 }
        );
      }
    }

    const updated = await (prisma as any).lead.update({
      where: { id },
      data: {
        pipelineStage: stage,
      },
      select: {
        id: true,
        status: true,
        pipelineStage: true,
      },
    });

    await LeadEventService.record({
      leadId: id,
      type: "STAGE_CHANGED",
      actorId: String(userId),
      actorRole: role,
      fromStage: lead.pipelineStage || null,
      toStage: updated.pipelineStage || null,
      fromStatus: lead.status,
      toStatus: updated.status,
    });

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }

    try {
      const teamId = lead?.teamId ? String(lead.teamId) : null;
      if (teamId) {
        const pusher = getPusherServer();
        await pusher.trigger(PUSHER_CHANNELS.AGENCY(teamId), PUSHER_EVENTS.AGENCY_LEADS_UPDATED, {
          teamId,
          leadId: id,
          ts: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    captureException(error, { route: "/api/leads/[id]/pipeline" });
    logger.error("Error updating lead pipeline stage", { error });
    const message = error?.message || "Não conseguimos atualizar a etapa deste lead agora.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
