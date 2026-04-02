import { prisma } from "@/lib/prisma";
import {
  getAgencyConfigs,
  getAgencyProfileCompletion,
  getRoutingTargetByIntent,
} from "@/lib/agency-profile";
import { getPublicProfilePathByRole } from "@/lib/public-profile";
import { normalizePhoneE164 } from "@/lib/sms";

type PublicProperty = {
  id: string;
  title: string;
  price: number | null;
  type: string;
  inCondominium?: boolean | null;
  purpose: string | null;
  city: string;
  state: string;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  parkingSpots: number | null;
  yearBuilt: number | null;
  condoFee: number | null;
  iptuYearly: number | null;
  furnished: boolean | null;
  petFriendly: boolean | null;
  petsSmall: boolean | null;
  petsLarge: boolean | null;
  hasPool: boolean | null;
  hasGym: boolean | null;
  hasElevator: boolean | null;
  hasBalcony: boolean | null;
  hasPlayground: boolean | null;
  hasPartyRoom: boolean | null;
  hasGourmet: boolean | null;
  hasConcierge24h: boolean | null;
  comfortAC: boolean | null;
  comfortHeating: boolean | null;
  comfortSolar: boolean | null;
  comfortNoiseWindows: boolean | null;
  comfortLED: boolean | null;
  comfortWaterReuse: boolean | null;
  accRamps: boolean | null;
  accWideDoors: boolean | null;
  accAccessibleElevator: boolean | null;
  accTactile: boolean | null;
  finishCabinets: boolean | null;
  finishCounterGranite: boolean | null;
  finishCounterQuartz: boolean | null;
  viewSea: boolean | null;
  viewCity: boolean | null;
  viewRiver: boolean | null;
  viewLake: boolean | null;
  conditionTags: string[];
  createdAt: string;
  updatedAt: string;
  leadsCount: number;
  viewsCount: number;
  images: { url: string }[];
};

type LandingRealtor = {
  id: string;
  name: string;
  role: "REALTOR" | "AGENCY";
  publicSlug: string | null;
  image: string | null;
  publicHeadline: string | null;
  publicBio: string | null;
  publicCity: string | null;
  publicState: string | null;
  publicServiceAreas: string[];
  publicWhatsApp: string | null;
  publicPhoneOptIn: boolean;
  phoneVerified: boolean;
  phone: string | null;
  instagram: string | null;
  linkedin: string | null;
  avgRating: number;
  totalRatings: number;
  avgResponseTime: number | null;
  experience: number | null;
  soldCount: number;
  rentedCount: number;
  lastActivity: string | null;
  team: { id: string; name: string } | null;
  creci: string | null;
  creciState: string | null;
};

type AgencyLandingExtras = {
  website: string | null;
  specialties: string[];
  yearsInBusiness: number | null;
  serviceAreas: string[];
  completion: {
    score: number;
    checklist: Array<{ key: string; label: string; done: boolean }>;
  };
  teamMembers: Array<{
    id: string;
    name: string;
    image: string | null;
    headline: string | null;
    publicSlug: string | null;
    whatsappHref: string | null;
  }>;
  ctaCards: Array<{
    key: string;
    intent: "BUY" | "RENT" | "LIST";
    title: string;
    description: string;
    actionLabel: string;
    href: string | null;
    contactName: string | null;
    helper: string | null;
  }>;
  operationMetrics: Array<{
    label: string;
    value: string;
    helper: string;
  }>;
};

type PublicProfessionalPageData = {
  metadata: {
    title: string;
    description: string;
    canonicalPath: string;
  };
  jsonLdBase: {
    name: string;
    image: string | null;
    telephone: string | undefined;
    city: string | null;
    state: string | null;
    locationLabel: string | undefined;
    avgRating: number;
    totalRatings: number;
    serviceType: string | undefined;
    identifier: string | undefined;
    description: string;
  };
  landing: {
    realtor: LandingRealtor;
    properties: PublicProperty[];
    initialRatingsPreview: Array<{
      id: string;
      rating: number;
      comment: string | null;
      createdAt: string;
      authorName: string | null;
      authorImage: string | null;
    }>;
    agencyProfile: AgencyLandingExtras | null;
  };
};

