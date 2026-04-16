import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForTeam,
} from "@/lib/developer-workspace";
import { serializeDeveloperProject } from "@/lib/developer-projects";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

export async function GET(_: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { projectId } = await context.params;

    const project = await (prisma as any).developmentProject.findUnique({
      where: { id: String(projectId) },
      select: {
        id: true,
        teamId: true,
        name: true,
        slug: true,
        status: true,
        description: true,
        city: true,
        state: true,
        neighborhood: true,
        coverImageUrl: true,
        expectedLaunchAt: true,
        createdAt: true,
        updatedAt: true,
        units: {
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            projectId: true,
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
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!project?.teamId) {
      return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
    }

    const workspace = await resolveDeveloperWorkspaceForTeam({
      userId: String(userId),
      authRole: role ? String(role) : null,
      teamId: String(project.teamId),
    });

    if (!workspace.allowed) {
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

    return NextResponse.json({
      success: true,
      workspace: {
        teamId: String(workspace.teamId),
        teamName: workspace.teamName ? String(workspace.teamName) : null,
        viewerWorkspaceRole: workspace.workspaceRole,
        canManageWorkspace: workspace.canManageWorkspace,
      },
      project: serializeDeveloperProject(project, { includeUnits: true }),
    });
  } catch (error) {
    console.error("Error fetching developer project:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar o empreendimento." },
      { status: 500 }
    );
  }
}
