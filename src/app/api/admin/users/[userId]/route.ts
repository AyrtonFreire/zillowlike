import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role;

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Não é permitido excluir administradores." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Remover vínculo como revisor de aplicações de corretores
      await tx.realtorApplication.updateMany({
        where: { reviewedBy: userId },
        data: { reviewedBy: null },
      });

      // Desvincular leads deste usuário (como cliente)
      await tx.lead.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // Desvincular leads deste usuário (como corretor)
      await tx.lead.updateMany({
        where: { realtorId: userId },
        data: { realtorId: null },
      });

      // Manter imóveis, mas removendo vínculo de proprietário
      await tx.property.updateMany({
        where: { ownerId: userId },
        data: { ownerId: null },
      });

      // Limpar favoritos deste usuário
      await tx.favorite.deleteMany({ where: { userId } }).catch(() => {});

      // Deletar usuário (cascateia para accounts, sessions, etc. onde onDelete foi configurado)
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
