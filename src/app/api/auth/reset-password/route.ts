import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ success: false, error: "Token e nova senha são obrigatórios." }, { status: 400 });
    }

    const tokenHash = hashToken(String(token));

    let record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
    if (!record) {
      record = await prisma.verificationToken.findUnique({ where: { token: String(token) } });
    }

    if (!record || record.expires < new Date() || !record.identifier.startsWith("reset:")) {
      return NextResponse.json({ success: false, error: "Token inválido ou expirado." }, { status: 400 });
    }

    const email = record.identifier.replace(/^reset:/, "");

    const passwordHash = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { passwordHash, authVersion: { increment: 1 } } as any,
      select: { id: true },
    });

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: `reset:${email}`,
      },
    });

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_PASSWORD_RESET_COMPLETED",
      actorId: updatedUser.id,
      actorEmail: email,
      targetType: "User",
      targetId: updatedUser.id,
      metadata: {
        ip:
          request.headers.get("x-forwarded-for")?.split(",")[0] ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error", error);
    return NextResponse.json({ success: false, error: "Erro ao redefinir senha." }, { status: 500 });
  }
}, "authVerify");
