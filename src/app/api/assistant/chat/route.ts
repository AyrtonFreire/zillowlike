import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, withErrorHandling } from "@/lib/api-response";
import { withRateLimit } from "@/lib/rate-limiter";

export const runtime = "nodejs";

type Role = "USER" | "OWNER" | "REALTOR" | "AGENCY" | "ADMIN";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
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

type LeadMetrics = {
  activeTotal: number;
  byStage: Record<string, number>;
  inAttendanceTotal: number;
  pendingReplyTotal: number;
  pendingReplyLeads: Array<{ leadId: string; contactName: string | null; propertyTitle: string | null; pipelineStage: string | null }>;
};

const QuerySchema = z
  .object({
    leadId: z.string().min(1).optional(),
  })
  .strict();

const PostSchema = z
  .object({
    leadId: z.string().min(1).nullable().optional(),
    content: z.string().min(1).max(2000),
  })
  .strict();

const ActionSchema = z
  .object({
    type: z
      .enum(["DRAFT_MESSAGE", "SET_REMINDER", "PROPERTY_DIAGNOSIS", "LISTING_IMPROVEMENT"]),
    title: z.string().min(2).max(80),
    impact: z.string().min(2).max(220),
    requiresConfirmation: z.boolean().optional(),
    payload: z.any().optional(),
  })
  .strict();

const OutputSchema = z
  .object({
    answer: z.string().min(1).max(1200),
    highlights: z.array(z.string().min(1).max(140)).max(6).optional(),
    suggestedActions: z.array(ActionSchema).max(6).optional(),
  })
  .strict();

function clampText(value: string, max: number) {
  const s = String(value || "");
  if (s.length <= max) return s;
  return s.slice(0, max).trimEnd();
}

function stripUrls(text: string) {
  return text.replace(/https?:\/\/\S+|www\.[^\s]+/gi, "");
}

function stripPhones(text: string) {
  return text.replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[\s-]?\d{4}/g, "");
}

function stripEmojis(text: string) {
  try {
    return text.replace(/[\p{Extended_Pictographic}]/gu, "");
  } catch {
    return text;
  }
}

function normalizeWhitespace(text: string) {
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeText(raw: string, max: number) {
  const base = String(raw || "");
  const cleaned = normalizeWhitespace(stripEmojis(stripPhones(stripUrls(base))));
  const limited = clampText(cleaned, max);
  return limited.length ? limited : clampText(normalizeWhitespace(stripEmojis(base)), max);
}

function extractJsonObject(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = text.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }
  const userId = session.userId || session.user?.id || null;
  const role = (session.role || session.user?.role || null) as Role | null;
  return { userId: userId ? String(userId) : null, role };
}

function canAccessLead(role: string | null, userId: string, lead: any) {
  if (role === "ADMIN") return true;
  if (lead.realtorId && String(lead.realtorId) === String(userId)) return true;
  if (lead.userId && String(lead.userId) === String(userId)) return true;
  if (lead.property?.ownerId && String(lead.property.ownerId) === String(userId)) return true;
  if (lead.team && String(lead.team.ownerId) === String(userId)) return true;
  return false;
}

function getScopeKey(leadId: string | null | undefined) {
  return leadId ? `lead:${String(leadId)}` : "global";
}

function buildSystemPrompt(leadMode: boolean) {
  const base =
    "Você é o ASSISTENTE INTELIGENTE DO CORRETOR da plataforma ZillowLike (pt-BR).\n" +
    "Regras obrigatórias:\n" +
    "- Nunca invente dados. Se algo não estiver no contexto, diga claramente.\n" +
    "- Nunca chute números. Só informe contagens (ex: leads pendentes / em atendimento) quando o contexto trouxer as métricas.\n" +
    "- Nunca use conhecimento externo para afirmar fatos sobre os dados do corretor. Use SOMENTE o que estiver no contexto fornecido.\n" +
    "- Se a pergunta exigir dados que não estão no contexto, responda que você não tem essa informação no momento e que não está programado para isso.\n" +
    "- Seja direto e objetivo.\n" +
    "- Sem emojis, sem links, sem telefone.\n" +
    "- Se sugerir uma ação operacional, ela DEVE exigir confirmação explícita (requiresConfirmation=true).\n" +
    "\n" +
    "Responda SOMENTE com JSON válido, sem markdown.\n" +
    "Formato: { answer: string, highlights?: string[], suggestedActions?: { type, title, impact, requiresConfirmation, payload }[] }\n" +
    "\n" +
    "Se você sugerir ações, use payloads estruturados assim:\n" +
    "- DRAFT_MESSAGE: payload = { leadId: string, content: string } (rascunho para o cliente; não enviar)\n" +
    "- SET_REMINDER: payload = { leadId: string, date: string|null (ISO), note: string|null }\n" +
    "- PROPERTY_DIAGNOSIS: payload = { propertyId?: string, checklist: string[] } (checklist obrigatório com 3 a 6 itens curtos; se não conseguir, NÃO sugira essa ação)\n" +
    "- LISTING_IMPROVEMENT: payload = { propertyId?: string, checklist: string[] } (checklist obrigatório com 3 a 6 itens curtos; se não conseguir, NÃO sugira essa ação)\n";

  return leadMode
    ? `${base}\nContexto: chat ligado a um lead. Você pode sugerir rascunho de mensagem ao cliente e lembretes internos.`
    : `${base}\nContexto: chat geral. Foque em rotina e diagnóstico. Se faltar dados, peça as informações necessárias.`;
}

