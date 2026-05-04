import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePipelineStageSchema } from "@/lib/validations/lead";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { LeadConversationLifecycleService } from "@/lib/lead-conversation-lifecycle";
import {
  PIPELINE_STAGE_META,
  buildPipelineStageAutomation,
  getLostReasonLabel,
  getPipelineStageRank,
  getWonReasonLabel,
  isClosedPipelineStage,
  transitionRequiresReason,
} from "@/lib/lead-pipeline";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";
import { captureException } from "@/lib/sentry";
import { logger } from "@/lib/logger";

type PipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

function normalizeText(value: string | null | undefined) {
  const text = String(value || "").trim();
  return text.length ? text : null;
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
    const {
      stage,
      transitionReason,
      note,
      lostReason,
      wonReason,
      applyAutomation,
      source,
    } = updatePipelineStageSchema.parse(body);

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        status: true,
        pipelineStage: true,
        lostReason: true,
        visitDate: true,
        nextActionDate: true,
        nextActionNote: true,
        conversationState: true,
        respondedAt: true,
        completedAt: true,
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
    const reasonText = normalizeText(transitionReason);
    const noteText = normalizeText(note);
    const requiresReason = transitionRequiresReason(currentStage, nextStage);
    const isRegression = getPipelineStageRank(nextStage) < getPipelineStageRank(currentStage);
    const isClosingTransition = isClosedPipelineStage(nextStage);
    const isReopenTransition = isClosedPipelineStage(currentStage) && !isClosedPipelineStage(nextStage);

    if (currentStage === nextStage) {
      return NextResponse.json({
        success: true,
        lead: {
          id,
          status: lead.status,
          pipelineStage: currentStage,
          lostReason: lead.lostReason || null,
          nextActionDate: lead.nextActionDate || null,
          nextActionNote: lead.nextActionNote || null,
        },
      });
    }

    if (requiresReason && !reasonText) {
      return NextResponse.json(
        { error: "Informe o motivo da mudança para registrar a transição no funil." },
        { status: 400 }
      );
    }

    if (nextStage === "LOST" && !lostReason) {
      return NextResponse.json({ error: "Selecione o motivo de perda do lead." }, { status: 400 });
    }

    if (nextStage === "WON" && !wonReason) {
      return NextResponse.json({ error: "Selecione o motivo de ganho do lead." }, { status: 400 });
    }

    const shouldApplyAutomation = applyAutomation !== false;
    const automation = shouldApplyAutomation
      ? buildPipelineStageAutomation({ stage: nextStage, visitDate: lead.visitDate, now: new Date() })
      : null;

    const isClosedStatus = ["COMPLETED", "CANCELLED", "EXPIRED", "OWNER_REJECTED"].includes(String(lead.status || "").toUpperCase());
    const nextStatus = isClosingTransition ? "COMPLETED" : isClosedStatus ? "ACCEPTED" : lead.status;

    const updated = await (prisma as any).lead.update({
      where: { id },
      data: {
        pipelineStage: stage,
        status: nextStatus,
        completedAt: isClosingTransition ? new Date() : isReopenTransition ? null : lead.completedAt,
        lostReason: nextStage === "LOST" ? lostReason : null,
        nextActionDate: shouldApplyAutomation ? automation?.nextActionDate || null : lead.nextActionDate,
        nextActionNote: shouldApplyAutomation ? automation?.nextActionNote || null : lead.nextActionNote,
      },
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        lostReason: true,
        nextActionDate: true,
        nextActionNote: true,
      },
    });

    if (noteText) {
      await (prisma as any).leadNote.create({
        data: {
          leadId: id,
          realtorId: String(userId),
          content: `[${PIPELINE_STAGE_META[currentStage].shortLabel} → ${PIPELINE_STAGE_META[nextStage].shortLabel}] ${noteText}`,
        },
      });
    }

    const lostReasonLabel = getLostReasonLabel(lostReason || null);
    const wonReasonLabel = getWonReasonLabel(wonReason || null);
    const descriptionParts = [reasonText, nextStage === "LOST" ? lostReasonLabel : null, nextStage === "WON" ? wonReasonLabel : null, noteText].filter(Boolean);

    await LeadEventService.record({
      leadId: id,
      type: "STAGE_CHANGED",
      actorId: String(userId),
      actorRole: role,
      title: `Etapa movida para ${PIPELINE_STAGE_META[nextStage].label}`,
      description: descriptionParts.length ? descriptionParts.join(" • ") : null,
      fromStage: lead.pipelineStage || null,
      toStage: updated.pipelineStage || null,
      fromStatus: lead.status,
      toStatus: updated.status,
      metadata: {
        transitionReason: reasonText,
        note: noteText,
        lostReason: lostReason || null,
        wonReason: wonReason || null,
        source: normalizeText(source),
        applyAutomation: shouldApplyAutomation,
        isRegression,
        isReopenTransition,
      },
    });

    if (isClosingTransition) {
      try {
        await LeadConversationLifecycleService.closeConversation(String(id), {
          actorId: String(userId),
          actorRole: String(role || ""),
          reason: reasonText || `PIPELINE_${nextStage}`,
        });
      } catch {
      }
    } else if (lead.conversationState !== "ACTIVE") {
      try {
        await LeadConversationLifecycleService.reopenConversation(String(id), {
          actorId: String(userId),
          actorRole: String(role || ""),
          reason: reasonText || `PIPELINE_REOPEN_${nextStage}`,
          ensureToken: true,
        });
      } catch {
      }
    }

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
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
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    captureException(error, { route: "/api/leads/[id]/pipeline" });
    logger.error("Error updating lead pipeline stage", { error });
    const message = error?.message || "Não conseguimos atualizar a etapa deste lead agora.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
