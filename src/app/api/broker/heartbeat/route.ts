import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const now = new Date();

    const existing = await (prisma as any).user.findUnique({
      where: { id: String(userId) },
      select: { lastSeenAt: true },
    });

    const lastSeenAt = existing?.lastSeenAt ? new Date(existing.lastSeenAt) : null;
    if (lastSeenAt && now.getTime() - lastSeenAt.getTime() < 5 * 60_000) {
      return NextResponse.json({ success: true, ts: now.toISOString() });
    }

    await (prisma as any).user.update({
      where: { id: String(userId) },
      data: { lastSeenAt: now },
      select: { id: true },
    });

    return NextResponse.json({ success: true, ts: now.toISOString() });
  } catch {
    return NextResponse.json({ success: true });
  }
}
