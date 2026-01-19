import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const QuerySchema = z.object({
  before: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

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

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      before: url.searchParams.get("before") || undefined,
      limit: url.searchParams.get("limit") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos" }, { status: 400 });
    }

    const limit = parsed.data.limit ?? 40;
    const before = parsed.data.before ? new Date(parsed.data.before) : null;
    const where: any = { threadId: String(thread.id) };
    if (before && !Number.isNaN(before.getTime())) {
      where.createdAt = { lt: before };
    }

    const [messagesDesc, receipt] = await Promise.all([
      (prisma as any).teamChatMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        include: { sender: { select: { id: true, name: true, role: true, image: true } } },
      }),
      (prisma as any).teamChatReadReceipt.findUnique({
        where: { threadId_userId: { threadId: String(thread.id), userId: String(userId) } },
      }),
    ]);

    const counterpartId =
      String(userId) === String(thread.ownerId)
        ? String(thread.realtorId)
        : String(userId) === String(thread.realtorId)
          ? String(thread.ownerId)
          : null;

    const counterpartReceipt = counterpartId
      ? await (prisma as any).teamChatReadReceipt.findUnique({
          where: { threadId_userId: { threadId: String(thread.id), userId: String(counterpartId) } },
        })
      : null;

    const hasMore = messagesDesc.length > limit;
    const sliced = hasMore ? messagesDesc.slice(0, limit) : messagesDesc;
    const nextCursor = hasMore ? sliced[sliced.length - 1]?.createdAt : null;
    const messages = [...sliced].reverse();

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
        lastDeliveredAt: receipt?.lastDeliveredAt ? new Date(receipt.lastDeliveredAt).toISOString() : null,
        lastReadAt: receipt?.lastReadAt ? new Date(receipt.lastReadAt).toISOString() : null,
        counterpartReceipt: counterpartReceipt
          ? {
              userId: String(counterpartReceipt.userId),
              lastDeliveredAt: counterpartReceipt.lastDeliveredAt ? new Date(counterpartReceipt.lastDeliveredAt).toISOString() : null,
              lastReadAt: counterpartReceipt.lastReadAt ? new Date(counterpartReceipt.lastReadAt).toISOString() : null,
            }
          : null,
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
      pagination: {
        hasMore,
        nextCursor: nextCursor ? new Date(nextCursor).toISOString() : null,
      },
    });
  } catch (error) {
    console.error("Error loading team chat thread:", error);
    return NextResponse.json({ success: false, error: "Não foi possível carregar esta conversa." }, { status: 500 });
  }
}
