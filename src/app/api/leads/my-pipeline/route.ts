import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { LeadStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

const jsonSafe = <T>(value: T): T | number => (typeof value === "bigint" ? Number(value) : value);

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
      return NextResponse.json({ error: "Você não tem permissão para ver este funil." }, { status: 403 });
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
      orderBy: { createdAt: "desc" },
    });

    // Fallback simples: se por algum motivo pipelineStage não existir, inferir algo a partir do status
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
      property: lead.property
        ? {
            ...lead.property,
            price: lead.property.price ? jsonSafe(lead.property.price) : lead.property.price,
          }
        : lead.property,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error getting pipeline leads:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar seus leads do funil agora." },
      { status: 500 }
    );
  }
}
