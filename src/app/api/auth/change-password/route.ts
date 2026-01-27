import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limiter";
import { createAuditLog } from "@/lib/audit-log";

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId =
      (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Senha atual e nova senha são obrigatórias." },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: String(userId) },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Senha atual inválida." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await (prisma as any).user.update({
      where: { id: String(userId) },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        authVersion: { increment: 1 },
      },
    });

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_PASSWORD_CHANGED",
      actorId: String(userId),
      actorEmail: user.email ?? null,
      targetType: "User",
      targetId: String(userId),
      metadata: {
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/auth/change-password error", error);
    return NextResponse.json({ error: "Erro ao trocar senha" }, { status: 500 });
  }
}, "authVerify");
