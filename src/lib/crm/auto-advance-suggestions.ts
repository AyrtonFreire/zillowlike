import { prisma } from "@/lib/prisma";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";
import { logger } from "@/lib/logger";
import {
  detectAutoAdvanceFromClientMessage,
  detectAutoAdvanceFromProfessionalMessage,
  type AutoAdvanceSignal,
} from "@/lib/crm/keyword-detection";

type LeadLite = {
  id: string;
  realtorId: string | null;
  teamId: string | null;
  pipelineStage: string;
  contact: { name?: string | null } | null;
};

const REASON_LABEL: Record<AutoAdvanceSignal, string> = {
  PROPOSAL: "Mensagem do cliente indica interesse comercial (proposta/valor).",
  DOCUMENTS: "Cliente mencionou contrato/documentação.",
  WON: "Você indicou fechamento (vendi/aluguei/assinou).",
};

async function loadLead(leadId: string): Promise<LeadLite | null> {
  try {
    const lead = await (prisma as any).lead.findUnique({
      where: { id: String(leadId) },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        pipelineStage: true,
        contact: { select: { name: true } },
      },
    });
    return (lead as LeadLite) || null;
  } catch (err) {
    logger.warn("auto-advance: falha ao carregar lead", { leadId, err });
    return null;
  }
}

async function emitSuggestion(
  lead: LeadLite,
  suggestedStage: AutoAdvanceSignal,
  source: "client" | "professional"
) {
  const pusher = getPusherServer();
  if (!pusher) return;

  const payload = {
    leadId: lead.id,
    suggestedStage,
    currentStage: lead.pipelineStage,
    reason: REASON_LABEL[suggestedStage],
    source,
    contactName: lead.contact?.name || null,
    at: new Date().toISOString(),
  };

  const targets: string[] = [];
  if (lead.realtorId) targets.push(PUSHER_CHANNELS.REALTOR(String(lead.realtorId)));
  if (lead.teamId) targets.push(PUSHER_CHANNELS.AGENCY(String(lead.teamId)));

  for (const channel of targets) {
    try {
      await pusher.trigger(channel, PUSHER_EVENTS.CRM_AUTO_ADVANCE_SUGGESTED, payload);
    } catch (err) {
      logger.warn("auto-advance: falha ao emitir sugestão", { channel, err });
    }
  }
}

export async function detectAutoAdvanceFromReply(params: {
  leadId: string;
  message: string;
  source: "client" | "professional";
}): Promise<AutoAdvanceSignal | null> {
  const { leadId, message, source } = params;
  if (!leadId || !message || message.trim().length === 0) return null;

  const lead = await loadLead(leadId);
  if (!lead) return null;

  const stage = String(lead.pipelineStage || "NEW");
  const signal =
    source === "client"
      ? detectAutoAdvanceFromClientMessage(message, stage)
      : detectAutoAdvanceFromProfessionalMessage(message, stage);

  if (!signal) return null;

  await emitSuggestion(lead, signal, source);
  return signal;
}
