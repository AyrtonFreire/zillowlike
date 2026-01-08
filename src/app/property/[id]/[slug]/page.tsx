import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import ModernNavbar from "@/components/modern/ModernNavbar";
import PropertyDetailsModalJames from "@/components/PropertyDetailsModalJames";
import { buildPropertyPath, slugify } from "@/lib/slug";
import { notFound, permanentRedirect } from "next/navigation";


type PageProps = { params: Promise<{ id: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await (prisma as any).property.findUnique({
    where: { id },
    select: {
      title: true,
      metaTitle: true,
      metaDescription: true,
      description: true,
      city: true,
      state: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      updatedAt: true,
    },
  });

  if (!property) {
    return {
      title: "Imóvel não encontrado",
      description: "O imóvel solicitado não foi encontrado.",
    };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://oggahub.com";
  const canonicalPath = buildPropertyPath(id, property.title);
  const url = `${base}${canonicalPath}`;
  const image = property.images?.[0]?.url;

  const title = property.metaTitle && String(property.metaTitle).trim()
    ? String(property.metaTitle).trim()
    : `${property.title} | OggaHub`;

  const description = property.metaDescription && String(property.metaDescription).trim()
    ? String(property.metaDescription).trim()
    : `${String(property.description || "").slice(0, 160)}${String(property.description || "").length > 160 ? "..." : ""}`;

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

export default async function PropertyCanonicalPage({ params }: PageProps) {
  const { id, slug } = await params;

  const property = await (prisma as any).property.findUnique({
    where: { id },
    select: {
      id: true,
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
    notFound();
  }

  const canonicalSlug = slugify(property.title);
  const canonicalPath = buildPropertyPath(property.id, property.title);
  if (slug !== canonicalSlug) {
    permanentRedirect(canonicalPath);
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://oggahub.com";

  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: property.title,
    description: property.description,
    image: (property.images || []).map((img: { url: string }) => img.url),
    offers: {
      "@type": "Offer",
      price: typeof property.price === "number" && property.price > 0 ? (property.price / 100).toFixed(2) : undefined,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: `${base}${canonicalPath}`,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.street,
      addressLocality: property.city,
      addressRegion: property.state,
      postalCode: property.postalCode || undefined,
    },
    geo:
      property.latitude && property.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: property.latitude,
            longitude: property.longitude,
          }
        : undefined,
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      {
        "@type": "ListItem",
        position: 2,
        name: `${property.city}, ${property.state}`,
        item: `${base}/?city=${encodeURIComponent(property.city)}&state=${encodeURIComponent(property.state)}`,
      },
      { "@type": "ListItem", position: 3, name: property.title, item: `${base}${canonicalPath}` },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
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
