import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const updatePartnerSchema = z.object({
  isPartner: z.boolean(),
});

export async function PATCH(
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
    const body = await request.json();
    const { isPartner } = updatePartnerSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        queue: {
          select: {
            realtorId: true,
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

    if (isPartner) {
      await prisma.$transaction(async (tx) => {
        // Garante que o usuário seja corretor
        await tx.user.update({
          where: { id: userId },
          data: { role: "REALTOR" },
        });

        // Verifica se já existe fila para esse corretor
        const existingQueue = await tx.realtorQueue.findUnique({
          where: { realtorId: userId },
        });

        if (!existingQueue) {
          // Pega a última posição da fila
          const lastPosition = await tx.realtorQueue.findFirst({
            orderBy: { position: "desc" },
            select: { position: true },
          });

          const newPosition = (lastPosition?.position || 0) + 1;

          // Cria entrada na fila
          await tx.realtorQueue.create({
            data: {
              realtorId: userId,
              position: newPosition,
              status: "ACTIVE",
              score: 0,
            },
          });

          // Cria estatísticas básicas para o corretor
          await tx.realtorStats.create({
            data: {
              realtorId: userId,
            },
          });
        } else if (existingQueue.status !== "ACTIVE") {
          await tx.realtorQueue.update({
            where: { realtorId: userId },
            data: { status: "ACTIVE" },
          });
        }
      });
    } else {
      // Desativa da fila de corretores parceiros, se existir
      await prisma.realtorQueue.updateMany({
        where: { realtorId: userId },
        data: { status: "INACTIVE" },
      });
    }

    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.ADMIN_REALTOR_PARTNER_UPDATE,
        message: "Admin alterou status de parceiro de corretor",
        actorId: (session as any).userId || (session as any).user?.id || null,
        actorEmail: (session as any).user?.email || null,
        actorRole: role,
        targetType: "USER",
        targetId: userId,
        metadata: {
          isPartner,
          previousRole: user.role,
          previousQueueStatus: user.queue?.status ?? null,
          newRole: isPartner ? "REALTOR" : user.role,
          newQueueStatus: isPartner ? "ACTIVE" : "INACTIVE",
        },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating realtor partner status:", error);
    return NextResponse.json(
      { error: "Failed to update realtor partner status" },
      { status: 500 }
    );
  }
}
