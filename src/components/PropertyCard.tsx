"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback } from "react";
import type { ApiProperty } from "@/types/api";
import { Heart, MapPin, Bed, Bath, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { buildPropertyPath } from "@/lib/slug";

interface PropertyCardProps {
  property: ApiProperty;
  onFavoriteToggle?: (id: string) => void;
  onHover?: (id: string | null) => void;
  onOpenOverlay?: (id: string) => void;
  isFavorite?: boolean;
  isHovered?: boolean;
  className?: string;
}

export default function PropertyCard({
  property: p,
  onFavoriteToggle,
  onHover,
  onOpenOverlay,
  isFavorite = false,
  isHovered = false,
  className = "",
}: PropertyCardProps) {
  const transformCloudinary = (url: string, transformation: string) => {
    try {
      const marker = "/image/upload/";
      const idx = url.indexOf(marker);
      if (idx === -1) return url; // not a cloudinary url
      const head = url.substring(0, idx + marker.length);
      const tail = url.substring(idx + marker.length);
      // avoid double-applying if already has params
      if (tail.startsWith("f_")) return url;
      return `${head}${transformation}/${tail}`;
    } catch {
      return url;
    }
  };
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const totalImages = p.images?.length || 0;
  const hasMultipleImages = totalImages > 1;

  const handleClick = (e: React.MouseEvent) => {
    // Prevent default link behavior and open overlay on desktop
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches && !(e as any).metaKey && !(e as any).ctrlKey && !(e as any).shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onOpenOverlay?.(p.id);
    }
  };

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  }, [totalImages]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  }, [totalImages]);

  const handleDotClick = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(index);
  }, []);

  return (
    <Link
      href={buildPropertyPath(p.id, p.title)}
      className={`block group cursor-pointer ${className}`}
      onMouseEnter={() => {
        onHover?.(p.id);
        if (p.latitude && p.longitude) {
          window.dispatchEvent(new CustomEvent('map-highlight-marker', { detail: { id: p.id } }));
        }
      }}
      onMouseLeave={() => {
        onHover?.(null);
        window.dispatchEvent(new CustomEvent('map-unhighlight-marker'));
      }}
      onClick={handleClick}
      aria-label={`Ver detalhes de ${p.title}`}
      role="article"
    >
      {/* Card Container com Sombra Suave */}
      <div className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${
        isHovered ? 'ring-2 ring-blue-400 shadow-xl scale-[1.02]' : ''
      }`}>
        
        {/* Image Container com Carrossel - 70% da altura */}
        <div 
          className="relative aspect-[4/3] overflow-hidden bg-gray-100"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Imagem Principal com Transição */}
          {p.images?.[currentImageIndex]?.url && !imageError ? (
            <Image 
              src={transformCloudinary(p.images[currentImageIndex].url, "f_auto,q_auto:good,dpr_auto,w_1200,h_900,c_fill,g_auto")} 
              alt={`${p.title} - ${currentImageIndex + 1}`} 
              fill
              className="object-cover group-hover:scale-105 transition-all duration-700"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Sem foto</span>
              </div>
            </div>
          )}

          {/* Setas de Navegação - Aparecem no Hover */}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-md opacity-0 group-hover:opacity-100"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="w-4 h-4 text-gray-800" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-md opacity-0 group-hover:opacity-100"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="w-4 h-4 text-gray-800" />
              </button>
            </>
          )}

          {/* Indicadores de Posição (Bolinhas) */}
          {hasMultipleImages && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
              {p.images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => handleDotClick(index, e)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentImageIndex
                      ? 'w-6 h-1.5 bg-blue-500'
                      : 'w-1.5 h-1.5 bg-white/70 hover:bg-white'
                  }`}
                  aria-label={`Ir para imagem ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Tag Flutuante - Canto Superior Esquerdo */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center px-3 py-1 bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-semibold rounded-full shadow-md">
              {p.type === 'HOUSE' ? 'Casa' : 
               p.type === 'APARTMENT' ? 'Apartamento' :
               p.type === 'CONDO' ? 'Condomínio' :
               p.type === 'STUDIO' ? 'Studio' :
               p.type === 'LAND' ? 'Terreno' :
               p.type === 'COMMERCIAL' ? 'Comercial' : 'Imóvel'}
            </span>
          </div>

          {/* Botão Favoritar */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavoriteToggle?.(p.id);
            }}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-lg hover:scale-110"
            aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            aria-pressed={isFavorite}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Conteúdo - 30% da altura */}
        <div className="p-4">
          {/* Preço em Destaque */}
          <div className="mb-3">
            <p className="text-2xl font-semibold text-gray-900">
              R$ {(p.price / 100).toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Features Compactas */}
          <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
            {p.bedrooms != null && (
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                <span className="font-medium">{p.bedrooms}</span>
              </div>
            )}
            {p.bathrooms != null && (
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                <span className="font-medium">{Number(p.bathrooms)}</span>
              </div>
            )}
            {p.areaM2 && (
              <div className="flex items-center gap-1">
                <Maximize2 className="w-4 h-4" />
                <span className="font-medium">{p.areaM2} m²</span>
              </div>
            )}
          </div>

          {/* Endereço com Ícone */}
          <div className="flex items-start gap-1.5 text-sm text-gray-600 mb-2">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
            <span className="line-clamp-1">
              {p.street}{p.neighborhood ? `, ${p.neighborhood}` : ""}
            </span>
          </div>

          {/* Cidade/Estado */}
          <p className="text-xs text-gray-500">
            {p.city}, {p.state}
          </p>
        </div>
      </div>
    </Link>
  );
}
