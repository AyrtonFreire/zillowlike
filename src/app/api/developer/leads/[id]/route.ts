import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";

const jsonSafe = <T,>(value: T): T | number => (typeof value === "bigint" ? Number(value) : value);

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const workspace = await resolveDeveloperWorkspaceForUser({
      userId: String(userId),
      authRole: role ? String(role) : null,
    });

    if (!workspace.allowed || !workspace.teamId) {
      return NextResponse.json(
        {
          error:
            workspace.reason === "PROFILE_NOT_FOUND"
              ? "Perfil da incorporadora não encontrado"
              : "Acesso negado",
        },
        { status: getDeveloperWorkspaceErrorStatus(workspace.reason) }
      );
    }

    const { id } = await context.params;

    const lead = await (prisma as any).lead.findUnique({
      where: { id: String(id) },
      select: {
        id: true,
        publicCode: true,
        status: true,
        pipelineStage: true,
        createdAt: true,
        respondedAt: true,
        completedAt: true,
        visitDate: true,
        visitTime: true,
        clientNotes: true,
        message: true,
        property: {
          select: {
            id: true,
            publicCode: true,
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
            builtAreaM2: true,
            usableAreaM2: true,
            lotAreaM2: true,
            privateAreaM2: true,
            suites: true,
            parkingSpots: true,
            floor: true,
            furnished: true,
            petFriendly: true,
            condoFee: true,
            purpose: true,
            teamId: true,
            images: {
              take: 3,
              orderBy: { sortOrder: "asc" },
              select: { url: true },
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
        developmentProject: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        developmentUnit: {
          select: {
            id: true,
            reference: true,
            title: true,
            status: true,
            typology: true,
            bedrooms: true,
            bathrooms: true,
            parkingSpots: true,
            privateAreaM2: true,
            price: true,
            floor: true,
            block: true,
            tower: true,
          },
        },
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
    });

    if (!lead?.property?.teamId || String(lead.property.teamId) !== String(workspace.teamId)) {
      return NextResponse.json({ error: "Lead não encontrado neste workspace." }, { status: 404 });
    }

    const normalized = {
      ...lead,
      createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : null,
      respondedAt: lead.respondedAt ? new Date(lead.respondedAt).toISOString() : null,
      completedAt: lead.completedAt ? new Date(lead.completedAt).toISOString() : null,
      property: lead.property
        ? {
            ...lead.property,
            price: jsonSafe(lead.property.price),
            condoFee: jsonSafe((lead.property as any).condoFee),
          }
        : null,
      developmentUnit: lead.developmentUnit
        ? {
            ...lead.developmentUnit,
            price: jsonSafe((lead.developmentUnit as any).price),
          }
        : null,
      messages: Array.isArray(lead.messages)
        ? [...lead.messages]
            .reverse()
            .map((message: any) => ({
              ...message,
              createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : null,
            }))
        : [],
    };

    return NextResponse.json({
      success: true,
      workspace: {
        teamId: String(workspace.teamId),
        teamName: workspace.teamName ? String(workspace.teamName) : null,
        viewerWorkspaceRole: workspace.workspaceRole,
        canManageWorkspace: workspace.canManageWorkspace,
      },
      lead: normalized,
    });
  } catch (error) {
    console.error("Error fetching developer lead detail:", error);
    return NextResponse.json({ error: "Não conseguimos carregar este lead do workspace." }, { status: 500 });
  }
}
