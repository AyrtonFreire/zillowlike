export function clampText(value: string, max: number) {
  const s = String(value || "");
  if (s.length <= max) return s;
  return s.slice(0, max).trimEnd();
}

export function stripUrls(text: string) {
  return String(text || "").replace(/https?:\/\/\S+|www\.[^\s]+/gi, "");
}

export function stripPhones(text: string) {
  return String(text || "").replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[\s-]?\d{4}/g, "");
}

export function stripEmojis(text: string) {
  try {
    return String(text || "").replace(/[\p{Extended_Pictographic}]/gu, "");
  } catch {
    return String(text || "");
  }
}

export function normalizeWhitespace(text: string) {
  return String(text || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function fixCommonPlaceholders(text: string, params?: { realtorName?: string | null }) {
  let out = String(text || "");
  const realtorName = String(params?.realtorName || "").trim();

  const placeholderRegexes: RegExp[] = [
    /\[(?:seu|sua)\s+nome\]/gi,
    /\{(?:seu|sua)\s+nome\}/gi,
    /<(?:seu|sua)\s+nome>/gi,
    /\[(?:nome\s+do\s+corretor|nome\s+do\s+atendente|nome)\]/gi,
    /\{(?:nome\s+do\s+corretor|nome\s+do\s+atendente|nome)\}/gi,
    /<(?:nome\s+do\s+corretor|nome\s+do\s+atendente|nome)>/gi,
  ];

  if (realtorName) {
    for (const rx of placeholderRegexes) {
      out = out.replace(rx, realtorName);
    }
    out = out.replace(/\[Seu\s+Nome\]/gi, realtorName);
    out = out.replace(/\{Seu\s+Nome\}/gi, realtorName);
    out = out.replace(/<Seu\s+Nome>/gi, realtorName);
  } else {
    for (const rx of placeholderRegexes) {
      out = out.replace(rx, "");
    }
    out = out.replace(/\[Seu\s+Nome\]/gi, "");
    out = out.replace(/\{Seu\s+Nome\}/gi, "");
    out = out.replace(/<Seu\s+Nome>/gi, "");
  }

  return normalizeWhitespace(out);
}

export function sanitizeDraft(raw: string, params?: { realtorName?: string | null; maxLen?: number }) {
  const maxLen = typeof params?.maxLen === "number" ? params.maxLen : 1200;
  const base = String(raw || "");
  const cleaned = normalizeWhitespace(stripEmojis(stripPhones(stripUrls(base))));
  const limited = clampText(fixCommonPlaceholders(cleaned, { realtorName: params?.realtorName ?? null }), maxLen);
  if (limited.length >= 5) return limited;
  const fallback = clampText(
    fixCommonPlaceholders(normalizeWhitespace(stripEmojis(base)), { realtorName: params?.realtorName ?? null }),
    maxLen
  );
  return fallback.length >= 5 ? fallback : clampText(base.trim(), maxLen);
}

export function sanitizeSummary(raw: string, maxLen = 240) {
  const base = String(raw || "");
  const cleaned = normalizeWhitespace(stripEmojis(stripPhones(stripUrls(base))));
  const limited = clampText(cleaned, maxLen);
  if (limited.length >= 10) return limited;
  const fallback = clampText(normalizeWhitespace(stripEmojis(base)), maxLen);
  return fallback.length >= 10 ? fallback : clampText(base.trim(), maxLen);
}

export function sanitizeReason(raw: string, maxLen = 140) {
  const base = String(raw || "");
  const cleaned = normalizeWhitespace(stripEmojis(stripPhones(stripUrls(base))));
  const limited = clampText(cleaned, maxLen);
  if (limited.length >= 3) return limited;
  const fallback = clampText(normalizeWhitespace(stripEmojis(base)), maxLen);
  return fallback.length >= 3 ? fallback : clampText(base.trim(), maxLen);
}

export function enforcePositiveOpening(raw: string) {
  const s = normalizeWhitespace(String(raw || ""));
  if (!s) return "";
  const trimmed = s.trimStart();
  const head = trimmed.slice(0, 60).toLowerCase();
  const negativeStart = /^(eu\s+)?(nao|não)\s+(consigo|posso|tenho|vou)|^infelizmente\b|^no\s+momento\s+(nao|não)\b/;
  if (!negativeStart.test(head)) return s;
  return `Entendi. ${trimmed}`;
}

type OfflineAutoReplyGuardrailScenario = "SCHEDULING" | "NEGOTIATION" | "FINANCING" | "DOCUMENTATION" | "LOCATION_DETAILS" | "AVAILABILITY";

function buildGuardrailGreeting(clientName: string) {
  return clientName ? `Olá ${clientName}, tudo bem?` : "Olá, tudo bem?";
}

function buildGuardrailAbout(propertyTitle: string) {
  return propertyTitle ? `Sobre o imóvel ${propertyTitle}, ` : "Sobre o imóvel, ";
}

function normalizeLoose(text: string) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectGuardrailScenario(input: {
  draft: string;
  message?: string;
  handoffReason?: string | null;
}) : OfflineAutoReplyGuardrailScenario | null {
  const combined = normalizeLoose(`${input.draft}\n${input.message || ""}\n${input.handoffReason || ""}`);
  const handoffReason = normalizeLoose(input.handoffReason || "");
  const has = (rx: RegExp) => rx.test(combined);

  if (handoffReason.includes("scheduling") || has(/agend|agenda|visita|marcar|horario|disponibil/)) return "SCHEDULING";
  if (handoffReason.includes("negotiation") || has(/proposta|desconto|melhor preco|aceita menos|negoci|permuta|comissao/)) return "NEGOTIATION";
  if (handoffReason.includes("financing") || has(/financi|fgts|parcela|entrada|credito|aprovacao|banco/)) return "FINANCING";
  if (handoffReason.includes("documentation") || has(/document|cartorio|escritura|contrato|garantia|fiador|caucao/)) return "DOCUMENTATION";
  if (handoffReason.includes("location_details") || has(/endereco|rua|numero|localizacao exata|maps|mapa|referencia exata/)) return "LOCATION_DETAILS";
  if (has(/ainda (esta|ta) disponivel|continua disponivel|ja vendeu|ja alugou|esta disponivel|segue disponivel/)) return "AVAILABILITY";
  return null;
}

function buildScenarioFallback(input: {
  scenario: OfflineAutoReplyGuardrailScenario;
  clientName: string;
  propertyTitle: string;
}) {
  const greet = buildGuardrailGreeting(input.clientName);
  const about = buildGuardrailAbout(input.propertyTitle);

  if (input.scenario === "SCHEDULING") {
    return `${greet}\n\n${about}perfeito — posso registrar seu pedido de visita e enviar ao corretor.\n\nPra eu enviar já com as informações certinhas: qual período do dia você prefere (manhã/tarde/noite) e quais dias da semana costuma ser melhor?\n\nO corretor vai confirmar o agendamento com você assim que possível.`;
  }

  if (input.scenario === "NEGOTIATION") {
    return `${greet}\n\n${about}entendi seu interesse comercial. Eu posso registrar sua proposta ou condição desejada para o corretor analisar e seguir com você diretamente.`;
  }

  if (input.scenario === "FINANCING") {
    return `${greet}\n\n${about}esse ponto de financiamento/FGTS precisa de validação do corretor conforme o seu cenário. Se você quiser, eu posso registrar essa frente para ele seguir com você.`;
  }

  if (input.scenario === "DOCUMENTATION") {
    return `${greet}\n\n${about}esse detalhe documental ou de garantias precisa de confirmação do corretor. Se fizer sentido, eu posso deixar sua solicitação registrada para ele te responder com precisão.`;
  }

  if (input.scenario === "LOCATION_DETAILS") {
    return `${greet}\n\n${about}os detalhes sensíveis de localização precisam ser confirmados pelo corretor. Posso registrar sua dúvida para ele continuar com você nesse ponto.`;
  }

  return `${greet}\n\n${about}a disponibilidade precisa ser confirmada pelo corretor antes de qualquer avanço. Se você quiser, eu posso registrar seu interesse para ele validar e seguir com você.`;
}

export function applyOfflineAutoReplyGuardrailsDetailed(input: { draft: string; clientName: string; propertyTitle: string; message?: string; handoffReason?: string | null }) {
  const draft = sanitizeDraft(input.draft, { maxLen: 800 });
  if (!draft) return { draft: "", appliedRules: [] as string[], scenario: null as OfflineAutoReplyGuardrailScenario | null };

  const appliedRules: string[] = [];
  const scenario = detectGuardrailScenario(input);

  const hardForbidden = /(\b(vou|vamos)\s+(agendar|marcar|confirmar)\b|\b(agendado|confirmado)\b|\bvisita\s+(agendada|confirmada)\b)/i;
  if (hardForbidden.test(draft)) {
    appliedRules.push("BLOCK_COMMITMENT");
    const looksLikeScheduling = /(agend|agenda|hor[aá]rio|visita|marcar|disponibil|\b\d{1,2}:\d{2}\b|\b\d{1,2}h\b)/i.test(draft);
    const fallback = looksLikeScheduling
      ? buildScenarioFallback({ scenario: "SCHEDULING", clientName: input.clientName, propertyTitle: input.propertyTitle })
      : `${buildGuardrailGreeting(input.clientName)}\n\n${buildGuardrailAbout(input.propertyTitle)}perfeito — eu posso registrar sua solicitação para o corretor, que confirma com você assim que possível.`;

    return {
      draft: enforcePositiveOpening(sanitizeDraft(fallback, { maxLen: 800 })),
      appliedRules,
      scenario: looksLikeScheduling ? "SCHEDULING" : scenario,
    };
  }

  if (scenario && scenario !== "SCHEDULING") {
    appliedRules.push(`SCENARIO_${scenario}`);
    return {
      draft: enforcePositiveOpening(sanitizeDraft(buildScenarioFallback({ scenario, clientName: input.clientName, propertyTitle: input.propertyTitle }), { maxLen: 800 })),
      appliedRules,
      scenario,
    };
  }

  const schedulingMention = /(agend|agenda|hor[aá]rio|visita|marcar|confirm|disponibil)/i;
  if (!schedulingMention.test(draft)) {
    const promiseTime = /\bem\s+\d+\s*(min|mins|minutos|h|hora|horas)\b/i;
    if (promiseTime.test(draft)) {
      appliedRules.push("REMOVE_PROMISED_TIME");
      const fallback = `${buildGuardrailGreeting(input.clientName)}\n\n${buildGuardrailAbout(input.propertyTitle)}posso registrar sua solicitação para o corretor seguir com você assim que possível.`;
      return {
        draft: enforcePositiveOpening(sanitizeDraft(fallback, { maxLen: 800 })),
        appliedRules,
        scenario,
      };
    }
    return { draft: enforcePositiveOpening(draft), appliedRules, scenario };
  }

  const timeOrDay =
    /(\b\d{1,2}:\d{2}\b|\b\d{1,2}h\b|\bamanh[ãa]\b|\bhoje\b|\bs[áa]bado\b|\bdomingo\b|\bsegunda\b|\bter[cç]a\b|\bquarta\b|\bquinta\b|\bsexta\b)/i;
  if (!timeOrDay.test(draft)) return { draft: enforcePositiveOpening(draft), appliedRules, scenario };

  appliedRules.push("BLOCK_SPECIFIC_SCHEDULING");
  const fallback = buildScenarioFallback({ scenario: "SCHEDULING", clientName: input.clientName, propertyTitle: input.propertyTitle });

  return {
    draft: enforcePositiveOpening(sanitizeDraft(fallback, { maxLen: 800 })),
    appliedRules,
    scenario: "SCHEDULING",
  };
}

export function applyOfflineAutoReplyGuardrails(input: { draft: string; clientName: string; propertyTitle: string; message?: string; handoffReason?: string | null }) {
  return applyOfflineAutoReplyGuardrailsDetailed(input).draft;
}
