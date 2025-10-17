"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ApiProperty } from "@/types/api";

interface MobilePropertyCardProps {
  property: ApiProperty;
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
  className?: string;
}

export default function MobilePropertyCard({
  property: p,
  onFavoriteToggle,
  isFavorite = false,
  className = ""
}: MobilePropertyCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/property/${p.id}`}
      className={`block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden active:scale-[0.98] transition-all duration-200 ${className}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {p.images?.[0]?.url && !imageError ? (
          <Image 
            src={p.images[0].url} 
            alt={p.title} 
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">Sem foto</span>
            </div>
          </div>
        )}

        {/* Overlay Elements */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        
        {/* Price Badge */}
        <div className="absolute bottom-3 left-3">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
            <div className="text-base font-bold text-gray-900">
              R$ {(p.price / 100).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Favorite Button */}
        <button 
          onClick={(e) => { 
            e.preventDefault();
            e.stopPropagation(); 
            onFavoriteToggle?.(p.id); 
          }} 
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all duration-200 active:scale-90 ${
            isFavorite 
              ? 'bg-red-500/90 text-white shadow-lg' 
              : 'bg-white/90 text-gray-600 shadow-md'
          }`}
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 000-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Type Badge */}
        {p.type && (
          <div className="absolute top-3 left-3">
            <span className="badge badge-neutral text-xs shadow-sm">
              {p.type === 'HOUSE' ? 'Casa' : 
               p.type === 'APARTMENT' ? 'Apartamento' :
               p.type === 'CONDO' ? 'Condomínio' :
               p.type === 'STUDIO' ? 'Studio' :
               p.type === 'LAND' ? 'Terreno' :
               p.type === 'COMMERCIAL' ? 'Comercial' : p.type}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-base text-gray-900 line-clamp-2 mb-2">
          {p.title}
        </h3>

        {/* Location */}
        <div className="flex items-start gap-2 text-gray-600 text-sm mb-3">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12.414a6 6 0 10-8.485 0l4.243 4.243a1 1 0 001.414 0z" />
          </svg>
          <span className="line-clamp-2 leading-tight">
            {p.street}{p.neighborhood ? `, ${p.neighborhood}` : ""} - {p.city}/{p.state}
          </span>
        </div>

        {/* Property Features - Mobile Optimized */}
        <div className="flex items-center justify-between text-sm text-gray-700">
          <div className="flex items-center gap-4">
            {p.areaM2 && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span className="font-medium">{p.areaM2}m²</span>
              </div>
            )}
            
            {p.bedrooms != null && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M5 10v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
                </svg>
                <span className="font-medium">{p.bedrooms}</span>
              </div>
            )}
            
            {p.bathrooms != null && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                <span className="font-medium">{Number(p.bathrooms)}</span>
              </div>
            )}
          </div>

          {/* View Details Arrow */}
          <div className="text-primary-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
