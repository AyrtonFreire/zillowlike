import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import ModernNavbar from "@/components/modern/ModernNavbar";
import PropertyDetailsModalJames from "@/components/PropertyDetailsModalJames";


type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await (prisma as any).property.findUnique({
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
    "image": property.images.map((img: { url: string }) => img.url),
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
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      <div className="max-w-[1400px] mx-auto px-0 md:px-4 py-4 md:py-6">
        <PropertyDetailsModalJames
          propertyId={id}
          open
          variant="page"
          mode="public"
          backHref="/"
          backLabel="Voltar à busca"
        />
      </div>
    </div>
  );
}
