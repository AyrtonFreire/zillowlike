import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

function generateCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId =
      (session as any)?.user?.id ||
      (session as any)?.userId ||
      (session as any)?.user?.sub;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { phone: true, phoneNormalized: true, phoneVerifiedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.phone || !user.phone.trim()) {
      return NextResponse.json(
        { error: "Preencha e salve seu telefone em Meu Perfil antes de solicitar o código." },
        { status: 400 }
      );
    }

    if (user.phoneVerifiedAt) {
      return NextResponse.json(
        { error: "Seu telefone já está verificado." },
        { status: 400 }
      );
    }

    const normalized = String((user as any).phoneNormalized || "").trim();
    const phoneDigits = String(user.phone).replace(/\D/g, "");
    const identifier = `phone:${userId}:${normalized || phoneDigits}`;

    // Remove códigos antigos para este usuário
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: { startsWith: `phone:${userId}:` },
      },
    });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    const tokenHash = hashToken(code, identifier);

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: tokenHash,
        expires,
      },
    });

    const body = `Seu código de verificação do OggaHub é ${code}. Ele expira em 10 minutos.`;

    try {
      await sendSms(user.phone, body);
    } catch (error) {
      console.error("Brevo SMS error:", error);

      await prisma.verificationToken.deleteMany({
        where: {
          identifier: { startsWith: `phone:${userId}:` },
        },
      });

      return NextResponse.json(
        { error: "Falha ao enviar SMS. Tente novamente em instantes." },
        { status: 500 }
      );
    }

    await createAuditLog({
      level: "INFO",
      action: "AUTH_PHONE_VERIFICATION_CODE_SENT",
      actorId: userId,
      targetType: "User",
      targetId: userId,
      metadata: {
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0] ||
          req.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/phone/send-code error", error);
    return NextResponse.json(
      { error: "Erro ao enviar código de verificação" },
      { status: 500 }
    );
  }
}, "auth");
