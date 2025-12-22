import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, withErrorHandling } from "@/lib/api-response";
import { withRateLimit } from "@/lib/rate-limiter";
import { getRealtorAssistantAiSpec } from "@/lib/realtor-assistant-ai";

export const runtime = "nodejs";

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

function fixCommonPlaceholders(text: string, params?: { realtorName?: string | null }) {
  let out = String(text || "");
  const realtorName = String(params?.realtorName || "").trim();

  const placeholderRegexes: RegExp[] = [
    /\[(?:seu|sua)\s+nome\]/gi,
    /\{(?:seu|sua)\s+nome\}/gi,
    /<(?:seu|sua)\s+nome>/gi,
    /\[(?:nome\s+do\s+corretor|nome\s+do\s+atendente|nome)\]/gi,
    /\{(?:nome\s+do\s+corretor|nome\s+do\s+atendente|nome)\}/gi,
    /<(?:nome\s+do\s+corretor|nome\s+do\s+atendente|nome)>/gi,
  ];

  if (realtorName) {
    for (const rx of placeholderRegexes) {
      out = out.replace(rx, realtorName);
    }
    out = out.replace(/\[Seu\s+Nome\]/gi, realtorName);
    out = out.replace(/\{Seu\s+Nome\}/gi, realtorName);
    out = out.replace(/<Seu\s+Nome>/gi, realtorName);
  } else {
    for (const rx of placeholderRegexes) {
      out = out.replace(rx, "");
    }
    out = out.replace(/\[Seu\s+Nome\]/gi, "");
    out = out.replace(/\{Seu\s+Nome\}/gi, "");
    out = out.replace(/<Seu\s+Nome>/gi, "");
  }

  return normalizeWhitespace(out);
}

function sanitizeDraft(raw: string, params?: { realtorName?: string | null }) {
  const base = String(raw || "");
  const cleaned = normalizeWhitespace(stripEmojis(stripPhones(stripUrls(base))));
  const limited = clampText(fixCommonPlaceholders(cleaned, params), 1200);
  if (limited.length >= 5) return limited;
  const fallback = clampText(fixCommonPlaceholders(normalizeWhitespace(stripEmojis(base)), params), 1200);
  return fallback.length >= 5 ? fallback : clampText(base.trim(), 1200);
}

function sanitizeSummary(raw: string) {
  const base = String(raw || "");
  const cleaned = normalizeWhitespace(stripEmojis(stripPhones(stripUrls(base))));
  const limited = clampText(cleaned, 240);
  if (limited.length >= 10) return limited;
  const fallback = clampText(normalizeWhitespace(stripEmojis(base)), 240);
  return fallback.length >= 10 ? fallback : clampText(base.trim(), 240);
}

function sanitizeReason(raw: string) {
  const base = String(raw || "");
  const cleaned = normalizeWhitespace(stripEmojis(stripPhones(stripUrls(base))));
  const limited = clampText(cleaned, 140);
  if (limited.length >= 3) return limited;
  const fallback = clampText(normalizeWhitespace(stripEmojis(base)), 140);
  return fallback.length >= 3 ? fallback : clampText(base.trim(), 140);
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
  recentClientMessages?: Array<{ createdAt: string; content: string }>;
  nextActionNote?: string | null;
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
  if (input.nextActionNote) lines.push(`Próximo passo (anotação): ${String(input.nextActionNote).trim()}`);

  const msgs = input.recentClientMessages || [];
  if (msgs.length > 0) {
    lines.push("\nMensagens recentes do cliente (use como contexto, sem copiar literal se não fizer sentido):");
    msgs.slice(-6).forEach((m) => {
      const dt = m.createdAt;
      const content = String(m.content || "").trim().replace(/\s+/g, " ").slice(0, 240);
      lines.push(`- (${dt}) ${content}`);
    });
  }

  lines.push("\nInstrução: gere a melhor próxima ação e um rascunho pronto para execução.");

  return lines.join("\n");
}

async function handler(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session: any = await getServerSession(authOptions);

  if (!session) return errorResponse("Não autenticado", 401, null, "UNAUTHORIZED");

  const userId = session.userId || session.user?.id;
  const role = session.role || session.user?.role;

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorResponse("AI is not configured", 500, null, "OPENAI_API_KEY_MISSING");
  }

  const { id } = await context.params;

  const item = await (prisma as any).realtorAssistantItem.findFirst({
    where: { id: String(id), realtorId: String(userId) },
    select: {
      id: true,
      realtorId: true,
      leadId: true,
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
  let recentClientMessages: Array<{ createdAt: string; content: string }> = [];

  if (item.leadId) {
    lead = await prisma.lead.findFirst({
      where: { id: String(item.leadId), realtorId: String(userId) },
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
        where: { leadId: String(lead.id), fromClient: true },
        orderBy: { createdAt: "asc" },
        take: 6,
        select: { createdAt: true, content: true },
      });
      recentClientMessages = (msgs || []).map((m: any) => ({
        createdAt: new Date(m.createdAt).toISOString(),
        content: String(m.content || ""),
      }));
    }
  }

  const spec = getRealtorAssistantAiSpec(String(item.type || ""));
  const taskLabel = spec.taskLabel;

  const isReminder = String(item.type || "") === "REMINDER_TODAY" || String(item.type || "") === "REMINDER_OVERDUE";
  const reminderExtraSystem = isReminder
    ? "IMPORTANTE: Este item é um LEMBRETE interno. O campo draft deve ser um plano/checklist (3-6 itens) e/ou roteiro de ligação. NÃO escreva uma mensagem para alguém (não use 'Olá', não trate como chat)."
    : undefined;

  const systemPrompt = buildSystemPrompt(taskLabel, spec.typeInstructions);
  const userPrompt = buildUserPrompt({
    itemType: String(item.type || ""),
    itemTitle: String(item.title || ""),
    itemMessage: String(item.message || ""),
    realtorName,
    clientName: lead?.contact?.name || null,
    propertyTitle: lead?.property?.title || null,
    leadStatus: lead?.status || null,
    recentClientMessages,
    nextActionNote: lead?.nextActionNote || null,
  });

  const model = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

  const buildFallback = (warning?: any) => {
    const fixedTaskLabel = taskLabel;
    const fallback = {
      itemId: String(item.id),
      itemType: String(item.type || ""),
      taskLabel: fixedTaskLabel,
      summary: `Sugestão para você agir agora: ${fixedTaskLabel.toLowerCase()}.`,
      draft: isReminder
        ? `Checklist (${fixedTaskLabel}):\n- Confirme o contexto do lead\n- Revise as mensagens recentes\n- Defina um próximo passo e horário\n- Registre uma anotação objetiva\n- Execute a ação e marque como concluída`
        : `Próximo passo: ${fixedTaskLabel}.\n\nMensagem sugerida:\nOlá! Tudo bem? Só confirmando um próximo passo sobre este atendimento. Quando você consegue me responder?`,
      reasons: [],
      confidence: "low" as const,
      ...(warning ? { _aiWarning: warning } : {}),
    };
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

  let modelAttempt = await callModel(0.6, reminderExtraSystem);
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
