import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TopNavMega from "@/components/TopNavMega";
import PropertyCardPremium from "@/components/modern/PropertyCardPremium";
import { MapPin, MessageCircle } from "lucide-react";
import { buildPropertyPath } from "@/lib/slug";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ExploreRecommendationsPage({ params }: PageProps) {
  const { token } = await params;

  const now = new Date();

  const list = await (prisma as any).leadRecommendationList.findUnique({
    where: { token },
    include: {
      lead: {
        select: {
          id: true,
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              state: true,
              neighborhood: true,
              price: true,
              images: {
                take: 1,
                orderBy: { sortOrder: "asc" },
                select: { url: true },
              },
            },
          },
        },
      },
      realtor: {
        select: {
          id: true,
          name: true,
          publicSlug: true,
          publicCity: true,
          publicState: true,
          publicWhatsApp: true,
          publicPhoneOptIn: true,
          phone: true,
        },
      },
    },
  });

  const isExpired = !list || (list as any).expiresAt < now;

  let orderedProperties: Array<{
    id: string;
    title: string;
    price: number | null;
    city: string;
    state: string;
    neighborhood: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    areaM2: number | null;
    type: string | null;
    purpose: "SALE" | "RENT" | null;
    parkingSpots: number | null;
    conditionTags: string[];
    images: { url: string }[];
  }> = [];

  if (!isExpired) {
    const listAny = list as any;
    const ids: string[] = Array.isArray(listAny.propertyIds) ? listAny.propertyIds : [];

    if (ids.length > 0) {
      const properties = await prisma.property.findMany({
        where: {
          id: { in: ids },
        },
        select: {
          id: true,
          title: true,
          price: true,
          city: true,
          state: true,
          neighborhood: true,
          bedrooms: true,
          bathrooms: true,
          areaM2: true,
          type: true,
          purpose: true,
          parkingSpots: true,
          conditionTags: true,
          owner: {
            select: {
              id: true,
              name: true,
              image: true,
              publicSlug: true,
              role: true,
            },
          },
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
            select: { url: true },
          },
        },
      });

      const map = new Map(properties.map((p) => [p.id, p]));
      orderedProperties = ids
        .map((id) => map.get(id))
        .filter(Boolean)
        .map((p: any) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          city: p.city,
          state: p.state,
          neighborhood: p.neighborhood ?? null,
          bedrooms: p.bedrooms ?? null,
          bathrooms: p.bathrooms != null ? Number(p.bathrooms) : null,
          areaM2: p.areaM2 ?? null,
          type: p.type ?? null,
          purpose: (p.purpose as any) ?? null,
          parkingSpots: p.parkingSpots ?? null,
          conditionTags: Array.isArray(p.conditionTags) ? p.conditionTags : [],
          images: p.images || [],
          owner: p.owner || null,
        }));
    }
  }

  const baseProperty = !isExpired && list?.lead?.property ? (list.lead.property as any) : null;
  const realtor = !isExpired && list?.realtor ? (list.realtor as any) : null;

  const createdAtLabel = !isExpired && (list as any).createdAt
    ? new Date((list as any).createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  const expiresAtLabel = !isExpired && (list as any).expiresAt
    ? new Date((list as any).expiresAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
  const realtorProfileUrl = realtor?.publicSlug ? `${siteUrl}/realtor/${realtor.publicSlug}` : null;

  const title = !isExpired && (list as any).title
    ? (list as any).title
    : "Imóveis selecionados especialmente para você";

  const message = !isExpired && (list as any).message ? (list as any).message : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <TopNavMega />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8">
        {isExpired ? (
          <div className="max-w-xl mx-auto mt-10 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Este link não está mais disponível</h1>
            <p className="text-gray-600 mb-4 text-sm">
              O link de imóveis que você recebeu expirou ou não está mais ativo. Se ainda tiver interesse, você pode
              pedir um novo link diretamente ao profissional que te enviou.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
            >
              Voltar para a página inicial
            </Link>
          </div>
        ) : (
          <>
            <section className="mb-8">
              <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-500 text-white shadow-lg overflow-hidden">
                <div className="px-6 py-7 md:px-10 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-3 md:space-y-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/80 font-semibold">
                      Lista personalizada de imóveis
                    </p>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight max-w-2xl">{title}</h1>
                    {message && (
                      <p className="text-sm md:text-base text-white/90 max-w-2xl whitespace-pre-line">{message}</p>
                    )}
                    {baseProperty && (
                      <p className="text-xs md:text-sm text-white/85 flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px] mr-0.5">
                          •
                        </span>
                        Baseada no imóvel:
                        <Link
                          href={buildPropertyPath(baseProperty.id, baseProperty.title)}
                          className="underline underline-offset-2 font-medium hover:text-yellow-100"
                        >
                          {baseProperty.title}
                        </Link>
                        <span className="opacity-80">
                          {baseProperty.neighborhood ? ` · ${baseProperty.neighborhood}` : ""} · {baseProperty.city}/
                          {baseProperty.state}
                        </span>
                      </p>
                    )}
                    {(createdAtLabel || expiresAtLabel) && (
                      <p className="text-xs text-white/75">
                        {createdAtLabel && <span>Lista criada em {createdAtLabel}</span>}
                        {createdAtLabel && expiresAtLabel && <span> · </span>}
                        {expiresAtLabel && <span>Válida até {expiresAtLabel}</span>}
                      </p>
                    )}
                  </div>

                  {realtor && (
                    <div className="w-full md:w-auto md:min-w-[260px]">
                      <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 md:px-5 md:py-4 backdrop-blur">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/80 font-semibold mb-1">
                          Profissional responsável
                        </p>
                        <p className="text-base md:text-lg font-semibold leading-tight">
                          {realtor.name || "Corretor parceiro"}
                        </p>
                        {(realtor.publicCity || realtor.publicState) && (
                          <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>
                              {realtor.publicCity}
                              {realtor.publicCity && realtor.publicState ? ", " : ""}
                              {realtor.publicState}
                            </span>
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {realtor.publicWhatsApp && (
                            <a
                              href={`https://wa.me/${String(realtor.publicWhatsApp).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold shadow-sm hover:bg-green-600"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Falar no WhatsApp
                            </a>
                          )}
                          {realtorProfileUrl && (
                            <Link
                              href={realtorProfileUrl}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium text-white hover:bg-white/20 border border-white/30"
                            >
                              Ver perfil completo
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section>
              {orderedProperties.length === 0 ? (
                <div className="max-w-xl mx-auto mt-6 rounded-2xl border border-dashed border-gray-300 bg-white/60 p-6 text-center">
                  <p className="text-sm text-gray-700 mb-1 font-medium">Ainda não há imóveis nesta lista</p>
                  <p className="text-xs text-gray-500">
                    Pode ser que eles tenham sido removidos ou estejam temporariamente indisponíveis. Se precisar, fale com o
                    profissional que te enviou o link.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
                  {orderedProperties.map((p) => (
                    <Link key={p.id} href={buildPropertyPath(p.id, p.title)} className="block group">
                      <PropertyCardPremium
                        property={{
                          id: p.id,
                          title: p.title,
                          price: p.price ?? undefined,
                          images: p.images,
                          city: p.city,
                          state: p.state,
                          bedrooms: p.bedrooms ?? undefined,
                          bathrooms: p.bathrooms ?? undefined,
                          areaM2: p.areaM2 ?? undefined,
                          isFeatured: false,
                          type: p.type ?? undefined,
                          purpose: p.purpose ?? undefined,
                          neighborhood: p.neighborhood ?? undefined,
                          parkingSpots: p.parkingSpots ?? undefined,
                          conditionTags: p.conditionTags,
                        }}
                        watermark
                      />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
