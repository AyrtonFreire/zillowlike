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

export function applyOfflineAutoReplyGuardrails(input: { draft: string; clientName: string; propertyTitle: string }) {
  const draft = sanitizeDraft(input.draft, { maxLen: 800 });
  if (!draft) return "";

  const forbidden = /(agend|agenda|hor[aá]rio|visita|marcar|confirm|disponibil|amanh|hoje|sábado|domingo)/i;
  if (!forbidden.test(draft)) return draft;

  const greet = input.clientName ? `Olá ${input.clientName}, tudo bem?` : "Olá, tudo bem?";
  const about = input.propertyTitle ? `Sobre o imóvel ${input.propertyTitle}, ` : "Sobre o imóvel, ";
  const fallback =
    `${greet}\n\n` +
    `${about}posso te ajudar com informações básicas por aqui. ` +
    `Você busca compra ou locação e qual faixa de valor/região?\n\n` +
    `O corretor retorna no próximo horário comercial.`;

  return sanitizeDraft(fallback, { maxLen: 800 });
}
