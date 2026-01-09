import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { LeadStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;

    const team = await (prisma as any).team.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    const isMember = (team.members as any[]).some((m) => m.userId === userId);
    const isOwner = team.ownerId === userId;

    if (!isMember && !isOwner && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não tem acesso ao funil deste time." },
        { status: 403 }
      );
    }

    const sortedMembers = (team.members as any[]).slice().sort((a, b) => {
      const aPos = typeof a.queuePosition === "number" ? a.queuePosition : 0;
      const bPos = typeof b.queuePosition === "number" ? b.queuePosition : 0;
      if (aPos !== bPos) return aPos - bPos;
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aCreated - bCreated;
    });

    const memberIds = sortedMembers.map((m) => m.userId);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        team: {
          id: team.id,
          name: team.name,
        },
        leads: [],
      });
    }

    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { teamId: id },
          {
            realtorId: {
              in: memberIds,
            },
          },
        ],
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
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    type SimplePipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

    const mapStatusToStage = (status: LeadStatus): SimplePipelineStage => {
      if (status === "ACCEPTED") return "CONTACT";
      if (status === "CONFIRMED") return "VISIT";
      if (status === "COMPLETED") return "WON";
      if (status === "CANCELLED" || status === "EXPIRED" || status === "OWNER_REJECTED") return "LOST";
      return "NEW";
    };

    const normalized = leads.map((lead: any) => ({
      id: lead.id,
      status: lead.status,
      pipelineStage: lead.pipelineStage || mapStatusToStage(lead.status),
      createdAt: lead.createdAt,
      property: lead.property,
      contact: lead.contact,
      realtor: lead.realtor,
    }));

    const members = sortedMembers.map((m) => ({
      userId: m.userId,
      name: m.user?.name ?? null,
      email: m.user?.email ?? null,
      role: m.role as string,
      queuePosition: typeof m.queuePosition === "number" ? m.queuePosition : 0,
    }));

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
      },
      members,
      leads: normalized,
    });
  } catch (error) {
    console.error("Error fetching team pipeline:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar o funil deste time agora." },
      { status: 500 }
    );
  }
}
