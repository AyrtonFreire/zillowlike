import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
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
        { success: false, error: "Você não tem permissão para encerrar este lead." },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: { id: true, realtorId: true, status: true },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
    }

    if (role !== "ADMIN" && String(lead.realtorId || "") !== String(userId)) {
      return NextResponse.json(
        { success: false, error: "Este lead não está atribuído a você." },
        { status: 403 },
      );
    }

    if (lead.status !== "ACCEPTED") {
      return NextResponse.json(
        { success: false, error: "Apenas leads em atendimento podem ser concluídos." },
        { status: 400 },
      );
    }

    const updated = await LeadDistributionService.completeLead(id, String(lead.realtorId));
    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error("Error completing lead:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Não foi possível encerrar este lead agora." },
      { status: 500 },
    );
  }
}
