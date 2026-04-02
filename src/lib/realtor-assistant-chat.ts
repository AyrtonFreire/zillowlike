import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeReason, sanitizeSummary } from "@/lib/ai-guardrails";
import {
  extractOfflineAssistantClientSlots,
  formatOfflineAssistantClientSlots,
  mergeOfflineAssistantClientSlots,
  type OfflineAssistantClientSlots,
} from "@/lib/offline-assistant-slots";
import { ClientMatchService } from "@/lib/client-match-service";
import { SimilarPropertiesService } from "@/lib/similar-properties-service";

export type AssistantChatIntent =
  | "RECOMMEND_PROPERTIES"
  | "CLIENT_PORTFOLIO"
  | "PIPELINE_ANALYSIS"
  | "FOLLOW_UP"
  | "SCHEDULE"
  | "PROPERTY_ANALYSIS"
  | "SEARCH"
  | "MANAGER_SUMMARY"
  | "GENERAL";

export type AssistantChatMemory = {
  version: 1;
  summary: string;
  preferenceSlots?: OfflineAssistantClientSlots;
  recentIntents: AssistantChatIntent[];
  focusedLeadId?: string | null;
  focusedClientId?: string | null;
  focusedClientName?: string | null;
  focusedPropertyId?: string | null;
  focusedPropertyTitle?: string | null;
  updatedAt: string;
};

type ThreadHistoryMessage = {
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

type LeadMetrics = {
  activeTotal: number;
  byStage: Record<string, number>;
  inAttendanceTotal: number;
  pendingReplyTotal: number;
  pendingReplyLeads: Array<{
    leadId: string;
    contactName: string | null;
    propertyTitle: string | null;
    pipelineStage: string | null;
  }>;
};

type PropertyMetrics = {
  total: number;
  activeTotal: number;
  byStatus: Record<string, number>;
};

type PropertySummary = {
  id: string;
  title: string;
  status: string;
  city: string;
  state: string;
  neighborhood: string | null;
  createdAt: string;
  views: number;
  leads: number;
  favorites: number;
  daysSinceLastLead: number | null;
  conversionRatePct: number;
};

export type AssistantChatPropertyCard = {
  id: string;
  title: string;
  status: string;
  neighborhood: string | null;
  city: string;
  state: string;
  views?: number;
  leads?: number;
  conversionRatePct?: number | null;
  daysSinceLastLead?: number | null;
  matchScore?: number | null;
  reasons?: string[];
};

type RetrievedLead = {
  id: string;
  contactName: string | null;
  propertyTitle: string | null;
  pipelineStage: string | null;
  status: string | null;
  nextActionNote: string | null;
  score: number;
};

type RetrievedClient = {
  id: string;
  name: string;
  teamId: string;
  intent: string | null;
  pipelineStage: string | null;
  assignedUserId: string | null;
  preferenceSummary: string | null;
  score: number;
};

export type AssistantChatToolContext = {
  intent: AssistantChatIntent;
  memory: AssistantChatMemory | null;
  memorySummary: string;
  preferenceSummary: string;
  threadHistorySummary: string;
  toolSummary: string;
  retrievedClients: RetrievedClient[];
  retrievedLeads: RetrievedLead[];
  retrievedProperties: AssistantChatPropertyCard[];
  properties: AssistantChatPropertyCard[];
  focusedClient: RetrievedClient | null;
};

export type AssistantChatContextInput = {
  threadId: string;
  userId: string;
  role: string | null;
  teamId?: string | null;
  leadId?: string | null;
  lead?: {
    id: string;
    realtorId?: string | null;
    property?: { id?: string | null; title?: string | null } | null;
    teamId?: string | null;
    contact?: { name?: string | null } | null;
  } | null;
  userMessage: string;
  threadHistory: ThreadHistoryMessage[];
  leadMetrics?: LeadMetrics | null;
  propertyMetrics?: PropertyMetrics | null;
  propertiesSummary?: PropertySummary[];
};

function safeString(value: any) {
  return String(value ?? "").trim();
}

function normalizeText(value: string) {
  const raw = safeString(value).toLowerCase();
  try {
    return raw.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  } catch {
    return raw;
  }
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/[^a-z0-9]+/i)
        .map((x) => x.trim())
        .filter((x) => x.length >= 2)
    )
  ).slice(0, 20);
}

