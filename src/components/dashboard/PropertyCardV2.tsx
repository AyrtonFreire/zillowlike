"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Eye,
  Users,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Edit2,
  Pause,
  Play,
  ExternalLink,
  Copy,
  BarChart3,
} from "lucide-react";
import { useState } from "react";

interface PropertyCardV2Props {
  id: string;
  title: string;
  price: number;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  image: string | null;
  street?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaM2?: number | null;
  type?: string;
  views: number;
  leads: number;
  favorites?: number;
  qualityScore?: number; // 0-100
  hasDescription?: boolean;
  hasMinPhotos?: boolean;
  missingFields?: string[];
  onStatusToggle?: (id: string, currentStatus: "ACTIVE" | "PAUSED" | "DRAFT") => void;
}

export default function PropertyCardV2({
  id,
  title,
  price,
  status,
  image,
  street,
  neighborhood,
  city,
  state,
  bedrooms,
  bathrooms,
  areaM2,
  type,
  views,
  leads,
  favorites,
  qualityScore = 75,
  hasDescription = true,
  hasMinPhotos = true,
  missingFields = [],
  onStatusToggle,
}: PropertyCardV2Props) {
  const [copied, setCopied] = useState(false);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getStatusBadge = () => {
    const styles = {
      ACTIVE: "bg-green-100 text-green-700 border-green-200",
      PAUSED: "bg-yellow-100 text-yellow-700 border-yellow-200",
      DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
    };
    const labels = {
      ACTIVE: "Ativo",
      PAUSED: "Pausado",
      DRAFT: "Rascunho",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getQualityColor = () => {
    if (qualityScore >= 80) return "text-green-600 bg-green-50";
    if (qualityScore >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const copyLink = () => {
    const url = `${window.location.origin}/property/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onStatusToggle) {
      onStatusToggle(id, status);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
      {/* Image Section */}
      <Link href={`/owner/properties/${id}`} className="block relative aspect-[16/10] bg-gray-100 overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Home className="w-16 h-16" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          {getStatusBadge()}
        </div>

        {/* Quality Score */}
        <div className="absolute top-3 right-3">
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${getQualityColor()} backdrop-blur-sm`}>
            {qualityScore}% completo
          </div>
        </div>
      </Link>

      {/* Content Section */}
      <div className="p-6">
        {/* Title & Address */}
        <Link href={`/owner/properties/${id}`}>
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-teal-600 transition-colors">
            {title}
          </h3>
        </Link>
        
        <div className="flex items-start gap-1.5 text-sm text-gray-600 mb-4">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
          <span className="line-clamp-2">
            {street && `${street}, `}
            {neighborhood && `${neighborhood}, `}
            {city}/{state}
          </span>
        </div>

        {/* Price */}
        <div className="text-3xl font-extrabold text-teal-600 mb-4">
          {formatPrice(price)}
        </div>

        {/* Property Details */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
          {type && (
            <span className="font-medium text-gray-700">{type}</span>
          )}
          {bedrooms !== null && bedrooms !== undefined && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{bedrooms}</span>
            </div>
          )}
          {bathrooms !== null && bathrooms !== undefined && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{bathrooms}</span>
            </div>
          )}
          {areaM2 !== null && areaM2 !== undefined && (
            <div className="flex items-center gap-1">
              <Maximize className="w-4 h-4" />
              <span>{areaM2}m²</span>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
              <Eye className="w-3.5 h-3.5" />
              <span>Views</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{views}</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>Leads</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{leads}</div>
          </div>
          {favorites !== undefined && (
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Favoritos</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{favorites}</div>
            </div>
          )}
        </div>

        {/* Quality Warnings */}
        {(missingFields.length > 0 || !hasDescription || !hasMinPhotos) && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs font-medium text-yellow-800 mb-1">
              ⚠️ Melhore seu anúncio:
            </p>
            <ul className="text-xs text-yellow-700 space-y-0.5">
              {!hasMinPhotos && <li>• Adicione mais fotos (mínimo 5)</li>}
              {!hasDescription && <li>• Escreva uma descrição completa</li>}
              {missingFields.slice(0, 2).map((field, idx) => (
                <li key={idx}>• {field}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/owner/properties/edit/${id}`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors text-sm font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </Link>
          
          <button
            onClick={handleStatusToggle}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors text-sm font-medium"
          >
            {status === "ACTIVE" ? (
              <>
                <Pause className="w-4 h-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Ativar
              </>
            )}
          </button>

          <Link
            href={`/owner/properties/${id}#leads`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors text-sm font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <Users className="w-4 h-4" />
            Ver Leads
          </Link>

          <Link
            href={`/property/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors text-sm font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
            Ver anúncio
          </Link>
        </div>
      </div>
    </div>
  );
}
