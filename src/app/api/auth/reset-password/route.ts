import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ success: false, error: "Token e nova senha são obrigatórios." }, { status: 400 });
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date() || !record.identifier.startsWith("reset:")) {
      return NextResponse.json({ success: false, error: "Token inválido ou expirado." }, { status: 400 });
    }

    const email = record.identifier.replace(/^reset:/, "");

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error", error);
    return NextResponse.json({ success: false, error: "Erro ao redefinir senha." }, { status: 500 });
  }
}
