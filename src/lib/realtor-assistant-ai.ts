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
  | "WEEKLY_SUMMARY"
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
  WEEKLY_SUMMARY: {
    category: "Outros",
    taskLabel: "Revisar a semana",
    typeInstructions:
      "Este item é um resumo interno semanal. NÃO escreva mensagem para cliente.\n" +
      "- Use OBRIGATORIAMENTE os dados do 'Contexto adicional' (quando houver) e cite itens específicos (leadId/propertyId + cliente + imóvel).\n" +
      "- PROIBIDO responder com conselhos genéricos (ex.: 'focar em clientes quentes', 'acompanhar propostas') sem citar quais leads/imóveis.\n" +
      "- Se o contexto não trouxer leads/imóveis suficientes, diga explicitamente que faltam dados e o que você precisaria (ex.: últimos atendimentos, visitas, mensagens).\n" +
      "- Estrutura obrigatória do draft (use exatamente estes títulos):\n" +
      "  1) TOP OPORTUNIDADES (2-4 bullets) — cada bullet deve citar ao menos 1 leadId e 1 sinal (mensagem pendente, visita, próxima ação, aprovação).\n" +
      "  2) RISCOS/ALERTAS (2-4 bullets) — cada bullet deve citar leadId e o risco concreto.\n" +
      "  3) PLANO DE 3 DIAS (3-6 passos) — cada passo deve citar leadId e uma ação objetiva (ex.: 'ligar', 'agendar', 'confirmar visita', 'enviar opções') + uma janela de horário sugerida.\n" +
      "- No summary (curto), cite pelo menos 1 leadId OU 1 propertyId como exemplo do foco da semana.",
  },
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
    taskLabel: "Fazer primeiro contato",
    typeInstructions:
      "Trate como primeiro contato de um lead. Faça uma mensagem curta, acolhedora e prática.\n" +
      "- Se apresente rapidamente\n" +
      "- Confirme qual imóvel/interesse\n" +
      "- Sugira 2 opções de próximo passo (ex.: enviar detalhes / agendar visita)\n" +
      "- Pergunte a melhor forma/horário de contato",
  },
  LEAD_NO_FIRST_CONTACT: {
    category: "Leads",
    taskLabel: "Fazer primeiro contato",
    typeInstructions:
      "O lead foi assumido mas não houve primeiro contato registrado. Faça uma mensagem de primeiro contato objetiva.\n" +
      "- Confirme o interesse\n" +
      "- Pergunte disponibilidade\n" +
      "- Ofereça alternativas caso o imóvel não sirva",
  },
  STALE_LEAD: {
    category: "Leads",
    taskLabel: "Enviar follow-up",
    typeInstructions:
      "Lead está parado há alguns dias. Faça um follow-up curto e amigável, sem pressão.\n" +
      "- Relembre o contexto\n" +
      "- Faça 1 pergunta simples\n" +
      "- Ofereça opções (visita, mais detalhes, alternativas)",
  },
  REMINDER_TODAY: {
    category: "Lembretes",
    taskLabel: "Gerar checklist",
    typeInstructions:
      "Existe um lembrete para hoje. Ajude o corretor a executar a tarefa, mas NÃO escreva como se fosse enviar uma mensagem para alguém.\n" +
      "- Crie um plano/checklist curto (3 a 6 itens) com passos objetivos\n" +
      "- Se for uma ligação, escreva um roteiro de ligação (o que falar/perguntar), sem saudações longas\n" +
      "- Se houver uma anotação de próximo passo, use como base\n" +
      "- Evite texto em formato de chat (ex.: 'Olá, tudo bem?')",
  },
  REMINDER_OVERDUE: {
    category: "Lembretes",
    taskLabel: "Gerar checklist",
    typeInstructions:
      "O lembrete está vencido. Ajude o corretor a destravar rapidamente, mas NÃO escreva como se fosse enviar uma mensagem para alguém.\n" +
      "- Crie um plano/checklist curto (3 a 6 itens) com passos objetivos\n" +
      "- Se for uma ligação, escreva um roteiro de ligação (o que falar/perguntar), sem saudações longas\n" +
      "- Se houver uma anotação de próximo passo, use como base\n" +
      "- Evite texto em formato de chat (ex.: 'Olá, tudo bem?')",
  },
  VISIT_TODAY: {
    category: "Visitas",
    taskLabel: "Confirmar visita",
    typeInstructions:
      "Há visita marcada para hoje. Gere uma mensagem de confirmação ao cliente com horário/local e o que levar/combinar.\n" +
      "- Confirme horário\n" +
      "- Combine ponto de encontro\n" +
      "- Ofereça ajuste de horário se necessário",
  },
  VISIT_TOMORROW: {
    category: "Visitas",
    taskLabel: "Confirmar visita",
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

export function getRealtorAssistantTypesForCategory(category: RealtorAssistantCategory): string[] {
  const wanted = String(category || "").trim();
  if (!wanted) return [];
  const out: string[] = [];
  for (const [type, spec] of Object.entries(SPECS)) {
    if (!spec) continue;
    if (String(spec.category) === wanted) out.push(String(type));
  }
  return out;
}

export function getRealtorAssistantTypeInstructions(type: string | null | undefined): string {
  return getRealtorAssistantAiSpec(type).typeInstructions;
}
