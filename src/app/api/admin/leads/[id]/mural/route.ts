import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";

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
    const block = typeof body?.block === "boolean" ? body.block : true;

    const existing = await prisma.lead.findUnique({
      where: { id },
      select: {
        isDirect: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        isDirect: block,
      },
      select: {
        id: true,
        status: true,
        isDirect: true,
      },
    });

    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.ADMIN_LEAD_MURAL_VISIBILITY,
        message: "Admin alterou participação de lead no mural",
        actorId: session.userId || session.user?.id || null,
        actorEmail: session.user?.email || null,
        actorRole: role,
        targetType: "LEAD",
        targetId: id,
        metadata: {
          fromIsDirect: existing.isDirect,
          toIsDirect: block,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    console.error("Error updating lead mural visibility from admin panel:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar visibilidade do lead no mural" },
      { status: 500 },
    );
  }
}
