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

type AiPropertyText = {
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
};

function parseMaybeNumber(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function numberField<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(parseMaybeNumber, schema.nullable().optional());
}

function clampText(s: string, max: number) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

function wrapText(input: string, maxLen: number) {
  const text = String(input || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
  if (!text) return "";
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line) {
      line = w;
      continue;
    }
    if (line.length + 1 + w.length <= maxLen) {
      line = `${line} ${w}`;
      continue;
    }
    lines.push(line);
    line = w;
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

function formatListingDescription(raw: string) {
  const t = String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!t) return "";

  const alreadyHasParagraphs = /\n\n/.test(t);
  const base = t
    .split("\n")
    .map((l) => l.replace(/^\s*[-•]\s+/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (alreadyHasParagraphs) {
    const paras = t
      .split(/\n\n+/)
      .map((p) => p.replace(/^\s*[-•]\s+/gm, "").trim())
      .filter(Boolean)
      .slice(0, 4);
    return paras.map((p) => wrapText(p, 88)).join("\n\n");
  }

  const sentences = base
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length < 3) {
    return wrapText(base, 88);
  }

  const p1 = sentences.slice(0, Math.min(3, sentences.length)).join(" ");
  const p2 = sentences.slice(Math.min(3, sentences.length), Math.min(6, sentences.length)).join(" ");
  const p3 = sentences.slice(Math.min(6, sentences.length)).join(" ");
  const paragraphs = [p1, p2, p3].map((p) => p.trim()).filter(Boolean);
  return paragraphs.map((p) => wrapText(p, 88)).join("\n\n");
}

function defaultTitleFromInput(b: z.infer<typeof BodySchema>) {
  const base = String(b.title || "").trim();
  if (base.length >= 3) return clampText(base, 70);
  const type = String(b.type || "Imóvel").trim() || "Imóvel";
  const cityState = [b.city, b.state].filter(Boolean).join("/");
  const location = [b.neighborhood, cityState].filter(Boolean).join(" - ");
  const t = location ? `${type} em ${location}` : type;
  return clampText(t, 70);
}

function defaultMetaTitleFromInput(b: z.infer<typeof BodySchema>) {
  const type = String(b.type || "Imóvel").trim() || "Imóvel";
  const action = b.purpose === "RENT" ? "para alugar" : "à venda";
  const cityState = [b.city, b.state].filter(Boolean).join("/");
  const local = String(b.neighborhood || "").trim() || cityState || "Brasil";
  return clampText(`${type} ${action} em ${local}`, 65);
}

function defaultMetaDescriptionFromInput(b: z.infer<typeof BodySchema>) {
  const type = String(b.type || "Imóvel").trim() || "Imóvel";
  const action = b.purpose === "RENT" ? "para alugar" : "à venda";
  const cityState = [b.city, b.state].filter(Boolean).join("/");
  const local = String(b.neighborhood || "").trim() || cityState || "";
  const rooms = typeof b.bedrooms === "number" ? `${b.bedrooms} quarto(s)` : "";
  const area = typeof b.areaM2 === "number" && b.areaM2 > 0 ? `${b.areaM2} m²` : "";
  const attr = [rooms, area].filter(Boolean)[0] || "";
  const head = [type, action, local].filter(Boolean).join(" ").trim();
  const full = [head, attr ? `• ${attr}` : null, "Veja fotos e detalhes."].filter(Boolean).join(" ");
  return clampText(full, 155);
}

const BodySchema = z.object({
  title: z.string().max(120).optional().nullable(),
  type: z.string().max(40).optional().nullable(),
  purpose: z.enum(["SALE", "RENT"]).optional().nullable(),
  priceBRL: numberField(z.number().int().nonnegative()),
  neighborhood: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(10).optional().nullable(),
  bedrooms: numberField(z.number().int().min(0).max(50)),
  bathrooms: numberField(z.number().min(0).max(50)),
  areaM2: numberField(z.number().int().min(0).max(100000)),
  suites: numberField(z.number().int().min(0).max(50)),
  parkingSpots: numberField(z.number().int().min(0).max(50)),
  floor: numberField(z.number().int().min(0).max(300)),
  yearBuilt: numberField(z.number().int().min(0).max(3000)),
  yearRenovated: numberField(z.number().int().min(0).max(3000)),
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
  images: z.array(z.string().url().max(4000)).max(12).optional().nullable(),
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

function extractJsonObject(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    // try to salvage from surrounding text
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
    typeof b.suites === "number" && b.suites >= 0 ? `Suítes: ${b.suites}` : null,
    typeof b.bathrooms === "number" && b.bathrooms >= 0 ? `Banheiros: ${b.bathrooms}` : null,
    typeof b.parkingSpots === "number" && b.parkingSpots >= 0 ? `Vagas: ${b.parkingSpots}` : null,
    typeof b.floor === "number" && b.floor > 0 ? `Andar: ${b.floor}` : null,
    typeof b.yearBuilt === "number" && b.yearBuilt > 0 ? `Ano de construção: ${b.yearBuilt}` : null,
    typeof b.yearRenovated === "number" && b.yearRenovated > 0 ? `Ano de reforma: ${b.yearRenovated}` : null,
    b.conditionTags?.length ? `Diferenciais: ${b.conditionTags.join(", ")}` : null,
    amenitiesList.length ? `Comodidades: ${amenitiesList.join(", ")}` : null,
  ].filter(Boolean);

  const images = (b.images || []).map(toCloudinaryThumb).slice(0, 10);

  const systemPrompt =
    "Você é um redator imobiliário profissional no Brasil.\n" +
    "Sua tarefa é gerar textos para anúncio e SEO em pt-BR, com linguagem profissional, objetiva e agradável.\n" +
    "\nFORMATO (obrigatório):\n" +
    "- Responda SOMENTE com um JSON válido (sem markdown).\n" +
    "- O JSON deve ter exatamente as chaves: title, description, metaTitle, metaDescription.\n" +
    "\nREGRAS (obrigatórias):\n" +
    "1) title: 3 a 70 caracteres, sem emojis, sem preço, sem contato, sem exageros.\n" +
    "2) metaTitle: até 65 caracteres. Formato obrigatório: [TIPO DE IMÓVEL] + [AÇÃO] + [LOCAL] + (DIFERENCIAL opcional).\n" +
    "   - AÇÃO deve ser: 'à venda' (SALE) ou 'para alugar' (RENT).\n" +
    "   - LOCAL deve priorizar bairro; se faltar, usar cidade/UF.\n" +
    "   - DIFERENCIAL opcional: escolher no máximo 1 (ex.: '2 Quartos', '3 Quartos', '80 m²', '1 Vaga', 'Varanda', 'Piscina').\n" +
    "   - Separar diferencial com ' | ' (pipe). Ex.: 'Apartamento à venda no Centro | 2 Quartos'.\n" +
    "3) metaDescription: até 155 caracteres. Formato obrigatório: Feature principal + Prova + CTA leve.\n" +
    "   - Feature principal: tipo + ação + local + 1 atributo objetivo (quartos/m²/vaga/amenity).\n" +
    "   - Prova: mencionar que há fotos/detalhes ou que o valor está atualizado, sem inventar.\n" +
    "   - CTA leve: 'Veja fotos', 'Saiba mais', 'Agende uma visita', 'Fale com um corretor'.\n" +
    "   - Proibido: telefone, e-mail, links, emojis, urgência/agressividade, superlativos.\n" +
    "4) description (Texto do anúncio): pelo menos 3 parágrafos, separados por uma linha em branco (\\n\\n).\n" +
    "   - Cada parágrafo deve ter 2 a 4 frases.\n" +
    "   - Use quebras de linha (\\n) dentro dos parágrafos para deixar o texto agradável de ler.\n" +
    "5) Não invente fatos. Não inferir: vista, metragem não informada, mobília, vagas, andar, condomínio/IPTU, reforma, alto padrão, proximidade de pontos de interesse, orientação solar, etc., a menos que esteja nos dados ou claramente visível nas fotos.\n" +
    "6) Use apenas o que estiver nos dados fornecidos e o que for visível nas fotos.\n" +
    "7) Se faltar informação, escreva de forma neutra (sem suposições).\n" +
    "8) Não inclua emojis.\n" +
    "9) Não inclua telefone, e-mail, links, preço parcelado, ou chamada agressiva.\n" +
    "10) A description não deve ter bullets/marcadores (ex.: '-' ou '•') nem títulos; apenas parágrafos.\n" +
    "11) Copywriting do Texto do anúncio: comece com uma abertura clara (tipo + ação + local) e depois detalhe (ambientes, metragem se tiver, diferenciais reais). Feche com CTA leve (ex.: 'Agende sua visita e conheça de perto.').\n" +
    "12) Seja específico e útil, mas só com dados fornecidos: quartos/banheiros/área, diferenciais, comodidades e contexto de localização (bairro/cidade/UF).\n" +
    "13) Validação final obrigatória antes de responder: metaTitle <= 65 caracteres e metaDescription <= 155 caracteres. Se passar, reescreva mais curto mantendo o formato exigido.\n" +
    "14) metaTitle e metaDescription devem ser 1 linha (sem \\n) e sem aspas desbalanceadas.\n" +
    "\nESTILO:\n" +
    "- Foque em benefícios reais (luz, ventilação, amplitude, integração) apenas quando suportado pelas fotos.\n" +
    "- Evite clichês e adjetivos exagerados.\n" +
    "- Tom: confiável, claro e comercial moderado.";

  const userText =
    "Dados do imóvel (use como fonte de verdade):\n" +
    textContextLines.map((l) => `- ${l}`).join("\n") +
    "\n\nInstrução: gere o JSON seguindo estritamente as regras.";

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

  const callOpenAI = async (payloadMessages: any[]) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    try {
      return await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          temperature: 0.6,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let aiRes: Response | null = null;
  try {
    aiRes = await callOpenAI(messages);
  } catch {
    aiRes = null;
  }

  // Fallback: se a chamada multimodal falhar (ou der timeout), tentar texto-only
  if (!aiRes || !aiRes.ok) {
    const textOnlyMessages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ];
    try {
      const retry = await callOpenAI(textOnlyMessages);
      aiRes = retry;
    } catch {
      // keep aiRes as null
    }
  }

  if (!aiRes) {
    // Não travar o corretor: volta com um texto padrão
    const fallback = {
      title: defaultTitleFromInput(b),
      description: "", // o client vai manter a descrição atual se vier vazio
      metaTitle: defaultMetaTitleFromInput(b),
      metaDescription: defaultMetaDescriptionFromInput(b),
    };
    return successResponse(fallback, "OK");
  }

  if (!aiRes.ok) {
    const txt = await aiRes.text().catch(() => "");
    // Não bloquear UX: retornar fallback e registrar a falha via details
    const fallback = {
      title: defaultTitleFromInput(b),
      description: "",
      metaTitle: defaultMetaTitleFromInput(b),
      metaDescription: defaultMetaDescriptionFromInput(b),
    };
    return successResponse(
      {
        ...fallback,
        _aiWarning: { status: aiRes.status, body: txt.slice(0, 2000) },
      } as any,
      "OK"
    );
  }

  const json = (await aiRes.json().catch(() => null)) as OpenAIChatResponse | null;
  const content = json?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    const fallback = {
      title: defaultTitleFromInput(b),
      description: "",
      metaTitle: defaultMetaTitleFromInput(b),
      metaDescription: defaultMetaDescriptionFromInput(b),
    };
    return successResponse(fallback, "OK");
  }

  const parsed = extractJsonObject(content) as Partial<AiPropertyText> | null;
  if (!parsed) {
    const fallback = {
      title: defaultTitleFromInput(b),
      description: "",
      metaTitle: defaultMetaTitleFromInput(b),
      metaDescription: defaultMetaDescriptionFromInput(b),
    };
    return successResponse(
      {
        ...fallback,
        _aiWarning: { code: "AI_INVALID_JSON", sample: content.slice(0, 2000) },
      } as any,
      "OK"
    );
  }

  const title = String(parsed.title || "").trim();
  const description = String(parsed.description || "").trim();
  const metaTitle = String(parsed.metaTitle || "").trim();
  const metaDescription = String(parsed.metaDescription || "").trim();

  const safeTitle = title.length >= 3 ? clampText(title, 70) : defaultTitleFromInput(b);
  const safeDescription = description ? formatListingDescription(description) : "";
  const safeMetaTitle = metaTitle ? clampText(metaTitle, 65) : defaultMetaTitleFromInput(b);
  const safeMetaDescription = metaDescription ? clampText(metaDescription, 155) : defaultMetaDescriptionFromInput(b);

  const nextData = {
    ...data,
    aiDescriptionGenerations: 1,
    aiDescriptionLastAt: new Date().toISOString(),
    aiGeneratedTitle: safeTitle,
    aiGeneratedMetaTitle: safeMetaTitle,
    aiGeneratedMetaDescription: safeMetaDescription,
    aiGeneratedDescription: safeDescription,
  };

  await prisma.propertyDraft.upsert({
    where: { userId },
    update: { data: nextData },
    create: { userId, data: nextData },
  });

  return successResponse(
    { title: safeTitle, description: safeDescription, metaTitle: safeMetaTitle, metaDescription: safeMetaDescription },
    "OK"
  );
}

export const POST = withErrorHandling(withRateLimit(handler, "ai"));
