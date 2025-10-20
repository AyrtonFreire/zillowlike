import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const role = (session as any).user.role;
    if (role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    const { queueId, status } = await req.json();

    if (!queueId || !status || !["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos" },
        { status: 400 }
      );
    }

    // Update queue status
    await prisma.realtorQueue.update({
      where: { id: queueId },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      message: "Status atualizado com sucesso",
    });
  } catch (error) {
    console.error("Error updating queue status:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar status" },
      { status: 500 }
    );
  }
}
