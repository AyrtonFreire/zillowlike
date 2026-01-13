import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null as string | null, role: null as string | null };
  }

  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;

  return { userId, role };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    let agencyTeamId: string | null = null;
    if (role === "AGENCY") {
      const profile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      agencyTeamId = profile?.teamId ? String(profile.teamId) : null;

      if (!agencyTeamId) {
        return NextResponse.json({ error: "Perfil de agência sem time associado." }, { status: 403 });
      }
    }

    // Verificar se o usuário pode ver este lead (mesma lógica de /api/leads/[id] e /notes)
    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        teamId: true,
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

    if (role === "AGENCY") {
      const sameTeam = !!lead.teamId && String(lead.teamId) === String(agencyTeamId);
      let realtorIsTeamMember = false;

      if (!sameTeam && lead.realtorId) {
        const membership = await (prisma as any).teamMember.findFirst({
          where: {
            teamId: String(agencyTeamId),
            userId: String(lead.realtorId),
          },
          select: { id: true },
        });
        realtorIsTeamMember = !!membership?.id;
      }

      if (!sameTeam && !realtorIsTeamMember) {
        return NextResponse.json({ error: "Você só pode ver o histórico de atividades dos leads do seu time." }, { status: 403 });
      }
    } else if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
      return NextResponse.json(
        { error: "Você só pode ver o histórico de atividades dos leads que está atendendo ou dos times que lidera." },
        { status: 403 }
      );
    }

    const events = await (prisma as any).leadEvent.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching lead events:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar o histórico de atividades deste lead agora." },
      { status: 500 }
    );
  }
}
