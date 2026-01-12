import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

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

    const recoveryRes = await requireRecoveryFactor(String((session as any).userId || (session as any).user?.id || ""));
    if (recoveryRes) return recoveryRes;

    const { queueId, status } = await req.json();

    if (!queueId || !status || !["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos" },
        { status: 400 }
      );
    }

    const existingQueue = await prisma.realtorQueue.findUnique({
      where: { id: queueId },
      select: {
        status: true,
        realtorId: true,
      },
    });

    if (!existingQueue) {
      return NextResponse.json(
        { success: false, error: "Fila não encontrada" },
        { status: 404 },
      );
    }

    await prisma.realtorQueue.update({
      where: { id: queueId },
      data: { status },
    });

    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.ADMIN_QUEUE_STATUS_CHANGE,
        message: "Admin atualizou status da fila do corretor",
        actorId: (session as any).userId || (session as any).user?.id || null,
        actorEmail: (session as any).user?.email || null,
        actorRole: role,
        targetType: "REALTOR_QUEUE",
        targetId: queueId,
        metadata: {
          fromStatus: existingQueue.status,
          toStatus: status,
          realtorId: existingQueue.realtorId,
        },
      });
    } catch {}

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
