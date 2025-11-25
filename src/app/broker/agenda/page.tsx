"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, Phone } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
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
    <DashboardLayout
      title="Agenda de visitas"
      description="Veja, em uma lista simples, as visitas marcadas com seus clientes."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Agenda de visitas" },
      ]}
    >
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
              elas aparecem aqui em forma de lista simples, para você consultar durante o dia.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 items-start"
              >
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image
                    src={lead.property.images[0]?.url || "/placeholder.jpg"}
                    alt={lead.property.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {lead.property.title}
                  </p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                      {lead.property.city} - {lead.property.state}
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatVisitDateTime(lead.visitDate, lead.visitTime)}</span>
                  </p>
                  {lead.contact?.name && (
                    <p className="text-[11px] text-gray-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        Cliente: {lead.contact.name}
                        {lead.contact.phone && ` · ${lead.contact.phone}`}
                      </span>
                    </p>
                  )}
                  {lead.contact?.phone && (
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-blue-600">
                      <a href={`tel:${lead.contact.phone}`} className="hover:text-blue-700 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Ligar
                      </a>
                      {getWhatsAppUrl(lead.contact.phone) && (
                        <a
                          href={getWhatsAppUrl(lead.contact.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 hover:text-green-800"
                        >
                          Abrir WhatsApp
                        </a>
                      )}
                      <Link
                        href={`/broker/leads/${lead.id}`}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Ver ficha do lead
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
