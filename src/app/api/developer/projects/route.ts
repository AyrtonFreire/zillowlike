import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";
import {
  serializeDeveloperProject,
  summarizeProjects,
} from "@/lib/developer-projects";

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

const developmentProjectCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do empreendimento.").max(160, "O nome pode ter no máximo 160 caracteres."),
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

export async function GET() {
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

    const projects = await (prisma as any).developmentProject.findMany({
      where: { teamId: String(workspace.teamId) },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
          select: {
            status: true,
          },
        },
      },
    });

    const serializedProjects = projects.map((project: any) => serializeDeveloperProject(project));

    return NextResponse.json({
      success: true,
      workspace: {
        teamId: String(workspace.teamId),
        teamName: workspace.teamName ? String(workspace.teamName) : null,
        viewerWorkspaceRole: workspace.workspaceRole,
        canManageWorkspace: workspace.canManageWorkspace,
      },
      projects: serializedProjects,
      summary: summarizeProjects(serializedProjects),
    });
  } catch (error) {
    console.error("Error fetching developer projects:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar os empreendimentos da incorporadora." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    if (!workspace.canManageWorkspace) {
      return NextResponse.json({ error: "Você não tem permissão para criar empreendimentos neste workspace." }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = developmentProjectCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const payload = parsed.data;
    const expectedLaunchAt = payload.expectedLaunchAt ? new Date(payload.expectedLaunchAt) : null;

    if (payload.expectedLaunchAt && (!expectedLaunchAt || Number.isNaN(expectedLaunchAt.getTime()))) {
      return NextResponse.json({ error: "Informe uma data prevista válida." }, { status: 400 });
    }

    const duplicate = await (prisma as any).developmentProject.findFirst({
      where: {
        teamId: String(workspace.teamId),
        name: payload.name,
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json({ error: "Já existe um empreendimento com este nome neste workspace." }, { status: 400 });
    }

    const createdProject = await (prisma as any).developmentProject.create({
      data: {
        teamId: String(workspace.teamId),
        name: payload.name,
        slug: buildSlug(payload.name) || null,
        status: payload.status || "DRAFT",
        description: payload.description ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        neighborhood: payload.neighborhood ?? null,
        coverImageUrl: payload.coverImageUrl ?? null,
        expectedLaunchAt,
        createdByUserId: String(userId),
        updatedByUserId: String(userId),
      },
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
          select: {
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      project: serializeDeveloperProject(createdProject),
    });
  } catch (error) {
    console.error("Error creating developer project:", error);
    return NextResponse.json(
      { error: "Não conseguimos criar o empreendimento." },
      { status: 500 }
    );
  }
}
