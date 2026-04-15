export type OfflineAssistantClientSlots = {
  purpose?: "COMPRA" | "LOCACAO" | null;
  hasPets?: boolean | null;
  parkingSpotsNeeded?: number | null;
  moveTime?: string | null;
  bedroomsNeeded?: number | null;
  budget?: string | null;
  searchRegion?: string | null;
  financingIntent?: "FINANCIAMENTO" | "FGTS" | "RECURSOS_PROPRIOS" | "INDEFINIDO" | null;
  urgencyLevel?: "ALTA" | "MEDIA" | "BAIXA" | null;
  decisionStage?: "PESQUISA" | "COMPARANDO" | "PRONTO_VISITAR" | "PRONTO_PROPOSTA" | null;
  familyProfile?: string | null;
  reasonForMove?: string | null;
  preferredContactWindow?: string | null;
  objections?: string[] | null;
};

function safeString(x: any) {
  return String(x ?? "").trim();
}

function normalizeTextForMatch(input: string) {
  const raw = String(input || "").toLowerCase();
  try {
    return raw.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  } catch {
    return raw;
  }
}

function clampText(input: string, maxLen: number) {
  const s = safeString(input);
  if (!s) return "";
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trim();
}

function toNumberOrNull(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((x) => safeString(x)).filter(Boolean)));
}

function extractBudgetRaw(t: string) {
  const raw = t;
  const m1 = raw.match(/\b(ate|até)\s+r?\$?\s*([0-9\.\,]+)\s*(mil|milhao|milhoes|k)?\b/);
  if (m1) return safeString(m1[0]);
  const m2 = raw.match(/\br?\$\s*([0-9\.\,]+)\s*(mil|milhao|milhoes|k)?\b/);
  if (m2) return safeString(m2[0]);
  return "";
}

function extractSearchRegion(t: string) {
  const patterns = [
    /\b(?:bairro|regiao|região|zona|localidade|proximo|próximo)\s+(?:do|da|de)?\s*([a-z0-9\s\-]{3,40})\b/,
    /\b(?:na\s+regiao|na\s+região|na\s+zona|no\s+bairro)\s+(?:do|da|de)?\s*([a-z0-9\s\-]{3,40})\b/,
  ];
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match?.[1]) return safeString(match[1]).replace(/\s{2,}/g, " ");
  }
  return "";
}

function extractFamilyProfile(t: string) {
  const patterns = [
    /\b(casal(?:\s+com\s+filhos?)?|familia\s+com\s+filhos?|moro\s+sozinh[oa]|sou\s+sozinh[oa]|tenho\s+filh[oa]s?|idosos?)\b/,
  ];
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match?.[1]) return safeString(match[1]);
  }
  return "";
}

function extractReasonForMove(t: string) {
  const patterns = [
    /\b(trabalho|investimento|casamento|divorcio|divórcio|faculdade|filhos?|sair\s+do\s+aluguel|mudanca\s+de\s+cidade|mudança\s+de\s+cidade|novo\s+emprego)\b/,
  ];
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match?.[1]) return safeString(match[1]);
  }
  return "";
}

function detectDecisionStage(t: string): OfflineAssistantClientSlots["decisionStage"] {
  if (/\b(proposta|oferta|fechar\s+negocio|fechar\s+negócio|vamos\s+fechar|tenho\s+interesse\s+em\s+fechar)\b/.test(t)) return "PRONTO_PROPOSTA";
  if (/\b(visita|visitar|agendar|marcar|conhecer\s+o\s+imovel|conhecer\s+o\s+imóvel)\b/.test(t)) return "PRONTO_VISITAR";
  if (/\b(comparando|comparar|avaliando\s+opcoes|avaliando\s+opções|vendo\s+outras\s+opcoes|vendo\s+outras\s+opções)\b/.test(t)) return "COMPARANDO";
  if (/\b(pesquisando|olhando|dando\s+uma\s+olhada|só\s+pesquisando|só\s+olhando|ainda\s+estou\s+vendo)\b/.test(t)) return "PESQUISA";
  return null;
}

function detectFinancingIntent(t: string): OfflineAssistantClientSlots["financingIntent"] {
  if (/\b(fgts)\b/.test(t)) return "FGTS";
  if (/\b(a\s+vista|à\s+vista|recurso\s+proprio|recurso\s+próprio|dinheiro\s+proprio|dinheiro\s+próprio)\b/.test(t)) return "RECURSOS_PROPRIOS";
  if (/\b(financi|parcel|credito\s+imobiliario|crédito\s+imobiliário|banco)\b/.test(t)) return "FINANCIAMENTO";
  if (/\b(ainda\s+nao\s+sei|ainda\s+não\s+sei|nao\s+decidi|não\s+decidi)\b/.test(t)) return "INDEFINIDO";
  return null;
}

