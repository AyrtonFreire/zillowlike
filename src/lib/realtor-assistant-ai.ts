export type RealtorAssistantItemType =
  | "NEW_LEAD"
  | "UNANSWERED_CLIENT_MESSAGE"
  | "CLIENT_PENDING_REPLY"
  | "CLIENT_NO_FIRST_CONTACT"
  | "CLIENT_OVERDUE_NEXT_ACTION"
  | "CLIENT_UNASSIGNED"
  | "VISIT_REQUESTED"
  | "LEAD_NO_FIRST_CONTACT"
  | "STALE_LEAD"
  | "REMINDER_TODAY"
  | "REMINDER_OVERDUE"
  | "VISIT_TODAY"
  | "VISIT_TOMORROW"
  | "OWNER_APPROVAL_PENDING"
  | "WEEKLY_SUMMARY"
  | "NEGOTIATION_REQUEST"
  | "COUNTEROFFER_REQUEST"
  | "PRICE_CLARIFICATION_NEEDED"
  | "ADDRESS_REQUEST"
  | "URGENT_CLIENT_REQUEST"
  | "RISK_OF_LOSS"
  | "TOTAL_COST_QUESTION"
  | "DOCS_AND_CONTRACT_QUESTION"
  | "FINANCING_QUESTION"
  | "RULES_AND_PERMISSIONS"
  | "CALLBACK_REQUEST"
  | "MORE_MEDIA_REQUEST"
  | "MATCHING_OPPORTUNITY"
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
  CLIENT_PENDING_REPLY: {
    category: "Leads",
    taskLabel: "Criar resposta",
    typeInstructions:
      "Este é um cliente institucional com inbound sem retorno registrado. Gere uma resposta curta, consultiva e objetiva.\n" +
      "- Confirme entendimento da necessidade\n" +
      "- Faça 1 a 3 perguntas de qualificação se necessário\n" +
      "- Sugira um próximo passo claro (ex.: enviar opções, alinhar visita, confirmar faixa ou prazo)\n" +
      "- Use o contexto do CRM e das preferências quando disponível",
  },
  CLIENT_NO_FIRST_CONTACT: {
    category: "Leads",
    taskLabel: "Fazer primeiro contato",
    typeInstructions:
      "O cliente entrou na carteira mas ainda não teve primeiro contato registrado. Gere uma primeira mensagem curta, acolhedora e profissional.\n" +
      "- Se apresente rapidamente\n" +
      "- Confirme a intenção principal (compra, locação ou captação)\n" +
      "- Sugira 2 próximos passos objetivos\n" +
      "- Pergunte disponibilidade ou prioridade atual",
  },
  CLIENT_OVERDUE_NEXT_ACTION: {
    category: "Lembretes",
    taskLabel: "Gerar checklist",
    typeInstructions:
      "Existe uma próxima ação vencida para este cliente. Gere um checklist curto de execução (3 a 6 passos) e, se fizer sentido, inclua um roteiro breve de contato.\n" +
      "- Não escreva como se fosse enviar uma mensagem automaticamente\n" +
      "- Use a anotação da próxima ação e o estágio do cliente\n" +
      "- Priorize destravar o atendimento hoje",
  },
  CLIENT_UNASSIGNED: {
    category: "Outros",
    taskLabel: "Definir responsável",
    typeInstructions:
      "Este cliente institucional está sem responsável. Gere um plano curto para a agência decidir a melhor distribuição e o primeiro próximo passo.\n" +
      "- Não escreva mensagem ao cliente\n" +
      "- Considere intenção, estágio e preferências\n" +
      "- Indique critérios práticos para escolher o responsável\n" +
      "- Feche com o próximo passo operacional no CRM",
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
  VISIT_REQUESTED: {
    category: "Visitas",
    taskLabel: "Responder sobre visita",
    typeInstructions:
      "O cliente pediu visita, mas ainda precisa de confirmação/combinação do corretor.\n" +
      "- Confirme que você viu a solicitação\n" +
      "- Pergunte 1 a 2 opções objetivas de dia/horário\n" +
      "- Combine como será o encontro (sem expor dados sensíveis)\n" +
      "- Seja prático e evite prometer disponibilidade sem checar",
  },
  NEGOTIATION_REQUEST: {
    category: "Leads",
    taskLabel: "Responder negociação",
    typeInstructions:
      "O cliente quer negociar preço/condições.\n" +
      "- Responda com educação, sem prometer desconto\n" +
      "- Peça detalhes da proposta (valor, forma de pagamento, prazo)\n" +
      "- Sugira próximo passo (ex.: formalizar proposta / agendar conversa)\n" +
      "- Evite parecer automático",
  },
  COUNTEROFFER_REQUEST: {
    category: "Leads",
    taskLabel: "Responder proposta",
    typeInstructions:
      "O cliente já indicou um valor.\n" +
      "- Agradeça e confirme o valor entendido\n" +
      "- Pergunte forma de pagamento e prazo\n" +
      "- Diga que você vai verificar e retorna com posicionamento\n" +
      "- Não feche negócio automaticamente",
  },
  PRICE_CLARIFICATION_NEEDED: {
    category: "Leads",
    taskLabel: "Esclarecer preço/condições",
    typeInstructions:
      "O cliente questionou preço/condições do anunciado (taxas, mobília, valores).\n" +
      "- Responda de forma objetiva\n" +
      "- Se algo não constar no anúncio, diga que precisa confirmar\n" +
      "- Faça 1 pergunta de alinhamento se necessário",
  },
  ADDRESS_REQUEST: {
    category: "Leads",
    taskLabel: "Responder localização",
    typeInstructions:
      "O cliente pediu endereço/localização.\n" +
      "- Não exponha endereço exato se não for política\n" +
      "- Sugira combinar ponto de encontro ou confirmar a região\n" +
      "- Ofereça agendar visita/ligação",
  },
  URGENT_CLIENT_REQUEST: {
    category: "Leads",
    taskLabel: "Responder com urgência",
    typeInstructions:
      "O cliente demonstra urgência.\n" +
      "- Responda curto e com prioridade\n" +
      "- Confirme disponibilidade do imóvel\n" +
      "- Sugira o próximo passo imediato (ex.: visita ou envio de documentos)",
  },
  RISK_OF_LOSS: {
    category: "Leads",
    taskLabel: "Reverter objeção",
    typeInstructions:
      "O cliente sinalizou desistência/insatisfação.\n" +
      "- Seja empático e direto\n" +
      "- Peça 1 informação para entender a objeção\n" +
      "- Ofereça alternativa (imóvel similar, visita, condição)\n" +
      "- Evite discussão",
  },
  TOTAL_COST_QUESTION: {
    category: "Leads",
    taskLabel: "Esclarecer custos",
    typeInstructions:
      "O cliente perguntou sobre custo total/taxas.\n" +
      "- Explique itens (aluguel, condomínio, IPTU, água/gás, seguro) se houver dados\n" +
      "- Se não houver, diga que vai confirmar e retornar\n" +
      "- Mantenha a resposta curta",
  },
  DOCS_AND_CONTRACT_QUESTION: {
    category: "Leads",
    taskLabel: "Esclarecer documentação",
    typeInstructions:
      "O cliente perguntou sobre documentação/contrato/garantias.\n" +
      "- Responda de forma cuidadosa\n" +
      "- Se for algo jurídico específico, diga que precisa confirmar\n" +
      "- Sugira o próximo passo",
  },
  FINANCING_QUESTION: {
    category: "Leads",
    taskLabel: "Responder financiamento",
    typeInstructions:
      "O cliente perguntou sobre financiamento.\n" +
      "- Confirme se o imóvel aceita financiamento (se souber)\n" +
      "- Pergunte faixa de entrada/renda\n" +
      "- Sugira simulação/visita",
  },
  RULES_AND_PERMISSIONS: {
    category: "Leads",
    taskLabel: "Responder regras",
    typeInstructions:
      "O cliente perguntou sobre regras (pet, reforma, mobília).\n" +
      "- Responda objetivo\n" +
      "- Se precisar confirmar com proprietário, diga e peça 1 detalhe",
  },
  CALLBACK_REQUEST: {
    category: "Leads",
    taskLabel: "Combinar retorno",
    typeInstructions:
      "O cliente pediu retorno (ligação/WhatsApp/horário).\n" +
      "- Sugira atender pelo chat e peça 1 janela de horário\n" +
      "- Seja rápido e prático",
  },
  MORE_MEDIA_REQUEST: {
    category: "Leads",
    taskLabel: "Enviar mídia",
    typeInstructions:
      "O cliente pediu mais fotos/vídeo/tour.\n" +
      "- Diga que vai enviar material disponível\n" +
      "- Pergunte o que ele quer ver (2-3 tópicos)\n" +
      "- Sugira visita se fizer sentido",
  },
  MATCHING_OPPORTUNITY: {
    category: "Leads",
    taskLabel: "Sugerir opções",
    typeInstructions:
      "O cliente deu preferências/budget.\n" +
      "- Confirme as preferências\n" +
      "- Ofereça 1-3 alternativas (se tiver) ou peça permissão para buscar\n" +
      "- Sugira próximo passo",
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
