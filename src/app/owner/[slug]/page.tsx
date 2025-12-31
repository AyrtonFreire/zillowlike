import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ModernNavbar from "@/components/modern/ModernNavbar";
import PropertyCardPremium from "@/components/modern/PropertyCardPremium";
import OwnerReviewsSection from "@/components/owner/OwnerReviewsSection";
import { Home as HomeIcon, User as UserIcon } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const owner = await (prisma as any).user.findFirst({
    where: {
      publicSlug: slug,
      publicProfileEnabled: true,
      role: { in: ["OWNER", "USER"] as any },
    },
    select: {
      name: true,
      publicCity: true,
      publicState: true,
    },
  });

  if (!owner) {
    return {
      title: "Anunciante não encontrado | Zillowlike",
      description: "O perfil solicitado não está disponível.",
    };
  }

  const displayName = buildOwnerDisplayName(owner.name);
  const location = owner.publicCity && owner.publicState
    ? `${owner.publicCity}, ${owner.publicState}`
    : undefined;

  return {
    title: `${displayName} | Anunciante Zillowlike`,
    description:
      location
        ? `Veja outros imóveis anunciados por ${displayName} em ${location} na Zillowlike.`
        : `Veja outros imóveis anunciados por este proprietário na Zillowlike.`,
  };
}

export default async function OwnerPublicProfilePage({ params }: PageProps) {
  const { slug } = await params;

  const owner = await (prisma as any).user.findFirst({
    where: {
      publicSlug: slug,
      publicProfileEnabled: true,
      role: { in: ["OWNER", "USER"] as any },
    },
    include: {
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

  if (!owner) {
    notFound();
  }

  const displayName = buildOwnerDisplayName(owner.name as string | null);
  const city = owner.publicCity as string | undefined;
  const state = owner.publicState as string | undefined;
  const locationLabel = city && state ? `${city}, ${state}` : undefined;
  const activeProperties = owner.properties as any[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <ModernNavbar forceLight />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-brand-gradient text-white shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 px-6 py-8 md:px-10 md:py-10">
              <div className="flex items-start gap-4 md:gap-6">
                <div className="relative flex-shrink-0">
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white/15 flex items-center justify-center text-3xl md:text-4xl font-semibold shadow-md">
                    <UserIcon className="h-10 w-10 text-white/90" />
                  </div>
                </div>

                <div className="space-y-2 md:space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                      {displayName}
                    </h1>
                    <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                      <HomeIcon className="mr-1.5 h-3.5 w-3.5" />
                      Proprietário verificado
                    </span>
                  </div>

                  <p className="max-w-xl text-sm md:text-base text-white/85">
                    Este é um perfil público discreto de anunciante. Usamos apelidos e não exibimos dados de contato
                    pessoais; toda a comunicação acontece pela plataforma.
                  </p>

                  {locationLabel && (
                    <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-white/85">
                      <span className="inline-flex items-center gap-1.5">
                        <HomeIcon className="h-4 w-4" />
                        {locationLabel}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-2 text-sm">
                <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/15">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Imóveis ativos</span>
                    <HomeIcon className="h-4 w-4" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold">{activeProperties.length}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/15">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Tipo de anunciante</span>
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    Pessoa física
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-8">
          <OwnerReviewsSection ownerId={owner.id} />
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Outros imóveis deste anunciante</h2>
              <p className="text-sm text-gray-600">
                Veja outros imóveis ativos anunciados por esta pessoa. O contato sempre acontece com segurança pela plataforma.
              </p>
            </div>
          </div>

          {activeProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-600">
              <HomeIcon className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm">Nenhum outro imóvel ativo encontrado para este anunciante no momento.</p>
              <p className="text-xs text-gray-500 mt-1">Volte em breve para ver novos anúncios.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              {activeProperties.map((p) => (
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
      </main>
    </div>
  );
}

function buildOwnerDisplayName(name: string | null | undefined): string {
  if (!name) return "Proprietário";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return `${parts[0][0]?.toUpperCase() || "P"}.`;
  }
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || "";
  return `${first} ${lastInitial}.`;
}
