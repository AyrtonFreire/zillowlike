"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { useToast } from "@/contexts/ToastContext";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import DraggableLeadCard from "@/components/crm/DraggableLeadCard";
import DroppableStageColumn from "@/components/crm/DroppableStageColumn";

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
  const toast = useToast();

  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [showCrmHelp, setShowCrmHelp] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  const moveLeadToStage = useCallback(async (leadId: string, newStage: PipelineLead["pipelineStage"]) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.pipelineStage === newStage) return;

    try {
      setUpdating((prev) => ({ ...prev, [leadId]: true }));
      
      // Atualização otimista
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, pipelineStage: newStage } : l))
      );

      const response = await fetch(`/api/leads/${leadId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        // Reverte a atualização otimista
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, pipelineStage: lead.pipelineStage } : l))
        );
        throw new Error(data?.error || "Não conseguimos atualizar a etapa deste lead agora.");
      }

      toast.success("Etapa atualizada!", `Lead movido para "${STAGE_CONFIG[newStage].label}".`);
    } catch (err: any) {
      console.error("Error updating pipeline stage:", err);
      toast.error("Erro ao mover lead", err?.message || "Não conseguimos atualizar a etapa deste lead agora.");
    } finally {
      setUpdating((prev) => ({ ...prev, [leadId]: false }));
    }
  }, [leads, toast]);

  const handleAdvanceStage = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const currentIndex = STAGE_ORDER.indexOf(lead.pipelineStage);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 2) {
      return;
    }

    const nextStage = STAGE_ORDER[currentIndex + 1];

    const confirmed = await toast.confirm({
      title: "Mover lead de etapa?",
      message: `Deseja mover este lead para a etapa "${STAGE_CONFIG[nextStage].label}"?`,
      confirmText: "Sim, mover",
      cancelText: "Cancelar",
      variant: "info",
    });

    if (!confirmed) return;
    await moveLeadToStage(leadId, nextStage);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as PipelineLead["pipelineStage"];

    // Verifica se é uma etapa válida
    if (!STAGE_ORDER.includes(newStage)) return;

    await moveLeadToStage(leadId, newStage);
  };

  const activeLead = activeDragId ? leads.find((l) => l.id === activeDragId) : null;

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

        {/* Dica mobile */}
        <div className="md:hidden mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 Deslize para o lado para ver todas as etapas do funil
          </p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Container com scroll horizontal no mobile */}
          <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 min-w-max md:min-w-0">
            {STAGE_ORDER.map((stage) => {
              const config = STAGE_CONFIG[stage];
              const stageLeads = leadsByStage[stage];

              return (
                <DroppableStageColumn
                  key={stage}
                  stageId={stage}
                  label={config.label}
                  description={config.description}
                  count={stageLeads.length}
                >
                  {stageLeads.length === 0 ? (
                    <p className="text-[11px] text-gray-400 px-2 py-1">
                      Arraste leads para cá ou aguarde novas oportunidades.
                    </p>
                  ) : (
                    stageLeads.map((lead) => (
                      <DraggableLeadCard
                        key={lead.id}
                        lead={lead}
                        isUpdating={updating[lead.id]}
                        showAdvanceButton={stage !== "WON" && stage !== "LOST"}
                        onAdvance={() => handleAdvanceStage(lead.id)}
                      />
                    ))
                  )}
                </DroppableStageColumn>
              );
            })}
            </div>
          </div>

          {/* Drag Overlay - mostra o card enquanto arrasta */}
          <DragOverlay>
            {activeLead ? (
              <div className="bg-white rounded-xl border border-blue-400 p-3 text-xs text-gray-800 shadow-2xl opacity-90 rotate-3 scale-105">
                <p className="font-semibold line-clamp-1">{activeLead.property.title}</p>
                <p className="text-[11px] text-gray-500">
                  {activeLead.property.city} - {activeLead.property.state}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </DashboardLayout>
  );
}
