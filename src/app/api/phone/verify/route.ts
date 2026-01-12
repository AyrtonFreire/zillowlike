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

    const userId =
      (session as any)?.user?.id ||
      (session as any)?.userId ||
      (session as any)?.user?.sub;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = (body?.code || "").trim();

    if (!code) {
      return NextResponse.json(
        { error: "Informe o código de verificação." },
        { status: 400 }
      );
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { phone: true, phoneNormalized: true },
    });

    if (!user || !user.phone || !user.phone.trim()) {
      return NextResponse.json(
        { error: "Salve um telefone válido em Meu Perfil antes de verificar." },
        { status: 400 }
      );
    }

    const normalized = String((user as any).phoneNormalized || "").trim();
    const phoneDigits = String(user.phone).replace(/\D/g, "");
    const identifier = `phone:${userId}:${normalized || phoneDigits}`;

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
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { phoneVerifiedAt: new Date(), authVersion: { increment: 1 } } as any,
    });

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: { startsWith: `phone:${userId}:` },
      },
    });

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_PHONE_VERIFIED",
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
    console.error("/api/phone/verify error", error);
    return NextResponse.json(
      { error: "Erro ao verificar código" },
      { status: 500 }
    );
  }
}, "authVerify");
