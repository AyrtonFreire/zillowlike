export type AgencyLeadTemplateOption = { id: string; label: string; text: string };

export type AgencyLeadTemplateContext = {
  leadId: string;
  realtorName: string | null;
  contactName: string | null;
  propertyTitle: string | null;
  pipelineStage: string | null;
  createdAt?: string | null;
  pendingReplyAt?: string | null;
  nextActionDate?: string | null;
  hasAssignee?: boolean;
};

function formatSlaAge(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return `${hours}h ${rem.toString().padStart(2, "0")}m`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return `${days}d ${hrs}h`;
}

function formatFollowUpDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(value);
  }
}

function buildMessage(params: {
  realtorName: string | null;
  client: string;
  prop: string;
  stage: string;
  isPendingReply: boolean;
  isNewLead: boolean;
  slaAge: string | null;
  followUpAt?: string | null;
  variant:
    | "recommended"
    | "status"
    | "new"
    | "pending"
    | "follow_up"
    | "reschedule_follow_up"
    | "lost_reason"
    | "won_confirm"
    | "unassigned";
}) {
  const realtorName = String(params.realtorName || "").trim();
  const greeting = realtorName ? `Olá ${realtorName}!` : "Olá!";
  const sla = params.slaAge ? ` há ${params.slaAge}` : "";
  const followUp = params.followUpAt ? ` agendado para ${params.followUpAt}` : "";

  if (params.variant === "unassigned") {
    return `${greeting} Tudo bem? Esse lead está sem responsável: ${params.client}${params.prop}. Você consegue atribuir alguém e atualizar o status quando puder? Obrigado!`;
  }

  if (params.variant === "pending") {
    return `${greeting} Tudo bem? No painel aparece que o ${params.client}${params.prop} está aguardando retorno${sla}. Você consegue confirmar se já respondeu e atualizar o status quando puder? Obrigado!`;
  }

  if (params.variant === "new") {
    return `${greeting} Tudo bem? Chegou um lead novo: ${params.client}${params.prop}. Você consegue fazer o primeiro contato e atualizar o status quando puder? Obrigado!`;
  }

  if (params.variant === "follow_up") {
    return `${greeting} Tudo bem? Tem um follow-up${followUp} do ${params.client}${params.prop}. Você consegue realizar e atualizar o status quando puder? Obrigado!`;
  }

  if (params.variant === "reschedule_follow_up") {
    return `${greeting} Tudo bem? Você consegue reagendar o follow-up do ${params.client}${params.prop} e atualizar a data/status quando puder? Obrigado!`;
  }

  if (params.variant === "lost_reason") {
    return `${greeting} Tudo bem? Consegue registrar o motivo do LOST do ${params.client}${params.prop} e atualizar o status quando puder? Obrigado!`;
  }

  if (params.variant === "won_confirm") {
    return `${greeting} Tudo bem? Consegue confirmar se o ${params.client}${params.prop} foi fechado e registrar o status quando puder? Obrigado!`;
  }

  if (params.variant === "status") {
    return `${greeting} Tudo bem? Consegue me dar um update rápido sobre o ${params.client}${params.prop}? Obrigado!`;
  }

  const isPending = params.isPendingReply;
  const isNew = params.isNewLead;
  const stage = params.stage;

  if (isPending) return buildMessage({ ...params, variant: "pending" });
  if (params.followUpAt) return buildMessage({ ...params, variant: "follow_up" });

  if (stage === "WON") return buildMessage({ ...params, variant: "won_confirm" });
  if (stage === "LOST") return buildMessage({ ...params, variant: "lost_reason" });

  if (isNew) return buildMessage({ ...params, variant: "new" });

  if (stage === "CONTACT") {
    return `${greeting} Tudo bem? Consegue me confirmar como está o contato com o ${params.client}${params.prop} e atualizar o status quando puder? Obrigado!`;
  }

  if (stage === "VISIT") {
    return `${greeting} Tudo bem? Consegue me atualizar sobre a visita do ${params.client}${params.prop} (se já aconteceu / próximos passos) e registrar o status quando puder? Obrigado!`;
  }

  if (stage === "PROPOSAL") {
    return `${greeting} Tudo bem? Consegue me atualizar sobre a proposta do ${params.client}${params.prop} e registrar o status quando puder? Obrigado!`;
  }

  if (stage === "DOCUMENTS") {
    return `${greeting} Tudo bem? Consegue me atualizar sobre a etapa de documentação do ${params.client}${params.prop} e registrar o status quando puder? Obrigado!`;
  }

  return buildMessage({ ...params, variant: "status" });
}

