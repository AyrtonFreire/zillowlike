"use client";

import Image from "next/image";
import { Home, MapPin, Bed, Bath, Maximize, Eye, Users, Target, Timer, Stars } from "lucide-react";

interface PropertyCardV2Props {
  id: string;
  href: string;
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
  conversionRatePct?: number | null;
  daysSinceLastLead?: number | null;
  platformComparisonPct?: number | null;
  favorites?: number;
  qualityScore?: number; // 0-100
  hasDescription?: boolean;
  hasMinPhotos?: boolean;
  missingFields?: string[];
}

export default function PropertyCardV2({
  id,
  href,
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
  conversionRatePct = null,
  daysSinceLastLead = null,
  platformComparisonPct = null,
  favorites,
  qualityScore = 75,
  hasDescription = true,
  hasMinPhotos = true,
  missingFields = [],
}: PropertyCardV2Props) {
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

  const conversionLabel = () => {
    if (conversionRatePct === null || typeof conversionRatePct === "undefined") return "—";
    return `${conversionRatePct.toLocaleString("pt-BR")}%`;
  };

  const staleLabel = () => {
    if (daysSinceLastLead === null || typeof daysSinceLastLead === "undefined") return "—";
    if (daysSinceLastLead === 0) return "hoje";
    return `${daysSinceLastLead}d`;
  };

  const comparisonLabel = () => {
    if (platformComparisonPct === null || typeof platformComparisonPct === "undefined") return "—";
    return `${platformComparisonPct}%`;
  };

  const comparisonTone = () => {
    if (platformComparisonPct === null || typeof platformComparisonPct === "undefined") {
      return "text-gray-700";
    }
    if (platformComparisonPct >= 110) return "text-emerald-700";
    if (platformComparisonPct >= 90) return "text-amber-700";
    return "text-rose-700";
  };

  return (
    <a href={href} className="block group h-full">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all h-full flex flex-col">
        {/* Image Section */}
        <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
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
          <div className="absolute top-3 left-3">{getStatusBadge()}</div>

          {/* Quality Score */}
          <div className="absolute top-3 right-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${getQualityColor()} backdrop-blur-sm`}>
              {qualityScore}% completo
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Title & Address */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 min-h-[56px] group-hover:text-teal-600 transition-colors">
            {title}
          </h3>

          <div className="flex items-start gap-1.5 text-sm text-gray-600 mb-4 min-h-[40px]">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
            <span className="line-clamp-2">
              {street && `${street}, `}
              {neighborhood && `${neighborhood}, `}
              {city}/{state}
            </span>
          </div>

          {/* Price */}
          <div className="text-3xl font-extrabold text-teal-600 mb-4">{formatPrice(price)}</div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{leads}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{views}</span>
            </div>
          </div>

          {/* Property Details */}
          <div className="mt-auto flex items-center gap-4 text-sm text-gray-600">
            {type && <span className="font-medium text-gray-700">{type}</span>}
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
        </div>

        {/* Compact Analytics Bar */}
        <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 text-[12px] text-gray-700">
            <div className="flex items-center gap-1.5 min-w-0">
              <Eye className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="font-semibold tabular-nums">{views}</span>
              <span className="text-gray-500 truncate">views</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="font-semibold tabular-nums">{leads}</span>
              <span className="text-gray-500 truncate">leads</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Target className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="font-semibold tabular-nums">{conversionLabel()}</span>
              <span className="text-gray-500 truncate">conv.</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Timer className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="font-semibold tabular-nums">{staleLabel()}</span>
              <span className="text-gray-500 truncate">sem lead</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Stars className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className={`font-semibold tabular-nums ${comparisonTone()}`}>{comparisonLabel()}</span>
              <span className="text-gray-500 truncate">média</span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
