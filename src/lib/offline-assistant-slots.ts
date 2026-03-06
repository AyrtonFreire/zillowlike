export type OfflineAssistantClientSlots = {
  purpose?: "COMPRA" | "LOCACAO" | null;
  hasPets?: boolean | null;
  parkingSpotsNeeded?: number | null;
  moveTime?: string | null;
  bedroomsNeeded?: number | null;
  budget?: string | null;
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

function extractBudgetRaw(t: string) {
  const raw = t;
  const m1 = raw.match(/\b(ate|até)\s+r?\$?\s*([0-9\.\,]+)\s*(mil|milhao|milhoes|k)?\b/);
  if (m1) return safeString(m1[0]);
  const m2 = raw.match(/\br?\$\s*([0-9\.\,]+)\s*(mil|milhao|milhoes|k)?\b/);
  if (m2) return safeString(m2[0]);
  return "";
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

  const out: OfflineAssistantClientSlots = {};
  if (purpose) out.purpose = purpose;
  if (hasPets !== null) out.hasPets = hasPets;
  if (parkingSpotsNeeded !== null) out.parkingSpotsNeeded = parkingSpotsNeeded;
  if (bedroomsNeeded !== null) out.bedroomsNeeded = bedroomsNeeded;
  if (moveTime) out.moveTime = moveTime;
  if (budget) out.budget = budget;
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
  };

  const hasAny =
    Boolean(merged.purpose) ||
    typeof merged.hasPets === "boolean" ||
    typeof merged.parkingSpotsNeeded === "number" ||
    Boolean(merged.moveTime) ||
    typeof merged.bedroomsNeeded === "number" ||
    Boolean(merged.budget);

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
  return parts.filter(Boolean).join(" | ");
}
