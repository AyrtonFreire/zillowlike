"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  Phone,
  Eye,
  FileText,
  FileCheck,
  Trophy,
  XCircle,
  ChevronRight,
  Sparkles,
  Search,
  MessageCircle,
  Clock,
  ListChecks,
  CheckSquare,
  Square,
} from "lucide-react";
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
  nextActionDate?: string | null;
  nextActionNote?: string | null;
  lastContactAt?: string | null;
  hasUnreadMessages?: boolean;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageFromClient?: boolean;
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
  const [reminderUpdating, setReminderUpdating] = useState<Record<string, boolean>>({});
  const [showCrmHelp, setShowCrmHelp] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | "unread" | "sla" | "noContact">("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [collapsedByStage, setCollapsedByStage] = useState<Record<PipelineLead["pipelineStage"], boolean>>({
    NEW: false,
    CONTACT: false,
    VISIT: false,
    PROPOSAL: false,
    DOCUMENTS: false,
    WON: false,
    LOST: false,
  });
  const [visibleCountByStage, setVisibleCountByStage] = useState<Record<PipelineLead["pipelineStage"], number>>({
    NEW: 20,
    CONTACT: 20,
    VISIT: 20,
    PROPOSAL: 20,
    DOCUMENTS: 20,
    WON: 20,
    LOST: 20,
  });
  const [confirmDragMoves, setConfirmDragMoves] = useState(true);

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

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const key = "zlw_crm_confirm_drag_moves_v1";
      const stored = window.localStorage.getItem(key);
      if (stored === "0") {
        setConfirmDragMoves(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchLeads = useCallback(async () => {
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
  }, [realtorId]);

  useEffect(() => {
    if (!realtorId) return;
    fetchLeads();
  }, [realtorId, fetchLeads]);

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

  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const isSameDay = (a: Date, b: Date) => {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  const isLeadSla = (lead: PipelineLead) => {
    if (!lead.nextActionDate) return { overdue: false, today: false };
    const d = new Date(lead.nextActionDate);
    if (Number.isNaN(d.getTime())) return { overdue: false, today: false };
    const today = isSameDay(d, now);
    const overdue = d.getTime() < now.getTime() && !today;
    return { overdue, today };
  };

  const leadMatchesQuery = (lead: PipelineLead, q: string) => {
    const queryNorm = String(q || "").trim().toLowerCase();
    if (!queryNorm) return true;

    const hay = [
      lead?.property?.title,
      lead?.property?.city,
      lead?.property?.state,
      lead?.property?.neighborhood,
      lead?.contact?.name,
      lead?.lastMessagePreview,
    ]
      .map((s) => String(s || "").toLowerCase())
      .join(" | ");

    return hay.includes(queryNorm);
  };

  const leadPassesQuickFilter = (lead: PipelineLead) => {
    if (quickFilter === "all") return true;
    if (quickFilter === "unread") return !!lead.hasUnreadMessages;
    if (quickFilter === "sla") {
      const { overdue, today } = isLeadSla(lead);
      return overdue || today;
    }
    if (quickFilter === "noContact") {
      if (!lead.lastContactAt) return true;
      const d = new Date(lead.lastContactAt);
      if (Number.isNaN(d.getTime())) return true;
      return d.getTime() < fortyEightHoursAgo.getTime();
    }
    return true;
  };

  const urgencySort = (a: PipelineLead, b: PipelineLead) => {
    const au = a.hasUnreadMessages ? 1 : 0;
    const bu = b.hasUnreadMessages ? 1 : 0;
    if (au !== bu) return bu - au;

    const aSla = isLeadSla(a);
    const bSla = isLeadSla(b);
    const aRank = aSla.overdue ? 2 : aSla.today ? 1 : 0;
    const bRank = bSla.overdue ? 2 : bSla.today ? 1 : 0;
    if (aRank !== bRank) return bRank - aRank;

    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
      return bTime - aTime;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  };

  const filteredLeads = useMemo(() => {
    return (leads || []).filter((lead) => leadMatchesQuery(lead, query)).filter((lead) => leadPassesQuickFilter(lead));
  }, [leads, query, quickFilter]);

  const toggleSelectLead = useCallback((leadId: string) => {
    setSelectedLeadIds((prev) => {
      const id = String(leadId);
      if (!id) return prev;
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeadIds([]);
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedLeadIds(filteredLeads.map((l) => String(l.id)));
  }, [filteredLeads]);

  const saveReminder = useCallback(
    async (leadId: string, date: string | null, note: string | null) => {
      try {
        setReminderUpdating((prev) => ({ ...prev, [leadId]: true }));

        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  nextActionDate: date,
                  nextActionNote: note,
                }
              : l
          )
        );

        const response = await fetch(`/api/leads/${leadId}/reminder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, note }),
        });

        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Não conseguimos salvar este lembrete agora.");
        }

        toast.success("Lembrete atualizado!", "Próxima ação registrada.");
      } catch (err: any) {
        console.error("Error saving reminder:", err);
        toast.error("Erro ao salvar lembrete", err?.message || "Tente novamente.");
        fetchLeads();
      } finally {
        setReminderUpdating((prev) => ({ ...prev, [leadId]: false }));
      }
    },
    [toast, fetchLeads]
  );

  const moveLeadToStage = useCallback(async (leadId: string, newStage: PipelineLead["pipelineStage"], options?: { silent?: boolean }) => {
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

      if (!options?.silent) {
        toast.success("Etapa atualizada!", `Lead movido para "${STAGE_CONFIG[newStage].label}".`);
      }
    } catch (err: any) {
      console.error("Error updating pipeline stage:", err);
      if (!options?.silent) {
        toast.error("Erro ao mover lead", err?.message || "Não conseguimos atualizar a etapa deste lead agora.");
      }
    } finally {
      setUpdating((prev) => ({ ...prev, [leadId]: false }));
    }
  }, [leads, toast]);

  const bulkMoveSelected = useCallback(
    async (newStage: PipelineLead["pipelineStage"]) => {
      const ids = [...selectedLeadIds];
      if (ids.length === 0) return;

      const confirmed = await toast.confirm({
        title: "Mover leads em lote?",
        message: `Mover ${ids.length} lead(s) para "${STAGE_CONFIG[newStage].label}"?`,
        confirmText: "Sim, mover",
        cancelText: "Cancelar",
        variant: "info",
      });

      if (!confirmed) return;

      for (const id of ids) {
        await moveLeadToStage(String(id), newStage, { silent: true });
      }

      toast.success("Leads atualizados!", `${ids.length} lead(s) movidos para "${STAGE_CONFIG[newStage].label}".`);
      clearSelection();
    },
    [selectedLeadIds, toast, moveLeadToStage, clearSelection]
  );

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

    if (selectionMode) return;

    const current = leads.find((l) => String(l.id) === String(leadId));
    if (!current || current.pipelineStage === newStage) return;

    if (confirmDragMoves) {
      const confirmed = await toast.confirm({
        title: "Mover lead de etapa?",
        message: `Deseja mover este lead para a etapa "${STAGE_CONFIG[newStage].label}"?`,
        confirmText: "Sim, mover",
        cancelText: "Cancelar",
        variant: "info",
      });

      if (!confirmed) {
        setLeads((prev) =>
          prev.map((l) => (String(l.id) === String(leadId) ? { ...l, pipelineStage: current.pipelineStage } : l))
        );
        return;
      }

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("zlw_crm_confirm_drag_moves_v1", "0");
        }
      } catch {
        // ignore
      }

      setConfirmDragMoves(false);
    }

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

    for (const lead of filteredLeads) {
      const stage = lead.pipelineStage || "NEW";
      map[stage].push(lead);
    }

    for (const stage of STAGE_ORDER) {
      map[stage] = map[stage].sort(urgencySort);
    }

    return map;
  }, [filteredLeads]);

  // Total de leads para cálculo de progresso
  const totalLeads = filteredLeads.length;
  const wonLeads = leadsByStage["WON"].length;
  const progressPercent = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  if (loading) {
    return <CenteredSpinner message="Carregando sua jornada de leads..." />;
  }

  return (
    <div className="bg-gray-50">
        <div className="hidden md:block bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por cliente, imóvel, bairro, cidade ou mensagem…"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickFilter("all")}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                    quickFilter === "all"
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFilter("unread")}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border ${
                    quickFilter === "unread"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Não lidas
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFilter("sla")}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border ${
                    quickFilter === "sla"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Próxima ação
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFilter("noContact")}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                    quickFilter === "noContact"
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  48h sem contato
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode((v) => !v);
                    setSelectedLeadIds([]);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border ${
                    selectionMode
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <ListChecks className="w-4 h-4" />
                  Selecionar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !confirmDragMoves;
                    setConfirmDragMoves(next);
                    try {
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("zlw_crm_confirm_drag_moves_v1", next ? "1" : "0");
                      }
                    } catch {
                      // ignore
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border ${
                    confirmDragMoves
                      ? "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  {confirmDragMoves ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  Confirmar arrasto
                </button>
              </div>
            </div>

            {selectionMode && (
              <div className="mt-3 flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  Selecionados: <span className="font-semibold text-gray-900">{selectedLeadIds.length}</span>
                </div>

                <button type="button" onClick={selectAllVisible} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Selecionar tudo (visível)
                </button>

                <button type="button" onClick={clearSelection} className="text-sm font-semibold text-gray-600 hover:text-gray-900">
                  Limpar
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-gray-600">Mover para:</span>
                  {STAGE_ORDER.map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={selectedLeadIds.length === 0}
                      onClick={() => bulkMoveSelected(st)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {STAGE_CONFIG[st].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

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
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: "all" as const, label: "Todos" },
                { key: "unread" as const, label: "Não lidas" },
                { key: "sla" as const, label: "Próxima ação" },
                { key: "noContact" as const, label: "48h" },
              ].map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setQuickFilter(it.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    quickFilter === it.key
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {it.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectionMode((v) => !v);
                  setSelectedLeadIds([]);
                }}
                className={`ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  selectionMode ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                <ListChecks className="w-4 h-4" />
                Selecionar
              </button>
            </div>
            {selectionMode && (
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  Selecionados: <span className="font-semibold text-gray-900">{selectedLeadIds.length}</span>
                </div>
                <button type="button" onClick={selectAllVisible} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Selecionar tudo
                </button>
              </div>
            )}
          </div>
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

                const isCollapsed = !!collapsedByStage[stage];
                const visibleCount = visibleCountByStage[stage] || 20;
                const visibleLeads = isCollapsed ? [] : stageLeads.slice(0, visibleCount);

                return (
                  <DroppableStageColumn
                    key={stage}
                    stageId={stage}
                    label={config.label}
                    description={config.description}
                    count={stageLeads.length}
                    collapsed={isCollapsed}
                    onToggleCollapsed={() =>
                      setCollapsedByStage((prev) => ({
                        ...prev,
                        [stage]: !prev[stage],
                      }))
                    }
                  >
                    {stageLeads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Icon className={`w-8 h-8 ${config.color} opacity-30 mb-2`} />
                        <p className="text-[11px] text-gray-400">
                          Nenhum lead
                        </p>
                      </div>
                    ) : (
                      <>
                        {visibleLeads.map((lead) => (
                          <DraggableLeadCard
                            key={lead.id}
                            lead={lead}
                            isUpdating={updating[lead.id]}
                            selectionMode={selectionMode}
                            selected={selectedLeadIds.includes(String(lead.id))}
                            onToggleSelected={() => toggleSelectLead(String(lead.id))}
                            onOpenChat={() => {
                              if (typeof window !== "undefined") {
                                window.location.href = `/broker/chats?lead=${lead.id}`;
                              }
                            }}
                            onToggleReminder={() => {
                              const hasReminder = !!lead.nextActionDate || !!lead.nextActionNote;
                              if (hasReminder) {
                                saveReminder(String(lead.id), null, null);
                              } else {
                                const d = new Date();
                                d.setDate(d.getDate() + 1);
                                d.setHours(10, 0, 0, 0);
                                saveReminder(String(lead.id), d.toISOString(), null);
                              }
                            }}
                            isReminderUpdating={reminderUpdating[lead.id]}
                            showAdvanceButton={!selectionMode && stage !== "WON" && stage !== "LOST"}
                            onAdvance={() => handleAdvanceStage(lead.id)}
                          />
                        ))}
                        {stageLeads.length > visibleCount && !isCollapsed && (
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleCountByStage((prev) => ({
                                ...prev,
                                [stage]: (prev[stage] || 20) + 20,
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          >
                            Mostrar mais ({stageLeads.length - visibleCount})
                          </button>
                        )}
                      </>
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
                          {stageLeads.slice(0, visibleCountByStage[mobileActiveStage] || 20).map((lead) => (
                            <DraggableLeadCard
                              key={lead.id}
                              lead={lead}
                              isUpdating={updating[lead.id]}
                              selectionMode={selectionMode}
                              selected={selectedLeadIds.includes(String(lead.id))}
                              onToggleSelected={() => toggleSelectLead(String(lead.id))}
                              onOpenChat={() => {
                                if (typeof window !== "undefined") {
                                  window.location.href = `/broker/chats?lead=${lead.id}`;
                                }
                              }}
                              onToggleReminder={() => {
                                const hasReminder = !!lead.nextActionDate || !!lead.nextActionNote;
                                if (hasReminder) {
                                  saveReminder(String(lead.id), null, null);
                                } else {
                                  const d = new Date();
                                  d.setDate(d.getDate() + 1);
                                  d.setHours(10, 0, 0, 0);
                                  saveReminder(String(lead.id), d.toISOString(), null);
                                }
                              }}
                              isReminderUpdating={reminderUpdating[lead.id]}
                              showAdvanceButton={!selectionMode && mobileActiveStage !== "WON" && mobileActiveStage !== "LOST"}
                              onAdvance={() => handleAdvanceStage(lead.id)}
                            />
                          ))}
                          {stageLeads.length > (visibleCountByStage[mobileActiveStage] || 20) && (
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleCountByStage((prev) => ({
                                  ...prev,
                                  [mobileActiveStage]: (prev[mobileActiveStage] || 20) + 20,
                                }))
                              }
                              className="w-full px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            >
                              Mostrar mais ({stageLeads.length - (visibleCountByStage[mobileActiveStage] || 20)})
                            </button>
                          )}
                        </div>
                      )}

                      {selectionMode && selectedLeadIds.length > 0 && (
                        <div className="p-3 rounded-xl border border-purple-200 bg-purple-50">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-purple-800 font-semibold">
                              Mover {selectedLeadIds.length} lead(s)
                            </div>
                            <button
                              type="button"
                              onClick={clearSelection}
                              className="text-xs font-semibold text-purple-700 hover:text-purple-900"
                            >
                              Limpar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {STAGE_ORDER.map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => bulkMoveSelected(st)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-purple-200 bg-white text-purple-800 hover:bg-purple-100"
                              >
                                {STAGE_CONFIG[st].label}
                              </button>
                            ))}
                          </div>
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