function buildUserPrompt(input: {
  message: string;
  lead?: any | null;
  recentClientMessages?: Array<{ createdAt: string; fromClient: boolean; content: string }>;
  propertiesSummary?: PropertySummary[];
  leadMetrics?: LeadMetrics | null;
}) {
  const out: string[] = [];
  out.push("Pedido do corretor:");
  out.push(input.message);

  if (input.lead) {
    const lead = input.lead;
    out.push("\nContexto do lead:");
    out.push(`- LeadId: ${lead.id}`);
    out.push(`- Cliente: ${lead.contact?.name || "(não informado)"}`);
    out.push(`- Imóvel: ${lead.property?.title || "(não informado)"}`);
    if (lead.pipelineStage) out.push(`- Etapa do funil: ${lead.pipelineStage}`);
    if (lead.status) out.push(`- Status: ${lead.status}`);
    if (lead.nextActionNote) out.push(`- Próxima ação anotada: ${lead.nextActionNote}`);
    if (lead.nextActionDate) out.push(`- Data do lembrete: ${lead.nextActionDate}`);

    const msgs = input.recentClientMessages || [];
    if (msgs.length) {
      out.push("\nMensagens recentes (contexto):");
      msgs.slice(-10).forEach((m) => {
        const who = m.fromClient ? "Cliente" : "Corretor";
        const content = String(m.content || "").replace(/\s+/g, " ").slice(0, 220);
        out.push(`- (${m.createdAt}) ${who}: ${content}`);
      });
    }
  }

  if (!input.lead && Array.isArray(input.propertiesSummary) && input.propertiesSummary.length) {
    out.push("\nEstoque de imóveis (use os IDs exatamente, não invente IDs):");
    input.propertiesSummary.slice(0, 12).forEach((p) => {
      const loc = [p.neighborhood, p.city, p.state].filter(Boolean).join(" - ");
      const perf = `views=${p.views}, leads=${p.leads}, conv=${p.conversionRatePct}%, fav=${p.favorites}`;
      const stale = p.daysSinceLastLead == null ? "" : `, diasSemLead=${p.daysSinceLastLead}`;
      out.push(`- propertyId=${p.id} | ${p.title} | ${loc} | status=${p.status} | ${perf}${stale}`);
    });
  }

  if (!input.lead && input.leadMetrics) {
    const m = input.leadMetrics;
    out.push("\nMétricas do CRM (fonte de verdade; não conte WON/LOST como ativo):");
    out.push(`- Leads ativos (exclui WON/LOST e status fechados): ${m.activeTotal}`);
    out.push(`- Leads em atendimento (CONTACT/VISIT/PROPOSAL/DOCUMENTS): ${m.inAttendanceTotal}`);
    out.push(`- Conversas aguardando sua resposta (última msg do cliente): ${m.pendingReplyTotal}`);
    const stages = Object.entries(m.byStage)
      .filter(([, v]) => (Number(v) || 0) > 0)
      .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
      .slice(0, 8)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    if (stages) out.push(`- Ativos por etapa: ${stages}`);

    if (m.pendingReplyLeads.length) {
      out.push("\nLeads aguardando resposta (use leadId exatamente; não invente):");
      m.pendingReplyLeads.slice(0, 6).forEach((l) => {
        out.push(
          `- leadId=${l.leadId} | ${l.contactName || "(sem nome)"} | ${l.propertyTitle || "(sem imóvel)"} | stage=${l.pipelineStage || "(n/a)"}`
        );
      });
    }
  }

  out.push("\nInstrução:");
  out.push(
    "Responda com diagnóstico curto, sugestão prática e próximo passo acionável.\n" +
      "Se a pergunta pedir informação que NÃO está nas seções acima, diga: 'Não tenho essa informação no momento (não está disponível no sistema)' e sugira o que você precisaria para responder."
  );
  return out.join("\n");
}

