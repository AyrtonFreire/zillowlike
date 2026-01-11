import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
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
    const code = String(body?.code || "").trim();

    if (!code) {
      return NextResponse.json({ error: "Informe o código de verificação." }, { status: 400 });
    }

    const token = await prisma.verificationToken.findFirst({
      where: {
        token: code,
        identifier: { startsWith: `email_change:${userId}:` },
      },
    });

    if (!token || token.expires < new Date()) {
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
    }

    const parts = String(token.identifier || "").split(":");
    const newEmail = String(parts[2] || "").toLowerCase().trim();

    if (!newEmail) {
      return NextResponse.json({ error: "Token inválido." }, { status: 400 });
    }

    const conflict = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (conflict && conflict.id !== userId) {
      return NextResponse.json({ error: "Já existe uma conta com este e-mail." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        emailVerified: new Date(),
      },
    });

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: { startsWith: `email_change:${userId}:` },
      },
    });

    return NextResponse.json({ success: true, email: newEmail });
  } catch (error) {
    console.error("/api/email/verify error", error);
    return NextResponse.json({ error: "Erro ao verificar código" }, { status: 500 });
  }
}
