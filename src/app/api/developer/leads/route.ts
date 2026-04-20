import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

export async function GET(req: NextRequest) {
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

    const rawProjectId = req.nextUrl.searchParams.get("projectId");
    const rawUnitId = req.nextUrl.searchParams.get("unitId");
    const projectId = rawProjectId ? String(rawProjectId).trim() : "";
    const unitId = rawUnitId ? String(rawUnitId).trim() : "";

    let scopedProject: any = null;
    let scopedUnit: any = null;

    if (projectId) {
      scopedProject = await (prisma as any).developmentProject.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          teamId: true,
          name: true,
        },
      });

      if (!scopedProject?.id || String(scopedProject.teamId || "") !== String(workspace.teamId)) {
        return NextResponse.json({ error: "Empreendimento não encontrado neste workspace." }, { status: 404 });
      }
    }

    if (unitId) {
      scopedUnit = await (prisma as any).developmentUnit.findUnique({
        where: { id: unitId },
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          projectId: true,
          project: {
            select: {
              id: true,
              name: true,
              teamId: true,
            },
          },
        },
      });

      if (!scopedUnit?.id || String(scopedUnit.project?.teamId || "") !== String(workspace.teamId)) {
        return NextResponse.json({ error: "Unidade não encontrada neste workspace." }, { status: 404 });
      }

      if (scopedProject?.id && String(scopedUnit.projectId || "") !== String(scopedProject.id)) {
        return NextResponse.json({ error: "A unidade informada não pertence ao empreendimento selecionado." }, { status: 400 });
      }
    }

    const resolvedProjectId = scopedProject?.id ? String(scopedProject.id) : scopedUnit?.projectId ? String(scopedUnit.projectId) : null;

    const leads = await (prisma as any).lead.findMany({
      where: {
        property: {
          teamId: String(workspace.teamId),
        },
        developmentProjectId: resolvedProjectId ? String(resolvedProjectId) : { not: null },
        ...(scopedUnit?.id ? { developmentUnitId: String(scopedUnit.id) } : {}),
      },
      select: {
        id: true,
        publicCode: true,
        status: true,
        pipelineStage: true,
        createdAt: true,
        developmentProject: {
          select: {
            id: true,
            name: true,
          },
        },
        developmentUnit: {
          select: {
            id: true,
            reference: true,
            title: true,
            status: true,
          },
        },
        property: {
          select: {
            id: true,
            publicCode: true,
            title: true,
            price: true,
            city: true,
            state: true,
            neighborhood: true,
            images: {
              take: 1,
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
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            createdAt: true,
            senderId: true,
          },
        },
        chatReadReceipts: {
          where: { userId: String(userId) },
          select: { lastReadAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = (Array.isArray(leads) ? leads : []).map((lead: any) => {
      const latestMessage = Array.isArray(lead.messages) ? lead.messages[0] : null;
      const lastReadAt = Array.isArray(lead.chatReadReceipts) ? lead.chatReadReceipts[0]?.lastReadAt : null;

      const latestMessageAt = latestMessage?.createdAt ? new Date(latestMessage.createdAt) : null;
      const lastRead = lastReadAt ? new Date(lastReadAt) : null;

      const hasUnreadMessages =
        !!latestMessageAt &&
        (!lastRead || latestMessageAt.getTime() > lastRead.getTime()) &&
        String(latestMessage?.senderId || "") !== String(userId);

      return {
        id: String(lead.id),
        publicCode: (lead as any).publicCode ?? null,
        status: String(lead.status || ""),
        pipelineStage: (lead as any).pipelineStage ?? null,
        createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : new Date(String(lead.createdAt)).toISOString(),
        developmentProject: lead.developmentProject
          ? {
              id: String(lead.developmentProject.id),
              name: String(lead.developmentProject.name || ""),
            }
          : null,
        developmentUnit: lead.developmentUnit
          ? {
              id: String(lead.developmentUnit.id),
              reference: String(lead.developmentUnit.reference || ""),
              title: lead.developmentUnit.title ? String(lead.developmentUnit.title) : null,
              status: String(lead.developmentUnit.status || "AVAILABLE"),
            }
          : null,
        property: {
          id: String(lead.property.id),
          publicCode: lead.property.publicCode ? String(lead.property.publicCode) : null,
          title: String(lead.property.title || ""),
          price: typeof lead.property.price === "number" ? lead.property.price : Number(lead.property.price || 0),
          city: String(lead.property.city || ""),
          state: String(lead.property.state || ""),
          neighborhood: lead.property.neighborhood ? String(lead.property.neighborhood) : null,
          images: Array.isArray(lead.property.images) ? lead.property.images : [],
        },
        contact: lead.contact
          ? {
              name: lead.contact.name ? String(lead.contact.name) : null,
              email: lead.contact.email ? String(lead.contact.email) : null,
              phone: lead.contact.phone ? String(lead.contact.phone) : null,
            }
          : null,
        hasUnreadMessages,
        lastMessageAt: latestMessageAt ? latestMessageAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      success: true,
      workspace: {
        teamId: String(workspace.teamId),
        teamName: workspace.teamName ? String(workspace.teamName) : null,
        viewerWorkspaceRole: workspace.workspaceRole,
        canManageWorkspace: workspace.canManageWorkspace,
      },
      scope: {
        project: resolvedProjectId
          ? {
              id: String(resolvedProjectId),
              name: scopedProject?.name
                ? String(scopedProject.name)
                : scopedUnit?.project?.name
                  ? String(scopedUnit.project.name)
                  : null,
            }
          : null,
        unit: scopedUnit?.id
          ? {
              id: String(scopedUnit.id),
              reference: String(scopedUnit.reference || ""),
              title: scopedUnit.title ? String(scopedUnit.title) : null,
            }
          : null,
      },
      items,
    });
  } catch (error) {
    console.error("Error fetching developer leads:", error);
    return NextResponse.json({ error: "Não conseguimos carregar os leads do workspace." }, { status: 500 });
  }
}
