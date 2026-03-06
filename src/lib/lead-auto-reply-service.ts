import { prisma } from "@/lib/prisma";
import { leadAutoReplyQueue } from "@/lib/queue/queues";
import { LeadEventService } from "@/lib/lead-event-service";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";
import { applyOfflineAutoReplyGuardrails } from "@/lib/ai-guardrails";

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

type OfflineAssistantAiJson = {
  answer: string;
  facts_used: string[];
  missing_info?: string[];
  next_question?: string;
  handoff_needed?: boolean;
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

const OFFLINE_AUTO_REPLY_PROMPT_VERSION = "v4";

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

type IntentClassifierResult = {
  intent: OfflineAssistantIntent;
  confidence: number;
};

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
  const nextQuestion = safeString(parsed.next_question);
  const handoffNeeded = typeof parsed.handoff_needed === "boolean" ? parsed.handoff_needed : false;

  if (!answer) return { ok: false, error: "EMPTY_ANSWER" };

  return {
    ok: true,
    value: {
      answer,
      facts_used: factsUsed,
      missing_info: missingInfo.length ? missingInfo : undefined,
      next_question: nextQuestion || undefined,
      handoff_needed: handoffNeeded,
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
  };
  lastQuestion?: string;
  visitRequested?: boolean;
  visitPreferences?: {
    period?: string | null;
    days?: string[] | null;
    time?: string | null;
  };
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

  return {
    asked: {
      purpose: toBool((asked as any).purpose),
      pets: toBool((asked as any).pets),
      parking: toBool((asked as any).parking),
      moveTime: toBool((asked as any).moveTime),
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
    visitPreferences: {
      period: period || (prevVp as any).period || null,
      time: time || (prevVp as any).time || null,
      days: days.length ? Array.from(new Set(days)) : (prevVp as any).days || null,
    },
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
        "Eu não consigo confirmar/agendar visita por aqui.\n\n" +
        `${about}posso registrar seu interesse para o corretor.\n\n` +
        (prefText ? `Preferências recebidas: ${prefText}.\n\n` : "") +
        "Qual período do dia você prefere (manhã/tarde/noite)?\n\n" +
        "O corretor vai te responder assim que possível."
      );
    }

    if (!missingPeriod && missingDays) {
      return (
        intro +
        "Eu não consigo confirmar/agendar visita por aqui.\n\n" +
        `${about}posso registrar seu interesse para o corretor.\n\n` +
        (prefText ? `Preferências recebidas: ${prefText}.\n\n` : "") +
        "Quais dias da semana costumam ser melhores para você?\n\n" +
        "O corretor vai te responder assim que possível."
      );
    }

    return (
      intro +
      "Eu não consigo confirmar/agendar visita por aqui.\n\n" +
      `${about}já registrei sua preferência de visita${prefText ? ` (${prefText})` : ""} para o corretor.\n\n` +
      "O corretor vai te responder assim que possível."
    );
  }

  return (
    intro +
    "Eu não consigo confirmar/agendar visita por aqui.\n\n" +
    `${about}posso registrar seu interesse para o corretor.\n\n` +
    "Qual período do dia você prefere (manhã/tarde/noite) e quais dias da semana costuma ser melhor?\n\n" +
    "O corretor vai te responder assim que possível."
  );
}

