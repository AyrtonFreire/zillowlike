import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
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
