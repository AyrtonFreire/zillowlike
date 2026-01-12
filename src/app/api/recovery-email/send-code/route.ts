import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, getRecoveryEmailCodeEmail } from "@/lib/email";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

function generateCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

async function createUniqueCodeToken(data: { identifier: string; expires: Date; userId: string }) {
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const tokenHash = hashToken(code, `recovery_email:${data.userId}`);

    try {
      await prisma.verificationToken.create({
        data: {
          identifier: data.identifier,
          token: tokenHash,
          expires: data.expires,
        },
      });
      return code;
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("constraint")) {
        continue;
      }
      throw err;
    }
  }

  throw new Error("Não foi possível gerar o código. Tente novamente.");
}

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const newEmail = String(body?.email || "").toLowerCase().trim();

    if (!newEmail) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conflict = await prisma.user.findFirst({ where: { recoveryEmail: newEmail } as any, select: { id: true } });
    if (conflict && conflict.id !== userId) {
      return NextResponse.json({ error: "Este e-mail já está sendo usado como recuperação por outra conta." }, { status: 400 });
    }

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: { startsWith: `recovery_email:${userId}:` },
      },
    });

    const identifier = `recovery_email:${userId}:${newEmail}`;
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    const code = await createUniqueCodeToken({ identifier, expires, userId });

    const emailData = getRecoveryEmailCodeEmail({ name: user.name, code });
    const ok = await sendEmail({ to: newEmail, subject: emailData.subject, html: emailData.html });

    if (!ok) {
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: { startsWith: `recovery_email:${userId}:` },
        },
      });

      return NextResponse.json({ error: "Falha ao enviar e-mail. Tente novamente em instantes." }, { status: 500 });
    }

    await createAuditLog({
      level: "INFO",
      action: "AUTH_RECOVERY_EMAIL_CODE_SENT",
      actorId: userId,
      actorEmail: user.email ?? null,
      targetType: "User",
      targetId: userId,
      metadata: {
        recoveryEmail: newEmail,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/recovery-email/send-code error", error);
    return NextResponse.json({ error: "Erro ao enviar código" }, { status: 500 });
  }
}, "auth");
