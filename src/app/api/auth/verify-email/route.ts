import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "Token ausente." }, { status: 400 });
    }

    const tokenHash = hashToken(String(token));

    let record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
    if (!record) {
      record = await prisma.verificationToken.findUnique({ where: { token: String(token) } });
    }

    if (!record || record.expires < new Date()) {
      return NextResponse.json({ success: false, error: "Token inválido ou expirado." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
      select: { id: true, email: true },
    });

    await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_EMAIL_VERIFIED",
      actorId: updatedUser.id,
      actorEmail: updatedUser.email ?? record.identifier,
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
    console.error("Verify email error", error);
    return NextResponse.json({ success: false, error: "Erro ao verificar e-mail." }, { status: 500 });
  }
}, "authVerify");
