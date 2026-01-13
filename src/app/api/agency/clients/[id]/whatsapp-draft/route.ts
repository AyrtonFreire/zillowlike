import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientMatchService } from "@/lib/client-match-service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { normalizePhoneE164 } from "@/lib/sms";

export const runtime = "nodejs";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) return { userId: null as string | null, role: null as string | null };
  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;
  return { userId: userId ? String(userId) : null, role: role ? String(role) : null };
}

function getBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  return String(base || "").replace(/\/$/, "");
}

async function resolveTeamId(input: { userId: string; role: string | null; teamIdParam: string | null }) {
  const { userId, role, teamIdParam } = input;

  let teamId: string | null = teamIdParam ? String(teamIdParam) : null;

  if (!teamId && role === "AGENCY") {
    const profile = await (prisma as any).agencyProfile.findUnique({
      where: { userId: String(userId) },
      select: { teamId: true },
    });
    teamId = profile?.teamId ? String(profile.teamId) : null;
  }

  if (!teamId && role === "ADMIN") {
    const membership = await (prisma as any).teamMember.findFirst({
      where: { userId: String(userId) },
      select: { teamId: true },
      orderBy: { createdAt: "asc" },
    });
    teamId = membership?.teamId ? String(membership.teamId) : null;
  }

  return teamId;
}

async function assertTeamAccess(input: { userId: string; role: string | null; teamId: string }) {
  const { userId, role, teamId } = input;

  const team = await (prisma as any).team.findUnique({
    where: { id: String(teamId) },
    include: {
      owner: { select: { id: true } },
      members: true,
    },
  });

  if (!team) {
    return { team: null, error: NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 }) };
  }

  if (role !== "ADMIN") {
    const isMember = (team.members as any[]).some((m) => String(m.userId) === String(userId));
    const isOwner = String(team.ownerId) === String(userId);
    if (!isMember && !isOwner) {
      return {
        team: null,
        error: NextResponse.json({ success: false, error: "Você não tem acesso a este time." }, { status: 403 }),
      };
    }
  }

  return { team, error: null as NextResponse | null };
}

const BodySchema = z.object({
  recommendationListId: z.string().trim().min(1).optional(),
  token: z.string().trim().min(1).optional(),
  customMessage: z.string().trim().max(2000).optional().nullable(),
  createListIfMissing: z.boolean().optional().nullable(),
  expiresInDays: z.number().int().positive().max(60).optional().nullable(),
});

function digitsForWaMe(phoneE164: string) {
  return String(phoneE164 || "").replace(/\D+/g, "");
}

