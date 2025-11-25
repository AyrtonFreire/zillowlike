import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_REASONS = [
  "CLIENT_DESISTIU",
  "FECHOU_OUTRO_IMOVEL",
  "CONDICAO_FINANCEIRA",
  "NAO_RESPONDEU",
  "OUTRO",
] as const;

export type LeadLostReason = (typeof ALLOWED_REASONS)[number];

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
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

    const { id } = context.params;
    const body = await req.json().catch(() => ({}));
    const reason = (body?.reason || null) as LeadLostReason | null;

    if (reason && !ALLOWED_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Motivo de perda inválido." }, { status: 400 });
    }

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
        { error: "Você só pode marcar perda em leads que está atendendo ou dos times que lidera." },
        { status: 403 }
      );
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        pipelineStage: "LOST" as any,
        lostReason: reason,
      },
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        lostReason: true,
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error("Error marking lead as lost:", error);
    const message = error?.message || "Não conseguimos salvar este resultado agora.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
