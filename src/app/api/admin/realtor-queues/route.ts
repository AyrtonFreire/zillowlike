import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    // Fetch all realtor queues
    const queues = await prisma.realtorQueue.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
      orderBy: {
        priority: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      queues,
    });
  } catch (error) {
    console.error("Error fetching realtor queues:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar filas" },
      { status: 500 }
    );
  }
}
