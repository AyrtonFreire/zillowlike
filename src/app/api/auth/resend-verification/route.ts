import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail, getAuthResendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: "E-mail é obrigatório." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user && !user.emailVerified) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

      await prisma.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token,
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
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend verification error", error);
    return NextResponse.json({ success: false, error: "Erro ao reenviar confirmação." }, { status: 500 });
  }
}