async function getPropertiesSummaryForUser(userId: string): Promise<PropertySummary[]> {
  const now = new Date();

  const properties = await prisma.property.findMany({
    where: {
      ownerId: String(userId),
    },
    select: {
      id: true,
      title: true,
      status: true,
      city: true,
      state: true,
      neighborhood: true,
      createdAt: true,
      _count: {
        select: {
          favorites: true,
          leads: true,
          views: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  if (!properties.length) return [];

  const propertyIds = properties.map((p) => p.id);
  const lastLeadByProperty = await prisma.lead.groupBy({
    by: ["propertyId"],
    where: { propertyId: { in: propertyIds } },
    _max: { createdAt: true },
  });

  const lastLeadMap = new Map<string, Date | null>(
    (lastLeadByProperty || []).map((row: any) => [String(row.propertyId), row._max?.createdAt || null])
  );

  const summaries: PropertySummary[] = properties.map((p: any) => {
    const views = Number(p._count?.views || 0);
    const leads = Number(p._count?.leads || 0);
    const favorites = Number(p._count?.favorites || 0);
    const conversionRate = views > 0 ? leads / views : 0;
    const conversionRatePct = Math.round(conversionRate * 1000) / 10;

    const lastLeadAt = lastLeadMap.get(String(p.id)) || null;
    const since = lastLeadAt || p.createdAt;
    const daysSinceLastLead = since
      ? Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      id: String(p.id),
      title: String(p.title || ""),
      status: String(p.status || ""),
      city: String(p.city || ""),
      state: String(p.state || ""),
      neighborhood: p.neighborhood ? String(p.neighborhood) : null,
      createdAt: String(p.createdAt),
      views,
      leads,
      favorites,
      daysSinceLastLead,
      conversionRatePct,
    };
  });

  // Priorize imóveis com pouco resultado (sem leads há muito tempo / baixa conversão)
  summaries.sort((a, b) => {
    const aStale = a.daysSinceLastLead ?? -1;
    const bStale = b.daysSinceLastLead ?? -1;
    if (bStale !== aStale) return bStale - aStale;
    if (a.conversionRatePct !== b.conversionRatePct) return a.conversionRatePct - b.conversionRatePct;
    return b.views - a.views;
  });

  return summaries.slice(0, 12);
}

async function getLeadMetricsForRealtor(userId: string): Promise<LeadMetrics> {
  const closedStatuses = ["COMPLETED", "CANCELLED", "EXPIRED", "OWNER_REJECTED"]; // LeadStatus
  const closedStages = ["WON", "LOST"]; // LeadPipelineStage
  const inAttendanceStages = ["CONTACT", "VISIT", "PROPOSAL", "DOCUMENTS"];

  const activeWhere: any = {
    realtorId: String(userId),
    status: { notIn: closedStatuses },
    OR: [{ pipelineStage: null }, { pipelineStage: { notIn: closedStages } }],
  };

  const [activeTotal, groupStages, lastMsgs] = await Promise.all([
    prisma.lead.count({ where: activeWhere }),
    prisma.lead.groupBy({
      by: ["pipelineStage"],
      where: activeWhere,
      _count: { _all: true },
    }),
    prisma.leadClientMessage.findMany({
      where: {
        lead: activeWhere,
      },
      select: {
        leadId: true,
        fromClient: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      take: 200,
    }),
  ]);

  const byStage: Record<string, number> = {};
  for (const row of groupStages as any[]) {
    const key = row.pipelineStage == null ? "(sem etapa)" : String(row.pipelineStage);
    byStage[key] = Number(row._count?._all || 0);
  }

  const inAttendanceTotal = inAttendanceStages.reduce((sum, s) => sum + (Number(byStage[s]) || 0), 0);
  const pendingReplyLeadIds = (lastMsgs || []).filter((m: any) => !!m.fromClient).map((m: any) => String(m.leadId));
  const pendingReplyTotal = pendingReplyLeadIds.length;

  const pendingReplyLeadsRaw = pendingReplyLeadIds.length
    ? await prisma.lead.findMany({
        where: { id: { in: pendingReplyLeadIds.slice(0, 6) } },
        select: {
          id: true,
          pipelineStage: true,
          contact: { select: { name: true } },
          property: { select: { title: true } },
        },
      })
    : [];

  const pendingReplyLeads = (pendingReplyLeadsRaw || []).map((l: any) => ({
    leadId: String(l.id),
    contactName: l.contact?.name ? String(l.contact.name) : null,
    propertyTitle: l.property?.title ? String(l.property.title) : null,
    pipelineStage: l.pipelineStage ? String(l.pipelineStage) : null,
  }));

  return {
    activeTotal: Number(activeTotal || 0),
    byStage,
    inAttendanceTotal,
    pendingReplyTotal,
    pendingReplyLeads,
  };
}

async function callOpenAi(params: { apiKey: string; systemPrompt: string; userPrompt: string }) {
  const model = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);
  let res: Response | null = null;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
      }),
      signal: controller.signal,
    });
  } catch {
    res = null;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res) {
    return { ok: false as const, status: 0, body: "timeout_or_network" };
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false as const, status: res.status, body: txt.slice(0, 2000) };
  }

  const json = (await res.json().catch(() => null)) as OpenAIChatResponse | null;
  const content = json?.choices?.[0]?.message?.content?.trim() || "";
  return { ok: true as const, content };
}

