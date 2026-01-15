import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeDraft, sanitizeReason } from "@/lib/ai-guardrails";

export const runtime = "nodejs";

const QuerySchema = z
  .object({
    ai: z.enum(["0", "1"]).optional(),
  })
  .strict();

type Intent = "PRICE" | "LOCATION" | "FINANCING" | "VISIT" | "GENERAL";

type CoachPayload = {
  intent: Intent;
  confidence: "low" | "medium" | "high";
  questions: string[];
  nextSteps: string[];
  draft: string;
};

function normalize(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function detectIntent(lastClientMessage: string | null | undefined): { intent: Intent; confidence: CoachPayload["confidence"] } {
  const text = normalize(lastClientMessage || "");
  if (!text) return { intent: "GENERAL", confidence: "low" };

  const has = (rx: RegExp) => rx.test(text);

  if (has(/financi|financiamento|credito|simul|entrada|fgts|parcel|banco|juros/)) {
    return { intent: "FINANCING", confidence: "high" };
  }

  if (has(/pre[cç]o|valor|quanto|condic|negoci|desconto|iptu|condominio|aluguel|mensal|entrada/)) {
    return { intent: "PRICE", confidence: "high" };
  }

  if (has(/bairro|rua|localiza|perto|metr[oô]|regi[aã]o|zona|mapa|endereco|distancia/)) {
    return { intent: "LOCATION", confidence: "high" };
  }

  if (has(/visita|agendar|agenda|horario|amanha|hoje|sabado|domingo|disponibilidade|ver o imovel/)) {
    return { intent: "VISIT", confidence: "medium" };
  }

  return { intent: "GENERAL", confidence: "medium" };
}

function buildCoachPayload(input: {
  intent: Intent;
  clientName?: string | null;
  propertyTitle?: string | null;
  lastClientMessage?: string | null;
}): CoachPayload {
  const client = input.clientName ? String(input.clientName).trim() : "";
  const prop = input.propertyTitle ? String(input.propertyTitle).trim() : "";
  const greet = client ? `Olá ${client}, tudo bem?` : "Olá, tudo bem?";
  const about = prop ? `Sobre o imóvel ${prop}, ` : "";

  if (input.intent === "PRICE") {
    return {
      intent: "PRICE",
      confidence: "high",
      questions: [
        "Qual faixa de valor você tem em mente?",
        "Você busca compra ou locação?",
        "Tem alguma preferência de forma de pagamento (financiamento/à vista)?",
      ]
        .map((q) => sanitizeReason(q))
        .filter(Boolean)
        .slice(0, 4),
      nextSteps: ["Confirmar faixa e condições", "Oferecer 2 opções de próximo passo: visita ou envio de comparativos"]
        .map((s) => sanitizeReason(s))
        .filter(Boolean)
        .slice(0, 4),
      draft:
        sanitizeDraft(
          `${greet}\n\n` +
            `${about}me diz só para eu te passar a informação certinha: você está olhando compra ou locação, e qual faixa de valor você quer trabalhar?\n\n` +
            `Se fizer sentido, eu já te envio um comparativo (valor + condomínio/IPTU) e também posso sugerir horários para uma visita.`
        ),
    };
  }

  if (input.intent === "LOCATION") {
    return {
      intent: "LOCATION",
      confidence: "high",
      questions: [
        "Qual bairro/região é prioridade para você?",
        "Você precisa de proximidade com metrô/ônibus ou algum ponto específico?",
        "Tem alguma restrição de tempo de deslocamento?",
      ]
        .map((q) => sanitizeReason(q))
        .filter(Boolean)
        .slice(0, 4),
      nextSteps: ["Confirmar região e pontos de interesse", "Sugerir 2 alternativas próximas"]
        .map((s) => sanitizeReason(s))
        .filter(Boolean)
        .slice(0, 4),
      draft:
        sanitizeDraft(
          `${greet}\n\n` +
            `${about}me conta um pouco melhor sua preferência de localização: qual bairro/região você quer priorizar?\n` +
            `E tem algum ponto de referência importante (metrô, trabalho, escola) para eu considerar?\n\n` +
            `Com isso eu consigo te mandar opções bem alinhadas.`
        ),
    };
  }

  if (input.intent === "FINANCING") {
    return {
      intent: "FINANCING",
      confidence: "high",
      questions: [
        "Você já tem uma simulação aprovada ou ainda vai iniciar?",
        "Quanto você pretende dar de entrada (aprox.)?",
        "Você pretende usar FGTS?",
      ]
        .map((q) => sanitizeReason(q))
        .filter(Boolean)
        .slice(0, 4),
      nextSteps: ["Qualificar entrada/FGTS/situação", "Oferecer simulação ou indicar documentos básicos"]
        .map((s) => sanitizeReason(s))
        .filter(Boolean)
        .slice(0, 4),
      draft:
        sanitizeDraft(
          `${greet}\n\n` +
            `${about}sobre financiamento, para eu te orientar melhor: você já tem simulação aprovada ou ainda vai iniciar?\n` +
            `Você pretende dar qual entrada (aprox.) e usar FGTS?\n\n` +
            `Com essas infos eu te digo o melhor caminho e já alinho o próximo passo.`
        ),
    };
  }

  if (input.intent === "VISIT") {
    return {
      intent: "VISIT",
      confidence: "medium",
      questions: [
        "Qual dia/horário fica melhor para você (manhã/tarde/noite)?",
        "Quantas pessoas irão na visita?",
        "Você quer ver só esse imóvel ou comparar com outras opções também?",
      ]
        .map((q) => sanitizeReason(q))
        .filter(Boolean)
        .slice(0, 4),
      nextSteps: ["Sugerir 2 a 3 janelas de horário", "Confirmar ponto de encontro"]
        .map((s) => sanitizeReason(s))
        .filter(Boolean)
        .slice(0, 4),
      draft:
        sanitizeDraft(
          `${greet}\n\n` +
            `${about}vamos agendar uma visita sim. Qual dia e horário fica melhor para você (manhã/tarde/noite)?\n\n` +
            `Se quiser, eu também posso separar 2 opções parecidas para você comparar no mesmo dia.`
        ),
    };
  }

  return {
    intent: "GENERAL",
    confidence: "medium",
    questions: [
      "Você está buscando compra ou locação?",
      "Qual faixa de valor e quantos quartos você precisa?",
      "Qual região/bairro você prefere?",
    ]
      .map((q) => sanitizeReason(q))
      .filter(Boolean)
      .slice(0, 4),
    nextSteps: ["Qualificar necessidade", "Propor visita ou envio de opções"]
      .map((s) => sanitizeReason(s))
      .filter(Boolean)
      .slice(0, 4),
    draft:
      sanitizeDraft(
        `${greet}\n\n` +
          `${about}me conta rapidinho: você busca compra ou locação, e qual faixa de valor/quartos você precisa?\n` +
          `E qual região você prefere?\n\n` +
          `Com isso eu já te mando as melhores opções e a gente alinha o próximo passo.`
      ),
  };
}

async function callAi(params: {
  apiKey: string;
  lead: { clientName: string | null; propertyTitle: string | null };
  lastClientMessage: string | null;
  base: CoachPayload;
}) {
  const model = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

  const system =
    "Você é um assistente de atendimento de corretores de imóveis no Brasil (pt-BR).\n" +
    "Gere: intenção do cliente, 2 a 4 perguntas de qualificação, próximos passos e uma resposta curta e humana.\n" +
    "Responda SOMENTE com JSON válido, sem markdown, com chaves: intent, confidence, questions, nextSteps, draft.\n" +
    "Sem emojis, sem links e sem telefone.";

  const user = [
    `Cliente: ${params.lead.clientName || "(não informado)"}`,
    `Imóvel: ${params.lead.propertyTitle || "(não informado)"}`,
    `Última mensagem do cliente: ${params.lastClientMessage || "(sem mensagem)"}`,
    "\nSugestão base (pode melhorar, mas não invente fatos):",
    JSON.stringify(params.base),
  ].join("\n");

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
        max_tokens: 450,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const json = (await res.json().catch(() => null)) as any;
    const content = String(json?.choices?.[0]?.message?.content || "").trim();
    if (!content) return null;

    const obj = (() => {
      try {
        return JSON.parse(content);
      } catch {
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        if (start >= 0 && end > start) {
          try {
            return JSON.parse(content.slice(start, end + 1));
          } catch {
            return null;
          }
        }
        return null;
      }
    })();

    if (!obj) return null;

    const intent = String(obj.intent || "").toUpperCase();
    const confidence = String(obj.confidence || "").toLowerCase();
    const questions = Array.isArray(obj.questions)
      ? obj.questions
          .map((x: any) => sanitizeReason(String(x)))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    const nextSteps = Array.isArray(obj.nextSteps)
      ? obj.nextSteps
          .map((x: any) => sanitizeReason(String(x)))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    const draft = sanitizeDraft(String(obj.draft || "").trim());

    const safeIntent = (intent === "PRICE" || intent === "LOCATION" || intent === "FINANCING" || intent === "VISIT" || intent === "GENERAL")
      ? (intent as Intent)
      : params.base.intent;

    const safeConfidence = confidence === "low" || confidence === "medium" || confidence === "high" ? confidence : params.base.confidence;

    if (!draft || questions.length === 0) return null;

    const output: CoachPayload = {
      intent: safeIntent,
      confidence: safeConfidence as any,
      questions,
      nextSteps: nextSteps.length ? nextSteps : params.base.nextSteps,
      draft,
    };

    return output;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ leadId: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { leadId } = await context.params;
    const { searchParams } = new URL(req.url);

    const parsedQuery = QuerySchema.safeParse({ ai: searchParams.get("ai") ?? undefined });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Invalid query", issues: parsedQuery.error.issues }, { status: 400 });
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id: String(leadId) },
      select: {
        id: true,
        realtorId: true,
        team: { select: { ownerId: true } },
        contact: { select: { name: true } },
        property: { select: { id: true, title: true } },
      },
    });

    if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });

    const isTeamOwner = !!lead.team && lead.team.ownerId === String(userId);
    if (role !== "ADMIN" && String(lead.realtorId || "") !== String(userId) && !isTeamOwner) {
      return NextResponse.json(
        { error: "Você não tem permissão para acessar este lead." },
        { status: 403 }
      );
    }

    const lastClient = await prisma.leadClientMessage.findFirst({
      where: { leadId: String(lead.id), fromClient: true },
      orderBy: { createdAt: "desc" },
      select: { content: true },
    });

    const lastClientMessage = lastClient?.content ? String(lastClient.content) : null;

    const { intent } = detectIntent(lastClientMessage);
    const base = buildCoachPayload({
      intent,
      clientName: lead?.contact?.name || null,
      propertyTitle: lead?.property?.title || null,
      lastClientMessage,
    });

    const wantsAi = parsedQuery.data.ai === "1";
    const apiKey = process.env.OPENAI_API_KEY;

    const output = wantsAi && apiKey
      ? (await callAi({
          apiKey,
          lead: {
            clientName: lead?.contact?.name || null,
            propertyTitle: lead?.property?.title || null,
          },
          lastClientMessage,
          base,
        })) || base
      : base;

    return NextResponse.json({ success: true, data: output });
  } catch (e) {
    console.error("/api/assistant/leads/[leadId]/coach GET error", e);
    return NextResponse.json({ error: "Não conseguimos gerar sugestões agora." }, { status: 500 });
  }
}
