import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptAccountToken, fetchOlxJson, OLX_AUTOSERVICE_CHAT_SEND_URL } from "@/lib/olx-api";
import { randomBytes } from "crypto";

const Schema = z.object({
  chatId: z.string().min(1),
  textMessage: z.string().min(1).max(2000),
  messageId: z.string().min(1).max(200).optional(),
  teamId: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const session: any = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const userId = String(session.userId || session.user?.id || "");
  if (!userId) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const teamId = parsed.data.teamId ? String(parsed.data.teamId) : null;

  let account: any = null;
  if (teamId) {
    const team = await (prisma as any).team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true },
    });
    if (!team) return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });

    const isOwner = String(team.ownerId) === userId;
    const isMember = await (prisma as any).teamMember.findFirst({
      where: { teamId: String(team.id), userId },
      select: { id: true },
    });
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    account = await (prisma as any).olxAccount.findUnique({ where: { teamId: String(team.id) } });
  } else {
    account = await (prisma as any).olxAccount.findUnique({ where: { userId } });
  }

  if (!account?.id) {
    return NextResponse.json({ error: "OLX account not connected" }, { status: 400 });
  }

  const token = decryptAccountToken(String(account.accessTokenEnc));
  const messageId = parsed.data.messageId || randomBytes(12).toString("hex");

  const resp = await fetchOlxJson<any>(OLX_AUTOSERVICE_CHAT_SEND_URL, {
    method: "POST",
    token,
    body: {
      textMessage: parsed.data.textMessage,
      messageId,
      chatId: parsed.data.chatId,
    },
  });

  if (resp.status < 200 || resp.status >= 300) {
    return NextResponse.json({ error: "OLX chat/send failed", details: resp.data }, { status: 502 });
  }

  try {
    const thread = await (prisma as any).olxChatThread.upsert({
      where: { accountId_chatId: { accountId: String(account.id), chatId: parsed.data.chatId } },
      create: {
        accountId: String(account.id),
        chatId: parsed.data.chatId,
        lastMessageAt: new Date(),
        lastMessagePreview: String(parsed.data.textMessage).slice(0, 500),
      },
      update: {
        lastMessageAt: new Date(),
        lastMessagePreview: String(parsed.data.textMessage).slice(0, 500),
      },
      select: { id: true },
    });

    await (prisma as any).olxChatMessage.create({
      data: {
        threadId: String(thread.id),
        messageId,
        senderType: "OUTBOUND",
        origin: "API_SEND",
        message: parsed.data.textMessage,
        messageTimestamp: new Date(),
        raw: resp.data,
      },
    });
  } catch {
  }

  return NextResponse.json({ success: true, messageId, olx: resp.data });
}
