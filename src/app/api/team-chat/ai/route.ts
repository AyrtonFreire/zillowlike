import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BodySchema = z.object({
  threadId: z.string().trim().min(1),
  prompt: z.string().trim().max(2000).optional().nullable(),
});

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

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
        temperature: 0.4,
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
      return { ok: false as const, status: res.status, body: txt.slice(0, 2000) };
    }

    const json = (await res.json().catch(() => null)) as OpenAIChatResponse | null;
    const content = json?.choices?.[0]?.message?.content?.trim() || "";
    if (!content) return { ok: false as const, status: 0, body: "empty" };
    return { ok: true as const, content };
  } catch {
    return { ok: false as const, status: 0, body: "timeout_or_network" };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) return { userId: null as string | null, role: null as string | null };
  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;
  return { userId: userId ? String(userId) : null, role: role ? String(role) : null };
}

function canAccessThread(params: {
  userId: string;
  role: string | null;
  thread: { ownerId: string; realtorId: string };
}) {
  const { userId, role, thread } = params;
  if (role === "ADMIN") return true;
  if (role === "AGENCY") return String(thread.ownerId) === String(userId);
  if (role === "REALTOR") return String(thread.realtorId) === String(userId);
  return false;
}

function safeString(value: any) {
  return String(value ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "AI is not configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const threadId = String(parsed.data.threadId);
    const hint = parsed.data.prompt ? safeString(parsed.data.prompt) : "";

    const thread: any = await (prisma as any).teamChatThread.findUnique({
      where: { id: threadId },
      include: {
        owner: { select: { id: true, name: true } },
        realtor: { select: { id: true, name: true } },
      },
    });

    if (!thread) {
      return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 });
    }

    if (!canAccessThread({ userId, role, thread })) {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const history = await (prisma as any).teamChatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    const ordered = [...history].reverse();
    const lines = ordered.map((msg: any) => {
      const senderLabel = String(msg.senderRole || "").toLowerCase() === "agency" ? "Agência" : "Corretor";
      return `${senderLabel}: ${safeString(msg.content)}`;
    });

    const systemPrompt =
      "Você é um assistente de comunicação entre dono de imobiliária e corretor (pt-BR). " +
      "Sugira uma mensagem curta, objetiva e profissional. " +
      "Sem emojis, sem markdown, sem anexos. " +
      "Use apenas texto e links quando necessário.";

    const roleLabel = role === "AGENCY" ? "dono da imobiliária" : role === "REALTOR" ? "corretor" : "admin";
    const userPrompt = [
      `Você está escrevendo como ${roleLabel}.`,
      thread.owner?.name ? `Dono: ${thread.owner.name}` : null,
      thread.realtor?.name ? `Corretor: ${thread.realtor.name}` : null,
      lines.length ? "\nHistórico recente:" : null,
      lines.join("\n"),
      hint ? `\nPedido do usuário: ${hint}` : null,
      "\nSugira uma resposta curta com até 3 frases.",
    ]
      .filter(Boolean)
      .join("\n");

    const aiRes = await callOpenAiText({ apiKey, systemPrompt, userPrompt });
    if (!aiRes.ok) {
      return NextResponse.json({ success: false, error: "Não foi possível gerar a sugestão." }, { status: 500 });
    }

    return NextResponse.json({ success: true, suggestion: aiRes.content });
  } catch (error) {
    console.error("Error generating team chat suggestion:", error);
    return NextResponse.json({ success: false, error: "Não foi possível gerar a sugestão." }, { status: 500 });
  }
}