function normalizePhoneDigits(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = normalizePhoneE164(raw);
  if (normalized) return normalized.replace(/^\+/, "");
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

function buildWhatsAppHref(phone: string | null | undefined, message: string) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function formatResponseTimeLabel(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "Em operação";
  const minutes = Math.max(0, Math.round(Number(value)));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest.toString().padStart(2, "0")}m` : `${hours}h`;
}

export async function getPublicProfessionalPageData(slug: string): Promise<PublicProfessionalPageData | null> {
  const realtor = await prisma.user.findFirst({
    where: {
      OR: [{ publicSlug: slug }, { id: slug }],
      role: { in: ["REALTOR", "AGENCY"] },
    },
    include: {
      stats: true,
      ratings: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          lead: {
            select: {
              user: {
                select: {
                  name: true,
                  image: true,
                },
              },
              createdAt: true,
            },
          },
        },
      },
      realtorApplication: {
        select: {
          creci: true,
          creciState: true,
          creciExpiry: true,
          specialties: true,
          realtorType: true,
          experience: true,
        },
      },
      agencyProfile: {
        select: {
          name: true,
          teamId: true,
          team: { select: { id: true, name: true } },
        },
      },
      teamMemberships: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          teamId: true,
          team: { select: { id: true, name: true } },
        },
      },
      ownedTeams: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!realtor) return null;

  const teamFromAgency = (realtor as any)?.agencyProfile?.team || null;
  const teamFromMembership = (realtor as any)?.teamMemberships?.[0]?.team || null;
  const teamFromOwned = (realtor as any)?.ownedTeams?.[0] || null;
  const resolvedTeam = teamFromAgency || teamFromMembership || teamFromOwned;
  const resolvedTeamId = resolvedTeam?.id ? String(resolvedTeam.id) : null;

  const basePropertyWhere = resolvedTeamId ? ({ teamId: resolvedTeamId } as const) : ({ ownerId: realtor.id } as const);
  const inventoryWhere = { ...(basePropertyWhere as any), status: "ACTIVE" as any };

  const [soldCount, rentedCount] = await Promise.all([
    prisma.property.count({ where: { ...(basePropertyWhere as any), status: "SOLD" as any } }),
    prisma.property.count({ where: { ...(basePropertyWhere as any), status: "RENTED" as any } }),
  ]);

  const [lastRespondedLead, lastUpdatedProperty] = await Promise.all([
    prisma.lead.findFirst({
      where: {
        realtorId: realtor.id,
        respondedAt: { not: null },
      },
      orderBy: { respondedAt: "desc" },
      select: { respondedAt: true },
    }),
    prisma.property.findFirst({
      where: basePropertyWhere as any,
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const lastActivityDate = (() => {
    const a = (lastRespondedLead as any)?.respondedAt ? new Date((lastRespondedLead as any).respondedAt) : null;
    const b = (lastUpdatedProperty as any)?.updatedAt ? new Date((lastUpdatedProperty as any).updatedAt) : null;
    if (a && b) return a.getTime() >= b.getTime() ? a : b;
    return a || b;
  })();

  let inventory: any[] = [];
  try {
    inventory = await (prisma as any).property.findMany({
      where: inventoryWhere as any,
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: {
        id: true,
        title: true,
        price: true,
        type: true,
        inCondominium: true,
        purpose: true,
        city: true,
        state: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
        bedrooms: true,
        bathrooms: true,
        areaM2: true,
        parkingSpots: true,
        yearBuilt: true,
        condoFee: true,
        iptuYearly: true,
        furnished: true,
        petFriendly: true,
        petsSmall: true,
        petsLarge: true,
        hasPool: true,
        hasGym: true,
        hasElevator: true,
        hasBalcony: true,
        hasPlayground: true,
        hasPartyRoom: true,
        hasGourmet: true,
        hasConcierge24h: true,
        comfortAC: true,
        comfortHeating: true,
        comfortSolar: true,
        comfortNoiseWindows: true,
        comfortLED: true,
        comfortWaterReuse: true,
        accRamps: true,
        accWideDoors: true,
        accAccessibleElevator: true,
        accTactile: true,
        finishCabinets: true,
        finishCounterGranite: true,
        finishCounterQuartz: true,
        viewSea: true,
        viewCity: true,
        positionFront: true,
        positionBack: true,
        conditionTags: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            views: true,
            leads: true,
          },
        },
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
          select: { url: true },
        },
      },
    });
  } catch (err: any) {
    if (err?.code !== "P2022" || !String(err?.message || "").includes("inCondominium")) {
      throw err;
    }

    inventory = await (prisma as any).property.findMany({
      where: inventoryWhere as any,
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: {
        id: true,
        title: true,
        price: true,
        type: true,
        purpose: true,
        city: true,
        state: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
        bedrooms: true,
        bathrooms: true,
        areaM2: true,
        parkingSpots: true,
        yearBuilt: true,
        condoFee: true,
        iptuYearly: true,
        furnished: true,
        petFriendly: true,
        petsSmall: true,
        petsLarge: true,
        hasPool: true,
        hasGym: true,
        hasElevator: true,
        hasBalcony: true,
        hasPlayground: true,
        hasPartyRoom: true,
        hasGourmet: true,
        hasConcierge24h: true,
        comfortAC: true,
        comfortHeating: true,
        comfortSolar: true,
        comfortNoiseWindows: true,
        comfortLED: true,
        comfortWaterReuse: true,
        accRamps: true,
        accWideDoors: true,
        accAccessibleElevator: true,
        accTactile: true,
        finishCabinets: true,
        finishCounterGranite: true,
        finishCounterQuartz: true,
        viewSea: true,
        viewCity: true,
        positionFront: true,
        positionBack: true,
        conditionTags: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            views: true,
            leads: true,
          },
        },
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
          select: { url: true },
        },
      },
    });
  }

  const isAgency = realtor.role === "AGENCY";
  const agencyName = isAgency ? String((realtor as any)?.agencyProfile?.name || realtor.name || "Imobiliária") : null;
  const name = isAgency ? agencyName || "Imobiliária" : realtor.name || "Corretor";
  const headline = realtor.publicHeadline || (isAgency ? "Imobiliária no OggaHub" : "Corretor no OggaHub");
  const city = realtor.publicCity || null;
  const state = realtor.publicState || null;
  const locationLabel = city && state ? `${city}, ${state}` : undefined;

  const stats = (realtor as any).stats;
  const avgRating = stats?.avgRating || 0;
  const totalRatings = stats?.totalRatings || 0;
  const avgResponseTime = (stats as any)?.avgResponseTime != null ? Number((stats as any).avgResponseTime) : null;

  const app = (realtor as any).realtorApplication as
    | {
        creci?: string | null;
        creciState?: string | null;
        specialties?: string[] | null;
        experience?: number | null;
      }
    | null
    | undefined;

  const properties: PublicProperty[] = (inventory || []).map((p: any) => ({
    id: String(p.id),
    title: String(p.title),
    price: p.price != null ? Number(p.price) : null,
    type: p.type != null ? String(p.type) : "",
    inCondominium: p.inCondominium != null ? Boolean(p.inCondominium) : null,
    purpose: p.purpose != null ? String(p.purpose) : null,
    city: String(p.city),
    state: String(p.state),
    neighborhood: p.neighborhood != null ? String(p.neighborhood) : null,
    latitude: p.latitude != null ? Number(p.latitude) : null,
    longitude: p.longitude != null ? Number(p.longitude) : null,
    bedrooms: p.bedrooms != null ? Number(p.bedrooms) : null,
    bathrooms: p.bathrooms != null ? Number(p.bathrooms) : null,
    areaM2: p.areaM2 != null ? Number(p.areaM2) : null,
    parkingSpots: p.parkingSpots != null ? Number(p.parkingSpots) : null,
    yearBuilt: p.yearBuilt != null ? Number(p.yearBuilt) : null,
    condoFee: p.condoFee != null ? Number(p.condoFee) : null,
    iptuYearly: p.iptuYearly != null ? Number(p.iptuYearly) : null,
    furnished: p.furnished != null ? Boolean(p.furnished) : null,
    petFriendly: p.petFriendly != null ? Boolean(p.petFriendly) : null,
    petsSmall: p.petsSmall != null ? Boolean(p.petsSmall) : null,
    petsLarge: p.petsLarge != null ? Boolean(p.petsLarge) : null,
    hasPool: p.hasPool != null ? Boolean(p.hasPool) : null,
    hasGym: p.hasGym != null ? Boolean(p.hasGym) : null,
    hasElevator: p.hasElevator != null ? Boolean(p.hasElevator) : null,
    hasBalcony: p.hasBalcony != null ? Boolean(p.hasBalcony) : null,
    hasPlayground: p.hasPlayground != null ? Boolean(p.hasPlayground) : null,
    hasPartyRoom: p.hasPartyRoom != null ? Boolean(p.hasPartyRoom) : null,
    hasGourmet: p.hasGourmet != null ? Boolean(p.hasGourmet) : null,
    hasConcierge24h: p.hasConcierge24h != null ? Boolean(p.hasConcierge24h) : null,
    comfortAC: p.comfortAC != null ? Boolean(p.comfortAC) : null,
    comfortHeating: p.comfortHeating != null ? Boolean(p.comfortHeating) : null,
    comfortSolar: p.comfortSolar != null ? Boolean(p.comfortSolar) : null,
    comfortNoiseWindows: p.comfortNoiseWindows != null ? Boolean(p.comfortNoiseWindows) : null,
    comfortLED: p.comfortLED != null ? Boolean(p.comfortLED) : null,
    comfortWaterReuse: p.comfortWaterReuse != null ? Boolean(p.comfortWaterReuse) : null,
    accRamps: p.accRamps != null ? Boolean(p.accRamps) : null,
    accWideDoors: p.accWideDoors != null ? Boolean(p.accWideDoors) : null,
    accAccessibleElevator: p.accAccessibleElevator != null ? Boolean(p.accAccessibleElevator) : null,
    accTactile: p.accTactile != null ? Boolean(p.accTactile) : null,
    finishCabinets: p.finishCabinets != null ? Boolean(p.finishCabinets) : null,
    finishCounterGranite: p.finishCounterGranite != null ? Boolean(p.finishCounterGranite) : null,
    finishCounterQuartz: p.finishCounterQuartz != null ? Boolean(p.finishCounterQuartz) : null,
    viewSea: p.viewSea != null ? Boolean(p.viewSea) : null,
    viewCity: p.viewCity != null ? Boolean(p.viewCity) : null,
    viewRiver: p.positionFront != null ? Boolean(p.positionFront) : null,
    viewLake: p.positionBack != null ? Boolean(p.positionBack) : null,
    conditionTags: Array.isArray(p.conditionTags) ? p.conditionTags.map((x: any) => String(x)) : [],
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
    leadsCount: Number(p?._count?.leads || 0),
    viewsCount: Number(p?._count?.views || 0),
    images: Array.isArray(p.images) ? p.images.map((img: any) => ({ url: String(img.url) })) : [],
  }));

  const initialRatingsPreview = ((realtor as any).ratings || []).map((r: any) => ({
    id: String(r.id),
    rating: Number(r.rating || 0),
    comment: r.comment != null ? String(r.comment) : null,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    authorName: r?.lead?.user?.name != null ? String(r.lead.user.name) : null,
    authorImage: r?.lead?.user?.image != null ? String(r.lead.user.image) : null,
  }));

  let agencyProfile: AgencyLandingExtras | null = null;
  if (isAgency && resolvedTeamId) {
    const [{ profileConfig, leadConfig }, teamMembers] = await Promise.all([
      getAgencyConfigs(String(resolvedTeamId)),
      (prisma as any).teamMember.findMany({
        where: {
          teamId: String(resolvedTeamId),
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

    const publicMembers = (teamMembers as any[])
      .filter((member) => member?.user?.role === "REALTOR")
      .map((member) => {
        const whatsappPhone = member.user?.publicWhatsApp || (member.user?.phoneVerifiedAt ? member.user?.phone : null);
        return {
          id: String(member.user.id),
          name: String(member.user.name || "Corretor"),
          image: member.user.image ? String(member.user.image) : null,
          headline: member.user.publicHeadline ? String(member.user.publicHeadline) : null,
          publicSlug: member.user.publicSlug ? String(member.user.publicSlug) : null,
          publicWhatsApp: whatsappPhone ? String(whatsappPhone) : null,
          whatsappHref: buildWhatsAppHref(
            whatsappPhone ? String(whatsappPhone) : null,
            `Olá! Vim do perfil público da ${name} no OggaHub e quero falar com você.`
          ),
        };
      });

    const publicServiceAreas = Array.isArray(realtor.publicServiceAreas)
      ? realtor.publicServiceAreas.map((item) => String(item)).filter(Boolean)
      : [];
    const verifiedPhoneVisible = Boolean(realtor.publicPhoneOptIn && realtor.phoneVerifiedAt && realtor.phone);
    const completion = getAgencyProfileCompletion({
      logoUrl: realtor.image,
      publicHeadline: realtor.publicHeadline,
      publicBio: realtor.publicBio,
      publicCity: realtor.publicCity,
      publicState: realtor.publicState,
      publicServiceAreas: publicServiceAreas,
      publicWhatsApp: realtor.publicWhatsApp,
      publicInstagram: realtor.publicInstagram,
      website: profileConfig.website,
      specialties: profileConfig.specialties,
      yearsInBusiness: profileConfig.yearsInBusiness,
      verifiedPhoneVisible,
    });

    const membersById = new Map(publicMembers.map((member) => [member.id, member]));
    const fallbackMember =
      (profileConfig.primaryAgentUserId ? membersById.get(String(profileConfig.primaryAgentUserId)) : null) || publicMembers[0] || null;
    const buildIntentCard = (intent: "BUY" | "RENT" | "LIST") => {
      const routedMember = membersById.get(String(getRoutingTargetByIntent(leadConfig, intent) || "")) || fallbackMember;
      const titleMap = {
        BUY: "Comprar com apoio consultivo",
        RENT: "Encontrar aluguel com agilidade",
        LIST: "Anunciar imóvel com a agência",
      };
      const actionMap = {
        BUY: "Falar sobre compra",
        RENT: "Falar sobre aluguel",
        LIST: "Quero anunciar",
      };
      const descriptionMap = {
        BUY: "Receba atendimento direcionado para entender perfil, faixa e regiões com aderência.",
        RENT: "Converse com o time sobre bairros, orçamento e timing da locação.",
        LIST: "Abra a conversa comercial certa para avaliação, posicionamento e divulgação do imóvel.",
      };
      const playbook =
        intent === "BUY"
          ? leadConfig.playbookBuy
          : intent === "RENT"
            ? leadConfig.playbookRent
            : leadConfig.playbookList;
      const message = `${playbook}\n\nOrigem: perfil público da agência ${name} no OggaHub.\nIntenção: ${intent}.`;
      return {
        key: intent.toLowerCase(),
        intent,
        title: titleMap[intent],
        description: descriptionMap[intent],
        actionLabel: actionMap[intent],
        href: buildWhatsAppHref(routedMember?.publicWhatsApp || null, message),
        contactName: routedMember?.name || null,
        helper: routedMember ? `Direcionado para ${routedMember.name}` : "Canal ainda não configurado pela agência",
      };
    };

    agencyProfile = {
      website: profileConfig.website,
      specialties: profileConfig.specialties,
      yearsInBusiness: profileConfig.yearsInBusiness,
      serviceAreas: publicServiceAreas,
      completion,
      teamMembers: publicMembers.map((member) => ({
        id: member.id,
        name: member.name,
        image: member.image,
        headline: member.headline,
        publicSlug: member.publicSlug,
        whatsappHref: member.whatsappHref,
      })),
      ctaCards: [buildIntentCard("BUY"), buildIntentCard("RENT"), buildIntentCard("LIST")],
      operationMetrics: [
        {
          label: "Carteira pública",
          value: String(properties.length),
          helper: "Imóveis ativos publicados pela agência na plataforma.",
        },
        {
          label: "Resposta média",
          value: formatResponseTimeLabel(avgResponseTime),
          helper: "Baseado no histórico operacional visível do perfil.",
        },
        {
          label: "Cobertura",
          value: publicServiceAreas.length > 0 ? `${publicServiceAreas.length} regiões` : locationLabel || "Em expansão",
          helper: "Regiões declaradas pela agência para atendimento comercial.",
        },
      ],
    };
  }

  const canonicalPath =
    getPublicProfilePathByRole({
      role: realtor.role,
      publicSlug: realtor.publicSlug,
      publicProfileEnabled: realtor.publicProfileEnabled,
    }) || (isAgency ? `/agencia/${slug}` : `/realtor/${slug}`);

  return {
    metadata: {
      title: isAgency ? `${name} | Perfil da agência OggaHub` : `${name} | Perfil de corretor OggaHub`,
      description:
        realtor.publicHeadline ||
        (locationLabel
          ? `Veja o perfil, imóveis e atendimento de ${name} em ${locationLabel} no OggaHub.`
          : `Veja o perfil, imóveis e atendimento de ${name} no OggaHub.`),
      canonicalPath,
    },
    jsonLdBase: {
      name,
      image: realtor.image || null,
      telephone: realtor.publicPhoneOptIn && realtor.phoneVerifiedAt && realtor.phone ? realtor.phone : undefined,
      city,
      state,
      locationLabel,
      avgRating: Number(avgRating || 0),
      totalRatings: Number(totalRatings || 0),
      serviceType:
        app?.specialties && app.specialties.length > 0
          ? app.specialties.join(", ")
          : agencyProfile?.specialties && agencyProfile.specialties.length > 0
            ? agencyProfile.specialties.join(", ")
            : undefined,
      identifier: app?.creci ? String(app.creci) : undefined,
      description: headline,
    },
    landing: {
      realtor: {
        id: String(realtor.id),
        name,
        role: realtor.role as "REALTOR" | "AGENCY",
        publicSlug: realtor.publicSlug ? String(realtor.publicSlug) : null,
        image: realtor.image || null,
        publicHeadline: realtor.publicHeadline || null,
        publicBio: realtor.publicBio || null,
        publicCity: realtor.publicCity || null,
        publicState: realtor.publicState || null,
        publicServiceAreas: Array.isArray(realtor.publicServiceAreas)
          ? realtor.publicServiceAreas.map((x) => String(x))
          : [],
        publicWhatsApp: realtor.publicWhatsApp || null,
        publicPhoneOptIn: Boolean(realtor.publicPhoneOptIn),
        phoneVerified: Boolean(realtor.phoneVerifiedAt),
        phone: realtor.phone || null,
        instagram: realtor.publicInstagram || null,
        linkedin: realtor.publicLinkedIn || null,
        avgRating: Number(avgRating || 0),
        totalRatings: Number(totalRatings || 0),
        avgResponseTime,
        experience: app?.experience != null ? Number(app.experience) : null,
        soldCount: Number(soldCount || 0),
        rentedCount: Number(rentedCount || 0),
        lastActivity: lastActivityDate ? lastActivityDate.toISOString() : null,
        team: resolvedTeam?.id && resolvedTeam?.name
          ? { id: String(resolvedTeam.id), name: String(resolvedTeam.name) }
          : null,
        creci: app?.creci || null,
        creciState: app?.creciState || null,
      },
      properties,
      initialRatingsPreview,
      agencyProfile,
    },
  };
}
