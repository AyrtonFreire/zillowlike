import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  agencyProfilePatchSchema,
  getAgencyConfigs,
  getAgencyProfileCompletion,
  normalizeAgencyPhone,
  normalizeAgencyWhatsApp,
  upsertAgencyProfileConfig,
  upsertAgencyPublicLeadConfig,
} from "@/lib/agency-profile";
import { getPublicProfilePathByRole } from "@/lib/public-profile";
import { generateUniquePublicSlug } from "@/lib/public-profile-slug";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

async function buildAgencyProfileResponse(userId: string) {
  const agencyProfile = await (prisma as any).agencyProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      name: true,
      phone: true,
      cnpj: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!agencyProfile) return null;

  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      name: true,
      image: true,
      phone: true,
      phoneVerifiedAt: true,
      publicSlug: true,
      publicProfileEnabled: true,
      publicHeadline: true,
      publicBio: true,
      publicCity: true,
      publicState: true,
      publicServiceAreas: true,
      publicWhatsApp: true,
      publicInstagram: true,
      publicPhoneOptIn: true,
    },
  });

  if (!user) return null;

  const [{ profileConfig, leadConfig }, teamMembers] = await Promise.all([
    getAgencyConfigs(String(agencyProfile.teamId)),
    (prisma as any).teamMember.findMany({
      where: {
        teamId: String(agencyProfile.teamId),
        role: { in: ["OWNER", "AGENT"] },
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            name: true,
            image: true,
            phone: true,
            phoneVerifiedAt: true,
            publicSlug: true,
            publicHeadline: true,
            publicWhatsApp: true,
          },
        },
      },
      orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const publicTeamMembers = (teamMembers as any[])
    .filter((member) => member?.user?.id && member?.user?.role === "REALTOR")
    .map((member) => ({
      id: String(member.user.id),
      name: String(member.user.name || "Corretor"),
      image: member.user.image ? String(member.user.image) : null,
      headline: member.user.publicHeadline ? String(member.user.publicHeadline) : null,
      publicSlug: member.user.publicSlug ? String(member.user.publicSlug) : null,
      publicWhatsApp: member.user.publicWhatsApp ? String(member.user.publicWhatsApp) : null,
      phone: member.user.phone ? String(member.user.phone) : null,
      phoneVerified: Boolean(member.user.phoneVerifiedAt),
    }));

  const verifiedPhoneVisible = Boolean(user.publicPhoneOptIn && user.phoneVerifiedAt && user.phone);
  const completion = getAgencyProfileCompletion({
    logoUrl: user.image,
    publicHeadline: user.publicHeadline,
    publicBio: user.publicBio,
    publicCity: user.publicCity,
    publicState: user.publicState,
    publicServiceAreas: Array.isArray(user.publicServiceAreas) ? user.publicServiceAreas : [],
    publicWhatsApp: user.publicWhatsApp,
    publicInstagram: user.publicInstagram,
    website: profileConfig.website,
    specialties: profileConfig.specialties,
    yearsInBusiness: profileConfig.yearsInBusiness,
    verifiedPhoneVisible,
  });

  return {
    id: String(agencyProfile.id),
    name: String(agencyProfile.name || user.name || "Imobiliária"),
    phone: agencyProfile.phone ? String(agencyProfile.phone) : null,
    cnpj: String(agencyProfile.cnpj || ""),
    teamId: String(agencyProfile.teamId),
    team: agencyProfile.team
      ? {
          id: String(agencyProfile.team.id),
          name: String(agencyProfile.team.name),
        }
      : null,
    publicSlug: user.publicSlug ? String(user.publicSlug) : null,
    publicProfileEnabled: Boolean(user.publicProfileEnabled),
    publicProfilePath: getPublicProfilePathByRole({
      role: user.role,
      publicSlug: user.publicSlug,
      publicProfileEnabled: user.publicProfileEnabled,
    }),
    publicHeadline: user.publicHeadline ? String(user.publicHeadline) : null,
    publicBio: user.publicBio ? String(user.publicBio) : null,
    publicCity: user.publicCity ? String(user.publicCity) : null,
    publicState: user.publicState ? String(user.publicState) : null,
    publicServiceAreas: Array.isArray(user.publicServiceAreas)
      ? user.publicServiceAreas.map((item: unknown) => String(item))
      : [],
    publicWhatsApp: user.publicWhatsApp ? String(user.publicWhatsApp) : null,
    publicInstagram: user.publicInstagram ? String(user.publicInstagram) : null,
    website: profileConfig.website,
    specialties: profileConfig.specialties,
    yearsInBusiness: profileConfig.yearsInBusiness,
    primaryAgentUserId: profileConfig.primaryAgentUserId,
    playbookBuy: leadConfig.playbookBuy,
    playbookRent: leadConfig.playbookRent,
    playbookList: leadConfig.playbookList,
    routing: leadConfig.routing,
    verifiedPhoneVisible,
    completion,
    teamMembers: publicTeamMembers,
  };
}

export async function GET() {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const agencyProfile = await buildAgencyProfileResponse(String(userId));

    if (!agencyProfile) {
      return NextResponse.json({ error: "Perfil de agência não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, agencyProfile });
  } catch (error) {
    console.error("Error fetching agency profile:", error);
    return NextResponse.json({ error: "Não conseguimos carregar o perfil da agência." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = agencyProfilePatchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const [existingAgencyProfile, existingUser] = await Promise.all([
      (prisma as any).agencyProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          teamId: true,
          name: true,
          phone: true,
        },
      }),
      (prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          name: true,
          phone: true,
          phoneVerifiedAt: true,
          publicSlug: true,
          publicHeadline: true,
          publicBio: true,
          publicCity: true,
          publicState: true,
          publicServiceAreas: true,
          publicWhatsApp: true,
          publicInstagram: true,
          publicPhoneOptIn: true,
        },
      }),
    ]);

    if (!existingAgencyProfile || !existingUser) {
      return NextResponse.json({ error: "Perfil de agência não encontrado" }, { status: 404 });
    }

    const payload = parsed.data;
    const { profileConfig: existingProfileConfig, leadConfig: existingLeadConfig } = await getAgencyConfigs(
      String(existingAgencyProfile.teamId)
    );

    const eligibleRealtors = await (prisma as any).teamMember.findMany({
      where: {
        teamId: String(existingAgencyProfile.teamId),
        role: { in: ["OWNER", "AGENT"] },
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });
    const eligibleRealtorIds = (eligibleRealtors as any[])
      .filter((member) => member?.user?.role === "REALTOR")
      .map((member) => String(member.user.id));

    const preferredPrimaryAgentUserId = payload.primaryAgentUserId !== undefined
      ? payload.primaryAgentUserId
      : existingProfileConfig.primaryAgentUserId;
    if (preferredPrimaryAgentUserId && !eligibleRealtorIds.includes(String(preferredPrimaryAgentUserId))) {
      return NextResponse.json({ error: "O corretor principal precisa fazer parte do time da agência." }, { status: 400 });
    }

    const nextRouting = {
      buyRealtorId:
        payload.routing?.buyRealtorId !== undefined
          ? payload.routing.buyRealtorId
          : existingLeadConfig.routing.buyRealtorId,
      rentRealtorId:
        payload.routing?.rentRealtorId !== undefined
          ? payload.routing.rentRealtorId
          : existingLeadConfig.routing.rentRealtorId,
      listRealtorId:
        payload.routing?.listRealtorId !== undefined
          ? payload.routing.listRealtorId
          : existingLeadConfig.routing.listRealtorId,
    };

    for (const [key, value] of Object.entries(nextRouting)) {
      if (value && !eligibleRealtorIds.includes(String(value))) {
        return NextResponse.json({ error: `O responsável configurado em ${key} precisa fazer parte do time da agência.` }, { status: 400 });
      }
    }

    const normalizedCommercialPhone = payload.phone !== undefined ? normalizeAgencyPhone(payload.phone) : null;
    if (payload.phone !== undefined && normalizedCommercialPhone?.raw && !normalizedCommercialPhone.normalized) {
      return NextResponse.json({ error: "Informe um telefone comercial válido." }, { status: 400 });
    }

    const normalizedPublicWhatsApp = payload.publicWhatsApp !== undefined ? normalizeAgencyWhatsApp(payload.publicWhatsApp) : null;
    if (payload.publicWhatsApp !== undefined && normalizedPublicWhatsApp?.raw && !normalizedPublicWhatsApp.normalized) {
      return NextResponse.json({ error: "Informe um WhatsApp público válido." }, { status: 400 });
    }

    const agencyUpdateData: Record<string, unknown> = {};
    if (payload.name !== undefined) agencyUpdateData.name = payload.name;
    if (payload.phone !== undefined) agencyUpdateData.phone = normalizedCommercialPhone?.raw ?? null;

    const userUpdateData: Record<string, unknown> = {
      publicProfileEnabled: true,
    };

    if (!existingUser.publicSlug) {
      userUpdateData.publicSlug = await generateUniquePublicSlug(
        String(userId),
        (payload.name ?? existingAgencyProfile.name ?? existingUser.name ?? "agencia") as string,
        "agencia"
      );
    }

    if (payload.publicHeadline !== undefined) userUpdateData.publicHeadline = payload.publicHeadline;
    if (payload.publicBio !== undefined) userUpdateData.publicBio = payload.publicBio;
    if (payload.publicCity !== undefined) userUpdateData.publicCity = payload.publicCity;
    if (payload.publicState !== undefined) userUpdateData.publicState = payload.publicState;
    if (payload.publicServiceAreas !== undefined) userUpdateData.publicServiceAreas = payload.publicServiceAreas;
    if (payload.publicInstagram !== undefined) userUpdateData.publicInstagram = payload.publicInstagram;
    if (payload.publicWhatsApp !== undefined) userUpdateData.publicWhatsApp = normalizedPublicWhatsApp?.raw ?? null;

    const profileConfig = {
      website: payload.website !== undefined ? payload.website : existingProfileConfig.website,
      specialties: payload.specialties !== undefined ? payload.specialties : existingProfileConfig.specialties,
      yearsInBusiness:
        payload.yearsInBusiness !== undefined ? payload.yearsInBusiness : existingProfileConfig.yearsInBusiness,
      primaryAgentUserId: preferredPrimaryAgentUserId ?? null,
    };

    const leadConfig = {
      playbookBuy: payload.playbookBuy !== undefined ? payload.playbookBuy : existingLeadConfig.playbookBuy,
      playbookRent: payload.playbookRent !== undefined ? payload.playbookRent : existingLeadConfig.playbookRent,
      playbookList: payload.playbookList !== undefined ? payload.playbookList : existingLeadConfig.playbookList,
      routing: nextRouting,
    };

    const nameChanged = typeof agencyUpdateData.name === "string" && agencyUpdateData.name !== existingAgencyProfile.name;

    await (prisma as any).$transaction(async (tx: any) => {
      if (Object.keys(agencyUpdateData).length > 0) {
        await tx.agencyProfile.update({
          where: { id: existingAgencyProfile.id },
          data: agencyUpdateData,
          select: { id: true },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: userUpdateData,
        select: { id: true },
      });

      await upsertAgencyProfileConfig(tx, String(existingAgencyProfile.teamId), profileConfig, String(userId));
      await upsertAgencyPublicLeadConfig(tx, String(existingAgencyProfile.teamId), leadConfig, String(userId));

      if (nameChanged) {
        await tx.team.update({
          where: { id: existingAgencyProfile.teamId },
          data: { name: String(agencyUpdateData.name) },
          select: { id: true },
        });
      }
    });

    const agencyProfile = await buildAgencyProfileResponse(String(userId));
    return NextResponse.json({ success: true, agencyProfile });
  } catch (error) {
    console.error("Error updating agency profile:", error);
    return NextResponse.json({ error: "Não conseguimos salvar o perfil da agência." }, { status: 500 });
  }
}
