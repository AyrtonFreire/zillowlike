import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) return { userId: null as string | null, role: null as string | null };
  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;
  return { userId: userId ? String(userId) : null, role: role ? String(role) : null, session };
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

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
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
      include: {
        team: { select: { id: true, name: true, ownerId: true } },
        owner: { select: { id: true, name: true, email: true, image: true } },
        realtor: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!thread) {
      return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 });
    }

    if (!canAccessThread({ userId, role, thread })) {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const [messages, receipt] = await Promise.all([
      (prisma as any).teamChatMessage.findMany({
        where: { threadId: String(thread.id) },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true, role: true, image: true } } },
      }),
      (prisma as any).teamChatReadReceipt.findUnique({
        where: { threadId_userId: { threadId: String(thread.id), userId: String(userId) } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      thread: {
        id: String(thread.id),
        teamId: String(thread.teamId),
        team: thread.team ? { id: String(thread.team.id), name: String(thread.team.name || "Time") } : null,
        owner: thread.owner
          ? {
              id: String(thread.owner.id),
              name: thread.owner.name || null,
              email: thread.owner.email || null,
              image: thread.owner.image || null,
            }
          : null,
        realtor: thread.realtor
          ? {
              id: String(thread.realtor.id),
              name: thread.realtor.name || null,
              email: thread.realtor.email || null,
              image: thread.realtor.image || null,
            }
          : null,
        lastReadAt: receipt?.lastReadAt ? new Date(receipt.lastReadAt).toISOString() : null,
      },
      messages: (messages as any[]).map((message) => ({
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
      })),
    });
  } catch (error) {
    console.error("Error loading team chat thread:", error);
    return NextResponse.json({ success: false, error: "Não foi possível carregar esta conversa." }, { status: 500 });
  }
}
