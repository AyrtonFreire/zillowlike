import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { LeadStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

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
      return NextResponse.json({ error: "Você não tem permissão para ver estes leads." }, { status: 403 });
    }

    const leads = await (prisma as any).lead.findMany({
      where: {
        realtorId: userId,
      },
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
      orderBy: { createdAt: "desc" },
    });

    const mapStatusToStage = (status: LeadStatus): PipelineStage => {
      if (status === "ACCEPTED") return "CONTACT";
      if (status === "CONFIRMED") return "VISIT";
      if (status === "COMPLETED") return "WON";
      if (status === "CANCELLED" || status === "EXPIRED" || status === "OWNER_REJECTED") return "LOST";
      return "NEW";
    };

    const normalized = (leads as any[]).map((lead) => ({
      ...lead,
      pipelineStage: lead.pipelineStage || mapStatusToStage(lead.status),
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error getting my leads:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar seus leads agora." },
      { status: 500 }
    );
  }
}
