import Head from "next/head";

interface PropertyMetaTagsProps {
  property: {
    title: string;
    description: string;
    price: number;
    type: string;
    city: string;
    state: string;
    images?: { url: string }[];
    bedrooms?: number;
    bathrooms?: number;
    areaM2?: number;
  };
  url?: string;
}

export default function PropertyMetaTags({ property, url }: PropertyMetaTagsProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const title = `${property.title} - ${property.city}, ${property.state} | Zillow`;
  const description = property.description.substring(0, 160);
  const price = formatPrice(property.price);
  const image = property.images?.[0]?.url || "/og-default.jpg";
  const canonicalUrl = url || `https://zillowlike.vercel.app/property/${property.title}`;

  // Schema.org structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description,
    url: canonicalUrl,
    image: image,
    offers: {
      "@type": "Offer",
      price: property.price / 100,
      priceCurrency: "BRL",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: property.city,
      addressRegion: property.state,
      addressCountry: "BR",
    },
    ...(property.bedrooms && { numberOfRooms: property.bedrooms }),
    ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
    ...(property.areaM2 && { floorSize: { "@type": "QuantitativeValue", value: property.areaM2, unitCode: "MTK" } }),
  };

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Zillow" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Additional Meta */}
      <meta name="keywords" content={`imóvel, ${property.type}, ${property.city}, ${property.state}, comprar imóvel, venda`} />
      <meta name="author" content="Zillow" />
      
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </Head>
  );
}
