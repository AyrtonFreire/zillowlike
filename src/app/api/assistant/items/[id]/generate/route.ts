import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, withErrorHandling } from "@/lib/api-response";
import { withRateLimit } from "@/lib/rate-limiter";
import { getRealtorAssistantAiSpec } from "@/lib/realtor-assistant-ai";
import { sanitizeDraft, sanitizeReason, sanitizeSummary } from "@/lib/ai-guardrails";
import { createAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function getSystemIntSetting(key: string, fallback: number): Promise<number> {
  try {
    const rec = await (prisma as any).systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    const parsed = Number.parseInt(String(rec?.value ?? ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  } catch {
  }
  return fallback;
}

async function checkAssistantAiQuota(params: { actorId: string; context: "REALTOR" | "AGENCY"; teamId?: string | null }) {
  const now = new Date();
  const since = startOfMonth(now);

  const rawLogs = await (prisma as any).auditLog.findMany({
    where: {
      createdAt: { gte: since },
      actorId: String(params.actorId),
      action: { in: ["ASSISTANT_DRAFT_GENERATED", "ASSISTANT_DRAFT_FALLBACK"] },
      targetType: "AssistantItem",
    },
    select: { metadata: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const used = (Array.isArray(rawLogs) ? rawLogs : []).filter((log: any) => {
    const meta = log?.metadata && typeof log.metadata === "object" ? (log.metadata as any) : null;
    const metaContext = meta?.context ? String(meta.context).toUpperCase() : "";
    if (params.context === "AGENCY") {
      if (metaContext !== "AGENCY") return false;
      if (params.teamId) {
        const metaTeamId = meta?.teamId ? String(meta.teamId) : "";
        if (metaTeamId !== String(params.teamId)) return false;
      }
    } else {
      if (metaContext !== "REALTOR") return false;
    }
    return true;
  }).length;

  const defaultLimit = params.context === "AGENCY" ? 500 : 200;
  const limit = params.context === "AGENCY" && params.teamId
    ? await getSystemIntSetting(`team:${String(params.teamId)}:assistantAiMonthlyLimit`, await getSystemIntSetting("assistantAiMonthlyLimitAgency", defaultLimit))
    : params.context === "AGENCY"
      ? await getSystemIntSetting("assistantAiMonthlyLimitAgency", defaultLimit)
      : await getSystemIntSetting("assistantAiMonthlyLimitRealtor", defaultLimit);

  const remaining = Math.max(0, Number(limit || 0) - Number(used || 0));
  return {
    ok: remaining > 0,
    used,
    limit,
    remaining,
    periodStart: since.toISOString(),
  };
}

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const RawOutputSchema = z
  .object({
    taskLabel: z.any().optional(),
    summary: z.any().optional(),
    draft: z.any().optional(),
    reasons: z.any().optional(),
    confidence: z.any().optional(),
  })
  .strict();

const OutputSchema = z
  .object({
    taskLabel: z.string().min(2).max(40),
    summary: z.string().min(10).max(240),
    draft: z.string().min(5).max(2000),
    reasons: z.array(z.string().min(3).max(140)).min(0).max(6),
    confidence: z.enum(["low", "medium", "high"]),
  })
  .strict();

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

function buildSystemPrompt(taskLabel: string, typeInstructions: string) {
  return (
    "Você é um assistente de rotina para corretores de imóveis no Brasil.\n" +
    "Seu papel é ajudar a resolver pendências com rapidez e clareza, sem parecer um chat genérico.\n" +
    "Use um tom humano, direto e cordial (pt-BR), como um corretor experiente e prestativo.\n" +
    "\n" +
    `TAREFA: ${taskLabel}\n` +
    `INSTRUÇÕES ESPECÍFICAS: ${typeInstructions}\n` +
    "\n" +
    "REGRAS (obrigatórias):\n" +
    "1) Responda SOMENTE com um JSON válido (sem markdown).\n" +
    "2) O JSON deve ter exatamente as chaves: taskLabel, summary, draft, reasons, confidence.\n" +
    `3) taskLabel deve ser exatamente: ${taskLabel}.\n` +
    "4) Não invente fatos. Use apenas os dados fornecidos.\n" +
    "5) draft deve ser pronto para copiar e enviar (se for mensagem), com no máximo ~1200 caracteres.\n" +
    "6) Sem emojis, sem links, sem telefone, sem promessas agressivas.\n" +
    "7) reasons: até 6 bullets curtos (por que isso ajuda).\n" +
    "8) confidence: low/medium/high conforme a qualidade do contexto recebido.\n" +
    "9) PROIBIDO usar placeholders como '[Seu Nome]', '{Seu Nome}', '<Seu Nome>', '[Nome]'. Se algum dado estiver faltando, omita."
  );
}

function buildUserPrompt(input: {
  itemType: string;
  itemTitle: string;
  itemMessage: string;
  realtorName?: string | null;
  clientName?: string | null;
  propertyTitle?: string | null;
  leadStatus?: string | null;
  stageLabel?: string | null;
  stageValue?: string | null;
  clientIntent?: string | null;
  recentChatMessages?: Array<{ createdAt: string; fromClient: boolean; content: string }>;
  nextActionNote?: string | null;
  extraContext?: string | null;
}) {
  const lines: string[] = [];

  const itemType = String(input.itemType || "").trim() || "(não informado)";
  const itemTitle = String(input.itemTitle || "").trim() || "(não informado)";
  const itemMessage = String(input.itemMessage || "").trim() || "(não informado)";

  lines.push(`Tipo do item: ${itemType}`);
  lines.push(`Título do item: ${itemTitle}`);
  lines.push(`Resumo do alerta: ${itemMessage}`);

  if (input.realtorName) {
    lines.push(`Corretor (seu nome): ${String(input.realtorName || "").trim()}`);
  }

  lines.push(`Cliente: ${String(input.clientName || "").trim() || "(não informado)"}`);
  lines.push(`Imóvel: ${String(input.propertyTitle || "").trim() || "(não informado)"}`);
  if (input.leadStatus) lines.push(`Status do lead: ${String(input.leadStatus).trim()}`);
  if (input.stageValue) lines.push(`${String(input.stageLabel || "Etapa").trim()}: ${String(input.stageValue).trim()}`);
  if (input.clientIntent) lines.push(`Intenção do cliente: ${String(input.clientIntent).trim()}`);
  if (input.nextActionNote) lines.push(`Próximo passo (anotação): ${String(input.nextActionNote).trim()}`);

  const msgs = input.recentChatMessages || [];
  if (msgs.length > 0) {
    lines.push("\nMensagens recentes no chat (use como contexto, sem copiar literal se não fizer sentido):");
    msgs.slice(-10).forEach((m) => {
      const dt = m.createdAt;
      const who = m.fromClient ? "Cliente" : "Corretor";
      const content = String(m.content || "").trim().replace(/\s+/g, " ").slice(0, 240);
      lines.push(`- (${dt}) ${who}: ${content}`);
    });
  }

  if (input.extraContext) {
    const txt = String(input.extraContext || "").trim();
    if (txt) {
      lines.push("\nContexto adicional (dados reais para você citar e priorizar):");
      lines.push(txt);
    }
  }

  lines.push("\nInstrução: gere a melhor próxima ação e um rascunho pronto para execução.");

  return lines.join("\n");
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function computeWeekStartMonday(now: Date) {
  const d = startOfDay(now);
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

function formatIso(d: Date | null | undefined) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function clip(s: any, n: number) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, n);
}

async function buildWeeklyContext(params: {
  userId: string;
  context: "REALTOR" | "AGENCY";
  teamId?: string | null;
  since: Date;
  until: Date;
}) {
  const whereBase: any =
    params.context === "AGENCY"
      ? { teamId: String(params.teamId || "") }
      : { realtorId: String(params.userId) };
  const clientWhereBase: any =
    params.context === "AGENCY"
      ? { teamId: String(params.teamId || "") }
      : { assignedUserId: String(params.userId) };

  const [leads, clients] = await Promise.all([
    prisma.lead.findMany({
      where: {
        ...whereBase,
        pipelineStage: { notIn: ["WON", "LOST"] as any },
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        createdAt: true,
        updatedAt: true,
        respondedAt: true,
        nextActionDate: true,
        nextActionNote: true,
        visitDate: true,
        visitTime: true,
        ownerApproved: true,
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            price: true,
            hidePrice: true,
          },
        },
        contact: { select: { name: true } },
      },
    }),
    (prisma as any).client.findMany({
      where: {
        ...clientWhereBase,
        status: "ACTIVE",
        pipelineStage: { notIn: ["WON", "LOST"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: {
        id: true,
        name: true,
        intent: true,
        pipelineStage: true,
        createdAt: true,
        updatedAt: true,
        assignedUserId: true,
        firstContactAt: true,
        lastContactAt: true,
        lastInboundAt: true,
        lastInboundChannel: true,
        nextActionAt: true,
        nextActionNote: true,
        preference: {
          select: {
            city: true,
            state: true,
          },
        },
      },
    }),
  ]);

  const leadIds = leads.map((l) => String(l.id));
  const propertyIds = Array.from(
    new Set(leads.map((l: any) => (l.property?.id ? String(l.property.id) : null)).filter(Boolean))
  ) as string[];

  const [lastClientMsgs, lastInternalMsgs, propertyViewCounts] = await Promise.all([
    leadIds.length
      ? prisma.leadClientMessage.findMany({
          where: { leadId: { in: leadIds } },
          orderBy: { createdAt: "desc" },
          take: 350,
          select: { leadId: true, createdAt: true, content: true, fromClient: true },
        })
      : Promise.resolve([] as any[]),
    leadIds.length
      ? prisma.leadMessage.findMany({
          where: { leadId: { in: leadIds } },
          orderBy: { createdAt: "desc" },
          take: 350,
          select: { leadId: true, createdAt: true },
        })
      : Promise.resolve([] as any[]),
    propertyIds.length
      ? prisma.propertyView.groupBy({
          by: ["propertyId"],
          where: {
            propertyId: { in: propertyIds },
            viewedAt: { gte: params.since, lt: params.until },
          },
          _count: { _all: true },
        })
      : Promise.resolve([] as any[]),
  ]);

  const lastClientByLead = new Map<string, any>();
  for (const m of lastClientMsgs as any[]) {
    const k = String(m.leadId);
    if (!lastClientByLead.has(k)) lastClientByLead.set(k, m);
  }

  const lastInternalByLead = new Map<string, any>();
  for (const m of lastInternalMsgs as any[]) {
    const k = String(m.leadId);
    if (!lastInternalByLead.has(k)) lastInternalByLead.set(k, m);
  }

  const viewCountByProperty = new Map<string, number>();
  for (const row of propertyViewCounts as any[]) {
    const k = String(row.propertyId);
    const count = Number(row?._count?._all ?? 0);
    viewCountByProperty.set(k, count);
  }

  const now = new Date();

  const scored = leads.map((l: any) => {
    const leadId = String(l.id);
    const clientName = clip(l.contact?.name || "", 60) || "(sem nome)";
    const propertyTitle = clip(l.property?.title || "", 80) || "(sem título)";
    const location = [clip(l.property?.city || "", 40), clip(l.property?.state || "", 20)].filter(Boolean).join("/");
    const status = String(l.status || "");
    const stage = String(l.pipelineStage || "");

    const lastClient = lastClientByLead.get(leadId) || null;
    const lastInternal = lastInternalByLead.get(leadId) || null;

    const lastClientAt = lastClient?.createdAt ? new Date(lastClient.createdAt) : null;
    const lastInternalAt = lastInternal?.createdAt ? new Date(lastInternal.createdAt) : null;
    const awaitingResponse =
      !!lastClient?.fromClient && !!lastClientAt && (!lastInternalAt || lastClientAt.getTime() > lastInternalAt.getTime());

    const nextActionOverdue =
      l.nextActionDate && new Date(l.nextActionDate).getTime() <= now.getTime();
    const visitSoon =
      l.visitDate &&
      (() => {
        const v = new Date(l.visitDate);
        const diffDays = (v.getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000);
        return diffDays >= 0 && diffDays <= 3;
      })();

    const recentlyUpdated =
      l.updatedAt && (now.getTime() - new Date(l.updatedAt).getTime()) / (24 * 60 * 60 * 1000) <= 7;

    let score = 0;
    if (awaitingResponse) score += 60;
    if (visitSoon) score += 55;
    if (nextActionOverdue) score += 45;
    if (status === "WAITING_OWNER_APPROVAL") score += 35;
    if (status === "CONFIRMED") score += 30;
    if (status === "ACCEPTED") score += 22;
    if (recentlyUpdated) score += 10;

    return {
      score,
      leadId,
      clientName,
      propertyTitle,
      location,
      status,
      stage,
      nextActionDate: formatIso(l.nextActionDate) || null,
      nextActionNote: clip(l.nextActionNote, 140) || null,
      visitDate: formatIso(l.visitDate) || null,
      visitTime: l.visitTime ? String(l.visitTime) : null,
      ownerApproved:
        typeof l.ownerApproved === "boolean" ? (l.ownerApproved ? "aprovado" : "recusado") : "pendente",
      lastClientAt: formatIso(lastClientAt) || null,
      lastClientSnippet: lastClient ? clip(lastClient.content, 120) : null,
      awaitingResponse,
      propertyId: l.property?.id ? String(l.property.id) : null,
      propertyViews7d: l.property?.id ? Number(viewCountByProperty.get(String(l.property.id)) || 0) : 0,
    };
  });

  const topLeads = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const topViewedProperties = [...scored]
    .filter((x) => x.propertyId)
    .reduce((acc, x) => {
      const k = String(x.propertyId);
      if (!acc.has(k) || (acc.get(k) as any).propertyViews7d < x.propertyViews7d) {
        acc.set(k, x);
      }
      return acc;
    }, new Map<string, any>());

  const topProperties = Array.from(topViewedProperties.values())
    .sort((a: any, b: any) => b.propertyViews7d - a.propertyViews7d)
    .slice(0, 6);

  const topClients = (clients || [])
    .map((client: any) => {
      const createdAt = client?.createdAt ? new Date(client.createdAt) : null;
      const firstContactDueAt = createdAt ? new Date(createdAt.getTime() + 30 * 60 * 1000) : null;
      const lastInboundAt = client?.lastInboundAt ? new Date(client.lastInboundAt) : null;
      const lastContactAt = client?.lastContactAt ? new Date(client.lastContactAt) : null;
      const nextActionAt = client?.nextActionAt ? new Date(client.nextActionAt) : null;
      const pendingReply =
        !!lastInboundAt && (!lastContactAt || Number.isNaN(lastContactAt.getTime()) || lastInboundAt.getTime() > lastContactAt.getTime());
      const missingFirstContact = !!(!client?.firstContactAt && firstContactDueAt && firstContactDueAt.getTime() <= now.getTime());
      const nextActionOverdue = !!(nextActionAt && nextActionAt.getTime() <= now.getTime());
      const needsOwner = !client?.assignedUserId;
      const recentlyUpdated =
        client?.updatedAt && (now.getTime() - new Date(client.updatedAt).getTime()) / (24 * 60 * 60 * 1000) <= 7;

      let score = 0;
      if (needsOwner) score += 75;
      if (pendingReply) score += 70;
      if (missingFirstContact) score += 62;
      if (nextActionOverdue) score += 55;
      if (String(client?.pipelineStage || "") === "VISIT") score += 12;
      if (String(client?.pipelineStage || "") === "MATCHING") score += 10;
      if (recentlyUpdated) score += 8;

      return {
        id: String(client.id),
        name: clip(client?.name || "", 60) || "(sem nome)",
        intent: String(client?.intent || "").trim() || null,
        stage: String(client?.pipelineStage || "").trim() || null,
        pendingReply,
        missingFirstContact,
        nextActionOverdue,
        needsOwner,
        score,
        lastInboundAt: formatIso(lastInboundAt) || null,
        nextActionAt: formatIso(nextActionAt) || null,
        nextActionNote: clip(client?.nextActionNote, 140) || null,
        location: [clip(client?.preference?.city || "", 40), clip(client?.preference?.state || "", 20)].filter(Boolean).join("/"),
      };
    })
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 8);

  const lines: string[] = [];
  lines.push(`Janela analisada: ${params.since.toISOString()} até ${params.until.toISOString()}`);
  lines.push(`Leads ativos considerados: ${leads.length}`);
  lines.push(`Clientes institucionais considerados: ${clients.length}`);

  if (topLeads.length > 0) {
    lines.push("\nLEADS PARA PRIORIZAR (cite por leadId + cliente + imóvel):");
    topLeads.forEach((l, idx) => {
      const tags: string[] = [];
      if (l.awaitingResponse) tags.push("mensagem pendente");
      if (l.visitDate) tags.push("visita");
      if (l.nextActionDate) tags.push("próxima ação");
      if (l.propertyViews7d >= 10) tags.push(`imóvel com ${l.propertyViews7d} views/7d`);
      lines.push(
        `${idx + 1}) leadId=${l.leadId} | Cliente=${l.clientName} | Imóvel=${l.propertyTitle}` +
          (l.location ? ` (${l.location})` : "") +
          ` | Status=${l.status} | Stage=${l.stage}` +
          (tags.length ? ` | Sinais=${tags.join(", ")}` : "") +
          (l.lastClientAt ? ` | Última msg cliente=${l.lastClientAt}` : "") +
          (l.lastClientSnippet ? ` | Trecho="${l.lastClientSnippet}"` : "") +
          (l.nextActionDate ? ` | PróxAção=${l.nextActionDate}` : "") +
          (l.nextActionNote ? ` | Nota=${l.nextActionNote}` : "") +
          (l.visitDate ? ` | Visita=${l.visitDate}${l.visitTime ? ` ${l.visitTime}` : ""}` : "")
      );
    });
  }

  if (topProperties.length > 0) {
    lines.push("\nIMÓVEIS COM MAIS ATENÇÃO (views últimos 7 dias):");
    topProperties.forEach((p: any, idx: number) => {
      lines.push(`${idx + 1}) propertyId=${p.propertyId} | ${p.propertyTitle} | views7d=${p.propertyViews7d}`);
    });
  }

  if (topClients.length > 0) {
    lines.push("\nCLIENTES INSTITUCIONAIS PARA PRIORIZAR (cite por clientId + cliente):");
    topClients.forEach((client: (typeof topClients)[number], idx: number) => {
      const tags: string[] = [];
      if (client.pendingReply) tags.push("retorno pendente");
      if (client.missingFirstContact) tags.push("sem primeiro contato");
      if (client.nextActionOverdue) tags.push("próxima ação vencida");
      if (client.needsOwner) tags.push("sem responsável");
      lines.push(
        `${idx + 1}) clientId=${client.id} | Cliente=${client.name}` +
          (client.location ? ` (${client.location})` : "") +
          (client.intent ? ` | Intenção=${client.intent}` : "") +
          (client.stage ? ` | Stage=${client.stage}` : "") +
          (tags.length ? ` | Sinais=${tags.join(", ")}` : "") +
          (client.lastInboundAt ? ` | Último inbound=${client.lastInboundAt}` : "") +
          (client.nextActionAt ? ` | PróxAção=${client.nextActionAt}` : "") +
          (client.nextActionNote ? ` | Nota=${client.nextActionNote}` : "")
      );
    });
  }

  return lines.join("\n");
}

async function handler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions);

  if (!session) return errorResponse("Não autenticado", 401, null, "UNAUTHORIZED");

  const userId = session.userId || session.user?.id;
  const role = session.role || session.user?.role;
  const actorEmail = (session as any)?.user?.email ? String((session as any).user.email) : null;

  if (!userId) return errorResponse("Não autenticado", 401, null, "UNAUTHORIZED");

  const sessionUser = (session as any)?.user || null;
  let realtorName: string | null =
    (typeof sessionUser?.name === "string" ? sessionUser.name : null) ||
    (typeof sessionUser?.fullName === "string" ? sessionUser.fullName : null) ||
    null;
  try {
    const u = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { name: true },
    });
    if (u?.name && String(u.name).trim().length >= 2) realtorName = String(u.name).trim();
  } catch {
    // ignore
  }

  if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
    return errorResponse("Acesso negado", 403, null, "FORBIDDEN");
  }

  const url = new URL(req.url);
  const reqContext = (url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR"))
    .trim()
    .toUpperCase();

  let teamId: string | null = url.searchParams.get("teamId") || null;
  if (!teamId && role === "AGENCY" && reqContext === "AGENCY") {
    const agencyProfile = await (prisma as any).agencyProfile.findUnique({
      where: { userId: String(userId) },
      select: { teamId: true },
    });
    teamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
  }

  if (role === "AGENCY" && reqContext !== "AGENCY") {
    return errorResponse("Acesso negado", 403, null, "FORBIDDEN");
  }

  if (reqContext === "AGENCY" && !teamId) {
    return errorResponse("Não foi possível identificar o time da agência.", 400, null, "TEAM_ID_MISSING");
  }

  const quota = await checkAssistantAiQuota({
    actorId: String(userId),
    context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
    teamId: reqContext === "AGENCY" ? String(teamId || "") || null : null,
  });
  if (!quota.ok) {
    return errorResponse(
      "Limite mensal do Assistente IA atingido.",
      429,
      { quota },
      "AI_QUOTA_EXCEEDED"
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorResponse("AI is not configured", 500, null, "OPENAI_API_KEY_MISSING");
  }

  const { id } = await context.params;

  const item = await (prisma as any).assistantItem.findFirst({
    where: {
      id: String(id),
      context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
      ownerId: String(userId),
      ...(reqContext === "AGENCY" && teamId ? { teamId: String(teamId) } : {}),
    },
    select: {
      id: true,
      ownerId: true,
      teamId: true,
      leadId: true,
      clientId: true,
      type: true,
      title: true,
      message: true,
      metadata: true,
    },
  });

  if (!item) {
    return errorResponse("Item não encontrado", 404, null, "NOT_FOUND");
  }

  let lead: any = null;
  let client: any = null;
  let recentChatMessages: Array<{ createdAt: string; fromClient: boolean; content: string }> = [];

  if (item.leadId) {
    lead = await prisma.lead.findFirst({
      where:
        reqContext === "AGENCY"
          ? { id: String(item.leadId), teamId: String(teamId) }
          : { id: String(item.leadId), realtorId: String(userId) },
      select: {
        id: true,
        status: true,
        nextActionNote: true,
        property: { select: { title: true } },
        contact: { select: { name: true } },
      },
    });

    if (lead?.id) {
      const msgs = await prisma.leadClientMessage.findMany({
        where: { leadId: String(lead.id) },
        orderBy: { createdAt: "asc" },
        take: 12,
        select: { createdAt: true, content: true, fromClient: true },
      });
      recentChatMessages = (msgs || []).map((m: any) => ({
        createdAt: new Date(m.createdAt).toISOString(),
        fromClient: Boolean(m.fromClient),
        content: String(m.content || ""),
      }));
    }
  }

  if (item.clientId) {
    client = await (prisma as any).client.findFirst({
      where:
        reqContext === "AGENCY"
          ? { id: String(item.clientId), teamId: String(teamId) }
          : { id: String(item.clientId), assignedUserId: String(userId) },
      select: {
        id: true,
        name: true,
        intent: true,
        pipelineStage: true,
        nextActionNote: true,
        lastInboundAt: true,
        lastInboundChannel: true,
        notes: true,
        preference: {
          select: {
            city: true,
            state: true,
            neighborhoods: true,
            purpose: true,
            types: true,
            minPrice: true,
            maxPrice: true,
            bedroomsMin: true,
            bathroomsMin: true,
            areaMin: true,
            scope: true,
          },
        },
      },
    });
  }

  const spec = getRealtorAssistantAiSpec(String(item.type || ""));
  const taskLabel = spec.taskLabel;

  const isReminder =
    String(item.type || "") === "REMINDER_TODAY" ||
    String(item.type || "") === "REMINDER_OVERDUE" ||
    String(item.type || "") === "WEEKLY_SUMMARY";
  const reminderExtraSystem = isReminder
    ? "IMPORTANTE: Este item é um LEMBRETE interno. O campo draft deve ser um plano/checklist (3-6 itens) e/ou roteiro de ligação. NÃO escreva uma mensagem para alguém (não use 'Olá', não trate como chat)."
    : undefined;

  const systemPrompt = buildSystemPrompt(taskLabel, spec.typeInstructions);
  const nowForContext = new Date();
  const itemTypeStr = String(item.type || "").trim();
  const extraContext =
    itemTypeStr === "WEEKLY_SUMMARY"
      ? await (async () => {
          const meta = (item as any)?.metadata as any;
          const metaWeekStart = meta?.weekStart ? new Date(String(meta.weekStart)) : null;
          const weekStart =
            metaWeekStart && !Number.isNaN(metaWeekStart.getTime())
              ? startOfDay(metaWeekStart)
              : computeWeekStartMonday(nowForContext);
          const until = new Date(Math.min(nowForContext.getTime(), weekStart.getTime() + 7 * 24 * 60 * 60 * 1000));
          return buildWeeklyContext({
            userId: String(userId),
            context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
            teamId: reqContext === "AGENCY" ? String(teamId || "") : null,
            since: weekStart,
            until,
          });
        })()
      : null;

  const clientExtraContext = client
    ? [
        `Cliente institucional: ${String(client.name || "").trim() || "(não informado)"}`,
        client.intent ? `Intenção: ${String(client.intent).trim()}` : null,
        client.pipelineStage ? `Etapa do funil: ${String(client.pipelineStage).trim()}` : null,
        client.lastInboundAt
          ? `Último inbound: ${formatIso(client.lastInboundAt)}${client.lastInboundChannel ? ` via ${String(client.lastInboundChannel).trim()}` : ""}`
          : null,
        client.nextActionNote ? `Próxima ação registrada: ${clip(String(client.nextActionNote), 240)}` : null,
        client.notes ? `Notas do CRM: ${clip(String(client.notes), 400)}` : null,
        client.preference
          ? `Preferências: cidade=${String(client.preference.city || "")} / estado=${String(client.preference.state || "")} / bairros=${Array.isArray(client.preference.neighborhoods) ? client.preference.neighborhoods.map((item: any) => String(item)).join(", ") : ""} / finalidade=${String(client.preference.purpose || "")} / tipos=${Array.isArray(client.preference.types) ? client.preference.types.map((item: any) => String(item)).join(", ") : ""} / faixa=${client.preference.minPrice ?? "?"}-${client.preference.maxPrice ?? "?"} / quartosMin=${client.preference.bedroomsMin ?? "?"} / banheirosMin=${client.preference.bathroomsMin ?? "?"} / areaMin=${client.preference.areaMin ?? "?"} / escopo=${String(client.preference.scope || "")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  const mergedExtraContext = [extraContext, clientExtraContext].filter(Boolean).join("\n\n") || null;

  const userPrompt = buildUserPrompt({
    itemType: itemTypeStr,
    itemTitle: String(item.title || ""),
    itemMessage: String(item.message || ""),
    realtorName,
    clientName: lead?.contact?.name || client?.name || null,
    propertyTitle: lead?.property?.title || null,
    leadStatus: lead?.status || null,
    stageLabel: client?.pipelineStage ? "Etapa do funil do cliente" : null,
    stageValue: client?.pipelineStage || null,
    clientIntent: client?.intent || null,
    recentChatMessages,
    nextActionNote: lead?.nextActionNote || client?.nextActionNote || null,
    extraContext: mergedExtraContext,
  });

  const model = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

  const buildFallback = (warning?: any) => {
    const fixedTaskLabel = taskLabel;
    const weeklyFallbackDraft =
      itemTypeStr === "WEEKLY_SUMMARY" && extraContext
        ? `Checklist (${fixedTaskLabel}):\n- Revise os leads destacados no contexto (priorize os com mensagem pendente/visita)\n- Para cada lead, registre a próxima ação e horário\n- Confirme visitas próximas e pendências de aprovação\n- Execute os 3 contatos mais críticos hoje\n\nResumo do contexto:\n${clip(extraContext, 1200)}`
        : null;
    const fallback = {
      itemId: String(item.id),
      itemType: String(item.type || ""),
      taskLabel: fixedTaskLabel,
      summary: `Sugestão para você agir agora: ${fixedTaskLabel.toLowerCase()}.`,
      draft: isReminder
        ? weeklyFallbackDraft ||
          `Checklist (${fixedTaskLabel}):\n- Confirme o contexto do atendimento\n- Revise os sinais recentes e o histórico disponível\n- Defina um próximo passo e horário\n- Registre uma anotação objetiva\n- Execute a ação e marque como concluída`
        : `Próximo passo: ${fixedTaskLabel}.\n\nMensagem sugerida:\nOlá! Tudo bem? Só confirmando um próximo passo sobre este atendimento. Quando você consegue me responder?`,
      reasons: [],
      confidence: "low" as const,
      ...(warning ? { _aiWarning: warning } : {}),
    };

    void createAuditLog({
      level: "WARN",
      action: "ASSISTANT_DRAFT_FALLBACK",
      message: "AI draft fallback used",
      actorId: String(userId),
      actorEmail,
      actorRole: String(role || ""),
      targetType: "AssistantItem",
      targetId: String(item.id),
      metadata: {
        context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
        teamId: reqContext === "AGENCY" ? String(teamId || "") || null : null,
        leadId: item.leadId ? String(item.leadId) : null,
        clientId: item.clientId ? String(item.clientId) : null,
        itemType: String(item.type || ""),
        model,
        warning: warning || null,
      },
    });

    return successResponse(fallback as any, "OK");
  };

  const callModel = async (temperature: number, extraSystem?: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    let aiRes: Response | null = null;
    try {
      aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: 700,
          messages: [
            { role: "system", content: extraSystem ? `${systemPrompt}\n\n${extraSystem}` : systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });
    } catch {
      aiRes = null;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!aiRes) {
      return { ok: false as const, status: 0, body: "timeout_or_network" };
    }

    if (!aiRes.ok) {
      const txt = await aiRes.text().catch(() => "");
      return { ok: false as const, status: aiRes.status, body: txt.slice(0, 2000) };
    }

    const json = (await aiRes.json().catch(() => null)) as OpenAIChatResponse | null;
    const content = json?.choices?.[0]?.message?.content?.trim();
    return { ok: true as const, content: content || "" };
  };

  const parseOutput = (content: string) => {
    const obj = extractJsonObject(content);
    const raw = RawOutputSchema.safeParse(obj);
    if (!raw.success) return { ok: false as const, issues: raw.error.issues };

    const fixedTaskLabel = taskLabel;
    const rawSummary = String((raw.data as any)?.summary ?? "");
    const rawDraft = String((raw.data as any)?.draft ?? "");

    const summary = sanitizeSummary(rawSummary);
    const draft = sanitizeDraft(rawDraft, { realtorName });

    const reasonsRaw = (raw.data as any)?.reasons;
    const reasons = Array.isArray(reasonsRaw)
      ? reasonsRaw
          .map((r: any) => sanitizeReason(String(r ?? "")))
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const confidenceRaw = String((raw.data as any)?.confidence ?? "").toLowerCase();
    const confidence = confidenceRaw === "low" || confidenceRaw === "high" || confidenceRaw === "medium" ? confidenceRaw : "medium";

    const sanitized = {
      taskLabel: fixedTaskLabel,
      summary:
        summary.length >= 10 ? summary : `Sugestão para você agir agora: ${fixedTaskLabel.toLowerCase()}.`,
      draft:
        draft.length >= 5
          ? draft
          : `Próximo passo: ${fixedTaskLabel}.\n\nMensagem sugerida:\nOlá! Tudo bem? Só confirmando um próximo passo sobre este atendimento. Quando você consegue me responder?`,
      reasons,
      confidence: confidence as any,
    };

    const recheck = OutputSchema.safeParse(sanitized);
    if (!recheck.success) {
      return { ok: false as const, issues: recheck.error.issues };
    }
    return { ok: true as const, data: recheck.data };
  };

  const modelAttempt = await callModel(0.6, reminderExtraSystem);
  if (!modelAttempt.ok) {
    return buildFallback({ code: "AI_UPSTREAM_ERROR", status: modelAttempt.status, body: modelAttempt.body });
  }

  let content = modelAttempt.content;
  let parsedAttempt = content ? parseOutput(content) : ({ ok: false as const, issues: [] } as any);

  if (!content || !parsedAttempt.ok) {
    const retry = await callModel(
      0.2,
      [
        reminderExtraSystem,
        "IMPORTANTE: Responda APENAS com um JSON válido. Não inclua nenhuma frase antes/depois. Não use markdown.",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
    if (!retry.ok) {
      return buildFallback({ code: "AI_UPSTREAM_ERROR", status: retry.status, body: retry.body });
    }
    content = retry.content;
    parsedAttempt = content ? parseOutput(content) : ({ ok: false as const, issues: [] } as any);
  }

  if (!content) {
    return buildFallback({ code: "AI_EMPTY_RESPONSE" });
  }

  if (!parsedAttempt.ok) {
    return buildFallback({ code: "AI_INVALID_JSON", sample: content.slice(0, 2000), issues: parsedAttempt.issues });
  }

  void createAuditLog({
    level: "SUCCESS",
    action: "ASSISTANT_DRAFT_GENERATED",
    message: "AI draft generated",
    actorId: String(userId),
    actorEmail,
    actorRole: String(role || ""),
    targetType: "AssistantItem",
    targetId: String(item.id),
    metadata: {
      context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
      teamId: reqContext === "AGENCY" ? String(teamId || "") || null : null,
      leadId: item.leadId ? String(item.leadId) : null,
      clientId: item.clientId ? String(item.clientId) : null,
      itemType: String(item.type || ""),
      model,
      confidence: (parsedAttempt as any)?.data?.confidence ?? null,
    },
  });

  return successResponse(
    {
      itemId: String(item.id),
      itemType: String(item.type || ""),
      ...parsedAttempt.data,
    },
    "OK"
  );
}

export const POST = withErrorHandling(withRateLimit(handler, "ai"));
