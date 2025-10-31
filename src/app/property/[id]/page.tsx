import { prisma } from "@/lib/prisma";
import MapClient from "@/components/MapClient";
import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import GalleryCarousel from "@/components/GalleryCarousel";
import ContactForm from "@/components/ContactForm";
import FavoriteButton from "../../../components/FavoriteButton";
import FinancingButton from "@/components/FinancingButton";
import FinancingModal from "@/components/FinancingModal";
import StatCard from "@/components/StatCard";
import StickyActions from "@/components/StickyActions";
import PropertyStickyHeader from "@/components/PropertyStickyHeader";
import FeatureChips from "@/components/FeatureChips";
import { ptBR, amenitiesFromProperty } from "@/lib/i18n/property";
import ReadMore from "@/components/ReadMore";
import AgentModule from "@/components/AgentModule";
import SimilarCarousel from "@/components/SimilarCarousel";


type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      city: true,
      state: true,
      price: true,
      street: true,
      postalCode: true,
      latitude: true,
      longitude: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });

  if (!property) {
    return {
      title: "Imóvel não encontrado",
      description: "O imóvel solicitado não foi encontrado.",
    };
  }

  const firstImage = property.images[0]?.url || "";
  const title = `${property.title} | Zillowlike`;

  // JSON-LD Structured Data
  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": property.title,
    "description": property.description,
    "image": property.images.map(img => img.url),
    "offers": {
      "@type": "Offer",
      "price": typeof property.price === 'number' && property.price > 0 ? (property.price / 100).toFixed(2) : undefined,
      "priceCurrency": "BRL",
      "availability": "https://schema.org/InStock",
      "url": `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/property/${id}/${property.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')}`
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": property.street,
      "addressLocality": property.city,
      "addressRegion": property.state,
      "postalCode": property.postalCode || undefined
    },
    "geo": property.latitude && property.longitude ? {
      "@type": "GeoCoordinates",
      "latitude": property.latitude,
      "longitude": property.longitude
    } : undefined
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001" },
      { "@type": "ListItem", "position": 2, "name": `${property.city}, ${property.state}`, "item": `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/?city=${encodeURIComponent(property.city)}&state=${encodeURIComponent(property.state)}` },
      { "@type": "ListItem", "position": 3, "name": property.title, "item": `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/property/${id}/${property.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')}` }
    ]
  };

  const description = `${property.description.slice(0, 160)}${property.description.length > 160 ? "..." : ""}`;
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const slug = property.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const url = `${base}/property/${id}/${slug}`;
  const image = property.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PropertyPage({ params }: PageProps) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: { 
      images: { orderBy: { sortOrder: "asc" } },
      owner: { select: { phone: true } },
    },
  });

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Imóvel não encontrado</h1>
          <p className="text-gray-600 mb-6">O imóvel que você está procurando não existe ou foi removido.</p>
          <Link href="/" className="inline-flex items-center px-6 py-3 glass-teal text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
            ← Voltar à busca
          </Link>
        </div>
      </div>
    );
  }

  const items = [
    {
      id: property.id,
      price: property.price,
      latitude: property.latitude,
      longitude: property.longitude,
    },
  ];

  const hasGeo = typeof property.latitude === 'number' && typeof property.longitude === 'number';
  let nearby: Array<{ id: string; title: string; price: number; city: string; state: string; latitude: number | null; longitude: number | null; image?: string; distanceKm?: number; }>
    = [];
  if (hasGeo) {
    const lat = property.latitude as number;
    const lng = property.longitude as number;
    const radiusKm = 10;
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    const candidates = await prisma.property.findMany({
      where: {
        id: { not: property.id },
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
        status: { in: ["ACTIVE", "PUBLISHED"] as any },
      },
      select: {
        id: true,
        title: true,
        price: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
      take: 24,
    });
    nearby = candidates
      .map((p) => {
        const d = distanceKm(lat, lng, p.latitude ?? 0, p.longitude ?? 0);
        return { id: p.id, title: p.title, price: p.price, city: p.city, state: p.state, latitude: p.latitude, longitude: p.longitude, image: p.images[0]?.url, distanceKm: d };
      })
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
      .slice(0, 6);
  } else {
    const candidates = await prisma.property.findMany({
      where: { id: { not: property.id }, city: property.city, state: property.state, status: { in: ["ACTIVE", "PUBLISHED"] as any } },
      select: { id: true, title: true, price: true, city: true, state: true, latitude: true, longitude: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } },
      take: 6,
    });
    nearby = candidates.map((p) => ({ id: p.id, title: p.title, price: p.price, city: p.city, state: p.state, latitude: p.latitude, longitude: p.longitude, image: p.images[0]?.url }));
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    priceCurrency: 'BRL',
    price: (property.price / 100).toFixed(2),
    availability: 'https://schema.org/InStock',
    url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001') + `/property/${property.id}`,
    itemOffered: {
      '@type': 'Product',
      name: property.title,
      description: property.description,
      image: property.images?.[0]?.url,
      brand: {
        '@type': 'Brand',
        name: 'Zillowlike'
      }
    },
    areaServed: {
      '@type': 'City',
      name: `${property.city}/${property.state}`
    }
  };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '');
  const pageUrl = `${siteUrl}/property/${property.id}`;
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""; // e.g. 5599999999999
  const scheduleHref = `/property/${property.id}/schedule-visit?pref=${encodeURIComponent(nextDay1530())}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PropertyStickyHeader
        title={property.title}
        priceCents={property.price}
        image={property.images?.[0]?.url}
        scheduleHref={scheduleHref}
        propertyId={property.id}
        pageUrl={pageUrl}
      />
      {/* Header */}
      <div className="bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200">
            ← Voltar à busca
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <button onClick={async()=>{ try { if (navigator.share) await navigator.share({ title: property.title, url: pageUrl }); else await navigator.clipboard.writeText(pageUrl); } catch{} }} className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">Compartilhar</button>
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse no imóvel: ${property.title} - ${pageUrl}`)}`} target="_blank" className="px-3 py-2 rounded-lg text-sm text-green-700 hover:bg-green-50">WhatsApp</a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header/Card */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Gallery */}
              {property.images.length > 0 && (
                <div className="relative">
                  <GalleryCarousel images={property.images.map(i=>({ url: i.url, alt: i.alt || property.title, blurDataURL: (i as any).blurDataURL }))} title={property.title} />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <FavoriteButton propertyId={property.id} />
                    <button aria-label="Compartilhar este imóvel" title="Compartilhar" onClick={async()=>{ try { if (navigator.share) await navigator.share({ title: property.title, url: pageUrl }); else await navigator.clipboard.writeText(pageUrl); } catch{} }} className="p-2 rounded-full bg-white/90 hover:bg-white shadow">
                      <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14"/></svg>
                    </button>
                  </div>
                </div>
              )}
              <div className="p-6 md:p-8">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-block glass-teal text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-100">
                    {property.type === 'HOUSE' ? 'Casa' : property.type === 'APARTMENT' ? 'Apartamento' : property.type === 'CONDO' ? 'Condomínio' : property.type === 'TOWNHOUSE' ? 'Sobrado' : property.type === 'STUDIO' ? 'Studio' : property.type === 'LAND' ? 'Terreno' : property.type === 'COMMERCIAL' ? 'Comercial' : property.type}
                  </span>
                  {property as any && (property as any).purpose && (
                    <span className="inline-block glass-teal text-purple-700 text-xs font-semibold px-3 py-1 rounded-full border border-purple-100">
                      {(property as any).purpose === 'RENT' ? 'Aluguel' : 'Venda'}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">{property.title}</h1>
                <div className="flex items-center text-gray-600 mb-5">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                  <span>{property.street}{property.neighborhood ? ", " + property.neighborhood : ""} - {property.city}/{property.state}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="text-4xl md:text-5xl font-extrabold text-blue-700">R$ {(property.price / 100).toLocaleString('pt-BR')}</div>
                      {property.status && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${property.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : property.status === 'PAUSED' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : property.status === 'DRAFT' ? 'bg-gray-50 text-gray-700 border-gray-200' : (property.status === 'SOLD' || property.status === 'RENTED') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {property.status === 'ACTIVE' ? 'Ativo' : property.status === 'PAUSED' ? 'Reservado' : property.status === 'DRAFT' ? 'Rascunho' : property.status === 'SOLD' ? 'Vendido' : property.status === 'RENTED' ? 'Alugado' : String(property.status)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Publicado em {new Date(property.createdAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <FinancingButton propertyId={property.id} propertyValue={property.price} />
                    <FinancingModal amountCents={property.price} />
                    {whatsapp && (
                      <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse no imóvel: ${property.title} - ${pageUrl}`)}`} target="_blank" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium shadow">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.77 11.77 0 0012 0C5.37 0 0 5.37 0 12a11.9 11.9 0 001.62 6L0 24l6.1-1.6A11.9 11.9 0 0012 24c6.63 0 12-5.37 12-12 0-3.14-1.22-6.09-3.48-8.52zM12 22a9.9 9.9 0 01-5.05-1.4l-.36-.2-3 .78.8-2.92-.2-.37A10 10 0 1122 12 10 10 0 0112 22zm5.47-7.6c-.3-.16-1.77-.87-2.04-.96-.27-.1-.47-.16-.68.16-.2.3-.78.96-.96 1.16-.18.2-.36.22-.66.08-.3-.16-1.29-.48-2.47-1.53-.91-.77-1.52-1.73-1.7-2.02-.18-.3-.02-.46.14-.62.15-.14.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.54-.08-.16-.68-1.63-.93-2.23-.24-.58-.5-.5-.68-.5h-.58c-.2 0-.5.08-.76.38-.27.3-1 1-1 2.44 0 1.43 1.02 2.82 1.16 3.02.15.2 2.02 3.07 4.9 4.3.68.3 1.2.48 1.6.62.68.22 1.3.18 1.78.1.54-.08 1.78-.72 2.03-1.42.25-.7.25-1.3.18-1.42-.07-.12-.27-.2-.57-.36z"/></svg>
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
                {/* Stat Cards */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {property.bedrooms != null && (
                    <StatCard icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M5 12V7a2 2 0 012-2h10a2 2 0 012 2v5"/></svg>} label="Quartos" value={property.bedrooms} />
                  )}
                  {property.bathrooms != null && (
                    <StatCard icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 10V6a2 2 0 012-2h6a2 2 0 012 2v4"/></svg>} label="Banheiros" value={Number(property.bathrooms)} />
                  )}
                  {property.areaM2 != null && (
                    <StatCard icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v18H3z"/></svg>} label="Área" value={property.areaM2} unit="m²" />
                  )}
                  {(property as any)?.suites != null && (
                    <StatCard icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M5 12V7a2 2 0 012-2h10a2 2 0 012 2v5"/></svg>} label="Suítes" value={(property as any).suites} />
                  )}
                  {property.parkingSpots != null && (
                    <StatCard icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16l3-9h12l3 9M5 16h14M7 16v2m10-2v2"/></svg>} label="Vagas" value={property.parkingSpots} />
                  )}
                </div>
              </div>
            </div>

            {/* Highlights & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Destaques deste imóvel</h2>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const amen = amenitiesFromProperty(property as any);
                    const tags = Array.isArray(property.conditionTags) ? property.conditionTags : [];
                    const all = [...tags, ...amen];
                    if (all.length === 0) return <span className="text-sm text-gray-600">Sem destaques informados.</span>;
                    return all.map((label, i) => (
                      <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-sm text-gray-700">
                        <span>🏷️</span>{label}
                      </span>
                    ));
                  })()}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Características</h2>
                <FeatureChips
                  items={[
                    ...(property.bedrooms != null ? [{ icon: '🛏️', label: `${property.bedrooms} quartos` }] : []),
                    ...(property.bathrooms != null ? [{ icon: '🛁', label: `${Number(property.bathrooms)} banheiros` }] : []),
                    ...(property.areaM2 != null ? [{ icon: '📐', label: `${property.areaM2} m²` }] : []),
                    ...(property.parkingSpots != null ? [{ icon: '🚗', label: `${property.parkingSpots} vagas` }] : []),
                    ...(property.furnished ? [{ icon: '🛋️', label: 'Mobiliado' }] : []),
                    ...(property.petFriendly ? [{ icon: '🐾', label: 'Aceita pets' }] : []),
                    ...(property.condoFee != null ? [{ icon: '🏢', label: `Condomínio R$ ${Number(property.condoFee).toLocaleString('pt-BR')}` }] : []),
                    ...(property.yearBuilt != null ? [{ icon: '📅', label: `Construído em ${property.yearBuilt}` }] : []),
                    ...((property as any)?.yearRenovated != null ? [{ icon: '🛠️', label: `Reformado em ${(property as any).yearRenovated}` }] : []),
                    ...((property as any)?.finishFloor ? [{ icon: '🧱', label: `Piso ${ptBR.finishFloor((property as any).finishFloor)}` }] : []),
                    ...((property as any)?.sunOrientation ? [{ icon: '🌞', label: ptBR.sunOrientation((property as any).sunOrientation) }] : []),
                    ...((property as any)?.totalFloors != null ? [{ icon: '🏢', label: `Total de andares ${(property as any).totalFloors}` }] : []),
                    ...((property as any)?.floor != null ? [{ icon: '⬆️', label: `Andar ${(property as any).floor}` }] : []),
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Vista & Posição</h2>
                <div className="flex flex-wrap gap-2">
                  {((property as any)?.viewSea || (property as any)?.viewCity || (property as any)?.positionFront || (property as any)?.positionBack || (property as any)?.sunByRoomNote) ? (
                    <>
                      {(property as any)?.viewSea && <Chip icon="🌊" label="Vista para o mar" />}
                      {(property as any)?.viewCity && <Chip icon="🏙️" label="Vista para a cidade" />}
                      {(property as any)?.positionFront && <Chip icon="➡️" label="Frente" />}
                      {(property as any)?.positionBack && <Chip icon="⬅️" label="Fundos" />}
                      {(property as any)?.sunByRoomNote && <Chip icon="📝" label={(property as any).sunByRoomNote} />}
                    </>
                  ) : <span className="text-sm text-gray-600">Sem informações de vista/posição.</span>}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Políticas</h2>
                <div className="flex flex-wrap gap-2">
                  {((property as any)?.petsSmall || (property as any)?.petsLarge || (property as any)?.condoRules) ? (
                    <>
                      {(property as any)?.petsSmall && <Chip icon="🐾" label="Aceita pets pequenos" />}
                      {(property as any)?.petsLarge && <Chip icon="🐾" label="Aceita pets grandes" />}
                      {(property as any)?.condoRules && <Chip icon="📜" label={(property as any).condoRules} />}
                    </>
                  ) : <span className="text-sm text-gray-600">Sem políticas informadas.</span>}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Sobre este imóvel</h2>
              <ReadMore text={property.description} maxChars={360} />
            </div>

            {nearby.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Imóveis próximos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearby.map((n) => (
                    <Link prefetch={false} key={n.id} href={`/property/${n.id}`} className="group rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-white transition-all shadow-sm hover:shadow-md">
                      {n.image && (
                        <Image src={n.image} alt={n.title} width={640} height={360} className="h-40 w-full object-cover" />
                      )}
                      <div className="p-3">
                        <div className="text-sm text-gray-600">{n.city}/{n.state}{typeof n.distanceKm === 'number' ? ` · ${n.distanceKm.toFixed(1)} km` : ''}</div>
                        <div className="font-semibold text-gray-900 line-clamp-1">{n.title}</div>
                        <div className="text-blue-700 font-bold">R$ {(n.price/100).toLocaleString('pt-BR')}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <StickyActions
              priceCents={property.price}
              scheduleHref={scheduleHref}
              phone={(property as any)?.owner?.phone ?? null}
              whatsapp={whatsapp || null}
              financingHint={{ perMonth: Math.max(1, Math.round((property.price/100) / 240)), lender: 'Caixa', rateLabel: '10.5% a.a.' }}
            />
            <AgentModule agent={{ name: "Zillowlike Imóveis", email: "contato@zillowlike.com", phone: whatsapp, whatsapp, verified: true }} />
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Localização</h3>
              </div>
              <div className="h-80">
                <MapClient items={items} hideRefitButton />
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Interessado?</h3>
              <p className="text-gray-600 mb-4">Envie uma mensagem e retornaremos rapidamente.</p>
              <div className="flex flex-col gap-3">
                <ContactForm propertyId={property.id} />
                {whatsapp && (
                  <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Tenho interesse no imóvel: ${property.title} - ${pageUrl}`)}`} target="_blank" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium shadow">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.77 11.77 0 0012 0C5.37 0 0 5.37 0 12a11.9 11.9 0 001.62 6L0 24l6.1-1.6A11.9 11.9 0 0012 24c6.63 0 12-5.37 12-12 0-3.14-1.22-6.09-3.48-8.52zM12 22a9.9 9.9 0 01-5.05-1.4l-.36-.2-3 .78.8-2.92-.2-.37A10 10 0 1122 12 10 10 0 0112 22zm5.47-7.6c-.3-.16-1.77-.87-2.04-.96-.27-.1-.47-.16-.68.16-.2.3-.78.96-.96 1.16-.18.2-.36.22-.66.08-.3-.16-1.29-.48-2.47-1.53-.91-.77-1.52-1.73-1.7-2.02-.18-.3-.02-.46.14-.62.15-.14.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.54-.08-.16-.68-1.63-.93-2.23-.24-.58-.5-.5-.68-.5h-.58c-.2 0-.5.08-.76.38-.27.3-1 1-1 2.44 0 1.43 1.02 2.82 1.16 3.02.15.2 2.02 3.07 4.9 4.3.68.3 1.2.48 1.6.62.68.22 1.3.18 1.78.1.54-.08 1.78-.72 2.03-1.42.25-.7.25-1.3.18-1.42-.07-.12-.27-.2-.57-.36z"/></svg>
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações</h3>
              <div className="space-y-3">
                <InfoRow k="Tipo" v={property.type === 'HOUSE' ? 'Casa' : property.type === 'APARTMENT' ? 'Apartamento' : property.type === 'CONDO' ? 'Condomínio' : property.type === 'TOWNHOUSE' ? 'Sobrado' : property.type === 'STUDIO' ? 'Studio' : property.type === 'LAND' ? 'Terreno' : property.type === 'COMMERCIAL' ? 'Comercial' : property.type} />
                <InfoRow k="Cidade" v={property.city} />
                <InfoRow k="Estado" v={property.state} />
                {property.postalCode && <InfoRow k="CEP" v={property.postalCode} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Properties Carousel */}
      {nearby.length > 0 && (
        <SimilarCarousel
          properties={nearby.map(n => ({
            id: n.id,
            title: n.title,
            price: n.price,
            city: n.city,
            state: n.state,
            images: n.image ? [{ url: n.image }] : [],
            bedrooms: null,
            bathrooms: null,
            areaM2: null
          }))}
        />
      )}

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 md:hidden bg-white/90 backdrop-blur border-t p-3 flex items-center justify-between pb-[max(env(safe-area-inset-bottom),12px)]">
        <div>
          <div className="text-sm text-gray-600">A partir de</div>
          <div className="text-xl font-bold text-blue-700">R$ {(property.price/100).toLocaleString('pt-BR')}</div>
        </div>
        <div className="flex gap-2">
          <Link prefetch={false} href={`/property/${property.id}/schedule-visit?pref=${encodeURIComponent(nextDay1530())}`} className="px-4 py-2 rounded-lg glass-teal text-white font-medium shadow">Agendar visita</Link>
          {whatsapp && <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Tenho interesse no imóvel: ${property.title} - ${pageUrl}`)}`} target="_blank" className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium shadow">WhatsApp</a>}
        </div>
      </div>
    </div>
  );
}


function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{k}:</span>
      <span className="font-medium text-gray-900">{v}</span>
    </div>
  );
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function nextDay1530() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(15, 30, 0, 0);
  // Return local ISO without seconds for nicer query param, e.g., 2025-10-25T15:30
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

