"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Heart, Bed, Bath, Maximize2, MapPin } from "lucide-react";
import type { ApiProperty } from "@/types/api";

type PropertyCarouselProps = {
  title: string;
  icon: React.ReactNode;
  properties: (ApiProperty & { distance?: number; similarityScore?: number })[];
  onPropertyClick?: (id: string) => void;
  onFavoriteToggle?: (id: string) => void;
  favorites?: string[];
};

export default function PropertyCarousel({
  title,
  icon,
  properties,
  onPropertyClick,
  onFavoriteToggle,
  favorites = [],
}: PropertyCarouselProps) {
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});

  const handlePrevImage = (e: React.MouseEvent, propertyId: string, totalImages: number) => {
    e.stopPropagation();
    setImageIndexes(prev => ({
      ...prev,
      [propertyId]: ((prev[propertyId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const handleNextImage = (e: React.MouseEvent, propertyId: string, totalImages: number) => {
    e.stopPropagation();
    setImageIndexes(prev => ({
      ...prev,
      [propertyId]: ((prev[propertyId] || 0) + 1) % totalImages
    }));
  };

  if (properties.length === 0) return null;

  return (
    <div className="py-8 border-t border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-blue-600">{icon}</div>
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500 ml-2">
          {properties.length} {properties.length === 1 ? "imóvel" : "imóveis"}
        </span>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {properties.map((property) => {
          const currentImageIndex = imageIndexes[property.id] || 0;
          const totalImages = property.images?.length || 0;
          
          return (
            <div
              key={property.id}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden group/card"
              onClick={() => onPropertyClick?.(property.id)}
            >
              {/* Image with Carousel */}
              <div className="relative h-[200px] bg-gray-100 group/image">
                  {property.images?.[0] && (
                    <Image
                      src={property.images[0].url}
                      alt={property.title}
                      fill
                      className="object-cover group-hover/card:brightness-110 transition-all duration-300"
                      sizes="300px"
                      loading="lazy"
                    />
                  )}

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFavoriteToggle?.(property.id);
                    }}
                    className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 ${
                      favorites.includes(property.id)
                        ? "bg-red-500 text-white"
                        : "bg-white/90 text-gray-700 hover:bg-white"
                    }`}
                    aria-label={
                      favorites.includes(property.id)
                        ? "Remover dos favoritos"
                        : "Adicionar aos favoritos"
                    }
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        favorites.includes(property.id) ? "fill-current" : ""
                      }`}
                    />
                  </button>

                  {/* Distance/Score Badge */}
                  {property.distance !== undefined && (
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-white/95 backdrop-blur-md rounded-lg text-xs font-semibold text-gray-800">
                      {property.distance < 1
                        ? `${Math.round(property.distance * 1000)}m`
                        : `${property.distance.toFixed(1)}km`}
                    </div>
                  )}
                  {property.similarityScore !== undefined && (
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-blue-600/95 backdrop-blur-md rounded-lg text-xs font-semibold text-white">
                      {Math.round(property.similarityScore)}% similar
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Price */}
                  <p className="text-xl font-bold text-gray-900 mb-2">
                    R$ {(property.price / 100).toLocaleString("pt-BR")}
                  </p>

                  {/* Features */}
                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      <span>{property.bathrooms}</span>
                    </div>
                    {property.areaM2 && (
                      <div className="flex items-center gap-1">
                        <Maximize2 className="w-4 h-4" />
                        <span>{property.areaM2}m²</span>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="line-clamp-2">
                      {property.street}, {property.city} - {property.state}
                    </p>
                  </div>

                  {/* Type Badge */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
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
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
