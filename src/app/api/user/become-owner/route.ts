import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const currentRole = (session.user as any).role || "USER";

    // Only allow USER role to become OWNER
    if (currentRole !== "USER") {
      return NextResponse.json(
        { error: "Apenas usuários podem se tornar proprietários" },
        { status: 400 }
      );
    }

    // Update user role to OWNER
    await prisma.user.update({
      where: { id: userId },
      data: { role: "OWNER" },
    });

    return NextResponse.json({
      success: true,
      message: "Você agora é um proprietário!",
      newRole: "OWNER",
    });
  } catch (error) {
    console.error("Error updating user to owner:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar perfil" },
      { status: 500 }
    );
  }
}
