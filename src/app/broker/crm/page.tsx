"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";

interface PipelineLead {
  id: string;
  status: string;
  pipelineStage: "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";
  createdAt: string;
  property: {
    id: string;
    title: string;
    price: number;
    type: string;
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

const STAGE_ORDER: PipelineLead["pipelineStage"][] = [
  "NEW",
  "CONTACT",
  "VISIT",
  "PROPOSAL",
  "DOCUMENTS",
  "WON",
  "LOST",
];

const STAGE_CONFIG: Record<PipelineLead["pipelineStage"], { label: string; description: string }> = {
  NEW: {
    label: "Novo",
    description: "Leads que chegaram e ainda não tiveram contato.",
  },
  CONTACT: {
    label: "Em contato",
    description: "Você já falou ou tentou falar com o cliente.",
  },
  VISIT: {
    label: "Visita",
    description: "Visita combinada ou já realizada.",
  },
  PROPOSAL: {
    label: "Proposta",
    description: "Cliente avaliando valores ou condições.",
  },
  DOCUMENTS: {
    label: "Documentação",
    description: "Acertando documentos e detalhes finais.",
  },
  WON: {
    label: "Fechado",
    description: "Negócio concluído (vendido/alugado).",
  },
  LOST: {
    label: "Perdido",
    description: "Negócio não avançou.",
  },
};

export default function BrokerCrmPage() {
  const { data: session } = useSession();
  const realtorId = (session?.user as any)?.id || "";

  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [showCrmHelp, setShowCrmHelp] = useState(false);

  useEffect(() => {
    if (!realtorId) return;
    fetchLeads();
  }, [realtorId]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const key = "zlw_help_broker_crm_v1";
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        setShowCrmHelp(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const fetchLeads = async () => {
    try {
      if (!realtorId) return;
      setError(null);
      setLoading(true);
      const response = await fetch("/api/leads/my-pipeline");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos carregar seus leads agora.");
      }

      setLeads(data || []);
    } catch (err: any) {
      console.error("Error fetching pipeline leads:", err);
      setError(err?.message || "Não conseguimos carregar seus leads do funil agora.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismissCrmHelp = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("zlw_help_broker_crm_v1", "dismissed");
      }
    } catch {
      // ignore storage errors
    }
    setShowCrmHelp(false);
  };

  const handleAdvanceStage = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const currentIndex = STAGE_ORDER.indexOf(lead.pipelineStage);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 2) {
      // Se já estiver em FECHADO ou PERDIDO, não avança automaticamente
      return;
    }

    const nextStage = STAGE_ORDER[currentIndex + 1];

    if (!confirm(`Mover este lead para a etapa "${STAGE_CONFIG[nextStage].label}"?`)) return;

    try {
      setUpdating((prev) => ({ ...prev, [leadId]: true }));
      const response = await fetch(`/api/leads/${leadId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos atualizar a etapa deste lead agora.");
      }

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, pipelineStage: nextStage } : l))
      );
    } catch (err: any) {
      console.error("Error updating pipeline stage:", err);
      alert(err?.message || "Não conseguimos atualizar a etapa deste lead agora.");
    } finally {
      setUpdating((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  const leadsByStage = useMemo(() => {
    const map: Record<PipelineLead["pipelineStage"], PipelineLead[]> = {
      NEW: [],
      CONTACT: [],
      VISIT: [],
      PROPOSAL: [],
      DOCUMENTS: [],
      WON: [],
      LOST: [],
    };

    for (const lead of leads) {
      const stage = lead.pipelineStage || "NEW";
      map[stage].push(lead);
    }

    return map;
  }, [leads]);

  if (loading) {
    return <CenteredSpinner message="Carregando seu funil de leads..." />;
  }

  return (
    <DashboardLayout
      title="Funil de Leads"
      description="Veja em que etapa estão as suas oportunidades."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Funil de Leads" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => history.back()}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </button>
          {showCrmHelp && (
            <div className="text-xs text-gray-500 max-w-md text-right flex flex-col items-end gap-1">
              <p>
                Este quadro ajuda você a enxergar rapidamente em que etapa estão os seus leads. Vá movendo conforme for
                falando com os clientes, sem pressa.
              </p>
              <button
                type="button"
                onClick={handleDismissCrmHelp}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-800"
              >
                Entendi
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto md:overflow-visible">
          {STAGE_ORDER.map((stage) => {
            const config = STAGE_CONFIG[stage];
            const stageLeads = leadsByStage[stage];

            return (
              <div
                key={stage}
                className="bg-gray-50 rounded-2xl border border-gray-200 flex flex-col max-h-[70vh]"
              >
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">{config.label}</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200">
                      {stageLeads.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    {config.description}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {stageLeads.length === 0 ? (
                    <p className="text-[11px] text-gray-400 px-2 py-1">
                      Nenhum lead nesta etapa por enquanto.
                    </p>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white rounded-xl border border-gray-200 p-3 text-xs text-gray-800 flex flex-col gap-1"
                      >
                        <div className="flex items-start gap-2">
                          <div className="relative w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image
                              src={lead.property.images[0]?.url || "/placeholder.jpg"}
                              alt={lead.property.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold line-clamp-2">
                              {lead.property.title}
                            </p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">
                                {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                                {lead.property.city} - {lead.property.state}
                              </span>
                            </p>
                            {lead.contact?.name && (
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Cliente: {lead.contact.name}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2">
                          <Link
                            href={`/broker/leads/${lead.id}`}
                            className="inline-flex items-center text-[11px] text-blue-600 hover:text-blue-700"
                          >
                            Ver detalhes
                            <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Link>
                          {stage !== "WON" && stage !== "LOST" && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStage(lead.id)}
                              disabled={!!updating[lead.id]}
                              className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {updating[lead.id] ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Movendo...
                                </>
                              ) : (
                                "Avançar etapa"
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
