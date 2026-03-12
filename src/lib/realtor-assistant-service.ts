import { prisma } from "@/lib/prisma";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";

type AssistantAction = {
  type: string;
  [key: string]: any;
};

type AssistantContext = "REALTOR" | "AGENCY";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMinutes(d: Date, minutes: number) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + minutes);
  return x;
}

function safeDate(value: any): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

function detectOfflineAssistantHandoffType(message: string): {
  type:
    | "NEGOTIATION_REQUEST"
    | "COUNTEROFFER_REQUEST"
    | "PRICE_CLARIFICATION_NEEDED"
    | "ADDRESS_REQUEST"
    | "URGENT_CLIENT_REQUEST"
    | "RISK_OF_LOSS"
    | "TOTAL_COST_QUESTION"
    | "DOCS_AND_CONTRACT_QUESTION"
    | "FINANCING_QUESTION"
    | "RULES_AND_PERMISSIONS"
    | "CALLBACK_REQUEST"
    | "MORE_MEDIA_REQUEST"
    | "MATCHING_OPPORTUNITY";
  priority: "LOW" | "MEDIUM" | "HIGH";
  slaMinutes: number;
  title: string;
} | null {
  const t = normalizeTextForMatch(message);
  if (!t) return null;

  const hasMoney =
    /r\$\s*\d/.test(t) ||
    /\d+\s*mil/.test(t) ||
    /\d{3}\.?\d{3}/.test(t) ||
    /(\d+)\s*(k)\b/.test(t);

  const isCounterOffer =
    includesAny(t, [
      "faz por",
      "fecha por",
      "fechar por",
      "consigo por",
      "aceita por",
      "proposta de",
      "eu pago",
      "pago",
    ]) && hasMoney;

  const isNegotiation = includesAny(t, [
    "aceita proposta",
    "aceita uma proposta",
    "posso fazer uma proposta",
    "proposta",
    "negocia",
    "negociar",
    "melhor preco",
    "melhor valor",
    "tem desconto",
    "desconto",
    "permuta",
    "troca",
    "entrada +",
    "entrada e",
    "parcel",
  ]);

  const isAddress = includesAny(t, [
    "endereco",
    "localizacao",
    "manda a localizacao",
    "rua",
    "numero",
    "como chegar",
    "maps",
    "google maps",
  ]);

  const isUrgent = includesAny(t, [
    "agora",
    "urgente",
    "tenho pressa",
    "com pressa",
    "so tenho hoje",
    "só tenho hoje",
    "quero fechar hoje",
    "quero fechar",
    "ainda esta disponivel",
    "ainda ta disponivel",
    "ainda está disponivel",
    "ainda tá disponivel",
    "disponivel agora",
  ]);

  const isRiskOfLoss = includesAny(t, [
    "vou desistir",
    "desistir",
    "nao vou",
    "não vou",
    "muito caro",
    "caro demais",
    "vocês nao respondem",
    "voces nao respondem",
    "nao respondem",
    "não respondem",
    "reclam",
    "golpe",
    "engan",
  ]);

  const isDocs = includesAny(t, [
    "document",
    "escritura",
    "habite",
    "contrato",
    "fgts",
    "garantia",
    "fiador",
    "caucao",
    "caução",
  ]);

  const isFinancing = includesAny(t, [
    "financia",
    "financiamento",
    "banco",
    "credito",
    "crédito",
    "score",
    "entrada minima",
    "entrada mínima",
    "renda",
    "parcela",
  ]);

  const isTotalCost = includesAny(t, [
    "condominio",
    "condomínio",
    "iptu",
    "agua",
    "água",
    "gas",
    "gás",
    "seguro",
    "taxa",
    "valor total",
    "valor final",
    "por mes",
    "por mês",
    "mensal",
  ]);

  const isPriceClarification = includesAny(t, [
    "preco",
    "preço",
    "valor e esse mesmo",
    "valor é esse mesmo",
    "e esse mesmo",
    "é esse mesmo",
    "taxa escondida",
    "com mobilia",
    "com mobília",
    "sem mobilia",
    "sem mobília",
    "mobiliado",
  ]);

  const isRules = includesAny(t, [
    "aceita pet",
    "pet",
    "cachorro",
    "gato",
    "animais",
    "pode furar",
    "pode pintar",
    "reforma",
    "armario",
    "armário",
  ]);

  const isCallback = includesAny(t, [
    "me liga",
    "me ligue",
    "pode me ligar",
    "telefone",
    "whatsapp",
    "zap",
    "me chama",
    "me chame",
    "retorno",
    "qual horario",
    "qual horário",
  ]);

  const isMedia = includesAny(t, ["mais fotos", "mais foto", "video", "vídeo", "tour", "virtual", "tour virtual"]);

  const isMatching =
    includesAny(t, ["procuro", "busco", "estou procurando", "estou buscando", "prefiro"]) &&
    (includesAny(t, ["ate r$", "até r$", "quartos", "dorm", "suite", "suíte", "bairro", "perto"]) || hasMoney);

  if (isUrgent) return { type: "URGENT_CLIENT_REQUEST", priority: "HIGH", slaMinutes: 15, title: "Cliente com urgência" };
  if (isRiskOfLoss) return { type: "RISK_OF_LOSS", priority: "HIGH", slaMinutes: 15, title: "Risco de perder o lead" };
  if (isCounterOffer)
    return { type: "COUNTEROFFER_REQUEST", priority: "HIGH", slaMinutes: 30, title: "Cliente fez proposta de valor" };
  if (isNegotiation)
    return { type: "NEGOTIATION_REQUEST", priority: "HIGH", slaMinutes: 30, title: "Cliente quer negociar" };
  if (isAddress) return { type: "ADDRESS_REQUEST", priority: "HIGH", slaMinutes: 30, title: "Cliente pediu endereço/localização" };
  if (isTotalCost) return { type: "TOTAL_COST_QUESTION", priority: "MEDIUM", slaMinutes: 60, title: "Cliente perguntou sobre custos/taxas" };
  if (isDocs) return { type: "DOCS_AND_CONTRACT_QUESTION", priority: "MEDIUM", slaMinutes: 60, title: "Cliente perguntou sobre documentação/contrato" };
  if (isFinancing) return { type: "FINANCING_QUESTION", priority: "MEDIUM", slaMinutes: 60, title: "Cliente perguntou sobre financiamento" };
  if (isPriceClarification)
    return { type: "PRICE_CLARIFICATION_NEEDED", priority: "HIGH", slaMinutes: 30, title: "Cliente pediu confirmação de preço/condições" };
  if (isRules) return { type: "RULES_AND_PERMISSIONS", priority: "MEDIUM", slaMinutes: 60, title: "Cliente perguntou regras/permissões" };
  if (isCallback) return { type: "CALLBACK_REQUEST", priority: "MEDIUM", slaMinutes: 60, title: "Cliente pediu retorno/contato" };
  if (isMedia) return { type: "MORE_MEDIA_REQUEST", priority: "LOW", slaMinutes: 240, title: "Cliente pediu mais fotos/vídeo" };
  if (isMatching) return { type: "MATCHING_OPPORTUNITY", priority: "LOW", slaMinutes: 480, title: "Preferências do cliente identificadas" };

  return null;
}

