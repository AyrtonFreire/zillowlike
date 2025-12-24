import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { LeadStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

const ALLOWED_STATUSES: LeadStatus[] = [
  "PENDING",
  "MATCHING",
  "WAITING_REALTOR_ACCEPT",
  "WAITING_OWNER_APPROVAL",
  "CONFIRMED",
  "OWNER_REJECTED",
  "CANCELLED",
  "COMPLETED",
  "EXPIRED",
  "ACCEPTED",
  "REJECTED",
  "RESERVED",
  "AVAILABLE",
];

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.user && !session?.userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = session.role || session.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const status = (body?.status || null) as LeadStatus | null;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: "Status de lead inválido." }, { status: 400 });
    }

    const existing = await prisma.lead.findUnique({
      where: { id },
      select: {
        status: true,
        completedAt: true,
        cancelledAt: true,
        realtorId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
    }

    const data: any = { status };
    const now = new Date();

    if (status === "COMPLETED" && !existing.completedAt) {
      data.completedAt = now;
    }

    if ((status === "CANCELLED" || status === "OWNER_REJECTED") && !existing.cancelledAt) {
      data.cancelledAt = now;
    }

    if (status === "PENDING" || status === "MATCHING") {
      // Se o admin volta o lead para um estado aberto, limpa reservas antigas
      data.reservedUntil = null;
    }

    const updated = await prisma.lead.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        completedAt: true,
        cancelledAt: true,
        realtorId: true,
      },
    });

    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.ADMIN_LEAD_STATUS_FORCE,
        message: "Admin atualizou manualmente o status de um lead",
        actorId: session.userId || session.user?.id || null,
        actorEmail: session.user?.email || null,
        actorRole: role,
        targetType: "LEAD",
        targetId: id,
        metadata: {
          fromStatus: existing.status,
          toStatus: status,
        },
      });
    } catch {}

    if (updated.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(updated.realtorId));
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    console.error("Error forcing lead status from admin panel:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar status do lead" },
      { status: 500 },
    );
  }
}
