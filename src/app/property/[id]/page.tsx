import { prisma } from "@/lib/prisma";
import MapClient from "@/components/MapClient";
import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import ContactForm from "@/components/ContactForm";
import FinancingButton from "@/components/FinancingButton";


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
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });

  if (!property) {
    return {
      title: "Imóvel não encontrado",
      description: "O imóvel solicitado não foi encontrado.",
    };
  }

  const title = `${property.title} | Zillowlike`;
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
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Imóvel não encontrado</h1>
          <p className="text-gray-600 mb-6">O imóvel que você está procurando não existe ou foi removido.</p>
          <Link href="/" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200">
            ← Voltar à busca
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Header */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  {property.type === 'HOUSE' ? 'Casa' : 
                   property.type === 'APARTMENT' ? 'Apartamento' :
                   property.type === 'CONDO' ? 'Condomínio' :
                   property.type === 'TOWNHOUSE' ? 'Sobrado' :
                   property.type === 'STUDIO' ? 'Studio' :
                   property.type === 'LAND' ? 'Terreno' :
                   property.type === 'COMMERCIAL' ? 'Comercial' : property.type}
                </span>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{property.title}</h1>
              
              <div className="flex items-center text-gray-600 mb-4">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{property.street}{property.neighborhood ? ", " + property.neighborhood : ""} - {property.city}/{property.state}</span>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="text-4xl font-bold text-blue-600">
                  R$ {(property.price / 100).toLocaleString("pt-BR")}
                </div>
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  <FinancingButton 
                    propertyId={property.id} 
                    propertyValue={property.price}
                  />
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Publicado em</div>
                    <div className="font-medium">{new Date(property.createdAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Detalhes do imóvel</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {property.bedrooms != null && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{property.bedrooms}</div>
                    <div className="text-sm text-gray-600">Quartos</div>
                  </div>
                )}
                {property.bathrooms != null && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{Number(property.bathrooms)}</div>
                    <div className="text-sm text-gray-600">Banheiros</div>
                  </div>
                )}
                {property.areaM2 != null && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{property.areaM2}</div>
                    <div className="text-sm text-gray-600">m²</div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrição</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {property.description}
                </p>
              </div>
            </div>

            {/* Image Gallery */}
            {property.images.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Fotos do imóvel</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {property.images.map((img, index) => (
                    <div key={img.id} className="relative group cursor-pointer">
                      <Image
                        src={img.url}
                        alt={img.alt || property.title}
                        width={800}
                        height={480}
                        className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Map */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Localização</h3>
              </div>
              <div className="h-80">
                <MapClient items={items} hideRefitButton />
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Interessado?</h3>
              <p className="text-gray-600 mb-4">
                Envie uma mensagem e retornaremos rapidamente.
              </p>
              <ContactForm propertyId={property.id} />
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">
                    {property.type === 'HOUSE' ? 'Casa' : 
                     property.type === 'APARTMENT' ? 'Apartamento' :
                     property.type === 'CONDO' ? 'Condomínio' :
                     property.type === 'TOWNHOUSE' ? 'Sobrado' :
                     property.type === 'STUDIO' ? 'Studio' :
                     property.type === 'LAND' ? 'Terreno' :
                     property.type === 'COMMERCIAL' ? 'Comercial' : property.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cidade:</span>
                  <span className="font-medium">{property.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-medium">{property.state}</span>
                </div>
                {property.postalCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">CEP:</span>
                    <span className="font-medium">{property.postalCode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


