import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";

export const runtime = "nodejs";

const MessageSchema = z.object({
  content: z.string().trim().min(1, "Escreva uma mensagem antes de enviar.").max(2000, "A mensagem está muito longa."),
});

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

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const thread: any = await (prisma as any).teamChatThread.findUnique({
      where: { id: String(id) },
      include: { team: { select: { id: true, name: true } } },
    });

    if (!thread) {
      return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 });
    }

    if (!canAccessThread({ userId, role, thread })) {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = MessageSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const content = parsed.data.content.trim();

    const [message] = await (prisma as any).$transaction([
      (prisma as any).teamChatMessage.create({
        data: {
          threadId: String(thread.id),
          senderId: String(userId),
          senderRole: (role as any) || "USER",
          content,
        },
        include: {
          sender: { select: { id: true, name: true, role: true, image: true } },
        },
      }),
      (prisma as any).teamChatThread.update({
        where: { id: String(thread.id) },
        data: { updatedAt: new Date() },
      }),
    ]);

    await createAuditLog({
      level: "INFO",
      action: "TEAM_CHAT_MESSAGE_SENT",
      actorId: String(userId),
      actorRole: role || null,
      targetType: "teamChatThread",
      targetId: String(thread.id),
      metadata: {
        teamId: String(thread.teamId),
        contentPreview: content.slice(0, 200),
      },
    });

    try {
      const pusher = getPusherServer();
      await pusher.trigger(PUSHER_CHANNELS.TEAM_CHAT(String(thread.id)), PUSHER_EVENTS.TEAM_CHAT_MESSAGE, {
        threadId: String(thread.id),
        message: {
          id: String(message.id),
          threadId: String(message.threadId),
          content: String(message.content || ""),
          senderId: String(message.senderId),
          senderRole: String(message.senderRole || ""),
          sender: message.sender
            ? {
                id: String(message.sender.id),
                name: message.sender.name || null,
                role: message.sender.role || null,
                image: message.sender.image || null,
              }
            : null,
          createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : null,
        },
      });
    } catch (pusherError) {
      console.error("Error triggering team chat pusher:", pusherError);
    }

    return NextResponse.json({ success: true, message: {
      id: String(message.id),
      threadId: String(message.threadId),
      content: String(message.content || ""),
      senderId: String(message.senderId),
      senderRole: String(message.senderRole || ""),
      sender: message.sender
        ? {
            id: String(message.sender.id),
            name: message.sender.name || null,
            role: message.sender.role || null,
            image: message.sender.image || null,
          }
        : null,
      createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : null,
    } });
  } catch (error) {
    console.error("Error sending team chat message:", error);
    return NextResponse.json({ success: false, error: "Não foi possível enviar a mensagem." }, { status: 500 });
  }
}
