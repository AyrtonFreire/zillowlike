import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const lead = await (prisma as any).lead.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            type: true,
            city: true,
            state: true,
            neighborhood: true,
            street: true,
            bedrooms: true,
            bathrooms: true,
            areaM2: true,
            teamId: true,
            ownerId: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        // Dados básicos do corretor responsável (se houver)
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        // Dados básicos do usuário/cliente vinculado (se cadastrado)
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    let isTeamOwner = false;
    const teamId = (lead as any).teamId || (lead.property as any)?.teamId || null;

    if (teamId) {
      const team = await (prisma as any).team.findUnique({
        where: { id: teamId },
        select: { ownerId: true },
      });

      if (team && team.ownerId === userId) {
        isTeamOwner = true;
      }
    }

    if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
      return NextResponse.json(
        {
          error:
            "Você só pode visualizar leads que está atendendo ou que pertencem a times dos quais você é responsável.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("Error fetching lead by id:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar este lead agora." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        property: { select: { teamId: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    let isTeamOwner = false;
    const teamId = lead.teamId || lead.property?.teamId || null;
    if (teamId) {
      const team = await (prisma as any).team.findUnique({
        where: { id: teamId },
        select: { ownerId: true },
      });
      isTeamOwner = !!team && team.ownerId === userId;
    }

    if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
      return NextResponse.json(
        {
          error:
            "Você só pode excluir leads que está atendendo ou que pertencem a times dos quais você é responsável.",
        },
        { status: 403 }
      );
    }

    await (prisma as any).lead.delete({ where: { id }, select: { id: true } });

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Não conseguimos excluir este lead agora." },
      { status: 500 }
    );
  }
}
