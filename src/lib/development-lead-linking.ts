import { prisma } from "@/lib/prisma";

type ResolveDevelopmentLeadLinkParams = {
  propertyTeamId?: string | null;
  developmentProjectId?: string | null;
  developmentUnitId?: string | null;
};

export async function resolveDevelopmentLeadLink(params: ResolveDevelopmentLeadLinkParams) {
  const propertyTeamId = params.propertyTeamId ? String(params.propertyTeamId).trim() : "";
  const rawProjectId = params.developmentProjectId ? String(params.developmentProjectId).trim() : "";
  const rawUnitId = params.developmentUnitId ? String(params.developmentUnitId).trim() : "";

  if (!rawProjectId && !rawUnitId) {
    return {
      developmentProjectId: undefined,
      developmentUnitId: undefined,
    };
  }

  if (!propertyTeamId) {
    throw new Error("Só é possível vincular leads de empreendimento a imóveis ligados a um workspace.");
  }

  let resolvedProjectId = rawProjectId || "";
  const resolvedUnitId = rawUnitId || "";
  let resolvedTeamId = "";

  if (resolvedProjectId) {
    const project = await (prisma as any).developmentProject.findUnique({
      where: { id: resolvedProjectId },
      select: {
        id: true,
        teamId: true,
      },
    });

    if (!project?.id || !project?.teamId) {
      throw new Error("Empreendimento vinculado ao lead não foi encontrado.");
    }

    resolvedTeamId = String(project.teamId);
  }

  if (resolvedUnitId) {
    const unit = await (prisma as any).developmentUnit.findUnique({
      where: { id: resolvedUnitId },
      select: {
        id: true,
        projectId: true,
        project: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!unit?.id || !unit?.projectId || !unit?.project?.teamId) {
      throw new Error("Unidade vinculada ao lead não foi encontrada.");
    }

    const unitProjectId = String(unit.projectId);
    if (resolvedProjectId && unitProjectId !== resolvedProjectId) {
      throw new Error("A unidade informada não pertence ao empreendimento selecionado.");
    }

    resolvedProjectId = unitProjectId;
    resolvedTeamId = String(unit.project.teamId);
  }

  if (resolvedTeamId !== propertyTeamId) {
    throw new Error("O empreendimento vinculado ao lead precisa pertencer ao mesmo workspace do imóvel.");
  }

  return {
    developmentProjectId: resolvedProjectId || undefined,
    developmentUnitId: resolvedUnitId || undefined,
  };
}
