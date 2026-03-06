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

export function applyOfflineAutoReplyGuardrails(input: { draft: string; clientName: string; propertyTitle: string }) {
  const draft = sanitizeDraft(input.draft, { maxLen: 800 });
  if (!draft) return "";

  const hardForbidden = /(\b(vou|vamos)\s+(agendar|marcar|confirmar)\b|\b(agendado|confirmado)\b|\bvisita\s+(agendada|confirmada)\b)/i;
  if (hardForbidden.test(draft)) {
    const greet = input.clientName ? `Olá ${input.clientName}, tudo bem?` : "Olá, tudo bem?";
    const about = input.propertyTitle ? `Sobre o imóvel ${input.propertyTitle}, ` : "Sobre o imóvel, ";
    const looksLikeScheduling = /(agend|agenda|hor[aá]rio|visita|marcar|disponibil|\b\d{1,2}:\d{2}\b|\b\d{1,2}h\b)/i.test(draft);
    const fallback = looksLikeScheduling
      ? `${greet}\n\n` +
        `${about}perfeito — posso registrar seu pedido de visita e enviar ao corretor.\n\n` +
        `Pra eu enviar já com as informações certinhas: qual período do dia você prefere (manhã/tarde/noite) e quais dias da semana costuma ser melhor?\n\n` +
        `O corretor vai confirmar o agendamento com você assim que possível.`
      : `${greet}\n\n` +
        `${about}perfeito — eu posso registrar sua solicitação para o corretor, que confirma com você assim que possível.`;

    return enforcePositiveOpening(sanitizeDraft(fallback, { maxLen: 800 }));
  }

  const schedulingMention = /(agend|agenda|hor[aá]rio|visita|marcar|confirm|disponibil)/i;
  if (!schedulingMention.test(draft)) return enforcePositiveOpening(draft);

  const timeOrDay =
    /(\b\d{1,2}:\d{2}\b|\b\d{1,2}h\b|\bamanh[ãa]\b|\bhoje\b|\bs[áa]bado\b|\bdomingo\b|\bsegunda\b|\bter[cç]a\b|\bquarta\b|\bquinta\b|\bsexta\b)/i;
  if (!timeOrDay.test(draft)) return enforcePositiveOpening(draft);

  const greet = input.clientName ? `Olá ${input.clientName}, tudo bem?` : "Olá, tudo bem?";
  const about = input.propertyTitle ? `Sobre o imóvel ${input.propertyTitle}, ` : "Sobre o imóvel, ";
  const fallback =
    `${greet}\n\n` +
    `${about}perfeito — posso registrar seu pedido de visita e enviar ao corretor.\n\n` +
    `Pra eu enviar já com as informações certinhas: qual período do dia você prefere (manhã/tarde/noite) e quais dias da semana costuma ser melhor?\n\n` +
    `O corretor vai confirmar o agendamento com você assim que possível.`;

  return enforcePositiveOpening(sanitizeDraft(fallback, { maxLen: 800 }));
}
