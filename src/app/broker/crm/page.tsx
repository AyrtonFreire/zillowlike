"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Users, Phone, Eye, FileText, FileCheck, Trophy, XCircle, ChevronRight, Sparkles } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";
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

const STAGE_CONFIG: Record<PipelineLead["pipelineStage"], { 
  label: string; 
  description: string; 
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  NEW: {
    label: "Novos",
    description: "Aguardando primeiro contato",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  CONTACT: {
    label: "Contato",
    description: "Em conversa com o cliente",
    icon: Phone,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  VISIT: {
    label: "Visita",
    description: "Visita agendada ou realizada",
    icon: Eye,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  PROPOSAL: {
    label: "Proposta",
    description: "Negociando condições",
    icon: FileText,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
  DOCUMENTS: {
    label: "Docs",
    description: "Documentação em andamento",
    icon: FileCheck,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  WON: {
    label: "Fechado",
    description: "Negócio concluído!",
    icon: Trophy,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  LOST: {
    label: "Perdido",
    description: "Não avançou",
    icon: XCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
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
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Estado para visualização móvel
  const [mobileActiveStage, setMobileActiveStage] = useState<PipelineLead["pipelineStage"]>("NEW");

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

  // Total de leads para cálculo de progresso
  const totalLeads = leads.length;
  const wonLeads = leadsByStage["WON"].length;
  const progressPercent = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  if (loading) {
    return <CenteredSpinner message="Carregando sua jornada de leads..." />;
  }

  return (
    <div className="bg-gray-50">
        {/* Stats bar mobile */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progresso geral</span>
            <span className="text-sm font-semibold text-teal-600">{progressPercent}% fechados</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Navegação de etapas no mobile */}
        <div className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 p-2 min-w-max">
              {STAGE_ORDER.map((stage) => {
                const config = STAGE_CONFIG[stage];
                const count = leadsByStage[stage].length;
                const Icon = config.icon;
                const isActive = mobileActiveStage === stage;
                
                return (
                  <button
                    key={stage}
                    onClick={() => setMobileActiveStage(stage)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isActive 
                        ? `${config.bgColor} ${config.color} ${config.borderColor} border shadow-sm` 
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                    {count > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                        isActive ? "bg-white/50" : "bg-gray-200"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
            {error}
          </div>
        )}

        {/* Help tooltip */}
        <AnimatePresence>
          {showCrmHelp && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mt-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-teal-800 font-medium mb-1">Bem-vindo à Jornada do Cliente!</p>
                  <p className="text-xs text-teal-700">
                    Arraste os leads entre as etapas conforme avançar nas negociações. 
                    No mobile, toque em uma etapa para ver seus leads.
                  </p>
                </div>
                <button
                  onClick={handleDismissCrmHelp}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 whitespace-nowrap"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Desktop: Grid de colunas */}
          <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
              {STAGE_ORDER.map((stage) => {
                const config = STAGE_CONFIG[stage];
                const stageLeads = leadsByStage[stage];
                const Icon = config.icon;

                return (
                  <DroppableStageColumn
                    key={stage}
                    stageId={stage}
                    label={config.label}
                    description={config.description}
                    count={stageLeads.length}
                  >
                    {stageLeads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Icon className={`w-8 h-8 ${config.color} opacity-30 mb-2`} />
                        <p className="text-[11px] text-gray-400">
                          Nenhum lead
                        </p>
                      </div>
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

          {/* Mobile: Uma etapa por vez */}
          <div className="md:hidden px-4 py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileActiveStage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {(() => {
                  const config = STAGE_CONFIG[mobileActiveStage];
                  const stageLeads = leadsByStage[mobileActiveStage];
                  const Icon = config.icon;
                  const currentIndex = STAGE_ORDER.indexOf(mobileActiveStage);
                  const nextStage = currentIndex < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIndex + 1] : null;
                  const prevStage = currentIndex > 0 ? STAGE_ORDER[currentIndex - 1] : null;

                  return (
                    <div className="space-y-3">
                      {/* Header da etapa */}
                      <div className={`p-4 rounded-xl ${config.bgColor} ${config.borderColor} border`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
                            <p className="text-xs text-gray-600">{config.description}</p>
                          </div>
                          <div className="ml-auto">
                            <span className={`text-2xl font-bold ${config.color}`}>{stageLeads.length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Lista de leads */}
                      {stageLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Icon className={`w-12 h-12 ${config.color} opacity-20 mb-3`} />
                          <p className="text-sm text-gray-500">Nenhum lead nesta etapa</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Arraste leads de outras etapas para cá
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {stageLeads.map((lead) => (
                            <DraggableLeadCard
                              key={lead.id}
                              lead={lead}
                              isUpdating={updating[lead.id]}
                              showAdvanceButton={mobileActiveStage !== "WON" && mobileActiveStage !== "LOST"}
                              onAdvance={() => handleAdvanceStage(lead.id)}
                            />
                          ))}
                        </div>
                      )}

                      {/* Navegação entre etapas */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        {prevStage ? (
                          <button
                            onClick={() => setMobileActiveStage(prevStage)}
                            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                          >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                            {STAGE_CONFIG[prevStage].label}
                          </button>
                        ) : <div />}
                        
                        {nextStage && (
                          <button
                            onClick={() => setMobileActiveStage(nextStage)}
                            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                          >
                            {STAGE_CONFIG[nextStage].label}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeLead ? (
              <div className="bg-white rounded-xl border-2 border-teal-400 p-3 text-xs text-gray-800 shadow-2xl rotate-2 scale-105">
                <p className="font-semibold line-clamp-1">{activeLead.property.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {activeLead.property.city} - {activeLead.property.state}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
    </div>
  );
}
