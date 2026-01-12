import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();

    if (!code) {
      return NextResponse.json({ error: "Informe o código de verificação." }, { status: 400 });
    }

    const salt = `recovery_email:${userId}`;
    const tokenHash = hashToken(code, salt);

    let token = await prisma.verificationToken.findFirst({
      where: {
        token: tokenHash,
        identifier: { startsWith: `recovery_email:${userId}:` },
      },
    });

    if (!token) {
      token = await prisma.verificationToken.findFirst({
        where: {
          token: code,
          identifier: { startsWith: `recovery_email:${userId}:` },
        },
      });
    }

    if (!token || token.expires < new Date()) {
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
    }

    const parts = String(token.identifier || "").split(":");
    const newEmail = String(parts[2] || "").toLowerCase().trim();

    if (!newEmail) {
      return NextResponse.json({ error: "Token inválido." }, { status: 400 });
    }

    const conflict = await prisma.user.findFirst({ where: { recoveryEmail: newEmail } as any, select: { id: true } });
    if (conflict && conflict.id !== userId) {
      return NextResponse.json({ error: "Este e-mail já está sendo usado como recuperação por outra conta." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        recoveryEmail: newEmail,
        recoveryEmailVerifiedAt: new Date(),
        authVersion: { increment: 1 },
      } as any,
      select: { id: true, email: true, recoveryEmail: true, recoveryEmailVerifiedAt: true },
    });

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: { startsWith: `recovery_email:${userId}:` },
      },
    });

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_RECOVERY_EMAIL_SET",
      actorId: updatedUser.id,
      actorEmail: updatedUser.email ?? null,
      targetType: "User",
      targetId: updatedUser.id,
      metadata: {
        recoveryEmail: updatedUser.recoveryEmail,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      recoveryEmail: updatedUser.recoveryEmail,
      recoveryEmailVerifiedAt: updatedUser.recoveryEmailVerifiedAt,
    });
  } catch (error) {
    console.error("/api/recovery-email/verify error", error);
    return NextResponse.json({ error: "Erro ao verificar código" }, { status: 500 });
  }
}, "authVerify");
