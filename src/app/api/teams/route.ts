import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createTeamSchema = z.object({
  name: z
    .string()
    .min(3, "Escolha um nome um pouco maior para o time.")
    .max(100, "O nome do time está muito longo."),
});

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Busca todos os times em que o usuário participa (inclusive como dono)
    const memberships = await (prisma as any).teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const teams = memberships.map((membership: any) => {
      const team = membership.team;

      return {
        id: team.id,
        name: team.name,
        role: membership.role as string,
        owner: team.owner,
        members: team.members.map((m: any) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role as string,
        })),
      };
    });

    return NextResponse.json({ success: true, teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar seus times agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Por enquanto, apenas corretores, agências e admins podem criar times
    if (role !== "REALTOR" && role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas corretores ou imobiliárias podem criar times." },
        { status: 403 }
      );
    }

    if (role !== "ADMIN") {
      const existingMembership = await (prisma as any).teamMember.findFirst({
        where: { userId },
        select: { teamId: true },
      });

      if (existingMembership?.teamId) {
        return NextResponse.json(
          { error: "Você já faz parte de um time. No momento, não é possível participar de múltiplos times." },
          { status: 400 },
        );
      }
    }

    const json = await req.json().catch(() => null);
    const parsed = createTeamSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const name = parsed.data.name.trim();

    const team = await (prisma as any).team.create({
      data: {
        name,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const result = {
      id: team.id,
      name: team.name,
      owner: team.owner,
      members: team.members.map((m: any) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role as string,
      })),
    };

    return NextResponse.json({ success: true, team: result });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      { error: "Não conseguimos criar este time agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
