import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForTeam,
} from "@/lib/developer-workspace";
import { serializeDeveloperUnit } from "@/lib/developer-projects";

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

const normalizeOptionalInteger = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, "."));
    return Number.isFinite(parsed) ? Math.trunc(parsed) : value;
  }
  return value;
};

const normalizeOptionalFloat = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
};

const normalizeOptionalMoney = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/\./g, "").replace(/,/g, ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : value;
  }
  return value;
};

const developmentUnitCreateSchema = z
  .object({
    reference: z.string().trim().min(1, "Informe a referência da unidade.").max(80, "A referência pode ter no máximo 80 caracteres."),
    title: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(160, "O título pode ter no máximo 160 caracteres."), z.null()]).optional()
    ),
    status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "BLOCKED"]).optional(),
    typology: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(120, "A tipologia pode ter no máximo 120 caracteres."), z.null()]).optional()
    ),
    bedrooms: z.preprocess(normalizeOptionalInteger, z.union([z.number().int().min(0).max(20), z.null()]).optional()),
    bathrooms: z.preprocess(normalizeOptionalFloat, z.union([z.number().min(0).max(20), z.null()]).optional()),
    parkingSpots: z.preprocess(normalizeOptionalInteger, z.union([z.number().int().min(0).max(20), z.null()]).optional()),
    privateAreaM2: z.preprocess(normalizeOptionalInteger, z.union([z.number().int().min(0).max(100000), z.null()]).optional()),
    price: z.preprocess(normalizeOptionalMoney, z.union([z.number().int().min(0), z.null()]).optional()),
    floor: z.preprocess(normalizeOptionalInteger, z.union([z.number().int().min(-10).max(500), z.null()]).optional()),
    block: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(80, "O bloco pode ter no máximo 80 caracteres."), z.null()]).optional()
    ),
    tower: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(80, "A torre pode ter no máximo 80 caracteres."), z.null()]).optional()
    ),
    notes: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(4000, "As observações podem ter no máximo 4000 caracteres."), z.null()]).optional()
    ),
  })
  .strict();

export async function POST(req: NextRequest, context: { params: Promise<{ projectId: string }> }) {
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

    if (!workspace.canManageWorkspace) {
      return NextResponse.json({ error: "Você não tem permissão para cadastrar unidades neste empreendimento." }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = developmentUnitCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const payload = parsed.data;

    const duplicate = await (prisma as any).developmentUnit.findFirst({
      where: {
        projectId: String(projectId),
        reference: payload.reference,
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json({ error: "Já existe uma unidade com esta referência neste empreendimento." }, { status: 400 });
    }

    const createdUnit = await (prisma as any).developmentUnit.create({
      data: {
        projectId: String(projectId),
        reference: payload.reference,
        title: payload.title ?? null,
        status: payload.status || "AVAILABLE",
        typology: payload.typology ?? null,
        bedrooms: payload.bedrooms ?? null,
        bathrooms: payload.bathrooms ?? null,
        parkingSpots: payload.parkingSpots ?? null,
        privateAreaM2: payload.privateAreaM2 ?? null,
        price: payload.price ?? null,
        floor: payload.floor ?? null,
        block: payload.block ?? null,
        tower: payload.tower ?? null,
        notes: payload.notes ?? null,
      },
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
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      unit: serializeDeveloperUnit(createdUnit),
    });
  } catch (error) {
    console.error("Error creating development unit:", error);
    return NextResponse.json(
      { error: "Não conseguimos cadastrar a unidade." },
      { status: 500 }
    );
  }
}
