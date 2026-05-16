/**
 * Quality validators for the public-profile wizard.
 *
 * Goal: protect realtors from publishing low-effort headlines/bios that hurt
 * their public profile. Each validator returns a structured result with
 * suggestions when possible.
 */

export type ValidationLevel = "ok" | "warn" | "block";

export type ValidationResult = {
  level: ValidationLevel;
  message: string | null;
  suggestions: string[];
};

// ---------------------------------------------------------------------------
// Headline blocklist
// ---------------------------------------------------------------------------

const BLOCKED_WORDS = [
  "tudo",
  "todos",
  "qualquer coisa",
  "qualquer imovel",
  "qualquer imóvel",
  "geral",
  "expert em tudo",
  "de tudo um pouco",
  "sou completo",
  "atendo de tudo",
] as const;

const BLOCKED_REGEX = [
  /especialista em (tudo|geral|todo tipo)/i,
  /faço de tudo/i,
  /todos os tipos/i,
];

const HEADLINE_SUGGESTIONS_GENERIC = [
  "Apartamentos compactos no Centro",
  "Casas em condomínio em Boa Viagem",
  "Investimento em loteamentos urbanos",
  "Aluguel residencial premium em Petrolina",
  "Lançamentos verticais em Juazeiro",
];

export function validateHeadline(value: string): ValidationResult {
  const text = value.trim();
  if (text.length === 0) {
    return {
      level: "block",
      message: "Escreva uma headline para o seu perfil.",
      suggestions: [],
    };
  }
  if (text.length < 12) {
    return {
      level: "block",
      message: "Use ao menos 12 caracteres para uma headline informativa.",
      suggestions: HEADLINE_SUGGESTIONS_GENERIC.slice(0, 3),
    };
  }
  if (text.length > 120) {
    return {
      level: "warn",
      message: "Tente manter a headline com até 120 caracteres.",
      suggestions: [],
    };
  }

  const normalized = text.toLowerCase();
  const matchedWord = BLOCKED_WORDS.find((word) => normalized.includes(word));
  if (matchedWord) {
    return {
      level: "block",
      message: `Evite usar "${matchedWord}" — soa genérico. Tente uma especialidade concreta.`,
      suggestions: HEADLINE_SUGGESTIONS_GENERIC.slice(0, 3),
    };
  }

  const matchedRegex = BLOCKED_REGEX.find((pattern) => pattern.test(text));
  if (matchedRegex) {
    return {
      level: "block",
      message: "Reescreva a headline com uma especialidade concreta (tipo de imóvel, bairro ou nicho).",
      suggestions: HEADLINE_SUGGESTIONS_GENERIC.slice(0, 3),
    };
  }

  return { level: "ok", message: null, suggestions: [] };
}

// ---------------------------------------------------------------------------
// Bio quality
// ---------------------------------------------------------------------------

export function countSentences(text: string): number {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  const matches = cleaned.match(/[^.!?]+[.!?]+/g);
  if (matches) return matches.length;
  return cleaned.length > 0 ? 1 : 0;
}

export function detectWordRepetition(text: string): { word: string; count: number } | null {
  const counts = new Map<string, number>();
  const tokens = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  let worst: { word: string; count: number } | null = null;
  for (const [word, count] of counts) {
    if (count >= 4 && (!worst || count > worst.count)) {
      worst = { word, count };
    }
  }
  return worst;
}

export function validateBio(value: string): ValidationResult {
  const text = value.trim();
  if (text.length === 0) {
    return {
      level: "block",
      message: "Adicione uma bio que conte quem você é e como trabalha.",
      suggestions: [],
    };
  }
  if (text.length < 80) {
    return {
      level: "block",
      message: `Sua bio tem ${text.length} caracteres. Use ao menos 80 para contar quem você é, o que faz e como atende.`,
      suggestions: [],
    };
  }
  if (text.length > 500) {
    return {
      level: "warn",
      message: "Tente resumir em até 500 caracteres para manter a leitura fluida.",
      suggestions: [],
    };
  }

  if (countSentences(text) < 2) {
    return {
      level: "warn",
      message: "Quebre a bio em pelo menos duas frases — fica mais escaneável.",
      suggestions: [],
    };
  }

  const repetition = detectWordRepetition(text);
  if (repetition) {
    return {
      level: "warn",
      message: `A palavra "${repetition.word}" aparece ${repetition.count} vezes. Considere variar o vocabulário.`,
      suggestions: [],
    };
  }

  const headlineCheck = validateHeadline(text);
  if (headlineCheck.level === "block") {
    return {
      level: "warn",
      message: "Sua bio contém palavras muito genéricas — tente ser mais específico.",
      suggestions: headlineCheck.suggestions,
    };
  }

  return { level: "ok", message: null, suggestions: [] };
}

// ---------------------------------------------------------------------------
// Score (0-100)
// ---------------------------------------------------------------------------

export function scoreBio(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  let score = 0;
  if (trimmed.length >= 80) score += 30;
  else score += Math.round((trimmed.length / 80) * 30);

  if (trimmed.length >= 150) score += 15;
  if (trimmed.length >= 280) score += 10;

  const sentences = countSentences(trimmed);
  if (sentences >= 2) score += 15;
  if (sentences >= 4) score += 10;

  const hasDigit = /\d/.test(trimmed);
  if (hasDigit) score += 10;

  const result = validateBio(trimmed);
  if (result.level === "ok") score += 10;

  return Math.max(0, Math.min(100, score));
}
