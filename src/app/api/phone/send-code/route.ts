import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

function generateCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export async function POST(req: NextRequest) {
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, phoneVerifiedAt: true },
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

    const phoneDigits = String(user.phone).replace(/\D/g, "");
    const identifier = `phone:${userId}:${phoneDigits}`;

    // Remove códigos antigos para este usuário
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: { startsWith: `phone:${userId}:` },
      },
    });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: code,
        expires,
      },
    });

    const body = `Seu código de verificação do OggaHub é ${code}. Ele expira em 10 minutos.`;

    try {
      await sendSms(user.phone, body);
    } catch (error) {
      console.error("Twilio SMS error:", error);
      return NextResponse.json(
        { error: "Falha ao enviar SMS. Tente novamente em instantes." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/phone/send-code error", error);
    return NextResponse.json(
      { error: "Erro ao enviar código de verificação" },
      { status: 500 }
    );
  }
}
