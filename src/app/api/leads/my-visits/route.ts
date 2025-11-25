import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Você não tem permissão para ver esta agenda." }, { status: 403 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        realtorId: userId,
        visitDate: {
          not: null,
        },
        visitTime: {
          not: null,
        },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            neighborhood: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        visitDate: "asc",
      },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error getting visits:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar sua agenda de visitas agora." },
      { status: 500 }
    );
  }
}