function includesAny(text: string, items: Array<string | RegExp>) {
  for (const item of items) {
    if (typeof item === "string") {
      if (text.includes(item)) return true;
      continue;
    }
    if (item.test(text)) return true;
  }
  return false;
}

function dedupe<T>(items: T[]) {
  return Array.from(new Set(items));
}

function scoreAgainstQuery(text: string, query: string) {
  const base = normalizeText(text);
  const q = normalizeText(query);
  if (!base || !q) return 0;
  let score = 0;
  if (base.includes(q)) score += 12;
  const tokens = tokenize(q);
  for (const token of tokens) {
    if (base.includes(token)) score += token.length >= 5 ? 5 : 3;
  }
  return score;
}

function formatThreadHistorySummary(threadHistory: ThreadHistoryMessage[]) {
  const recent = (Array.isArray(threadHistory) ? threadHistory : []).slice(-8);
  if (recent.length === 0) return "";
  return recent
    .map((msg) => `${msg.role === "USER" ? "Corretor" : "Assistente"}: ${sanitizeSummary(msg.content, 180)}`)
    .join("\n");
}

function mapClientPurposeToSlots(intent: string | null | undefined): OfflineAssistantClientSlots | undefined {
  const raw = safeString(intent).toUpperCase();
  if (raw === "BUY") return { purpose: "COMPRA" };
  if (raw === "RENT") return { purpose: "LOCACAO" };
  return undefined;
}

function serializeMemory(memory: AssistantChatMemory | null | undefined) {
  try {
    return JSON.stringify(memory || null);
  } catch {
    return "";
  }
}

export async function getAssistantChatMemory(threadId: string) {
  const rows = await (prisma as any).realtorAssistantChatMessage.findMany({
    where: { threadId: String(threadId), role: "SYSTEM" },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { data: true },
  });

  for (const row of rows || []) {
    const data = row?.data && typeof row.data === "object" ? (row.data as any) : null;
    const memory = data?.kind === "ASSISTANT_MEMORY_V1" ? data?.memory : null;
    if (!memory || typeof memory !== "object") continue;
    const summary = sanitizeSummary(safeString(memory.summary), 240);
    const recentIntents = Array.isArray(memory.recentIntents)
      ? memory.recentIntents
          .map((x: any) => safeString(x) as AssistantChatIntent)
          .filter(Boolean)
          .slice(0, 6)
      : [];
    return {
      version: 1 as const,
      summary,
      preferenceSlots: memory.preferenceSlots && typeof memory.preferenceSlots === "object" ? memory.preferenceSlots : undefined,
      recentIntents,
      focusedLeadId: safeString(memory.focusedLeadId) || null,
      focusedClientId: safeString(memory.focusedClientId) || null,
      focusedClientName: safeString(memory.focusedClientName) || null,
      focusedPropertyId: safeString(memory.focusedPropertyId) || null,
      focusedPropertyTitle: safeString(memory.focusedPropertyTitle) || null,
      updatedAt: safeString(memory.updatedAt) || new Date().toISOString(),
    } satisfies AssistantChatMemory;
  }

  return null;
}

export function routeAssistantIntent(message: string): AssistantChatIntent {
  const q = normalizeText(message);
  if (!q) return "GENERAL";

  const asksRecommendation =
    includesAny(q, ["recom", "suger", "match", "opcoes", "opcoes", "opções", "parecidos", "similares"]) ||
    (/\bimovei/.test(q) && includesAny(q, ["cliente", "perfil", "busca", "procura", "preferencia", "preferência"]));

  if (asksRecommendation) return "RECOMMEND_PROPERTIES";

  if (/\bcliente\b|\bclientes\b|\bcarteira\b|\binstitucional\b/.test(q)) return "CLIENT_PORTFOLIO";
  if (/\bfunil\b|\bpipeline\b|\betapa\b|\betapas\b|\bleads ativos\b|\bem atendimento\b/.test(q)) return "PIPELINE_ANALYSIS";
  if (/\bfollow\s*-?up\b|\bpendente\b|\bpendencias\b|\bpendências\b|\bresposta\b|\bretorno\b/.test(q)) return "FOLLOW_UP";
  if (/\bagenda\b|\bvisita\b|\bvisitas\b|\bhorario\b|\bhorário\b|\bagendar\b|\bmarcar\b/.test(q)) return "SCHEDULE";
  if (/\bestoque\b|\bimovel\b|\bimoveis\b|\bconversao\b|\bconversão\b|\bbaixa conversao\b|\bbaixa conversão\b/.test(q)) return "PROPERTY_ANALYSIS";
  if (/\bresumo\b|\bsemana\b|\bprioridad\b|\bplano\b|\bfoco\b/.test(q)) return "MANAGER_SUMMARY";
  if (/\bbusca\b|\bprocur\b|\bencontre\b|\bachar\b|\bache\b/.test(q)) return "SEARCH";
  return "GENERAL";
}

