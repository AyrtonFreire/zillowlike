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
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    const { id } = context.params;

    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        city: true,
        state: true,
        status: true,
        bedrooms: true,
        bathrooms: true,
        areaM2: true,
        price: true,
        type: true,
        ownerId: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Imóvel não encontrado" }, { status: 404 });
    }

    // Para simplificar neste primeiro momento, apenas o proprietário
    // (que aqui também é o corretor) pode ver o resumo de leads deste imóvel.
    if (property.ownerId !== userId && role !== "ADMIN") {
      return NextResponse.json({ error: "Você não tem acesso aos leads deste imóvel." }, { status: 403 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        propertyId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    const formattedLeads = leads.map((lead) => {
      const l: any = lead;

      return {
        id: lead.id,
        status: lead.status,
        pipelineStage: l.pipelineStage,
        lostReason: l.lostReason,
        createdAt: lead.createdAt,
        visitDate: lead.visitDate,
        visitTime: lead.visitTime,
        completedAt: lead.completedAt,
        nextActionDate: l.nextActionDate,
        nextActionNote: l.nextActionNote,
        contact: lead.contact
        ? {
            name: lead.contact.name,
            phone: lead.contact.phone,
          }
        : null,
      };
    });

    return NextResponse.json({
      success: true,
      property,
      leads: formattedLeads,
    });
  } catch (error) {
    console.error("Error fetching property leads for broker:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar os leads deste imóvel agora." },
      { status: 500 }
    );
  }
}
