import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").toLowerCase().trim();
    const code = String(body?.code || "")
      .trim()
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "");
    const password = String(body?.password || "");

    if (!email || !code) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }

    const user = await (prisma as any).user.findFirst({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const codeHash = hashToken(code, `backup:${user.id}`);

    const recoveryCode = await (prisma as any).backupRecoveryCode.findFirst({
      where: {
        userId: user.id,
        codeHash,
        usedAt: null,
      },
      select: { id: true },
    });

    if (!recoveryCode) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || null;

    await prisma.$transaction([
      (prisma as any).backupRecoveryCode.update({
        where: { id: recoveryCode.id },
        data: { usedAt: new Date(), usedByIp: ip, usedByUserAgent: userAgent },
      }),
      (prisma as any).user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
        },
      }),
    ]);

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_RECOVERY_BACKUP_CODE_PASSWORD_RESET",
      actorId: null,
      actorEmail: null,
      targetType: "User",
      targetId: user.id,
      metadata: { ip, userAgent },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/recovery/backup-code/reset-password error", error);
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 });
  }
}, "authVerify");
