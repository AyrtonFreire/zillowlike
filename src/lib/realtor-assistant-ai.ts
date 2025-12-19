export type RealtorAssistantItemType =
  | "NEW_LEAD"
  | "UNANSWERED_CLIENT_MESSAGE"
  | "LEAD_NO_FIRST_CONTACT"
  | "STALE_LEAD"
  | "REMINDER_TODAY"
  | "REMINDER_OVERDUE"
  | "VISIT_TODAY"
  | "VISIT_TOMORROW"
  | "OWNER_APPROVAL_PENDING"
  | (string & {});

export type RealtorAssistantCategory = "Leads" | "Visitas" | "Lembretes" | "Outros";

export type RealtorAssistantAiSpec = {
  category: RealtorAssistantCategory;
  taskLabel: string;
  typeInstructions: string;
};

const DEFAULT_SPEC: RealtorAssistantAiSpec = {
  category: "Outros",
  taskLabel: "Gerar sugestão",
  typeInstructions:
    "Gere a melhor próxima ação possível e um rascunho pronto para execução. Se for uma mensagem, escreva como corretor e deixe pronto para copiar e enviar.",
};

const SPECS: Partial<Record<RealtorAssistantItemType, RealtorAssistantAiSpec>> = {
  UNANSWERED_CLIENT_MESSAGE: {
    category: "Leads",
    taskLabel: "Criar resposta",
    typeInstructions:
      "Você precisa responder o cliente com agilidade. Faça uma resposta curta, objetiva e educada.\n" +
      "- Confirme entendimento da dúvida/pedido\n" +
      "- Faça 1 a 3 perguntas de qualificação se necessário\n" +
      "- Sugira um próximo passo claro (ex.: agendar visita, enviar mais fotos, confirmar disponibilidade)\n" +
      "- Evite texto longo e evite parecer robótico",
  },
  NEW_LEAD: {
    category: "Leads",
    taskLabel: "Criar resposta",
    typeInstructions:
      "Trate como primeiro contato de um lead. Faça uma mensagem curta, acolhedora e prática.\n" +
      "- Se apresente rapidamente\n" +
      "- Confirme qual imóvel/interesse\n" +
      "- Sugira 2 opções de próximo passo (ex.: enviar detalhes / agendar visita)\n" +
      "- Pergunte a melhor forma/horário de contato",
  },
  LEAD_NO_FIRST_CONTACT: {
    category: "Leads",
    taskLabel: "Criar primeiro contato",
    typeInstructions:
      "O lead foi assumido mas não houve primeiro contato registrado. Faça uma mensagem de primeiro contato objetiva.\n" +
      "- Confirme o interesse\n" +
      "- Pergunte disponibilidade\n" +
      "- Ofereça alternativas caso o imóvel não sirva",
  },
  STALE_LEAD: {
    category: "Leads",
    taskLabel: "Criar follow-up",
    typeInstructions:
      "Lead está parado há alguns dias. Faça um follow-up curto e amigável, sem pressão.\n" +
      "- Relembre o contexto\n" +
      "- Faça 1 pergunta simples\n" +
      "- Ofereça opções (visita, mais detalhes, alternativas)",
  },
  REMINDER_TODAY: {
    category: "Lembretes",
    taskLabel: "Definir próximo passo",
    typeInstructions:
      "Existe um lembrete para hoje. Proponha um próximo passo concreto em 1-2 frases e um rascunho de mensagem (se aplicável).\n" +
      "Se houver uma anotação de próximo passo, use como base.",
  },
  REMINDER_OVERDUE: {
    category: "Lembretes",
    taskLabel: "Definir próximo passo",
    typeInstructions:
      "O lembrete está vencido. Proponha uma ação rápida para destravar: o que fazer agora e uma mensagem curta se necessário.\n" +
      "Se houver uma anotação de próximo passo, use como base.",
  },
  VISIT_TODAY: {
    category: "Visitas",
    taskLabel: "Preparar confirmação",
    typeInstructions:
      "Há visita marcada para hoje. Gere uma mensagem de confirmação ao cliente com horário/local e o que levar/combinar.\n" +
      "- Confirme horário\n" +
      "- Combine ponto de encontro\n" +
      "- Ofereça ajuste de horário se necessário",
  },
  VISIT_TOMORROW: {
    category: "Visitas",
    taskLabel: "Preparar confirmação",
    typeInstructions:
      "Há visita marcada para amanhã. Gere uma mensagem de confirmação curta e prática.\n" +
      "- Confirme horário\n" +
      "- Combine ponto de encontro\n" +
      "- Peça confirmação de presença",
  },
  OWNER_APPROVAL_PENDING: {
    category: "Visitas",
    taskLabel: "Cobrar aprovação",
    typeInstructions:
      "A visita depende de aprovação do proprietário. Gere uma mensagem curta para solicitar/confirmar a aprovação com educação.\n" +
      "- Reforce data/horário\n" +
      "- Peça confirmação\n" +
      "- Ofereça alternativa de horário",
  },
};

export function getRealtorAssistantAiSpec(type: string | null | undefined): RealtorAssistantAiSpec {
  const key = (type || "").trim() as RealtorAssistantItemType;
  return SPECS[key] || DEFAULT_SPEC;
}

export function getRealtorAssistantTaskLabel(type: string | null | undefined): string {
  return getRealtorAssistantAiSpec(type).taskLabel;
}

export function getRealtorAssistantCategory(type: string | null | undefined): RealtorAssistantCategory {
  return getRealtorAssistantAiSpec(type).category;
}

export function getRealtorAssistantTypeInstructions(type: string | null | undefined): string {
  return getRealtorAssistantAiSpec(type).typeInstructions;
}
