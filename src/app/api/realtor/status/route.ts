import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const userId = (session as any).userId || (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        realtorApplication: {
          select: {
            status: true,
          },
        },
        queue: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const applicationStatus = user.realtorApplication?.status || null;
    const hasQueueEntry = Boolean(user.queue);
    const queueStatus = user.queue?.status || null;

    return NextResponse.json({
      success: true,
      partner: {
        role: user.role,
        applicationStatus,
        hasQueueEntry,
        queueStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching realtor status:", error);
    return NextResponse.json(
      { error: "Erro ao buscar status de corretor" },
      { status: 500 }
    );
  }
}
