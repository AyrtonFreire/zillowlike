import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ModernNavbar from "@/components/modern/ModernNavbar";
import PropertyCardPremium from "@/components/modern/PropertyCardPremium";
import ReportUserButton from "@/components/ReportUserButton";
import {
  Star,
  MapPin,
  Phone,
  ShieldCheck,
  Clock,
  Home as HomeIcon,
  Building2,
  Users,
} from "lucide-react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const realtor = await (prisma as any).user.findFirst({
    where: {
      publicSlug: slug,
      publicProfileEnabled: true,
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
      title: "Profissional não encontrado | Zillowlike",
      description: "O perfil solicitado não está disponível.",
    };
  }

  const name = realtor.name || "Corretor";
  const location = realtor.publicCity && realtor.publicState
    ? `${realtor.publicCity}, ${realtor.publicState}`
    : undefined;

  return {
    title: `${name} | Perfil de corretor Zillowlike`,
    description:
      realtor.publicHeadline ||
      (location
        ? `Veja o perfil, imóveis e desempenho de ${name} em ${location} na Zillowlike.`
        : `Veja o perfil, imóveis e desempenho de ${name} na Zillowlike.`),
  };
}

export default async function RealtorPublicProfilePage({ params }: PageProps) {
  const { slug } = await params;

  const realtor = await (prisma as any).user.findFirst({
    where: {
      publicSlug: slug,
      publicProfileEnabled: true,
      role: { in: ["REALTOR", "AGENCY"] as any },
    },
    include: {
      stats: true,
      queue: true,
      realtorApplication: {
        select: {
          creci: true,
          creciState: true,
          specialties: true,
          realtorType: true,
        },
      },
      properties: {
        where: { status: "ACTIVE" as any },
        orderBy: { createdAt: "desc" },
        take: 12,
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

  const isAgency = realtor.role === "AGENCY";
  const name = realtor.name || (isAgency ? "Imobiliária" : "Corretor");
  const initial = name.charAt(0).toUpperCase();
  const headline = realtor.publicHeadline ||
    (isAgency
      ? "Imobiliária parceira da Zillowlike"
      : "Corretor parceiro da Zillowlike");
  const city = realtor.publicCity;
  const state = realtor.publicState;
  const locationLabel = city && state ? `${city}, ${state}` : undefined;

  const stats = realtor.stats;
  const totalActiveProperties = realtor.properties.length;

  const avgRating = stats?.avgRating || 0;
  const totalRatings = stats?.totalRatings || 0;
  const leadsAccepted = stats?.leadsAccepted || 0;
  const leadsCompleted = stats?.leadsCompleted || 0;
  const visitsCompleted = stats?.visitsCompleted || 0;
  const avgResponseTime = stats?.avgResponseTime || null;

  const participatesInLeadBoard = Boolean(realtor.queue);

  const app = (realtor as any).realtorApplication as
    | {
        creci?: string | null;
        creciState?: string | null;
        specialties?: string[] | null;
        realtorType?: string | null;
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
      <ModernNavbar />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        {/* Header / Hero */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-brand-gradient text-white shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 px-6 py-8 md:px-10 md:py-10">
              <div className="flex items-start gap-4 md:gap-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {realtor.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={realtor.image}
                      alt={name}
                      className="h-20 w-20 md:h-24 md:w-24 rounded-2xl border-2 border-white/40 object-cover shadow-md bg-white/10"
                    />
                  ) : (
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white/15 flex items-center justify-center text-3xl md:text-4xl font-semibold shadow-md">
                      {initial}
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                      {name}
                    </h1>
                    <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                      {isAgency ? (
                        <>
                          <Building2 className="mr-1.5 h-3.5 w-3.5" />
                          Imobiliária parceira
                        </>
                      ) : (
                        <>
                          <HomeIcon className="mr-1.5 h-3.5 w-3.5" />
                          Corretor parceiro
                        </>
                      )}
                    </span>
                    {participatesInLeadBoard && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-50 border border-emerald-300/50">
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        Programa Mural de Leads
                      </span>
                    )}
                  </div>

                  <p className="max-w-xl text-sm md:text-base text-white/85">
                    {headline}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-white/85">
                    {locationLabel && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {locationLabel}
                      </span>
                    )}
                    {avgRating > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-yellow-300" />
                        {avgRating.toFixed(1)}
                        <span className="opacity-80">
                          ({totalRatings} avaliação{totalRatings === 1 ? "" : "s"})
                        </span>
                      </span>
                    )}
                    {avgResponseTime != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {avgResponseTime} min tempo médio de resposta
                      </span>
                    )}
                    {realtor.publicPhoneOptIn && realtor.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-4 w-4" />
                        <span className="truncate max-w-[160px]">{realtor.phone}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <ReportUserButton userId={realtor.id} userDisplayName={name} />
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/15">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Imóveis ativos</span>
                    <HomeIcon className="h-4 w-4" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold">{totalActiveProperties}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/15">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Leads atendidos</span>
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold">{leadsAccepted}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/15">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Visitas concluídas</span>
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold">{visitsCompleted || leadsCompleted}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: About + Highlights */}
          <div className="space-y-6 lg:col-span-1">
            {/* Sobre o profissional */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Sobre o profissional</h2>
              {realtor.publicBio ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {realtor.publicBio}
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Este profissional ainda não preencheu uma bio pública. Mesmo assim, você pode conhecer o trabalho dele pelos
                  imóveis anunciados e pelo desempenho no programa da plataforma.
                </p>
              )}
            </section>

            {/* Indicadores resumidos */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Indicadores de desempenho</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Leads concluídos</div>
                  <div className="mt-0.5 text-xl font-semibold text-gray-900">{leadsCompleted}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Avaliações</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-gray-900">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-lg font-semibold">{avgRating > 0 ? avgRating.toFixed(1) : "N/A"}</span>
                    <span className="text-xs text-gray-500">
                      {totalRatings} avaliação{totalRatings === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                {avgResponseTime != null && (
                  <div>
                    <div className="text-xs text-gray-500">Tempo médio de resposta</div>
                    <div className="mt-0.5 text-xl font-semibold text-gray-900">{avgResponseTime} min</div>
                  </div>
                )}
                {participatesInLeadBoard && (
                  <div>
                    <div className="text-xs text-gray-500">Programa da fila</div>
                    <div className="mt-0.5 text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      Ativo no mural de leads
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right column: Properties */}
          <div className="lg:col-span-2">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Imóveis anunciados por {name}</h2>
                  <p className="text-sm text-gray-600">
                    Veja os imóveis ativos deste profissional. Você sempre navega e agenda visitas com segurança pela plataforma.
                  </p>
                </div>
              </div>

              {realtor.properties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-600">
                  <Building2 className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm">Nenhum imóvel ativo encontrado para este profissional no momento.</p>
                  <p className="text-xs text-gray-500 mt-1">Volte em breve para ver novos anúncios.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {realtor.properties.map((p: any) => (
                    <PropertyCardPremium
                      key={p.id}
                      property={{
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
                        type: p.type as any,
                        purpose: p.purpose as any,
                        images: p.images,
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