export function buildAgencyLeadRecommendedMessage(ctx: AgencyLeadTemplateContext) {
  const stage = String(ctx.pipelineStage || "").toUpperCase().trim();
  const pending = ctx.pendingReplyAt ? String(ctx.pendingReplyAt) : "";
  const isPending = !!pending;
  const slaAge = formatSlaAge(pending || null);

  const createdAt = ctx.createdAt ? new Date(String(ctx.createdAt)) : null;
  const createdOk = createdAt && !Number.isNaN(createdAt.getTime());
  const isNewLead = stage === "NEW" || (createdOk ? Date.now() - createdAt!.getTime() < 24 * 60 * 60 * 1000 : false);

  const followUpAt = formatFollowUpDate(ctx.nextActionDate || null);

  const client = ctx.contactName || `lead ${ctx.leadId}`;
  const prop = ctx.propertyTitle ? ` (${ctx.propertyTitle})` : "";

  return buildMessage({
    realtorName: ctx.realtorName,
    client,
    prop,
    stage,
    isPendingReply: isPending,
    isNewLead,
    slaAge,
    followUpAt,
    variant: "recommended",
  });
}

export function buildAgencyLeadTemplateOptions(ctx: AgencyLeadTemplateContext): AgencyLeadTemplateOption[] {
  const options: AgencyLeadTemplateOption[] = [];

  const stage = String(ctx.pipelineStage || "").toUpperCase().trim();
  const pending = ctx.pendingReplyAt ? String(ctx.pendingReplyAt) : "";
  const isPending = !!pending;
  const slaAge = formatSlaAge(pending || null);

  const createdAt = ctx.createdAt ? new Date(String(ctx.createdAt)) : null;
  const createdOk = createdAt && !Number.isNaN(createdAt.getTime());
  const isNewLead = stage === "NEW" || (createdOk ? Date.now() - createdAt!.getTime() < 24 * 60 * 60 * 1000 : false);

  const followUpAt = formatFollowUpDate(ctx.nextActionDate || null);

  const client = ctx.contactName || `lead ${ctx.leadId}`;
  const prop = ctx.propertyTitle ? ` (${ctx.propertyTitle})` : "";

  options.push({
    id: "recommended",
    label: "Recomendado",
    text: buildMessage({
      realtorName: ctx.realtorName,
      client,
      prop,
      stage,
      isPendingReply: isPending,
      isNewLead,
      slaAge,
      followUpAt,
      variant: "recommended",
    }),
  });

  options.push({
    id: "status",
    label: "Pedir update (neutro)",
    text: buildMessage({
      realtorName: ctx.realtorName,
      client,
      prop,
      stage: "",
      isPendingReply: false,
      isNewLead: false,
      slaAge: null,
      followUpAt: null,
      variant: "status",
    }),
  });

  options.push({
    id: "new",
    label: "Lead novo (primeiro contato)",
    text: buildMessage({
      realtorName: ctx.realtorName,
      client,
      prop,
      stage: "NEW",
      isPendingReply: false,
      isNewLead: true,
      slaAge: null,
      followUpAt: null,
      variant: "new",
    }),
  });

  options.push({
    id: "pending",
    label: "Cobrar retorno (SLA)",
    text: buildMessage({
      realtorName: ctx.realtorName,
      client,
      prop,
      stage,
      isPendingReply: true,
      isNewLead: false,
      slaAge,
      followUpAt: null,
      variant: "pending",
    }),
  });

  if (followUpAt) {
    options.push({
      id: "follow_up",
      label: "Follow-up (agendado)",
      text: buildMessage({
        realtorName: ctx.realtorName,
        client,
        prop,
        stage,
        isPendingReply: false,
        isNewLead: false,
        slaAge: null,
        followUpAt,
        variant: "follow_up",
      }),
    });
  }

  options.push({
    id: "reschedule_follow_up",
    label: "Reagendar follow-up",
    text: buildMessage({
      realtorName: ctx.realtorName,
      client,
      prop,
      stage,
      isPendingReply: false,
      isNewLead: false,
      slaAge: null,
      followUpAt: null,
      variant: "reschedule_follow_up",
    }),
  });

  options.push({
    id: "lost_reason",
    label: "LOST: pedir motivo",
    text: buildMessage({
      realtorName: ctx.realtorName,
      client,
      prop,
      stage: "LOST",
      isPendingReply: false,
      isNewLead: false,
      slaAge: null,
      followUpAt: null,
      variant: "lost_reason",
    }),
  });

  options.push({
    id: "won_confirm",
    label: "WON: confirmar fechamento",
    text: buildMessage({
      realtorName: ctx.realtorName,
      client,
      prop,
      stage: "WON",
      isPendingReply: false,
      isNewLead: false,
      slaAge: null,
      followUpAt: null,
      variant: "won_confirm",
    }),
  });

  if (ctx.hasAssignee === false) {
    options.push({
      id: "unassigned",
      label: "Sem responsável",
      text: buildMessage({
        realtorName: ctx.realtorName,
        client,
        prop,
        stage,
        isPendingReply: false,
        isNewLead,
        slaAge: null,
        followUpAt: null,
        variant: "unassigned",
      }),
    });
  }

  return options;
}
