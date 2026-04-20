import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePipelineStageSchema } from "@/lib/validations/lead";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { LeadConversationLifecycleService } from "@/lib/lead-conversation-lifecycle";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";
import { captureException } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";

const PIPELINE_ORDER = ["NEW", "CONTACT", "VISIT", "PROPOSAL", "DOCUMENTS", "WON", "LOST"] as const;
type PipelineStage = (typeof PIPELINE_ORDER)[number];

function stageRank(stage: PipelineStage | null | undefined): number {
  const normalized = (stage || "NEW") as PipelineStage;
  const idx = PIPELINE_ORDER.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const workspace = await resolveDeveloperWorkspaceForUser({
      userId: String(userId),
      authRole: role ? String(role) : null,
    });

    if (!workspace.allowed || !workspace.teamId) {
      return NextResponse.json(
        {
          error:
            workspace.reason === "PROFILE_NOT_FOUND"
              ? "Perfil da incorporadora não encontrado"
              : "Acesso negado",
        },
        { status: getDeveloperWorkspaceErrorStatus(workspace.reason) }
      );
    }

    if (!workspace.canManageWorkspace) {
      return NextResponse.json(
        { error: "Você não tem permissão para alterar a etapa deste lead no workspace da incorporadora." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const { stage } = updatePipelineStageSchema.parse(body);

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id: String(id) },
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        realtorId: true,
        teamId: true,
        property: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!lead?.id || !lead?.property?.teamId || String(lead.property.teamId) !== String(workspace.teamId)) {
      return NextResponse.json({ error: "Lead não encontrado neste workspace." }, { status: 404 });
    }

    const currentStage = (lead.pipelineStage || "NEW") as PipelineStage;
    const nextStage = stage as PipelineStage;

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
      where: { id: String(id) },
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
      leadId: String(id),
      type: "STAGE_CHANGED",
      actorId: String(userId),
      actorRole: role,
      fromStage: lead.pipelineStage || null,
      toStage: updated.pipelineStage || null,
      fromStatus: lead.status,
      toStatus: updated.status,
    });

    if (nextStage === "WON" || nextStage === "LOST") {
      try {
        await LeadConversationLifecycleService.closeConversation(String(id), {
          actorId: String(userId),
          actorRole: String(role || ""),
          reason: `PIPELINE_${nextStage}`,
        });
      } catch {
        // ignore
      }
    }

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }

    try {
      const teamId = lead?.teamId ? String(lead.teamId) : lead?.property?.teamId ? String(lead.property.teamId) : null;
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

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    captureException(error, { route: "/api/developer/leads/[id]/pipeline" });
    logger.error("Error updating developer lead pipeline stage", { error });
    const message = error?.message || "Não conseguimos atualizar a etapa deste lead agora.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
