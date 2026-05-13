/**
 * Detector simples de keywords usadas para sugestões automáticas de avanço de funil.
 * Trabalha em texto normalizado (lowercase, sem acentos) e procura por padrões fortes.
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PROPOSAL_KEYWORDS = [
  "proposta",
  "valor final",
  "contraproposta",
  "negociar valor",
  "ofereco",
  "qual o desconto",
  "consigo pagar",
  "estou disposto",
  "estou disposta",
];

const DOCUMENTS_KEYWORDS = [
  "contrato",
  "assinar",
  "documentacao",
  "documento",
  "rg cpf",
  "comprovante de renda",
  "envia o contrato",
  "preciso dos documentos",
  "vamos para o contrato",
];

const WON_KEYWORDS_BROKER = [
  "fechei",
  "fechamos",
  "vendi",
  "vendemos",
  "alugamos",
  "alugado",
  "assinaram",
  "negocio fechado",
  "contrato assinado",
];

export type AutoAdvanceSignal = "PROPOSAL" | "DOCUMENTS" | "WON";

function detectAny(text: string, list: string[]): boolean {
  const normalized = normalize(text);
  for (const k of list) {
    if (normalized.includes(k)) return true;
  }
  return false;
}

export function detectAutoAdvanceFromClientMessage(
  text: string,
  currentStage: string
): AutoAdvanceSignal | null {
  if (!text) return null;
  const stage = String(currentStage || "").toUpperCase();

  if (detectAny(text, DOCUMENTS_KEYWORDS)) {
    if (stage !== "DOCUMENTS" && stage !== "WON" && stage !== "LOST") {
      return "DOCUMENTS";
    }
  }
  if (detectAny(text, PROPOSAL_KEYWORDS)) {
    if (stage === "NEW" || stage === "CONTACT" || stage === "VISIT") {
      return "PROPOSAL";
    }
  }
  return null;
}

export function detectAutoAdvanceFromProfessionalMessage(
  text: string,
  currentStage: string
): AutoAdvanceSignal | null {
  if (!text) return null;
  const stage = String(currentStage || "").toUpperCase();

  if (detectAny(text, WON_KEYWORDS_BROKER)) {
    if (stage !== "WON" && stage !== "LOST") {
      return "WON";
    }
  }
  return null;
}
