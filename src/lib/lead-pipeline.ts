export type CanonicalPipelineStage =
  | "NEW"
  | "CONTACT"
  | "VISIT"
  | "PROPOSAL"
  | "DOCUMENTS"
  | "WON"
  | "LOST";

export type BoardPipelineGroup = "NEW" | "CONTACT" | "NEGOTIATION" | "CLOSED";

export type LeadLostReasonValue =
  | "CLIENT_DESISTIU"
  | "FECHOU_OUTRO_IMOVEL"
  | "CONDICAO_FINANCEIRA"
  | "NAO_RESPONDEU"
  | "OUTRO";

export type LeadWonReasonValue =
  | "VISITA_CONVERTEU"
  | "PROPOSTA_ACEITA"
  | "NEGOCIACAO_DIRETA"
  | "INDICACAO"
  | "OUTRO";

export const CANONICAL_PIPELINE_STAGES: CanonicalPipelineStage[] = [
  "NEW",
  "CONTACT",
  "VISIT",
  "PROPOSAL",
  "DOCUMENTS",
  "WON",
  "LOST",
];

export const PIPELINE_STAGE_META: Record<
  CanonicalPipelineStage,
  {
    label: string;
    shortLabel: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    wipLimit: number | null;
    agingWarningDays: number | null;
  }
> = {
  NEW: {
    label: "Novos",
    shortLabel: "Novo",
    description: "Aguardando primeiro contato",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    wipLimit: 12,
    agingWarningDays: 1,
  },
  CONTACT: {
    label: "Contato",
    shortLabel: "Contato",
    description: "Em conversa com o cliente",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    wipLimit: 18,
    agingWarningDays: 3,
  },
  VISIT: {
    label: "Visita",
    shortLabel: "Visita",
    description: "Visita agendada ou em confirmação",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    wipLimit: 10,
    agingWarningDays: 4,
  },
  PROPOSAL: {
    label: "Proposta",
    shortLabel: "Proposta",
    description: "Negociação de condições",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    wipLimit: 8,
    agingWarningDays: 5,
  },
  DOCUMENTS: {
    label: "Documentação",
    shortLabel: "Docs",
    description: "Pendências contratuais e documentação",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    wipLimit: 6,
    agingWarningDays: 7,
  },
  WON: {
    label: "Fechado",
    shortLabel: "Ganho",
    description: "Negócio concluído",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    wipLimit: null,
    agingWarningDays: null,
  },
  LOST: {
    label: "Perdido",
    shortLabel: "Perdido",
    description: "Negócio encerrado sem avanço",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    wipLimit: null,
    agingWarningDays: null,
  },
};

export const LEAD_LOST_REASON_OPTIONS: Array<{ value: LeadLostReasonValue; label: string }> = [
  { value: "CLIENT_DESISTIU", label: "Cliente desistiu" },
  { value: "FECHOU_OUTRO_IMOVEL", label: "Fechou outro imóvel" },
  { value: "CONDICAO_FINANCEIRA", label: "Condição financeira" },
  { value: "NAO_RESPONDEU", label: "Parou de responder" },
  { value: "OUTRO", label: "Outro motivo" },
];

export const LEAD_WON_REASON_OPTIONS: Array<{ value: LeadWonReasonValue; label: string }> = [
  { value: "VISITA_CONVERTEU", label: "Visita converteu" },
  { value: "PROPOSTA_ACEITA", label: "Proposta aceita" },
  { value: "NEGOCIACAO_DIRETA", label: "Negociação direta" },
  { value: "INDICACAO", label: "Indicação" },
  { value: "OUTRO", label: "Outro motivo" },
];

