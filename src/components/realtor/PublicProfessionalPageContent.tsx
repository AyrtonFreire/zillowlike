import { notFound, redirect } from "next/navigation";
import RealtorPublicLandingClient from "@/components/realtor/RealtorPublicLandingClient";
import { getPublicProfessionalPageData } from "@/lib/public-professional-profile";

type PublicProfessionalPageContentProps = {
  slug: string;
  routeKind: "realtor" | "agency";
};

export default async function PublicProfessionalPageContent({
  slug,
  routeKind,
}: PublicProfessionalPageContentProps) {
  const data = await getPublicProfessionalPageData(slug);

  if (!data) {
    notFound();
  }

  const isAgency = data.landing.realtor.role === "AGENCY";
  if (routeKind === "agency" && !isAgency) {
    notFound();
  }

  if (routeKind === "realtor" && isAgency) {
    redirect(data.metadata.canonicalPath);
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
  const pageUrl = `${siteUrl}${data.metadata.canonicalPath}`;

  const jsonLdAgent = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: data.jsonLdBase.name,
    url: pageUrl,
    image: data.jsonLdBase.image || undefined,
    telephone: data.jsonLdBase.telephone,
    address: data.jsonLdBase.locationLabel
      ? {
          "@type": "PostalAddress",
          addressLocality: data.jsonLdBase.city || undefined,
          addressRegion: data.jsonLdBase.state || undefined,
        }
      : undefined,
    areaServed: data.jsonLdBase.locationLabel
      ? {
          "@type": "City",
          name: data.jsonLdBase.locationLabel,
        }
      : undefined,
    aggregateRating:
      data.jsonLdBase.avgRating > 0 && data.jsonLdBase.totalRatings > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: data.jsonLdBase.avgRating.toFixed(1),
            ratingCount: data.jsonLdBase.totalRatings,
          }
        : undefined,
    serviceType: data.jsonLdBase.serviceType,
    identifier: data.jsonLdBase.identifier
      ? {
          "@type": "PropertyValue",
          name: "CRECI",
          value: data.jsonLdBase.identifier,
        }
      : undefined,
    description: data.jsonLdBase.description,
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
        realtor={data.landing.realtor}
        properties={data.landing.properties}
        initialRatingsPreview={data.landing.initialRatingsPreview}
        agencyProfile={data.landing.agencyProfile}
      />
    </>
  );
}
