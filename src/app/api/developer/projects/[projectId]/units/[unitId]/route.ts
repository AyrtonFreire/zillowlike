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

const developmentUnitPatchSchema = z
  .object({
    reference: z.string().trim().min(1, "Informe a referência da unidade.").max(80, "A referência pode ter no máximo 80 caracteres.").optional(),
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

export async function PATCH(req: NextRequest, context: { params: Promise<{ projectId: string; unitId: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { projectId, unitId } = await context.params;

    const existingUnit = await (prisma as any).developmentUnit.findUnique({
      where: { id: String(unitId) },
      select: {
        id: true,
        projectId: true,
        reference: true,
        project: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!existingUnit || String(existingUnit.projectId) !== String(projectId) || !existingUnit.project?.teamId) {
      return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });
    }

    const workspace = await resolveDeveloperWorkspaceForTeam({
      userId: String(userId),
      authRole: role ? String(role) : null,
      teamId: String(existingUnit.project.teamId),
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
      return NextResponse.json({ error: "Você não tem permissão para editar unidades neste empreendimento." }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = developmentUnitPatchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const payload = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (payload.reference !== undefined) {
      if (payload.reference !== existingUnit.reference) {
        const duplicate = await (prisma as any).developmentUnit.findFirst({
          where: {
            projectId: String(projectId),
            reference: payload.reference,
            NOT: { id: String(unitId) },
          },
          select: { id: true },
        });

        if (duplicate) {
          return NextResponse.json({ error: "Já existe uma unidade com esta referência neste empreendimento." }, { status: 400 });
        }
      }
      updateData.reference = payload.reference;
    }

    if (payload.title !== undefined) updateData.title = payload.title ?? null;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.typology !== undefined) updateData.typology = payload.typology ?? null;
    if (payload.bedrooms !== undefined) updateData.bedrooms = payload.bedrooms ?? null;
    if (payload.bathrooms !== undefined) updateData.bathrooms = payload.bathrooms ?? null;
    if (payload.parkingSpots !== undefined) updateData.parkingSpots = payload.parkingSpots ?? null;
    if (payload.privateAreaM2 !== undefined) updateData.privateAreaM2 = payload.privateAreaM2 ?? null;
    if (payload.price !== undefined) updateData.price = payload.price ?? null;
    if (payload.floor !== undefined) updateData.floor = payload.floor ?? null;
    if (payload.block !== undefined) updateData.block = payload.block ?? null;
    if (payload.tower !== undefined) updateData.tower = payload.tower ?? null;
    if (payload.notes !== undefined) updateData.notes = payload.notes ?? null;

    const updatedUnit = await (prisma as any).developmentUnit.update({
      where: { id: String(unitId) },
      data: updateData,
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
      unit: serializeDeveloperUnit(updatedUnit),
    });
  } catch (error) {
    console.error("Error updating development unit:", error);
    return NextResponse.json(
      { error: "Não conseguimos atualizar a unidade." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ projectId: string; unitId: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { projectId, unitId } = await context.params;

    const existingUnit = await (prisma as any).developmentUnit.findUnique({
      where: { id: String(unitId) },
      select: {
        id: true,
        projectId: true,
        reference: true,
        status: true,
        project: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!existingUnit || String(existingUnit.projectId) !== String(projectId) || !existingUnit.project?.teamId) {
      return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });
    }

    const workspace = await resolveDeveloperWorkspaceForTeam({
      userId: String(userId),
      authRole: role ? String(role) : null,
      teamId: String(existingUnit.project.teamId),
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
      return NextResponse.json({ error: "Você não tem permissão para excluir unidades neste empreendimento." }, { status: 403 });
    }

    if (existingUnit.status === "SOLD" || existingUnit.status === "RESERVED") {
      return NextResponse.json(
        { error: "Unidades reservadas ou vendidas não podem ser excluídas. Atualize o status antes de continuar." },
        { status: 400 }
      );
    }

    await (prisma as any).developmentUnit.delete({
      where: { id: String(unitId) },
    });

    return NextResponse.json({
      success: true,
      deletedUnitId: String(unitId),
      deletedReference: String(existingUnit.reference),
    });
  } catch (error) {
    console.error("Error deleting development unit:", error);
    return NextResponse.json(
      { error: "Não conseguimos excluir a unidade." },
      { status: 500 }
    );
  }
}
