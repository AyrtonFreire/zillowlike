import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";
import { normalizePhoneE164 } from "@/lib/sms";

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

const normalizeOptionalPhone = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  if (typeof normalized !== "string") return normalized;
  return normalized;
};

const developerProfilePatchSchema = z
  .object({
    legalName: z.string().trim().min(2, "Informe a razão social.").max(160, "A razão social pode ter no máximo 160 caracteres.").optional(),
    brandName: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(160, "O nome fantasia pode ter no máximo 160 caracteres."), z.null()]).optional()
    ),
    phone: z.preprocess(
      normalizeOptionalPhone,
      z.union([z.string().max(40, "O telefone comercial é muito longo."), z.null()]).optional()
    ),
    website: z.preprocess(
      normalizeOptionalUrl,
      z.union([z.string().url("Informe um site válido.").max(2048, "O link do site é muito longo."), z.null()]).optional()
    ),
    businessType: z.enum(["CONSTRUTORA", "INCORPORADORA", "LOTEADORA", "URBANIZADORA", "MISTA"]).optional(),
    description: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(2000, "A descrição pode ter no máximo 2000 caracteres."), z.null()]).optional()
    ),
    logoUrl: z.preprocess(
      normalizeOptionalUrl,
      z.union([z.string().url("Informe uma URL válida para a logo.").max(2048, "A URL da logo é muito longa."), z.null()]).optional()
    ),
  })
  .strict();

function normalizeDeveloperPhone(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return { raw: null, normalized: null };
  const normalized = normalizePhoneE164(raw);
  return { raw, normalized: normalized || null };
}

