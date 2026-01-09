import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.user && !session?.userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id || null;
    const role = session.role || session.user?.role || null;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Você não tem permissão para liberar este lead." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const bodyRealtorId = body?.realtorId ? String(body.realtorId) : null;

    if (bodyRealtorId && role !== "ADMIN" && bodyRealtorId !== String(userId)) {
      return NextResponse.json(
        { success: false, error: "realtorId não confere com o usuário autenticado." },
        { status: 400 },
      );
    }

    const effectiveRealtorId = role === "ADMIN" && bodyRealtorId ? bodyRealtorId : String(userId);

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: { id: true, realtorId: true, status: true },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
    }

    if (role !== "ADMIN" && String(lead.realtorId || "") !== String(effectiveRealtorId)) {
      return NextResponse.json(
        { success: false, error: "Este lead não está reservado para você." },
        { status: 403 },
      );
    }

    if (lead.status !== "RESERVED" && lead.status !== "WAITING_REALTOR_ACCEPT") {
      return NextResponse.json(
        { success: false, error: "Este lead não está em estado de reserva para ser liberado." },
        { status: 400 },
      );
    }

    await LeadDistributionService.rejectLead(id, effectiveRealtorId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error rejecting lead:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Não foi possível liberar este lead agora." },
      { status: 500 },
    );
  }
}
