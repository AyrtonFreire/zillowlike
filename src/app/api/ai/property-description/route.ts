import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, withErrorHandling } from "@/lib/api-response";
import { withRateLimit } from "@/lib/rate-limiter";
import { z } from "zod";

export const runtime = "nodejs";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const BodySchema = z.object({
  title: z.string().max(120).optional().nullable(),
  type: z.string().max(40).optional().nullable(),
  purpose: z.enum(["SALE", "RENT"]).optional().nullable(),
  priceBRL: z.number().int().nonnegative().optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(10).optional().nullable(),
  bedrooms: z.number().int().min(0).max(50).optional().nullable(),
  bathrooms: z.number().min(0).max(50).optional().nullable(),
  areaM2: z.number().int().min(0).max(100000).optional().nullable(),
  conditionTags: z.array(z.string().max(80)).max(20).optional().nullable(),
  amenities: z
    .object({
      hasBalcony: z.boolean().optional(),
      hasElevator: z.boolean().optional(),
      hasPool: z.boolean().optional(),
      hasGym: z.boolean().optional(),
      hasPlayground: z.boolean().optional(),
      hasPartyRoom: z.boolean().optional(),
      hasGourmet: z.boolean().optional(),
      hasConcierge24h: z.boolean().optional(),
    })
    .optional()
    .nullable(),
  images: z.array(z.string().url().max(1500)).max(12).optional().nullable(),
});

function toCloudinaryThumb(url: string) {
  try {
    if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
    return url.replace(
      "/upload/",
      "/upload/w_512,h_512,c_limit,q_auto,f_auto/"
    );
  } catch {
    return url;
  }
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const anySession = session as any;
  const user = anySession.user as any | undefined;
  const userId = anySession.userId || user?.id || user?.sub || null;
  return userId || null;
}

async function handler(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return errorResponse("Unauthorized", 401, null, "UNAUTHORIZED");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "AI is not configured",
      500,
      null,
      "OPENAI_API_KEY_MISSING"
    );
  }

  const rawBody = await req.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return errorResponse(
      "Invalid payload",
      400,
      parsedBody.error.issues,
      "VALIDATION_ERROR"
    );
  }

  const draft = await prisma.propertyDraft.findUnique({
    where: { userId },
  });

  const data = (draft?.data || {}) as any;
  const generations = Number(data.aiDescriptionGenerations || 0);
  if (generations >= 1) {
    return errorResponse(
      "Limite atingido para este imóvel",
      429,
      null,
      "AI_DESCRIPTION_LIMIT_REACHED"
    );
  }

  const b = parsedBody.data;
  const purposeLabel = b.purpose === "RENT" ? "aluguel" : "venda";
  const cityState = [b.city, b.state].filter(Boolean).join("/");
  const location = [b.neighborhood, cityState].filter(Boolean).join(" - ");
  const priceStr = typeof b.priceBRL === "number" ? `R$ ${b.priceBRL.toLocaleString("pt-BR")}` : "";

  const amenities = b.amenities || {};
  const amenitiesList = [
    amenities.hasElevator ? "Elevador" : null,
    amenities.hasBalcony ? "Varanda" : null,
    amenities.hasPool ? "Piscina" : null,
    amenities.hasGym ? "Academia" : null,
    amenities.hasGourmet ? "Espaço gourmet" : null,
    amenities.hasPlayground ? "Playground" : null,
    amenities.hasPartyRoom ? "Salão de festas" : null,
    amenities.hasConcierge24h ? "Portaria 24h" : null,
  ].filter(Boolean) as string[];

  const textContextLines = [
    b.title ? `Título: ${b.title}` : null,
    b.type ? `Tipo: ${b.type}` : null,
    b.purpose ? `Finalidade: ${purposeLabel}` : null,
    priceStr ? `Preço: ${priceStr}` : null,
    location ? `Localização: ${location}` : null,
    typeof b.areaM2 === "number" && b.areaM2 > 0 ? `Área: ${b.areaM2} m²` : null,
    typeof b.bedrooms === "number" && b.bedrooms >= 0 ? `Quartos: ${b.bedrooms}` : null,
    typeof b.bathrooms === "number" && b.bathrooms >= 0 ? `Banheiros: ${b.bathrooms}` : null,
    b.conditionTags?.length ? `Diferenciais: ${b.conditionTags.join(", ")}` : null,
    amenitiesList.length ? `Comodidades: ${amenitiesList.join(", ")}` : null,
  ].filter(Boolean);

  const images = (b.images || []).map(toCloudinaryThumb).slice(0, 10);

  const systemPrompt =
    "Você é um redator imobiliário profissional no Brasil.\n" +
    "Sua tarefa é escrever uma descrição de anúncio imobiliário em pt-BR, com linguagem profissional, objetiva e agradável.\n" +
    "\nREGRAS (obrigatórias):\n" +
    "1) Saída com 10 a 15 linhas, separadas por quebras de linha (\\n).\n" +
    "2) Não invente fatos. Não inferir: vista, metragem não informada, mobília, vagas, andar, condomínio/IPTU, reforma, alto padrão, proximidade de pontos de interesse, orientação solar, etc., a menos que esteja nos dados ou claramente visível nas fotos.\n" +
    "3) Use apenas o que estiver nos dados fornecidos e o que for visível nas fotos.\n" +
    "4) Se faltar informação, escreva de forma neutra (sem suposições).\n" +
    "5) Não inclua emojis.\n" +
    "6) Não inclua telefone, e-mail, links, preço parcelado, ou chamada agressiva.\n" +
    "7) Não inclua título, lista com bullets, ou seções com cabeçalhos; apenas texto corrido em linhas.\n" +
    "\nESTILO:\n" +
    "- Foque em benefícios reais (luz, ventilação, amplitude, integração de ambientes) apenas quando suportado pelas fotos.\n" +
    "- Evite adjetivos exagerados e clichês.\n" +
    "- Tom: confiável, claro e comercial moderado.";

  const userText =
    "Dados do imóvel (use como fonte de verdade):\n" +
    textContextLines.map((l) => `- ${l}`).join("\n") +
    "\n\nInstrução: gere a descrição seguindo estritamente as regras.";

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        ...images.map((url) => ({ type: "image_url", image_url: { url } })),
      ],
    },
  ];

  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 550,
    }),
  });

  if (!aiRes.ok) {
    const txt = await aiRes.text().catch(() => "");
    return errorResponse(
      "Falha ao gerar descrição",
      502,
      { status: aiRes.status, body: txt.slice(0, 2000) },
      "AI_UPSTREAM_ERROR"
    );
  }

  const json = (await aiRes.json().catch(() => null)) as OpenAIChatResponse | null;
  const content = json?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return errorResponse(
      "Falha ao gerar descrição",
      502,
      null,
      "AI_EMPTY_RESPONSE"
    );
  }

  const nextData = {
    ...data,
    aiDescriptionGenerations: 1,
    aiDescriptionLastAt: new Date().toISOString(),
    aiGeneratedDescription: content,
  };

  await prisma.propertyDraft.upsert({
    where: { userId },
    update: { data: nextData },
    create: { userId, data: nextData },
  });

  return successResponse({ description: content }, "OK");
}

export const POST = withErrorHandling(withRateLimit(handler, "ai"));