async function resolveAccessibleTeamIds(params: { userId: string; role: string | null; explicitTeamId?: string | null }) {
  const ids = new Set<string>();
  const explicitTeamId = safeString(params.explicitTeamId);
  if (explicitTeamId) ids.add(explicitTeamId);

  const [ownedTeams, memberTeams] = await Promise.all([
    (prisma as any).team.findMany({ where: { ownerId: String(params.userId) }, select: { id: true } }).catch(() => []),
    (prisma as any).teamMember.findMany({ where: { userId: String(params.userId) }, select: { teamId: true } }).catch(() => []),
  ]);

  for (const row of ownedTeams || []) {
    const id = safeString((row as any)?.id);
    if (id) ids.add(id);
  }
  for (const row of memberTeams || []) {
    const id = safeString((row as any)?.teamId);
    if (id) ids.add(id);
  }

  return Array.from(ids);
}

function buildAccessiblePropertyWhere(params: { userId: string; teamIds: string[] }) {
  const teamIds = Array.isArray(params.teamIds) ? params.teamIds.filter(Boolean) : [];
  const orWhere: Prisma.PropertyWhereInput[] = [{ ownerId: String(params.userId) }, { capturerRealtorId: String(params.userId) }];
  if (teamIds.length > 0) orWhere.push({ teamId: { in: teamIds } });
  return { OR: orWhere } satisfies Prisma.PropertyWhereInput;
}

function buildAccessibleClientWhere(params: { userId: string; role: string | null; teamIds: string[] }) {
  const teamIds = Array.isArray(params.teamIds) ? params.teamIds.filter(Boolean) : [];
  if (params.role === "AGENCY") {
    return { teamId: { in: teamIds.length ? teamIds : ["__none__"] } } as any;
  }
  return {
    OR: [
      { assignedUserId: String(params.userId) },
      { createdByUserId: String(params.userId) },
      ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
    ],
  } as any;
}

function buildAccessibleLeadWhere(params: { userId: string; teamIds: string[] }) {
  const teamIds = Array.isArray(params.teamIds) ? params.teamIds.filter(Boolean) : [];
  return {
    OR: [
      { realtorId: String(params.userId) },
      { userId: String(params.userId) },
      { property: { is: { ownerId: String(params.userId) } } },
      ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
    ],
  } satisfies Prisma.LeadWhereInput;
}

