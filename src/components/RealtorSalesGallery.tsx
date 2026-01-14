"use client";

import { useState } from "react";
import { Award, ChevronLeft, ChevronRight, X, Home, DollarSign, Calendar } from "lucide-react";
import { ptBR } from "@/lib/i18n/property";

interface SoldProperty {
  id: string;
  title: string;
  price: number;
  city: string;
  state: string;
  neighborhood?: string;
  type: string;
  purpose: string;
  status: string;
  soldAt?: string;
  images: { url: string }[];
}

interface RealtorSalesGalleryProps {
  properties: SoldProperty[];
}

const PROPERTY_TYPES: Record<string, string> = {
  HOUSE: "Casa",
  APARTMENT: "Apartamento",
  CONDO: "Condomínio",
  TOWNHOUSE: "Sobrado",
  STUDIO: "Studio",
  LAND: "Terreno",
  RURAL: "Imóvel rural",
  COMMERCIAL: "Comercial",
  FARM: "Fazenda/Sítio",
};

export default function RealtorSalesGallery({ properties }: RealtorSalesGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (properties.length === 0) {
    return null;
  }

  const totalSold = properties.filter((p) => p.status === "SOLD").length;
  const totalRented = properties.filter((p) => p.status === "RENTED").length;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextProperty = () => {
    setCurrentIndex((prev) => (prev + 1) % properties.length);
  };

  const prevProperty = () => {
    setCurrentIndex((prev) => (prev - 1 + properties.length) % properties.length);
  };

  const currentProperty = properties[currentIndex];

  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Histórico de vendas
          </h2>
          <div className="flex items-center gap-3 text-sm">
            {totalSold > 0 && (
              <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                {totalSold} vendido{totalSold === 1 ? "" : "s"}
              </span>
            )}
            {totalRented > 0 && (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                {totalRented} alugado{totalRented === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* Grid de miniaturas */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {properties.slice(0, 12).map((property, idx) => (
            <button
              key={property.id}
              onClick={() => openLightbox(idx)}
              className="relative aspect-square rounded-lg overflow-hidden group"
            >
              {property.images[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={property.images[0].url}
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Home className="w-6 h-6 text-gray-300" />
                </div>
              )}
              {/* Overlay com status */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 left-2 right-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                      property.status === "SOLD"
                        ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {property.status === "SOLD" ? "VENDIDO" : "ALUGADO"}
                  </span>
                </div>
              </div>
              {/* Badge no canto */}
              <div
                className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center ${
                  property.status === "SOLD" ? "bg-green-500" : "bg-blue-500"
                }`}
              >
                <DollarSign className="w-2.5 h-2.5 text-white" />
              </div>
            </button>
          ))}
          {properties.length > 12 && (
            <button
              onClick={() => openLightbox(12)}
              className="aspect-square rounded-lg bg-gray-100 flex flex-col items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <span className="text-lg font-bold">+{properties.length - 12}</span>
              <span className="text-xs">mais</span>
            </button>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && currentProperty && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
          {/* Fechar */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navegação */}
          {properties.length > 1 && (
            <>
              <button
                onClick={prevProperty}
                className="absolute left-4 p-2 text-white/80 hover:text-white z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={nextProperty}
                className="absolute right-4 p-2 text-white/80 hover:text-white z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Conteúdo */}
          <div className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
            {/* Imagem */}
            <div className="aspect-video relative bg-gray-100">
              {currentProperty.images[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentProperty.images[0].url}
                  alt={currentProperty.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-16 h-16 text-gray-300" />
                </div>
              )}
              {/* Badge de status */}
              <div className="absolute top-4 left-4">
                <span
                  className={`px-3 py-1.5 text-sm font-bold rounded-lg ${
                    currentProperty.status === "SOLD"
                      ? "bg-green-500 text-white"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {currentProperty.status === "SOLD" ? "✓ VENDIDO" : "✓ ALUGADO"}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{currentProperty.title}</h3>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Home className="w-4 h-4" />
                  {ptBR.type(currentProperty.type)}
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  R$ {currentProperty.price.toLocaleString("pt-BR")}
                </span>
                <span>
                  {currentProperty.neighborhood && `${currentProperty.neighborhood}, `}
                  {currentProperty.city}/{currentProperty.state}
                </span>
              </div>
              {currentProperty.soldAt && (
                <div className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {currentProperty.status === "SOLD" ? "Vendido" : "Alugado"} em{" "}
                  {new Date(currentProperty.soldAt).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>

            {/* Navegação por dots */}
            {properties.length > 1 && (
              <div className="px-6 pb-4 flex justify-center gap-1.5">
                {properties.slice(0, 12).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentIndex ? "bg-teal-600" : "bg-gray-300 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