function parseAi(content: string, params?: { leadId?: string | null; allowedPropertyIds?: string[] }) {
  const obj = extractJsonObject(content);
  const parsed = OutputSchema.safeParse(obj);

  const salvage = z
    .object({
      answer: z.string().min(1).max(1200),
      highlights: z.array(z.string()).optional(),
    })
    .passthrough()
    .safeParse(obj);

  if (!parsed.success) {
    if (!salvage.success) return null;
    return {
      answer: sanitizeText(salvage.data.answer, 1200),
      highlights: salvage.data.highlights
        ? salvage.data.highlights.map((h) => sanitizeText(h, 140)).filter(Boolean).slice(0, 6)
        : undefined,
      suggestedActions: undefined,
    };
  }

  const leadId = params?.leadId ? String(params.leadId) : null;
  const allowedPropertyIds = new Set((params?.allowedPropertyIds || []).map((x) => String(x)));

  const safe = {
    answer: sanitizeText(parsed.data.answer, 1200),
    highlights: parsed.data.highlights
      ? parsed.data.highlights.map((h) => sanitizeText(h, 140)).filter(Boolean).slice(0, 6)
      : undefined,
    suggestedActions: parsed.data.suggestedActions
      ? parsed.data.suggestedActions
          .map((a) => {
            const payload = a.payload && typeof a.payload === "object" ? a.payload : {};
            const nextPayload =
              leadId && (a.type === "DRAFT_MESSAGE" || a.type === "SET_REMINDER")
                ? { ...payload, leadId: String((payload as any)?.leadId || leadId) }
                : payload;

            if (a.type === "PROPERTY_DIAGNOSIS" || a.type === "LISTING_IMPROVEMENT") {
              const pid = String((nextPayload as any)?.propertyId || "").trim();
              if (pid && allowedPropertyIds.size > 0 && !allowedPropertyIds.has(pid)) {
                (nextPayload as any).propertyId = undefined;
              }

              const listRaw = (nextPayload as any)?.checklist;
              const list = Array.isArray(listRaw)
                ? listRaw
                    .map((x: any) => sanitizeText(String(x || ""), 120))
                    .filter(Boolean)
                    .slice(0, 6)
                : [];
              if (list.length < 3) {
                return null;
              }
              (nextPayload as any).checklist = list;
            }

            return {
              ...a,
              title: sanitizeText(a.title, 80),
              impact: sanitizeText(a.impact, 220),
              requiresConfirmation: true,
              payload: nextPayload,
            };
          })
          .filter(Boolean)
          .slice(0, 6)
      : undefined,
  };

  return safe;
}

async function getHandler(req: NextRequest) {
  const { userId, role } = await getSessionContext();
  if (!userId) return errorResponse("Não autenticado", 401);
  if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") return errorResponse("Acesso negado", 403, null, "FORBIDDEN");

  const url = new URL(req.url);
  const queryParsed = QuerySchema.safeParse({ leadId: url.searchParams.get("leadId") || undefined });
  if (!queryParsed.success) {
    return errorResponse("Parâmetros inválidos", 400, queryParsed.error.issues, "VALIDATION_ERROR");
  }

  const leadId = queryParsed.data.leadId || null;
  const scopeKey = getScopeKey(leadId);

  const thread = await (prisma as any).realtorAssistantChatThread.findFirst({
    where: { realtorId: String(userId), scopeKey },
    select: { id: true },
  });

  if (!thread) {
    return successResponse({ threadId: null, messages: [] });
  }

  const messages = await (prisma as any).realtorAssistantChatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return successResponse({ threadId: thread.id, messages });
}

