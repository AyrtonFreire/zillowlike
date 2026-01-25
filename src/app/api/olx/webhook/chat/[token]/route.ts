import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;

    const account: any = await (prisma as any).olxAccount.findUnique({
      where: { webhookToken: String(token) },
      select: { id: true, webhookToken: true },
    });

    if (!account?.id) {
      return NextResponse.json({ ok: true }, { status: 404 });
    }

    const tokenHeader = (req.headers.get("x-olx-token") || "").trim();
    const authHeader = (req.headers.get("authorization") || "").trim();
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const expected = String(account.webhookToken || "").trim();
    const provided = tokenHeader || bearer;
    if (expected && provided !== expected) {
      return NextResponse.json({ ok: true }, { status: 401 });
    }

    const body: any = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const chatId = body.chatId != null ? String(body.chatId) : "";
    const messageId = body.messageId != null ? String(body.messageId) : "";
    const listId = body.listId != null ? String(body.listId) : null;

    if (!chatId || !messageId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    void (async () => {
      const messageTimestamp = body.messageTimestamp ? new Date(String(body.messageTimestamp)) : null;
      const mt = messageTimestamp && !Number.isNaN(messageTimestamp.getTime()) ? messageTimestamp : null;

      const thread = await (prisma as any).olxChatThread.upsert({
        where: { accountId_chatId: { accountId: String(account.id), chatId } },
        create: {
          accountId: String(account.id),
          chatId,
          listId,
          lastMessageAt: mt,
          lastMessagePreview: body.message != null ? String(body.message).slice(0, 500) : null,
        },
        update: {
          listId: listId || undefined,
          lastMessageAt: mt || undefined,
          lastMessagePreview: body.message != null ? String(body.message).slice(0, 500) : undefined,
        },
        select: { id: true },
      });

      try {
        await (prisma as any).olxChatMessage.create({
          data: {
            threadId: String(thread.id),
            messageId,
            senderType: body.senderType != null ? String(body.senderType) : null,
            origin: body.origin != null ? String(body.origin) : null,
            email: body.email != null ? String(body.email) : null,
            name: body.name != null ? String(body.name) : null,
            phone: body.phone != null ? String(body.phone) : null,
            message: body.message != null ? String(body.message) : null,
            messageTimestamp: mt,
            raw: body,
          },
        });
      } catch {
      }
    })();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
