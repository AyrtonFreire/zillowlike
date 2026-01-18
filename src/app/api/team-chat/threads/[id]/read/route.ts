import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
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
      select: { id: true, ownerId: true, realtorId: true },
    });

    if (!thread) {
      return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 });
    }

    if (!canAccessThread({ userId, role, thread })) {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const now = new Date();

    try {
      const receipt = await (prisma as any).teamChatReadReceipt.upsert({
        where: { threadId_userId: { threadId: String(thread.id), userId: String(userId) } },
        create: { threadId: String(thread.id), userId: String(userId), lastReadAt: now },
        update: { lastReadAt: now },
      });

      return NextResponse.json({
        success: true,
        receipt: { threadId: String(receipt.threadId), lastReadAt: new Date(receipt.lastReadAt).toISOString() },
      });
    } catch (error: any) {
      if (error?.code === "P2021") {
        return NextResponse.json({ success: true, skipped: true });
      }
      console.error("Error marking team chat as read:", error);
      return NextResponse.json({ success: false, error: "Não foi possível marcar como lido." }, { status: 500 });
    }
  } catch (error) {
    console.error("Error marking team chat as read:", error);
    return NextResponse.json({ success: false, error: "Não foi possível marcar como lido." }, { status: 500 });
  }
}
