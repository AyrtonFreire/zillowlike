import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";
import {
  RECENT_REAUTH_COOKIE_NAME,
  RECENT_REAUTH_TTL_SECONDS,
  buildReauthCodeIdentifier,
  createRecentReauthCookieValue,
  getRecentReauthCookieOptions,
} from "@/lib/account-security";

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
    const method = String(body?.method || "").trim();

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (method === "password") {
      const password = String(body?.password || "");
      if (!user.passwordHash) {
        return NextResponse.json({ error: "Sua conta não possui senha local configurada." }, { status: 400 });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
      }
    } else if (method === "email_code") {
      const code = String(body?.code || "").trim();
      if (!code) {
        return NextResponse.json({ error: "Informe o código recebido por e-mail." }, { status: 400 });
      }
      const identifier = buildReauthCodeIdentifier(String(userId), String(sessionKey));
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
      await prisma.verificationToken.deleteMany({ where: { identifier } });
    } else {
      return NextResponse.json({ error: "Método de confirmação inválido." }, { status: 400 });
    }

    const expiresAtMs = Date.now() + RECENT_REAUTH_TTL_SECONDS * 1000;
    const response = NextResponse.json({
      success: true,
      expiresAt: new Date(expiresAtMs).toISOString(),
    });
    response.cookies.set(
      RECENT_REAUTH_COOKIE_NAME,
      createRecentReauthCookieValue(String(userId), String(sessionKey), expiresAtMs),
      getRecentReauthCookieOptions(RECENT_REAUTH_TTL_SECONDS)
    );

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_REAUTH_CONFIRMED",
      actorId: String(userId),
      actorEmail: user.email ?? null,
      targetType: "User",
      targetId: String(userId),
      metadata: {
        method,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      },
    });

    return response;
  } catch (error) {
    console.error("/api/auth/reauth/verify error", error);
    return NextResponse.json({ error: "Erro ao confirmar sua identidade" }, { status: 500 });
  }
}, "authVerify");