async function callOpenAI(input: { apiKey: string; systemPrompt: string; userPrompt: string }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);
  const model = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 350,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false as const, status: res.status, body: txt.slice(0, 2000) };
    }

    const json = (await res.json().catch(() => null)) as OpenAIChatResponse | null;
    const content = json?.choices?.[0]?.message?.content?.trim() || "";

    if (!content) {
      return { ok: false as const, status: 0, body: "empty" };
    }

    return { ok: true as const, content };
  } catch {
    return { ok: false as const, status: 0, body: "timeout_or_network" };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildFallbackDraft(input: { clientName: string; shareUrl: string | null; customMessage: string | null }) {
  const parts: string[] = [];
  parts.push(`Olá, ${input.clientName}! Tudo bem?`);
  parts.push("Separei alguns imóveis que combinam com o que você está procurando.");
  if (input.shareUrl) {
    parts.push(`Segue o link para você ver com calma: ${input.shareUrl}`);
  }
  if (input.customMessage) {
    parts.push(String(input.customMessage).trim());
  }
  parts.push("Se fizer sentido, me diga qual te chamou mais atenção e qual o melhor horário para eu te ligar/te mandar mais detalhes.");
  return parts.join("\n\n").trim();
}

async function getOrCreateRecommendationList(input: {
  teamId: string;
  clientId: string;
  userId: string;
  listId?: string | null;
  token?: string | null;
  createIfMissing: boolean;
  expiresInDays: number;
}) {
  const now = new Date();

  if (input.listId) {
    const list = await (prisma as any).clientRecommendationList.findFirst({
      where: {
        id: String(input.listId),
        teamId: String(input.teamId),
        clientId: String(input.clientId),
      },
      select: {
        id: true,
        token: true,
        title: true,
        message: true,
        propertyIds: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return list && list.expiresAt >= now ? (list as any) : null;
  }

  if (input.token) {
    const list = await (prisma as any).clientRecommendationList.findUnique({
      where: { token: String(input.token) },
      select: {
        id: true,
        token: true,
        title: true,
        message: true,
        propertyIds: true,
        expiresAt: true,
        createdAt: true,
        teamId: true,
        clientId: true,
      },
    });

    if (!list) return null;
    if (String(list.teamId) !== String(input.teamId)) return null;
    if (String(list.clientId) !== String(input.clientId)) return null;
    if (list.expiresAt < now) return null;
    return list as any;
  }

  const latest = await (prisma as any).clientRecommendationList.findFirst({
    where: {
      teamId: String(input.teamId),
      clientId: String(input.clientId),
      expiresAt: { gte: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      title: true,
      message: true,
      propertyIds: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  if (latest) return latest as any;
  if (!input.createIfMissing) return null;

  const matchResult = await ClientMatchService.getOrRefreshMatches({
    clientId: String(input.clientId),
    teamId: String(input.teamId),
    limit: 20,
    forceRefresh: false,
  });

  const ordered = matchResult.items.map((it) => String(it.property.id)).filter(Boolean).slice(0, 50);
  if (ordered.length === 0) return null;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

  const created = await (prisma as any).clientRecommendationList.create({
    data: {
      clientId: String(input.clientId),
      teamId: String(input.teamId),
      createdByUserId: String(input.userId),
      token,
      title: null,
      message: null,
      propertyIds: ordered,
      filters: null,
      expiresAt,
    },
    select: {
      id: true,
      token: true,
      title: true,
      message: true,
      propertyIds: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return created as any;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ success: false, error: "Muitas requisições. Tente novamente em alguns minutos." }, { status: 429 });
    }

    const url = new URL(req.url);
    const teamId = await resolveTeamId({ userId, role, teamIdParam: url.searchParams.get("teamId") });

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 });
    }

    const { error: teamError } = await assertTeamAccess({ userId, role, teamId });
    if (teamError) return teamError;

    const { id } = await params;
    const clientId = String(id);

    const client = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneNormalized: true,
        email: true,
        status: true,
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

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsedBody = BodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsedBody.error.issues }, { status: 400 });
    }

    const phoneRaw = client.phoneNormalized || client.phone || "";
    const phoneE164 = phoneRaw ? normalizePhoneE164(String(phoneRaw)) : "";
    const phoneDigits = digitsForWaMe(phoneE164);

    if (!phoneDigits) {
      return NextResponse.json({ success: false, error: "Cliente não possui telefone válido para WhatsApp." }, { status: 400 });
    }

    const expiresInDaysRaw =
      typeof parsedBody.data.expiresInDays === "number" && Number.isFinite(parsedBody.data.expiresInDays)
        ? parsedBody.data.expiresInDays
        : 14;
    const expiresInDays = Math.min(Math.max(Math.round(expiresInDaysRaw), 1), 60);

    const createListIfMissing = parsedBody.data.createListIfMissing == null ? true : !!parsedBody.data.createListIfMissing;

    const list = await getOrCreateRecommendationList({
      teamId: String(teamId),
      clientId: String(clientId),
      userId: String(userId),
      listId: parsedBody.data.recommendationListId ? String(parsedBody.data.recommendationListId) : null,
      token: parsedBody.data.token ? String(parsedBody.data.token) : null,
      createIfMissing: createListIfMissing,
      expiresInDays,
    });

    const baseUrl = getBaseUrl() || req.nextUrl.origin;
    const shareUrl = list?.token ? `${String(baseUrl).replace(/\/$/, "")}/explore-client/${String(list.token)}` : null;

    const clientName = String(client.name || "Cliente").trim() || "Cliente";
    const customMessage = parsedBody.data.customMessage ? String(parsedBody.data.customMessage).trim() : null;

    const fallbackDraft = buildFallbackDraft({ clientName, shareUrl, customMessage });

    const apiKey = process.env.OPENAI_API_KEY || "";
    let draft = fallbackDraft;
    let usedAi = false;

    if (apiKey) {
      const listPropertyCount = Array.isArray(list?.propertyIds) ? list.propertyIds.length : 0;

      const systemPrompt =
        "Você é um corretor imobiliário no Brasil.\n" +
        "Sua tarefa é escrever uma mensagem curta e profissional para WhatsApp em pt-BR.\n" +
        "Regras:\n" +
        "- Seja objetivo (máximo ~900 caracteres).\n" +
        "- Não use emojis.\n" +
        "- Não invente dados.\n" +
        "- Inclua um convite claro para o cliente responder.\n";

      const pref = (client as any).preference;
      const prefLines: string[] = [];
      if (pref?.city && pref?.state) prefLines.push(`Local: ${pref.city}/${pref.state}`);
      if (Array.isArray(pref?.neighborhoods) && pref.neighborhoods.length) {
        prefLines.push(`Bairros: ${pref.neighborhoods.slice(0, 6).join(", ")}`);
      }
      if (pref?.purpose) prefLines.push(`Finalidade: ${pref.purpose === "RENT" ? "aluguel" : "venda"}`);
      if (Array.isArray(pref?.types) && pref.types.length) prefLines.push(`Tipos: ${pref.types.slice(0, 5).join(", ")}`);
      if (typeof pref?.minPrice === "number") prefLines.push(`Preço mínimo: R$ ${(pref.minPrice / 100).toLocaleString("pt-BR")}`);
      if (typeof pref?.maxPrice === "number") prefLines.push(`Preço máximo: R$ ${(pref.maxPrice / 100).toLocaleString("pt-BR")}`);
      if (typeof pref?.bedroomsMin === "number") prefLines.push(`Quartos mín.: ${pref.bedroomsMin}`);
      if (typeof pref?.bathroomsMin === "number") prefLines.push(`Banheiros mín.: ${pref.bathroomsMin}`);
      if (typeof pref?.areaMin === "number") prefLines.push(`Área mín.: ${pref.areaMin} m²`);

      const userPromptLines: string[] = [];
      userPromptLines.push(`Cliente: ${clientName}`);
      if (prefLines.length) userPromptLines.push(`Preferências:\n${prefLines.map((l) => `- ${l}`).join("\n")}`);
      if (listPropertyCount) userPromptLines.push(`Eu separei ${listPropertyCount} imóveis para ele(a).`);
      if (shareUrl) userPromptLines.push(`Link da lista: ${shareUrl}`);
      if (customMessage) userPromptLines.push(`Observação adicional do corretor: ${customMessage}`);
      userPromptLines.push("Escreva a mensagem pronta para enviar no WhatsApp.");

      const attempt = await callOpenAI({
        apiKey,
        systemPrompt,
        userPrompt: userPromptLines.join("\n\n"),
      });

      if (attempt.ok) {
        const cleaned = String(attempt.content || "")
          .replace(/^```[a-zA-Z]*\n?/, "")
          .replace(/```\s*$/, "")
          .trim();
        if (cleaned.length >= 10) {
          draft = cleaned.slice(0, 1200).trim();
          usedAi = true;
        }
      }
    }

    const text = encodeURIComponent(draft);
    const whatsappUrl = `https://wa.me/${phoneDigits}?text=${text}`;

    return NextResponse.json({
      success: true,
      usedAi,
      draft,
      whatsappUrl,
      client: {
        id: String(client.id),
        name: clientName,
      },
      recommendationList: list
        ? {
            id: String(list.id),
            token: String(list.token),
            shareUrl,
            propertyCount: Array.isArray(list.propertyIds) ? list.propertyIds.length : 0,
            expiresAt: list.expiresAt ? new Date(list.expiresAt).toISOString() : null,
          }
        : null,
    });
  } catch (error) {
    console.error("Error generating client WhatsApp draft:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos gerar a mensagem agora." }, { status: 500 });
  }
}
