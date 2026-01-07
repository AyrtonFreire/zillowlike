import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { LeadPipelineStage, LeadStatus, Prisma } from "@prisma/client";
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

type AssistantUpcomingItem = {
  id: string;
  title: string | null;
  message: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  snoozedUntil: string | null;
  leadId: string | null;
};

type UpcomingLeadActionItem = {
  leadId: string;
  when: string;
  note: string | null;
  contactName: string | null;
  propertyTitle: string | null;
  pipelineStage: string | null;
};

type UpcomingVisitItem = {
  leadId: string;
  when: string;
  contactName: string | null;
  propertyTitle: string | null;
  pipelineStage: string | null;
};

function normalizeQuery(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeOpenPageAction(path: string, title: string, impact: string) {
  return {
    type: "OPEN_PAGE" as const,
    title,
    impact,
    requiresConfirmation: true,
    payload: { path },
  };
}

function makeDefaultReminderAction(leadId: string) {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return {
    type: "SET_REMINDER" as const,
    title: "Lembrete de follow-up",
    impact: "Garantir que você volte neste lead no próximo dia útil",
    requiresConfirmation: true,
    payload: { leadId, date: d.toISOString(), note: "Follow-up" },
  };
}

function formatShortDateTimeBR(value: Date) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  } catch {
    const dd = String(value.getDate()).padStart(2, "0");
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const yyyy = String(value.getFullYear());
    const hh = String(value.getHours()).padStart(2, "0");
    const mi = String(value.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`;
  }
}

function getEffectiveAssistantDateMs(item: AssistantUpcomingItem) {
  const raw = item.status === "SNOOZED" ? item.snoozedUntil || item.dueAt : item.dueAt || item.snoozedUntil;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function buildLeadAccessWhere(userId: string): Prisma.LeadWhereInput {
  return {
    OR: [
      { realtorId: String(userId) },
      { team: { is: { ownerId: String(userId) } } },
      { team: { is: { members: { some: { userId: String(userId) } } } } },
      { property: { is: { ownerId: String(userId) } } },
    ],
  };
}

async function deleteHandler(req: NextRequest) {
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
    return successResponse({ threadId: null, cleared: true });
  }

  await (prisma as any).realtorAssistantChatThread.delete({ where: { id: thread.id } });
  return successResponse({ threadId: null, cleared: true });
}

function tryAnswerDeterministic(input: {
  message: string;
  leadMetrics: LeadMetrics | null;
  propertiesSummary: PropertySummary[];
  propertyMetrics: PropertyMetrics | null;
  upcomingAssistantItems: AssistantUpcomingItem[];
  upcomingLeadActions: UpcomingLeadActionItem[];
  upcomingVisits: UpcomingVisitItem[];
}) {
  const {
    message,
    leadMetrics,
    propertiesSummary,
    propertyMetrics,
    upcomingAssistantItems,
    upcomingLeadActions,
    upcomingVisits,
  } = input;
  if (
    !leadMetrics &&
    (!Array.isArray(propertiesSummary) || !propertiesSummary.length) &&
    (!propertyMetrics || (!propertyMetrics.total && !propertyMetrics.activeTotal)) &&
    (!Array.isArray(upcomingAssistantItems) || upcomingAssistantItems.length === 0) &&
    (!Array.isArray(upcomingLeadActions) || upcomingLeadActions.length === 0) &&
    (!Array.isArray(upcomingVisits) || upcomingVisits.length === 0)
  ) {
    return null;
  }
  const q = normalizeQuery(message);

  const asksHowMany = /\bquantos\b|\bqtd\b|\bnumero\b|\btotal\b/.test(q);

  const asksList =
    /\bquais\b/.test(q) || /\blistar\b/.test(q) || /\bmostre\b/.test(q) || /\bme mostre\b/.test(q);

  const asksPendingReply =
    /aguardando( uma)? resposta/.test(q) ||
    /pendente(s)? de resposta/.test(q) ||
    /pendentes resposta/.test(q) ||
    /ultima msg( do)? cliente/.test(q);

  const asksInAttendance = /em atendimento/.test(q) || /em andamento/.test(q) || /atendimento/.test(q);
  const asksActive = /leads ativos/.test(q) || (/leads/.test(q) && /ativos/.test(q));

  const asksFunnel =
    /por etapa/.test(q) || /por estagio/.test(q) || /funil/.test(q) || /pipeline/.test(q) || /etapas/.test(q);

  const asksLowConversion =
    /baixa conversao/.test(q) ||
    /pouca conversao/.test(q) ||
    (/imoveis/.test(q) && /conversao/.test(q) && /baixa/.test(q));
  const asksNoLeadsProps = /imoveis/.test(q) && (/sem leads/.test(q) || /zero leads/.test(q) || /0 leads/.test(q));
  const asksStaleProps = /imoveis/.test(q) && (/parados/.test(q) || /sem lead ha/.test(q) || /sem leads ha/.test(q));

  const asksProperties = /\bimovel\b|\bimoveis\b/.test(q);
  const asksPropertiesActive = asksProperties && (/\bativos\b/.test(q) || /\bativo\b/.test(q));
  const asksPropertiesTotal = asksProperties && (/\btotal\b/.test(q) || /\bno total\b/.test(q) || /\btenho\b/.test(q));

  const asksAgenda = /\bagenda\b|\bvisita\b|\bvisitas\b|\bcompromisso\b|\bcompromissos\b/.test(q);
  const asksFollowUp =
    /\bfollow\s*-?up\b/.test(q) ||
    /\bproxima acao\b/.test(q) ||
    /\bproximas acoes\b/.test(q) ||
    /\bretornar\b/.test(q) ||
    /\blembrete\b/.test(q) ||
    /\blembretes\b/.test(q);

  const asksToday = /\bhoje\b/.test(q);
  const asksTomorrow = /\bamanha\b/.test(q);
  const asksThisWeek = /\bessa semana\b|\besta semana\b/.test(q);
  const asksDailyPriorities =
    /\bprioridad/.test(q) ||
    /\bo que (eu )?faco\b/.test(q) ||
    /\bo que devo fazer\b/.test(q) ||
    /\bmeu foco\b/.test(q);

  const asksAssistantUpcoming =
    /\blembrete\b|\blembretes\b|\bpendencia\b|\bpendencias\b|\btarefa\b|\btarefas\b/.test(q) &&
    (/\bproxim/.test(q) || /\bvenc/.test(q) || /\bagenda\b/.test(q) || asksList || asksHowMany);

  const makePropertyChecklist = () => [
    "Revisar título e 1ª foto (mais chamativa)",
    "Conferir preço vs concorrentes (ajuste fino)",
    "Melhorar descrição com diferenciais e condições",
    "Adicionar/atualizar fotos (mín. 10; boa iluminação)",
    "Confirmar status e disponibilidade (evitar fricção)",
  ];

  const makePropertyAction = (propertyId: string, title: string, impact: string) => ({
    type: "PROPERTY_DIAGNOSIS" as const,
    title,
    impact,
    requiresConfirmation: true,
    payload: { propertyId, checklist: makePropertyChecklist().slice(0, 5) },
  });

  if (asksAssistantUpcoming) {
    const list = Array.isArray(upcomingAssistantItems) ? upcomingAssistantItems.slice() : [];
    const normalized = list
      .map((it) => {
        const ts = getEffectiveAssistantDateMs(it);
        return { it, ts };
      })
      .filter((x) => typeof x.ts === "number") as Array<{ it: AssistantUpcomingItem; ts: number }>;

    normalized.sort((a, b) => a.ts - b.ts);
    const top = normalized.slice(0, 5);

    if (top.length === 0) {
      return {
        answer:
          "No momento, não encontrei lembretes/pendências com data marcada para vencer. Quer que eu abra o CRM para você ver todas as pendências?",
        suggestedActions: [makeOpenPageAction("/broker/crm", "Abrir CRM", "Ver pendências e próximos passos")],
      };
    }

    const highlights = top
      .map(({ it, ts }) => {
        const when = formatShortDateTimeBR(new Date(ts));
        const title = it.title ? String(it.title).trim() : "(sem título)";
        const msg = it.message ? String(it.message).trim() : "";
        return msg ? `${when} · ${title} · ${msg}` : `${when} · ${title}`;
      })
      .slice(0, 6);

    return {
      answer: `Próximas pendências (${highlights.length}):`,
      highlights,
      suggestedActions: [makeOpenPageAction("/broker/crm", "Abrir CRM", "Ver pendências e próximos passos")],
    };
  }

  if (asksHowMany && (asksPropertiesActive || asksPropertiesTotal) && propertyMetrics) {
    const active = Number(propertyMetrics.activeTotal || 0);
    const total = Number(propertyMetrics.total || 0);

    if (asksPropertiesActive) {
      return {
        answer: `Você possui ${active} imóveis ativos atualmente. Quer que eu abra a tela de imóveis?`,
        highlights: undefined,
        suggestedActions: [makeOpenPageAction("/broker/properties", "Abrir imóveis", "Ver e gerenciar seus imóveis")],
      };
    }

    return {
      answer: `Você possui ${total} imóveis no total. Quer que eu abra a tela de imóveis?`,
      highlights: undefined,
      suggestedActions: [makeOpenPageAction("/broker/properties", "Abrir imóveis", "Ver e filtrar por status")],
    };
  }

  if (leadMetrics && asksHowMany && asksInAttendance) {
    const count = Number(leadMetrics.inAttendanceTotal || 0);
    return {
      answer: `Você tem ${count} leads em atendimento (CONTACT/VISIT/PROPOSAL/DOCUMENTS). Quer que eu abra o CRM?`,
      highlights: undefined,
      suggestedActions: [makeOpenPageAction("/broker/crm", "Abrir CRM", "Ver os leads em atendimento e definir o próximo passo")],
    };
  }

  if (leadMetrics && asksHowMany && asksActive) {
    const count = Number(leadMetrics.activeTotal || 0);
    return {
      answer: `Você tem ${count} leads ativos (exclui WON/LOST e status fechados). Quer que eu abra o CRM?`,
      highlights: undefined,
      suggestedActions: [makeOpenPageAction("/broker/crm", "Abrir CRM", "Ver e priorizar seus leads ativos")],
    };
  }

  if (leadMetrics && (asksHowMany || asksList) && asksFunnel) {
    const entries = Object.entries(leadMetrics.byStage || {})
      .map(([k, v]) => [String(k), Number(v || 0)] as const)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const highlights = entries.slice(0, 12).map(([k, v]) => `${k}: ${v}`);
    const total = Number(leadMetrics.activeTotal || 0);
    return {
      answer: `Distribuição de leads ativos por etapa (total ${total}). Quer que eu abra o CRM?`,
      highlights: highlights.length ? highlights : undefined,
      suggestedActions: [makeOpenPageAction("/broker/crm", "Abrir CRM", "Filtrar por etapa e agir nos maiores gargalos")],
    };
  }

  if ((asksHowMany || asksList) && (asksLowConversion || asksNoLeadsProps || asksStaleProps)) {
    const list = Array.isArray(propertiesSummary) ? propertiesSummary.slice() : [];

    const filtered = list
      .filter((p) => {
        if (!p) return false;
        if (asksNoLeadsProps) return Number(p.leads || 0) === 0 && Number(p.views || 0) > 0;
        if (asksStaleProps) return (p.daysSinceLastLead ?? 0) >= 21;
        return true;
      })
      .sort((a, b) => {
        if (asksStaleProps) return Number(b.daysSinceLastLead || 0) - Number(a.daysSinceLastLead || 0);
        if (asksNoLeadsProps) return Number(b.views || 0) - Number(a.views || 0);
        return Number(a.conversionRatePct || 0) - Number(b.conversionRatePct || 0);
      })
      .slice(0, 8);

    const label = asksNoLeadsProps
      ? "Imóveis com views mas 0 leads"
      : asksStaleProps
        ? "Imóveis parados (>= 21 dias sem lead)"
        : "Imóveis com baixa conversão";

    const highlights = filtered.map((p) => {
      const perf = `views=${p.views}, leads=${p.leads}, conv=${p.conversionRatePct}%`;
      const stale = p.daysSinceLastLead == null ? "" : `, diasSemLead=${p.daysSinceLastLead}`;
      return `propertyId=${p.id} | ${p.title} | ${perf}${stale}`;
    });

    const suggestedActions = filtered.length
      ? [makeOpenPageAction("/broker/properties", "Abrir imóveis", "Abrir o estoque e agir nos imóveis com pior desempenho")]
      : undefined;

    const answer = asksList
      ? `${label} (top ${highlights.length}):${filtered.length ? " Quer que eu abra a tela de imóveis?" : ""}`
      : `${label}: encontrei ${highlights.length} no seu estoque.${filtered.length ? " Quer que eu abra a tela de imóveis?" : ""}`;

    return {
      answer,
      highlights: highlights.length ? highlights : undefined,
      suggestedActions,
    };
  }

  return null;
}

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
      .enum(["DRAFT_MESSAGE", "SET_REMINDER", "PROPERTY_DIAGNOSIS", "LISTING_IMPROVEMENT", "OPEN_PAGE"]),
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
    suggestedActions: z.array(ActionSchema).max(1).optional(),
  })
  .strict();

const AllowedOpenPagePaths = new Set([
  "/broker/dashboard",
  "/broker/crm",
  "/broker/chats",
  "/broker/properties",
  "/broker/queue",
  "/broker/agenda",
  "/broker/teams",
  "/broker/profile",
  "/broker/messages",
]);

function buildFallbackSuggestedActions(params: { message: string; leadId: string | null }) {
  const q = normalizeQuery(params.message);
  if (params.leadId) {
    return [makeDefaultReminderAction(String(params.leadId))];
  }

  if (/\bimovel\b|\bimoveis\b|\bestoque\b/.test(q)) {
    return [makeOpenPageAction("/broker/properties", "Abrir imóveis", "Ver e agir no seu estoque")];
  }
  if (/\blead\b|\bleads\b|\bfunil\b|\bpipeline\b|\batendimento\b/.test(q)) {
    return [makeOpenPageAction("/broker/crm", "Abrir CRM", "Ver, filtrar e priorizar leads")];
  }
  if (/\bchat\b|\bchats\b|\bmensagem\b|\bresponder\b/.test(q)) {
    return [makeOpenPageAction("/broker/chats", "Abrir chats", "Ver conversas e responder clientes")];
  }

  return [makeOpenPageAction("/broker/crm", "Abrir CRM", "Ver visão geral e próximos passos")];
}

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
    "- Se a pergunta exigir dados que não estão no contexto, responda que você não tem essa informação no momento (não aparece no contexto disponível) e indique qual tela do sistema o corretor pode abrir para ver isso.\n" +
    "- Seja direto e objetivo.\n" +
    "- Sem emojis, sem links, sem telefone.\n" +
    "- Se sugerir uma ação operacional, ela DEVE exigir confirmação explícita (requiresConfirmation=true).\n" +
    "- Sempre que fizer sentido, sugira NO MÁXIMO 1 ação prática e relevante para a dúvida do corretor.\n" +
    "- Se você incluir suggestedActions, finalize a resposta perguntando se o corretor quer executar a ação sugerida.\n" +
    "\n" +
    "Responda SOMENTE com JSON válido, sem markdown.\n" +
    "Formato: { answer: string, highlights?: string[], suggestedActions?: { type, title, impact, requiresConfirmation, payload }[] }\n" +
    "\n" +
    "Se você sugerir ações, use payloads estruturados assim:\n" +
    "- DRAFT_MESSAGE: payload = { leadId: string, content: string } (rascunho para o cliente; não enviar)\n" +
    "- SET_REMINDER: payload = { leadId: string, date: string|null (ISO), note: string|null }\n" +
    "- PROPERTY_DIAGNOSIS: payload = { propertyId?: string, checklist: string[] } (checklist obrigatório com 3 a 6 itens curtos; se não conseguir, NÃO sugira essa ação)\n" +
    "- LISTING_IMPROVEMENT: payload = { propertyId?: string, checklist: string[] } (checklist obrigatório com 3 a 6 itens curtos; se não conseguir, NÃO sugira essa ação)\n" +
    "- OPEN_PAGE: payload = { path: string } (deve ser um path interno permitido, ex: /broker/crm, /broker/chats, /broker/properties)\n";

  return leadMode
    ? `${base}\nContexto: chat ligado a um lead. Você pode sugerir rascunho de mensagem ao cliente e lembretes internos.`
    : `${base}\nContexto: chat geral. Foque em rotina e diagnóstico. Se faltar dados, peça as informações necessárias. Neste modo, NÃO sugira SET_REMINDER/DRAFT_MESSAGE (a menos que você tenha um leadId explícito no payload). Prefira OPEN_PAGE e ações de imóveis.`;
}

function buildUserPrompt(input: {
  message: string;
  lead?: any | null;
  recentClientMessages?: Array<{ createdAt: string; fromClient: boolean; content: string }>;
  propertiesSummary?: PropertySummary[];
  leadMetrics?: LeadMetrics | null;
  propertyMetrics?: PropertyMetrics | null;
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

  if (!input.lead && input.propertyMetrics) {
    const pm = input.propertyMetrics;
    out.push("\nMétricas de imóveis (fonte de verdade):");
    out.push(`- Imóveis no total: ${Number(pm.total || 0)}`);
    out.push(`- Imóveis ativos: ${Number(pm.activeTotal || 0)}`);
    const by = Object.entries(pm.byStatus || {})
      .map(([k, v]) => `${k}:${Number(v || 0)}`)
      .sort();
    if (by.length) out.push(`- Por status: ${by.join(", ")}`);
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
      "Se a pergunta pedir informação que NÃO está nas seções acima, diga: 'Não tenho essa informação no momento (não aparece no contexto disponível)' e sugira qual tela o corretor pode abrir (ex: /broker/crm, /broker/chats, /broker/properties, /broker/agenda)."
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

async function getPropertyMetricsForUser(userId: string): Promise<PropertyMetrics> {
  let rows: Array<{ status: any; _count: { _all: number } }> = [];
  try {
    rows = (await (prisma.property as any).groupBy({
      by: ["status"],
      where: { ownerId: String(userId) },
      _count: { _all: true },
    })) as Array<{ status: any; _count: { _all: number } }>;
  } catch (e) {
    console.error("assistant/chat: property.groupBy failed", e);
    rows = [];
  }

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of rows || []) {
    const key = r.status == null ? "(sem status)" : String(r.status);
    const n = Number(r._count?._all || 0);
    byStatus[key] = n;
    total += n;
  }

  const activeTotal = Number(byStatus.ACTIVE || 0);
  return { total, activeTotal, byStatus };
}

async function getLeadMetricsForRealtor(params: { userId: string; role: string | null | undefined }): Promise<LeadMetrics> {
  const closedStatuses: LeadStatus[] = ["COMPLETED", "CANCELLED", "EXPIRED", "OWNER_REJECTED"]; // LeadStatus
  const closedStages: LeadPipelineStage[] = ["WON", "LOST"]; // LeadPipelineStage
  const inAttendanceStages = ["CONTACT", "VISIT", "PROPOSAL", "DOCUMENTS"];

  const accessWhere: Prisma.LeadWhereInput = {
    OR: [
      { realtorId: String(params.userId) },
      { team: { is: { ownerId: String(params.userId) } } },
      { team: { is: { members: { some: { userId: String(params.userId) } } } } },
      { property: { is: { ownerId: String(params.userId) } } },
    ],
  };

  const activeWhere: Prisma.LeadWhereInput = {
    ...accessWhere,
    status: { notIn: closedStatuses },
    pipelineStage: { notIn: closedStages },
  };

  let activeTotal = 0;
  let groupStages: Array<{ pipelineStage: any; _count: { _all: number } }> = [];
  try {
    activeTotal = await prisma.lead.count({ where: activeWhere });
  } catch (e) {
    console.error("assistant/chat: lead.count failed", e);
    activeTotal = 0;
  }

  try {
    groupStages = (await (prisma.lead as any).groupBy({
      by: ["pipelineStage"],
      where: activeWhere,
      _count: { _all: true },
    })) as Array<{ pipelineStage: any; _count: { _all: number } }>;
  } catch (e) {
    console.error("assistant/chat: lead.groupBy failed", e);
    groupStages = [];
  }

  const byStage: Record<string, number> = {};
  for (const row of groupStages as any[]) {
    const key = row.pipelineStage == null ? "(sem etapa)" : String(row.pipelineStage);
    byStage[key] = Number(row._count?._all || 0);
  }

  const inAttendanceTotal = inAttendanceStages.reduce((sum, s) => sum + (Number(byStage[s]) || 0), 0);

  let pendingReplyTotal = 0;
  let pendingReplyLeads: LeadMetrics["pendingReplyLeads"] = [];
  try {
    const userId = String(params.userId);
    const closedStatusesSql = Prisma.join(closedStatuses.map((s) => Prisma.sql`${s}`));
    const closedStagesSql = Prisma.join(closedStages.map((s) => Prisma.sql`${s}`));

    const lastMsgCte = Prisma.sql`
      WITH last_msg AS (
        SELECT DISTINCT ON (m."leadId")
          m."leadId" AS "leadId",
          m."fromClient" AS "fromClient",
          m."createdAt" AS "createdAt"
        FROM (
          SELECT
            cm."leadId" AS "leadId",
            cm."fromClient" AS "fromClient",
            cm."createdAt" AS "createdAt"
          FROM "lead_client_messages" cm

          UNION ALL

          SELECT
            im."leadId" AS "leadId",
            false AS "fromClient",
            im."createdAt" AS "createdAt"
          FROM "lead_messages" im
        ) m
        JOIN "leads" l ON l."id" = m."leadId"
        LEFT JOIN "teams" t ON t."id" = l."teamId"
        LEFT JOIN "team_members" tm ON tm."teamId" = l."teamId" AND tm."userId" = ${userId}
        LEFT JOIN "properties" p ON p."id" = l."propertyId"
        WHERE
          l."status" NOT IN (${closedStatusesSql})
          AND l."pipelineStage" NOT IN (${closedStagesSql})
          AND (
            l."realtorId" = ${userId}
            OR (t."ownerId" = ${userId})
            OR (tm."userId" = ${userId})
            OR (p."ownerId" = ${userId})
          )
        ORDER BY m."leadId", m."createdAt" DESC
      )
    `;

    const countRows = (await prisma.$queryRaw(
      Prisma.sql`${lastMsgCte}
        SELECT COUNT(*)::int AS "pendingReplyTotal"
        FROM last_msg
        WHERE "fromClient" = true;
      `
    )) as any[];
    pendingReplyTotal = Number(countRows?.[0]?.pendingReplyTotal || 0);

    const leadsRows = (await prisma.$queryRaw(
      Prisma.sql`${lastMsgCte}
        SELECT
          l."id" AS "leadId",
          l."pipelineStage" AS "pipelineStage",
          c."name" AS "contactName",
          p2."title" AS "propertyTitle"
        FROM last_msg lm
        JOIN "leads" l ON l."id" = lm."leadId"
        LEFT JOIN "contacts" c ON c."id" = l."contactId"
        LEFT JOIN "properties" p2 ON p2."id" = l."propertyId"
        WHERE lm."fromClient" = true
        ORDER BY lm."createdAt" DESC
        LIMIT 10;
      `
    )) as any[];

    pendingReplyLeads = (leadsRows || []).map((r: any) => ({
      leadId: String(r.leadId),
      contactName: r.contactName ? String(r.contactName) : null,
      propertyTitle: r.propertyTitle ? String(r.propertyTitle) : null,
      pipelineStage: r.pipelineStage ? String(r.pipelineStage) : null,
    }));
  } catch (e) {
    console.error("assistant/chat: pendingReply query failed", e);
    pendingReplyTotal = 0;
    pendingReplyLeads = [];
  }

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

            if (!leadId && (a.type === "DRAFT_MESSAGE" || a.type === "SET_REMINDER")) {
              const targetLeadId = String((nextPayload as any)?.leadId || "").trim();
              if (!targetLeadId) return null;
            }

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

            if (a.type === "OPEN_PAGE") {
              const rawPath = String((nextPayload as any)?.path || "").trim();
              if (!rawPath || rawPath.includes("://") || rawPath.startsWith("javascript:")) {
                return null;
              }
              const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
              const normalized = path.replace(/\?.*$/, "").replace(/#.*$/, "");
              if (!AllowedOpenPagePaths.has(normalized)) {
                return null;
              }
              (nextPayload as any).path = normalized;
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
          .slice(0, 1)
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
  let propertyMetrics: PropertyMetrics | null = null;
  let upcomingAssistantItems: AssistantUpcomingItem[] = [];
  let upcomingLeadActions: UpcomingLeadActionItem[] = [];
  let upcomingVisits: UpcomingVisitItem[] = [];

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
    } catch (e) {
      console.error("assistant/chat: failed to load properties summary", e);
      propertiesSummary = [];
    }

    try {
      propertyMetrics = await getPropertyMetricsForUser(String(userId));
    } catch (e) {
      console.error("assistant/chat: failed to load property metrics", e);
      propertyMetrics = null;
    }

    try {
      leadMetrics = await getLeadMetricsForRealtor({ userId: String(userId), role: role || null });
    } catch (e) {
      console.error("assistant/chat: failed to load lead metrics", e);
      leadMetrics = null;
    }

    try {
      const now = new Date();
      const rows = await (prisma as any).realtorAssistantItem.findMany({
        where: {
          realtorId: String(userId),
          status: { in: ["ACTIVE", "SNOOZED"] },
          OR: [{ dueAt: { not: null } }, { snoozedUntil: { not: null } }],
        },
        select: {
          id: true,
          title: true,
          message: true,
          status: true,
          priority: true,
          dueAt: true,
          snoozedUntil: true,
          leadId: true,
        },
        take: 40,
        orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      });

      upcomingAssistantItems = (Array.isArray(rows) ? rows : [])
        .map((r: any) => {
          const status = String(r.status || "");
          const dueAt = r.dueAt ? new Date(r.dueAt) : null;
          const snoozedUntil = r.snoozedUntil ? new Date(r.snoozedUntil) : null;
          const effective =
            status === "SNOOZED"
              ? snoozedUntil
              : dueAt;
          const effectiveMs = effective && !Number.isNaN(effective.getTime()) ? effective.getTime() : null;
          if (effectiveMs == null) return null;
          if (status === "SNOOZED" && snoozedUntil && snoozedUntil.getTime() <= now.getTime()) {
            return null;
          }
          return {
            id: String(r.id),
            title: r.title != null ? String(r.title) : null,
            message: r.message != null ? String(r.message) : null,
            status,
            priority: String(r.priority || ""),
            dueAt: dueAt ? dueAt.toISOString() : null,
            snoozedUntil: snoozedUntil ? snoozedUntil.toISOString() : null,
            leadId: r.leadId != null ? String(r.leadId) : null,
          } satisfies AssistantUpcomingItem;
        })
        .filter(Boolean)
        .slice(0, 25) as AssistantUpcomingItem[];
    } catch (e) {
      console.error("assistant/chat: failed to load upcoming assistant items", e);
      upcomingAssistantItems = [];
    }

    try {
      const closedStatuses: LeadStatus[] = ["COMPLETED", "CANCELLED", "EXPIRED", "OWNER_REJECTED"];
      const closedStages: LeadPipelineStage[] = ["WON", "LOST"];
      const now = new Date();
      const start = startOfDay(now);
      const end = addDays(start, 14);

      const accessWhere = buildLeadAccessWhere(String(userId));

      const leads = await prisma.lead.findMany({
        where: {
          ...accessWhere,
          status: { notIn: closedStatuses },
          pipelineStage: { notIn: closedStages },
          nextActionDate: { gte: start, lt: end },
        },
        select: {
          id: true,
          pipelineStage: true,
          nextActionDate: true,
          nextActionNote: true,
          contact: { select: { name: true } },
          property: { select: { title: true } },
        },
        orderBy: [{ nextActionDate: "asc" }],
        take: 20,
      });

      upcomingLeadActions = (leads || [])
        .map((l) => {
          const d = l.nextActionDate ? new Date(l.nextActionDate as any) : null;
          if (!d || Number.isNaN(d.getTime())) return null;
          return {
            leadId: String(l.id),
            when: d.toISOString(),
            note: l.nextActionNote ? String(l.nextActionNote) : null,
            contactName: l.contact?.name ? String(l.contact.name) : null,
            propertyTitle: l.property?.title ? String(l.property.title) : null,
            pipelineStage: l.pipelineStage ? String(l.pipelineStage) : null,
          } satisfies UpcomingLeadActionItem;
        })
        .filter(Boolean) as UpcomingLeadActionItem[];
    } catch (e) {
      console.error("assistant/chat: failed to load upcoming lead actions", e);
      upcomingLeadActions = [];
    }

    try {
      const closedStatuses: LeadStatus[] = ["COMPLETED", "CANCELLED", "EXPIRED", "OWNER_REJECTED"];
      const closedStages: LeadPipelineStage[] = ["WON", "LOST"];
      const now = new Date();
      const start = startOfDay(now);
      const end = addDays(start, 14);

      const accessWhere = buildLeadAccessWhere(String(userId));

      const leads = await prisma.lead.findMany({
        where: {
          ...accessWhere,
          status: { notIn: closedStatuses },
          pipelineStage: { notIn: closedStages },
          visitDate: { gte: start, lt: end },
        },
        select: {
          id: true,
          pipelineStage: true,
          visitDate: true,
          visitTime: true,
          contact: { select: { name: true } },
          property: { select: { title: true } },
        },
        orderBy: [{ visitDate: "asc" }],
        take: 20,
      });

      upcomingVisits = (leads || [])
        .map((l: any) => {
          const base = l.visitDate ? new Date(l.visitDate as any) : null;
          if (!base || Number.isNaN(base.getTime())) return null;
          const time = l.visitTime ? String(l.visitTime) : "";
          const m = time.match(/^(\d{1,2}):(\d{2})/);
          if (m) {
            const hh = Math.min(23, Math.max(0, Number(m[1])));
            const mm = Math.min(59, Math.max(0, Number(m[2])));
            base.setHours(hh, mm, 0, 0);
          }
          return {
            leadId: String(l.id),
            when: base.toISOString(),
            contactName: l.contact?.name ? String(l.contact.name) : null,
            propertyTitle: l.property?.title ? String(l.property.title) : null,
            pipelineStage: l.pipelineStage ? String(l.pipelineStage) : null,
          } satisfies UpcomingVisitItem;
        })
        .filter(Boolean) as UpcomingVisitItem[];
    } catch (e) {
      console.error("assistant/chat: failed to load upcoming visits", e);
      upcomingVisits = [];
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

  const deterministic = !leadId
    ? tryAnswerDeterministic({
        message: parsedBody.data.content.trim(),
        leadMetrics,
        propertiesSummary,
        propertyMetrics,
        upcomingAssistantItems,
        upcomingLeadActions,
        upcomingVisits,
      })
    : null;
  if (deterministic) {
    const assistantMessage = await (prisma as any).realtorAssistantChatMessage.create({
      data: {
        threadId: thread.id,
        role: "ASSISTANT",
        content: deterministic.answer,
        data: deterministic,
      },
    });

    return successResponse({ threadId: thread.id, messages: [userMessage, assistantMessage] });
  }

  const systemPrompt = buildSystemPrompt(!!leadId);
  const userPrompt = buildUserPrompt({
    message: parsedBody.data.content.trim(),
    lead,
    recentClientMessages,
    propertiesSummary,
    leadMetrics,
    propertyMetrics,
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

  if (!Array.isArray(parsedAi.suggestedActions) || parsedAi.suggestedActions.length === 0) {
    parsedAi.suggestedActions = buildFallbackSuggestedActions({
      message: parsedBody.data.content.trim(),
      leadId: leadId ? String(leadId) : null,
    }).slice(0, 1);
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

async function disabledHandler(_req: NextRequest) {
  return errorResponse("Chat IA desativado", 410, null, "AI_CHAT_DISABLED");
}

export const GET = withErrorHandling(withRateLimit(disabledHandler, "default"));
export const POST = withErrorHandling(withRateLimit(disabledHandler, "default"));
export const DELETE = withErrorHandling(withRateLimit(disabledHandler, "default"));
