import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ModernNavbar from "@/components/modern/ModernNavbar";
import RealtorPropertiesGrid from "@/components/RealtorPropertiesGrid";
import RealtorServiceAreasMap from "@/components/RealtorServiceAreasMap";
import RealtorSalesGallery from "@/components/RealtorSalesGallery";
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
  Instagram,
  Linkedin,
  Facebook,
  MessageCircle,
  Award,
  TrendingUp,
  CheckCircle,
  Briefcase,
  Target,
} from "lucide-react";

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
      role: { in: ["REALTOR", "AGENCY"] as any },
    },
    include: {
      stats: true,
      queue: true,
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

  // Redes sociais
  const instagram = realtor.publicInstagram;
  const linkedin = realtor.publicLinkedIn;
  const whatsapp = realtor.publicWhatsApp;
  const facebook = realtor.publicFacebook;
  const serviceAreas = realtor.publicServiceAreas || [];

  // Reviews
  const reviews = realtor.ratings || [];

  // Top Producer badge (mais de 50 leads concluídos)
  const isTopProducer = leadsCompleted >= 50;
  const isFastResponder = avgResponseTime != null && avgResponseTime <= 30;
  const isHighRated = avgRating >= 4.5 && totalRatings >= 5;

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

  const creciVerified = Boolean(app?.creci && app?.creciState);

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
                    {creciVerified && (
                      <span className="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-50 border border-green-300/50">
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        CRECI {app?.creci}/{app?.creciState}
                      </span>
                    )}
                    {participatesInLeadBoard && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-50 border border-emerald-300/50">
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        Mural de Leads
                      </span>
                    )}
                    {isTopProducer && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-50 border border-amber-300/50">
                        <Award className="mr-1.5 h-3.5 w-3.5" />
                        Top Producer
                      </span>
                    )}
                    {isFastResponder && (
                      <span className="inline-flex items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-50 border border-blue-300/50">
                        <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                        Resposta Rápida
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

                  {/* Redes sociais */}
                  {(instagram || linkedin || facebook || whatsapp) && (
                    <div className="flex items-center gap-2 mt-3">
                      {instagram && (
                        <a
                          href={`https://instagram.com/${instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          aria-label="Instagram"
                        >
                          <Instagram className="h-4 w-4" />
                        </a>
                      )}
                      {linkedin && (
                        <a
                          href={linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          aria-label="LinkedIn"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {facebook && (
                        <a
                          href={facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          aria-label="Facebook"
                        >
                          <Facebook className="h-4 w-4" />
                        </a>
                      )}
                      {whatsapp && (
                        <a
                          href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 hover:bg-green-500/30 transition-colors text-xs font-medium"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
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
                {app?.experience != null && (
                  <div>
                    <div className="text-xs text-gray-500">Experiência</div>
                    <div className="mt-0.5 text-xl font-semibold text-gray-900 flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      {app.experience} ano{app.experience === 1 ? "" : "s"}
                    </div>
                  </div>
                )}
              </div>
            </section>

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
            <RealtorServiceAreasMap areas={serviceAreas} city={city} state={state} />

            {/* Avaliações de clientes */}
            {reviews.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Avaliações de clientes
                </h2>
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        {review.lead?.user?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={review.lead.user.image}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-medium">
                            {review.lead?.user?.name?.charAt(0) || "?"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-900 text-sm truncate">
                              {review.lead?.user?.name || "Cliente"}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3.5 w-3.5 ${
                                    star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                          )}
                          <span className="text-xs text-gray-400 mt-1 block">
                            {new Date(review.createdAt).toLocaleDateString("pt-BR", {
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {reviews.length > 5 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    +{reviews.length - 5} avaliação{reviews.length - 5 === 1 ? "" : "s"}
                  </p>
                )}
              </section>
            )}

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
                      <MessageCircle className="h-5 w-5" />
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
            {/* Galeria de vendas realizadas */}
            <RealtorSalesGallery 
              properties={soldProperties.map((p: any) => ({
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
            />

            {/* Grid de imóveis ativos */}
            <RealtorPropertiesGrid 
              properties={realtor.properties.map((p: any) => ({
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
              }))}
              realtorName={name}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