function detectUrgencyLevel(t: string, moveTime: string | null): OfflineAssistantClientSlots["urgencyLevel"] {
  if (/\b(urgente|urgencia|urgência|imediat[oa]|o\s+quanto\s+antes|essa\s+semana|nos\s+proximos\s+dias|nos\s+próximos\s+dias)\b/.test(t)) return "ALTA";
  if (moveTime && /\b(dia|dias|semana|semanas|mes|meses)\b/.test(moveTime)) return "MEDIA";
  if (/\b(sem\s+pressa|com\s+calma|sem\s+urgencia|sem\s+urgência)\b/.test(t)) return "BAIXA";
  return null;
}

function extractPreferredContactWindow(t: string) {
  const match = t.match(/\b(manha|manhã|tarde|noite|apos\s+as\s+\d{1,2}h?|após\s+as\s+\d{1,2}h?|depois\s+das\s+\d{1,2}h?)\b/);
  return match?.[0] ? safeString(match[0]) : "";
}

function extractObjections(t: string) {
  const objections: string[] = [];
  if (/\b(caro|cara|apertado\s+no\s+orcamento|apertado\s+no\s+orçamento|fora\s+do\s+orcamento|fora\s+do\s+orçamento)\b/.test(t)) objections.push("preço");
  if (/\b(localizacao|localização|bairro|distante|longe)\b/.test(t)) objections.push("localização");
  if (/\b(condominio|condomínio|iptu)\b/.test(t)) objections.push("custos adicionais");
  if (/\b(vaga|garagem)\b/.test(t) && /\b(sem|pouca|insuficiente)\b/.test(t)) objections.push("vaga");
  if (/\b(quarto|quartos|pequeno|metragem|area|área)\b/.test(t) && /\b(pouco|menor|apertado|insuficiente)\b/.test(t)) objections.push("espaço");
  return uniqueStrings(objections);
}

export function extractOfflineAssistantClientSlots(message: string): OfflineAssistantClientSlots {
  const raw = safeString(message);
  const t = normalizeTextForMatch(raw);
  if (!t) return {};

  let purpose: OfflineAssistantClientSlots["purpose"] = null;
  const mentionsBuy = /\b(comprar|compra|comprando)\b/.test(t);
  const mentionsRent = /\b(alugar|aluguel|locar|locacao|locação)\b/.test(t);
  if (mentionsBuy && !mentionsRent) purpose = "COMPRA";
  if (mentionsRent && !mentionsBuy) purpose = "LOCACAO";

  let hasPets: boolean | null = null;
  const negPets = /\b(n[aã]o|nao)\s+(tenho|temos|possuo)\s+(pet|pets|cachorro|cachorros|gato|gatos)\b/.test(t);
  if (negPets) hasPets = false;
  const posPets = /\b(tenho|temos|possuo)\s+([a-z0-9]+\s+)?(pet|pets|cachorro|cachorros|gato|gatos)\b/.test(t);
  if (posPets && hasPets === null) hasPets = true;

  let parkingSpotsNeeded: number | null = null;
  const negParking = /\b(n[aã]o|nao)\s+(preciso|quero)\s+de\s+(vaga|garagem)\b/.test(t);
  if (negParking) parkingSpotsNeeded = 0;
  const mParking = t.match(/\b(\d+)\s+vagas?\b/) || t.match(/\b(\d+)\s+garagens?\b/);
  if (mParking) parkingSpotsNeeded = toNumberOrNull(mParking[1]);
  if (parkingSpotsNeeded == null && /\bpreciso\s+de\s+vaga\b/.test(t)) parkingSpotsNeeded = 1;

  let bedroomsNeeded: number | null = null;
  const mBeds = t.match(/\b(\d+)\s+quartos?\b/);
  if (mBeds) bedroomsNeeded = toNumberOrNull(mBeds[1]);

  let moveTime: string | null = null;
  const mMove = t.match(/\b(urgente|imediat[oa]|o\s+quanto\s+antes|daqui\s+a\s+\d+\s+(dia|dias|semana|semanas|mes|meses)|para\s+\w+\s*\d{0,2})\b/);
  if (mMove) moveTime = clampText(safeString(mMove[0]), 60);

  let budget: string | null = null;
  const b = extractBudgetRaw(t);
  if (b) budget = clampText(b, 60);

  const searchRegion = clampText(extractSearchRegion(t), 60) || null;
  const financingIntent = detectFinancingIntent(t);
  const decisionStage = detectDecisionStage(t);
  const urgencyLevel = detectUrgencyLevel(t, moveTime);
  const familyProfile = clampText(extractFamilyProfile(t), 60) || null;
  const reasonForMove = clampText(extractReasonForMove(t), 60) || null;
  const preferredContactWindow = clampText(extractPreferredContactWindow(t), 40) || null;
  const objections = extractObjections(t);

  const out: OfflineAssistantClientSlots = {};
  if (purpose) out.purpose = purpose;
  if (hasPets !== null) out.hasPets = hasPets;
  if (parkingSpotsNeeded !== null) out.parkingSpotsNeeded = parkingSpotsNeeded;
  if (bedroomsNeeded !== null) out.bedroomsNeeded = bedroomsNeeded;
  if (moveTime) out.moveTime = moveTime;
  if (budget) out.budget = budget;
  if (searchRegion) out.searchRegion = searchRegion;
  if (financingIntent) out.financingIntent = financingIntent;
  if (urgencyLevel) out.urgencyLevel = urgencyLevel;
  if (decisionStage) out.decisionStage = decisionStage;
  if (familyProfile) out.familyProfile = familyProfile;
  if (reasonForMove) out.reasonForMove = reasonForMove;
  if (preferredContactWindow) out.preferredContactWindow = preferredContactWindow;
  if (objections.length) out.objections = objections;
  return out;
}

