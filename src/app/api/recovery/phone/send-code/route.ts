import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limiter";
import { normalizePhoneE164, sendSms } from "@/lib/sms";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

function generateCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = String(body?.phone || "").trim();

    if (!phoneRaw) {
      return NextResponse.json({ error: "Informe um telefone válido." }, { status: 400 });
    }

    let normalized: string;
    try {
      normalized = normalizePhoneE164(phoneRaw);
    } catch {
      return NextResponse.json({ error: "Informe um telefone válido." }, { status: 400 });
    }

    const user = await (prisma as any).user.findFirst({
      where: {
        phoneNormalized: normalized,
        phoneVerifiedAt: { not: null },
      },
      select: { id: true, phone: true, email: true },
    });

    // Anti-enumeration: always return success
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const identifier = `recovery_phone:${normalized}`;

    await prisma.verificationToken.deleteMany({ where: { identifier } });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    const tokenHash = hashToken(code, identifier);

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: tokenHash,
        expires,
      },
    });

    const smsBody = `Seu código de recuperação do OggaHub é ${code}. Ele expira em 10 minutos.`;

    try {
      await sendSms(normalized, smsBody);
    } catch (error) {
      console.error("Recovery SMS send error:", error);
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      // Anti-enumeration: return success even on failure
      return NextResponse.json({ success: true });
    }

    await createAuditLog({
      level: "INFO",
      action: "AUTH_RECOVERY_PHONE_CODE_SENT",
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
    console.error("/api/recovery/phone/send-code error", error);
    return NextResponse.json({ error: "Erro ao enviar código" }, { status: 500 });
  }
}, "auth");
