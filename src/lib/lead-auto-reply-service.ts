import { prisma } from "@/lib/prisma";
import { leadAutoReplyQueue } from "@/lib/queue/queues";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";
import { applyOfflineAutoReplyGuardrailsDetailed } from "@/lib/ai-guardrails";
import {
  extractOfflineAssistantClientSlots,
  formatOfflineAssistantClientSlots,
  mergeOfflineAssistantClientSlots,
  type OfflineAssistantClientSlots,
} from "@/lib/offline-assistant-slots";
import {
  buildCommercialSummary,
  buildHandoffDecision,
  buildOperationalPlaybook,
  buildPropertyContextSignals,
  chooseConversationPolicy,
  computeQualification,
  detectHandoffReason,
  type OfflineAssistantConversationMode,
  type OfflineAssistantHandoffDecision,
  type OfflineAssistantOperationalPlaybook,
  type OfflineAssistantPropertyContextSignals,
  type OfflineAssistantQualification,
} from "@/lib/offline-assistant-intelligence";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WeekSchedule = Record<DayKey, DaySchedule>;

const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  mon: { enabled: true, start: "18:00", end: "08:00" },
  tue: { enabled: true, start: "18:00", end: "08:00" },
  wed: { enabled: true, start: "18:00", end: "08:00" },
  thu: { enabled: true, start: "18:00", end: "08:00" },
  fri: { enabled: true, start: "18:00", end: "08:00" },
  sat: { enabled: true, start: "18:00", end: "08:00" },
  sun: { enabled: true, start: "18:00", end: "08:00" },
};

const REALTOR_ONLINE_THRESHOLD_MS = 2 * 60_000;

function safeString(x: any) {
  const s = String(x ?? "").trim();
  return s;
}

function updateStateClientSlots(prev: OfflineAssistantState, extracted: OfflineAssistantClientSlots | undefined) {
  const merged = mergeOfflineAssistantClientSlots(prev.clientSlots, extracted);
  if (!merged) return prev;
  return { ...prev, clientSlots: merged };
}

async function isRealtorOnline(realtorId: string, now: Date) {
  const user = await (prisma as any).user
    .findUnique({ where: { id: realtorId }, select: { lastSeenAt: true } })
    .catch(() => null);

  const last = user?.lastSeenAt ? new Date(user.lastSeenAt) : null;
  if (!last || Number.isNaN(last.getTime())) return false;
  return now.getTime() - last.getTime() < REALTOR_ONLINE_THRESHOLD_MS;
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
  for (const p of patterns) {
    if (typeof p === "string") {
      if (text.includes(p)) return true;
      continue;
    }
    if (p.test(text)) return true;
  }
  return false;
}

function detectGeneralHandoffHeuristic(message: string) {
  const t = normalizeTextForMatch(message);
  if (!t) return false;
  const needsHandoff: Array<string | RegExp> = [
    "endereco",
    "endereço",
    "rua",
    "numero",
    "número",
    "complemento",
    "whatsapp",
    "telefone",
    "liga",
    "ligar",
    "proposta",
    "oferta",
    "desconto",
    "negoci",
    "abaixa",
    /\baceita\s+(proposta|oferta|negoci|desconto|permuta)\b/,
    "permuta",
    "document",
    "escritura",
    "cartorio",
    "cartório",
    "contrato",
    "fiador",
    "caucao",
    "caução",
    "garantia",
    /\bcondic[aã]o\s+(de\s+)?(loca|locac|pagamento|garantia)\b/,
    /\bainda\s+(esta|ta)\s+disponivel\b/,
    /\bcontinua\s+disponivel\b/,
    /\bsegue\s+disponivel\b/,
    /\bja\s+(vendeu|alugou)\b/,
  ];
  return includesAny(t, needsHandoff);
}

type OfflineAssistantAiJson = {
  answer: string;
  facts_used: string[];
  missing_info?: string[];
  next_question?: string;
  handoff_needed?: boolean;
  conversation_mode?: string;
  handoff_reason?: string;
  recommended_next_step?: string;
  lead_temperature_hint?: string;
  objections_detected?: string[];
};

const OFFLINE_ASSISTANT_FACT_KEYS = [
  "clientName",
  "propertyTitle",
  "city",
  "state",
  "neighborhood",
  "type",
  "purpose",
  "price",
  "condoFee",
  "iptuYearly",
  "bedrooms",
  "suites",
  "bathrooms",
  "parkingSpots",
  "floor",
  "furnished",
  "petFriendly",
  "areaM2",
] as const;

const OFFLINE_AUTO_REPLY_PROMPT_VERSION = "v6";
const OFFLINE_ASSISTANT_GUARDRAILS_VERSION = "v2";
const OFFLINE_ASSISTANT_POLICY_VERSION = "v2";
const OFFLINE_ASSISTANT_SCORING_VERSION = "v2";
const OFFLINE_ASSISTANT_CONTEXT_VERSION = "v2";
const OFFLINE_ASSISTANT_EXPERIMENT_NAME = "offline_assistant_copilot_v2";

function safeEnvPercent(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(raw)));
}

function stableBucket(input: string) {
  const s = safeString(input) || "default";
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

function buildOfflineAssistantRolloutOverview(realtorId: string) {
  const rolloutPercent = safeEnvPercent("OFFLINE_ASSISTANT_ROLLOUT_PERCENT", 100);
  const experimentPercent = safeEnvPercent("OFFLINE_ASSISTANT_EXPERIMENT_PERCENT", 100);
  const realtorBucket = stableBucket(`realtor:${realtorId}`);
  const rolloutEnabled = realtorBucket < rolloutPercent;
  return {
    experimentName: OFFLINE_ASSISTANT_EXPERIMENT_NAME,
    rolloutPercent,
    experimentPercent,
    realtorBucket,
    rolloutEnabled,
  };
}

function resolveOfflineAssistantExperiment(params: { realtorId: string; leadId: string }) {
  const rollout = buildOfflineAssistantRolloutOverview(params.realtorId);
  const leadBucket = stableBucket(`lead:${params.realtorId}:${params.leadId}`);
  const variant = rollout.rolloutEnabled && leadBucket < rollout.experimentPercent ? "COPILOT_V2" : "CONTROL";
  return {
    ...rollout,
    leadBucket,
    variant,
    promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
    guardrailsVersion: OFFLINE_ASSISTANT_GUARDRAILS_VERSION,
    policyVersion: OFFLINE_ASSISTANT_POLICY_VERSION,
    scoringVersion: OFFLINE_ASSISTANT_SCORING_VERSION,
    contextVersion: OFFLINE_ASSISTANT_CONTEXT_VERSION,
  };
}

function clampText(input: string, maxLen: number) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trim();
}

function buildAmenitiesFromProperty(p: any) {
  const out: string[] = [];
  if (!p || typeof p !== "object") return out;

  const add = (cond: any, label: string) => {
    if (cond === true) out.push(label);
  };

  add(p.hasBalcony, "Varanda");
  add(p.hasElevator, "Elevador");
  add(p.hasPool, "Piscina");
  add(p.hasGym, "Academia");
  add(p.hasPlayground, "Playground");
  add(p.hasPartyRoom, "Salão de festas");
  add(p.hasGourmet, "Espaço gourmet");
  add(p.hasConcierge24h, "Portaria 24h");

  add(p.accRamps, "Acessibilidade: rampas");
  add(p.accWideDoors, "Acessibilidade: portas largas");
  add(p.accAccessibleElevator, "Acessibilidade: elevador acessível");
  add(p.accTactile, "Acessibilidade: piso tátil");

  add(p.comfortAC, "Ar-condicionado");
  add(p.comfortHeating, "Aquecimento");
  add(p.comfortSolar, "Energia solar");
  add(p.comfortNoiseWindows, "Janelas anti-ruído");
  add(p.comfortLED, "Iluminação LED");
  add(p.comfortWaterReuse, "Reuso de água");

  add(p.viewSea, "Vista mar");
  add(p.viewCity, "Vista cidade");
  add(p.viewRiver, "Vista rio");
  add(p.viewLake, "Vista lago");

  if (Array.isArray(p.conditionTags)) {
    for (const t of p.conditionTags) {
      const s = safeString(t);
      if (s) out.push(s);
    }
  }

  return Array.from(new Set(out));
}

function buildPropertyContextFromLead(params: {
  lead: any;
  propertyTitle: string;
  slots?: OfflineAssistantClientSlots;
}) : OfflineAssistantPropertyContextSignals {
  const property = params.lead?.property;
  return buildPropertyContextSignals({
    slots: params.slots,
    property: {
      title: params.propertyTitle,
      type: safeString(property?.type) || null,
      purpose: safeString(property?.purpose) || null,
      priceLabel: (property as any)?.hidePrice ? "Consulte" : formatBRLFromCents((property as any)?.price) || "Consulte",
      condoFeeLabel: (property as any)?.hideCondoFee ? "Consulte" : formatBRLFromCents((property as any)?.condoFee) || null,
      iptuLabel: (property as any)?.hideIPTU ? "Consulte" : formatBRLFromCents((property as any)?.iptuYearly) || null,
      areaM2: typeof property?.areaM2 === "number" ? property.areaM2 : null,
      bedrooms: typeof property?.bedrooms === "number" ? property.bedrooms : null,
      bathrooms: typeof property?.bathrooms === "number" ? property.bathrooms : null,
      parkingSpots: typeof (property as any)?.parkingSpots === "number" ? (property as any).parkingSpots : null,
      suites: typeof (property as any)?.suites === "number" ? (property as any).suites : null,
      floor: typeof (property as any)?.floor === "number" ? (property as any).floor : null,
      furnished: typeof (property as any)?.furnished === "boolean" ? (property as any).furnished : null,
      petFriendly: typeof (property as any)?.petFriendly === "boolean" ? (property as any).petFriendly : null,
      neighborhood: safeString(property?.neighborhood) || null,
      city: safeString(property?.city) || null,
      amenities: buildAmenitiesFromProperty(property),
      condoRules: clampText(safeString((property as any)?.condoRules), 240) || null,
      nearbySummary: safeString(property?.neighborhood) && safeString(property?.city)
        ? `região ${safeString(property?.neighborhood)}, ${safeString(property?.city)}`
        : safeString(property?.city)
          ? `região ${safeString(property?.city)}`
          : null,
    },
  });
}

