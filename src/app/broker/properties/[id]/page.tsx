"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Home, Users, Activity, AlertCircle, ChevronLeft, MapPin } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

interface PropertySummary {
  id: string;
  title: string;
  city: string;
  state: string;
  status: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaM2?: number | null;
  price: number;
  type: string;
}

type PipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

type LeadStatus =
  | "PENDING"
  | "MATCHING"
  | "WAITING_REALTOR_ACCEPT"
  | "WAITING_OWNER_APPROVAL"
  | "CONFIRMED"
  | "OWNER_REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";

interface PropertyLead {
  id: string;
  status: LeadStatus;
  pipelineStage: PipelineStage;
  lostReason: string | null;
  createdAt: string;
  visitDate?: string | null;
  visitTime?: string | null;
  completedAt?: string | null;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
  contact: {
    name: string;
    phone: string | null;
  } | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageFromClient?: boolean | null;
}

export default function BrokerPropertyDetailPage() {
  const params = useParams();
  const propertyId = params?.id as string;

  const [property, setProperty] = useState<PropertySummary | null>(null);
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch(`/api/broker/properties/${propertyId}/leads`);
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos carregar os dados deste imóvel agora.");
      }

      setProperty(data.property);
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (err: any) {
      console.error("Error fetching broker property detail:", err);
      setError(err?.message || "Não conseguimos carregar os dados deste imóvel agora.");
      setProperty(null);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const summarizePipeline = (items: PropertyLead[]) => {
    const grouped: Record<PipelineStage, number> = {
      NEW: 0,
      CONTACT: 0,
      VISIT: 0,
      PROPOSAL: 0,
      DOCUMENTS: 0,
      WON: 0,
      LOST: 0,
    };

    for (const lead of items) {
      const stage = (lead.pipelineStage || "NEW") as PipelineStage;
      if (grouped[stage] !== undefined) grouped[stage] += 1;
    }

    return grouped;
  };

  const pipelineCounts = summarizePipeline(leads);

  if (loading) {
    return (
      <DashboardLayout
        title="Leads & negociação"
        description="Veja como estão os leads e a negociação deste imóvel."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Corretor", href: "/broker/dashboard" },
          { label: "Meus imóveis", href: "/broker/properties" },
          { label: "Leads & negociação" },
        ]}
      >
        <CenteredSpinner message="Carregando dados do imóvel..." />
      </DashboardLayout>
    );
  }

  if (error || !property) {
    return (
      <DashboardLayout
        title="Leads & negociação"
        description="Veja como estão os leads e a negociação deste imóvel."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Corretor", href: "/broker/dashboard" },
          { label: "Meus imóveis", href: "/broker/properties" },
          { label: "Leads & negociação" },
        ]}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <button
            type="button"
            onClick={() => history.back()}
            className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Voltar
          </button>

          <EmptyState
            title="Não conseguimos carregar este imóvel"
            description={error || "Ele pode ter sido removido ou você não tem acesso a ele."}
          />
        </div>
      </DashboardLayout>
    );
  }

  const totalLeads = leads.length;
  const topOfFunnel = pipelineCounts.NEW + pipelineCounts.CONTACT;
  const inNegotiation = pipelineCounts.VISIT + pipelineCounts.PROPOSAL + pipelineCounts.DOCUMENTS;
  const resultCount = pipelineCounts.WON + pipelineCounts.LOST;

  return (
    <DashboardLayout
      title="Leads & negociação"
      description="Veja como estão os leads e a negociação deste imóvel."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Meus imóveis", href: "/broker/properties" },
        { label: property.title },
      ]}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Resumo do imóvel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{property.title}</h1>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>
                {property.city} - {property.state}
              </span>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Esta visão é apenas um apoio para você enxergar, por imóvel, em que pé estão os leads e as negociações relacionadas.
            </p>
          </div>
          <div className="text-right text-sm text-gray-700 space-y-1">
            <p>
              <span className="text-gray-500 mr-1">Tipo:</span>
              <span className="font-medium">{property.type}</span>
            </p>
            {property.bedrooms && (
              <p>
                <span className="text-gray-500 mr-1">Quartos:</span>
                <span className="font-medium">{property.bedrooms}</span>
              </p>
            )}
            {property.bathrooms && (
              <p>
                <span className="text-gray-500 mr-1">Banheiros:</span>
                <span className="font-medium">{property.bathrooms}</span>
              </p>
            )}
            {property.areaM2 && (
              <p>
                <span className="text-gray-500 mr-1">Área:</span>
                <span className="font-medium">{property.areaM2}m²</span>
              </p>
            )}
          </div>
        </div>

        {/* Resumo dos leads do imóvel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-semibold text-gray-700">Leads deste imóvel</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Quantidade total de leads gerados para este anúncio.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-semibold text-gray-700">Em andamento</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{topOfFunnel + inNegotiation}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Leads ainda em atendimento, contato ou negociação (inclui visitas e propostas).
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <p className="text-xs font-semibold text-gray-700">Resultado</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{resultCount}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Leads que já foram fechados (WON) ou marcados como perdidos (LOST).
            </p>
          </div>
        </div>

        {/* Lista de leads do imóvel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Leads & negociação deste imóvel</h2>
            <Link
              href="/broker/crm"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver lista completa de leads
            </Link>
          </div>

          {leads.length === 0 ? (
            <EmptyState
              title="Ainda não há leads para este imóvel"
              description="Assim que novos interessados chegarem, você acompanha aqui em que pé está cada atendimento."
            />
          ) : (
            <div className="space-y-3 text-xs text-gray-700">
              {leads.map((lead) => {
                const stageLabel =
                  lead.pipelineStage === "NEW"
                    ? "Novo"
                    : lead.pipelineStage === "CONTACT"
                    ? "Em contato"
                    : lead.pipelineStage === "VISIT"
                    ? "Visita/agenda"
                    : lead.pipelineStage === "PROPOSAL"
                    ? "Proposta"
                    : lead.pipelineStage === "DOCUMENTS"
                    ? "Documentação"
                    : lead.pipelineStage === "WON"
                    ? "Fechado"
                    : "Perdido";

                return (
                  <div
                    key={lead.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border border-gray-100 hover:border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {lead.contact?.name || "Lead sem nome"}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Etapa: {stageLabel}
                      </p>
                      {lead.visitDate && lead.visitTime && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Visita marcada para {new Date(lead.visitDate).toLocaleDateString("pt-BR")} às {lead.visitTime}
                        </p>
                      )}
                      {lead.nextActionDate && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Próximo passo em {new Date(lead.nextActionDate).toLocaleDateString("pt-BR")} — {lead.nextActionNote}
                        </p>
                      )}
                      {lead.lastMessageAt && lead.lastMessagePreview && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                          Última mensagem ({lead.lastMessageFromClient ? "cliente" : "equipe"}) em
                          {" "}
                          {new Date(lead.lastMessageAt).toLocaleDateString("pt-BR")} — {lead.lastMessagePreview}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <p className="text-[11px] text-gray-500">
                        Criado em {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      <Link
                        href={`/broker/leads/${lead.id}`}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Ver ficha
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