function impactScoreForItem(item: any, now: Date): number {
  const priority = String(item?.priority || "");
  const base = priority === "HIGH" ? 60 : priority === "MEDIUM" ? 30 : 10;

  const dueAt = safeDate(item?.dueAt);
  const snoozedUntil = safeDate(item?.snoozedUntil);

  // Penaliza itens efetivamente sonegados no futuro, pra não poluir o topo.
  if (String(item?.status) === "SNOOZED" && snoozedUntil && snoozedUntil.getTime() > now.getTime()) {
    return Math.max(0, base - 20);
  }

  let urgency = 0;
  if (dueAt) {
    const deltaMs = dueAt.getTime() - now.getTime();
    if (deltaMs <= 0) urgency += 40;
    else if (deltaMs <= 15 * 60 * 1000) urgency += 30;
    else if (deltaMs <= 60 * 60 * 1000) urgency += 18;
    else if (deltaMs <= 24 * 60 * 60 * 1000) urgency += 8;
  }

  const type = String(item?.type || "");
  let typeWeight = 0;
  if (type === "UNANSWERED_CLIENT_MESSAGE") typeWeight = 30;
  else if (type === "VISIT_REQUESTED") typeWeight = 28;
  else if (type === "VISIT_TODAY") typeWeight = 25;
  else if (type === "OWNER_APPROVAL_PENDING") typeWeight = 22;
  else if (type === "REMINDER_OVERDUE") typeWeight = 18;
  else if (type === "LEAD_NO_FIRST_CONTACT") typeWeight = 16;
  else if (type === "NEGOTIATION_REQUEST") typeWeight = 24;
  else if (type === "COUNTEROFFER_REQUEST") typeWeight = 24;
  else if (type === "PRICE_CLARIFICATION_NEEDED") typeWeight = 22;
  else if (type === "ADDRESS_REQUEST") typeWeight = 22;
  else if (type === "URGENT_CLIENT_REQUEST") typeWeight = 22;
  else if (type === "RISK_OF_LOSS") typeWeight = 22;
  else if (type === "TOTAL_COST_QUESTION") typeWeight = 16;
  else if (type === "DOCS_AND_CONTRACT_QUESTION") typeWeight = 16;
  else if (type === "FINANCING_QUESTION") typeWeight = 16;
  else if (type === "RULES_AND_PERMISSIONS") typeWeight = 12;
  else if (type === "CALLBACK_REQUEST") typeWeight = 12;
  else if (type === "MORE_MEDIA_REQUEST") typeWeight = 6;
  else if (type === "MATCHING_OPPORTUNITY") typeWeight = 8;
  else if (type === "STALE_LEAD") typeWeight = 10;
  else if (type === "NEW_LEAD") typeWeight = 12;
  else if (type === "WEEKLY_SUMMARY") typeWeight = 0;

  return base + urgency + typeWeight;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function computeLeadHealthAndNba(params: {
  now: Date;
  lastClientAt?: Date | null;
  lastProAt?: Date | null;
  nextActionDate?: Date | null;
  visitDate?: Date | null;
  visitTime?: string | null;
  ownerApproved?: boolean | null;
  leadStatus?: string | null;
}) {
  const nowMs = params.now.getTime();
  const lastClientMs = params.lastClientAt && !Number.isNaN(params.lastClientAt.getTime()) ? params.lastClientAt.getTime() : 0;
  const lastProMs = params.lastProAt && !Number.isNaN(params.lastProAt.getTime()) ? params.lastProAt.getTime() : 0;
  const lastInteractionMs = Math.max(lastClientMs, lastProMs);

  const nextActionMs = params.nextActionDate && !Number.isNaN(params.nextActionDate.getTime()) ? params.nextActionDate.getTime() : 0;
  const visitMs = params.visitDate && !Number.isNaN(params.visitDate.getTime()) ? params.visitDate.getTime() : 0;

  let score = 62;
  let nba: string | null = null;

  if (lastInteractionMs) {
    const days = (nowMs - lastInteractionMs) / (24 * 60 * 60 * 1000);
    if (days >= 14) score -= 30;
    else if (days >= 7) score -= 18;
    else if (days >= 3) score -= 10;
    else score += 4;
  } else {
    score -= 12;
  }

  const clientUnanswered = lastClientMs > 0 && lastClientMs > lastProMs;
  if (clientUnanswered) {
    score -= 22;
    nba = "Responder cliente";
  }

  const overdueNextAction = nextActionMs > 0 && nextActionMs < nowMs - 60 * 60 * 1000;
  if (overdueNextAction) {
    score -= 12;
    if (!nba) nba = "Executar próxima ação (atrasada)";
  } else if (nextActionMs > 0 && nextActionMs < nowMs + 24 * 60 * 60 * 1000) {
    score -= 4;
    if (!nba) nba = "Executar próxima ação hoje";
  }

  const visitIsTodayOrTomorrow = (() => {
    if (!visitMs) return false;
    const today = startOfDay(params.now);
    const tomorrow = addDays(today, 1);
    const v = startOfDay(new Date(visitMs));
    return isSameDay(v, today) || isSameDay(v, tomorrow);
  })();

  if (visitMs && visitIsTodayOrTomorrow) {
    score -= 6;
    if (!nba) nba = "Confirmar visita";
    if (params.ownerApproved === false) {
      score -= 10;
      nba = "Cobrar aprovação do proprietário";
    }
  }

  const status = String(params.leadStatus || "").trim();
  if (status === "WAITING_OWNER_APPROVAL") {
    score -= 10;
    nba = "Cobrar aprovação do proprietário";
  }

  if (!nba) {
    if (lastInteractionMs && (nowMs - lastInteractionMs) / (24 * 60 * 60 * 1000) >= 7) {
      nba = "Enviar follow-up";
    } else if (nextActionMs) {
      nba = "Definir próximo passo";
    } else {
      nba = "Qualificar e propor próximo passo";
    }
  }

  return {
    leadHealthScore: clampNumber(Math.round(score), 0, 100),
    nextBestAction: nba,
  };
}

export class RealtorAssistantService {
  static async emitItemUpdated(
    realtorId: string,
    item: any,
    options?: { context?: AssistantContext | null; teamId?: string | null }
  ) {
    try {
      const pusher = getPusherServer();

      const context = (options?.context || "REALTOR") as AssistantContext;
      const teamId = options?.teamId ? String(options.teamId) : null;

      if (context === "AGENCY" && teamId) {
        await pusher.trigger(PUSHER_CHANNELS.AGENCY(teamId), PUSHER_EVENTS.ASSISTANT_ITEM_UPDATED, {
          teamId,
          item,
          ts: new Date().toISOString(),
        });
      } else {
        await pusher.trigger(PUSHER_CHANNELS.REALTOR(realtorId), PUSHER_EVENTS.ASSISTANT_ITEM_UPDATED, {
          realtorId,
          item,
          ts: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }
  }

  static async emitItemsRecalculated(
    realtorId: string,
    meta?: { count?: number },
    options?: { context?: AssistantContext | null; teamId?: string | null }
  ) {
    try {
      const pusher = getPusherServer();

      const context = (options?.context || "REALTOR") as AssistantContext;
      const teamId = options?.teamId ? String(options.teamId) : null;

      if (context === "AGENCY" && teamId) {
        await pusher.trigger(PUSHER_CHANNELS.AGENCY(teamId), PUSHER_EVENTS.ASSISTANT_ITEMS_RECALCULATED, {
          teamId,
          count: meta?.count ?? null,
          ts: new Date().toISOString(),
        });
      } else {
        await pusher.trigger(PUSHER_CHANNELS.REALTOR(realtorId), PUSHER_EVENTS.ASSISTANT_ITEMS_RECALCULATED, {
          realtorId,
          count: meta?.count ?? null,
          ts: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }
  }

  static async list(
    ownerId: string,
    options?: {
      context?: AssistantContext | null;
      teamId?: string | null;
      leadId?: string | null;
      limit?: number | null;
      order?: "PRIORITY" | "CURSOR" | null;
      cursor?: string | null;
      query?: string | null;
      priority?: "LOW" | "MEDIUM" | "HIGH" | null;
      typeIn?: string[] | null;
      typeNotIn?: string[] | null;
      includeSnoozed?: boolean | null;
    }
  ) {
    const now = new Date();

    const context = (options?.context || "REALTOR") as AssistantContext;
    const teamId = options?.teamId ? String(options.teamId) : null;

    const where: any = {
      context,
      ownerId,
      status: { in: ["ACTIVE", "SNOOZED"] },
      ...(context === "AGENCY" && teamId ? { teamId } : {}),
    };

    if (options?.leadId) {
      where.leadId = options.leadId;
    }

    if (options?.includeSnoozed === false) {
      where.status = "ACTIVE";
    }

    const typeIn = Array.isArray(options?.typeIn)
      ? (options?.typeIn || []).map((t) => String(t)).filter((t) => t.trim().length > 0)
      : [];
    if (typeIn.length > 0) {
      where.type = { in: typeIn };
    }

    const typeNotIn = Array.isArray(options?.typeNotIn)
      ? (options?.typeNotIn || []).map((t) => String(t)).filter((t) => t.trim().length > 0)
      : [];
    if (typeNotIn.length > 0) {
      where.type = { ...(where.type || {}), notIn: typeNotIn };
    }

    if (options?.priority) {
      where.priority = options.priority;
    }

    const q = options?.query ? String(options.query).trim() : "";
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
      ];
    }

    const limit = (() => {
      const raw = options?.limit;
      if (raw == null) return 100;
      const n = Number(raw);
      if (!Number.isFinite(n)) return 100;
      return Math.min(200, Math.max(1, Math.floor(n)));
    })();

    const cursorId = options?.cursor ? String(options.cursor).trim() : "";
    const orderMode = options?.order || "PRIORITY";
    const useCursorOrder = orderMode === "CURSOR";

    const items = await (prisma as any).assistantItem.findMany(
      useCursorOrder
        ? {
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            ...(cursorId
              ? {
                  cursor: { id: cursorId },
                  skip: 1,
                }
              : null),
            take: limit,
          }
        : {
            where,
            orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
            take: limit,
          }
    );

    const normalized = (items || []).map((item: any) => {
      if (item?.status === "SNOOZED" && item?.snoozedUntil) {
        const until = new Date(item.snoozedUntil);
        if (!Number.isNaN(until.getTime()) && until.getTime() <= now.getTime()) {
          return { ...item, status: "ACTIVE", snoozedUntil: null };
        }
      }
      return item;
    });

    const leadIds = Array.from(
      new Set(
        normalized
          .map((i: any) => (i?.leadId ? String(i.leadId) : null))
          .filter(Boolean)
      )
    ) as string[];

    const leadAccessWhere: any =
      context === "AGENCY"
        ? teamId
          ? { teamId }
          : { id: { in: [] } }
        : { realtorId: ownerId };

    const [leadRows, lastClientMessages, lastProMessages] = await Promise.all([
      leadIds.length
        ? prisma.lead.findMany({
            where: { id: { in: leadIds }, ...leadAccessWhere },
            select: {
              id: true,
              realtorId: true,
              status: true,
              pipelineStage: true,
              nextActionDate: true,
              nextActionNote: true,
              visitDate: true,
              visitTime: true,
              ownerApproved: true,
              contact: { select: { name: true } },
              property: {
                select: {
                  id: true,
                  publicCode: true,
                  title: true,
                  price: true,
                  hidePrice: true,
                  neighborhood: true,
                  city: true,
                  state: true,
                  bedrooms: true,
                  bathrooms: true,
                  areaM2: true,
                  type: true,
                  purpose: true,
                  images: {
                    select: {
                      url: true,
                    },
                    orderBy: {
                      sortOrder: "asc",
                    },
                    take: 1,
                  },
                },
              },
            },
          })
        : [],
      leadIds.length
        ? prisma.leadClientMessage.findMany({
            where: { leadId: { in: leadIds }, fromClient: true },
            orderBy: { createdAt: "desc" },
            select: { leadId: true, createdAt: true, content: true },
            take: Math.max(100, leadIds.length * 10),
          })
        : [],
      leadIds.length
        ? prisma.leadClientMessage.findMany({
            where: { leadId: { in: leadIds }, fromClient: false },
            orderBy: { createdAt: "desc" },
            select: { leadId: true, createdAt: true },
            take: Math.max(100, leadIds.length * 10),
          })
        : [],
    ]);

    const propertyIds = Array.from(
      new Set(
        (leadRows || [])
          .map((l: any) => (l?.property?.id ? String(l.property.id) : null))
          .filter(Boolean)
      )
    ) as string[];

    const coverRows = propertyIds.length
      ? await prisma.image.findMany({
          where: { propertyId: { in: propertyIds } },
          select: { propertyId: true, url: true },
          orderBy: [{ propertyId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : [];

    const coverMap = new Map<string, string>();
    for (const row of coverRows || []) {
      const pid = String((row as any).propertyId || "");
      if (!pid || coverMap.has(pid)) continue;
      const url = (row as any).url ? String((row as any).url) : "";
      if (!url) continue;
      coverMap.set(pid, url);
    }

    const lastClientMap = new Map<string, { createdAt: Date; content: string | null }>();
    for (const m of lastClientMessages || []) {
      const id = String((m as any).leadId);
      if (lastClientMap.has(id)) continue;
      lastClientMap.set(id, { createdAt: (m as any).createdAt, content: (m as any).content ?? null });
    }

    const lastProMap = new Map<string, Date>();
    for (const m of lastProMessages || []) {
      const id = String((m as any).leadId);
      if (lastProMap.has(id)) continue;
      lastProMap.set(id, (m as any).createdAt);
    }

    const leadMap = new Map<string, any>(
      (leadRows || []).map((l: any) => [
        String(l.id),
        (() => {
          const id = String(l.id);
          const lastClientAt = (() => {
            const x = lastClientMap.get(id)?.createdAt;
            return x && !Number.isNaN(new Date(x).getTime()) ? new Date(x) : null;
          })();
          const lastProAt = (() => {
            const x = lastProMap.get(id) || null;
            return x && !Number.isNaN(new Date(x).getTime()) ? new Date(x) : null;
          })();
          const lastClientMs = lastClientAt && !Number.isNaN(lastClientAt.getTime()) ? lastClientAt.getTime() : 0;
          const lastProMs = lastProAt && !Number.isNaN(lastProAt.getTime()) ? lastProAt.getTime() : 0;
          const lastInteractionMs = Math.max(lastClientMs, lastProMs);

          const health = computeLeadHealthAndNba({
            now,
            lastClientAt,
            lastProAt,
            nextActionDate: safeDate(l?.nextActionDate),
            visitDate: safeDate(l?.visitDate),
            visitTime: l?.visitTime ? String(l.visitTime) : null,
            ownerApproved: typeof l?.ownerApproved === "boolean" ? l.ownerApproved : l?.ownerApproved ?? null,
            leadStatus: l?.status ? String(l.status) : null,
          });

          return {
            id,
            realtorId: l?.realtorId ? String(l.realtorId) : null,
            status: l.status || null,
            pipelineStage: l.pipelineStage || null,
            nextActionDate: l.nextActionDate || null,
            nextActionNote: l.nextActionNote || null,
            visitDate: l.visitDate || null,
            visitTime: l.visitTime || null,
            ownerApproved: typeof l.ownerApproved === "boolean" ? l.ownerApproved : l.ownerApproved ?? null,
            lastClientAt: lastClientAt ? lastClientAt.toISOString() : null,
            lastProAt: lastProAt ? lastProAt.toISOString() : null,
            lastInteractionAt: lastInteractionMs ? new Date(lastInteractionMs).toISOString() : null,
            lastInteractionFrom: lastInteractionMs ? (lastClientMs >= lastProMs ? "CLIENT" : "REALTOR") : null,
            lastClientMessagePreview: (() => {
              const content = lastClientMap.get(id)?.content;
              return content ? String(content).trim().slice(0, 160) : null;
            })(),
            clientName: l?.contact?.name || null,
            propertyTitle: l?.property?.title || null,
            property: l?.property
              ? {
                  id: String(l.property.id),
                  publicCode: l.property.publicCode || null,
                  title: l.property.title || null,
                  price:
                    typeof (l.property as any).price === "number"
                      ? (l.property as any).price
                      : typeof (l.property as any).price === "bigint"
                        ? (() => {
                            const n = Number((l.property as any).price);
                            return Number.isSafeInteger(n) ? n : null;
                          })()
                        : null,
                  hidePrice: typeof l.property.hidePrice === "boolean" ? l.property.hidePrice : null,
                  neighborhood: l.property.neighborhood || null,
                  city: l.property.city || null,
                  state: l.property.state || null,
                  bedrooms: typeof l.property.bedrooms === "number" ? l.property.bedrooms : null,
                  bathrooms: typeof l.property.bathrooms === "number" ? l.property.bathrooms : null,
                  areaM2: typeof l.property.areaM2 === "number" ? l.property.areaM2 : null,
                  type: l.property.type || null,
                  purpose: l.property.purpose || null,
                  imageUrl:
                    coverMap.get(String(l.property.id)) ||
                    (Array.isArray((l.property as any).images) && (l.property as any).images[0]?.url
                      ? String((l.property as any).images[0].url)
                      : null),
                }
              : null,
            leadHealthScore: health.leadHealthScore,
            nextBestAction: health.nextBestAction,
          };
        })(),
      ])
    );

    const enriched = normalized.map((item: any) => {
      const leadId = item?.leadId ? String(item.leadId) : "";
      const lead = leadId ? leadMap.get(leadId) || null : null;
      const impactScore = impactScoreForItem(item, now);

      return {
        ...item,
        realtorId: context === "REALTOR" ? String(ownerId) : undefined,
        impactScore,
        lead,
      };
    });

    enriched.sort((a: any, b: any) => {
      const sa = typeof a.impactScore === "number" ? a.impactScore : 0;
      const sb = typeof b.impactScore === "number" ? b.impactScore : 0;
      if (sb !== sa) return sb - sa;

      const da = safeDate(a?.dueAt);
      const db = safeDate(b?.dueAt);
      const ta = da ? da.getTime() : Number.POSITIVE_INFINITY;
      const tb = db ? db.getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;

      const ca = safeDate(a?.createdAt);
      const cb = safeDate(b?.createdAt);
      return (cb?.getTime() || 0) - (ca?.getTime() || 0);
    });

    return enriched;
  }

  static async resolve(ownerId: string, itemId: string, options?: { context?: AssistantContext | null; teamId?: string | null }) {
    const context = (options?.context || "REALTOR") as AssistantContext;
    const teamId = options?.teamId ? String(options.teamId) : null;

    const existing = await (prisma as any).assistantItem.findFirst({
      where: { id: itemId, context, ownerId, ...(context === "AGENCY" && teamId ? { teamId } : {}) },
      select: { id: true },
    });
    if (!existing) throw new Error("FORBIDDEN");

    const updated = await (prisma as any).assistantItem.update({
      where: { id: itemId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });
    await this.emitItemUpdated(ownerId, updated, { context, teamId });
    return updated;
  }

  static async snooze(
    ownerId: string,
    itemId: string,
    minutes: number,
    options?: { context?: AssistantContext | null; teamId?: string | null }
  ) {
    const context = (options?.context || "REALTOR") as AssistantContext;
    const teamId = options?.teamId ? String(options.teamId) : null;

    const until = new Date();
    until.setMinutes(until.getMinutes() + Math.max(5, Math.min(7 * 24 * 60, minutes)));

    const existing = await (prisma as any).assistantItem.findFirst({
      where: { id: itemId, context, ownerId, ...(context === "AGENCY" && teamId ? { teamId } : {}) },
      select: { id: true },
    });
    if (!existing) throw new Error("FORBIDDEN");

    const updated = await (prisma as any).assistantItem.update({
      where: { id: itemId },
      data: {
        status: "SNOOZED",
        snoozedUntil: until,
      },
    });
    await this.emitItemUpdated(ownerId, updated, { context, teamId });
    return updated;
  }

  static async dismiss(ownerId: string, itemId: string, options?: { context?: AssistantContext | null; teamId?: string | null }) {
    const context = (options?.context || "REALTOR") as AssistantContext;
    const teamId = options?.teamId ? String(options.teamId) : null;

    const existing = await (prisma as any).assistantItem.findFirst({
      where: { id: itemId, context, ownerId, ...(context === "AGENCY" && teamId ? { teamId } : {}) },
      select: { id: true },
    });
    if (!existing) throw new Error("FORBIDDEN");

    const updated = await (prisma as any).assistantItem.update({
      where: { id: itemId },
      data: {
        status: "DISMISSED",
        dismissedAt: new Date(),
      },
    });
    await this.emitItemUpdated(ownerId, updated, { context, teamId });
    return updated;
  }

  static async upsertFromRule(params: {
    ownerId: string;
    context?: AssistantContext | null;
    teamId?: string | null;
    leadId?: string | null;
    type: any;
    priority: "LOW" | "MEDIUM" | "HIGH";
    title: string;
    message: string;
    dueAt?: Date | null;
    dedupeKey: string;
    primaryAction?: AssistantAction | null;
    secondaryAction?: AssistantAction | null;
    metadata?: Record<string, any> | null;
  }) {
    const now = new Date();

    const context = (params.context || "REALTOR") as AssistantContext;
    const teamId = params.teamId ? String(params.teamId) : null;

    const fingerprint = JSON.stringify({
      type: params.type,
      title: params.title,
      message: params.message,
      dueAt: params.dueAt ? new Date(params.dueAt).toISOString() : null,
      primaryAction: params.primaryAction || null,
      secondaryAction: params.secondaryAction || null,
      metadata: params.metadata || null,
    });

    const nextMetadata: any = {
      ...((params.metadata as any) ?? null),
      _fingerprint: fingerprint,
    };

    const existing = await (prisma as any).assistantItem.findUnique({
      where: {
        context_ownerId_dedupeKey: {
          context,
          ownerId: params.ownerId,
          dedupeKey: params.dedupeKey,
        },
      },
      select: {
        id: true,
        status: true,
        snoozedUntil: true,
        metadata: true,
      },
    });

    if (!existing) {
      return await (prisma as any).assistantItem.create({
        data: {
          context,
          ownerId: params.ownerId,
          ...(context === "AGENCY" && teamId ? { teamId } : {}),
          leadId: params.leadId ?? null,
          type: params.type,
          priority: params.priority,
          status: "ACTIVE",
          source: "RULE",
          title: params.title,
          message: params.message,
          dueAt: params.dueAt ?? null,
          primaryAction: (params.primaryAction as any) ?? null,
          secondaryAction: (params.secondaryAction as any) ?? null,
          metadata: nextMetadata,
          dedupeKey: params.dedupeKey,
        },
      });
    }

    const prevFingerprint = (existing as any)?.metadata?._fingerprint;
    const isNewTrigger = prevFingerprint !== fingerprint;

    const snoozedUntil = existing.snoozedUntil ? new Date(existing.snoozedUntil) : null;
    const isSnoozedInFuture = !!(
      snoozedUntil && !Number.isNaN(snoozedUntil.getTime()) && snoozedUntil.getTime() > now.getTime()
    );

    const shouldKeepSnoozed = existing.status === "SNOOZED" && isSnoozedInFuture && !isNewTrigger;
    const shouldKeepClosed = (existing.status === "RESOLVED" || existing.status === "DISMISSED") && !isNewTrigger;

    const statusUpdate: any = {};
    if (!shouldKeepSnoozed && !shouldKeepClosed) {
      statusUpdate.status = "ACTIVE";
      statusUpdate.resolvedAt = null;
      statusUpdate.dismissedAt = null;
      statusUpdate.snoozedUntil = null;
    }

    const updated = await (prisma as any).assistantItem.update({
      where: { id: existing.id },
      data: {
        leadId: params.leadId ?? null,
        ...(context === "AGENCY" ? { teamId } : { teamId: null }),
        type: params.type,
        priority: params.priority,
        ...statusUpdate,
        title: params.title,
        message: params.message,
        dueAt: params.dueAt ?? null,
        primaryAction: (params.primaryAction as any) ?? null,
        secondaryAction: (params.secondaryAction as any) ?? null,
        metadata: nextMetadata,
      },
    });

    await this.emitItemUpdated(params.ownerId, updated, { context, teamId });
    return updated;
  }

  static async recalculateForRealtor(realtorId: string) {
    const now = new Date();
    const today = startOfDay(now);
    const recentClientThreshold = addDays(now, -14);

    const leads = await prisma.lead.findMany({
      where: {
        realtorId,
        OR: [
          {
            status: {
              in: [
                "RESERVED",
                "ACCEPTED",
                "WAITING_REALTOR_ACCEPT",
                "WAITING_OWNER_APPROVAL",
                "CONFIRMED",
              ] as any,
            },
          },
          {
            clientMessages: {
              some: {
                fromClient: true,
                createdAt: { gte: recentClientThreshold },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        pipelineStage: true,
        nextActionDate: true,
        nextActionNote: true,
        visitDate: true,
        visitTime: true,
        ownerApproved: true,
        property: {
          select: {
            title: true,
          },
        },
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    const leadIds = leads.map((l) => l.id);

    const leadCreatedEvents = await (prisma as any).leadEvent.findMany({
      where: {
        leadId: { in: leadIds },
        type: "LEAD_CREATED",
      },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, metadata: true },
    });
    const leadSourceMap = new Map<string, any>(
      (leadCreatedEvents || []).map((e: any) => [e.leadId, e.metadata || null])
    );

    const lastNotes = await prisma.leadNote.findMany({
      where: { leadId: { in: leadIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastNoteMap = new Map(lastNotes.map((n) => [n.leadId, n.createdAt]));

    const lastInternalMessages = await prisma.leadMessage.findMany({
      where: { leadId: { in: leadIds }, senderId: realtorId },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastInternalMsgMap = new Map(lastInternalMessages.map((m) => [m.leadId, m.createdAt]));

    const lastHumanProChat = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: false, source: "HUMAN" as any },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastHumanProChatMap = new Map(lastHumanProChat.map((m) => [m.leadId, m.createdAt]));

    const lastProChat = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: false },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastProChatMap = new Map(lastProChat.map((m) => [m.leadId, m.createdAt]));

    let readReceipts: any[] = [];
    try {
      readReceipts = await (prisma as any).leadChatReadReceipt.findMany({
        where: { userId: String(realtorId), leadId: { in: leadIds } },
        select: { leadId: true, lastReadAt: true },
      });
    } catch {
      readReceipts = [];
    }
    const readMap = new Map<string, Date>(
      (readReceipts || [])
        .filter((r: any) => r?.leadId && r?.lastReadAt)
        .map((r: any) => [String(r.leadId), new Date(r.lastReadAt)])
    );

    const lastAutoReplyEvents = await (prisma as any).leadEvent
      .findMany({
        where: { leadId: { in: leadIds }, type: "AUTO_REPLY_SENT" as any },
        orderBy: { createdAt: "desc" },
        distinct: ["leadId"],
        select: { leadId: true, createdAt: true, metadata: true },
      })
      .catch(() => []);
    const lastAutoReplyMap = new Map<string, any>((lastAutoReplyEvents || []).map((e: any) => [String(e.leadId), e]));

    const visitRequestedEvents = await (prisma as any).leadEvent
      .findMany({
        where: { leadId: { in: leadIds }, type: "VISIT_REQUESTED" as any },
        orderBy: { createdAt: "desc" },
        distinct: ["leadId"],
        select: { leadId: true, createdAt: true, metadata: true },
      })
      .catch(() => []);
    const visitRequestedMap = new Map<string, any>((visitRequestedEvents || []).map((e: any) => [String(e.leadId), e]));

    const visitConfirmedEvents = await (prisma as any).leadEvent
      .findMany({
        where: { leadId: { in: leadIds }, type: "VISIT_CONFIRMED" as any },
        orderBy: { createdAt: "desc" },
        distinct: ["leadId"],
        select: { leadId: true, createdAt: true },
      })
      .catch(() => []);
    const visitConfirmedMap = new Map<string, any>((visitConfirmedEvents || []).map((e: any) => [String(e.leadId), e]));

    const firstClientMessages = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: true },
      orderBy: { createdAt: "asc" },
      distinct: ["leadId"],
      select: { id: true, leadId: true, createdAt: true, content: true },
    });
    const firstClientMsgMap = new Map(
      (firstClientMessages || []).map((m: any) => [m.leadId, { id: m.id, createdAt: m.createdAt, content: m.content }])
    );

    const lastClientMessages = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: true },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { id: true, leadId: true, createdAt: true, content: true },
    });
    const lastClientMsgMap = new Map(
      (lastClientMessages || []).map((m: any) => [m.leadId, { id: m.id, createdAt: m.createdAt, content: m.content }])
    );

    const recentClientMessages = await prisma.leadClientMessage.findMany({
      where: {
        leadId: { in: leadIds },
        fromClient: true,
        createdAt: { gte: addDays(now, -14) },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, leadId: true, createdAt: true, content: true },
    });

    const dedupeKeys = new Set<string>();

    const SLA_MINUTES_BY_CHANNEL: Record<string, number> = {
      CHAT: 15,
      FORM: 30,
      WHATSAPP: 60,
    };

    const channelLabel: Record<string, string> = {
      CHAT: "Chat",
      FORM: "Formulário",
      WHATSAPP: "WhatsApp",
    };

    for (const lead of leads) {
      const propertyTitle = lead.property?.title || "Imóvel";
      const clientName = lead.contact?.name || "Cliente";

      if (lead.status === "RESERVED") {
        const key = `NEW_LEAD:${lead.id}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          context: "REALTOR",
          ownerId: realtorId,
          leadId: lead.id,
          type: "NEW_LEAD",
          priority: "HIGH",
          title: "Novo lead aguardando sua decisão",
          message: `${clientName} pediu informações sobre ${propertyTitle}.`,
          dueAt: null,
          dedupeKey: key,
          primaryAction: { type: "OPEN_CHAT", leadId: lead.id },
          secondaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          metadata: { status: lead.status },
        });
      }

      if (lead.nextActionDate) {
        const d = new Date(lead.nextActionDate);
        if (!Number.isNaN(d.getTime())) {
          if (d < today) {
            const key = `REMINDER_OVERDUE:${lead.id}:${startOfDay(d).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "REALTOR",
              ownerId: realtorId,
              leadId: lead.id,
              type: "REMINDER_OVERDUE",
              priority: "HIGH",
              title: "Lembrete vencido",
              message: lead.nextActionNote
                ? `Próximo passo: ${lead.nextActionNote}`
                : `Você tinha um próximo passo marcado para ${clientName}.`,
              dueAt: d,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "SET_REMINDER", leadId: lead.id },
            });
          } else if (isSameDay(d, today)) {
            const key = `REMINDER_TODAY:${lead.id}:${startOfDay(d).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "REALTOR",
              ownerId: realtorId,
              leadId: lead.id,
              type: "REMINDER_TODAY",
              priority: "MEDIUM",
              title: "Lembrete para hoje",
              message: lead.nextActionNote
                ? `Próximo passo: ${lead.nextActionNote}`
                : `Você marcou um próximo passo para hoje com ${clientName}.`,
              dueAt: d,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "SET_REMINDER", leadId: lead.id },
            });
          }
        }
      }

      if (lead.visitDate) {
        const vd = new Date(lead.visitDate);
        if (!Number.isNaN(vd.getTime())) {
          if (isSameDay(vd, today)) {
            const key = `VISIT_TODAY:${lead.id}:${startOfDay(vd).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "REALTOR",
              ownerId: realtorId,
              leadId: lead.id,
              type: "VISIT_TODAY",
              priority: "HIGH",
              title: "Visita hoje",
              message: `Visita marcada para hoje${lead.visitTime ? ` às ${lead.visitTime}` : ""}.`,
              dueAt: vd,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "OPEN_CHAT", leadId: lead.id },
            });
          } else if (isSameDay(vd, addDays(today, 1))) {
            const key = `VISIT_TOMORROW:${lead.id}:${startOfDay(vd).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "REALTOR",
              ownerId: realtorId,
              leadId: lead.id,
              type: "VISIT_TOMORROW",
              priority: "MEDIUM",
              title: "Visita amanhã",
              message: `Visita marcada para amanhã${lead.visitTime ? ` às ${lead.visitTime}` : ""}.`,
              dueAt: vd,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "OPEN_CHAT", leadId: lead.id },
            });
          }

          if (lead.visitTime && lead.ownerApproved === null) {
            const key = `OWNER_APPROVAL_PENDING:${lead.id}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "REALTOR",
              ownerId: realtorId,
              leadId: lead.id,
              type: "OWNER_APPROVAL_PENDING",
              priority: "HIGH",
              title: "Aguardando aprovação do proprietário",
              message: `A visita está pendente de aprovação do proprietário.`,
              dueAt: vd,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "OPEN_CHAT", leadId: lead.id },
            });
          }
        }
      }

      const lastNoteAt = lastNoteMap.get(lead.id) as Date | undefined;
      const lastInternalMsgAt = lastInternalMsgMap.get(lead.id) as Date | undefined;
      const lastProChatAt = lastProChatMap.get(lead.id) as Date | undefined;
      const lastHumanProChatAt = lastHumanProChatMap.get(lead.id) as Date | undefined;

      const lastContactCandidates: Date[] = [];
      if (lastNoteAt) lastContactCandidates.push(lastNoteAt);
      if (lastInternalMsgAt) lastContactCandidates.push(lastInternalMsgAt);
      if (lastProChatAt) lastContactCandidates.push(lastProChatAt);

      const lastContactAt =
        lastContactCandidates.length > 0
          ? new Date(Math.max(...lastContactCandidates.map((x) => x.getTime())))
          : null;

      const sourceMeta = leadSourceMap.get(lead.id) as any;
      const leadSource = (sourceMeta as any)?.source || null;

      const firstClient = firstClientMsgMap.get(lead.id) as any;
      const lastClient = lastClientMsgMap.get(lead.id) as any;

      const hasClientMessage = !!firstClient?.createdAt;

      const isFormLead = leadSource === "CONTACT_FORM" || leadSource === "VISIT_REQUEST";

      const isFirstClientForm =
        !!isFormLead &&
        !!firstClient?.createdAt &&
        !Number.isNaN(new Date(firstClient.createdAt).getTime());

      const channelsToCheck: Array<"FORM" | "CHAT"> = [];
      if (isFirstClientForm) channelsToCheck.push("FORM");
      channelsToCheck.push("CHAT");

      for (const channel of channelsToCheck) {
        // Se ainda não houve qualquer contato do corretor/owner e já existe mensagem do cliente,
        // queremos garantir que o aviso de "não respondida" apareça imediatamente.

        const lastReplyAt = channel === "CHAT" ? lastProChatAt || null : lastContactAt;

        const clientMessagesForLead = (recentClientMessages || []).filter((m: any) => m.leadId === lead.id);

        const clientMsgsInChannel = clientMessagesForLead.filter((m: any) => {
          if (channel === "FORM") {
            return isFirstClientForm && firstClient?.createdAt && new Date(m.createdAt).getTime() === new Date(firstClient.createdAt).getTime();
          }
          // CHAT
          if (isFirstClientForm && firstClient?.createdAt) {
            return new Date(m.createdAt).getTime() !== new Date(firstClient.createdAt).getTime();
          }
          return true;
        });

        const lastClientInChannel =
          channel === "FORM"
            ? firstClient
            : (() => {
                if (!lastClient?.createdAt) return null;
                if (isFirstClientForm && firstClient?.createdAt) {
                  const sameAsFirst =
                    new Date(lastClient.createdAt).getTime() === new Date(firstClient.createdAt).getTime();
                  if (sameAsFirst) return null;
                }
                return lastClient;
              })();

        if (!lastClientInChannel?.createdAt) continue;
        const lastClientAt = new Date(lastClientInChannel.createdAt);
        if (Number.isNaN(lastClientAt.getTime())) continue;

        const lastReadAt = readMap.get(String(lead.id)) || null;
        const lastReadMs = lastReadAt && !Number.isNaN(lastReadAt.getTime()) ? lastReadAt.getTime() : 0;
        const lastReplyMs = lastReplyAt && !Number.isNaN(new Date(lastReplyAt).getTime()) ? new Date(lastReplyAt).getTime() : 0;

        const unreadMsgs = clientMsgsInChannel.filter((m: any) => {
          const d = new Date(m.createdAt);
          const ms = d.getTime();
          if (Number.isNaN(ms)) return false;
          if (!lastReadMs) return true;
          return ms > lastReadMs;
        });

        const unansweredMsgs = clientMsgsInChannel.filter((m: any) => {
          const d = new Date(m.createdAt);
          const ms = d.getTime();
          if (Number.isNaN(ms)) return false;
          if (!lastReplyMs) return true;
          return ms > lastReplyMs;
        });

        const unreadCount = unreadMsgs.length;
        const unansweredCount = unansweredMsgs.length;
        const hasUnread = unreadCount > 0;
        const hasUnanswered = unansweredCount > 0;
        if (!hasUnanswered) continue;

        const firstUnansweredAt = hasUnanswered ? new Date(unansweredMsgs[0].createdAt) : null;
        const firstPendingAt = firstUnansweredAt || lastClientAt;

        const slaMinutes = SLA_MINUTES_BY_CHANNEL[channel] ?? 30;
        const dueAt = addMinutes(firstPendingAt, slaMinutes);

        const msToDue = dueAt.getTime() - now.getTime();
        const isOverdue = msToDue <= 0;

        const priority: "LOW" | "MEDIUM" | "HIGH" = isOverdue || msToDue <= 5 * 60 * 1000 ? "HIGH" : "MEDIUM";

        const lastPreview = String(lastClientInChannel.content || "").trim().slice(0, 140);
        const countBase = unansweredCount;
        const countText = countBase === 1 ? "uma mensagem" : `${countBase} mensagens`;
        const title = `Cliente aguardando ação (${channelLabel[channel] || channel})`;
        const statusLabel = hasUnread && hasUnanswered ? "não lida e sem resposta" : hasUnread ? "não lida" : "sem resposta";
        const message = lastPreview
          ? `${clientName} enviou ${countText} (${statusLabel}). Última: “${lastPreview}”`
          : `${clientName} enviou ${countText} (${statusLabel}).`;

        const key = `UNANSWERED_CLIENT_MESSAGE:${lead.id}:${channel}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          context: "REALTOR",
          ownerId: realtorId,
          leadId: lead.id,
          type: "UNANSWERED_CLIENT_MESSAGE",
          priority,
          title,
          message,
          dueAt,
          dedupeKey: key,
          primaryAction: { type: "OPEN_CHAT", leadId: lead.id },
          secondaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          metadata: {
            channel,
            unreadCount,
            unansweredCount,
            hasUnread,
            hasUnanswered,
            lastReadAt: lastReadAt ? lastReadAt.toISOString() : null,
            lastReplyAt: lastReplyAt ? new Date(lastReplyAt).toISOString() : null,
            lastClientAt: lastClientAt.toISOString(),
            firstPendingAt: firstPendingAt.toISOString(),
            slaMinutes,
            leadSource,
          },
        });
      }

      const visitRequested = visitRequestedMap.get(String(lead.id)) as any;
      if (visitRequested?.createdAt) {
        const requestedAt = safeDate(visitRequested.createdAt);
        const confirmedAt = safeDate((visitConfirmedMap.get(String(lead.id)) as any)?.createdAt);
        const isConfirmedByEvent = !!(requestedAt && confirmedAt && confirmedAt.getTime() > requestedAt.getTime());
        const isConfirmedByLead = !!lead.visitDate;
        const visitRequestedClientMessageId = safeString((visitRequested as any)?.metadata?.clientMessageId);
        const autoForVisit = lastAutoReplyMap.get(String(lead.id)) as any;
        const autoClientMessageId = safeString(autoForVisit?.metadata?.clientMessageId);
        const autoVisitHandoffFlag = (autoForVisit as any)?.metadata?.aiJson?.visitHandoffNeeded;
        const isAutoReplySameMessage = !!(visitRequestedClientMessageId && autoClientMessageId && visitRequestedClientMessageId === autoClientMessageId);
        const shouldSuppressLegacyFalseVisit = isAutoReplySameMessage && autoVisitHandoffFlag === false;

        if (requestedAt && !isConfirmedByEvent && !isConfirmedByLead && !shouldSuppressLegacyFalseVisit) {
          const key = `VISIT_REQUESTED:${lead.id}`;
          dedupeKeys.add(key);

          const dueAt = addMinutes(requestedAt, 60);
          const msToDue = dueAt.getTime() - now.getTime();
          const priority: "LOW" | "MEDIUM" | "HIGH" = msToDue <= 0 || now.getTime() - requestedAt.getTime() <= 2 * 60 * 60 * 1000 ? "HIGH" : "MEDIUM";

          const prefs = (visitRequested as any)?.metadata?.preferences || null;
          const pPeriod = safeString((prefs as any)?.period);
          const pTime = safeString((prefs as any)?.time);
          const pDays = Array.isArray((prefs as any)?.days) ? (prefs as any).days.filter(Boolean) : [];
          const prefsText = [pPeriod, pTime, pDays.length ? pDays.join(", ") : ""].filter(Boolean).join(" | ");

          const lastClientPreview = safeString((lastClient as any)?.content).slice(0, 140);
          const message = prefsText
            ? `Solicitação de visita. Preferências: ${prefsText}${lastClientPreview ? `. Última: “${lastClientPreview}”` : "."}`
            : `Solicitação de visita${lastClientPreview ? `. Última: “${lastClientPreview}”` : "."}`;

          await this.upsertFromRule({
            context: "REALTOR",
            ownerId: realtorId,
            leadId: lead.id,
            type: "VISIT_REQUESTED",
            priority,
            title: "Solicitação de visita",
            message,
            dueAt,
            dedupeKey: key,
            primaryAction: { type: "OPEN_CHAT", leadId: lead.id },
            secondaryAction: { type: "OPEN_LEAD", leadId: lead.id },
            metadata: {
              requestedAt: requestedAt.toISOString(),
              prefs: prefs || null,
              clientMessageId: visitRequestedClientMessageId || null,
            },
          });
        }
      }

      const lastClientAt2 = safeDate((lastClient as any)?.createdAt);
      const lastClientId2 = safeString((lastClient as any)?.id);
      const lastAutoReply = lastAutoReplyMap.get(String(lead.id)) as any;
      const lastAutoReplyAt = safeDate(lastAutoReply?.createdAt);
      const lastAutoReplyClientMessageId = safeString(lastAutoReply?.metadata?.clientMessageId);
      const hasAutoReplyForLatest =
        (!!lastAutoReplyAt && !!lastClientAt2 && lastAutoReplyAt.getTime() >= lastClientAt2.getTime() && lastAutoReplyAt.getTime() - lastClientAt2.getTime() <= 60 * 60 * 1000) ||
        (!!lastClientId2 && !!lastAutoReplyClientMessageId && lastAutoReplyClientMessageId === lastClientId2);

      const needsHumanFollowUp = !!(lastClientAt2 && (!lastHumanProChatAt || lastHumanProChatAt.getTime() < lastClientAt2.getTime()));

      if (hasAutoReplyForLatest && needsHumanFollowUp) {
        const handoff = detectOfflineAssistantHandoffType(safeString((lastClient as any)?.content));
        const autoJson = (lastAutoReply as any)?.metadata?.aiJson || null;
        const finalHandoffNeeded = Boolean(
          (autoJson as any)?.finalHandoffNeeded ?? (autoJson as any)?.handoffNeeded ?? false
        );
        if (handoff && finalHandoffNeeded) {
          const key = `HANDOFF:${lead.id}:${handoff.type}`;
          dedupeKeys.add(key);

          const dueAt = lastClientAt2 ? addMinutes(lastClientAt2, handoff.slaMinutes) : null;
          const lastPreview = safeString((lastClient as any)?.content).slice(0, 140);
          const message = lastPreview
            ? `${clientName}: “${lastPreview}”`
            : `${clientName} pediu ajuda do corretor.`;

          await this.upsertFromRule({
            context: "REALTOR",
            ownerId: realtorId,
            leadId: lead.id,
            type: handoff.type,
            priority: handoff.priority,
            title: handoff.title,
            message,
            dueAt,
            dedupeKey: key,
            primaryAction: { type: "OPEN_CHAT", leadId: lead.id },
            secondaryAction: { type: "OPEN_LEAD", leadId: lead.id },
            metadata: {
              lastClientMessageId: lastClientId2 || null,
              lastClientAt: lastClientAt2 ? lastClientAt2.toISOString() : null,
              lastHumanAt: lastHumanProChatAt ? new Date(lastHumanProChatAt).toISOString() : null,
              lastAutoReplyAt: lastAutoReplyAt ? lastAutoReplyAt.toISOString() : null,
              autoReplyClientMessageId: lastAutoReplyClientMessageId || null,
              autoReplyHandoffNeeded: Boolean((autoJson as any)?.handoffNeeded),
              autoReplyFinalHandoffNeeded: finalHandoffNeeded,
              offlineAssistant: true,
            },
          });
        }
      }

      const firstContactThreshold = new Date(lead.createdAt);
      firstContactThreshold.setHours(firstContactThreshold.getHours() + 2);
      const hasAnyContact = !!lastContactAt;
      if (!hasAnyContact && now > firstContactThreshold && lead.status === "ACCEPTED") {
        const key = `LEAD_NO_FIRST_CONTACT:${lead.id}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          context: "REALTOR",
          ownerId: realtorId,
          leadId: lead.id,
          type: "LEAD_NO_FIRST_CONTACT",
          priority: "HIGH",
          title: "Falta registrar o primeiro contato",
          message: `Você assumiu este lead, mas ainda não registrou o primeiro contato.`,
          dueAt: firstContactThreshold,
          dedupeKey: key,
          primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          secondaryAction: { type: "OPEN_CHAT", leadId: lead.id },
        });
      }

      const staleThreshold = addDays(now, -3);
      if (lead.status === "ACCEPTED" && lastContactAt && lastContactAt < staleThreshold) {
        const key = `STALE_LEAD:${lead.id}:${startOfDay(lastContactAt).toISOString().slice(0, 10)}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          context: "REALTOR",
          ownerId: realtorId,
          leadId: lead.id,
          type: "STALE_LEAD",
          priority: "MEDIUM",
          title: "Lead parado há alguns dias",
          message: `Sem registro de contato recente com ${clientName}.`,
          dueAt: lastContactAt,
          dedupeKey: key,
          primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          secondaryAction: { type: "SET_REMINDER", leadId: lead.id },
        });
      }
    }

    const weekStart = (() => {
      const d = startOfDay(now);
      const day = d.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diffToMonday);
      return d;
    })();

    const weekKey = `WEEKLY_SUMMARY:${weekStart.toISOString().slice(0, 10)}`;
    dedupeKeys.add(weekKey);

    const weeklyDueAt = new Date(weekStart);
    weeklyDueAt.setHours(9, 0, 0, 0);

    await this.upsertFromRule({
      context: "REALTOR",
      ownerId: realtorId,
      leadId: null,
      type: "WEEKLY_SUMMARY",
      priority: "LOW",
      title: "Resumo da semana",
      message: "Quando tiver 3 minutos, revise o que merece atenção e defina os próximos passos.",
      dueAt: weeklyDueAt,
      dedupeKey: weekKey,
      primaryAction: null,
      secondaryAction: null,
      metadata: {
        weekStart: weekStart.toISOString(),
      },
    });

    // Auto-resolve items from RULE that are no longer applicable
    await (prisma as any).assistantItem.updateMany({
      where: {
        context: "REALTOR",
        ownerId: realtorId,
        source: "RULE",
        dedupeKey: { notIn: Array.from(dedupeKeys) },
        status: { in: ["ACTIVE", "SNOOZED"] },
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    await this.emitItemsRecalculated(realtorId, { count: dedupeKeys.size });

    return { count: dedupeKeys.size };
  }

  static async recalculateForAgencyTeam(ownerId: string, teamId: string) {
    const now = new Date();
    const today = startOfDay(now);

    const leads = await prisma.lead.findMany({
      where: {
        teamId,
        OR: [
          {
            status: {
              in: [
                "RESERVED",
                "ACCEPTED",
                "WAITING_REALTOR_ACCEPT",
                "WAITING_OWNER_APPROVAL",
                "CONFIRMED",
              ] as any,
            },
          },
          {
            // In agency context we still surface recent client messages as a pending task,
            // but actions will be restricted to opening the CRM page.
            clientMessages: {
              some: {
                fromClient: true,
                createdAt: { gte: addDays(now, -14) },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        realtorId: true,
        status: true,
        createdAt: true,
        nextActionDate: true,
        nextActionNote: true,
        visitDate: true,
        visitTime: true,
        ownerApproved: true,
        property: {
          select: {
            title: true,
          },
        },
        contact: {
          select: {
            name: true,
          },
        },
      },
    });

    const leadIds = (leads || []).map((l) => String(l.id)).filter(Boolean);

    const leadCreatedEvents = leadIds.length
      ? await (prisma as any).leadEvent.findMany({
          where: {
            leadId: { in: leadIds },
            type: "LEAD_CREATED",
          },
          orderBy: { createdAt: "desc" },
          distinct: ["leadId"],
          select: { leadId: true, metadata: true },
        })
      : [];
    const leadSourceMap = new Map<string, any>((leadCreatedEvents || []).map((e: any) => [e.leadId, e.metadata || null]));

    const lastProChat = leadIds.length
      ? await prisma.leadClientMessage.findMany({
          where: { leadId: { in: leadIds }, fromClient: false },
          orderBy: { createdAt: "desc" },
          distinct: ["leadId"],
          select: { leadId: true, createdAt: true },
        })
      : [];
    const lastProChatMap = new Map(lastProChat.map((m: any) => [String(m.leadId), m.createdAt]));

    const firstClientMessages = leadIds.length
      ? await prisma.leadClientMessage.findMany({
          where: { leadId: { in: leadIds }, fromClient: true },
          orderBy: { createdAt: "asc" },
          distinct: ["leadId"],
          select: { leadId: true, createdAt: true, content: true },
        })
      : [];
    const firstClientMsgMap = new Map(
      (firstClientMessages || []).map((m: any) => [String(m.leadId), { createdAt: m.createdAt, content: m.content }])
    );

    const lastClientMessages = leadIds.length
      ? await prisma.leadClientMessage.findMany({
          where: { leadId: { in: leadIds }, fromClient: true },
          orderBy: { createdAt: "desc" },
          distinct: ["leadId"],
          select: { leadId: true, createdAt: true, content: true },
        })
      : [];
    const lastClientMsgMap = new Map(
      (lastClientMessages || []).map((m: any) => [String(m.leadId), { createdAt: m.createdAt, content: m.content }])
    );

    const recentClientMessages = leadIds.length
      ? await prisma.leadClientMessage.findMany({
          where: {
            leadId: { in: leadIds },
            fromClient: true,
            createdAt: { gte: addDays(now, -14) },
          },
          orderBy: { createdAt: "asc" },
          select: { leadId: true, createdAt: true, content: true },
        })
      : [];

    const openLeadUrl = (leadId?: string | null) =>
      leadId
        ? `/agency/teams/${teamId}/crm?lead=${encodeURIComponent(String(leadId))}`
        : `/agency/teams/${teamId}/crm`;

    const dedupeKeys = new Set<string>();

    const openTeamChatUrl = (threadId: string) => `/agency/team-chat?thread=${encodeURIComponent(String(threadId))}`;

    try {
      const teamRow: any = await (prisma as any).team.findUnique({
        where: { id: String(teamId) },
        select: {
          members: {
            select: {
              userId: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      });

      const realtorLabelById = new Map<string, string>();
      for (const m of (teamRow?.members || []) as any[]) {
        const rid = m?.userId ? String(m.userId) : "";
        if (!rid) continue;
        const label = (m?.user?.name || m?.user?.email || "Corretor") as string;
        realtorLabelById.set(rid, String(label));
      }

      const threads: any[] = await (prisma as any).teamChatThread.findMany({
        where: { teamId: String(teamId) },
        select: { id: true, realtorId: true },
      });

      const threadIds = (threads || []).map((t) => String(t.id)).filter(Boolean);
      if (threadIds.length) {
        const receipts = await (prisma as any).teamChatReadReceipt.findMany({
          where: { userId: String(ownerId), threadId: { in: threadIds } },
          select: { threadId: true, lastReadAt: true },
        });

        const lastReadByThread = new Map<string, Date>();
        for (const r of receipts || []) {
          if (r?.threadId && r?.lastReadAt) lastReadByThread.set(String(r.threadId), new Date(r.lastReadAt));
        }

        const lastMessages = await (prisma as any).teamChatMessage.findMany({
          where: { threadId: { in: threadIds } },
          orderBy: { createdAt: "desc" },
          distinct: ["threadId"],
          select: { threadId: true, senderId: true, createdAt: true },
        });
        const lastMsgByThread = new Map<string, any>();
        for (const m of lastMessages || []) {
          if (m?.threadId) lastMsgByThread.set(String(m.threadId), m);
        }

        const lastOwnerMessages = await (prisma as any).teamChatMessage.findMany({
          where: { threadId: { in: threadIds }, senderId: String(ownerId) },
          orderBy: { createdAt: "desc" },
          distinct: ["threadId"],
          select: { threadId: true, createdAt: true },
        });
        const lastOwnerByThread = new Map<string, Date>();
        for (const m of lastOwnerMessages || []) {
          if (m?.threadId && m?.createdAt) lastOwnerByThread.set(String(m.threadId), new Date(m.createdAt));
        }

        const SLA_AWAITING_RESPONSE_MINUTES = 30;

        for (const t of threads || []) {
          const threadId = String(t.id);
          const realtorId = t?.realtorId ? String(t.realtorId) : null;

          const realtorLabel = realtorId ? realtorLabelById.get(String(realtorId)) || "Corretor" : "Corretor";

          const lastReadAt = lastReadByThread.get(threadId) || null;
          const lastReadMs = lastReadAt && !Number.isNaN(lastReadAt.getTime()) ? lastReadAt.getTime() : 0;

          const unreadCount = await (prisma as any).teamChatMessage.count({
            where: {
              threadId,
              senderId: { not: String(ownerId) },
              ...(lastReadMs ? { createdAt: { gt: new Date(lastReadMs) } } : {}),
            },
          });

          if (Number(unreadCount || 0) > 0) {
            const key = `TEAM_CHAT_UNREAD:${threadId}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "AGENCY",
              ownerId,
              teamId,
              leadId: null,
              type: "TEAM_CHAT_UNREAD",
              priority: "HIGH",
              title: `Chat do time: mensagens não lidas`,
              message: `${realtorLabel}: ${unreadCount === 1 ? "1 mensagem" : `${unreadCount} mensagens`} pendente${unreadCount === 1 ? "" : "s"}.`,
              dueAt: null,
              dedupeKey: key,
              primaryAction: { type: "OPEN_PAGE", url: openTeamChatUrl(threadId) },
              secondaryAction: null,
              metadata: { threadId, realtorId, unreadCount: Number(unreadCount || 0) },
            });
          }

          const lastMsg = lastMsgByThread.get(threadId) || null;
          const lastMsgAt = lastMsg?.createdAt ? new Date(lastMsg.createdAt) : null;
          const lastMsgAtMs = lastMsgAt && !Number.isNaN(lastMsgAt.getTime()) ? lastMsgAt.getTime() : 0;
          if (!lastMsgAtMs) continue;

          const lastSenderId = lastMsg?.senderId ? String(lastMsg.senderId) : "";
          const lastOwnerAt = lastOwnerByThread.get(threadId) || null;
          const lastOwnerMs = lastOwnerAt && !Number.isNaN(lastOwnerAt.getTime()) ? lastOwnerAt.getTime() : 0;

          const awaitingResponse =
            lastSenderId && String(lastSenderId) !== String(ownerId) && (!lastOwnerMs || lastMsgAtMs > lastOwnerMs);

          if (awaitingResponse) {
            const dueAt = addMinutes(new Date(lastMsgAtMs), SLA_AWAITING_RESPONSE_MINUTES);
            const msToDue = dueAt.getTime() - now.getTime();
            const priority: "LOW" | "MEDIUM" | "HIGH" =
              msToDue <= 0 ? "HIGH" : msToDue <= 30 * 60 * 1000 ? "MEDIUM" : "LOW";

            const key = `TEAM_CHAT_AWAITING_RESPONSE:${threadId}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "AGENCY",
              ownerId,
              teamId,
              leadId: null,
              type: "TEAM_CHAT_AWAITING_RESPONSE",
              priority,
              title: `Chat do time: aguardando seu retorno`,
              message: `${realtorLabel} está aguardando seu retorno.`,
              dueAt,
              dedupeKey: key,
              primaryAction: { type: "OPEN_PAGE", url: openTeamChatUrl(threadId) },
              secondaryAction: null,
              metadata: { threadId, realtorId, lastMessageAt: new Date(lastMsgAtMs).toISOString() },
            });
          }
        }
      }
    } catch {
      // ignore
    }

    const SLA_MINUTES_BY_CHANNEL: Record<string, number> = {
      CHAT: 15,
      FORM: 30,
      WHATSAPP: 60,
    };

    const channelLabel: Record<string, string> = {
      CHAT: "Chat",
      FORM: "Formulário",
      WHATSAPP: "WhatsApp",
    };

    for (const lead of leads) {
      const propertyTitle = lead.property?.title || "Imóvel";
      const clientName = lead.contact?.name || "Cliente";

      if (!lead.realtorId && lead.status !== "RESERVED") {
        const key = `LEAD_UNASSIGNED:${lead.id}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          context: "AGENCY",
          ownerId,
          teamId,
          leadId: lead.id,
          type: "LEAD_UNASSIGNED",
          priority: "HIGH",
          title: "Lead sem corretor responsável",
          message: `${clientName} pediu informações sobre ${propertyTitle}.`,
          dueAt: null,
          dedupeKey: key,
          primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
          secondaryAction: null,
          metadata: { status: lead.status },
        });
      }

      const lastProChatAt = lastProChatMap.get(String(lead.id)) || null;

      const sourceMeta = leadSourceMap.get(String(lead.id)) as any;
      const leadSource = (sourceMeta as any)?.source || null;

      const firstClient = firstClientMsgMap.get(String(lead.id)) as any;
      const lastClient = lastClientMsgMap.get(String(lead.id)) as any;

      const isFormLead = leadSource === "CONTACT_FORM" || leadSource === "VISIT_REQUEST";
      const isFirstClientForm =
        !!isFormLead &&
        !!firstClient?.createdAt &&
        !Number.isNaN(new Date(firstClient.createdAt).getTime());

      const channelsToCheck: Array<"FORM" | "CHAT"> = [];
      if (isFirstClientForm) channelsToCheck.push("FORM");
      channelsToCheck.push("CHAT");

      for (const channel of channelsToCheck) {
        const lastReplyAt = lastProChatAt || null;

        const clientMessagesForLead = (recentClientMessages || []).filter((m: any) => String(m.leadId) === String(lead.id));

        const clientMsgsInChannel = clientMessagesForLead.filter((m: any) => {
          if (channel === "FORM") {
            return (
              isFirstClientForm &&
              firstClient?.createdAt &&
              new Date(m.createdAt).getTime() === new Date(firstClient.createdAt).getTime()
            );
          }

          if (isFirstClientForm && firstClient?.createdAt) {
            return new Date(m.createdAt).getTime() !== new Date(firstClient.createdAt).getTime();
          }
          return true;
        });

        const lastClientInChannel =
          channel === "FORM"
            ? firstClient
            : (() => {
                if (!lastClient?.createdAt) return null;
                if (isFirstClientForm && firstClient?.createdAt) {
                  const sameAsFirst =
                    new Date(lastClient.createdAt).getTime() === new Date(firstClient.createdAt).getTime();
                  if (sameAsFirst) return null;
                }
                return lastClient;
              })();

        if (!lastClientInChannel?.createdAt) continue;
        const lastClientAt = new Date(lastClientInChannel.createdAt);
        if (Number.isNaN(lastClientAt.getTime())) continue;

        const hasUnread = !lastReplyAt ? true : lastClientAt > lastReplyAt;
        if (!hasUnread) continue;

        const unreadMsgs = clientMsgsInChannel.filter((m: any) => {
          const d = new Date(m.createdAt);
          if (Number.isNaN(d.getTime())) return false;
          return !lastReplyAt ? true : d > lastReplyAt;
        });

        const unreadCount = unreadMsgs.length || 1;
        const firstUnreadAt = unreadMsgs.length > 0 ? new Date(unreadMsgs[0].createdAt) : lastClientAt;

        const slaMinutes = SLA_MINUTES_BY_CHANNEL[channel] ?? 30;
        const dueAt = addMinutes(firstUnreadAt, slaMinutes);
        const msToDue = dueAt.getTime() - now.getTime();
        const isOverdue = msToDue <= 0;
        const priority: "LOW" | "MEDIUM" | "HIGH" = isOverdue || msToDue <= 5 * 60 * 1000 ? "HIGH" : "MEDIUM";

        const lastPreview = String(lastClientInChannel.content || "").trim().slice(0, 140);
        const countText = unreadCount === 1 ? "uma mensagem" : `${unreadCount} mensagens`;
        const title = `Cliente aguardando resposta (${channelLabel[channel] || channel})`;
        const message = lastPreview
          ? `${clientName} enviou ${countText} e ainda não recebeu retorno. Última: “${lastPreview}”`
          : `${clientName} enviou ${countText} e ainda não recebeu retorno.`;

        const key = `UNANSWERED_CLIENT_MESSAGE:${lead.id}:${channel}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          context: "AGENCY",
          ownerId,
          teamId,
          leadId: lead.id,
          type: "UNANSWERED_CLIENT_MESSAGE",
          priority,
          title,
          message,
          dueAt,
          dedupeKey: key,
          primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
          secondaryAction: null,
          metadata: {
            channel,
            unreadCount,
            lastClientAt: lastClientAt.toISOString(),
            firstUnreadAt: firstUnreadAt.toISOString(),
            slaMinutes,
            leadSource,
          },
        });
      }

      const firstContactThreshold = new Date(lead.createdAt);
      firstContactThreshold.setHours(firstContactThreshold.getHours() + 2);
      const hasAnyProContact = !!lastProChatAt;
      if (!hasAnyProContact && now > firstContactThreshold && lead.status === "ACCEPTED") {
        const key = `LEAD_NO_FIRST_CONTACT:${lead.id}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          context: "AGENCY",
          ownerId,
          teamId,
          leadId: lead.id,
          type: "LEAD_NO_FIRST_CONTACT",
          priority: "HIGH",
          title: "Falta registrar o primeiro contato",
          message: `Ainda não há registro de retorno para ${clientName}.`,
          dueAt: firstContactThreshold,
          dedupeKey: key,
          primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
          secondaryAction: null,
        });
      }

      const staleThreshold = addDays(now, -3);
      const lastInteractionMs = Math.max(
        lastClient?.createdAt ? new Date(lastClient.createdAt).getTime() : 0,
        lastProChatAt ? new Date(lastProChatAt).getTime() : 0
      );
      if (lead.status === "ACCEPTED" && lastInteractionMs > 0 && lastInteractionMs < staleThreshold.getTime()) {
        const lastInteractionAt = new Date(lastInteractionMs);
        const key = `STALE_LEAD:${lead.id}:${startOfDay(lastInteractionAt).toISOString().slice(0, 10)}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          context: "AGENCY",
          ownerId,
          teamId,
          leadId: lead.id,
          type: "STALE_LEAD",
          priority: "MEDIUM",
          title: "Lead parado há alguns dias",
          message: `Sem movimentação recente com ${clientName}.`,
          dueAt: lastInteractionAt,
          dedupeKey: key,
          primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
          secondaryAction: null,
        });
      }

      if (lead.status === "RESERVED") {
        const key = `NEW_LEAD:${lead.id}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          context: "AGENCY",
          ownerId,
          teamId,
          leadId: lead.id,
          type: "NEW_LEAD",
          priority: "HIGH",
          title: "Novo lead aguardando decisão",
          message: `${clientName} pediu informações sobre ${propertyTitle}.`,
          dueAt: null,
          dedupeKey: key,
          primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
          secondaryAction: null,
          metadata: { status: lead.status },
        });
      }

      if (lead.nextActionDate) {
        const d = new Date(lead.nextActionDate);
        if (!Number.isNaN(d.getTime())) {
          if (d < today) {
            const key = `REMINDER_OVERDUE:${lead.id}:${startOfDay(d).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "AGENCY",
              ownerId,
              teamId,
              leadId: lead.id,
              type: "REMINDER_OVERDUE",
              priority: "HIGH",
              title: "Lembrete vencido",
              message: lead.nextActionNote
                ? `Próximo passo: ${lead.nextActionNote}`
                : `Você tinha um próximo passo marcado para ${clientName}.`,
              dueAt: d,
              dedupeKey: key,
              primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
              secondaryAction: null,
            });
          } else if (isSameDay(d, today)) {
            const key = `REMINDER_TODAY:${lead.id}:${startOfDay(d).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "AGENCY",
              ownerId,
              teamId,
              leadId: lead.id,
              type: "REMINDER_TODAY",
              priority: "MEDIUM",
              title: "Lembrete para hoje",
              message: lead.nextActionNote
                ? `Próximo passo: ${lead.nextActionNote}`
                : `Você marcou um próximo passo para hoje com ${clientName}.`,
              dueAt: d,
              dedupeKey: key,
              primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
              secondaryAction: null,
            });
          }
        }
      }

      if (lead.visitDate) {
        const vd = new Date(lead.visitDate);
        if (!Number.isNaN(vd.getTime())) {
          if (isSameDay(vd, today)) {
            const key = `VISIT_TODAY:${lead.id}:${startOfDay(vd).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "AGENCY",
              ownerId,
              teamId,
              leadId: lead.id,
              type: "VISIT_TODAY",
              priority: "HIGH",
              title: "Visita hoje",
              message: `Visita marcada para hoje${lead.visitTime ? ` às ${lead.visitTime}` : ""}.`,
              dueAt: vd,
              dedupeKey: key,
              primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
              secondaryAction: null,
            });
          } else if (isSameDay(vd, addDays(today, 1))) {
            const key = `VISIT_TOMORROW:${lead.id}:${startOfDay(vd).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "AGENCY",
              ownerId,
              teamId,
              leadId: lead.id,
              type: "VISIT_TOMORROW",
              priority: "MEDIUM",
              title: "Visita amanhã",
              message: `Visita marcada para amanhã${lead.visitTime ? ` às ${lead.visitTime}` : ""}.`,
              dueAt: vd,
              dedupeKey: key,
              primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
              secondaryAction: null,
            });
          }

          if (lead.visitTime && lead.ownerApproved === null) {
            const key = `OWNER_APPROVAL_PENDING:${lead.id}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              context: "AGENCY",
              ownerId,
              teamId,
              leadId: lead.id,
              type: "OWNER_APPROVAL_PENDING",
              priority: "HIGH",
              title: "Aguardando aprovação do proprietário",
              message: "A visita está pendente de aprovação do proprietário.",
              dueAt: vd,
              dedupeKey: key,
              primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(lead.id) },
              secondaryAction: null,
            });
          }
        }
      }
    }

    const weekStart = (() => {
      const d = startOfDay(now);
      const day = d.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diffToMonday);
      return d;
    })();

    const weekKey = `WEEKLY_SUMMARY:${weekStart.toISOString().slice(0, 10)}`;
    dedupeKeys.add(weekKey);

    const weeklyDueAt = new Date(weekStart);
    weeklyDueAt.setHours(9, 0, 0, 0);

    await this.upsertFromRule({
      context: "AGENCY",
      ownerId,
      teamId,
      leadId: null,
      type: "WEEKLY_SUMMARY",
      priority: "LOW",
      title: "Resumo da semana",
      message: "Quando tiver 3 minutos, revise o que merece atenção e defina os próximos passos.",
      dueAt: weeklyDueAt,
      dedupeKey: weekKey,
      primaryAction: { type: "OPEN_PAGE", url: openLeadUrl(null) },
      secondaryAction: null,
      metadata: {
        weekStart: weekStart.toISOString(),
      },
    });

    await (prisma as any).assistantItem.updateMany({
      where: {
        context: "AGENCY",
        ownerId,
        teamId,
        source: "RULE",
        dedupeKey: { notIn: Array.from(dedupeKeys) },
        status: { in: ["ACTIVE", "SNOOZED"] },
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    await this.emitItemsRecalculated(ownerId, { count: dedupeKeys.size }, { context: "AGENCY", teamId });

    return { count: dedupeKeys.size };
  }
}
