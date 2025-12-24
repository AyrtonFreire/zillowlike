import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ModernNavbar from "@/components/modern/ModernNavbar";
import RealtorServiceAreasMap from "@/components/RealtorServiceAreasMap";
import SobreCorretor from "@/components/realtor/SobreCorretor";
import IndicadoresConfianca from "@/components/realtor/IndicadoresConfianca";
import CorretorHeader from "@/components/realtor/CorretorHeader";
import ListaImoveis from "@/components/realtor/ListaImoveis";
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

  const realtor = await prisma.user.findFirst({
    where: {
      publicSlug: slug,
      role: { in: ["REALTOR", "AGENCY"] },
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
          createdAt: true,
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

  const activeLeads = typeof realtor.queue?.activeLeads === "number"
    ? realtor.queue.activeLeads
    : await (prisma as any).lead.count({
        where: {
          realtorId: realtor.id,
          status: {
            in: [
              "WAITING_REALTOR_ACCEPT",
              "WAITING_OWNER_APPROVAL",
              "CONFIRMED",
              "ACCEPTED",
              "RESERVED",
            ] as any,
          },
        },
      });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const responseCandidates = await (prisma as any).lead.findMany({
    where: {
      realtorId: realtor.id,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      createdAt: true,
      respondedAt: true,
    },
    take: 250,
    orderBy: { createdAt: "desc" },
  });

  const nowMs = Date.now();
  const longestResponseTimeMinutes = responseCandidates.reduce((max: number | null, lead: { createdAt: Date; respondedAt: Date | null }) => {
    const start = new Date(lead.createdAt).getTime();
    const end = lead.respondedAt ? new Date(lead.respondedAt).getTime() : nowMs;
    const minutes = Math.max(0, Math.floor((end - start) / 60000));
    if (max == null) return minutes;
    return Math.max(max, minutes);
  }, null);

  const completedDeals = await (prisma as any).lead.count({
    where: {
      realtorId: realtor.id,
      pipelineStage: "WON" as any,
    },
  });

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
      <ModernNavbar />

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
          participatesInLeadBoard={participatesInLeadBoard}
          creci={app?.creci || null}
          creciState={app?.creciState || null}
          isTopProducer={isTopProducer}
          isFastResponder={isFastResponder}
          totalActiveProperties={totalActiveProperties}
          leadsAccepted={leadsAccepted}
          leadsCompleted={leadsCompleted}
          visitsCompleted={visitsCompleted}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: About + Highlights */}
          <div className="space-y-6 lg:col-span-1">
            <SobreCorretor bio={realtor.publicBio} />

            {participatesInLeadBoard && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Atividade no programa</h2>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-700">Status na fila</div>
                  <SeloAtividade status={realtor.queue?.status} lastActivity={realtor.queue?.lastActivity} />
                </div>
              </section>
            )}

            <IndicadoresConfianca
              activeProperties={totalActiveProperties}
              activeLeads={activeLeads}
              longestResponseTimeMinutes={longestResponseTimeMinutes}
              avgRating={avgRating}
              totalRatings={totalRatings}
              completedDeals={completedDeals}
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
              activeProperties={realtor.properties.map((p: any) => ({
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
              }))}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

