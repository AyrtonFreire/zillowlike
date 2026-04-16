import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
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

const normalizeOptionalText = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalUrl = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  if (typeof normalized !== "string") return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `https://${normalized}`;
};

const normalizeOptionalDateString = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  if (typeof normalized !== "string") return normalized;
  return normalized;
};

const developmentProjectPatchSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do empreendimento.").max(160, "O nome pode ter no máximo 160 caracteres.").optional(),
    status: z.enum(["DRAFT", "PRE_LAUNCH", "LAUNCH", "ACTIVE", "SOLD_OUT", "ARCHIVED"]).optional(),
    description: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(4000, "A descrição pode ter no máximo 4000 caracteres."), z.null()]).optional()
    ),
    city: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(120, "A cidade pode ter no máximo 120 caracteres."), z.null()]).optional()
    ),
    state: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(80, "O estado pode ter no máximo 80 caracteres."), z.null()]).optional()
    ),
    neighborhood: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(120, "O bairro pode ter no máximo 120 caracteres."), z.null()]).optional()
    ),
    coverImageUrl: z.preprocess(
      normalizeOptionalUrl,
      z.union([z.string().url("Informe uma URL válida para a capa.").max(2048, "A URL da capa é muito longa."), z.null()]).optional()
    ),
    expectedLaunchAt: z.preprocess(
      normalizeOptionalDateString,
      z.union([z.string().max(40, "A data prevista é inválida."), z.null()]).optional()
    ),
  })
  .strict();

function buildSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
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

export async function PATCH(req: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { projectId } = await context.params;

    const existingProject = await (prisma as any).developmentProject.findUnique({
      where: { id: String(projectId) },
      select: {
        id: true,
        teamId: true,
        name: true,
      },
    });

    if (!existingProject?.teamId) {
      return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
    }

    const workspace = await resolveDeveloperWorkspaceForTeam({
      userId: String(userId),
      authRole: role ? String(role) : null,
      teamId: String(existingProject.teamId),
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

    if (!workspace.canManageWorkspace) {
      return NextResponse.json({ error: "Você não tem permissão para editar este empreendimento." }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = developmentProjectPatchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const payload = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      if (payload.name !== existingProject.name) {
        const duplicate = await (prisma as any).developmentProject.findFirst({
          where: {
            teamId: String(existingProject.teamId),
            name: payload.name,
            NOT: { id: String(projectId) },
          },
          select: { id: true },
        });

        if (duplicate) {
          return NextResponse.json({ error: "Já existe um empreendimento com este nome neste workspace." }, { status: 400 });
        }
      }

      updateData.name = payload.name;
      updateData.slug = buildSlug(payload.name) || null;
    }

    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.description !== undefined) updateData.description = payload.description ?? null;
    if (payload.city !== undefined) updateData.city = payload.city ?? null;
    if (payload.state !== undefined) updateData.state = payload.state ?? null;
    if (payload.neighborhood !== undefined) updateData.neighborhood = payload.neighborhood ?? null;
    if (payload.coverImageUrl !== undefined) updateData.coverImageUrl = payload.coverImageUrl ?? null;

    if (payload.expectedLaunchAt !== undefined) {
      if (!payload.expectedLaunchAt) {
        updateData.expectedLaunchAt = null;
      } else {
        const parsedDate = new Date(payload.expectedLaunchAt);
        if (Number.isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: "Informe uma data prevista válida." }, { status: 400 });
        }
        updateData.expectedLaunchAt = parsedDate;
      }
    }

    updateData.updatedByUserId = String(userId);

    const updatedProject = await (prisma as any).developmentProject.update({
      where: { id: String(projectId) },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      project: serializeDeveloperProject(updatedProject, { includeUnits: true }),
    });
  } catch (error) {
    console.error("Error updating developer project:", error);
    return NextResponse.json(
      { error: "Não conseguimos atualizar o empreendimento." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { projectId } = await context.params;

    const existingProject = await (prisma as any).developmentProject.findUnique({
      where: { id: String(projectId) },
      select: {
        id: true,
        teamId: true,
        name: true,
        _count: {
          select: {
            units: true,
          },
        },
      },
    });

    if (!existingProject?.teamId) {
      return NextResponse.json({ error: "Empreendimento não encontrado" }, { status: 404 });
    }

    const workspace = await resolveDeveloperWorkspaceForTeam({
      userId: String(userId),
      authRole: role ? String(role) : null,
      teamId: String(existingProject.teamId),
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

    if (!workspace.canManageWorkspace) {
      return NextResponse.json({ error: "Você não tem permissão para excluir este empreendimento." }, { status: 403 });
    }

    if (Number(existingProject._count?.units || 0) > 0) {
      return NextResponse.json(
        { error: "Exclua primeiro todas as unidades vinculadas antes de remover o empreendimento." },
        { status: 400 }
      );
    }

    await (prisma as any).developmentProject.delete({
      where: { id: String(projectId) },
    });

    return NextResponse.json({
      success: true,
      deletedProjectId: String(projectId),
      deletedProjectName: String(existingProject.name || ""),
    });
  } catch (error) {
    console.error("Error deleting developer project:", error);
    return NextResponse.json(
      { error: "Não conseguimos excluir o empreendimento." },
      { status: 500 }
    );
  }
}