export function getPipelineStageRank(stage: CanonicalPipelineStage | null | undefined): number {
  const normalized = (stage || "NEW") as CanonicalPipelineStage;
  const idx = CANONICAL_PIPELINE_STAGES.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

export function isClosedPipelineStage(stage: CanonicalPipelineStage | null | undefined) {
  return stage === "WON" || stage === "LOST";
}

export function getLostReasonLabel(value: LeadLostReasonValue | string | null | undefined) {
  return LEAD_LOST_REASON_OPTIONS.find((item) => item.value === value)?.label || null;
}

export function getWonReasonLabel(value: LeadWonReasonValue | string | null | undefined) {
  return LEAD_WON_REASON_OPTIONS.find((item) => item.value === value)?.label || null;
}

export function transitionRequiresReason(
  currentStage: CanonicalPipelineStage | null | undefined,
  nextStage: CanonicalPipelineStage | null | undefined
) {
  if (!currentStage || !nextStage || currentStage === nextStage) return false;
  if (isClosedPipelineStage(currentStage) || isClosedPipelineStage(nextStage)) return true;
  return getPipelineStageRank(nextStage) < getPipelineStageRank(currentStage);
}

function nextLocalBusinessTime(daysToAdd: number, hour: number, baseDate?: Date | string | null) {
  const base = baseDate ? new Date(baseDate) : new Date();
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + Math.max(0, daysToAdd));
    fallback.setHours(hour, 0, 0, 0);
    return fallback;
  }
  const next = new Date(base);
  next.setDate(next.getDate() + Math.max(0, daysToAdd));
  next.setHours(hour, 0, 0, 0);
  return next;
}

export function buildPipelineStageAutomation(params: {
  stage: CanonicalPipelineStage;
  visitDate?: Date | string | null;
  now?: Date;
}) {
  const now = params.now || new Date();

  if (params.stage === "WON" || params.stage === "LOST") {
    return {
      nextActionDate: null,
      nextActionNote: null,
    };
  }

  if (params.stage === "NEW") {
    return {
      nextActionDate: nextLocalBusinessTime(0, 10, now),
      nextActionNote: "Fazer o primeiro contato e validar interesse.",
    };
  }

  if (params.stage === "CONTACT") {
    return {
      nextActionDate: nextLocalBusinessTime(1, 10, now),
      nextActionNote: "Retomar conversa e qualificar cliente.",
    };
  }

  if (params.stage === "VISIT") {
    return {
      nextActionDate: params.visitDate ? new Date(params.visitDate) : nextLocalBusinessTime(1, 9, now),
      nextActionNote: "Confirmar presença, horário e próximos passos da visita.",
    };
  }

  if (params.stage === "PROPOSAL") {
    return {
      nextActionDate: nextLocalBusinessTime(1, 11, now),
      nextActionNote: "Fazer follow-up da proposta e alinhar condições.",
    };
  }

  return {
    nextActionDate: nextLocalBusinessTime(2, 10, now),
    nextActionNote: "Acompanhar documentação e remover pendências.",
  };
}

export function canonicalToBoardGroup(
  stage: CanonicalPipelineStage | null | undefined,
  status?: string | null
): BoardPipelineGroup {
  if (stage === "NEW") return "NEW";
  if (stage === "CONTACT") return "CONTACT";
  if (stage === "VISIT" || stage === "PROPOSAL" || stage === "DOCUMENTS") {
    return "NEGOTIATION";
  }
  if (stage === "WON" || stage === "LOST") {
    return "CLOSED";
  }

  if (status === "RESERVED") return "NEW";
  return "CONTACT";
}

export function boardGroupToCanonical(
  group: BoardPipelineGroup,
  currentStage?: CanonicalPipelineStage | null
): CanonicalPipelineStage {
  if (group === "NEW") return "NEW";
  if (group === "CONTACT") return "CONTACT";

  if (group === "NEGOTIATION") {
    if (
      currentStage === "VISIT" ||
      currentStage === "PROPOSAL" ||
      currentStage === "DOCUMENTS"
    ) {
      return currentStage;
    }
    return "PROPOSAL";
  }

  if (currentStage === "WON" || currentStage === "LOST") {
    return currentStage;
  }
  return "WON";
}
