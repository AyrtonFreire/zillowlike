import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail, getAuthForgotPasswordEmail } from "@/lib/email";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: "E-mail é obrigatório." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });

    if (user) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h

      await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${normalizedEmail}` } });
      await prisma.verificationToken.create({
        data: {
          identifier: `reset:${normalizedEmail}`,
          token: tokenHash,
          expires,
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      const emailData = getAuthForgotPasswordEmail({ resetUrl });

      await sendEmail({
        to: normalizedEmail,
        subject: emailData.subject,
        html: emailData.html,
      });

      await createAuditLog({
        level: "INFO",
        action: "AUTH_FORGOT_PASSWORD_REQUESTED",
        actorId: user.id,
        actorEmail: normalizedEmail,
        targetType: "User",
        targetId: user.id,
        metadata: {
          ip:
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error", error);
    return NextResponse.json({ success: false, error: "Erro ao processar solicitação." }, { status: 500 });
  }
}, "auth");
