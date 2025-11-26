import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";

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

    const { queueId, direction } = await req.json();

    if (!queueId || !direction || !["up", "down"].includes(direction)) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos" },
        { status: 400 }
      );
    }

    // Get current queue
    const currentQueue = await prisma.realtorQueue.findUnique({
      where: { id: queueId },
    });

    if (!currentQueue) {
      return NextResponse.json(
        { success: false, error: "Fila não encontrada" },
        { status: 404 }
      );
    }

    const currentPosition = currentQueue.position;
    const newPosition = direction === "up" ? currentPosition - 1 : currentPosition + 1;

    // Check if new position is valid
    const totalQueues = await prisma.realtorQueue.count();
    if (newPosition < 1 || newPosition > totalQueues) {
      return NextResponse.json(
        { success: false, error: "Posição inválida" },
        { status: 400 }
      );
    }

    // Find queue at target position
    const targetQueue = await prisma.realtorQueue.findFirst({
      where: { position: newPosition },
    });

    if (!targetQueue) {
      return NextResponse.json(
        { success: false, error: "Posição alvo não encontrada" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      // Temporarily set to -1 to avoid unique constraint violation
      prisma.realtorQueue.update({
        where: { id: currentQueue.id },
        data: { position: -1 },
      }),
      // Move target to current position
      prisma.realtorQueue.update({
        where: { id: targetQueue.id },
        data: { position: currentPosition },
      }),
      // Move current to new position
      prisma.realtorQueue.update({
        where: { id: currentQueue.id },
        data: { position: newPosition },
      }),
    ]);

    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.ADMIN_QUEUE_MOVE,
        message: "Admin moveu corretor na fila",
        actorId: (session as any).userId || (session as any).user?.id || null,
        actorEmail: (session as any).user?.email || null,
        actorRole: role,
        targetType: "REALTOR_QUEUE",
        targetId: currentQueue.id,
        metadata: {
          direction,
          oldPosition: currentPosition,
          newPosition,
          realtorId: currentQueue.realtorId,
          swappedWithQueueId: targetQueue.id,
          swappedWithRealtorId: targetQueue.realtorId,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Posição atualizada com sucesso",
    });
  } catch (error) {
    console.error("Error moving queue:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao mover fila" },
      { status: 500 }
    );
  }
}
