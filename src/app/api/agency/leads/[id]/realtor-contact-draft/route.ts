import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { createAuditLog } from "@/lib/audit-log";
import { captureException } from "@/lib/sentry";

export const runtime = "nodejs";

const QuerySchema = z
  .object({
    realtorId: z.string().trim().optional(),
  })
  .strict();

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function cleanText(value: string, max: number) {
  const s = String(value || "");
  const clipped = s.length > max ? s.slice(0, max) : s;
  return clipped.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeForAgencyEvent(e: any) {
  const t = String(e?.type || "");
  if (t === "CLIENT_MESSAGE") {
    return { ...e, title: "Mensagem do cliente", description: null };
  }
  if (t === "INTERNAL_MESSAGE") {
    return { ...e, title: "Atualização registrada", description: null };
  }
  if (t === "NOTE_ADDED") {
    return { ...e, title: "Nota adicionada", description: null };
  }
  return {
    ...e,
    title: e?.title != null ? cleanText(String(e.title), 120) : null,
    description: e?.description != null ? cleanText(String(e.description), 220) : null,
  };
}

function formatSlaAgeFromDate(lastClientAt: Date | null) {
  if (!lastClientAt || Number.isNaN(lastClientAt.getTime())) return null;
  const diffMs = Date.now() - lastClientAt.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return `${hours}h ${rem.toString().padStart(2, "0")}m`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return `${days}d ${hrs}h`;
}

function buildFallbackDraft(input: {
  realtorName: string | null;
  contactName: string | null;
  propertyTitle: string | null;
  pipelineStage: string | null;
  slaAge: string | null;
}) {
  const realtor = input.realtorName || "";
  const client = input.contactName || "este lead";
  const prop = input.propertyTitle ? ` (${input.propertyTitle})` : "";
  const stage = input.pipelineStage ? ` Etapa: ${input.pipelineStage}.` : "";
  const sla = input.slaAge ? ` Há ${input.slaAge} sem resposta.` : "";
  return cleanText(
    `Olá${realtor ? ` ${realtor}` : ""}! Tudo bem?\n\nVi no painel da agência que o lead ${client}${prop} está com pendência.${sla}${stage}\n\nVocê consegue verificar e me dar um retorno com o próximo passo e um prazo? Obrigado!`,
    1200
  );
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
        temperature: 0.5,
        max_tokens: 260,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false as const, status: res.status, body: txt.slice(0, 2000), model };
    }

    const json = (await res.json().catch(() => null)) as OpenAIChatResponse | null;
    const content = json?.choices?.[0]?.message?.content?.trim() || "";
    if (!content) return { ok: false as const, status: 0, body: "empty", model };
    return { ok: true as const, content, model };
  } catch {
    return { ok: false as const, status: 0, body: "timeout_or_network", model };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) {
    return { userId: null as string | null, role: null as string | null };
  }
  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;
  return { userId: userId ? String(userId) : null, role: role ? String(role) : null };
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const ip = getClientIp(req);
    const allowed = await checkRateLimit(ip, "ai");
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Muitas requisições. Tente novamente em alguns minutos." },
        { status: 429 }
      );
    }

    const { id } = await context.params;
    const leadId = String(id);

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({ realtorId: url.searchParams.get("realtorId") || undefined });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    let agencyTeamId: string | null = null;
    if (role === "AGENCY") {
      const profile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      agencyTeamId = profile?.teamId ? String(profile.teamId) : null;
      if (!agencyTeamId) {
        return NextResponse.json({ success: false, error: "Time da agência não encontrado" }, { status: 403 });
      }
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        teamId: true,
        status: true,
        pipelineStage: true,
        createdAt: true,
        realtorId: true,
        contact: { select: { name: true } },
        property: { select: { title: true, city: true, state: true } },
        realtor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
    }

    const logTeamId = agencyTeamId ?? (lead.teamId ? String(lead.teamId) : null);

    if (role === "AGENCY") {
      if (!lead.teamId || String(lead.teamId) !== String(agencyTeamId)) {
        return NextResponse.json({ success: false, error: "Você só pode acessar leads do seu time." }, { status: 403 });
      }
    }

    const targetRealtorId = (parsed.data.realtorId || lead.realtorId || "").trim();
    if (!targetRealtorId) {
      return NextResponse.json({ success: false, error: "Lead sem corretor responsável." }, { status: 400 });
    }

    // Garante que o corretor pertence ao time (para AGENCY) antes de gerar draft
    if (role === "AGENCY") {
      const membership = await (prisma as any).teamMember.findFirst({
        where: { teamId: String(agencyTeamId), userId: String(targetRealtorId) },
        select: { userId: true },
      });
      if (!membership) {
        return NextResponse.json({ success: false, error: "Corretor não pertence ao time." }, { status: 400 });
      }
    }

    // SLA: só precisamos do timestamp, não do conteúdo
    const [lastClientMsg, lastProChatMsg, lastInternalMsg] = await Promise.all([
      (prisma as any).leadClientMessage.findFirst({
        where: { leadId: String(leadId), fromClient: true },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      (prisma as any).leadClientMessage.findFirst({
        where: { leadId: String(leadId), fromClient: false },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      (prisma as any).leadMessage.findFirst({
        where: { leadId: String(leadId) },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const lastClientAt = lastClientMsg?.createdAt ? new Date(lastClientMsg.createdAt) : null;
    const lastProAtRaw = [
      lastProChatMsg?.createdAt ? new Date(lastProChatMsg.createdAt) : null,
      lastInternalMsg?.createdAt ? new Date(lastInternalMsg.createdAt) : null,
    ].filter(Boolean) as Date[];
    const lastProAt = lastProAtRaw.length ? new Date(Math.max(...lastProAtRaw.map((d) => d.getTime()))) : null;

    const awaitingReply = !!(lastClientAt && (!lastProAt || lastClientAt.getTime() > lastProAt.getTime()));
    const slaAge = awaitingReply ? formatSlaAgeFromDate(lastClientAt) : null;

    const rawEvents = await (prisma as any).leadEvent.findMany({
      where: { leadId: String(leadId) },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        createdAt: true,
        fromStage: true,
        toStage: true,
        fromStatus: true,
        toStatus: true,
      },
    });

    const events = (rawEvents || []).map((e: any) => sanitizeForAgencyEvent(e));

    const apiKey = process.env.OPENAI_API_KEY || "";

    const baseContextLines: string[] = [];
    baseContextLines.push(`LeadId: ${leadId}`);
    if (lead.contact?.name) baseContextLines.push(`Cliente: ${String(lead.contact.name)}`);
    if (lead.property?.title) baseContextLines.push(`Imóvel: ${String(lead.property.title)}`);
    const cityState = [lead.property?.city, lead.property?.state].filter(Boolean).join("/");
    if (cityState) baseContextLines.push(`Local: ${cityState}`);
    if (lead.pipelineStage) baseContextLines.push(`Etapa: ${String(lead.pipelineStage)}`);
    if (lead.status) baseContextLines.push(`Status: ${String(lead.status)}`);
    if (awaitingReply) baseContextLines.push(`SLA: aguardando resposta do corretor há ${slaAge || "(tempo não calculado)"}`);

    if (events.length) {
      baseContextLines.push("\nEventos recentes (sanitizados; não há conteúdo de chat):");
      for (const e of events) {
        const dt = e?.createdAt ? new Date(e.createdAt).toISOString() : "";
        const title = e?.title ? String(e.title) : "";
        const type = e?.type ? String(e.type) : "";
        baseContextLines.push(`- (${dt}) ${type}${title ? `: ${title}` : ""}`);
      }
    }

    const fallback = buildFallbackDraft({
      realtorName: lead.realtor?.name || null,
      contactName: lead.contact?.name || null,
      propertyTitle: lead.property?.title || null,
      pipelineStage: lead.pipelineStage || null,
      slaAge,
    });

    if (!apiKey) {
      void createAuditLog({
        level: "WARN",
        action: "AGENCY_REALTOR_DRAFT_FALLBACK",
        actorId: String(userId),
        actorRole: String(role || ""),
        targetType: "Lead",
        targetId: String(leadId),
        metadata: {
          reason: "missing_api_key",
          teamId: logTeamId,
          realtorId: lead.realtor?.id ? String(lead.realtor.id) : null,
        },
      });
      return NextResponse.json({
        success: true,
        usedAi: false,
        draft: fallback,
      });
    }

    const systemPrompt =
      "Você é um supervisor de agência imobiliária no Brasil (pt-BR).\n" +
      "Seu objetivo é ajudar o dono/gestor da agência a cobrar um corretor responsável por um lead, de forma profissional e objetiva.\n" +
      "REGRAS:\n" +
      "- Não use emojis.\n" +
      "- Não invente fatos. Use apenas o contexto fornecido.\n" +
      "- Não inclua links, telefone ou e-mail.\n" +
      "- Escreva uma única mensagem curta (até ~700 caracteres), pronta para enviar no chat interno com o corretor.\n" +
      "- Peça um prazo/ETA e um próximo passo claro.";

    const userPrompt =
      [
        lead.realtor?.name ? `Corretor responsável: ${String(lead.realtor.name)}` : null,
        ...baseContextLines,
        "\nEscreva a mensagem agora.",
      ]
        .filter(Boolean)
        .join("\n");

    const aiRes = await callOpenAiText({ apiKey, systemPrompt, userPrompt });
    if (!aiRes.ok) {
      void createAuditLog({
        level: "WARN",
        action: "AGENCY_REALTOR_DRAFT_FALLBACK",
        actorId: String(userId),
        actorRole: String(role || ""),
        targetType: "Lead",
        targetId: String(leadId),
        metadata: {
          reason: "ai_failed",
          model: (aiRes as any)?.model ?? null,
          status: (aiRes as any)?.status ?? null,
          body: (aiRes as any)?.body ?? null,
          teamId: logTeamId,
          realtorId: lead.realtor?.id ? String(lead.realtor.id) : null,
        },
      });
      return NextResponse.json({ success: true, usedAi: false, draft: fallback });
    }

    const draft = cleanText(aiRes.content, 1200);
    if (draft.length < 10) {
      void createAuditLog({
        level: "WARN",
        action: "AGENCY_REALTOR_DRAFT_FALLBACK",
        actorId: String(userId),
        actorRole: String(role || ""),
        targetType: "Lead",
        targetId: String(leadId),
        metadata: {
          reason: "empty_ai_output",
          model: (aiRes as any)?.model ?? null,
          teamId: logTeamId,
          realtorId: lead.realtor?.id ? String(lead.realtor.id) : null,
        },
      });
      return NextResponse.json({ success: true, usedAi: false, draft: fallback });
    }

    void createAuditLog({
      level: "INFO",
      action: "AGENCY_REALTOR_DRAFT_GENERATED",
      actorId: String(userId),
      actorRole: String(role || ""),
      targetType: "Lead",
      targetId: String(leadId),
      metadata: {
        model: (aiRes as any)?.model ?? null,
        teamId: logTeamId,
        realtorId: lead.realtor?.id ? String(lead.realtor.id) : null,
      },
    });

    return NextResponse.json({ success: true, usedAi: true, draft });
  } catch (error) {
    console.error("Error generating realtor contact draft:", error);
    captureException(error, { route: "/api/agency/leads/[id]/realtor-contact-draft" });
    return NextResponse.json({ success: false, error: "Não conseguimos gerar a mensagem agora." }, { status: 500 });
  }
}
