import type { OfflineAssistantClientSlots } from "@/lib/offline-assistant-slots";

export type OfflineAssistantConversationMode = "INFO_MODE" | "QUALIFICATION_MODE" | "CONVERSION_MODE" | "HANDOFF_MODE";
export type OfflineAssistantLeadTemperature = "COLD" | "WARM" | "HOT";
export type OfflineAssistantResponsePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type OfflineAssistantRecommendedAction =
  | "ASK_QUALIFYING_QUESTION"
  | "SEND_PROPERTY_DETAILS"
  | "PRIORITIZE_HUMAN_CONTACT"
  | "PRIORITIZE_VISIT_CONFIRMATION"
  | "SEND_FINANCING_CONTEXT"
  | "REGISTER_AND_HANDOFF"
  | "NURTURE_AND_WAIT";
export type OfflineAssistantHandoffReason =
  | "SCHEDULING"
  | "NEGOTIATION"
  | "FINANCING"
  | "DOCUMENTATION"
  | "LOCATION_DETAILS"
  | "QUALIFICATION_COMPLETE"
  | "OFF_TOPIC"
  | "PROPERTY_LIMITATION"
  | "OTHER";
export type OfflineAssistantPipelineRecommendation = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS";
export type OfflineAssistantIntent = "PROPERTY" | "SCHEDULING" | "FINANCING" | "OFF_TOPIC" | "UNCLEAR";

export type OfflineAssistantVisitPreferences = {
  period?: string | null;
  days?: string[] | null;
  time?: string | null;
};

export type OfflineAssistantQualification = {
  score: number;
  intentScore: number;
  readinessScore: number;
  fitScore: number;
  dataCompleteness: number;
  leadTemperature: OfflineAssistantLeadTemperature;
  responsePriority: OfflineAssistantResponsePriority;
  recommendedAction: OfflineAssistantRecommendedAction;
  recommendedPipelineStage: OfflineAssistantPipelineRecommendation;
  scoreReasons: string[];
  missingCriticalInfo: string[];
  commercialSummary: string;
};

export type OfflineAssistantHandoffDecision = {
  needed: boolean;
  reason: OfflineAssistantHandoffReason | null;
  priority: OfflineAssistantResponsePriority;
  summary: string;
  recommendedAction: OfflineAssistantRecommendedAction;
};

export type OfflineAssistantPolicyDecision = {
  conversationMode: OfflineAssistantConversationMode;
  nextQuestion: string;
  shouldAskFollowUp: boolean;
  recommendedAction: OfflineAssistantRecommendedAction;
};

export type OfflineAssistantPropertyContextSignals = {
  propertySummary: string;
  regionSummary: string;
  fitHighlights: string[];
  attentionFlags: string[];
};

export type OfflineAssistantOperationalPlaybook = {
  headline: string;
  whyNow: string;
  pipelineStage: OfflineAssistantPipelineRecommendation;
  actionChecklist: string[];
  followUpDraft: string;
};

function safeString(x: any) {
  return String(x ?? "").trim();
}

function capitalize(input: string) {
  const s = safeString(input);
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function parseBudgetToNumber(raw: string | null | undefined) {
  const source = safeString(raw).toLowerCase();
  if (!source) return null;

  const normalized = source.replace(/r\$/g, "").replace(/\s+/g, " ");
  const match = normalized.match(/([0-9\.\,]+)\s*(milhoes|milhao|mil|k)?/i);
  if (!match) return null;

  let value = Number(String(match[1] || "").replace(/\./g, "").replace(/,/g, "."));
  if (!Number.isFinite(value)) return null;

  const suffix = safeString(match[2]).toLowerCase();
  if (suffix === "k" || suffix === "mil") value *= 1000;
  if (suffix === "milhao" || suffix === "milhoes") value *= 1_000_000;

  if (value > 0 && value < 1000 && !suffix) value *= 1000;
  return Math.round(value);
}

function normalizeTextForMatch(input: string) {
  const raw = String(input || "").toLowerCase();
  try {
    return raw.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  } catch {
    return raw;
  }
}

function includesAny(text: string, patterns: Array<string | RegExp>) {
  for (const pattern of patterns) {
    if (typeof pattern === "string") {
      if (text.includes(pattern)) return true;
      continue;
    }
    if (pattern.test(text)) return true;
  }
  return false;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((x) => safeString(x)).filter(Boolean)));
}