function buildOperationalPlaybookFromState(params: {
  clientName: string;
  propertyTitle: string;
  slots?: OfflineAssistantClientSlots;
  qualification: OfflineAssistantQualification;
  handoff: OfflineAssistantHandoffDecision;
  policy: ReturnType<typeof chooseConversationPolicy>;
  visitRequested: boolean;
  visitPreferences?: OfflineAssistantState["visitPreferences"] | null;
  propertyContext: OfflineAssistantPropertyContextSignals;
}) : OfflineAssistantOperationalPlaybook {
  return buildOperationalPlaybook({
    clientName: params.clientName,
    propertyTitle: params.propertyTitle,
    slots: params.slots,
    qualification: params.qualification,
    handoff: params.handoff,
    policy: params.policy,
    visitRequested: params.visitRequested,
    visitPreferences: params.visitPreferences || null,
    propertyContext: params.propertyContext,
  });
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistancePtBR(meters: number) {
  if (!Number.isFinite(meters) || meters <= 0) return "";
  if (meters < 950) return `${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

function safePublicBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";
  const trimmed = String(base).trim().replace(/\/+$/, "");
  if (trimmed) return trimmed;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return "";
}

function detectPlacesCategory(message: string): { key: string; label: string } | null {
  const t = normalizeTextForMatch(message);
  if (!t) return null;
  const proximity = includesAny(t, ["perto", "proximo", "próximo", "proxima", "próxima", "nas redonde", "na regiao", "na região"]);
  if (!proximity) return null;

  if (includesAny(t, ["mercado", "supermercado", "padaria"])) return { key: "markets", label: "mercados" };
  if (includesAny(t, ["escola", "colegio", "colégio", "creche"])) return { key: "schools", label: "escolas" };
  if (includesAny(t, ["farmacia", "farmácia", "drogaria"])) return { key: "pharmacies", label: "farmácias" };
  if (includesAny(t, ["restaurante", "lanchonete", "bar"])) return { key: "restaurants", label: "restaurantes" };
  if (includesAny(t, ["hospital", "upa", "pronto socorro", "pronto-socorro"])) return { key: "hospitals", label: "hospitais" };
  if (includesAny(t, ["shopping", "mall"])) return { key: "malls", label: "shoppings" };
  if (includesAny(t, ["parque", "praca", "praça"])) return { key: "parks", label: "parques/praças" };
  if (includesAny(t, ["academia", "gym"])) return { key: "gyms", label: "academias" };
  if (includesAny(t, ["posto", "gasolina", "combustivel", "combustível"])) return { key: "fuel", label: "postos" };
  if (includesAny(t, ["banco", "atm", "caixa"])) return { key: "banks", label: "bancos/caixas" };
  return null;
}

async function fetchPlacesNearby(params: { lat: number; lng: number; radiusM: number; perCat: number }) {
  const base = safePublicBaseUrl();
  if (!base) return null;
  const url =
    `${base}/api/places-nearby` +
    `?lat=${encodeURIComponent(String(params.lat))}` +
    `&lng=${encodeURIComponent(String(params.lng))}` +
    `&radius=${encodeURIComponent(String(params.radiusM))}` +
    `&perCat=${encodeURIComponent(String(params.perCat))}`;
  const res = await fetch(url, { method: "GET" }).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json().catch(() => null)) as any;
  if (!json || json.ok !== true) return null;
  return json;
}

async function callOpenAiIntentClassifier(params: { apiKey: string; message: string }) {
  const model = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  try {
    const systemPrompt = [
      "Você é um classificador de intenção para um chat imobiliário (pt-BR).",
      "Retorne SOMENTE JSON válido no formato: {\"intent\": \"PROPERTY\", \"confidence\": 0.9}.",
      "Intents permitidos: PROPERTY, SCHEDULING, FINANCING, OFF_TOPIC, UNCLEAR.",
      "Use SCHEDULING quando o cliente pedir visita, horário, dia, marcar, agendar ou disponibilidade.",
      "Use FINANCING quando falar de financiamento, parcelas, FGTS, banco, crédito.",
      "Use OFF_TOPIC quando não tiver relação com o imóvel/anúncio.",
      "Use UNCLEAR quando a mensagem for vazia/ambígua demais.",
      "Caso contrário, PROPERTY.",
    ].join("\n");

    const userPrompt =
      "Classifique a intenção da mensagem do cliente.\n\n" +
      `Mensagem: ${safeString(params.message)}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.0,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as any;
    const content = safeString(json?.choices?.[0]?.message?.content);
    if (!content) return null;

    const parsed = extractFirstJsonObject(content);
    if (!parsed) return null;
    const obj = JSON.parse(parsed);
    const intentRaw = safeString(obj?.intent).toUpperCase();
    const confidenceRaw = Number(obj?.confidence);
    const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0;
    const allowed: OfflineAssistantIntent[] = ["PROPERTY", "SCHEDULING", "FINANCING", "OFF_TOPIC", "UNCLEAR"];
    const intent = (allowed.includes(intentRaw as any) ? (intentRaw as OfflineAssistantIntent) : null) || null;
    if (!intent) return null;
    return { model, intent, confidence };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractFirstJsonObject(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.startsWith("{")) return s;

  const withoutFences = s
    .replace(/^```(json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  if (withoutFences.startsWith("{")) return withoutFences;

  const first = withoutFences.indexOf("{");
  const last = withoutFences.lastIndexOf("}");
  if (first >= 0 && last > first) return withoutFences.slice(first, last + 1);
  return "";
}

function parseOfflineAssistantAiJson(raw: string): { ok: true; value: OfflineAssistantAiJson } | { ok: false; error: string } {
  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) return { ok: false, error: "NO_JSON_OBJECT" };

  let parsed: any = null;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "INVALID_JSON" };
  }

  if (!parsed || typeof parsed !== "object") return { ok: false, error: "NOT_OBJECT" };

  const answer = safeString(parsed.answer);
  const factsUsedRaw = Array.isArray(parsed.facts_used) ? parsed.facts_used : [];
  const factsUsed = factsUsedRaw
    .map((x: any) => safeString(x))
    .filter(Boolean)
    .filter((k: string) => (OFFLINE_ASSISTANT_FACT_KEYS as readonly string[]).includes(k));
  const missingInfoRaw = Array.isArray(parsed.missing_info) ? parsed.missing_info : [];
  const missingInfo = missingInfoRaw.map((x: any) => safeString(x)).filter(Boolean);
  const objectionsDetectedRaw = Array.isArray(parsed.objections_detected) ? parsed.objections_detected : [];
  const objectionsDetected = objectionsDetectedRaw.map((x: any) => safeString(x)).filter(Boolean);
  const nextQuestion = safeString(parsed.next_question);
  const handoffNeeded = typeof parsed.handoff_needed === "boolean" ? parsed.handoff_needed : false;
  const conversationMode = safeString(parsed.conversation_mode).toUpperCase();
  const handoffReason = safeString(parsed.handoff_reason).toUpperCase();
  const recommendedNextStep = safeString(parsed.recommended_next_step);
  const leadTemperatureHint = safeString(parsed.lead_temperature_hint).toUpperCase();

  if (!answer) return { ok: false, error: "EMPTY_ANSWER" };

  return {
    ok: true,
    value: {
      answer,
      facts_used: factsUsed,
      missing_info: missingInfo.length ? missingInfo : undefined,
      next_question: nextQuestion || undefined,
      handoff_needed: handoffNeeded,
      conversation_mode: conversationMode || undefined,
      handoff_reason: handoffReason || undefined,
      recommended_next_step: recommendedNextStep || undefined,
      lead_temperature_hint: leadTemperatureHint || undefined,
      objections_detected: objectionsDetected.length ? objectionsDetected : undefined,
    },
  };
}

function isLikelyFactualAnswer(answer: string) {
  const raw = String(answer || "");
  const t = normalizeTextForMatch(raw);
  if (!t) return false;

  const signals: Array<string | RegExp> = [
    /\br\$\b/i,
    /\bm2\b/i,
    /\bm²\b/i,
    "condominio",
    "iptu",
    "quarto",
    "banheiro",
    "suite",
    "vaga",
    "andar",
    "mobili",
    "pets",
    "aceita",
    "finalidade",
    "compra",
    "locacao",
    "consulte",
  ];

  return includesAny(t, signals) || /\d/.test(raw);
}

type OfflineAssistantState = {
  asked?: {
    purpose?: boolean;
    pets?: boolean;
    parking?: boolean;
    moveTime?: boolean;
    bedrooms?: boolean;
    budget?: boolean;
    region?: boolean;
    financing?: boolean;
    decisionStage?: boolean;
    visitWindow?: boolean;
  };
  lastQuestion?: string;
  visitRequested?: boolean;
  visitPreferences?: {
    period?: string | null;
    days?: string[] | null;
    time?: string | null;
  };
  clientSlots?: OfflineAssistantClientSlots;
  conversationMode?: OfflineAssistantConversationMode | null;
  qualification?: OfflineAssistantQualification | null;
  handoff?: OfflineAssistantHandoffDecision | null;
  lastRecommendedAction?: string | null;
  lastIntent?: OfflineAssistantIntent | null;
  commercialSummary?: string | null;
};

function readOfflineAssistantState(metadata: any): OfflineAssistantState {
  const s = (metadata as any)?.offlineAssistantState;
  if (!s || typeof s !== "object") return {};

  const askedRaw = (s as any).asked;
  const asked = askedRaw && typeof askedRaw === "object" ? askedRaw : {};
  const toBool = (v: any) => (typeof v === "boolean" ? v : false);

  const vpRaw = (s as any).visitPreferences;
  const vp = vpRaw && typeof vpRaw === "object" ? vpRaw : null;
  const daysRaw = vp && Array.isArray((vp as any).days) ? (vp as any).days : null;
  const days = Array.isArray(daysRaw) ? daysRaw.map((x: any) => safeString(x)).filter(Boolean) : null;

  const csRaw = (s as any).clientSlots;
  const cs = csRaw && typeof csRaw === "object" ? (csRaw as any) : null;
  const toNumOrNull = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const purposeRaw = cs ? safeString(cs.purpose).toUpperCase() : "";
  const purpose = purposeRaw === "COMPRA" || purposeRaw === "LOCACAO" ? purposeRaw : "";
  const hasPets = cs && typeof cs.hasPets === "boolean" ? cs.hasPets : null;
  const parkingSpotsNeeded = cs ? toNumOrNull(cs.parkingSpotsNeeded) : null;
  const bedroomsNeeded = cs ? toNumOrNull(cs.bedroomsNeeded) : null;
  const moveTime = cs ? safeString(cs.moveTime) : "";
  const budget = cs ? safeString(cs.budget) : "";
  const searchRegion = cs ? safeString(cs.searchRegion) : "";
  const financingIntentRaw = cs ? safeString(cs.financingIntent).toUpperCase() : "";
  const financingIntent =
    financingIntentRaw === "FINANCIAMENTO" || financingIntentRaw === "FGTS" || financingIntentRaw === "RECURSOS_PROPRIOS" || financingIntentRaw === "INDEFINIDO"
      ? financingIntentRaw
      : "";
  const urgencyLevelRaw = cs ? safeString(cs.urgencyLevel).toUpperCase() : "";
  const urgencyLevel = urgencyLevelRaw === "ALTA" || urgencyLevelRaw === "MEDIA" || urgencyLevelRaw === "BAIXA" ? urgencyLevelRaw : "";
  const decisionStageRaw = cs ? safeString(cs.decisionStage).toUpperCase() : "";
  const decisionStage =
    decisionStageRaw === "PESQUISA" || decisionStageRaw === "COMPARANDO" || decisionStageRaw === "PRONTO_VISITAR" || decisionStageRaw === "PRONTO_PROPOSTA"
      ? decisionStageRaw
      : "";
  const familyProfile = cs ? safeString(cs.familyProfile) : "";
  const reasonForMove = cs ? safeString(cs.reasonForMove) : "";
  const preferredContactWindow = cs ? safeString(cs.preferredContactWindow) : "";
  const objections = cs && Array.isArray(cs.objections) ? cs.objections.map((x: any) => safeString(x)).filter(Boolean) : [];
  const clientSlots: OfflineAssistantClientSlots | undefined =
    purpose ||
    typeof hasPets === "boolean" ||
    typeof parkingSpotsNeeded === "number" ||
    typeof bedroomsNeeded === "number" ||
    moveTime ||
    budget ||
    searchRegion ||
    financingIntent ||
    urgencyLevel ||
    decisionStage ||
    familyProfile ||
    reasonForMove ||
    preferredContactWindow ||
    objections.length
      ? {
          purpose: (purpose as any) || null,
          hasPets: typeof hasPets === "boolean" ? hasPets : null,
          parkingSpotsNeeded: typeof parkingSpotsNeeded === "number" ? parkingSpotsNeeded : null,
          bedroomsNeeded: typeof bedroomsNeeded === "number" ? bedroomsNeeded : null,
          moveTime: moveTime || null,
          budget: budget || null,
          searchRegion: searchRegion || null,
          financingIntent: (financingIntent as any) || null,
          urgencyLevel: (urgencyLevel as any) || null,
          decisionStage: (decisionStage as any) || null,
          familyProfile: familyProfile || null,
          reasonForMove: reasonForMove || null,
          preferredContactWindow: preferredContactWindow || null,
          objections: objections.length ? Array.from(new Set(objections)) : null,
        }
      : undefined;
  const conversationModeRaw = safeString((s as any).conversationMode).toUpperCase();
  const conversationMode =
    conversationModeRaw === "INFO_MODE" ||
    conversationModeRaw === "QUALIFICATION_MODE" ||
    conversationModeRaw === "CONVERSION_MODE" ||
    conversationModeRaw === "HANDOFF_MODE"
      ? (conversationModeRaw as OfflineAssistantConversationMode)
      : null;
  const qualificationRaw = (s as any).qualification;
  const qualification = qualificationRaw && typeof qualificationRaw === "object" ? (qualificationRaw as OfflineAssistantQualification) : null;
  const handoffRaw = (s as any).handoff;
  const handoff = handoffRaw && typeof handoffRaw === "object" ? (handoffRaw as OfflineAssistantHandoffDecision) : null;
  const lastIntentRaw = safeString((s as any).lastIntent).toUpperCase();
  const lastIntent =
    lastIntentRaw === "PROPERTY" || lastIntentRaw === "SCHEDULING" || lastIntentRaw === "FINANCING" || lastIntentRaw === "OFF_TOPIC" || lastIntentRaw === "UNCLEAR"
      ? (lastIntentRaw as OfflineAssistantIntent)
      : null;

  return {
    asked: {
      purpose: toBool((asked as any).purpose),
      pets: toBool((asked as any).pets),
      parking: toBool((asked as any).parking),
      moveTime: toBool((asked as any).moveTime),
      bedrooms: toBool((asked as any).bedrooms),
      budget: toBool((asked as any).budget),
      region: toBool((asked as any).region),
      financing: toBool((asked as any).financing),
      decisionStage: toBool((asked as any).decisionStage),
      visitWindow: toBool((asked as any).visitWindow),
    },
    lastQuestion: safeString((s as any).lastQuestion) || "",
    visitRequested: toBool((s as any).visitRequested),
    visitPreferences: vp
      ? {
          period: safeString((vp as any).period) || null,
          days: days && days.length ? Array.from(new Set(days)) : null,
          time: safeString((vp as any).time) || null,
        }
      : undefined,
    clientSlots,
    conversationMode: conversationMode || undefined,
    qualification: qualification || undefined,
    handoff: handoff || undefined,
    lastRecommendedAction: safeString((s as any).lastRecommendedAction) || undefined,
    lastIntent: lastIntent || undefined,
    commercialSummary: safeString((s as any).commercialSummary) || undefined,
  };
}

function updateStateWithQuestion(prev: OfflineAssistantState, question: string): OfflineAssistantState {
  const q = safeString(question);
  if (!q) return prev;
  const t = normalizeTextForMatch(q);

  const askedPrev = prev.asked || {};
  const asked = { ...askedPrev } as any;

  if (includesAny(t, ["compra ou locacao", "compra ou locação", /\bcompra\b.*\blocacao\b/])) asked.purpose = true;
  if (includesAny(t, ["pets", "pet", "aceita pets", "tem pets"])) asked.pets = true;
  if (includesAny(t, ["vaga", "vagas", "estacion"])) asked.parking = true;
  if (includesAny(t, ["quando pretende", "prazo", "se mudar", "mudanca", "mudança"])) asked.moveTime = true;
  if (includesAny(t, ["quartos", "quantos quartos", /\bquarto\b/])) asked.bedrooms = true;
  if (includesAny(t, ["orçamento", "orcamento", "faixa de preco", "faixa de preço", "até quanto", "ate quanto", "valor maximo", "valor máximo"])) asked.budget = true;
  if (includesAny(t, ["bairro", "regiao", "região", "localizacao", "localização"])) asked.region = true;
  if (includesAny(t, ["financiamento", "fgts", "recurso proprio", "recurso próprio", "a vista", "à vista"])) asked.financing = true;
  if (includesAny(t, ["pesquisando", "comparando", "quer visitar", "já quer visitar", "momento da decisão"])) asked.decisionStage = true;
  if (includesAny(t, ["periodo do dia", "período do dia", "dias da semana", "visita", "manha", "manhã", "tarde", "noite"])) asked.visitWindow = true;

  return {
    ...prev,
    asked,
    lastQuestion: q,
  };
}

function updateStateVisitRequested(prev: OfflineAssistantState): OfflineAssistantState {
  return {
    ...prev,
    visitRequested: true,
  };
}

function updateStateVisitPreferences(prev: OfflineAssistantState, prefs: any): OfflineAssistantState {
  const p = prefs && typeof prefs === "object" ? prefs : null;
  const period = p ? safeString((p as any).period) : "";
  const time = p ? safeString((p as any).time) : "";
  const daysRaw = p && Array.isArray((p as any).days) ? (p as any).days : null;
  const days = Array.isArray(daysRaw) ? daysRaw.map((x: any) => safeString(x)).filter(Boolean) : [];

  const hasAny = Boolean(period || time || days.length);
  if (!hasAny) return prev;

  const prevVp = prev.visitPreferences && typeof prev.visitPreferences === "object" ? prev.visitPreferences : {};

  return {
    ...prev,
    asked: {
      ...(prev.asked || {}),
      visitWindow: true,
    },
    visitPreferences: {
      period: period || (prevVp as any).period || null,
      time: time || (prevVp as any).time || null,
      days: days.length ? Array.from(new Set(days)) : (prevVp as any).days || null,
    },
  };
}

function updateStateWithIntelligence(
  prev: OfflineAssistantState,
  intelligence: {
    conversationMode?: OfflineAssistantConversationMode | null;
    qualification?: OfflineAssistantQualification | null;
    handoff?: OfflineAssistantHandoffDecision | null;
    recommendedAction?: string | null;
    intent?: OfflineAssistantIntent | null;
    commercialSummary?: string | null;
  }
): OfflineAssistantState {
  return {
    ...prev,
    conversationMode: intelligence.conversationMode ?? prev.conversationMode ?? null,
    qualification: intelligence.qualification ?? prev.qualification ?? null,
    handoff: intelligence.handoff ?? prev.handoff ?? null,
    lastRecommendedAction: safeString(intelligence.recommendedAction) || prev.lastRecommendedAction || null,
    lastIntent: intelligence.intent ?? prev.lastIntent ?? null,
    commercialSummary: safeString(intelligence.commercialSummary) || prev.commercialSummary || null,
  };
}

function extractLastQuestion(text: string) {
  const s = safeString(text);
  if (!s) return "";
  const lines = s.split("\n").map((x) => x.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.includes("?")) return line;
  }
  return "";
}

function extractVisitPreferences(message: string, opts?: { now?: Date; timeZone?: string }) {
  const raw = safeString(message);
  const t = normalizeTextForMatch(raw);
  if (!t) return {};

  const period =
    includesAny(t, ["manha", "manhã", "de manha", "de manhã"]) ? "MANHA" :
    includesAny(t, ["tarde", "de tarde"]) ? "TARDE" :
    includesAny(t, ["noite", "a noite", "à noite", "de noite"]) ? "NOITE" :
    "";

  const days: string[] = [];
  const add = (cond: boolean, label: string) => {
    if (cond) days.push(label);
  };
  add(includesAny(t, ["segunda"]), "SEG");
  add(includesAny(t, ["terca", "terça"]), "TER");
  add(includesAny(t, ["quarta"]), "QUA");
  add(includesAny(t, ["quinta"]), "QUI");
  add(includesAny(t, ["sexta"]), "SEX");
  add(includesAny(t, ["sabado", "sábado"]), "SAB");
  add(includesAny(t, ["domingo"]), "DOM");

  if (includesAny(t, ["fim de semana", "fds"])) {
    days.push("SAB");
    days.push("DOM");
  }

  const resolveRelativeDay = (deltaDays: number) => {
    const now = opts?.now;
    const tz = safeString(opts?.timeZone);
    if (!now || !tz) return null;
    const local = getLocalParts(now, tz);
    if (!local?.dayKey) return null;
    const order: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const idx = order.indexOf(local.dayKey);
    if (idx < 0) return null;
    const next = order[(idx + deltaDays + order.length) % order.length];
    const map: Record<DayKey, string> = {
      mon: "SEG",
      tue: "TER",
      wed: "QUA",
      thu: "QUI",
      fri: "SEX",
      sat: "SAB",
      sun: "DOM",
    };
    return map[next] || null;
  };

  if (includesAny(t, ["hoje"])) {
    const d = resolveRelativeDay(0);
    if (d) days.push(d);
  }
  if (includesAny(t, ["amanha", "amanhã"])) {
    const d = resolveRelativeDay(1);
    if (d) days.push(d);
  }

  const normalizeTime = (h: string, m?: string) => {
    const hh = parseInt(h, 10);
    const mm = m ? parseInt(m, 10) : NaN;
    if (!Number.isFinite(hh) || hh < 0 || hh > 23) return "";
    if (!m) return `${hh}h`;
    if (!Number.isFinite(mm) || mm < 0 || mm > 59) return `${hh}h`;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  let time = "";
  const m1 = raw.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/);
  const m2 = raw.match(/\b(\d{1,2})h(\d{2})\b/i);
  const m3 = raw.match(/\b(\d{1,2})\s*h\b/i);
  const mAfter = raw.match(/\b(depois|apos|após)\s+das?\s+(\d{1,2})(?:\s*[:h]\s*(\d{2}))?\b/i);
  const mBefore = raw.match(/\b(antes)\s+das?\s+(\d{1,2})(?:\s*[:h]\s*(\d{2}))?\b/i);
  if (m1) time = safeString(m1[0]);
  else if (m2) time = normalizeTime(m2[1], m2[2]);
  else if (m3) time = normalizeTime(m3[1]);
  else if (mAfter) {
    const base = normalizeTime(mAfter[2], mAfter[3]);
    time = base ? `depois das ${base}` : safeString(mAfter[0]);
  } else if (mBefore) {
    const base = normalizeTime(mBefore[2], mBefore[3]);
    time = base ? `antes das ${base}` : safeString(mBefore[0]);
  }

  const inferPeriodFromTime = (timeStr: string) => {
    const tm = safeString(timeStr);
    const hMatch = tm.match(/\b(\d{1,2})(?::\d{2})?\b/) || tm.match(/\b(\d{1,2})h\b/i);
    const h = hMatch ? parseInt(String(hMatch[1] || hMatch[0]).replace(/\D/g, ""), 10) : NaN;
    if (!Number.isFinite(h)) return "";
    if (h >= 18 || h <= 4) return "NOITE";
    if (h >= 12) return "TARDE";
    if (h >= 5) return "MANHA";
    return "";
  };

  const period2 = period || (time ? inferPeriodFromTime(time) : "");

  return {
    period: period2 || null,
    days: days.length ? Array.from(new Set(days)) : null,
    time: time || null,
  };
}

function formatVisitPreferences(prefs: any) {
  const p = prefs && typeof prefs === "object" ? prefs : null;
  if (!p) return "";
  const period = safeString((p as any).period);
  const time = safeString((p as any).time);
  const daysRaw = Array.isArray((p as any).days) ? (p as any).days : [];
  const days = daysRaw.map((x: any) => safeString(x)).filter(Boolean);
  const parts = [period || null, days.length ? days.join("/") : null, time || null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "";
}

function buildSchedulingAutoReply(params: {
  clientName: string;
  propertyTitle: string;
  includeIntro?: boolean;
  preferences?: any;
}) {
  const intro = params.includeIntro ? buildAssistantIntro(params.clientName) : "";
  const about = params.propertyTitle ? `Sobre o imóvel ${params.propertyTitle}, ` : "Sobre o imóvel, ";
  const prefText = formatVisitPreferences(params.preferences);

  const p = params.preferences && typeof params.preferences === "object" ? params.preferences : null;
  const hasPeriod = Boolean(p && safeString((p as any).period));
  const hasTime = Boolean(p && safeString((p as any).time));
  const hasDays = Boolean(p && Array.isArray((p as any).days) && (p as any).days.length);

  const missingPeriod = !hasPeriod;
  const missingDays = !hasDays;
  const missingAll = missingPeriod && missingDays && !hasTime;

  if (!missingAll) {
    if (missingPeriod && !missingDays) {
      return (
        intro +
        `${about}perfeito — vou encaminhar seu pedido de visita para o corretor.\n\n` +
        (prefText ? `Preferências recebidas: ${prefText}.\n\n` : "") +
        "Só pra eu registrar direitinho: qual período do dia você prefere (manhã/tarde/noite)?\n\n" +
        "O corretor vai confirmar o agendamento com você assim que possível."
      );
    }

    if (!missingPeriod && missingDays) {
      return (
        intro +
        `${about}perfeito — vou encaminhar seu pedido de visita para o corretor.\n\n` +
        (prefText ? `Preferências recebidas: ${prefText}.\n\n` : "") +
        "Só pra eu registrar direitinho: quais dias da semana costumam ser melhores para você?\n\n" +
        "O corretor vai confirmar o agendamento com você assim que possível."
      );
    }

    return (
      intro +
      `${about}perfeito — já registrei sua preferência de visita${prefText ? ` (${prefText})` : ""} e vou enviar ao corretor agora.\n\n` +
      "O corretor vai confirmar o agendamento com você assim que possível."
    );
  }

  return (
    intro +
    `${about}perfeito — posso registrar seu pedido de visita e enviar ao corretor.\n\n` +
    "Pra eu enviar já com as informações certinhas: qual período do dia você prefere (manhã/tarde/noite) e quais dias da semana costuma ser melhor?\n\n" +
    "O corretor vai confirmar o agendamento com você assim que possível."
  );
}

function chooseNextQuestion(params: {
  history: string;
  state?: OfflineAssistantState;
}) {
  const h = normalizeTextForMatch(params.history || "");

  const askedState = params.state?.asked || {};

  const slots = params.state?.clientSlots;
  const hasPurpose = Boolean(slots && safeString((slots as any).purpose));
  const hasPets = slots && typeof (slots as any).hasPets === "boolean";
  const hasParking = slots && typeof (slots as any).parkingSpotsNeeded === "number";
  const hasMoveTime = Boolean(slots && safeString((slots as any).moveTime));
  const hasBedrooms = slots && typeof (slots as any).bedroomsNeeded === "number";
  const hasBudget = Boolean(slots && safeString((slots as any).budget));
  const hasRegion = Boolean(slots && safeString((slots as any).searchRegion));
  const hasFinancing = Boolean(slots && safeString((slots as any).financingIntent));
  const hasDecisionStage = Boolean(slots && safeString((slots as any).decisionStage));
  const isPurchase = safeString((slots as any)?.purpose).toUpperCase() === "COMPRA";

  const askedPurpose = Boolean(askedState.purpose) || includesAny(h, ["compra ou locacao", "compra ou locação", /\bcompra\b.*\blocacao\b/]);
  const askedPets = Boolean(askedState.pets) || includesAny(h, ["pets", "pet", "aceita pets", "tem pets"]);
  const askedParking = Boolean(askedState.parking) || includesAny(h, ["vaga", "vagas", "estacion"]);
  const askedMove = Boolean(askedState.moveTime) || includesAny(h, ["quando pretende", "quando voce pretende", "prazo", "se mudar", "mudar", "mudanca", "mudança"]);
  const askedBedrooms = Boolean(askedState.bedrooms) || includesAny(h, ["quartos", "quantos quartos", /\bquarto\b/]);
  const askedBudget = Boolean(askedState.budget) || includesAny(h, ["orçamento", "orcamento", "faixa de preco", "faixa de preço", "até quanto", "ate quanto", "valor maximo", "valor máximo"]);
  const askedRegion = Boolean(askedState.region) || includesAny(h, ["bairro", "regiao", "região", "localizacao", "localização"]);
  const askedFinancing = Boolean(askedState.financing) || includesAny(h, ["financiamento", "fgts", "recurso proprio", "recurso próprio", "a vista", "à vista"]);
  const askedDecisionStage = Boolean(askedState.decisionStage) || includesAny(h, ["pesquisando", "comparando", "quer visitar", "já quer visitar"]);

  if (!hasPurpose && !askedPurpose) return "Você busca compra ou locação?";
  if (!hasRegion && !askedRegion) return "Qual bairro ou região faz mais sentido para você?";
  if (!hasBudget && !askedBudget) return "Você tem alguma faixa de orçamento?";
  if (!hasMoveTime && !askedMove) return "Quando você pretende se mudar ou fechar negócio?";
  if (!hasDecisionStage && !askedDecisionStage) return "Hoje você está mais pesquisando opções, comparando ou já quer visitar?";
  if (isPurchase && !hasFinancing && !askedFinancing) return "Você pensa em financiamento, FGTS ou recurso próprio?";
  if (!hasBedrooms && !askedBedrooms) return "Você precisa de quantos quartos?";
  if (!hasParking && !askedParking) return "Você precisa de vaga de garagem? Se sim, quantas?";
  if (!hasPets && !askedPets) return "Você tem pets?";
  return "";
}

type OfflineAssistantIntent = "PROPERTY" | "SCHEDULING" | "FINANCING" | "OFF_TOPIC" | "UNCLEAR";

function classifyIntent(message: string): OfflineAssistantIntent {
  const t = normalizeTextForMatch(message);
  if (!t || t.trim().length === 0) return "UNCLEAR";

  const scheduling: Array<string | RegExp> = [
    "agend",
    "agenda",
    "marcar",
    "visita",
    "horario",
    "depois",
    "apos",
    "após",
    "antes",
    "amanha",
    "hoje",
    "sabado",
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "posso ir",
    "posso ver",
    "quando posso",
    /\b\d{1,2}:\d{2}\b/,
    /\b\d{1,2}h\b/i,
    /\b\d{1,2}h\d{2}\b/i,
  ];

  const financing: Array<string | RegExp> = ["financi", "fgts", "entrada", "parcela", "parcel", "juros", "simul", "credito", "banco"];

  if (includesAny(t, scheduling)) return "SCHEDULING";
  if (includesAny(t, financing)) return "FINANCING";
  const offTopic: Array<string | RegExp> = ["tempo", "clima", "polit", "futebol", "carro", "emprego", "curriculo", "senha", "pix", "cartao"];
  if (includesAny(t, offTopic)) return "OFF_TOPIC";
  return "PROPERTY";
}

function toNumberCents(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatBRLFromCents(value: any): string {
  const cents = toNumberCents(value);
  if (cents == null) return "";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `R$ ${Math.round(cents / 100).toLocaleString("pt-BR")}`;
  }
}

function buildAssistantIntro(clientName: string) {
  const greet = clientName ? `Olá ${clientName}, tudo bem?` : "Olá, tudo bem?";
  return `${greet}\n\nSou a assistente virtual do corretor e estou aqui para ajudar com dúvidas básicas do anúncio.\n\n`;
}

function buildGenericFallbackReply(params: { clientName: string; propertyTitle: string; includeIntro?: boolean }) {
  const intro = params.includeIntro ? buildAssistantIntro(params.clientName) : "";
  const about = params.propertyTitle ? `Sobre o imóvel ${params.propertyTitle}, ` : "Sobre o imóvel, ";
  return (
    intro +
    `Entendi sua mensagem. ${about}essa informação não está disponível no anúncio.\n\n` +
    "Se você quiser, eu posso registrar sua dúvida para o corretor, que confirma com você assim que possível."
  );
}

function buildRefusalReply(params: {
  clientName: string;
  propertyTitle: string;
  reason: "OFF_TOPIC" | "SCHEDULING" | "FINANCING" | "UNCLEAR";
  includeIntro?: boolean;
}) {
  const intro = params.includeIntro ? buildAssistantIntro(params.clientName) : "";
  const about = params.propertyTitle ? `Sobre o imóvel ${params.propertyTitle}, ` : "Sobre o imóvel, ";

  if (params.reason === "SCHEDULING") {
    return (
      intro +
      `${about}perfeito — posso registrar seu pedido de visita e enviar ao corretor.\n\n` +
      "Pra eu enviar já com as informações certinhas: qual período do dia você prefere (manhã/tarde/noite) e quais dias da semana costuma ser melhor?\n\n" +
      "O corretor vai confirmar o agendamento com você assim que possível."
    );
  }

  if (params.reason === "FINANCING") {
    return (
      intro +
      `Entendi sua dúvida sobre financiamento. ${about}eu posso registrar essa solicitação para o corretor, que consegue orientar as condições e possibilidades.\n\n` +
      "Enquanto isso, se preferir, posso ajudar com informações do anúncio (preço, localização, quartos, área e itens).\n\n" +
      "O que você gostaria de confirmar sobre o imóvel?"
    );
  }

  if (params.reason === "OFF_TOPIC") {
    return (
      intro +
      `Entendi. ${about}eu consigo ajudar com dúvidas relacionadas a este anúncio (preço, localização, quartos, área e itens).\n\n` +
      "O que você gostaria de saber sobre o imóvel?"
    );
  }

  return (
    intro +
    `Entendi. ${about}posso te ajudar com informações do anúncio (preço, localização, quartos, área e itens).\n\n` +
    "O que você gostaria de confirmar sobre o imóvel?"
  );
}

function safeTimezone(tz: any) {
  const s = safeString(tz) || "America/Sao_Paulo";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: s }).format(new Date());
    return s;
  } catch {
    return "America/Sao_Paulo";
  }
}

function parseTimeToMinutes(s: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s || "").trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function weekdayToKey(weekday: string): DayKey | null {
  const w = String(weekday || "").toLowerCase();
  if (w.startsWith("mon")) return "mon";
  if (w.startsWith("tue")) return "tue";
  if (w.startsWith("wed")) return "wed";
  if (w.startsWith("thu")) return "thu";
  if (w.startsWith("fri")) return "fri";
  if (w.startsWith("sat")) return "sat";
  if (w.startsWith("sun")) return "sun";
  return null;
}

function getLocalParts(date: Date, timeZone: string): { dayKey: DayKey; minutes: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const weekday = parts.find((p) => p.type === "weekday")?.value || "";
    const hour = parts.find((p) => p.type === "hour")?.value || "";
    const minute = parts.find((p) => p.type === "minute")?.value || "";
    const dayKey = weekdayToKey(weekday);
    const h = parseInt(hour, 10);
    const mm = parseInt(minute, 10);
    if (!dayKey) return null;
    if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
    return { dayKey, minutes: h * 60 + mm };
  } catch {
    return null;
  }
}

export function normalizeWeekSchedule(input: any): WeekSchedule {
  const base: WeekSchedule = JSON.parse(JSON.stringify(DEFAULT_WEEK_SCHEDULE));
  if (!input || typeof input !== "object") return base;

  const keys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  for (const k of keys) {
    const row = (input as any)[k];
    if (!row || typeof row !== "object") continue;
    const enabled = typeof row.enabled === "boolean" ? row.enabled : base[k].enabled;
    const start = safeString(row.start) || base[k].start;
    const end = safeString(row.end) || base[k].end;
    if (parseTimeToMinutes(start) == null || parseTimeToMinutes(end) == null) continue;
    base[k] = { enabled, start, end };
  }

  return base;
}

export function isOutsideBusinessHours(params: { now: Date; timezone: string; schedule: WeekSchedule }) {
  const tz = safeTimezone(params.timezone);
  const local = getLocalParts(params.now, tz);
  if (!local) return true;
  const day = params.schedule[local.dayKey];
  if (!day?.enabled) return true;

  const startMin = parseTimeToMinutes(day.start);
  const endMin = parseTimeToMinutes(day.end);
  if (startMin == null || endMin == null) return true;

  if (startMin === endMin) return true;

  if (startMin < endMin) {
    return !(local.minutes >= startMin && local.minutes < endMin);
  }

  return local.minutes >= endMin && local.minutes < startMin;
}

async function callOpenAiText(params: { apiKey: string; systemPrompt: string; userPrompt: string }) {
  const model = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 260,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const json = (await res.json().catch(() => null)) as any;
    const content = safeString(json?.choices?.[0]?.message?.content);
    if (!content) return null;

    return { model, content };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class LeadAutoReplyService {
  static defaultWeekSchedule(): WeekSchedule {
    return JSON.parse(JSON.stringify(DEFAULT_WEEK_SCHEDULE));
  }

  static async getSettings(realtorId: string) {
    let row: any = null;
    const rollout = buildOfflineAssistantRolloutOverview(realtorId);
    const versions = {
      promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
      guardrailsVersion: OFFLINE_ASSISTANT_GUARDRAILS_VERSION,
      policyVersion: OFFLINE_ASSISTANT_POLICY_VERSION,
      scoringVersion: OFFLINE_ASSISTANT_SCORING_VERSION,
      contextVersion: OFFLINE_ASSISTANT_CONTEXT_VERSION,
    };
    try {
      row = await (prisma as any).realtorAutoReplySettings.findUnique({ where: { realtorId } });
    } catch (error: any) {
      if (error?.code === "P2021") {
        return {
          realtorId,
          enabled: false,
          timezone: "America/Sao_Paulo",
          weekSchedule: this.defaultWeekSchedule(),
          cooldownMinutes: 3,
          maxRepliesPerLeadPer24h: 6,
          rollout,
          versions,
        };
      }
      throw error;
    }
    if (!row) {
      return {
        realtorId,
        enabled: false,
        timezone: "America/Sao_Paulo",
        weekSchedule: this.defaultWeekSchedule(),
        cooldownMinutes: 3,
        maxRepliesPerLeadPer24h: 6,
        rollout,
        versions,
      };
    }

    return {
      realtorId,
      enabled: Boolean(row.enabled),
      timezone: safeTimezone(row.timezone),
      weekSchedule: normalizeWeekSchedule(row.weekSchedule),
      cooldownMinutes: typeof row.cooldownMinutes === "number" ? row.cooldownMinutes : 3,
      maxRepliesPerLeadPer24h: typeof row.maxRepliesPerLeadPer24h === "number" ? row.maxRepliesPerLeadPer24h : 6,
      rollout,
      versions,
    };
  }

  static async upsertSettings(params: {
    realtorId: string;
    enabled: boolean;
    timezone: string;
    weekSchedule: WeekSchedule;
    cooldownMinutes: number;
    maxRepliesPerLeadPer24h: number;
  }) {
    const data = {
      realtorId: params.realtorId,
      enabled: Boolean(params.enabled),
      timezone: safeTimezone(params.timezone),
      weekSchedule: normalizeWeekSchedule(params.weekSchedule),
      cooldownMinutes: Math.max(1, Math.min(60, Math.floor(params.cooldownMinutes || 3))),
      maxRepliesPerLeadPer24h: Math.max(1, Math.min(30, Math.floor(params.maxRepliesPerLeadPer24h || 6))),
    };

    const res = await (prisma as any).realtorAutoReplySettings.upsert({
      where: { realtorId: params.realtorId },
      create: data,
      update: {
        enabled: data.enabled,
        timezone: data.timezone,
        weekSchedule: data.weekSchedule,
        cooldownMinutes: data.cooldownMinutes,
        maxRepliesPerLeadPer24h: data.maxRepliesPerLeadPer24h,
      },
    });

    return {
      realtorId: res.realtorId,
      enabled: Boolean(res.enabled),
      timezone: safeTimezone(res.timezone),
      weekSchedule: normalizeWeekSchedule(res.weekSchedule),
      cooldownMinutes: typeof res.cooldownMinutes === "number" ? res.cooldownMinutes : 3,
      maxRepliesPerLeadPer24h: typeof res.maxRepliesPerLeadPer24h === "number" ? res.maxRepliesPerLeadPer24h : 6,
      rollout: buildOfflineAssistantRolloutOverview(params.realtorId),
      versions: {
        promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
        guardrailsVersion: OFFLINE_ASSISTANT_GUARDRAILS_VERSION,
        policyVersion: OFFLINE_ASSISTANT_POLICY_VERSION,
        scoringVersion: OFFLINE_ASSISTANT_SCORING_VERSION,
        contextVersion: OFFLINE_ASSISTANT_CONTEXT_VERSION,
      },
    };
  }

  static async enqueueForClientMessage(params: { leadId: string; clientMessageId: string }) {
    const lead = await (prisma as any).lead.findUnique({
      where: { id: params.leadId },
      select: { id: true, realtorId: true },
    });

    if (!lead?.realtorId) return { enqueued: false as const, reason: "NO_REALTOR" as const };

    const settings = await this.getSettings(lead.realtorId);
    if (!settings.enabled) return { enqueued: false as const, reason: "DISABLED" as const };
    const outside = isOutsideBusinessHours({
      now: new Date(),
      timezone: settings.timezone,
      schedule: settings.weekSchedule,
    });

    const within = !outside;

    if (!within) return { enqueued: false as const, reason: "OUTSIDE_SCHEDULE" as const };

    const online = await isRealtorOnline(String(lead.realtorId), new Date());
    if (online) return { enqueued: false as const, reason: "REALTOR_ONLINE" as const };

    const jobRow = await (prisma as any).leadAutoReplyJob
      .create({
        data: {
          leadId: params.leadId,
          clientMessageId: params.clientMessageId,
        },
        select: { id: true, leadId: true, clientMessageId: true, status: true },
      })
      .catch(() => null);

    if (!jobRow) return { enqueued: false as const, reason: "DUPLICATE" as const };

    if (leadAutoReplyQueue) {
      await leadAutoReplyQueue
        .add(
          "lead-auto-reply",
          { clientMessageId: params.clientMessageId },
          {
            jobId: `lead-auto-reply:${params.clientMessageId}`,
            delay: 1500,
          }
        )
        .catch(() => null);
    } else {
      try {
        await this.processByClientMessageId(String(params.clientMessageId));
      } catch {
      }
    }

    return { enqueued: true as const };
  }

  static async processByClientMessageId(clientMessageId: string) {
    const job = await (prisma as any).leadAutoReplyJob.findUnique({
      where: { clientMessageId },
    });

    if (!job) return { ok: false as const, status: "SKIPPED" as const, reason: "JOB_NOT_FOUND" };
    if (job.status !== "PENDING") return { ok: true as const, status: job.status as any };

    const locked = await (prisma as any).leadAutoReplyJob.updateMany({
      where: { clientMessageId, status: "PENDING" },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });

    if (!locked?.count) return { ok: true as const, status: "SKIPPED" as const, reason: "ALREADY_TAKEN" };

    const now = new Date();

    try {
      const msg = await prisma.leadClientMessage.findUnique({
        where: { id: clientMessageId },
        select: { id: true, leadId: true, fromClient: true, content: true, createdAt: true },
      });

      if (!msg || !msg.fromClient) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "NOT_A_CLIENT_MESSAGE", processedAt: now },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "NOT_A_CLIENT_MESSAGE" };
      }

      const lead = await (prisma as any).lead.findUnique({
        where: { id: msg.leadId },
        select: {
          id: true,
          realtorId: true,
          contact: { select: { name: true } },
          property: {
            select: {
              title: true,
              description: true,
              city: true,
              state: true,
              neighborhood: true,
              latitude: true,
              longitude: true,
              price: true,
              hidePrice: true,
              condoFee: true,
              hideCondoFee: true,
              iptuYearly: true,
              hideIPTU: true,
              type: true,
              purpose: true,
              bedrooms: true,
              bathrooms: true,
              areaM2: true,
              suites: true,
              parkingSpots: true,
              floor: true,
              furnished: true,
              petFriendly: true,
              conditionTags: true,
              condoRules: true,
              hasBalcony: true,
              hasElevator: true,
              hasPool: true,
              hasGym: true,
              hasPlayground: true,
              hasPartyRoom: true,
              hasGourmet: true,
              hasConcierge24h: true,
              accRamps: true,
              accWideDoors: true,
              accAccessibleElevator: true,
              accTactile: true,
              comfortAC: true,
              comfortHeating: true,
              comfortSolar: true,
              comfortNoiseWindows: true,
              comfortLED: true,
              comfortWaterReuse: true,
              viewSea: true,
              viewCity: true,
              viewRiver: true,
              viewLake: true,
            },
          },
        },
      });

      const leadId = lead?.id ? String(lead.id) : String(msg.leadId);

      if (!lead?.realtorId) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "NO_REALTOR", processedAt: now },
        });
        await this.safeEvent(leadId, "AUTO_REPLY_SKIPPED", { reason: "NO_REALTOR", clientMessageId });
        return { ok: true as const, status: "SKIPPED" as const, reason: "NO_REALTOR" };
      }

      const settings = await this.getSettings(lead.realtorId);

      if (!settings.enabled) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "DISABLED", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "DISABLED", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "DISABLED",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "DISABLED" };
      }

      const outside = isOutsideBusinessHours({ now, timezone: settings.timezone, schedule: settings.weekSchedule });
      if (outside) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "OUTSIDE_SCHEDULE", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "OUTSIDE_SCHEDULE", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "OUTSIDE_SCHEDULE",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "OUTSIDE_SCHEDULE" };
      }

      const online = await isRealtorOnline(String(lead.realtorId), now);
      if (online) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "REALTOR_ONLINE", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "REALTOR_ONLINE", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "REALTOR_ONLINE",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "REALTOR_ONLINE" };
      }

      const lastOverall = await prisma.leadClientMessage.findFirst({
        where: { leadId: lead.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, fromClient: true },
      });

      if (!lastOverall || lastOverall.id !== clientMessageId) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "NOT_LATEST_MESSAGE", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "NOT_LATEST_MESSAGE", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "NOT_LATEST_MESSAGE",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "NOT_LATEST_MESSAGE" };
      }

      const humanAfter = await (prisma as any).leadClientMessage.findFirst({
        where: { leadId: lead.id, fromClient: false, createdAt: { gt: msg.createdAt }, source: "HUMAN" as any },
        select: { id: true },
      });

      if (humanAfter?.id) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "HUMAN_ALREADY_REPLIED", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "HUMAN_ALREADY_REPLIED", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "HUMAN_ALREADY_REPLIED",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "HUMAN_ALREADY_REPLIED" };
      }

      const clientName = safeString(lead.contact?.name) || "";
      const propertyTitle = safeString(lead.property?.title) || "";
      const experiment = resolveOfflineAssistantExperiment({ realtorId: lead.realtorId, leadId: lead.id });
      const propertyQualificationContext = {
        purpose: safeString(lead.property?.purpose) || null,
        price: typeof (lead.property as any)?.price === "number" ? Number((lead.property as any).price) : null,
        bedrooms: typeof lead.property?.bedrooms === "number" ? lead.property.bedrooms : null,
        parkingSpots: typeof (lead.property as any)?.parkingSpots === "number" ? (lead.property as any).parkingSpots : null,
        petFriendly: typeof (lead.property as any)?.petFriendly === "boolean" ? (lead.property as any).petFriendly : null,
        neighborhood: safeString(lead.property?.neighborhood) || null,
        city: safeString(lead.property?.city) || null,
      };

      const lastAi = await (prisma as any).leadClientMessage.findFirst({
        where: { leadId: lead.id, fromClient: false, source: "AUTO_REPLY_AI" as any },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      const shouldIntroduce = !lastAi?.createdAt;

      const apiKey = process.env.OPENAI_API_KEY;

      const lastAutoReplyEvent2 = await (prisma as any).leadEvent
        .findFirst({
          where: { leadId: lead.id, type: "AUTO_REPLY_SENT" as any },
          orderBy: { createdAt: "desc" },
          select: { metadata: true },
        })
        .catch(() => null);
      const prevState2 = readOfflineAssistantState((lastAutoReplyEvent2 as any)?.metadata);

      const heuristicIntent = classifyIntent(msg.content);
      const classifier = apiKey ? await callOpenAiIntentClassifier({ apiKey, message: msg.content }) : null;
      const intent = classifier && classifier.confidence >= 0.6 ? classifier.intent : heuristicIntent;
      if (intent !== "PROPERTY") {
        const extractedSlots = extractOfflineAssistantClientSlots(msg.content);
        const prevState2WithSlots = updateStateClientSlots(prevState2, extractedSlots);
        const isScheduling = intent === "SCHEDULING";
        const tz = safeTimezone(settings.timezone);
        const extractedPrefs = isScheduling ? extractVisitPreferences(msg.content, { now, timeZone: tz }) : null;
        const mergedPrefs = isScheduling
          ? {
              period: safeString((extractedPrefs as any)?.period) || safeString(prevState2WithSlots?.visitPreferences?.period) || null,
              days:
                (Array.isArray((extractedPrefs as any)?.days) && (extractedPrefs as any).days.length
                  ? (extractedPrefs as any).days
                  : prevState2WithSlots?.visitPreferences?.days) ||
                null,
              time: safeString((extractedPrefs as any)?.time) || safeString(prevState2WithSlots?.visitPreferences?.time) || null,
            }
          : null;
        const refusalRequiresHandoff = isScheduling || intent === "FINANCING";
        const refusalStateBase = isScheduling ? updateStateVisitRequested(prevState2WithSlots) : prevState2WithSlots;
        const refusalStateWithVisit = isScheduling && mergedPrefs ? updateStateVisitPreferences(refusalStateBase, mergedPrefs) : refusalStateBase;
        const refusalQualificationBase = computeQualification({
          slots: refusalStateWithVisit.clientSlots,
          visitRequested: Boolean(refusalStateWithVisit.visitRequested),
          visitPreferences: refusalStateWithVisit.visitPreferences || null,
          handoffNeeded: refusalRequiresHandoff,
          message: msg.content,
          property: propertyQualificationContext,
        });
        const refusalHandoffReason = detectHandoffReason({
          message: msg.content,
          intent,
          visitRequested: Boolean(refusalStateWithVisit.visitRequested),
          slots: refusalStateWithVisit.clientSlots,
          finalHandoffNeeded: refusalRequiresHandoff,
          missingInfo: refusalQualificationBase.missingCriticalInfo,
        });
        const refusalHandoff = buildHandoffDecision({
          needed: refusalRequiresHandoff,
          reason: refusalHandoffReason,
          leadTemperature: refusalQualificationBase.leadTemperature,
          visitRequested: Boolean(refusalStateWithVisit.visitRequested),
          qualificationScore: refusalQualificationBase.score,
          commercialSummary: refusalQualificationBase.commercialSummary,
        });
        const refusalCommercialSummary = buildCommercialSummary({
          slots: refusalStateWithVisit.clientSlots,
          qualification: refusalQualificationBase,
          visitRequested: Boolean(refusalStateWithVisit.visitRequested),
          visitPreferences: refusalStateWithVisit.visitPreferences || null,
          handoff: refusalHandoff,
        });
        const refusalQualification: OfflineAssistantQualification = {
          ...refusalQualificationBase,
          commercialSummary: refusalCommercialSummary,
        };
        const refusalPropertyContext = buildPropertyContextFromLead({
          lead,
          propertyTitle,
          slots: refusalStateWithVisit.clientSlots,
        });
        const refusalHandoffDecision = buildHandoffDecision({
          needed: refusalRequiresHandoff,
          reason: refusalHandoffReason,
          leadTemperature: refusalQualification.leadTemperature,
          visitRequested: Boolean(refusalStateWithVisit.visitRequested),
          qualificationScore: refusalQualification.score,
          commercialSummary: refusalCommercialSummary,
        });
        const refusalFallbackQuestion = isScheduling ? "" : extractLastQuestion(prevState2.lastQuestion || "");
        const refusalPolicy = chooseConversationPolicy({
          slots: refusalStateWithVisit.clientSlots,
          qualification: refusalQualification,
          handoff: refusalHandoffDecision,
          visitRequested: Boolean(refusalStateWithVisit.visitRequested),
          visitPreferences: refusalStateWithVisit.visitPreferences || null,
          fallbackNextQuestion: refusalFallbackQuestion,
        });
        const refusalOperationalPlaybook = buildOperationalPlaybookFromState({
          clientName,
          propertyTitle,
          slots: refusalStateWithVisit.clientSlots,
          qualification: refusalQualification,
          handoff: refusalHandoffDecision,
          policy: refusalPolicy,
          visitRequested: Boolean(refusalStateWithVisit.visitRequested),
          visitPreferences: refusalStateWithVisit.visitPreferences || null,
          propertyContext: refusalPropertyContext,
        });

        const refusal = isScheduling
          ? buildSchedulingAutoReply({ clientName, propertyTitle, includeIntro: shouldIntroduce, preferences: mergedPrefs })
          : buildRefusalReply({
              clientName,
              propertyTitle,
              includeIntro: shouldIntroduce,
              reason: intent === "FINANCING" ? "FINANCING" : intent === "OFF_TOPIC" ? "OFF_TOPIC" : "UNCLEAR",
            });
        const refusalNextQuestion = refusalPolicy.shouldAskFollowUp ? safeString(refusalPolicy.nextQuestion) : "";
        const refusalMessage = refusalNextQuestion ? `${refusal}\n\n${refusalNextQuestion}` : refusal;

        const refusalGuardrails = applyOfflineAutoReplyGuardrailsDetailed({
          draft: refusalMessage,
          clientName,
          propertyTitle,
          message: msg.content,
          handoffReason: refusalHandoffReason,
        });

        const finalText = refusalGuardrails.draft || buildGenericFallbackReply({ clientName, propertyTitle, includeIntro: shouldIntroduce });

        const assistantMessage = await (prisma as any).leadClientMessage.create({
          data: {
            leadId: lead.id,
            fromClient: false,
            content: finalText,
            source: "AUTO_REPLY_AI" as any,
          },
          select: { id: true, content: true, createdAt: true },
        });

        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SENT", processedAt: now },
        });

        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            assistantMessageId: assistantMessage.id,
            decision: "SENT",
            reason: intent,
            model: null,
            promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
          },
        });

        const stateAfterRefusalBase = updateStateWithQuestion(refusalStateWithVisit, refusalNextQuestion || extractLastQuestion(finalText));
        const stateAfterRefusal = updateStateWithIntelligence(stateAfterRefusalBase, {
          conversationMode: refusalPolicy.conversationMode,
          qualification: refusalQualification,
          handoff: refusalHandoffDecision,
          recommendedAction: refusalPolicy.recommendedAction,
          intent,
          commercialSummary: refusalCommercialSummary,
        });

        await this.safeEvent(lead.id, "AUTO_REPLY_SENT", {
          clientMessageId,
          assistantMessageId: assistantMessage.id,
          model: null,
          refusal: true,
          intent,
          intentMeta: {
            source: classifier && classifier.confidence >= 0.6 ? "llm" : "heuristic",
            heuristicIntent,
            llmIntent: classifier?.intent || null,
            llmConfidence: classifier?.confidence ?? null,
            llmModel: classifier?.model || null,
          },
          promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
          offlineAssistantState: stateAfterRefusal,
          qualification: refusalQualification,
          handoff: refusalHandoffDecision,
          policy: refusalPolicy,
          commercialSummary: refusalCommercialSummary,
          propertyContext: refusalPropertyContext,
          operationalPlaybook: refusalOperationalPlaybook,
          experiment,
          guardrails: {
            version: OFFLINE_ASSISTANT_GUARDRAILS_VERSION,
            appliedRules: refusalGuardrails.appliedRules,
            scenario: refusalGuardrails.scenario,
          },
        });

        if (intent === "SCHEDULING") {
          try {
            const tz = safeTimezone(settings.timezone);
            const prefs = extractVisitPreferences(msg.content, { now, timeZone: tz });
            const hasAnyPrefs = Boolean(
              safeString((prefs as any)?.period) || safeString((prefs as any)?.time) || (Array.isArray((prefs as any)?.days) && (prefs as any).days.length)
            );
            if (!prevState2WithSlots.visitRequested || hasAnyPrefs) {
              await LeadEventService.record({
                leadId: lead.id,
                type: "VISIT_REQUESTED" as any,
                title: "VISIT_REQUESTED",
                metadata: {
                  clientMessageId,
                  source: classifier && classifier.confidence >= 0.6 ? "llm" : "heuristic",
                  heuristicIntent,
                  llmIntent: classifier?.intent || null,
                  llmConfidence: classifier?.confidence ?? null,
                  promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
                  preferences: prefs,
                },
              });
            }
          } catch {}
        }

        try {
          const pusher = getPusherServer();
          await pusher.trigger(PUSHER_CHANNELS.CHAT(lead.id), PUSHER_EVENTS.NEW_CHAT_MESSAGE, {
            id: assistantMessage.id,
            leadId: lead.id,
            fromClient: false,
            content: assistantMessage.content,
            createdAt: assistantMessage.createdAt,
            source: "AUTO_REPLY_AI",
          });
        } catch {}

        try {
          if (lead.realtorId) {
            await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
          }
        } catch {}

        return { ok: true as const, status: "SENT" as const };
      }

      const recent = await prisma.leadClientMessage.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { fromClient: true, content: true, createdAt: true, source: true },
      });

      const historyBase = recent
        .slice()
        .reverse()
        .map((m: any) => {
          const who = m.fromClient ? "Cliente" : String(m?.source) === "AUTO_REPLY_AI" ? "Assistente" : "Corretor";
          return `${who}: ${safeString(m.content)}`;
        })
        .filter(Boolean)
        .join("\n");

      const lastAutoReplyEvent = await (prisma as any).leadEvent
        .findFirst({
          where: { leadId: lead.id, type: "AUTO_REPLY_SENT" as any },
          orderBy: { createdAt: "desc" },
          select: { metadata: true },
        })
        .catch(() => null);
      const prevState = readOfflineAssistantState((lastAutoReplyEvent as any)?.metadata);
      const lastNextQuestion = safeString((lastAutoReplyEvent as any)?.metadata?.aiJson?.nextQuestion) || safeString(prevState.lastQuestion);
      const history = [historyBase, lastNextQuestion ? `Assistente(pergunta anterior): ${lastNextQuestion}` : ""].filter(Boolean).join("\n");

      const extractedSlots = extractOfflineAssistantClientSlots(msg.content);
      const prevStateWithSlots = updateStateClientSlots(prevState, extractedSlots);

      const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const aiCount = await (prisma as any).leadClientMessage.count({
        where: { leadId: lead.id, fromClient: false, source: "AUTO_REPLY_AI" as any, createdAt: { gte: since24h } },
      });

      if (aiCount >= settings.maxRepliesPerLeadPer24h) {
        const fallback = buildGenericFallbackReply({ clientName, propertyTitle, includeIntro: false });
        const assistantMessage = await (prisma as any).leadClientMessage.create({
          data: {
            leadId: lead.id,
            fromClient: false,
            content: fallback,
            source: "AUTO_REPLY_AI" as any,
          },
          select: { id: true, content: true, createdAt: true },
        });

        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SENT", processedAt: now },
        });

        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            assistantMessageId: assistantMessage.id,
            decision: "SENT",
            reason: "RATE_LIMIT",
            model: null,
            promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
          },
        });

        await this.safeEvent(lead.id, "AUTO_REPLY_SENT", {
          clientMessageId,
          assistantMessageId: assistantMessage.id,
          model: null,
          fallback: true,
          reason: "RATE_LIMIT",
          promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
        });

        try {
          const pusher = getPusherServer();
          await pusher.trigger(PUSHER_CHANNELS.CHAT(lead.id), PUSHER_EVENTS.NEW_CHAT_MESSAGE, {
            id: assistantMessage.id,
            leadId: lead.id,
            fromClient: false,
            content: assistantMessage.content,
            createdAt: assistantMessage.createdAt,
            source: "AUTO_REPLY_AI",
          });
        } catch {}

        try {
          if (lead.realtorId) {
            await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
          }
        } catch {}

        return { ok: true as const, status: "SENT" as const };
      }

      const city = safeString(lead.property?.city) || "";
      const state = safeString(lead.property?.state) || "";
      const neighborhood = safeString(lead.property?.neighborhood) || "";
      const type = safeString(lead.property?.type) || "";
      const purpose = safeString(lead.property?.purpose) || "";
      const bedrooms = typeof lead.property?.bedrooms === "number" ? String(lead.property.bedrooms) : "";
      const bathrooms = typeof lead.property?.bathrooms === "number" ? String(lead.property.bathrooms) : "";
      const areaM2 = typeof lead.property?.areaM2 === "number" ? String(lead.property.areaM2) : "";

      const suites = typeof (lead.property as any)?.suites === "number" ? String((lead.property as any).suites) : "";
      const parkingSpots = typeof (lead.property as any)?.parkingSpots === "number" ? String((lead.property as any).parkingSpots) : "";
      const floor = typeof (lead.property as any)?.floor === "number" ? String((lead.property as any).floor) : "";
      const furnished =
        typeof (lead.property as any)?.furnished === "boolean" ? ((lead.property as any).furnished ? "Sim" : "Não") : "";
      const petFriendly =
        typeof (lead.property as any)?.petFriendly === "boolean" ? ((lead.property as any).petFriendly ? "Sim" : "Não") : "";

      const price = (lead.property as any)?.hidePrice ? "Consulte" : formatBRLFromCents((lead.property as any)?.price) || "Consulte";
      const condoFee =
        (lead.property as any)?.hideCondoFee ? "Consulte" : formatBRLFromCents((lead.property as any)?.condoFee) || "";
      const iptuYearly = (lead.property as any)?.hideIPTU ? "Consulte" : formatBRLFromCents((lead.property as any)?.iptuYearly) || "";

      const latitude = typeof (lead.property as any)?.latitude === "number" ? (lead.property as any).latitude : null;
      const longitude = typeof (lead.property as any)?.longitude === "number" ? (lead.property as any).longitude : null;

      const placesCat = detectPlacesCategory(msg.content);
      if (placesCat && latitude != null && longitude != null) {
        const places = await fetchPlacesNearby({ lat: latitude, lng: longitude, radiusM: 2500, perCat: 8 }).catch(() => null);
        const itemsRaw = places ? (places as any)?.[placesCat.key] : null;
        const items = Array.isArray(itemsRaw) ? itemsRaw : [];
        const scored = items
          .map((it: any) => {
            const name = safeString(it?.name);
            const lat = typeof it?.lat === "number" ? it.lat : null;
            const lng = typeof it?.lng === "number" ? it.lng : null;
            if (!name || lat == null || lng == null) return null;
            const distM = haversineMeters(latitude, longitude, lat, lng);
            return { name, distM };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.distM - b.distM)
          .slice(0, 3);

        const intro = shouldIntroduce ? buildAssistantIntro(clientName) : "";
        const about = propertyTitle ? `Sobre o imóvel ${propertyTitle}, ` : "Sobre o imóvel, ";
        const list = scored
          .map((x: any) => {
            const d = formatDistancePtBR(x.distM);
            return d ? `- ${x.name} (${d})` : `- ${x.name}`;
          })
          .join("\n");

        const extractedSlots = extractOfflineAssistantClientSlots(msg.content);
        const stateWithSlots = updateStateClientSlots(prevState, extractedSlots);
        const placesQualificationBase = computeQualification({
          slots: stateWithSlots.clientSlots,
          visitRequested: Boolean(stateWithSlots.visitRequested),
          visitPreferences: stateWithSlots.visitPreferences || null,
          handoffNeeded: false,
          message: msg.content,
          property: propertyQualificationContext,
        });
        const placesHandoff = buildHandoffDecision({
          needed: false,
          reason: null,
          leadTemperature: placesQualificationBase.leadTemperature,
          visitRequested: Boolean(stateWithSlots.visitRequested),
          qualificationScore: placesQualificationBase.score,
          commercialSummary: placesQualificationBase.commercialSummary,
        });
        const placesCommercialSummary = buildCommercialSummary({
          slots: stateWithSlots.clientSlots,
          qualification: placesQualificationBase,
          visitRequested: Boolean(stateWithSlots.visitRequested),
          visitPreferences: stateWithSlots.visitPreferences || null,
          handoff: placesHandoff,
        });
        const placesQualification: OfflineAssistantQualification = {
          ...placesQualificationBase,
          commercialSummary: placesCommercialSummary,
        };
        const placesPolicy = chooseConversationPolicy({
          slots: stateWithSlots.clientSlots,
          qualification: placesQualification,
          handoff: buildHandoffDecision({
            needed: false,
            reason: null,
            leadTemperature: placesQualification.leadTemperature,
            visitRequested: Boolean(stateWithSlots.visitRequested),
            qualificationScore: placesQualification.score,
            commercialSummary: placesCommercialSummary,
          }),
          visitRequested: Boolean(stateWithSlots.visitRequested),
          visitPreferences: stateWithSlots.visitPreferences || null,
          fallbackNextQuestion: chooseNextQuestion({ history, state: stateWithSlots }),
        });
        const nextQuestion = placesPolicy.shouldAskFollowUp ? safeString(placesPolicy.nextQuestion) : "";
        const stateWithPlacesIntelligence = updateStateWithIntelligence(updateStateWithQuestion(stateWithSlots, nextQuestion), {
          conversationMode: placesPolicy.conversationMode,
          qualification: placesQualification,
          handoff: placesHandoff,
          recommendedAction: placesPolicy.recommendedAction,
          intent: "PROPERTY",
          commercialSummary: placesCommercialSummary,
        });
        const placesPropertyContext = buildPropertyContextFromLead({
          lead,
          propertyTitle,
          slots: stateWithSlots.clientSlots,
        });
        const placesOperationalPlaybook = buildOperationalPlaybookFromState({
          clientName,
          propertyTitle,
          slots: stateWithSlots.clientSlots,
          qualification: placesQualification,
          handoff: placesHandoff,
          policy: placesPolicy,
          visitRequested: Boolean(stateWithSlots.visitRequested),
          visitPreferences: stateWithSlots.visitPreferences || null,
          propertyContext: placesPropertyContext,
        });
        const answer =
          intro +
          `${about}encontrei ${placesCat.label} próximos (distâncias aproximadas):\n` +
          (list || "(sem resultados no momento)") +
          (nextQuestion ? `\n\n${nextQuestion}` : "");

        const placesGuardrails = applyOfflineAutoReplyGuardrailsDetailed({ draft: answer, clientName, propertyTitle, message: msg.content });
        const draft = placesGuardrails.draft;
        const finalText = draft || buildGenericFallbackReply({ clientName, propertyTitle, includeIntro: shouldIntroduce });

        const assistantMessage = await (prisma as any).leadClientMessage.create({
          data: {
            leadId: lead.id,
            fromClient: false,
            content: finalText,
            source: "AUTO_REPLY_AI" as any,
          },
          select: { id: true, content: true, createdAt: true },
        });

        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SENT", processedAt: now },
        });

        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            assistantMessageId: assistantMessage.id,
            decision: "SENT",
            reason: "PLACES_NEARBY",
            model: null,
            promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
          },
        });

        await this.safeEvent(lead.id, "AUTO_REPLY_SENT", {
          clientMessageId,
          assistantMessageId: assistantMessage.id,
          model: null,
          promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
          offlineAssistantState: stateWithPlacesIntelligence,
          qualification: placesQualification,
          handoff: placesHandoff,
          policy: placesPolicy,
          commercialSummary: placesCommercialSummary,
          propertyContext: placesPropertyContext,
          operationalPlaybook: placesOperationalPlaybook,
          experiment,
          guardrails: {
            version: OFFLINE_ASSISTANT_GUARDRAILS_VERSION,
            appliedRules: placesGuardrails.appliedRules,
            scenario: placesGuardrails.scenario,
          },
          tool: {
            name: "places-nearby",
            category: placesCat.key,
            results: scored.map((x: any) => ({ name: x.name, distM: x.distM })),
          },
        });

        try {
          const pusher = getPusherServer();
          await pusher.trigger(PUSHER_CHANNELS.CHAT(lead.id), PUSHER_EVENTS.NEW_CHAT_MESSAGE, {
            id: assistantMessage.id,
            leadId: lead.id,
            fromClient: false,
            content: assistantMessage.content,
            createdAt: assistantMessage.createdAt,
            source: "AUTO_REPLY_AI",
          });
        } catch {}

        try {
          if (lead.realtorId) {
            await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
          }
        } catch {}

        return { ok: true as const, status: "SENT" as const };
      }

      if (!apiKey) {
        const fallback = buildGenericFallbackReply({ clientName, propertyTitle, includeIntro: shouldIntroduce });
        const assistantMessage = await (prisma as any).leadClientMessage.create({
          data: {
            leadId: lead.id,
            fromClient: false,
            content: fallback,
            source: "AUTO_REPLY_AI" as any,
          },
          select: { id: true, content: true, createdAt: true },
        });

        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SENT", processedAt: now },
        });

        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            assistantMessageId: assistantMessage.id,
            decision: "SENT",
            reason: "OPENAI_API_KEY_MISSING",
            model: null,
            promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
          },
        });

        await this.safeEvent(lead.id, "AUTO_REPLY_SENT", {
          clientMessageId,
          assistantMessageId: assistantMessage.id,
          model: null,
          fallback: true,
          reason: "OPENAI_API_KEY_MISSING",
          promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
        });

        try {
          const pusher = getPusherServer();
          await pusher.trigger(PUSHER_CHANNELS.CHAT(lead.id), PUSHER_EVENTS.NEW_CHAT_MESSAGE, {
            id: assistantMessage.id,
            leadId: lead.id,
            fromClient: false,
            content: assistantMessage.content,
            createdAt: assistantMessage.createdAt,
            source: "AUTO_REPLY_AI",
          });
        } catch {}

        try {
          if (lead.realtorId) {
            await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
          }
        } catch {}

        return { ok: true as const, status: "SENT" as const };
      }

      const systemPrompt =
        "Você é um assistente de atendimento do chat do site (pt-BR) para corretores de imóveis no Brasil.\n" +
        "Você está respondendo enquanto o corretor está offline (fora do horário comercial configurado).\n" +
        "Objetivo: manter o cliente engajado, esclarecer dúvidas básicas do imóvel usando SOMENTE os dados fornecidos e coletar o próximo melhor passo comercial.\n" +
        "Política anti-chute: se a informação não estiver nos dados fornecidos, diga claramente que não consta no anúncio, liste o que faltou em missing_info e NÃO invente.\n" +
        "Estilo: seja formal, humano e direto; comece a resposta reconhecendo a mensagem do cliente (ex.: 'Entendi.' / 'Perfeito.'); evite iniciar com negação; não seja excessivamente robótico.\n" +
        "Se a pergunta do cliente for sobre algo que não consta no anúncio, responda de forma direta e não faça pergunta adicional (next_question vazio), encaminhando para o corretor confirmar.\n" +
        "Use handoff_needed=true quando o assunto depender do corretor (ex.: proposta/negociação, endereço exato, documentação/contrato, condições específicas de locação/garantias, disponibilidade/visita, ou qualquer confirmação fora do anúncio).\n" +
        "Regras: responda apenas sobre o anúncio; não invente informações; não use links/telefone; não agende/CONFIRME visitas; não sugira horários/dias; não prometa retorno em X minutos.\n" +
        "Saída: responda SOMENTE com um objeto JSON válido (sem markdown, sem texto fora do JSON) com as chaves: answer, facts_used, missing_info, next_question, handoff_needed, conversation_mode, handoff_reason, recommended_next_step, lead_temperature_hint, objections_detected.\n" +
        "facts_used deve ser uma lista com as chaves dos dados realmente usados na resposta.\n" +
        "conversation_mode deve ser um entre INFO_MODE, QUALIFICATION_MODE, CONVERSION_MODE ou HANDOFF_MODE.\n" +
        "handoff_reason deve ser um entre SCHEDULING, NEGOTIATION, FINANCING, DOCUMENTATION, LOCATION_DETAILS, PROPERTY_LIMITATION, OFF_TOPIC ou OTHER.\n" +
        "lead_temperature_hint deve ser HOT, WARM ou COLD.\n" +
        "objections_detected deve ser uma lista curta de objeções percebidas do cliente, ou lista vazia.\n" +
        "answer deve ser curta, humana e direta (máximo ~5 linhas).";

      const lines: string[] = [];
      if (clientName) lines.push(`Nome do cliente: ${clientName}`);
      if (propertyTitle) lines.push(`Imóvel: ${propertyTitle}`);
      if (city || state) lines.push(`Local: ${[neighborhood, city, state].filter(Boolean).join(" - ")}`);
      if (type) lines.push(`Tipo: ${type}`);
      if (purpose) lines.push(`Finalidade: ${purpose}`);
      lines.push(`Preço: ${price}`);
      if (condoFee) lines.push(`Condomínio: ${condoFee}`);
      if (iptuYearly) lines.push(`IPTU (anual): ${iptuYearly}`);
      if (bedrooms) lines.push(`Quartos: ${bedrooms}`);
      if (suites) lines.push(`Suítes: ${suites}`);
      if (bathrooms) lines.push(`Banheiros: ${bathrooms}`);
      if (parkingSpots) lines.push(`Vagas: ${parkingSpots}`);
      if (floor) lines.push(`Andar: ${floor}`);
      if (furnished) lines.push(`Mobiliado: ${furnished}`);
      if (petFriendly) lines.push(`Aceita pets: ${petFriendly}`);
      if (areaM2) lines.push(`Área: ${areaM2} m²`);

      const description = clampText(safeString((lead.property as any)?.description), 700);
      const condoRules = clampText(safeString((lead.property as any)?.condoRules), 500);
      const amenities = buildAmenitiesFromProperty(lead.property);
      const propertyContextForPrompt = buildPropertyContextFromLead({
        lead,
        propertyTitle,
        slots: prevStateWithSlots.clientSlots,
      });
      if (description) lines.push(`Descrição do anúncio: ${description}`);
      if (amenities.length) lines.push(`Itens/condomínio: ${amenities.join(", ")}`);
      if (condoRules) lines.push(`Regras do condomínio: ${condoRules}`);
      if (experiment.variant === "COPILOT_V2") {
        lines.push(`Resumo comercial do imóvel: ${propertyContextForPrompt.propertySummary}`);
        lines.push(`Contexto de região e aderência: ${propertyContextForPrompt.regionSummary}`);
        if (propertyContextForPrompt.fitHighlights.length) lines.push(`Sinais de aderência: ${propertyContextForPrompt.fitHighlights.join(", ")}`);
        if (propertyContextForPrompt.attentionFlags.length) lines.push(`Pontos de atenção comerciais: ${propertyContextForPrompt.attentionFlags.join(", ")}`);
      }

      const userPrompt =
        lines.join("\n") +
        "\n\nChaves permitidas para facts_used: " +
        OFFLINE_ASSISTANT_FACT_KEYS.join(", ") +
        "\n\nHistórico recente do chat:\n" +
        (history || "(sem histórico)") +
        `\n\nEsta é sua primeira resposta nesta conversa? ${shouldIntroduce ? "Sim" : "Não"}.` +
        (prevStateWithSlots.clientSlots ? `\n\nPreferências já informadas pelo cliente (resumo): ${formatOfflineAssistantClientSlots(prevStateWithSlots.clientSlots)}` : "") +
        (prevStateWithSlots.commercialSummary ? `\n\nResumo comercial atual: ${prevStateWithSlots.commercialSummary}` : "") +
        (experiment.variant === "COPILOT_V2" ? "\n\nModo experimental ativo: priorize clareza comercial, contexto do imóvel/região e próximo melhor passo sem inventar informação." : "") +
        "\n\nAgora responda no formato JSON pedido.";

      const ai = await callOpenAiText({ apiKey, systemPrompt, userPrompt });
      const rawDraft = ai?.content ? String(ai.content) : "";

      const parsed = rawDraft ? parseOfflineAssistantAiJson(rawDraft) : ({ ok: false, error: "EMPTY_AI_OUTPUT" } as const);

      const handoffNeeded = parsed.ok ? Boolean(parsed.value.handoff_needed) : false;
      const heuristicHandoffNeeded = detectGeneralHandoffHeuristic(msg.content);
      const finalHandoffNeeded = handoffNeeded || heuristicHandoffNeeded;
      const msgNorm = normalizeTextForMatch(msg.content);
      const visitHandoffNeeded =
        finalHandoffNeeded &&
        includesAny(msgNorm, [
          "agend",
          "agenda",
          "marcar",
          "visita",
          "horario",
          "disponibil",
          /\b\d{1,2}:\d{2}\b/,
          /\b\d{1,2}h\b/i,
          /\b\d{1,2}h\d{2}\b/i,
        ]);
      const tz = safeTimezone(settings.timezone);
      const extractedVisitPrefs = visitHandoffNeeded ? extractVisitPreferences(msg.content, { now, timeZone: tz }) : null;
      const mergedVisitPrefs = visitHandoffNeeded
        ? {
            period: safeString((extractedVisitPrefs as any)?.period) || safeString(prevStateWithSlots?.visitPreferences?.period) || null,
            days:
              (Array.isArray((extractedVisitPrefs as any)?.days) && (extractedVisitPrefs as any).days.length
                ? (extractedVisitPrefs as any).days
                : prevStateWithSlots?.visitPreferences?.days) ||
              null,
            time: safeString((extractedVisitPrefs as any)?.time) || safeString(prevStateWithSlots?.visitPreferences?.time) || null,
          }
        : null;

      const serverNextQuestion = chooseNextQuestion({ history, state: prevStateWithSlots });
      const modelNextQuestion = parsed.ok ? safeString(parsed.value.next_question) : "";
      const missingInfo = parsed.ok && Array.isArray(parsed.value.missing_info) ? parsed.value.missing_info : [];
      const aiObjections = parsed.ok && Array.isArray(parsed.value.objections_detected) ? parsed.value.objections_detected : [];
      const mergedClientSlots = (() => {
        const currentSlots = prevStateWithSlots.clientSlots;
        const currentObjections = Array.isArray(currentSlots?.objections) ? currentSlots.objections.map((x: any) => safeString(x)).filter(Boolean) : [];
        const nextObjections = Array.from(new Set([...currentObjections, ...aiObjections.map((x: any) => safeString(x)).filter(Boolean)]));
        if (!nextObjections.length) return currentSlots;
        return {
          ...(currentSlots || {}),
          objections: nextObjections,
        } as OfflineAssistantClientSlots;
      })();
      const stateWithCommercialSignals = mergedClientSlots === prevStateWithSlots.clientSlots ? prevStateWithSlots : { ...prevStateWithSlots, clientSlots: mergedClientSlots };
      const effectiveVisitRequested = Boolean(stateWithCommercialSignals.visitRequested || visitHandoffNeeded);
      const effectiveVisitPreferences = visitHandoffNeeded
        ? mergedVisitPrefs || extractedVisitPrefs
        : stateWithCommercialSignals.visitPreferences || null;

      const rawAnswer = parsed.ok ? safeString(parsed.value.answer) : "";
      const factsUsed = parsed.ok ? parsed.value.facts_used : [];
      const likelyFactual = isLikelyFactualAnswer(rawAnswer);
      const factualWithoutFacts = Boolean(likelyFactual && factsUsed.length === 0);
      const propertyLimitationHandoff = !finalHandoffNeeded && missingInfo.length > 0 && likelyFactual;
      const qualificationDraft = computeQualification({
        slots: stateWithCommercialSignals.clientSlots,
        visitRequested: effectiveVisitRequested,
        visitPreferences: effectiveVisitPreferences,
        handoffNeeded: finalHandoffNeeded || propertyLimitationHandoff,
        message: msg.content,
        property: propertyQualificationContext,
      });
      const qualificationCompleteHandoff =
        !finalHandoffNeeded &&
        !propertyLimitationHandoff &&
        qualificationDraft.recommendedAction === "REGISTER_AND_HANDOFF" &&
        qualificationDraft.dataCompleteness >= 70 &&
        qualificationDraft.leadTemperature !== "COLD";
      const computedHandoffNeeded = finalHandoffNeeded || propertyLimitationHandoff || qualificationCompleteHandoff;
      const qualificationBase =
        computedHandoffNeeded === (finalHandoffNeeded || propertyLimitationHandoff)
          ? qualificationDraft
          : computeQualification({
              slots: stateWithCommercialSignals.clientSlots,
              visitRequested: effectiveVisitRequested,
              visitPreferences: effectiveVisitPreferences,
              handoffNeeded: computedHandoffNeeded,
              message: msg.content,
              property: propertyQualificationContext,
            });
      const handoffReason = computedHandoffNeeded
        ? detectHandoffReason({
            message: msg.content,
            intent,
            visitRequested: effectiveVisitRequested,
            slots: stateWithCommercialSignals.clientSlots,
            finalHandoffNeeded: computedHandoffNeeded,
            missingInfo,
          }) || (qualificationCompleteHandoff ? "QUALIFICATION_COMPLETE" : null)
        : null;
      const baseHandoffDecision = buildHandoffDecision({
        needed: computedHandoffNeeded,
        reason: handoffReason,
        leadTemperature: qualificationBase.leadTemperature,
        visitRequested: effectiveVisitRequested,
        qualificationScore: qualificationBase.score,
        commercialSummary: qualificationBase.commercialSummary,
      });
      const commercialSummary = buildCommercialSummary({
        slots: stateWithCommercialSignals.clientSlots,
        qualification: qualificationBase,
        visitRequested: effectiveVisitRequested,
        visitPreferences: effectiveVisitPreferences,
        handoff: baseHandoffDecision,
      });
      const qualification: OfflineAssistantQualification = {
        ...qualificationBase,
        commercialSummary,
      };
      const propertyContext = buildPropertyContextFromLead({
        lead,
        propertyTitle,
        slots: stateWithCommercialSignals.clientSlots,
      });
      const handoffDecision = buildHandoffDecision({
        needed: computedHandoffNeeded,
        reason: handoffReason,
        leadTemperature: qualification.leadTemperature,
        visitRequested: effectiveVisitRequested,
        qualificationScore: qualification.score,
        commercialSummary,
      });
      const policy = chooseConversationPolicy({
        slots: stateWithCommercialSignals.clientSlots,
        qualification,
        handoff: handoffDecision,
        visitRequested: effectiveVisitRequested,
        visitPreferences: effectiveVisitPreferences,
        fallbackNextQuestion: modelNextQuestion || serverNextQuestion,
      });
      const operationalPlaybook = buildOperationalPlaybookFromState({
        clientName,
        propertyTitle,
        slots: stateWithCommercialSignals.clientSlots,
        qualification,
        handoff: handoffDecision,
        policy,
        visitRequested: effectiveVisitRequested,
        visitPreferences: effectiveVisitPreferences,
        propertyContext,
      });
      const nextQuestion = policy.shouldAskFollowUp ? safeString(policy.nextQuestion) : "";
      const nextStateBase = updateStateWithQuestion(stateWithCommercialSignals, nextQuestion);
      const nextStateWithVisit = effectiveVisitRequested
        ? updateStateVisitPreferences(updateStateVisitRequested(nextStateBase), effectiveVisitPreferences)
        : nextStateBase;
      const nextStateWithIntelligence = updateStateWithIntelligence(nextStateWithVisit, {
        conversationMode: policy.conversationMode,
        qualification,
        handoff: handoffDecision,
        recommendedAction: policy.recommendedAction,
        intent,
        commercialSummary,
      });

      const sendReason =
        !parsed.ok
          ? parsed.error === "EMPTY_AI_OUTPUT"
            ? "EMPTY_AI_OUTPUT"
            : "AI_JSON_PARSE_FAILED"
          : factualWithoutFacts
            ? "FACTUAL_WITHOUT_FACTS"
            : null;

      let answerText = visitHandoffNeeded
        ? buildSchedulingAutoReply({ clientName, propertyTitle, includeIntro: shouldIntroduce, preferences: mergedVisitPrefs || extractedVisitPrefs })
        : rawAnswer;
      if (!answerText || !parsed.ok) {
        answerText = buildGenericFallbackReply({ clientName, propertyTitle, includeIntro: shouldIntroduce });
      } else if (factualWithoutFacts) {
        const intro = shouldIntroduce ? buildAssistantIntro(clientName) : "";
        const about = propertyTitle ? `Sobre o imóvel ${propertyTitle}, ` : "Sobre o imóvel, ";
        answerText =
          intro +
          `${about}essa informação não consta no anúncio.\n\n` +
          "Se você quiser, eu posso registrar essa dúvida para o corretor, que confirma com você assim que possível.";
      } else if (handoffDecision.needed && !visitHandoffNeeded) {
        answerText =
          `${safeString(answerText)}\n\n` +
          "Se você quiser, eu posso registrar sua solicitação para o corretor, que confirma com você assim que possível.";
      }

      const normalizedAnswer = normalizeTextForMatch(answerText);
      const alreadyIntroduced =
        normalizedAnswer.includes("sou a assistente") ||
        normalizedAnswer.includes("assistente virtual") ||
        normalizedAnswer.includes("sou o assistente") ||
        normalizedAnswer.includes("sou a assistente virtual do corretor") ||
        normalizedAnswer.includes("sou o assistente virtual do corretor");

      const answerWithIntro = shouldIntroduce && !alreadyIntroduced ? buildAssistantIntro(clientName) + answerText : answerText;
      const messageWithQuestion = nextQuestion ? `${answerWithIntro}\n\n${nextQuestion}` : answerWithIntro;

      const guardrails = messageWithQuestion
        ? applyOfflineAutoReplyGuardrailsDetailed({
            draft: messageWithQuestion,
            clientName,
            propertyTitle,
            message: msg.content,
            handoffReason,
          })
        : { draft: "", appliedRules: [] as string[], scenario: null as string | null };
      const draft = guardrails.draft;

      if (!draft) {
        const fallback = buildGenericFallbackReply({ clientName, propertyTitle, includeIntro: shouldIntroduce });
        const assistantMessage = await (prisma as any).leadClientMessage.create({
          data: {
            leadId: lead.id,
            fromClient: false,
            content: fallback,
            source: "AUTO_REPLY_AI" as any,
          },
          select: { id: true, content: true, createdAt: true },
        });

        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SENT", processedAt: now },
        });

        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            assistantMessageId: assistantMessage.id,
            decision: "SENT",
            reason: "EMPTY_AI_OUTPUT",
            model: ai?.model || null,
            promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
          },
        });

        await this.safeEvent(lead.id, "AUTO_REPLY_SENT", {
          clientMessageId,
          assistantMessageId: assistantMessage.id,
          model: ai?.model || null,
          fallback: true,
          reason: "EMPTY_AI_OUTPUT",
          offlineAssistantState: nextStateWithIntelligence,
          qualification,
          handoff: handoffDecision,
          policy,
          commercialSummary,
          propertyContext,
          operationalPlaybook,
          experiment,
          guardrails: {
            version: OFFLINE_ASSISTANT_GUARDRAILS_VERSION,
            appliedRules: guardrails.appliedRules,
            scenario: guardrails.scenario,
          },
        });

        try {
          const pusher = getPusherServer();
          await pusher.trigger(PUSHER_CHANNELS.CHAT(lead.id), PUSHER_EVENTS.NEW_CHAT_MESSAGE, {
            id: assistantMessage.id,
            leadId: lead.id,
            fromClient: false,
            content: assistantMessage.content,
            createdAt: assistantMessage.createdAt,
            source: "AUTO_REPLY_AI",
          });
        } catch {}

        try {
          if (lead.realtorId) {
            await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
          }
        } catch {}

        return { ok: true as const, status: "SENT" as const };
      }

      const assistantMessage = await (prisma as any).leadClientMessage.create({
        data: {
          leadId: lead.id,
          fromClient: false,
          content: draft,
          source: "AUTO_REPLY_AI" as any,
        },
        select: { id: true, content: true, createdAt: true },
      });

      await (prisma as any).leadAutoReplyJob.update({
        where: { clientMessageId },
        data: { status: "SENT", processedAt: now },
      });

      await (prisma as any).leadAutoReplyLog.create({
        data: {
          leadId: lead.id,
          realtorId: lead.realtorId,
          clientMessageId,
          assistantMessageId: assistantMessage.id,
          decision: "SENT",
          reason: sendReason,
          model: ai?.model || null,
          promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
        },
      });

      await this.safeEvent(lead.id, "AUTO_REPLY_SENT", {
        clientMessageId,
        assistantMessageId: assistantMessage.id,
        model: ai?.model || null,
        promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
        offlineAssistantState: nextStateWithIntelligence,
        qualification,
        handoff: handoffDecision,
        policy,
        commercialSummary,
        propertyContext,
        operationalPlaybook,
        experiment,
        guardrails: {
          version: OFFLINE_ASSISTANT_GUARDRAILS_VERSION,
          appliedRules: guardrails.appliedRules,
          scenario: guardrails.scenario,
        },
        aiJson: {
          ok: parsed.ok,
          error: parsed.ok ? null : (parsed as any).error,
          factsUsed,
          likelyFactual,
          factualWithoutFacts,
          nextQuestion: nextQuestion || null,
          modelNextQuestion: modelNextQuestion || null,
          serverNextQuestion: serverNextQuestion || null,
          missingInfo: parsed.ok ? parsed.value.missing_info || null : null,
          handoffNeeded: parsed.ok ? Boolean(parsed.value.handoff_needed) : null,
          finalHandoffNeeded: computedHandoffNeeded,
          visitHandoffNeeded: visitHandoffNeeded,
          conversationMode: parsed.ok ? parsed.value.conversation_mode || null : null,
          handoffReason: parsed.ok ? parsed.value.handoff_reason || null : null,
          recommendedNextStep: parsed.ok ? parsed.value.recommended_next_step || null : null,
          leadTemperatureHint: parsed.ok ? parsed.value.lead_temperature_hint || null : null,
          objectionsDetected: parsed.ok ? parsed.value.objections_detected || null : null,
        },
      });

      if (visitHandoffNeeded) {
        try {
          const prefs = extractVisitPreferences(msg.content, { now, timeZone: tz });
          const hasAnyPrefs = Boolean(
            safeString((prefs as any)?.period) || safeString((prefs as any)?.time) || (Array.isArray((prefs as any)?.days) && (prefs as any).days.length)
          );
          if (!prevState.visitRequested || hasAnyPrefs) {
            await LeadEventService.record({
              leadId: lead.id,
              type: "VISIT_REQUESTED" as any,
              title: "VISIT_REQUESTED",
              metadata: {
                clientMessageId,
                source: "ai_json",
                promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
                preferences: prefs,
              },
            });
          }
        } catch {}
      }

      try {
        const pusher = getPusherServer();
        await pusher.trigger(PUSHER_CHANNELS.CHAT(lead.id), PUSHER_EVENTS.NEW_CHAT_MESSAGE, {
          id: assistantMessage.id,
          leadId: lead.id,
          fromClient: false,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
          source: "AUTO_REPLY_AI",
        });
      } catch {}

      try {
        if (lead.realtorId) {
          await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
        }
      } catch {}

      return { ok: true as const, status: "SENT" as const };
    } catch (error: any) {
      const now2 = new Date();
      const err = safeString(error?.message || error);
      await (prisma as any).leadAutoReplyJob
        .update({
          where: { clientMessageId },
          data: { status: "FAILED", lastError: err.slice(0, 500) || "ERROR", processedAt: now2 },
        })
        .catch(() => null);

      await this.safeEvent(job.leadId, "AUTO_REPLY_FAILED", { reason: "ERROR", clientMessageId });

      try {
        const lead = await (prisma as any).lead.findUnique({ where: { id: job.leadId }, select: { realtorId: true } });
        if (lead?.realtorId) {
          await (prisma as any).leadAutoReplyLog.create({
            data: {
              leadId: job.leadId,
              realtorId: lead.realtorId,
              clientMessageId,
              decision: "FAILED",
              reason: "ERROR",
              model: null,
              promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
            },
          });
        }
      } catch {
      }

      return { ok: false as const, status: "FAILED" as const, reason: "ERROR" };
    }
  }

  private static async safeEvent(leadId: string, type: any, metadata: Record<string, any>) {
    try {
      await LeadEventService.record({
        leadId,
        type,
        title: String(type),
        metadata,
      });
    } catch {}
  }
}