async function buildDeveloperProfileResponse(input: {
  developerUserId: string;
  viewerUserId: string;
  viewerWorkspaceRole: string | null;
  canManageWorkspace: boolean;
  canTransferOwner: boolean;
}) {
  const developerProfile = await (prisma as any).developerProfile.findUnique({
    where: { userId: String(input.developerUserId) },
    select: {
      id: true,
      legalName: true,
      brandName: true,
      cnpj: true,
      phone: true,
      website: true,
      businessType: true,
      description: true,
      logoUrl: true,
      teamId: true,
      createdAt: true,
      updatedAt: true,
      team: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          _count: {
            select: {
              members: true,
              invites: true,
              developmentProjects: true,
              properties: true,
              leads: true,
              clients: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          role: true,
          name: true,
          email: true,
          image: true,
          phone: true,
          phoneVerifiedAt: true,
          publicCity: true,
          publicState: true,
        },
      },
    },
  });

  if (!developerProfile) return null;

  return {
    id: String(developerProfile.id),
    legalName: String(developerProfile.legalName || ""),
    brandName: developerProfile.brandName ? String(developerProfile.brandName) : null,
    displayName: String(developerProfile.brandName || developerProfile.legalName || "Incorporadora"),
    cnpj: String(developerProfile.cnpj || ""),
    phone: developerProfile.phone ? String(developerProfile.phone) : null,
    website: developerProfile.website ? String(developerProfile.website) : null,
    businessType: developerProfile.businessType ? String(developerProfile.businessType) : null,
    description: developerProfile.description ? String(developerProfile.description) : null,
    logoUrl: developerProfile.logoUrl ? String(developerProfile.logoUrl) : null,
    teamId: String(developerProfile.teamId),
    createdAt: developerProfile.createdAt,
    updatedAt: developerProfile.updatedAt,
    workspace: {
      teamId: developerProfile.team?.id ? String(developerProfile.team.id) : String(developerProfile.teamId),
      teamName: developerProfile.team?.name ? String(developerProfile.team.name) : null,
      teamOwnerId: developerProfile.team?.ownerId ? String(developerProfile.team.ownerId) : null,
      membersCount: Number(developerProfile.team?._count?.members || 0),
      invitesCount: Number(developerProfile.team?._count?.invites || 0),
      developmentProjectsCount: Number(developerProfile.team?._count?.developmentProjects || 0),
      propertiesCount: Number(developerProfile.team?._count?.properties || 0),
      leadsCount: Number(developerProfile.team?._count?.leads || 0),
      clientsCount: Number(developerProfile.team?._count?.clients || 0),
      viewerUserId: String(input.viewerUserId),
      viewerWorkspaceRole: input.viewerWorkspaceRole ? String(input.viewerWorkspaceRole) : null,
      canManageWorkspace: Boolean(input.canManageWorkspace),
      canTransferOwner: Boolean(input.canTransferOwner),
    },
    user: developerProfile.user
      ? {
          id: String(developerProfile.user.id),
          role: String(developerProfile.user.role),
          name: developerProfile.user.name ? String(developerProfile.user.name) : null,
          email: developerProfile.user.email ? String(developerProfile.user.email) : null,
          image: developerProfile.user.image ? String(developerProfile.user.image) : null,
          phone: developerProfile.user.phone ? String(developerProfile.user.phone) : null,
          phoneVerified: Boolean(developerProfile.user.phoneVerifiedAt),
          publicCity: developerProfile.user.publicCity ? String(developerProfile.user.publicCity) : null,
          publicState: developerProfile.user.publicState ? String(developerProfile.user.publicState) : null,
        }
      : null,
  };
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

    if (!workspace.allowed || !workspace.developerProfileUserId) {
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

    const developerProfile = await buildDeveloperProfileResponse({
      developerUserId: String(workspace.developerProfileUserId),
      viewerUserId: String(workspace.userId || userId),
      viewerWorkspaceRole: workspace.workspaceRole,
      canManageWorkspace: workspace.canManageWorkspace,
      canTransferOwner: workspace.canTransferOwner,
    });

    if (!developerProfile) {
      return NextResponse.json({ error: "Perfil da incorporadora não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      developerProfile,
    });
  } catch (error) {
    console.error("Error fetching developer profile:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar o perfil da incorporadora." },
      { status: 500 }
    );
  }
 }

 export async function PATCH(req: NextRequest) {
   try {
     const { userId, role } = await getSessionContext();

     if (!userId) {
       return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
     }

     const workspace = await resolveDeveloperWorkspaceForUser({
       userId: String(userId),
       authRole: role ? String(role) : null,
     });

     if (!workspace.allowed || !workspace.developerProfileUserId) {
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
       return NextResponse.json({ error: "Você não tem permissão para editar este workspace." }, { status: 403 });
     }

     const json = await req.json().catch(() => null);
     const parsed = developerProfilePatchSchema.safeParse(json);

     if (!parsed.success) {
       return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
     }

     const developerActorUserId = String(workspace.developerProfileUserId);
     const existingDeveloperProfile = await (prisma as any).developerProfile.findUnique({
       where: { userId: developerActorUserId },
       select: {
         id: true,
         userId: true,
         legalName: true,
         brandName: true,
         phone: true,
         website: true,
         businessType: true,
         description: true,
         logoUrl: true,
         teamId: true,
         team: {
           select: {
             id: true,
             name: true,
           },
         },
       },
     });

     if (!existingDeveloperProfile) {
       return NextResponse.json({ error: "Perfil da incorporadora não encontrado" }, { status: 404 });
     }

     const payload = parsed.data;
     const normalizedPhone = payload.phone !== undefined ? normalizeDeveloperPhone(payload.phone) : null;
     if (payload.phone !== undefined && normalizedPhone?.raw && !normalizedPhone.normalized) {
       return NextResponse.json({ error: "Informe um telefone comercial válido." }, { status: 400 });
     }

     const developerUpdateData: Record<string, unknown> = {};
     if (payload.legalName !== undefined) developerUpdateData.legalName = payload.legalName;
     if (payload.brandName !== undefined) developerUpdateData.brandName = payload.brandName;
     if (payload.phone !== undefined) developerUpdateData.phone = normalizedPhone?.raw ?? null;
     if (payload.website !== undefined) developerUpdateData.website = payload.website;
     if (payload.businessType !== undefined) developerUpdateData.businessType = payload.businessType;
     if (payload.description !== undefined) developerUpdateData.description = payload.description;
     if (payload.logoUrl !== undefined) developerUpdateData.logoUrl = payload.logoUrl;

     const currentDisplayName = String(existingDeveloperProfile.brandName || existingDeveloperProfile.legalName || "Incorporadora");
     const nextLegalName = payload.legalName !== undefined ? payload.legalName : String(existingDeveloperProfile.legalName || "");
     const nextBrandName = payload.brandName !== undefined ? payload.brandName : existingDeveloperProfile.brandName ? String(existingDeveloperProfile.brandName) : null;
     const nextDisplayName = String(nextBrandName || nextLegalName || "Incorporadora");
     const shouldSyncTeamName =
       (payload.legalName !== undefined || payload.brandName !== undefined) &&
       (!existingDeveloperProfile.team?.name || String(existingDeveloperProfile.team.name) === currentDisplayName);

     await (prisma as any).$transaction(async (tx: any) => {
       if (Object.keys(developerUpdateData).length > 0) {
         await tx.developerProfile.update({
           where: { id: existingDeveloperProfile.id },
           data: developerUpdateData,
           select: { id: true },
         });
       }

       if (shouldSyncTeamName && nextDisplayName !== String(existingDeveloperProfile.team?.name || "")) {
         await tx.team.update({
           where: { id: existingDeveloperProfile.teamId },
           data: { name: nextDisplayName },
           select: { id: true },
         });
       }
     });

     const developerProfile = await buildDeveloperProfileResponse({
       developerUserId: developerActorUserId,
       viewerUserId: String(workspace.userId || userId),
       viewerWorkspaceRole: workspace.workspaceRole,
       canManageWorkspace: workspace.canManageWorkspace,
       canTransferOwner: workspace.canTransferOwner,
     });

     return NextResponse.json({ success: true, developerProfile });
   } catch (error) {
     console.error("Error updating developer profile:", error);
     return NextResponse.json(
       { error: "Não conseguimos salvar o perfil da incorporadora." },
       { status: 500 }
     );
   }
 }
