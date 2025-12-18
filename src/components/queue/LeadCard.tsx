"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Calendar, MapPin, Clock, ExternalLink, MessageCircle, Users, Bed, Bath, Maximize2 } from "lucide-react";
import { buildPropertyPath } from "@/lib/slug";
import StatusIndicator from "./StatusIndicator";
import CountdownTimer from "./CountdownTimer";

interface LeadCardProps {
  lead: {
    id: string;
    status: "AVAILABLE" | "RESERVED" | "ACCEPTED";
    createdAt: string;
    reservedUntil?: string | null;
    property: {
      id: string;
      title: string;
      price: number;
      type: string;
      city: string;
      state: string;
      neighborhood?: string | null;
      bedrooms?: number | null;
      bathrooms?: number | null;
      areaM2?: number | null;
      images: Array<{ url: string }>;
    };
    contact?: {
      name: string;
      phone?: string | null;
    };
    _count?: {
      candidatures: number;
    };
  };
  onCandidate?: (leadId: string) => void;
  onAccept?: (leadId: string) => void;
  onReject?: (leadId: string) => void;
  showActions?: boolean;
  isReservedForMe?: boolean;
}

export default function LeadCard({
  lead,
  onCandidate,
  onAccept,
  onReject,
  showActions = true,
  isReservedForMe = false,
}: LeadCardProps) {
  const { property, status, reservedUntil, _count } = lead;
  const image = property.images[0]?.url || "/placeholder.jpg";

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / 60000);

    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Image */}
      <div className="relative h-48 bg-gray-100">
        <Image
          src={image}
          alt={property.title}
          fill
          className="object-cover"
        />
        <div className="absolute top-3 left-3">
          <StatusIndicator status={status} />
        </div>
        {_count && _count.candidatures > 0 && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-sm font-medium text-gray-700">
            <Users className="w-4 h-4" />
            <span>{_count.candidatures}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title & Price */}
        <div className="mb-3">
          <Link
            href={buildPropertyPath(property.id, property.title)}
            className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
          >
            {property.title}
          </Link>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatPrice(property.price)}
          </p>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span>
            {property.neighborhood && `${property.neighborhood}, `}
            {property.city} - {property.state}
          </span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-gray-600 text-sm mb-4">
          {property.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{property.bathrooms}</span>
            </div>
          )}
          {property.areaM2 && (
            <div className="flex items-center gap-1">
              <Maximize2 className="w-4 h-4" />
              <span>{property.areaM2}m²</span>
            </div>
          )}
        </div>

        {/* Time Info */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Calendar className="w-4 h-4" />
            <span>{getTimeAgo(lead.createdAt)}</span>
          </div>
          {reservedUntil && status === "RESERVED" && (
            <CountdownTimer targetDate={new Date(reservedUntil)} />
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {status === "AVAILABLE" && onCandidate && (
              <button
                onClick={() => onCandidate(lead.id)}
                className="flex-1 px-4 py-2 glass-teal text-white font-medium rounded-lg transition-colors"
              >
                Candidatar-se
              </button>
            )}

            {status === "RESERVED" && isReservedForMe && onAccept && onReject && (
              <>
                <button
                  onClick={() => onAccept(lead.id)}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Aceitar
                </button>
                <button
                  onClick={() => onReject(lead.id)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Recusar
                </button>
              </>
            )}

            {status === "RESERVED" && !isReservedForMe && (
              <div className="flex-1 px-4 py-2 bg-gray-100 text-gray-500 font-medium rounded-lg text-center">
                Reservado por outro corretor
              </div>
            )}

            {status === "ACCEPTED" && (
              <div className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg text-center">
                Em atendimento
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
