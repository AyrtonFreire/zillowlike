import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePipelineStageSchema } from "@/lib/validations/lead";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { stage } = updatePipelineStageSchema.parse(body);

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        realtorId: true,
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const isTeamOwner = !!lead.team && lead.team.ownerId === userId;

    if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
      return NextResponse.json(
        { error: "Você só pode mudar a etapa de leads que está atendendo ou dos times que lidera." },
        { status: 403 }
      );
    }

    const updated = await (prisma as any).lead.update({
      where: { id },
      data: {
        pipelineStage: stage,
      },
      select: {
        id: true,
        status: true,
        pipelineStage: true,
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error("Error updating lead pipeline stage:", error);
    const message = error?.message || "Não conseguimos atualizar a etapa deste lead agora.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