function chooseNextQuestion(params: {
  purpose: string;
  petFriendly: string;
  parkingSpots: string;
  history: string;
  state?: OfflineAssistantState;
}) {
  const h = normalizeTextForMatch(params.history || "");

  const askedState = params.state?.asked || {};

  const askedPurpose = Boolean(askedState.purpose) || includesAny(h, ["compra ou locacao", "compra ou locação", /\bcompra\b.*\blocacao\b/]);
  const askedPets = Boolean(askedState.pets) || includesAny(h, ["pets", "pet", "aceita pets", "tem pets"]);
  const askedParking = Boolean(askedState.parking) || includesAny(h, ["vaga", "vagas", "estacion"]);
  const askedMove = Boolean(askedState.moveTime) || includesAny(h, ["quando pretende", "quando voce pretende", "prazo", "se mudar", "mudar", "mudanca", "mudança"]);

  if (!params.purpose && !askedPurpose) return "Você busca compra ou locação?";
  if (!params.petFriendly && !askedPets) return "Você tem pets?";
  if (!params.parkingSpots && !askedParking) return "Você precisa de vaga de garagem? Se sim, quantas?";
  if (!askedMove) return "Quando você pretende se mudar?";
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
    `${about}no momento eu não consigo responder essa pergunta por aqui.\n\n` +
    "O corretor vai te responder assim que possível."
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
      "Eu não consigo confirmar/agendar visita por aqui.\n\n" +
      `${about}posso registrar seu interesse para o corretor.\n\n` +
      "Qual período do dia você prefere (manhã/tarde/noite) e quais dias da semana costuma ser melhor?\n\n" +
      "O corretor vai te responder assim que possível."
    );
  }

  if (params.reason === "FINANCING") {
    return (
      intro +
      "Eu não consigo orientar sobre financiamento por aqui.\n\n" +
      `${about}posso te ajudar com informações do anúncio (preço, localização, quartos, área e itens).\n\n` +
      "O corretor vai te responder assim que possível.\n\n" +
      "O que você gostaria de confirmar sobre o imóvel?"
    );
  }

  if (params.reason === "OFF_TOPIC") {
    return (
      intro +
      "Eu só consigo ajudar com dúvidas relacionadas a este anúncio.\n\n" +
      `${about}posso te ajudar com informações do anúncio (preço, localização, quartos, área e itens).\n\n` +
      "O corretor vai te responder assim que possível.\n\n" +
      "O que você gostaria de saber sobre o imóvel?"
    );
  }

  return (
    intro +
    `${about}posso te ajudar com informações do anúncio (preço, localização, quartos, área e itens).\n\n` +
    "O corretor vai te responder assim que possível.\n\n" +
    "O que você gostaria de saber?"
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
      };
    }

    return {
      realtorId,
      enabled: Boolean(row.enabled),
      timezone: safeTimezone(row.timezone),
      weekSchedule: normalizeWeekSchedule(row.weekSchedule),
      cooldownMinutes: typeof row.cooldownMinutes === "number" ? row.cooldownMinutes : 3,
      maxRepliesPerLeadPer24h: typeof row.maxRepliesPerLeadPer24h === "number" ? row.maxRepliesPerLeadPer24h : 6,
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
        const isScheduling = intent === "SCHEDULING";
        const tz = safeTimezone(settings.timezone);
        const extractedPrefs = isScheduling ? extractVisitPreferences(msg.content, { now, timeZone: tz }) : null;
        const mergedPrefs = isScheduling
          ? {
              period: safeString((extractedPrefs as any)?.period) || safeString(prevState2?.visitPreferences?.period) || null,
              days:
                (Array.isArray((extractedPrefs as any)?.days) && (extractedPrefs as any).days.length
                  ? (extractedPrefs as any).days
                  : prevState2?.visitPreferences?.days) ||
                null,
              time: safeString((extractedPrefs as any)?.time) || safeString(prevState2?.visitPreferences?.time) || null,
            }
          : null;

        const refusal = isScheduling
          ? buildSchedulingAutoReply({ clientName, propertyTitle, includeIntro: shouldIntroduce, preferences: mergedPrefs })
          : buildRefusalReply({
              clientName,
              propertyTitle,
              includeIntro: shouldIntroduce,
              reason: intent === "FINANCING" ? "FINANCING" : intent === "OFF_TOPIC" ? "OFF_TOPIC" : "UNCLEAR",
            });

        const draft = applyOfflineAutoReplyGuardrails({
          draft: refusal,
          clientName,
          propertyTitle,
        });

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
            reason: intent,
            model: null,
            promptVersion: OFFLINE_AUTO_REPLY_PROMPT_VERSION,
          },
        });

        const stateAfterRefusalBase = updateStateWithQuestion(prevState2, extractLastQuestion(finalText));
        const stateAfterRefusal1 = isScheduling ? updateStateVisitRequested(stateAfterRefusalBase) : stateAfterRefusalBase;
        const stateAfterRefusal = isScheduling && mergedPrefs ? updateStateVisitPreferences(stateAfterRefusal1, mergedPrefs) : stateAfterRefusal1;

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
        });

        if (intent === "SCHEDULING") {
          try {
            const tz = safeTimezone(settings.timezone);
            const prefs = extractVisitPreferences(msg.content, { now, timeZone: tz });
            const hasAnyPrefs = Boolean(
              safeString((prefs as any)?.period) || safeString((prefs as any)?.time) || (Array.isArray((prefs as any)?.days) && (prefs as any).days.length)
            );
            if (!prevState2.visitRequested || hasAnyPrefs) {
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

        const nextQuestion = chooseNextQuestion({ purpose, petFriendly, parkingSpots, history, state: prevState });
        const answer =
          intro +
          `${about}encontrei ${placesCat.label} próximos (distâncias aproximadas):\n` +
          (list || "(sem resultados no momento)") +
          (nextQuestion ? `\n\n${nextQuestion}` : "");

        const draft = applyOfflineAutoReplyGuardrails({ draft: answer, clientName, propertyTitle });
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
          offlineAssistantState: updateStateWithQuestion(prevState, nextQuestion),
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

        return { ok: true as const, status: "SENT" as const };
      }

      const systemPrompt =
        "Você é um assistente de atendimento do chat do site (pt-BR) para corretores de imóveis no Brasil.\n" +
        "Você está respondendo enquanto o corretor está offline (fora do horário comercial configurado).\n" +
        "Objetivo: manter o cliente engajado, esclarecer dúvidas básicas do imóvel usando SOMENTE os dados fornecidos e fazer 1 pergunta curta para qualificar.\n" +
        "Política anti-chute: se a informação não estiver nos dados fornecidos, diga claramente que não consta no anúncio, liste o que faltou em missing_info e NÃO invente.\n" +
        "Regras: responda apenas sobre o anúncio; não invente informações; não use links/telefone; não agende/CONFIRME visitas; não sugira horários/dias; não prometa retorno em X minutos.\n" +
        "Saída: responda SOMENTE com um objeto JSON válido (sem markdown, sem texto fora do JSON) com as chaves: answer, facts_used, missing_info, next_question, handoff_needed.\n" +
        "facts_used deve ser uma lista com as chaves dos dados realmente usados na resposta.\n" +
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
      if (description) lines.push(`Descrição do anúncio: ${description}`);
      if (amenities.length) lines.push(`Itens/condomínio: ${amenities.join(", ")}`);
      if (condoRules) lines.push(`Regras do condomínio: ${condoRules}`);

      const userPrompt =
        lines.join("\n") +
        "\n\nChaves permitidas para facts_used: " +
        OFFLINE_ASSISTANT_FACT_KEYS.join(", ") +
        "\n\nHistórico recente do chat:\n" +
        (history || "(sem histórico)") +
        `\n\nEsta é sua primeira resposta nesta conversa? ${shouldIntroduce ? "Sim" : "Não"}.` +
        "\n\nAgora responda no formato JSON pedido.";

      const ai = await callOpenAiText({ apiKey, systemPrompt, userPrompt });
      const rawDraft = ai?.content ? String(ai.content) : "";

      const parsed = rawDraft ? parseOfflineAssistantAiJson(rawDraft) : ({ ok: false, error: "EMPTY_AI_OUTPUT" } as const);

      const llmHandoffNeeded = parsed.ok ? Boolean(parsed.value.handoff_needed) : false;
      const tz = safeTimezone(settings.timezone);
      const extractedVisitPrefs = llmHandoffNeeded ? extractVisitPreferences(msg.content, { now, timeZone: tz }) : null;
      const mergedVisitPrefs = llmHandoffNeeded
        ? {
            period: safeString((extractedVisitPrefs as any)?.period) || safeString(prevState?.visitPreferences?.period) || null,
            days:
              (Array.isArray((extractedVisitPrefs as any)?.days) && (extractedVisitPrefs as any).days.length
                ? (extractedVisitPrefs as any).days
                : prevState?.visitPreferences?.days) ||
              null,
            time: safeString((extractedVisitPrefs as any)?.time) || safeString(prevState?.visitPreferences?.time) || null,
          }
        : null;

      const serverNextQuestion = chooseNextQuestion({ purpose, petFriendly, parkingSpots, history, state: prevState });
      const modelNextQuestion = parsed.ok ? safeString(parsed.value.next_question) : "";
      const nextQuestion = llmHandoffNeeded ? "" : modelNextQuestion || serverNextQuestion;

      const nextState = updateStateWithQuestion(prevState, nextQuestion);
      const nextStateWithVisit = llmHandoffNeeded
        ? updateStateVisitPreferences(updateStateVisitRequested(nextState), mergedVisitPrefs || extractedVisitPrefs)
        : nextState;

      const rawAnswer = parsed.ok ? safeString(parsed.value.answer) : "";
      const factsUsed = parsed.ok ? parsed.value.facts_used : [];
      const likelyFactual = isLikelyFactualAnswer(rawAnswer);
      const factualWithoutFacts = Boolean(likelyFactual && factsUsed.length === 0);

      const sendReason =
        !parsed.ok
          ? parsed.error === "EMPTY_AI_OUTPUT"
            ? "EMPTY_AI_OUTPUT"
            : "AI_JSON_PARSE_FAILED"
          : factualWithoutFacts
            ? "FACTUAL_WITHOUT_FACTS"
            : null;

      let answerText = llmHandoffNeeded
        ? buildSchedulingAutoReply({ clientName, propertyTitle, includeIntro: shouldIntroduce, preferences: mergedVisitPrefs || extractedVisitPrefs })
        : rawAnswer;
      if (!answerText || !parsed.ok) {
        answerText = buildGenericFallbackReply({ clientName, propertyTitle, includeIntro: shouldIntroduce });
      } else if (factualWithoutFacts) {
        const intro = shouldIntroduce ? buildAssistantIntro(clientName) : "";
        const about = propertyTitle ? `Sobre o imóvel ${propertyTitle}, ` : "Sobre o imóvel, ";
        answerText = intro + `${about}essa informação não consta no anúncio.\n\nO corretor confirma assim que possível.`;
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

      const draft = messageWithQuestion
        ? applyOfflineAutoReplyGuardrails({
            draft: messageWithQuestion,
            clientName,
            propertyTitle,
          })
        : "";

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
        offlineAssistantState: nextStateWithVisit,
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
        },
      });

      if (parsed.ok && parsed.value.handoff_needed) {
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