async function postHandler(req: NextRequest) {
  const { userId, role } = await getSessionContext();
  if (!userId) return errorResponse("Não autenticado", 401);
  if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") return errorResponse("Acesso negado", 403, null, "FORBIDDEN");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return errorResponse("AI is not configured", 500, null, "OPENAI_API_KEY_MISSING");

  const body = await req.json().catch(() => null);
  const parsedBody = PostSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse("Dados inválidos", 400, parsedBody.error.issues, "VALIDATION_ERROR");
  }

  const leadId = parsedBody.data.leadId ?? null;
  const scopeKey = getScopeKey(leadId);

  let lead: any | null = null;
  let recentClientMessages: Array<{ createdAt: string; fromClient: boolean; content: string }> = [];
  let propertiesSummary: PropertySummary[] = [];
  let allowedPropertyIds: string[] = [];
  let leadMetrics: LeadMetrics | null = null;

  if (leadId) {
    lead = await (prisma as any).lead.findUnique({
      where: { id: String(leadId) },
      select: {
        id: true,
        realtorId: true,
        userId: true,
        pipelineStage: true,
        status: true,
        nextActionNote: true,
        nextActionDate: true,
        contact: { select: { name: true } },
        property: { select: { id: true, title: true, ownerId: true } },
        team: { select: { ownerId: true } },
      },
    });

    if (!lead) return errorResponse("Lead não encontrado", 404);
    if (!canAccessLead(role, String(userId), lead)) return errorResponse("Acesso negado", 403);

    const msgs = await (prisma as any).leadClientMessage.findMany({
      where: { leadId: String(leadId) },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    recentClientMessages = Array.isArray(msgs)
      ? msgs.map((m: any) => ({
          createdAt: String(m.createdAt),
          fromClient: !!m.fromClient,
          content: String(m.content || ""),
        }))
      : [];

    if (lead?.property?.id) {
      allowedPropertyIds = [String(lead.property.id)];
    }
  }

  if (!leadId) {
    try {
      propertiesSummary = await getPropertiesSummaryForUser(String(userId));
      allowedPropertyIds = propertiesSummary.map((p) => p.id);
    } catch {
      propertiesSummary = [];
    }

    try {
      leadMetrics = await getLeadMetricsForRealtor(String(userId));
    } catch {
      leadMetrics = null;
    }
  }

  const thread = await (prisma as any).realtorAssistantChatThread.upsert({
    where: { realtorId_scopeKey: { realtorId: String(userId), scopeKey } },
    create: {
      realtorId: String(userId),
      leadId: leadId ? String(leadId) : null,
      scopeKey,
      title: null,
    },
    update: {
      leadId: leadId ? String(leadId) : null,
    },
  });

  const userMessage = await (prisma as any).realtorAssistantChatMessage.create({
    data: {
      threadId: thread.id,
      role: "USER",
      content: parsedBody.data.content.trim(),
      data: null,
    },
  });

  const systemPrompt = buildSystemPrompt(!!leadId);
  const userPrompt = buildUserPrompt({
    message: parsedBody.data.content.trim(),
    lead,
    recentClientMessages,
    propertiesSummary,
    leadMetrics,
  });

  const attempt = await callOpenAi({ apiKey, systemPrompt, userPrompt });
  if (!attempt.ok) {
    return errorResponse("Não conseguimos gerar a resposta agora.", 502, { status: attempt.status }, "AI_UPSTREAM_ERROR");
  }

  const parsedAi = parseAi(attempt.content, {
    leadId: leadId ? String(leadId) : null,
    allowedPropertyIds,
  });
  if (!parsedAi) {
    return errorResponse(
      "Resposta inválida do modelo.",
      502,
      { sample: attempt.content.slice(0, 1200) },
      "AI_INVALID_JSON"
    );
  }

  const assistantMessage = await (prisma as any).realtorAssistantChatMessage.create({
    data: {
      threadId: thread.id,
      role: "ASSISTANT",
      content: parsedAi.answer,
      data: parsedAi,
    },
  });

  return successResponse({ threadId: thread.id, messages: [userMessage, assistantMessage] });
}

export const GET = withErrorHandling(withRateLimit(getHandler, "default"));
export const POST = withErrorHandling(withRateLimit(postHandler, "ai"));
