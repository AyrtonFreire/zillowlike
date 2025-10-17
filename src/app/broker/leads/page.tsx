"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, MapPin, Calendar, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import CountdownTimer from "@/components/queue/CountdownTimer";
import StatusIndicator from "@/components/queue/StatusIndicator";

interface Lead {
  id: string;
  status: "RESERVED" | "ACCEPTED";
  createdAt: string;
  reservedUntil?: string | null;
  respondedAt?: string | null;
  property: {
    id: string;
    title: string;
    price: number;
    type: string;
    city: string;
    state: string;
    neighborhood?: string | null;
    street: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    images: Array<{ url: string }>;
  };
  contact?: {
    name: string;
    email: string;
    phone?: string | null;
  };
}

export default function MyLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "reserved" | "accepted">("all");

  // TODO: Get from auth session
  const realtorId = "demo-realtor-id";

  useEffect(() => {
    fetchLeads();
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await fetch(`/api/leads/my-leads?realtorId=${realtorId}`);
      const data = await response.json();
      setLeads(data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (leadId: string) => {
    if (!confirm("Deseja aceitar este lead?")) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Lead aceito com sucesso!");
        fetchLeads();
      } else {
        alert(data.error || "Erro ao aceitar lead");
      }
    } catch (error) {
      console.error("Error accepting lead:", error);
      alert("Erro ao aceitar lead");
    }
  };

  const handleReject = async (leadId: string) => {
    if (!confirm("Deseja recusar este lead?")) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Lead recusado");
        fetchLeads();
      } else {
        alert(data.error || "Erro ao recusar lead");
      }
    } catch (error) {
      console.error("Error rejecting lead:", error);
      alert("Erro ao recusar lead");
    }
  };

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

  const filteredLeads = leads.filter((lead) => {
    if (filter === "all") return true;
    if (filter === "reserved") return lead.status === "RESERVED";
    if (filter === "accepted") return lead.status === "ACCEPTED";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meus Leads</h1>
              <p className="text-gray-600 mt-1">
                {filteredLeads.length} {filteredLeads.length === 1 ? "lead ativo" : "leads ativos"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/broker/leads/mural"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Ver Mural de Leads
              </Link>
              <button
                onClick={fetchLeads}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Atualizar
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todos ({leads.length})
            </button>
            <button
              onClick={() => setFilter("reserved")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "reserved"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Reservados ({leads.filter((l) => l.status === "RESERVED").length})
            </button>
            <button
              onClick={() => setFilter("accepted")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "accepted"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Em Atendimento ({leads.filter((l) => l.status === "ACCEPTED").length})
            </button>
          </div>
        </div>
      </div>

      {/* Leads List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum lead ativo no momento</p>
            <Link
              href="/broker/leads/mural"
              className="inline-block mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Ver Mural de Leads
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex gap-6">
                    {/* Property Image */}
                    <div className="flex-shrink-0">
                      <div className="relative w-48 h-48 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={lead.property.images[0]?.url || "/placeholder.jpg"}
                          alt={lead.property.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>

                    {/* Property Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Link
                            href={`/property/${lead.property.id}`}
                            className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {lead.property.title}
                          </Link>
                          <p className="text-2xl font-bold text-blue-600 mt-1">
                            {formatPrice(lead.property.price)}
                          </p>
                        </div>
                        <StatusIndicator status={lead.status} />
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {lead.property.street}, {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                          {lead.property.city} - {lead.property.state}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Tipo:</span>
                          <span className="ml-2 font-medium text-gray-900">{lead.property.type}</span>
                        </div>
                        {lead.property.bedrooms && (
                          <div className="text-sm">
                            <span className="text-gray-500">Quartos:</span>
                            <span className="ml-2 font-medium text-gray-900">{lead.property.bedrooms}</span>
                          </div>
                        )}
                        {lead.property.bathrooms && (
                          <div className="text-sm">
                            <span className="text-gray-500">Banheiros:</span>
                            <span className="ml-2 font-medium text-gray-900">{lead.property.bathrooms}</span>
                          </div>
                        )}
                        {lead.property.areaM2 && (
                          <div className="text-sm">
                            <span className="text-gray-500">Área:</span>
                            <span className="ml-2 font-medium text-gray-900">{lead.property.areaM2}m²</span>
                          </div>
                        )}
                      </div>

                      {/* Contact Info */}
                      {lead.contact && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Informações de Contato</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="font-medium">{lead.contact.name}</span>
                            </div>
                            {lead.contact.phone && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <Phone className="w-4 h-4" />
                                <a
                                  href={`tel:${lead.contact.phone}`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {lead.contact.phone}
                                </a>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-700">
                              <Mail className="w-4 h-4" />
                              <a
                                href={`mailto:${lead.contact.email}`}
                                className="hover:text-blue-600 transition-colors"
                              >
                                {lead.contact.email}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Criado {getTimeAgo(lead.createdAt)}</span>
                        </div>
                        {lead.respondedAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Respondido {getTimeAgo(lead.respondedAt)}</span>
                          </div>
                        )}
                        {lead.reservedUntil && lead.status === "RESERVED" && (
                          <CountdownTimer targetDate={new Date(lead.reservedUntil)} />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        {lead.status === "RESERVED" && (
                          <>
                            <button
                              onClick={() => handleAccept(lead.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-5 h-5" />
                              Aceitar Lead
                            </button>
                            <button
                              onClick={() => handleReject(lead.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                            >
                              <XCircle className="w-5 h-5" />
                              Recusar
                            </button>
                          </>
                        )}
                        {lead.status === "ACCEPTED" && (
                          <>
                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                              <Calendar className="w-5 h-5" />
                              Marcar Visita
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
                              <CheckCircle className="w-5 h-5" />
                              Concluir Atendimento
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
