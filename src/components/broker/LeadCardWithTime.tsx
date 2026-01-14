"use client";

import Link from "next/link";
import { Clock, MapPin, Calendar, ArrowRight, User, Users, Home, MessageCircle, CheckCircle, XCircle, AlertCircle, Star } from "lucide-react";
import { buildPropertyPath } from "@/lib/slug";
import Image from "next/image";
import { ptBR } from "@/lib/i18n/property";

interface LeadCardWithTimeProps {
  lead: {
    id: string;
    visitDate: string | null;
    visitTime: string | null;
    status: string;
    candidatesCount: number;
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
      images: Array<{ url: string }>;
    };
    contact: {
      name: string;
      email?: string;
      phone?: string | null;
    } | null;
  };
  onCandidate?: () => void;
}

export default function LeadCardWithTime({ lead, onCandidate }: LeadCardWithTimeProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const isMatchingWithYourPreferences = false; // TODO: Implementar lógica de match

  return (
    <div
      className={`
        bg-white rounded-lg border-2 transition-all hover:shadow-lg
        ${isMatchingWithYourPreferences ? "border-green-300 bg-green-50/30" : "border-gray-200"}
      `}
    >
      {isMatchingWithYourPreferences && (
        <div className="bg-green-100 border-b border-green-300 px-4 py-2">
          <p className="text-sm font-medium text-green-800 flex items-center gap-2">
            💚 COMBINA COM SUAS PREFERÊNCIAS
          </p>
        </div>
      )}

      <div className="p-5">
        <div className="flex gap-4">
          {/* Image */}
          <div className="flex-shrink-0">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
              {lead.property.images[0] && (
                <Image
                  src={lead.property.images[0].url}
                  alt={lead.property.title}
                  fill
                  className="object-cover"
                />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <Link
                  href={buildPropertyPath(lead.property.id, lead.property.title)}
                  className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {lead.property.title}
                </Link>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatPrice(lead.property.price)}
                </p>
              </div>

              {/* Candidates Badge */}
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Users className="w-4 h-4" />
                {lead.candidatesCount} {lead.candidatesCount === 1 ? "candidato" : "candidatos"}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
              <MapPin className="w-4 h-4" />
              <span>
                {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                {lead.property.city} - {lead.property.state}
              </span>
            </div>

            {/* Visit Details - HIGHLIGHT */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-blue-900">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-lg">
                    {formatDate(lead.visitDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-blue-900">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-lg">{lead.visitTime}</span>
                </div>
              </div>
              {lead.contact && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-700">
                  <User className="w-4 h-4" />
                  <span>Cliente: {lead.contact.name}</span>
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="flex gap-4 text-sm text-gray-600 mb-3">
              <span>{ptBR.type(lead.property.type)}</span>
              {lead.property.bedrooms && <span>• {lead.property.bedrooms} quartos</span>}
              {lead.property.bathrooms && <span>• {lead.property.bathrooms} banheiros</span>}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href={buildPropertyPath(lead.property.id, lead.property.title)}
                className="px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Ver Detalhes
              </Link>
              <button
                onClick={onCandidate}
                className="flex-1 px-6 py-2 glass-teal text-white font-semibold rounded-lg transition-colors"
              >
                ME CANDIDATAR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
