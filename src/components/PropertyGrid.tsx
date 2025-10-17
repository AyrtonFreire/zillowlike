"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Heart, Bed, Bath, Maximize2, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import type { ApiProperty } from "@/types/api";

type PropertyGridProps = {
  title: string;
  icon: React.ReactNode;
  properties: (ApiProperty & { distance?: number; similarityScore?: number })[];
  onPropertyClick?: (id: string) => void;
  onFavoriteToggle?: (id: string) => void;
  favorites?: string[];
};

export default function PropertyGrid({
  title,
  icon,
  properties,
  onPropertyClick,
  onFavoriteToggle,
  favorites = [],
}: PropertyGridProps) {
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [properties]);

  const scroll = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const handleDotClick = (e: React.MouseEvent, propertyId: string, index: number) => {
    e.stopPropagation();
    setImageIndexes(prev => ({
      ...prev,
      [propertyId]: index
    }));
  };

  if (properties.length === 0) return null;

  return (
    <div className="py-8 border-t border-gray-100">
      {/* Header */}
      <div className="px-6 md:px-8 flex items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="text-blue-600">{icon}</div>
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">
            {properties.length} {properties.length === 1 ? "imóvel" : "imóveis"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className={`w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 shadow-sm transition-all ${
              canScrollLeft
                ? "bg-white hover:bg-gray-50 text-gray-700 cursor-pointer"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
            aria-label="Scroll esquerda"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className={`w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 shadow-sm transition-all ${
              canScrollRight
                ? "bg-white hover:bg-gray-50 text-gray-700 cursor-pointer"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
            aria-label="Scroll direita"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Single row with horizontal scroll */}
      <div className="px-6 md:px-8">
        <div ref={rowRef} className="flex gap-4 md:gap-6 w-full overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide">
          {properties.map((property) => {
          const currentImageIndex = imageIndexes[property.id] || 0;
          const totalImages = property.images?.length || 0;
          
          return (
            <div
              key={property.id}
              className="snap-start w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px] flex-shrink-0 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden min-h-[340px]"
              onClick={() => onPropertyClick?.(property.id)}
            >
              {/* Image Container - compact height */}
              <div className="relative h-[180px] w-full bg-gray-100 overflow-hidden">
                {property.images?.[currentImageIndex] && (
                  <Image
                    src={property.images[currentImageIndex].url}
                    alt={property.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    loading="lazy"
                  />
                )}

                {/* Badge de Tipo - Top Left */}
                <div className="absolute top-3 left-3 px-4 py-2 bg-white rounded-[20px] text-sm font-medium text-gray-900 shadow-sm">
                  {property.type === "HOUSE"
                    ? "Casa"
                    : property.type === "APARTMENT"
                    ? "Apartamento"
                    : property.type === "CONDO"
                    ? "Condomínio"
                    : property.type === "STUDIO"
                    ? "Studio"
                    : property.type === "LAND"
                    ? "Terreno"
                    : property.type === "COMMERCIAL"
                    ? "Comercial"
                    : "Imóvel"}
                </div>

                {/* Favorite Button - Top Right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavoriteToggle?.(property.id);
                  }}
                  className={`absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 z-10 ${
                    favorites.includes(property.id)
                      ? "bg-red-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-label={
                    favorites.includes(property.id)
                      ? "Remover dos favoritos"
                      : "Adicionar aos favoritos"
                  }
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favorites.includes(property.id) ? "fill-current" : ""
                    }`}
                  />
                </button>

                {/* Photo Indicators (Dots) - Bottom Center */}
                {totalImages > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                    {Array.from({ length: Math.min(totalImages, 5) }).map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => handleDotClick(e, property.id, index)}
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          index === currentImageIndex
                            ? "bg-blue-500 w-6"
                            : "bg-white/50 hover:bg-white/80"
                        }`}
                        aria-label={`Ver foto ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Content Area - compact */}
              <div className="p-3.5">
                {/* Price - 22px */}
                <p className="text-[22px] font-bold text-[#1F2937] mb-2.5">
                  R$ {(property.price / 100).toLocaleString("pt-BR")}
                </p>

                {/* Features - compact */}
                <div className="flex items-center gap-2.5 mb-2">
                  {property.bedrooms && (
                    <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                      <Bed className="w-4 h-4" />
                      <span>{property.bedrooms}</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                      <Bath className="w-4 h-4" />
                      <span>{property.bathrooms}</span>
                    </div>
                  )}
                  {property.areaM2 && (
                    <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                      <Maximize2 className="w-4 h-4" />
                      <span>{property.areaM2} m²</span>
                    </div>
                  )}
                </div>

                {/* Address - flex, gap 8px */}
                <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <p className="line-clamp-1">
                    {property.street}
                    {property.neighborhood && `, ${property.neighborhood}`}
                  </p>
                </div>

                {/* City/State - 13px, #9CA3AF */}
                <p className="text-[13px] text-[#9CA3AF]">
                  {property.city}, {property.state}
                </p>

                {/* Distance/Similarity Badge (if exists) */}
                {(property.distance !== undefined || property.similarityScore !== undefined) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {property.distance !== undefined && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        📍 {property.distance < 1
                          ? `${Math.round(property.distance * 1000)}m de distância`
                          : `${property.distance.toFixed(1)}km de distância`}
                      </span>
                    )}
                    {property.similarityScore !== undefined && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        ✨ {Math.round(property.similarityScore)}% similar
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
