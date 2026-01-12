import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limiter";
import { normalizePhoneE164 } from "@/lib/sms";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body?.phone || "").trim();
    const code = String(body?.code || "").trim();
    const password = String(body?.password || "");

    if (!phoneRaw || !code) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }

    let normalized: string;
    try {
      normalized = normalizePhoneE164(phoneRaw);
    } catch {
      return NextResponse.json({ error: "Informe um telefone válido." }, { status: 400 });
    }
    const identifier = `recovery_phone:${normalized}`;

    const tokenHash = hashToken(code, identifier);

    let token = await prisma.verificationToken.findFirst({
      where: {
        identifier,
        token: tokenHash,
      },
    });

    if (!token) {
      token = await prisma.verificationToken.findFirst({
        where: {
          identifier,
          token: code,
        },
      });
    }

    if (!token || token.expires < new Date()) {
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
    }

    const user = await (prisma as any).user.findFirst({
      where: {
        phoneNormalized: normalized,
        phoneVerifiedAt: { not: null },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        authVersion: { increment: 1 },
      },
    });

    await prisma.verificationToken.deleteMany({ where: { identifier } });

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_RECOVERY_PHONE_PASSWORD_RESET",
      actorId: null,
      actorEmail: null,
      targetType: "User",
      targetId: user.id,
      metadata: {
        phoneNormalized: normalized,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/recovery/phone/reset-password error", error);
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 });
  }
}, "authVerify");