export function mergeOfflineAssistantClientSlots(
  prev: OfflineAssistantClientSlots | undefined,
  next: OfflineAssistantClientSlots | undefined
): OfflineAssistantClientSlots | undefined {
  const p = prev && typeof prev === "object" ? prev : null;
  const n = next && typeof next === "object" ? next : null;
  if (!p && !n) return undefined;

  const merged: OfflineAssistantClientSlots = {
    purpose: (n?.purpose ?? null) || (p?.purpose ?? null) || null,
    hasPets: typeof n?.hasPets === "boolean" ? n.hasPets : typeof p?.hasPets === "boolean" ? p.hasPets : null,
    parkingSpotsNeeded:
      typeof n?.parkingSpotsNeeded === "number"
        ? n.parkingSpotsNeeded
        : typeof p?.parkingSpotsNeeded === "number"
          ? p.parkingSpotsNeeded
          : null,
    moveTime: safeString(n?.moveTime) || safeString(p?.moveTime) || null,
    bedroomsNeeded:
      typeof n?.bedroomsNeeded === "number" ? n.bedroomsNeeded : typeof p?.bedroomsNeeded === "number" ? p.bedroomsNeeded : null,
    budget: safeString(n?.budget) || safeString(p?.budget) || null,
    searchRegion: safeString(n?.searchRegion) || safeString(p?.searchRegion) || null,
    financingIntent: (n?.financingIntent ?? null) || (p?.financingIntent ?? null) || null,
    urgencyLevel: (n?.urgencyLevel ?? null) || (p?.urgencyLevel ?? null) || null,
    decisionStage: (n?.decisionStage ?? null) || (p?.decisionStage ?? null) || null,
    familyProfile: safeString(n?.familyProfile) || safeString(p?.familyProfile) || null,
    reasonForMove: safeString(n?.reasonForMove) || safeString(p?.reasonForMove) || null,
    preferredContactWindow: safeString(n?.preferredContactWindow) || safeString(p?.preferredContactWindow) || null,
    objections: uniqueStrings([...(p?.objections || []), ...(n?.objections || [])]),
  };

  const hasAny =
    Boolean(merged.purpose) ||
    typeof merged.hasPets === "boolean" ||
    typeof merged.parkingSpotsNeeded === "number" ||
    Boolean(merged.moveTime) ||
    typeof merged.bedroomsNeeded === "number" ||
    Boolean(merged.budget) ||
    Boolean(merged.searchRegion) ||
    Boolean(merged.financingIntent) ||
    Boolean(merged.urgencyLevel) ||
    Boolean(merged.decisionStage) ||
    Boolean(merged.familyProfile) ||
    Boolean(merged.reasonForMove) ||
    Boolean(merged.preferredContactWindow) ||
    Boolean(merged.objections?.length);

  return hasAny ? merged : undefined;
}

export function formatOfflineAssistantClientSlots(slots: OfflineAssistantClientSlots | undefined) {
  const s = slots && typeof slots === "object" ? slots : null;
  if (!s) return "";
  const parts: string[] = [];
  if (s.purpose === "COMPRA") parts.push("compra");
  if (s.purpose === "LOCACAO") parts.push("locação");
  if (typeof s.hasPets === "boolean") parts.push(s.hasPets ? "tem pets" : "não tem pets");
  if (typeof s.parkingSpotsNeeded === "number") parts.push(`vaga(s): ${s.parkingSpotsNeeded}`);
  if (typeof s.bedroomsNeeded === "number") parts.push(`quartos: ${s.bedroomsNeeded}`);
  if (safeString(s.moveTime)) parts.push(`prazo: ${safeString(s.moveTime)}`);
  if (safeString(s.budget)) parts.push(`orçamento: ${safeString(s.budget)}`);
  if (safeString(s.searchRegion)) parts.push(`região: ${safeString(s.searchRegion)}`);
  if (safeString(s.financingIntent)) parts.push(`pagamento: ${safeString(s.financingIntent).toLowerCase()}`);
  if (safeString(s.urgencyLevel)) parts.push(`urgência: ${safeString(s.urgencyLevel).toLowerCase()}`);
  if (safeString(s.decisionStage)) parts.push(`estágio: ${safeString(s.decisionStage).toLowerCase()}`);
  if (safeString(s.familyProfile)) parts.push(`perfil: ${safeString(s.familyProfile)}`);
  if (safeString(s.reasonForMove)) parts.push(`motivo: ${safeString(s.reasonForMove)}`);
  if (safeString(s.preferredContactWindow)) parts.push(`janela: ${safeString(s.preferredContactWindow)}`);
  if (Array.isArray(s.objections) && s.objections.length) parts.push(`objeções: ${s.objections.join(", ")}`);
  return parts.filter(Boolean).join(" | ");
}