async function retrieveRelevantProperties(params: {
  userId: string;
  teamIds: string[];
  query: string;
  summaries: PropertySummary[];
}) {
  const q = safeString(params.query);
  const fromSummary = (Array.isArray(params.summaries) ? params.summaries : [])
    .map((item) => ({
      id: String(item.id),
      title: String(item.title || "Imóvel"),
      status: String(item.status || ""),
      neighborhood: item.neighborhood ? String(item.neighborhood) : null,
      city: String(item.city || ""),
      state: String(item.state || ""),
      views: Number(item.views || 0),
      leads: Number(item.leads || 0),
      conversionRatePct: item.conversionRatePct == null ? null : Number(item.conversionRatePct),
      daysSinceLastLead: item.daysSinceLastLead == null ? null : Number(item.daysSinceLastLead),
    }))
    .filter((item) => scoreAgainstQuery(
      [item.title, item.neighborhood || "", item.city, item.state, item.status].filter(Boolean).join(" | "),
      q
    ) > 0)
    .sort((a, b) => scoreAgainstQuery(
      [b.title, b.neighborhood || "", b.city, b.state, b.status].filter(Boolean).join(" | "),
      q
    ) - scoreAgainstQuery(
      [a.title, a.neighborhood || "", a.city, a.state, a.status].filter(Boolean).join(" | "),
      q
    ))
    .slice(0, 4)
    .map((item) => ({
      ...item,
      reasons: [sanitizeReason("Encontrado pelo contexto do estoque")],
    }));

  if (fromSummary.length >= 3 || !q) {
    return fromSummary;
  }

  const rows = await prisma.property.findMany({
    where: buildAccessiblePropertyWhere({ userId: params.userId, teamIds: params.teamIds }),
    select: {
      id: true,
      title: true,
      status: true,
      neighborhood: true,
      city: true,
      state: true,
      description: true,
      _count: { select: { views: true, leads: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  return (rows || [])
    .map((row) => {
      const score = scoreAgainstQuery(
        [row.title, row.neighborhood || "", row.city, row.state, row.description || "", row.status || ""].join(" | "),
        q
      );
      return {
        id: String(row.id),
        title: String(row.title || "Imóvel"),
        status: String(row.status || ""),
        neighborhood: row.neighborhood ? String(row.neighborhood) : null,
        city: String(row.city || ""),
        state: String(row.state || ""),
        views: Number((row as any)?._count?.views || 0),
        leads: Number((row as any)?._count?.leads || 0),
        conversionRatePct: null,
        daysSinceLastLead: null,
        score,
      };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      neighborhood: row.neighborhood,
      city: row.city,
      state: row.state,
      views: row.views,
      leads: row.leads,
      conversionRatePct: row.conversionRatePct,
      daysSinceLastLead: row.daysSinceLastLead,
      reasons: [sanitizeReason("Encontrado por busca lexical no estoque")],
    }));
}

async function retrieveRelevantLeads(params: { userId: string; teamIds: string[]; query: string }) {
  const q = safeString(params.query);
  if (!q) return [] as RetrievedLead[];

  const rows = await prisma.lead.findMany({
    where: buildAccessibleLeadWhere({ userId: params.userId, teamIds: params.teamIds }),
    select: {
      id: true,
      status: true,
      pipelineStage: true,
      nextActionNote: true,
      message: true,
      contact: { select: { name: true } },
      property: { select: { title: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  return (rows || [])
    .map((row) => {
      const score = scoreAgainstQuery(
        [row.contact?.name || "", row.property?.title || "", row.nextActionNote || "", row.message || "", row.pipelineStage || ""].join(" | "),
        q
      );
      return {
        id: String(row.id),
        contactName: row.contact?.name ? String(row.contact.name) : null,
        propertyTitle: row.property?.title ? String(row.property.title) : null,
        pipelineStage: row.pipelineStage ? String(row.pipelineStage) : null,
        status: row.status ? String(row.status) : null,
        nextActionNote: row.nextActionNote ? String(row.nextActionNote) : null,
        score,
      } satisfies RetrievedLead;
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

async function retrieveRelevantClients(params: { userId: string; role: string | null; teamIds: string[]; query: string }) {
  const q = safeString(params.query);
  const rows = await (prisma as any).client.findMany({
    where: buildAccessibleClientWhere({ userId: params.userId, role: params.role, teamIds: params.teamIds }),
    select: {
      id: true,
      teamId: true,
      name: true,
      intent: true,
      pipelineStage: true,
      assignedUserId: true,
      notes: true,
      preference: {
        select: {
          city: true,
          state: true,
          neighborhoods: true,
          purpose: true,
          minPrice: true,
          maxPrice: true,
          bedroomsMin: true,
          bathroomsMin: true,
          areaMin: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 40,
  });

  return (rows || [])
    .map((row: Prisma.ClientGetPayload<{ select: { id: true; teamId: true; name: true; intent: true; pipelineStage: true; assignedUserId: true; notes: true; preference: { select: { city: true; state: true; neighborhoods: true; purpose: true; minPrice: true; maxPrice: true; bedroomsMin: true; bathroomsMin: true; areaMin: true; } } } }>) => {
      const pref = row.preference
        ? [
            row.preference.city && row.preference.state ? `${row.preference.city}/${row.preference.state}` : "",
            Array.isArray(row.preference.neighborhoods) ? row.preference.neighborhoods.join(", ") : "",
            row.preference.purpose ? `finalidade=${row.preference.purpose}` : "",
            row.preference.minPrice != null || row.preference.maxPrice != null
              ? `faixa=${row.preference.minPrice ?? "?"}-${row.preference.maxPrice ?? "?"}`
              : "",
            row.preference.bedroomsMin != null ? `quartos>=${row.preference.bedroomsMin}` : "",
            row.preference.bathroomsMin != null ? `banheiros>=${row.preference.bathroomsMin}` : "",
            row.preference.areaMin != null ? `area>=${row.preference.areaMin}` : "",
          ]
            .filter(Boolean)
            .join(" | ")
        : "";
      const score = scoreAgainstQuery(
        [row.name || "", row.intent || "", row.pipelineStage || "", row.notes || "", pref].join(" | "),
        q
      );
      return {
        id: String(row.id),
        name: String(row.name || "Cliente"),
        teamId: String(row.teamId || ""),
        intent: row.intent ? String(row.intent) : null,
        pipelineStage: row.pipelineStage ? String(row.pipelineStage) : null,
        assignedUserId: row.assignedUserId ? String(row.assignedUserId) : null,
        preferenceSummary: pref || null,
        score,
      } satisfies RetrievedClient;
    })
    .filter((row: RetrievedClient) => row.score > 0)
    .sort((a: RetrievedClient, b: RetrievedClient) => b.score - a.score)
    .slice(0, 6);
}

async function resolveRecommendedProperties(params: {
  intent: AssistantChatIntent;
  userId: string;
  leadId?: string | null;
  lead?: { realtorId?: string | null } | null;
  focusedClient: RetrievedClient | null;
}) {
  if (params.intent !== "RECOMMEND_PROPERTIES" && params.intent !== "SEARCH" && params.intent !== "CLIENT_PORTFOLIO") {
    return [] as AssistantChatPropertyCard[];
  }

  if (params.leadId && (params.lead?.realtorId || params.userId)) {
    const ownerId = String(params.lead?.realtorId || params.userId);
    const similar = await SimilarPropertiesService.findForLead(String(params.leadId), ownerId, { limit: 4 }).catch(() => []);
    if (Array.isArray(similar) && similar.length > 0) {
      return similar.slice(0, 4).map((item) => ({
        id: String(item.property.id),
        title: String(item.property.title || "Imóvel"),
        status: String(item.property.status || ""),
        neighborhood: item.property.neighborhood ? String(item.property.neighborhood) : null,
        city: String(item.property.city || ""),
        state: String(item.property.state || ""),
        matchScore: Number(item.matchScore || 0),
        reasons: Array.isArray(item.matchReasons) ? item.matchReasons.map((x) => sanitizeReason(String(x))).filter(Boolean).slice(0, 4) : [],
      }));
    }
  }

  if (params.focusedClient?.id && params.focusedClient.teamId) {
    const matches = await ClientMatchService.getOrRefreshMatches({
      clientId: String(params.focusedClient.id),
      teamId: String(params.focusedClient.teamId),
      limit: 4,
    }).catch(() => null);

    if (matches?.items?.length) {
      return matches.items.slice(0, 4).map((item) => ({
        id: String(item.property.id),
        title: String(item.property.title || "Imóvel"),
        status: String(item.property.status || ""),
        neighborhood: item.property.neighborhood ? String(item.property.neighborhood) : null,
        city: String(item.property.city || ""),
        state: String(item.property.state || ""),
        matchScore: Number(item.score || 0),
        reasons: Array.isArray(item.reasons) ? item.reasons.map((x) => sanitizeReason(String(x))).filter(Boolean).slice(0, 4) : [],
      }));
    }
  }

  return [] as AssistantChatPropertyCard[];
}

function buildToolSummary(params: {
  intent: AssistantChatIntent;
  memorySummary: string;
  preferenceSummary: string;
  threadHistorySummary: string;
  leadMetrics?: LeadMetrics | null;
  propertyMetrics?: PropertyMetrics | null;
  retrievedClients: RetrievedClient[];
  retrievedLeads: RetrievedLead[];
  retrievedProperties: AssistantChatPropertyCard[];
  properties: AssistantChatPropertyCard[];
}) {
  const lines: string[] = [];
  lines.push(`Intenção roteada: ${params.intent}`);

  if (params.memorySummary) {
    lines.push("\nMemória do assistente:");
    lines.push(params.memorySummary);
  }

  if (params.preferenceSummary) {
    lines.push("\nPreferências detectadas:");
    lines.push(params.preferenceSummary);
  }

  if (params.threadHistorySummary) {
    lines.push("\nHistórico recente do assistente:");
    lines.push(params.threadHistorySummary);
  }

  if (params.leadMetrics) {
    lines.push("\nMétricas operacionais de leads:");
    lines.push(`- Leads ativos: ${Number(params.leadMetrics.activeTotal || 0)}`);
    lines.push(`- Em atendimento: ${Number(params.leadMetrics.inAttendanceTotal || 0)}`);
    lines.push(`- Aguardando resposta: ${Number(params.leadMetrics.pendingReplyTotal || 0)}`);
  }

  if (params.propertyMetrics) {
    lines.push("\nMétricas operacionais de imóveis:");
    lines.push(`- Imóveis no total: ${Number(params.propertyMetrics.total || 0)}`);
    lines.push(`- Imóveis ativos: ${Number(params.propertyMetrics.activeTotal || 0)}`);
  }

  if (params.retrievedClients.length > 0) {
    lines.push("\nClientes institucionais mais relevantes:");
    params.retrievedClients.slice(0, 4).forEach((client) => {
      lines.push(
        `- clientId=${client.id} | ${client.name} | intent=${client.intent || "(n/a)"} | etapa=${client.pipelineStage || "(n/a)"}${
          client.preferenceSummary ? ` | pref=${client.preferenceSummary}` : ""
        }`
      );
    });
  }

  if (params.retrievedLeads.length > 0) {
    lines.push("\nLeads mais relevantes para a pergunta:");
    params.retrievedLeads.slice(0, 4).forEach((lead) => {
      lines.push(
        `- leadId=${lead.id} | ${lead.contactName || "(sem nome)"} | ${lead.propertyTitle || "(sem imóvel)"} | stage=${lead.pipelineStage || "(n/a)"}${
          lead.nextActionNote ? ` | next=${lead.nextActionNote}` : ""
        }`
      );
    });
  }

  if (params.retrievedProperties.length > 0) {
    lines.push("\nImóveis recuperados por busca lexical:");
    params.retrievedProperties.slice(0, 4).forEach((property) => {
      lines.push(
        `- propertyId=${property.id} | ${property.title} | ${[property.neighborhood, property.city, property.state].filter(Boolean).join(" - ")} | status=${property.status}`
      );
    });
  }

  if (params.properties.length > 0) {
    lines.push("\nImóveis recomendados/priorizados:");
    params.properties.slice(0, 4).forEach((property) => {
      const reasons = Array.isArray(property.reasons) && property.reasons.length > 0 ? ` | motivos=${property.reasons.join(", ")}` : "";
      const matchScore = property.matchScore != null ? ` | match=${property.matchScore}` : "";
      lines.push(
        `- propertyId=${property.id} | ${property.title} | ${[property.neighborhood, property.city, property.state].filter(Boolean).join(" - ")} | status=${property.status}${matchScore}${reasons}`
      );
    });
  }

  return lines.join("\n");
}

export async function buildAssistantChatToolContext(input: AssistantChatContextInput): Promise<AssistantChatToolContext> {
  const intent = routeAssistantIntent(input.userMessage);
  const memory = await getAssistantChatMemory(input.threadId);
  const threadHistorySummary = formatThreadHistorySummary(input.threadHistory);
  const extractedSlots = extractOfflineAssistantClientSlots(input.userMessage);
  const leadIntentSlots = input.leadId && input.lead ? undefined : mapClientPurposeToSlots(null);
  const mergedSlots = mergeOfflineAssistantClientSlots(memory?.preferenceSlots, mergeOfflineAssistantClientSlots(leadIntentSlots, extractedSlots));
  const preferenceSummary = formatOfflineAssistantClientSlots(mergedSlots);
  const memorySummary = memory?.summary ? sanitizeSummary(memory.summary, 240) : "";
  const teamIds = await resolveAccessibleTeamIds({ userId: input.userId, role: input.role, explicitTeamId: input.teamId || input.lead?.teamId || null });

  const [retrievedClients, retrievedLeads, retrievedProperties] = await Promise.all([
    retrieveRelevantClients({ userId: input.userId, role: input.role, teamIds, query: input.userMessage }),
    retrieveRelevantLeads({ userId: input.userId, teamIds, query: input.userMessage }),
    retrieveRelevantProperties({ userId: input.userId, teamIds, query: input.userMessage, summaries: input.propertiesSummary || [] }),
  ]);

  const focusedClient = retrievedClients[0] || null;
  const properties = await resolveRecommendedProperties({
    intent,
    userId: input.userId,
    leadId: input.leadId || null,
    lead: input.lead || null,
    focusedClient,
  });

  const toolSummary = buildToolSummary({
    intent,
    memorySummary,
    preferenceSummary,
    threadHistorySummary,
    leadMetrics: input.leadMetrics || null,
    propertyMetrics: input.propertyMetrics || null,
    retrievedClients,
    retrievedLeads,
    retrievedProperties,
    properties,
  });

  return {
    intent,
    memory,
    memorySummary,
    preferenceSummary,
    threadHistorySummary,
    toolSummary,
    retrievedClients,
    retrievedLeads,
    retrievedProperties,
    properties,
    focusedClient,
  };
}

export async function persistAssistantChatMemory(params: {
  threadId: string;
  previousMemory: AssistantChatMemory | null;
  toolContext: AssistantChatToolContext;
  userMessage: string;
  assistantAnswer: string;
  leadId?: string | null;
}) {
  const extractedSlots = extractOfflineAssistantClientSlots(params.userMessage);
  const mergedSlots = mergeOfflineAssistantClientSlots(params.previousMemory?.preferenceSlots, mergeOfflineAssistantClientSlots(params.toolContext.memory?.preferenceSlots, extractedSlots));
  const focusedClient = params.toolContext.focusedClient;
  const focusedProperty = params.toolContext.properties[0] || params.toolContext.retrievedProperties[0] || null;

  const summaryParts = [
    params.leadId ? `Conversa ligada ao lead ${params.leadId}.` : "",
    focusedClient ? `Cliente em foco: ${focusedClient.name} (${focusedClient.id}).` : "",
    focusedProperty ? `Imóvel em foco: ${focusedProperty.title} (${focusedProperty.id}).` : "",
    params.toolContext.preferenceSummary ? `Preferências: ${params.toolContext.preferenceSummary}.` : "",
    params.toolContext.intent !== "GENERAL" ? `Tema recorrente: ${params.toolContext.intent}.` : "",
    params.assistantAnswer ? `Última resposta: ${sanitizeSummary(params.assistantAnswer, 140)}.` : "",
  ].filter(Boolean);

  const summary = sanitizeSummary(summaryParts.join(" "), 240) || params.previousMemory?.summary || "Contexto operacional do assistente atualizado.";
  const nextMemory: AssistantChatMemory = {
    version: 1,
    summary,
    preferenceSlots: mergedSlots,
    recentIntents: dedupe([params.toolContext.intent, ...(params.previousMemory?.recentIntents || [])]).slice(0, 6) as AssistantChatIntent[],
    focusedLeadId: params.leadId ? String(params.leadId) : params.previousMemory?.focusedLeadId || null,
    focusedClientId: focusedClient?.id || params.previousMemory?.focusedClientId || null,
    focusedClientName: focusedClient?.name || params.previousMemory?.focusedClientName || null,
    focusedPropertyId: focusedProperty?.id || params.previousMemory?.focusedPropertyId || null,
    focusedPropertyTitle: focusedProperty?.title || params.previousMemory?.focusedPropertyTitle || null,
    updatedAt: new Date().toISOString(),
  };

  if (serializeMemory(nextMemory) === serializeMemory(params.previousMemory)) {
    return nextMemory;
  }

  await (prisma as any).realtorAssistantChatMessage.create({
    data: {
      threadId: String(params.threadId),
      role: "SYSTEM",
      content: nextMemory.summary,
      data: {
        kind: "ASSISTANT_MEMORY_V1",
        memory: nextMemory,
      },
    },
  });

  return nextMemory;
}
