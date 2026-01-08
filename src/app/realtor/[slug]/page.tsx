import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ModernNavbar from "@/components/modern/ModernNavbar";
import RealtorServiceAreasMap from "@/components/RealtorServiceAreasMap";
import CorretorHeader from "@/components/realtor/CorretorHeader";
import IndicadoresConfianca from "@/components/realtor/IndicadoresConfianca";
import SobreCorretor from "@/components/realtor/SobreCorretor";
import ListaImoveis from "@/components/realtor/ListaImoveis";
import RealtorReviewsSection from "@/components/realtor/RealtorReviewsSection";
import SeloAtividade from "@/components/realtor/SeloAtividade";
import { Phone, Star, Target } from "lucide-react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const realtor = await (prisma as any).user.findFirst({
    where: {
      publicSlug: slug,
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
      publicSlug: slug,
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
      properties: {
        where: { status: "ACTIVE" as any },
        orderBy: { createdAt: "desc" },
        take: 24,
        select: {
          id: true,
          title: true,
          price: true,
          city: true,
          state: true,
          bedrooms: true,
          bathrooms: true,
          areaM2: true,
          neighborhood: true,
          parkingSpots: true,
          conditionTags: true,
          type: true,
          purpose: true,
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
      },
    },
  });

  if (!realtor) {
    notFound();
  }

  // Buscar imóveis vendidos/alugados separadamente
  const soldProperties = await (prisma as any).property.findMany({
    where: {
      ownerId: realtor.id,
      status: { in: ["SOLD", "RENTED"] as any },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      price: true,
      city: true,
      state: true,
      neighborhood: true,
      type: true,
      purpose: true,
      status: true,
      updatedAt: true,
      images: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      },
    },
  });

  const isAgency = realtor.role === "AGENCY";
  const name = realtor.name || (isAgency ? "Imobiliária" : "Corretor");
  const headline = realtor.publicHeadline ||
    (isAgency
      ? "Imobiliária no OggaHub"
      : "Corretor no OggaHub");
  const city = realtor.publicCity;
  const state = realtor.publicState;
  const locationLabel = city && state ? `${city}, ${state}` : undefined;

  const stats = realtor.stats;
  const totalActiveProperties = realtor.properties.length;

  const avgRating = stats?.avgRating || 0;
  const totalRatings = stats?.totalRatings || 0;
  const avgResponseTime = stats?.avgResponseTime || null;

  const lastProResponseAt = ([] as any[]).reduce(
    (max: Date | null, row: any) => {
      const d = row?.createdAt ? new Date(row.createdAt) : null;
      if (!d || Number.isNaN(d.getTime())) return max;
      if (!max) return d;
      return d > max ? d : max;
    },
    null as Date | null
  );

  const lastPropertyUpdateAt = (realtor.properties || []).reduce(
    (max: Date | null, p: any) => {
      const d = p?.updatedAt ? new Date(p.updatedAt) : null;
      if (!d || Number.isNaN(d.getTime())) return max;
      if (!max) return d;
      return d > max ? d : max;
    },
    null as Date | null
  );

  const lastActivityAt = (() => {
    if (lastProResponseAt && lastPropertyUpdateAt) {
      return lastProResponseAt > lastPropertyUpdateAt ? lastProResponseAt : lastPropertyUpdateAt;
    }
    return lastProResponseAt || lastPropertyUpdateAt || null;
  })();

  const completedDeals = await (prisma as any).lead.count({
    where: {
      realtorId: realtor.id,
      pipelineStage: "WON" as any,
    },
  });

  const activeSince = (realtor as any).createdAt as Date;

  const cityForBench = city || null;
  let benchmarkConversionRate: number | null = null;
  let benchmarkLeadsTop20Threshold: number | null = null;
  const benchmarkPricePerM2ByGroup = new Map<string, number>();

  if (cityForBench) {
    const cityProperties = await (prisma as any).property.findMany({
      where: { city: cityForBench, status: "ACTIVE" },
      select: {
        id: true,
        type: true,
        neighborhood: true,
        price: true,
        areaM2: true,
        _count: { select: { views: true, leads: true } },
      },
      take: 2000,
      orderBy: { createdAt: "desc" },
    });

    const cityCounts = (cityProperties || []).map((p: any) => Number(p?._count?.leads || 0));
    const sortedCounts = [...cityCounts].sort((a, b) => a - b);
    if (sortedCounts.length >= 5) {
      const idx = Math.min(sortedCounts.length - 1, Math.max(0, Math.ceil(sortedCounts.length * 0.8) - 1));
      const threshold = sortedCounts[idx];
      benchmarkLeadsTop20Threshold = threshold > 0 ? threshold : null;
    }

    const totals = (cityProperties || []).reduce(
      (acc: { leads: number; views: number }, p: any) => {
        acc.leads += Number(p?._count?.leads || 0);
        acc.views += Number(p?._count?.views || 0);
        return acc;
      },
      { leads: 0, views: 0 }
    );
    benchmarkConversionRate = totals.views > 0 ? totals.leads / totals.views : null;

    const priceGroups = await (prisma as any).property.groupBy({
      by: ["type", "neighborhood"],
      where: {
        city: cityForBench,
        status: "ACTIVE",
        areaM2: { gt: 0 },
      },
      _avg: { price: true, areaM2: true },
    });

    for (const g of priceGroups || []) {
      const avgPrice = Number((g as any)?._avg?.price || 0);
      const avgArea = Number((g as any)?._avg?.areaM2 || 0);
      if (!avgPrice || !avgArea) continue;
      const bench = (avgPrice / 100) / avgArea;
      if (!bench || Number.isNaN(bench)) continue;
      const key = `${String((g as any).type)}:${String((g as any).neighborhood || "")}`;
      benchmarkPricePerM2ByGroup.set(key, bench);
    }
  }

  // Redes sociais
  const instagram = realtor.publicInstagram;
  const linkedin = realtor.publicLinkedIn;
  const whatsapp = realtor.publicWhatsApp;
  const facebook = realtor.publicFacebook;
  const serviceAreas = realtor.publicServiceAreas || [];

  // Reviews
  const reviews = realtor.ratings || [];

  // Top Producer badge (mais de 50 leads concluídos)
  const isTopProducer = completedDeals >= 50;
  const isFastResponder = avgResponseTime != null && avgResponseTime <= 30;

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdAgent) }}
      />
      <ModernNavbar forceLight />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        <CorretorHeader
          realtorId={realtor.id}
          name={name}
          isAgency={isAgency}
          image={realtor.image}
          headline={headline}
          locationLabel={locationLabel}
          avgRating={avgRating}
          totalRatings={totalRatings}
          avgResponseTime={avgResponseTime}
          publicPhoneOptIn={Boolean(realtor.publicPhoneOptIn)}
          phone={realtor.phone}
          instagram={instagram}
          linkedin={linkedin}
          facebook={facebook}
          whatsapp={whatsapp}
          creci={app?.creci || null}
          creciState={app?.creciState || null}
          isTopProducer={isTopProducer}
          isFastResponder={isFastResponder}
          totalActiveProperties={totalActiveProperties}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: About + Highlights */}
          <div className="space-y-6 lg:col-span-1">
            <SobreCorretor
              bio={realtor.publicBio}
              specialties={app?.specialties || null}
              city={city}
              state={state}
              headline={realtor.publicHeadline}
            />

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Selo de atividade</h2>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-700">Status</div>
                <SeloAtividade lastActivity={lastActivityAt} />
              </div>
            </section>

            <IndicadoresConfianca
              avgRating={avgRating}
              totalRatings={totalRatings}
              completedDeals={completedDeals}
              activeSince={activeSince}
            />

            {/* Especialidades */}
            {app?.specialties && app.specialties.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Especialidades
                </h2>
                <div className="flex flex-wrap gap-2">
                  {app.specialties.map((spec: string) => (
                    <span
                      key={spec}
                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Mapa de atuação */}
            <RealtorServiceAreasMap areas={serviceAreas} city={city ?? undefined} state={state ?? undefined} />

            {/* Botões de contato direto (sticky no mobile) */}
            {(realtor.publicPhoneOptIn && realtor.phone || whatsapp) && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Entre em contato</h2>
                <div className="space-y-3">
                  {whatsapp && (
                    <a
                      href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors"
                    >
                      <Phone className="h-5 w-5" />
                      Conversar no WhatsApp
                    </a>
                  )}
                  {realtor.publicPhoneOptIn && realtor.phone && (
                    <a
                      href={`tel:${realtor.phone.replace(/\D/g, '')}`}
                      className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-semibold transition-colors"
                    >
                      <Phone className="h-5 w-5" />
                      Ligar: {realtor.phone}
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right column: Properties */}
          <div className="lg:col-span-2 space-y-6">
            <ListaImoveis
              realtorName={name}
              soldProperties={soldProperties.map((p: any) => ({
                id: p.id,
                title: p.title,
                price: p.price,
                city: p.city,
                state: p.state,
                neighborhood: p.neighborhood,
                type: p.type,
                purpose: p.purpose,
                status: p.status,
                soldAt: p.updatedAt?.toISOString(),
                images: p.images,
              }))}
              activeProperties={realtor.properties.map((p: any) => {
                const groupKey = `${String(p.type)}:${String(p.neighborhood || "")}`;
                const benchPrice = benchmarkPricePerM2ByGroup.get(groupKey) || null;
                return {
                  id: p.id,
                  title: p.title,
                  price: p.price,
                  city: p.city,
                  state: p.state,
                  bedrooms: p.bedrooms ?? undefined,
                  bathrooms: p.bathrooms != null ? Number(p.bathrooms) : undefined,
                  areaM2: p.areaM2 ?? undefined,
                  neighborhood: p.neighborhood ?? undefined,
                  parkingSpots: p.parkingSpots ?? undefined,
                  conditionTags: p.conditionTags ?? [],
                  type: p.type,
                  purpose: p.purpose,
                  images: p.images,
                  createdAt: p.createdAt,
                  viewsCount: p._count?.views,
                  leadsCount: p._count?.leads,
                  benchmarkPricePerM2: benchPrice,
                  benchmarkConversionRate: benchmarkConversionRate,
                  benchmarkLeadsTop20Threshold: benchmarkLeadsTop20Threshold,
                };
              })}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