function listToSentence(values: string[]) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} e ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} e ${values[values.length - 1]}`;
}

function scoreToTemperature(score: number): OfflineAssistantLeadTemperature {
  if (score >= 75) return "HOT";
  if (score >= 45) return "WARM";
  return "COLD";
}

function normalizeScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeDataCompleteness(slots: OfflineAssistantClientSlots | undefined, visitRequested: boolean, visitPreferences?: OfflineAssistantVisitPreferences | null) {
  const checks = [
    Boolean(slots?.purpose),
    Boolean(safeString(slots?.budget)),
    Boolean(safeString(slots?.moveTime)),
    Boolean(safeString(slots?.searchRegion)),
    Boolean(slots?.decisionStage),
    Boolean(slots?.financingIntent),
    Boolean(slots?.urgencyLevel),
    typeof slots?.bedroomsNeeded === "number",
    typeof slots?.parkingSpotsNeeded === "number",
    typeof slots?.hasPets === "boolean",
    visitRequested ? Boolean(visitPreferences?.period || visitPreferences?.time || (visitPreferences?.days || []).length) : true,
  ];

  return normalizeScore((checks.filter(Boolean).length / checks.length) * 100);
}

function computeFitScore(params: {
  slots?: OfflineAssistantClientSlots;
  property?: {
    purpose?: string | null;
    price?: number | null;
    bedrooms?: number | null;
    parkingSpots?: number | null;
    petFriendly?: boolean | null;
    neighborhood?: string | null;
    city?: string | null;
  };
}) {
  const { slots, property } = params;
  if (!slots || !property) return { score: 40, reasons: [] as string[] };

  let score = 40;
  const reasons: string[] = [];

  const propertyPurpose = normalizeTextForMatch(safeString(property.purpose));
  const slotPurpose = normalizeTextForMatch(safeString(slots.purpose));
  if (slotPurpose && propertyPurpose) {
    if ((slotPurpose === "compra" && includesAny(propertyPurpose, ["venda", "sale", "compra"])) || (slotPurpose === "locacao" && includesAny(propertyPurpose, ["rent", "loca", "alug"]))) {
      score += 15;
      reasons.push("finalidade compatível com o anúncio");
    } else {
      score -= 10;
      reasons.push("finalidade pode não bater com o anúncio");
    }
  }

  if (typeof slots.bedroomsNeeded === "number" && typeof property.bedrooms === "number") {
    if (property.bedrooms >= slots.bedroomsNeeded) {
      score += 12;
      reasons.push("quartos compatíveis");
    } else {
      score -= 8;
      reasons.push("quartos abaixo do desejado");
    }
  }

  if (typeof slots.parkingSpotsNeeded === "number" && typeof property.parkingSpots === "number") {
    if (property.parkingSpots >= slots.parkingSpotsNeeded) {
      score += 10;
      reasons.push("vaga compatível");
    } else {
      score -= 8;
      reasons.push("vaga pode não atender");
    }
  }

  if (typeof slots.hasPets === "boolean" && typeof property.petFriendly === "boolean") {
    if (slots.hasPets && property.petFriendly) {
      score += 10;
      reasons.push("aceita pets");
    } else if (slots.hasPets && !property.petFriendly) {
      score -= 10;
      reasons.push("restrição para pets");
    }
  }

  const budgetValue = parseBudgetToNumber(slots.budget);
  const propertyPrice = typeof property.price === "number" ? Math.round(property.price / 100) : null;
  if (budgetValue && propertyPrice) {
    if (propertyPrice <= budgetValue * 1.05) {
      score += 14;
      reasons.push("preço dentro da faixa");
    } else if (propertyPrice <= budgetValue * 1.2) {
      score += 4;
      reasons.push("preço próximo da faixa");
    } else {
      score -= 10;
      reasons.push("preço acima da faixa percebida");
    }
  }

  const region = normalizeTextForMatch(safeString(slots.searchRegion));
  const neighborhood = normalizeTextForMatch(safeString(property.neighborhood));
  const city = normalizeTextForMatch(safeString(property.city));
  if (region) {
    if ((neighborhood && region.includes(neighborhood)) || (city && region.includes(city)) || (neighborhood && neighborhood.includes(region)) || (city && city.includes(region))) {
      score += 10;
      reasons.push("região compatível");
    }
  }

  return { score: normalizeScore(score), reasons: uniqueStrings(reasons) };
}

function buildMissingCriticalInfo(slots: OfflineAssistantClientSlots | undefined, visitRequested: boolean, visitPreferences?: OfflineAssistantVisitPreferences | null) {
  const missing: string[] = [];
  if (!slots?.purpose) missing.push("finalidade da busca");
  if (!safeString(slots?.budget)) missing.push("orçamento");
  if (!safeString(slots?.moveTime)) missing.push("prazo de mudança");
  if (!slots?.decisionStage) missing.push("momento da decisão");
  if (!slots?.searchRegion) missing.push("região de interesse");
  if (!slots?.financingIntent && safeString(slots?.purpose).toUpperCase() === "COMPRA") missing.push("forma de pagamento/financiamento");
  if (visitRequested && !visitPreferences?.period && !visitPreferences?.time) missing.push("janela de visita");
  if (visitRequested && !(visitPreferences?.days || []).length) missing.push("dias para visita");
  return uniqueStrings(missing);
}

function detectReadinessSignals(slots: OfflineAssistantClientSlots | undefined) {
  const reasons: string[] = [];
  let score = 0;

  const decisionStage = safeString(slots?.decisionStage).toUpperCase();
  if (decisionStage === "PRONTO_VISITAR") {
    score += 20;
    reasons.push("pronto para visita");
  } else if (decisionStage === "PRONTO_PROPOSTA") {
    score += 30;
    reasons.push("pronto para proposta");
  } else if (decisionStage === "COMPARANDO") {
    score += 10;
    reasons.push("comparando opções");
  }

  const urgency = safeString(slots?.urgencyLevel).toUpperCase();
  if (urgency === "ALTA") {
    score += 18;
    reasons.push("urgência alta");
  } else if (urgency === "MEDIA") {
    score += 8;
    reasons.push("urgência moderada");
  }

  if (safeString(slots?.moveTime)) {
    score += 8;
    reasons.push("prazo de mudança informado");
  }

  if (safeString(slots?.financingIntent) && safeString(slots?.financingIntent).toUpperCase() !== "INDEFINIDO") {
    score += 8;
    reasons.push("forma de pagamento indicada");
  }

  return { score: normalizeScore(score), reasons: uniqueStrings(reasons) };
}

function detectIntentSignals(params: {
  slots?: OfflineAssistantClientSlots;
  visitRequested: boolean;
  visitPreferences?: OfflineAssistantVisitPreferences | null;
  message?: string;
  handoffNeeded?: boolean;
}) {
  const reasons: string[] = [];
  let score = 10;

  const slots = params.slots;
  const messageNorm = normalizeTextForMatch(safeString(params.message));

  const slotCount = [
    Boolean(slots?.purpose),
    typeof slots?.hasPets === "boolean",
    typeof slots?.bedroomsNeeded === "number",
    typeof slots?.parkingSpotsNeeded === "number",
    Boolean(slots?.budget),
    Boolean(slots?.moveTime),
    Boolean(slots?.searchRegion),
    Boolean(slots?.decisionStage),
    Boolean(slots?.financingIntent),
    Boolean(slots?.urgencyLevel),
  ].filter(Boolean).length;

  score += Math.min(35, slotCount * 4);
  if (slotCount >= 4) reasons.push("cliente compartilhou contexto relevante");

  if (params.visitRequested) {
    score += 25;
    reasons.push("pediu visita");
  }

  if (params.visitPreferences?.period || params.visitPreferences?.time || (params.visitPreferences?.days || []).length) {
    score += 10;
    reasons.push("informou preferência de visita");
  }

  if (params.handoffNeeded) {
    score += 8;
    reasons.push("assunto avançou para retorno humano");
  }

  if (includesAny(messageNorm, ["proposta", "desconto", "financi", "condicao", "condição", "document", "visita"])) {
    score += 10;
    reasons.push("trouxe tema de decisão");
  }

  return { score: normalizeScore(score), reasons: uniqueStrings(reasons) };
}

export function detectHandoffReason(params: {
  message?: string;
  intent?: OfflineAssistantIntent | null;
  visitRequested?: boolean;
  slots?: OfflineAssistantClientSlots;
  finalHandoffNeeded?: boolean;
  missingInfo?: string[];
}) {
  const raw = normalizeTextForMatch(safeString(params.message));
  if (!params.finalHandoffNeeded && !params.visitRequested && params.intent !== "FINANCING") return null;

  if (params.visitRequested || includesAny(raw, ["visita", "agend", "marcar", "horario", "horário"])) return "SCHEDULING" as const;
  if (params.intent === "FINANCING" || includesAny(raw, ["financi", "fgts", "banco", "credito", "crédito", "parcel"])) return "FINANCING" as const;
  if (includesAny(raw, ["proposta", "oferta", "desconto", "negoci", "permuta"])) return "NEGOTIATION" as const;
  if (includesAny(raw, ["document", "escritura", "cartorio", "cartório", "contrato", "fiador", "garantia"])) return "DOCUMENTATION" as const;
  if (includesAny(raw, ["endereco", "endereço", "rua", "numero", "número", "local exato"])) return "LOCATION_DETAILS" as const;
  if (params.intent === "OFF_TOPIC") return "OFF_TOPIC" as const;
  if ((params.missingInfo || []).length > 0) return "PROPERTY_LIMITATION" as const;
  return "OTHER" as const;
}

export function buildHandoffDecision(params: {
  needed: boolean;
  reason: OfflineAssistantHandoffReason | null;
  leadTemperature: OfflineAssistantLeadTemperature;
  visitRequested: boolean;
  qualificationScore: number;
  commercialSummary: string;
}) : OfflineAssistantHandoffDecision {
  if (!params.needed) {
    return {
      needed: false,
      reason: null,
      priority: params.leadTemperature === "HOT" ? "HIGH" : "MEDIUM",
      summary: params.commercialSummary,
      recommendedAction: params.visitRequested ? "PRIORITIZE_VISIT_CONFIRMATION" : "ASK_QUALIFYING_QUESTION",
    };
  }

  let priority: OfflineAssistantResponsePriority = "HIGH";
  if (params.reason === "NEGOTIATION" || params.reason === "SCHEDULING" || params.qualificationScore >= 80) priority = "URGENT";
  else if (params.reason === "FINANCING" || params.leadTemperature === "HOT") priority = "HIGH";
  else priority = "MEDIUM";

  const reasonLabel =
    params.reason === "SCHEDULING" ? "pedido de visita" :
    params.reason === "NEGOTIATION" ? "negociação" :
    params.reason === "FINANCING" ? "financiamento" :
    params.reason === "DOCUMENTATION" ? "documentação" :
    params.reason === "LOCATION_DETAILS" ? "detalhes sensíveis do imóvel" :
    params.reason === "QUALIFICATION_COMPLETE" ? "qualificação concluída" :
    params.reason === "OFF_TOPIC" ? "tema fora do anúncio" :
    params.reason === "PROPERTY_LIMITATION" ? "informação que não consta no anúncio" :
    "demanda que precisa do corretor";

  const summary = `Handoff recomendado por ${reasonLabel}. ${params.commercialSummary}`.trim();
  return {
    needed: true,
    reason: params.reason,
    priority,
    summary,
    recommendedAction: params.visitRequested ? "PRIORITIZE_VISIT_CONFIRMATION" : "PRIORITIZE_HUMAN_CONTACT",
  };
}

export function buildCommercialSummary(params: {
  slots?: OfflineAssistantClientSlots;
  qualification?: Partial<OfflineAssistantQualification>;
  visitRequested?: boolean;
  visitPreferences?: OfflineAssistantVisitPreferences | null;
  handoff?: { needed?: boolean; reason?: OfflineAssistantHandoffReason | null; priority?: OfflineAssistantResponsePriority | null } | null;
}) {
  const slots = params.slots;
  const parts: string[] = [];
  const parkingNeeded = typeof slots?.parkingSpotsNeeded === "number" ? slots.parkingSpotsNeeded : null;
  const budget = safeString(slots?.budget);
  const moveTime = safeString(slots?.moveTime);
  const searchRegion = safeString(slots?.searchRegion);
  const financingIntent = safeString(slots?.financingIntent);
  const decisionStage = safeString(slots?.decisionStage);
  const urgencyLevel = safeString(slots?.urgencyLevel);

  if (slots?.purpose) parts.push(`Busca ${safeString(slots.purpose).toLowerCase()}`);
  if (typeof slots?.bedroomsNeeded === "number") parts.push(`${slots.bedroomsNeeded} quartos`);
  if (parkingNeeded !== null) parts.push(parkingNeeded === 0 ? "sem vaga" : `${parkingNeeded} vaga(s)`);
  if (budget) parts.push(`orçamento ${budget}`);
  if (moveTime) parts.push(`mudança ${moveTime}`);
  if (searchRegion) parts.push(`região ${searchRegion}`);
  if (financingIntent) parts.push(`pagamento ${financingIntent.toLowerCase().replace(/_/g, " ")}`);
  if (decisionStage) parts.push(`estágio ${decisionStage.toLowerCase().replace(/_/g, " ")}`);
  if (urgencyLevel) parts.push(`urgência ${urgencyLevel.toLowerCase()}`);

  if (params.visitRequested) {
    const visitPrefs = [
      safeString(params.visitPreferences?.period).toLowerCase(),
      Array.isArray(params.visitPreferences?.days) && params.visitPreferences?.days?.length ? params.visitPreferences?.days.join("/") : "",
      safeString(params.visitPreferences?.time),
    ].filter(Boolean);
    parts.push(visitPrefs.length ? `pediu visita (${visitPrefs.join(" · ")})` : "pediu visita");
  }

  const objections = Array.isArray(slots?.objections) ? uniqueStrings(slots?.objections || []) : [];
  if (objections.length) parts.push(`objeções: ${listToSentence(objections.slice(0, 3))}`);

  const leadTemperature = safeString(params.qualification?.leadTemperature);
  if (leadTemperature) parts.push(`lead ${leadTemperature.toLowerCase()}`);

  if (params.handoff?.needed && params.handoff?.priority) parts.push(`prioridade ${safeString(params.handoff.priority).toLowerCase()}`);

  return parts.length ? `${parts.join(" · ")}.` : "Lead com atividade do assistente offline.";
}

export function buildPropertyContextSignals(params: {
  slots?: OfflineAssistantClientSlots;
  property?: {
    title?: string | null;
    type?: string | null;
    purpose?: string | null;
    priceLabel?: string | null;
    condoFeeLabel?: string | null;
    iptuLabel?: string | null;
    areaM2?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    parkingSpots?: number | null;
    suites?: number | null;
    floor?: number | null;
    furnished?: boolean | null;
    petFriendly?: boolean | null;
    neighborhood?: string | null;
    city?: string | null;
    amenities?: string[] | null;
    condoRules?: string | null;
    nearbySummary?: string | null;
  };
}) : OfflineAssistantPropertyContextSignals {
  const property = params.property;
  const slots = params.slots;
  const summaryParts: string[] = [];
  const regionParts: string[] = [];
  const fitHighlights: string[] = [];
  const attentionFlags: string[] = [];

  const title = safeString(property?.title);
  const type = safeString(property?.type);
  const purpose = safeString(property?.purpose);
  const priceLabel = safeString(property?.priceLabel);
  const condoFeeLabel = safeString(property?.condoFeeLabel);
  const iptuLabel = safeString(property?.iptuLabel);
  const neighborhood = safeString(property?.neighborhood);
  const city = safeString(property?.city);
  const condoRules = safeString(property?.condoRules);
  const nearbySummary = safeString(property?.nearbySummary);
  const amenities = Array.isArray(property?.amenities) ? uniqueStrings(property?.amenities || []) : [];

  if (title) summaryParts.push(title);
  if (type) summaryParts.push(type.toLowerCase());
  if (purpose) summaryParts.push(`para ${purpose.toLowerCase()}`);
  if (priceLabel) summaryParts.push(`preço ${priceLabel}`);
  if (typeof property?.areaM2 === "number") summaryParts.push(`${property.areaM2} m²`);
  if (typeof property?.bedrooms === "number") summaryParts.push(`${property.bedrooms} quartos`);
  if (typeof property?.bathrooms === "number") summaryParts.push(`${property.bathrooms} banheiros`);
  if (typeof property?.parkingSpots === "number") summaryParts.push(property.parkingSpots === 0 ? "sem vaga" : `${property.parkingSpots} vaga(s)`);
  if (typeof property?.suites === "number" && property.suites > 0) summaryParts.push(`${property.suites} suíte(s)`);
  if (typeof property?.floor === "number") summaryParts.push(`andar ${property.floor}`);
  if (property?.furnished === true) summaryParts.push("mobiliado");
  if (property?.petFriendly === true) summaryParts.push("aceita pets");
  if (condoFeeLabel) summaryParts.push(`condomínio ${condoFeeLabel}`);
  if (iptuLabel) summaryParts.push(`IPTU ${iptuLabel}`);

  if (neighborhood || city) regionParts.push([neighborhood, city].filter(Boolean).join(", "));
  if (amenities.length) regionParts.push(`amenidades: ${amenities.slice(0, 5).join(", ")}`);
  if (nearbySummary) regionParts.push(nearbySummary);
  if (condoRules) regionParts.push(`regras: ${condoRules}`);

  const slotPurpose = safeString(slots?.purpose).toUpperCase();
  const propertyPurpose = safeString(property?.purpose).toUpperCase();
  if (slotPurpose && propertyPurpose) {
    if ((slotPurpose === "COMPRA" && propertyPurpose.includes("VEN")) || (slotPurpose === "LOCACAO" && (propertyPurpose.includes("LOC") || propertyPurpose.includes("ALUG")))) {
      fitHighlights.push("finalidade alinhada ao que o cliente procura");
    } else {
      attentionFlags.push("validar se a finalidade do anúncio bate com a busca do cliente");
    }
  }

  const region = safeString(slots?.searchRegion);
  if (region && neighborhood) {
    const regionNorm = normalizeTextForMatch(region);
    const neighborhoodNorm = normalizeTextForMatch(neighborhood);
    const cityNorm = normalizeTextForMatch(city);
    if (regionNorm.includes(neighborhoodNorm) || neighborhoodNorm.includes(regionNorm) || (cityNorm && (regionNorm.includes(cityNorm) || cityNorm.includes(regionNorm)))) {
      fitHighlights.push("região desejada compatível com o imóvel");
    } else {
      attentionFlags.push(`cliente citou região ${region}, então vale validar aderência do bairro`);
    }
  }

  if (typeof slots?.bedroomsNeeded === "number" && typeof property?.bedrooms === "number") {
    if (property.bedrooms >= slots.bedroomsNeeded) fitHighlights.push("quantidade de quartos atende a busca");
    else attentionFlags.push("quartos podem ficar abaixo do desejado");
  }

  if (typeof slots?.parkingSpotsNeeded === "number" && typeof property?.parkingSpots === "number") {
    if (property.parkingSpots >= slots.parkingSpotsNeeded) fitHighlights.push("vaga compatível com a necessidade do cliente");
    else attentionFlags.push("vaga pode ser objeção para este lead");
  }

  if (typeof slots?.hasPets === "boolean" && typeof property?.petFriendly === "boolean") {
    if (slots.hasPets && property.petFriendly) fitHighlights.push("política pet favorável");
    if (slots.hasPets && !property.petFriendly) attentionFlags.push("restrição pet pode travar avanço");
  }

  const objections = Array.isArray(slots?.objections) ? uniqueStrings(slots?.objections || []) : [];
  if (objections.includes("preço")) attentionFlags.push("lead já sinalizou sensibilidade a preço");
  if (objections.includes("localização")) attentionFlags.push("lead demonstrou dúvida com localização");
  if (objections.includes("custos adicionais")) attentionFlags.push("condomínio/IPTU podem precisar de contextualização");

  return {
    propertySummary: summaryParts.length ? `${summaryParts.join(" · ")}.` : "Imóvel com contexto comercial disponível no anúncio.",
    regionSummary: regionParts.length ? `${regionParts.join(" · ")}.` : "Contexto de região limitado ao anúncio.",
    fitHighlights: uniqueStrings(fitHighlights).slice(0, 4),
    attentionFlags: uniqueStrings(attentionFlags).slice(0, 4),
  };
}

export function computeQualification(params: {
  slots?: OfflineAssistantClientSlots;
  visitRequested: boolean;
  visitPreferences?: OfflineAssistantVisitPreferences | null;
  handoffNeeded?: boolean;
  message?: string;
  property?: {
    purpose?: string | null;
    price?: number | null;
    bedrooms?: number | null;
    parkingSpots?: number | null;
    petFriendly?: boolean | null;
    neighborhood?: string | null;
    city?: string | null;
  };
}) : OfflineAssistantQualification {
  const intentSignals = detectIntentSignals({
    slots: params.slots,
    visitRequested: params.visitRequested,
    visitPreferences: params.visitPreferences,
    message: params.message,
    handoffNeeded: params.handoffNeeded,
  });
  const readinessSignals = detectReadinessSignals(params.slots);
  const fitSignals = computeFitScore({ slots: params.slots, property: params.property });
  const dataCompleteness = computeDataCompleteness(params.slots, params.visitRequested, params.visitPreferences);

  const score = normalizeScore(intentSignals.score * 0.35 + readinessSignals.score * 0.35 + fitSignals.score * 0.2 + dataCompleteness * 0.1);
  const leadTemperature = scoreToTemperature(score);

  let responsePriority: OfflineAssistantResponsePriority = "LOW";
  if (params.visitRequested || score >= 80) responsePriority = "URGENT";
  else if (score >= 65 || params.handoffNeeded) responsePriority = "HIGH";
  else if (score >= 40) responsePriority = "MEDIUM";

  let recommendedAction: OfflineAssistantRecommendedAction = "ASK_QUALIFYING_QUESTION";
  if (params.visitRequested) recommendedAction = "PRIORITIZE_VISIT_CONFIRMATION";
  else if (params.handoffNeeded && leadTemperature !== "COLD") recommendedAction = "PRIORITIZE_HUMAN_CONTACT";
  else if (safeString(params.slots?.financingIntent) && safeString(params.message).toLowerCase().includes("financi")) recommendedAction = "SEND_FINANCING_CONTEXT";
  else if (dataCompleteness >= 70 && leadTemperature !== "COLD") recommendedAction = "REGISTER_AND_HANDOFF";
  else if (leadTemperature === "COLD") recommendedAction = "NURTURE_AND_WAIT";

  let recommendedPipelineStage: OfflineAssistantPipelineRecommendation = "NEW";
  if (params.visitRequested) recommendedPipelineStage = "VISIT";
  else if (safeString(params.slots?.decisionStage).toUpperCase() === "PRONTO_PROPOSTA") recommendedPipelineStage = "PROPOSAL";
  else if (score >= 45) recommendedPipelineStage = "CONTACT";

  const missingCriticalInfo = buildMissingCriticalInfo(params.slots, params.visitRequested, params.visitPreferences);
  const scoreReasons = uniqueStrings([...intentSignals.reasons, ...readinessSignals.reasons, ...fitSignals.reasons]).slice(0, 6);

  const provisional: Partial<OfflineAssistantQualification> = {
    leadTemperature,
    responsePriority,
  };
  const commercialSummary = buildCommercialSummary({
    slots: params.slots,
    qualification: provisional,
    visitRequested: params.visitRequested,
    visitPreferences: params.visitPreferences,
  });

  return {
    score,
    intentScore: intentSignals.score,
    readinessScore: readinessSignals.score,
    fitScore: fitSignals.score,
    dataCompleteness,
    leadTemperature,
    responsePriority,
    recommendedAction,
    recommendedPipelineStage,
    scoreReasons,
    missingCriticalInfo,
    commercialSummary,
  };
}

function buildQuestionPool(slots: OfflineAssistantClientSlots | undefined) {
  return [
    {
      key: "purpose",
      missing: !slots?.purpose,
      question: "Você busca compra ou locação?",
    },
    {
      key: "searchRegion",
      missing: !safeString(slots?.searchRegion),
      question: "Qual bairro ou região faz mais sentido para você?",
    },
    {
      key: "budget",
      missing: !safeString(slots?.budget),
      question: "Você já tem alguma faixa de orçamento em mente?",
    },
    {
      key: "moveTime",
      missing: !safeString(slots?.moveTime),
      question: "Quando você pretende se mudar ou fechar negócio?",
    },
    {
      key: "decisionStage",
      missing: !slots?.decisionStage,
      question: "Hoje você está mais pesquisando opções, comparando ou já quer visitar?",
    },
    {
      key: "financingIntent",
      missing: !slots?.financingIntent && safeString(slots?.purpose).toUpperCase() === "COMPRA",
      question: "Você pensa em financiamento, FGTS ou recurso próprio?",
    },
    {
      key: "bedroomsNeeded",
      missing: typeof slots?.bedroomsNeeded !== "number",
      question: "Você precisa de quantos quartos?",
    },
    {
      key: "parkingSpotsNeeded",
      missing: typeof slots?.parkingSpotsNeeded !== "number",
      question: "Você precisa de vaga de garagem? Se sim, quantas?",
    },
  ];
}

export function chooseConversationPolicy(params: {
  slots?: OfflineAssistantClientSlots;
  qualification: OfflineAssistantQualification;
  handoff: OfflineAssistantHandoffDecision;
  visitRequested: boolean;
  visitPreferences?: OfflineAssistantVisitPreferences | null;
  fallbackNextQuestion?: string | null;
}) : OfflineAssistantPolicyDecision {
  const fallbackNextQuestion = safeString(params.fallbackNextQuestion);

  if (params.handoff.needed) {
    const missingVisitWindow = params.visitRequested && !params.visitPreferences?.period && !params.visitPreferences?.time;
    const missingVisitDays = params.visitRequested && !(params.visitPreferences?.days || []).length;
    const nextQuestion =
      missingVisitWindow ? "Qual período do dia você prefere para visita: manhã, tarde ou noite?" :
      missingVisitDays ? "Quais dias da semana costumam ser melhores para você visitar?" :
      "";

    return {
      conversationMode: "HANDOFF_MODE",
      nextQuestion,
      shouldAskFollowUp: Boolean(nextQuestion),
      recommendedAction: params.handoff.recommendedAction,
    };
  }

  if (params.visitRequested) {
    const missingVisitWindow = !params.visitPreferences?.period && !params.visitPreferences?.time;
    const missingVisitDays = !(params.visitPreferences?.days || []).length;
    const nextQuestion =
      missingVisitWindow ? "Qual período do dia você prefere para visita: manhã, tarde ou noite?" :
      missingVisitDays ? "Quais dias da semana costumam ser melhores para você visitar?" :
      "Se fizer sentido, eu posso deixar seu pedido pronto para o corretor confirmar com você.";

    return {
      conversationMode: "CONVERSION_MODE",
      nextQuestion,
      shouldAskFollowUp: true,
      recommendedAction: "PRIORITIZE_VISIT_CONFIRMATION",
    };
  }

  if (params.qualification.dataCompleteness < 70) {
    const firstMissing = buildQuestionPool(params.slots).find((item) => item.missing);
    return {
      conversationMode: "QUALIFICATION_MODE",
      nextQuestion: firstMissing?.question || fallbackNextQuestion || "",
      shouldAskFollowUp: Boolean(firstMissing?.question || fallbackNextQuestion),
      recommendedAction: params.qualification.recommendedAction,
    };
  }

  if (params.qualification.leadTemperature === "HOT") {
    return {
      conversationMode: "CONVERSION_MODE",
      nextQuestion: fallbackNextQuestion || "",
      shouldAskFollowUp: Boolean(fallbackNextQuestion),
      recommendedAction: params.qualification.recommendedAction === "ASK_QUALIFYING_QUESTION" ? "REGISTER_AND_HANDOFF" : params.qualification.recommendedAction,
    };
  }

  return {
    conversationMode: "INFO_MODE",
    nextQuestion: fallbackNextQuestion || "",
    shouldAskFollowUp: Boolean(fallbackNextQuestion),
    recommendedAction: params.qualification.recommendedAction === "NURTURE_AND_WAIT" ? "NURTURE_AND_WAIT" : "SEND_PROPERTY_DETAILS",
  };
}

export function buildOperationalPlaybook(params: {
  clientName?: string | null;
  propertyTitle?: string | null;
  slots?: OfflineAssistantClientSlots;
  qualification: OfflineAssistantQualification;
  handoff: OfflineAssistantHandoffDecision;
  policy: OfflineAssistantPolicyDecision;
  visitRequested: boolean;
  visitPreferences?: OfflineAssistantVisitPreferences | null;
  propertyContext?: OfflineAssistantPropertyContextSignals | null;
}) : OfflineAssistantOperationalPlaybook {
  const clientName = safeString(params.clientName) || "cliente";
  const propertyTitle = safeString(params.propertyTitle) || "o imóvel";
  const actionChecklist: string[] = [];

  let headline = "Nutrir lead com próximo passo claro";
  let whyNow = "Há contexto suficiente para o corretor retomar a conversa sem recomeçar do zero.";

  if (params.visitRequested) {
    headline = "Priorizar retorno para visita";
    whyNow = "O lead já pediu visita e está em momento forte de conversão.";
    actionChecklist.push("Retomar o lead primeiro pela janela de visita antes de abrir nova frente.");
    if (!params.visitPreferences?.period && !params.visitPreferences?.time) actionChecklist.push("Validar período ideal para visita (manhã, tarde ou noite).");
    if (!(params.visitPreferences?.days || []).length) actionChecklist.push("Confirmar os melhores dias da semana para visita.");
    actionChecklist.push("Checar disponibilidade operacional antes de qualquer confirmação.");
  } else if (params.handoff.needed) {
    headline = params.handoff.reason === "NEGOTIATION"
      ? "Assumir negociação com retorno humano"
      : params.handoff.reason === "FINANCING"
        ? "Direcionar para conversa financeira assistida"
        : params.handoff.reason === "DOCUMENTATION"
          ? "Assumir tratativa documental"
          : params.handoff.reason === "LOCATION_DETAILS"
            ? "Responder detalhes sensíveis do imóvel"
            : "Fazer retorno humano prioritário";
    whyNow = params.handoff.summary || "A conversa chegou em um ponto que depende do corretor para avançar.";
    actionChecklist.push("Responder com contexto do anúncio e confirmar o próximo passo humano.");
    actionChecklist.push("Registrar no CRM o motivo do handoff para o próximo contato sair preciso.");
    if (params.handoff.reason === "NEGOTIATION") actionChecklist.push("Chegar com margem, proposta e condição comercial já revisadas.");
    if (params.handoff.reason === "FINANCING") actionChecklist.push("Entender se o cliente quer FGTS, financiamento bancário ou recurso próprio.");
    if (params.handoff.reason === "DOCUMENTATION") actionChecklist.push("Separar documentação/garantias antes do retorno para reduzir atrito.");
  } else if (params.qualification.dataCompleteness < 70) {
    headline = "Completar qualificação antes da pressão comercial";
    const firstMissing = params.qualification.missingCriticalInfo[0] || "dados-chave da busca";
    whyNow = `Ainda falta ${firstMissing}, então o melhor próximo passo é fechar lacunas sem forçar conversão.`;
    actionChecklist.push("Retomar a conversa pela principal informação faltante.");
    actionChecklist.push("Usar a próxima pergunta sugerida como roteiro, sem abrir muitos temas de uma vez.");
    if (params.propertyContext?.fitHighlights?.length) actionChecklist.push(`Conectar a pergunta ao encaixe do imóvel: ${params.propertyContext.fitHighlights[0]}.`);
  } else if (params.qualification.leadTemperature === "HOT") {
    headline = "Lead quente pronto para avanço comercial";
    whyNow = "O score e a completude indicam alto potencial de conversão no curto prazo.";
    actionChecklist.push("Responder hoje, de preferência com CTA de avanço claro.");
    actionChecklist.push("Retomar dores/encaixes já identificados para evitar conversa genérica.");
    if (params.propertyContext?.attentionFlags?.length) actionChecklist.push(`Antecipar objeção principal: ${params.propertyContext.attentionFlags[0]}.`);
  } else {
    actionChecklist.push("Manter follow-up consultivo, focado em contexto e aderência do imóvel.");
    if (params.propertyContext?.attentionFlags?.length) actionChecklist.push(`Monitorar ponto de atenção: ${params.propertyContext.attentionFlags[0]}.`);
  }

  if (params.qualification.recommendedAction === "REGISTER_AND_HANDOFF") {
    actionChecklist.push("Registrar o lead no estágio atual e preparar retorno humano com contexto comercial." );
  }

  if (params.qualification.missingCriticalInfo.length > 0 && actionChecklist.length < 4) {
    actionChecklist.push(`Fechar lacunas restantes: ${params.qualification.missingCriticalInfo.slice(0, 2).join(" e ")}.`);
  }

  const followUpDraft = (() => {
    const intro = `Oi ${clientName}, vi sua conversa sobre ${propertyTitle}.`;
    if (params.visitRequested) {
      return `${intro} Separei seu pedido de visita e vou te responder priorizando a melhor janela para avançarmos sem ruído.`;
    }
    if (params.handoff.needed) {
      if (params.handoff.reason === "NEGOTIATION") {
        return `${intro} Recebi seu interesse comercial e consigo seguir daqui entendendo melhor proposta, faixa e condição ideal para você.`;
      }
      if (params.handoff.reason === "FINANCING") {
        return `${intro} Posso te ajudar a organizar o cenário de financiamento/FGTS para alinharmos o próximo passo com mais precisão.`;
      }
      return `${intro} Peguei seu contexto e vou seguir daqui no ponto exato que depende de retorno humano.`;
    }
    if (params.qualification.dataCompleteness < 70) {
      return `${intro} Já tenho parte do seu perfil e vou retomar fechando só a informação que falta para te orientar melhor.`;
    }
    return `${intro} Peguei seu contexto e vou continuar a conversa a partir do que já faz mais sentido para o seu momento.`;
  })();

  return {
    headline,
    whyNow,
    pipelineStage: params.qualification.recommendedPipelineStage,
    actionChecklist: uniqueStrings(actionChecklist).slice(0, 4),
    followUpDraft,
  };
}

export function formatLeadTemperatureLabel(value: OfflineAssistantLeadTemperature | string | null | undefined) {
  const raw = safeString(value).toUpperCase();
  if (raw === "HOT") return "Quente";
  if (raw === "WARM") return "Morno";
  if (raw === "COLD") return "Frio";
  return "—";
}

export function formatPriorityLabel(value: OfflineAssistantResponsePriority | string | null | undefined) {
  const raw = safeString(value).toUpperCase();
  if (raw === "URGENT") return "Urgente";
  if (raw === "HIGH") return "Alta";
  if (raw === "MEDIUM") return "Média";
  if (raw === "LOW") return "Baixa";
  return "—";
}

export function formatConversationModeLabel(value: OfflineAssistantConversationMode | string | null | undefined) {
  const raw = safeString(value).toUpperCase();
  if (raw === "INFO_MODE") return "Informação";
  if (raw === "QUALIFICATION_MODE") return "Qualificação";
  if (raw === "CONVERSION_MODE") return "Conversão";
  if (raw === "HANDOFF_MODE") return "Handoff";
  return "—";
}

export function formatRecommendedActionLabel(value: OfflineAssistantRecommendedAction | string | null | undefined) {
  const raw = safeString(value).toUpperCase();
  if (raw === "ASK_QUALIFYING_QUESTION") return "Qualificar mais";
  if (raw === "SEND_PROPERTY_DETAILS") return "Responder com contexto";
  if (raw === "PRIORITIZE_HUMAN_CONTACT") return "Priorizar contato humano";
  if (raw === "PRIORITIZE_VISIT_CONFIRMATION") return "Priorizar confirmação de visita";
  if (raw === "SEND_FINANCING_CONTEXT") return "Encaminhar tema financeiro";
  if (raw === "REGISTER_AND_HANDOFF") return "Registrar e passar ao corretor";
  if (raw === "NURTURE_AND_WAIT") return "Nutrir e aguardar";
  return capitalize(raw.replace(/_/g, " ")) || "—";
}

export function formatPipelineStageLabel(value: OfflineAssistantPipelineRecommendation | string | null | undefined) {
  const raw = safeString(value).toUpperCase();
  if (raw === "NEW") return "Novo";
  if (raw === "CONTACT") return "Contato";
  if (raw === "VISIT") return "Visita";
  if (raw === "PROPOSAL") return "Proposta";
  if (raw === "DOCUMENTS") return "Documentos";
  return capitalize(raw.replace(/_/g, " ")) || "—";
}
