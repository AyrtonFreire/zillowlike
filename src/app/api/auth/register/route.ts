import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendEmail, getAuthVerifyEmailEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Já existe uma conta com este e-mail." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    console.log("[REGISTER] Criando usuário:", normalizedEmail);
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: normalizedEmail,
        passwordHash,
        role: "USER",
      },
    });
    console.log("[REGISTER] Usuário criado com ID:", user.id);

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: tokenHash,
        expires,
      },
    });
    console.log("[REGISTER] Token de verificação criado");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;
    console.log("[REGISTER] URL de verificação:", verifyUrl);
    console.log("[REGISTER] NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
    console.log("[REGISTER] NEXTAUTH_URL:", process.env.NEXTAUTH_URL);

    const emailData = getAuthVerifyEmailEmail({ name, verifyUrl });

    console.log("[REGISTER] Chamando sendEmail...");
    const emailSent = await sendEmail({
      to: normalizedEmail,
      subject: emailData.subject,
      html: emailData.html,
    });
    console.log("[REGISTER] Resultado do envio:", emailSent ? "✅ sucesso" : "❌ falha");

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_REGISTERED",
      actorId: user.id,
      actorEmail: normalizedEmail,
      targetType: "User",
      targetId: user.id,
      metadata: {
        emailVerificationSent: emailSent,
        ip:
          request.headers.get("x-forwarded-for")?.split(",")[0] ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register error", error);
    return NextResponse.json({ success: false, error: "Erro ao criar conta." }, { status: 500 });
  }
}, "auth");
