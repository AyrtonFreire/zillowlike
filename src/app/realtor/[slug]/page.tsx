import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import RealtorPublicLandingClient from "@/components/realtor/RealtorPublicLandingClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const runtime = "nodejs";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const realtor = await (prisma as any).user.findFirst({
    where: {
      OR: [{ publicSlug: slug }, { id: slug }],
      role: { in: ["REALTOR", "AGENCY"] as any },
    },
    select: {
      name: true,
      publicHeadline: true,
      publicCity: true,
      publicState: true,
    },
  });

  if (!realtor) {
    return {
      title: "Profissional não encontrado | OggaHub",
      description: "O perfil solicitado não está disponível.",
    };
  }

  const name = realtor.name || "Corretor";
  const location = realtor.publicCity && realtor.publicState
    ? `${realtor.publicCity}, ${realtor.publicState}`
    : undefined;

  return {
    title: `${name} | Perfil de corretor OggaHub`,
    description:
      realtor.publicHeadline ||
      (location
        ? `Veja o perfil, imóveis e desempenho de ${name} em ${location} no OggaHub.`
        : `Veja o perfil, imóveis e desempenho de ${name} no OggaHub.`),
  };
}

export default async function RealtorPublicProfilePage({ params }: PageProps) {
  const { slug } = await params;

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

  if (!realtor) {
    notFound();
  }

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

  const inventory = await (prisma as any).property.findMany({
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

  const isAgency = realtor.role === "AGENCY";
  const name = realtor.name || (isAgency ? "Imobiliária" : "Corretor");
  const headline = realtor.publicHeadline || (isAgency ? "Imobiliária no OggaHub" : "Corretor no OggaHub");
  const city = realtor.publicCity;
  const state = realtor.publicState;
  const locationLabel = city && state ? `${city}, ${state}` : undefined;

  const stats = realtor.stats;
  const avgRating = stats?.avgRating || 0;
  const totalRatings = stats?.totalRatings || 0;
  const avgResponseTime = (stats as any)?.avgResponseTime != null ? Number((stats as any).avgResponseTime) : null;

  const app = (realtor as any).realtorApplication as
    | {
        creci?: string | null;
        creciState?: string | null;
        creciExpiry?: Date | null;
        specialties?: string[] | null;
        realtorType?: string | null;
        experience?: number | null;
      }
    | null
    | undefined;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
  const pageUrl = `${siteUrl}/realtor/${slug}`;

  const properties = (inventory || []).map((p: any) => ({
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

  const jsonLdAgent = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name,
    url: pageUrl,
    image: realtor.image || undefined,
    telephone: realtor.publicPhoneOptIn && realtor.phone ? realtor.phone : undefined,
    address: locationLabel
      ? {
          "@type": "PostalAddress",
          addressLocality: city,
          addressRegion: state,
        }
      : undefined,
    areaServed: locationLabel
      ? {
          "@type": "City",
          name: `${city}/${state}`,
        }
      : undefined,
    aggregateRating:
      avgRating > 0 && totalRatings > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            ratingCount: totalRatings,
          }
        : undefined,
    serviceType:
      app?.specialties && app.specialties.length > 0
        ? app.specialties.join(", ")
        : undefined,
    identifier:
      app?.creci
        ? {
            "@type": "PropertyValue",
            name: "CRECI",
            value: app.creci,
          }
        : undefined,
    description: headline,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdAgent) }}
      />

      <RealtorPublicLandingClient
        siteUrl={siteUrl}
        pageUrl={pageUrl}
        realtor={{
          id: String(realtor.id),
          name,
          role: realtor.role as any,
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
        }}
        properties={properties}
        initialRatingsPreview={initialRatingsPreview}
      />
    </>
  );
}

