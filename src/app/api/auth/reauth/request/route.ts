import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, getAccountReauthCodeEmail } from "@/lib/email";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";
import { buildReauthCodeIdentifier } from "@/lib/account-security";

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
    const sessionKey = (session as any)?.sessionKey || (session as any)?.user?.sessionKey;
    if (!userId || !sessionKey) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const actionLabel = String(body?.actionLabel || "continuar uma ação sensível na sua conta").trim();

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user || !user.email || !user.emailVerified) {
      return NextResponse.json({ error: "Sua conta precisa de um e-mail principal verificado para usar este método." }, { status: 400 });
    }

    const identifier = buildReauthCodeIdentifier(String(userId), String(sessionKey));
    await prisma.verificationToken.deleteMany({ where: { identifier } });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.verificationToken.create({
      data: {
        identifier,
        token: hashToken(code, identifier),
        expires,
      },
    });

    const emailData = getAccountReauthCodeEmail({
      name: user.name,
      code,
      actionLabel,
    });
    const sent = await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
    });

    if (!sent) {
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      return NextResponse.json({ error: "Falha ao enviar código. Tente novamente em instantes." }, { status: 500 });
    }

    await createAuditLog({
      level: "INFO",
      action: "AUTH_REAUTH_CODE_SENT",
      actorId: String(userId),
      actorEmail: user.email,
      targetType: "User",
      targetId: String(userId),
      metadata: {
        actionLabel,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({ success: true, expiresAt: expires.toISOString() });
  } catch (error) {
    console.error("/api/auth/reauth/request error", error);
    return NextResponse.json({ error: "Erro ao enviar código de confirmação" }, { status: 500 });
  }
}, "auth");
