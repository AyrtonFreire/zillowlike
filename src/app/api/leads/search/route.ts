import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json(
        { error: "Usuário não encontrado na sessão" },
        { status: 400 }
      );
    }

    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não tem permissão para buscar leads." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ leads: [] });
    }

    // Buscar leads do corretor que correspondem à query
    const leads = await prisma.lead.findMany({
      where: {
        realtorId: userId,
        pipelineStage: { notIn: ["WON", "LOST"] },
        OR: [
          {
            property: {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { city: { contains: query, mode: "insensitive" } },
                { neighborhood: { contains: query, mode: "insensitive" } },
              ],
            },
          },
          {
            contact: {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { phone: { contains: query } },
              ],
            },
          },
        ],
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
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
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    return NextResponse.json({
      leads: leads.map((lead) => ({
        id: lead.id,
        status: lead.status,
        pipelineStage: lead.pipelineStage,
        property: {
          id: lead.property.id,
          title: lead.property.title,
          city: lead.property.city,
          state: lead.property.state,
          image: lead.property.images[0]?.url || null,
        },
        contact: lead.contact
          ? {
              name: lead.contact.name,
              email: lead.contact.email,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Error searching leads:", error);
    return NextResponse.json(
      { error: "Erro ao buscar leads" },
      { status: 500 }
    );
  }
}
