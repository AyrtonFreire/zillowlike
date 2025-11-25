import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const body = await req.json().catch(() => ({}));

    const { date, note } = body as { date?: string | null; note?: string | null };

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
        { error: "Você só pode definir lembretes para leads que está atendendo ou dos times que lidera." },
        { status: 403 }
      );
    }

    let nextActionDate: Date | null = null;
    if (date) {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Data de lembrete inválida." }, { status: 400 });
      }
      nextActionDate = parsed;
    }

    const updated = await (prisma as any).lead.update({
      where: { id },
      data: {
        nextActionDate,
        nextActionNote: note ?? null,
      },
      select: {
        id: true,
        nextActionDate: true,
        nextActionNote: true,
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    console.error("Error updating lead reminder:", error);
    return NextResponse.json(
      { error: "Não conseguimos salvar este lembrete agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
