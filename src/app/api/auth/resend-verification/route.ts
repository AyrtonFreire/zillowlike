import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail, getAuthResendVerificationEmail } from "@/lib/email";
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
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, emailVerified: true } });

    if (user && !user.emailVerified) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

      await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
      await prisma.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token: tokenHash,
          expires,
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
      const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;

      const emailData = getAuthResendVerificationEmail({ verifyUrl });

      await sendEmail({
        to: normalizedEmail,
        subject: emailData.subject,
        html: emailData.html,
      });

      await createAuditLog({
        level: "INFO",
        action: "AUTH_VERIFY_EMAIL_RESENT",
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
    console.error("Email verification resend error", error);
    return NextResponse.json({ success: false, error: "Erro ao reenviar confirmação." }, { status: 500 });
  }
}, "auth");
