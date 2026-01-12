import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.user && !session?.userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = session.role || session.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String(session.userId || session.user?.id || ""));
    if (recoveryRes) return recoveryRes;

    const { id } = await context.params;
    const realtorId = id;

    const body = await req.json().catch(() => null);
    const rawScore = body?.newScore;
    const newScore = typeof rawScore === "number" ? rawScore : parseInt(String(rawScore), 10);

    if (Number.isNaN(newScore) || newScore < 0) {
      return NextResponse.json(
        { success: false, error: "Informe um score válido (número inteiro maior ou igual a zero)." },
        { status: 400 },
      );
    }

    const queue = await prisma.realtorQueue.findUnique({
      where: { realtorId },
    });

    if (!queue) {
      return NextResponse.json(
        { success: false, error: "Este corretor ainda não está na fila de corretores." },
        { status: 404 },
      );
    }

    const oldScore = queue.score;

    const updatedQueue = await prisma.realtorQueue.update({
      where: { realtorId },
      data: {
        score: newScore,
        lastActivity: new Date(),
      },
    });

    try {
      await prisma.scoreHistory.create({
        data: {
          queueId: queue.id,
          action: "ADMIN_MANUAL_SCORE_ADJUST",
          points: newScore - oldScore,
          description: `Ajuste manual de score de ${oldScore} para ${newScore} por admin`,
        },
      });
    } catch (historyError) {
      console.error("Error creating score history for admin manual adjustment:", historyError);
    }

    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.ADMIN_REALTOR_SCORE_ADJUST,
        message: "Admin ajustou manualmente o score do corretor",
        actorId: session.userId || session.user?.id || null,
        actorEmail: session.user?.email || null,
        actorRole: role,
        targetType: "REALTOR",
        targetId: realtorId,
        metadata: {
          queueId: queue.id,
          oldScore,
          newScore,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      queue: updatedQueue,
    });
  } catch (error) {
    console.error("Error updating realtor score from admin panel:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar score do corretor" },
      { status: 500 },
    );
  }
}
