"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, Phone } from "lucide-react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";

interface VisitLead {
  id: string;
  visitDate: string;
  visitTime: string;
  property: {
    id: string;
    title: string;
    city: string;
    state: string;
    neighborhood?: string | null;
    images: Array<{ url: string }>;
  };
  contact?: {
    name: string;
    phone?: string | null;
  } | null;
}

export default function BrokerAgendaPage() {
  const { data: session } = useSession();
  const realtorId = (session?.user as any)?.id || "";

  const [leads, setLeads] = useState<VisitLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!realtorId) return;
    fetchVisits();
  }, [realtorId]);

  const fetchVisits = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch("/api/leads/my-visits");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos carregar sua agenda de visitas agora.");
      }

      setLeads(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching visits:", err);
      setError(err?.message || "Não conseguimos carregar sua agenda de visitas agora.");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const formatVisitDateTime = (visitDate: string, visitTime: string) => {
    try {
      const date = new Date(visitDate);
      const [hour, minute] = visitTime.split(":");
      if (!isNaN(date.getTime())) {
        date.setHours(Number(hour) || 0, Number(minute) || 0, 0, 0);
        return date.toLocaleString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (_) {
      // ignore
    }

    return `${visitDate} ${visitTime}`;
  };

  const getWhatsAppUrl = (phone?: string | null) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "";
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${withCountry}`;
  };

  if (!realtorId) {
    return <CenteredSpinner message="Carregando sua agenda..." />;
  }

  if (loading) {
    return <CenteredSpinner message="Carregando sua agenda de visitas..." />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
          {error}
        </div>
      )}

      {leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-600">
          <p>
            No momento, você não tem visitas marcadas com data e horário definidos. Assim que marcar visitas nos seus leads,
            elas aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative w-full sm:w-36 h-24 rounded-xl overflow-hidden">
                  <Image
                    src={lead.property.images[0]?.url || "/placeholder.svg"}
                    alt={lead.property.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    {lead.property.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {lead.property.neighborhood ? `${lead.property.neighborhood}, ` : ""}{lead.property.city} - {lead.property.state}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(lead.visitDate).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {lead.visitTime}
                    </span>
                    {lead.contact?.name && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {lead.contact.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {formatVisitDateTime(lead.visitDate, lead.visitTime)}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href={`/broker/leads/${lead.id}`}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold text-center hover:bg-teal-700"
                  >
                    Ver lead
                  </Link>
                  {lead.contact?.phone && (
                    <a
                      href={getWhatsAppUrl(lead.contact.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-center text-gray-700 hover:bg-gray-50"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
