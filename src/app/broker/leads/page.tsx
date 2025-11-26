"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { 
  Phone, Mail, MapPin, Calendar, CheckCircle, XCircle, Clock, RefreshCw, 
  MessageCircle, AlertCircle, ChevronDown, ChevronRight, Filter, User,
  ExternalLink, LayoutList, Columns3, Users, Handshake, Trophy, X,
  Bell, PhoneOff, CalendarClock, Sparkles, GripVertical
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import CountdownTimer from "@/components/queue/CountdownTimer";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import DashboardLayout from "@/components/DashboardLayout";

// Tipo de imóvel traduzido
const PROPERTY_TYPES: Record<string, string> = {
  HOUSE: "Casa",
  APARTMENT: "Apartamento",
  CONDO: "Condomínio",
  STUDIO: "Studio",
  LAND: "Terreno",
  COMMERCIAL: "Comercial",
};

// Pipeline simplificado: 4 etapas ao invés de 7
type PipelineStage = "NEW" | "CONTACT" | "NEGOTIATION" | "CLOSED";
const PIPELINE_STAGES: { id: PipelineStage; label: string; icon: any; color: string; bgColor: string }[] = [
  { id: "NEW", label: "Novos", icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
  { id: "CONTACT", label: "Contato", icon: Phone, color: "text-amber-600", bgColor: "bg-amber-50" },
  { id: "NEGOTIATION", label: "Negociação", icon: Handshake, color: "text-purple-600", bgColor: "bg-purple-50" },
  { id: "CLOSED", label: "Fechado", icon: Trophy, color: "text-emerald-600", bgColor: "bg-emerald-50" },
];

// Mapeamento de status do lead para etapa do pipeline
function getLeadPipelineStage(lead: Lead): PipelineStage {
  // Se tem pipelineStage definido, usar
  if ((lead as any).pipelineStage) {
    const stage = (lead as any).pipelineStage;
    // Mapear as 7 etapas antigas para as 4 novas
    if (stage === "NEW") return "NEW";
    if (stage === "CONTACT") return "CONTACT";
    if (["VISIT", "PROPOSAL", "DOCUMENTS"].includes(stage)) return "NEGOTIATION";
    if (stage === "WON") return "CLOSED";
    if (stage === "LOST") return "CLOSED"; // Perdidos também vão para fechado
  }
  // Fallback baseado no status
  return lead.status === "RESERVED" ? "NEW" : "CONTACT";
}

interface Lead {
  id: string;
  status: "RESERVED" | "ACCEPTED";
  createdAt: string;
  reservedUntil?: string | null;
  respondedAt?: string | null;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
  lastContactAt?: string | null;
  hasUnreadMessages?: boolean;
  clientChatToken?: string | null;
  chatUrl?: string | null;
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

interface LeadNote {
  id: string;
  leadId: string;
  realtorId: string;
  content: string;
  createdAt: string;
}

// Componente de coluna droppable para o pipeline
function DroppableColumn({ stageId, children }: { stageId: PipelineStage; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: stageId });
  
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border transition-colors ${
        isOver ? "border-teal-400 bg-teal-50/50" : "border-gray-200 bg-white"
      }`}
    >
      {children}
    </div>
  );
}

// Componente de card draggable para o pipeline (ultra-compacto)
function DraggableCard({ lead, formatPrice }: { lead: Lead; formatPrice: (n: number) => string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white rounded-lg border border-gray-200 p-2 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? "opacity-50 shadow-lg" : "hover:shadow-sm"
      }`}
    >
      <div className="flex gap-2">
        {/* Mini thumbnail */}
        <div className="relative w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
          {lead.property.images[0]?.url ? (
            <Image src={lead.property.images[0].url} alt="" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <MapPin className="w-4 h-4" />
            </div>
          )}
        </div>
        
        {/* Info compacta */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-900 truncate leading-tight">
            {lead.property.title}
          </p>
          <p className="text-[10px] text-teal-600 font-bold">
            {formatPrice(lead.property.price)}
          </p>
          <p className="text-[9px] text-gray-500 truncate">
            {lead.contact?.name || "Sem contato"}
          </p>
        </div>
        
        {/* Indicador de drag */}
        <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
      </div>
      
      {/* Indicadores de alerta */}
      {(lead.hasUnreadMessages || lead.nextActionDate) && (
        <div className="flex gap-1 mt-1.5">
          {lead.hasUnreadMessages && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Mensagem não lida" />
          )}
          {lead.nextActionDate && new Date(lead.nextActionDate) <= new Date() && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Tarefa pendente" />
          )}
        </div>
      )}
    </div>
  );
}

export default function MyLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "reserved" | "accepted" | "taskToday">("all");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "last7">("all");

  const [openNotesLeadId, setOpenNotesLeadId] = useState<string | null>(null);
  const [notesByLead, setNotesByLead] = useState<Record<string, LeadNote[]>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [notesLoading, setNotesLoading] = useState<Record<string, boolean>>({});
  const [notesError, setNotesError] = useState<Record<string, string | null>>({});
  
  // Estados para UI mobile
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  
  // Toggle visualização Lista/Pipeline (lendo query param `view`)
  const searchParams = useSearchParams();
  const initialView = (searchParams.get("view") === "pipeline" ? "pipeline" : "list") as
    | "list"
    | "pipeline";
  const [viewMode, setViewMode] = useState<"list" | "pipeline">(initialView);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  // Sensors para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const { data: session } = useSession();
  const realtorId = (session?.user as any)?.id || "";
  const toast = useToast();

  useEffect(() => {
    if (!realtorId) return;
    fetchLeads();
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [realtorId]);

  const fetchLeads = async () => {
    try {
      if (!realtorId) return;
      setError(null);
      setLoading(true);
      const response = await fetch("/api/leads/my-leads");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não conseguimos carregar seus leads agora. Se quiser, tente novamente em alguns instantes."
        );
      }

      setLeads(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching leads:", err);
      setError(
        err?.message ||
          "Não conseguimos carregar seus leads agora. Se quiser, tente novamente em alguns instantes."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadNotes = async (leadId: string) => {
    try {
      setNotesError((prev) => ({ ...prev, [leadId]: null }));
      setNotesLoading((prev) => ({ ...prev, [leadId]: true }));

      const response = await fetch(`/api/leads/${leadId}/notes`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível carregar as notas deste lead.");
      }

      setNotesByLead((prev) => ({ ...prev, [leadId]: data.notes || [] }));
    } catch (err: any) {
      console.error("Error fetching lead notes:", err);
      setNotesError((prev) => ({
        ...prev,
        [leadId]: err?.message || "Não foi possível carregar as notas deste lead.",
      }));
    } finally {
      setNotesLoading((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  const handleAccept = async (leadId: string) => {
    const confirmed = await toast.confirm({
      title: "Assumir este lead?",
      message: "Você quer assumir este lead agora? Se ainda estiver em dúvida, pode decidir mais tarde.",
      confirmText: "Sim, assumir",
      cancelText: "Agora não",
      variant: "info",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Lead assumido!", "Fique à vontade para fazer o primeiro contato do seu jeito, sem pressa.");
        fetchLeads();
      } else {
        toast.error("Não foi possível assumir", data.error || "Tente novamente em alguns instantes.");
      }
    } catch (error) {
      console.error("Error accepting lead:", error);
      toast.error("Erro ao assumir lead", "Não foi possível assumir este lead agora. Tente novamente mais tarde.");
    }
  };

  const handleReject = async (leadId: string) => {
    const confirmed = await toast.confirm({
      title: "Liberar este lead?",
      message: "Tem certeza de que prefere não assumir este lead agora? Tudo bem se sim.",
      confirmText: "Sim, liberar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.info("Lead liberado", "Você continua disponível para outras oportunidades.");
        fetchLeads();
      } else {
        toast.error("Não foi possível liberar", data.error || "Tente novamente em alguns instantes.");
      }
    } catch (error) {
      console.error("Error rejecting lead:", error);
      toast.error("Erro ao liberar lead", "Não foi possível liberar este lead agora. Tente novamente.");
    }
  };

  const handleComplete = async (leadId: string) => {
    const confirmed = await toast.confirm({
      title: "Concluir atendimento?",
      message: "Você concluiu o atendimento deste lead? O lead sairá da lista de ativos, mas continuará registrado nos relatórios.",
      confirmText: "Sim, concluir",
      cancelText: "Ainda não",
      variant: "info",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Atendimento concluído!", "O lead foi arquivado mas continua registrado nos relatórios.");
        fetchLeads();
      } else {
        toast.error("Não foi possível concluir", data.error || "Tente novamente em alguns instantes.");
      }
    } catch (error) {
      console.error("Error completing lead:", error);
      toast.error("Erro ao concluir", "Não foi possível concluir este atendimento agora. Tente novamente.");
    }
  };

  const handleToggleNotes = (leadId: string) => {
    if (openNotesLeadId === leadId) {
      setOpenNotesLeadId(null);
      return;
    }

    setOpenNotesLeadId(leadId);

    if (!notesByLead[leadId]) {
      fetchLeadNotes(leadId);
    }
  };

  const handleAddNote = async (leadId: string) => {
    const content = (noteDrafts[leadId] || "").trim();

    if (!content) {
      toast.warning("Campo vazio", "Escreva uma nota antes de salvar.");
      return;
    }

    try {
      setNotesError((prev) => ({ ...prev, [leadId]: null }));
      setNotesLoading((prev) => ({ ...prev, [leadId]: true }));

      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos salvar esta nota agora.");
      }

      setNotesByLead((prev) => ({
        ...prev,
        [leadId]: [...(prev[leadId] || []), data.note],
      }));

      setNoteDrafts((prev) => ({ ...prev, [leadId]: "" }));
    } catch (err: any) {
      console.error("Error creating lead note:", err);
      setNotesError((prev) => ({
        ...prev,
        [leadId]: err?.message || "Não conseguimos salvar esta nota agora.",
      }));
    } finally {
      setNotesLoading((prev) => ({ ...prev, [leadId]: false }));
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

  const getWhatsAppUrl = (phone?: string | null) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "";
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${withCountry}`;
  };

  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const leadsWithTaskToday = leads.filter((lead) => {
    if (!lead.nextActionDate) return false;
    const d = new Date(lead.nextActionDate);
    return isSameDay(d, now) || d < now;
  });

  // Contadores inteligentes
  const smartCounters = useMemo(() => {
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    return {
      // Leads aguardando resposta (com mensagens não lidas)
      awaitingResponse: leads.filter(l => l.hasUnreadMessages).length,
      // Leads com visita/tarefa hoje
      taskToday: leadsWithTaskToday.length,
      // Leads sem contato há 48h
      noContact48h: leads.filter(l => {
        if (!l.lastContactAt) return true; // Nunca contactado
        return new Date(l.lastContactAt) < fortyEightHoursAgo;
      }).length,
    };
  }, [leads, leadsWithTaskToday, now]);

  // Leads agrupados por etapa do pipeline
  const leadsByPipelineStage = useMemo(() => {
    const grouped: Record<PipelineStage, Lead[]> = {
      NEW: [],
      CONTACT: [],
      NEGOTIATION: [],
      CLOSED: [],
    };
    
    leads.forEach(lead => {
      const stage = getLeadPipelineStage(lead);
      grouped[stage].push(lead);
    });
    
    return grouped;
  }, [leads]);

  // Função para mover lead de etapa no pipeline
  const moveLeadToStage = async (leadId: string, newStage: PipelineStage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    const currentStage = getLeadPipelineStage(lead);
    if (currentStage === newStage) return;

    try {
      // Atualização otimista
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, pipelineStage: newStage } as any : l
      ));

      const response = await fetch(`/api/leads/${leadId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        // Reverter se falhar
        setLeads(prev => prev.map(l => 
          l.id === leadId ? { ...l, pipelineStage: currentStage } as any : l
        ));
        toast.error("Erro ao mover lead", data?.error || "Tente novamente.");
      } else {
        const stageLabel = PIPELINE_STAGES.find(s => s.id === newStage)?.label || newStage;
        toast.success("Lead atualizado!", `Movido para "${stageLabel}".`);
      }
    } catch (error) {
      console.error("Error moving lead:", error);
      toast.error("Erro ao mover lead", "Não foi possível atualizar.");
    }
  };

  // Handlers para drag-and-drop
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const leadId = active.id as string;
    const newStage = over.id as PipelineStage;
    
    if (PIPELINE_STAGES.some(s => s.id === newStage)) {
      await moveLeadToStage(leadId, newStage);
    }
  };

  const activeLead = activeDragId ? leads.find(l => l.id === activeDragId) : null;

  const filteredLeads = leads.filter((lead) => {
    // Status filter
    if (filter === "reserved" && lead.status !== "RESERVED") return false;
    if (filter === "accepted" && lead.status !== "ACCEPTED") return false;
    if (filter === "taskToday") {
      if (!lead.nextActionDate) return false;
      const d = new Date(lead.nextActionDate);
      if (!(isSameDay(d, now) || d < now)) return false;
    }

    // City filter
    if (
      cityFilter &&
      !lead.property.city.toLowerCase().includes(cityFilter.toLowerCase())
    ) {
      return false;
    }

    // Type filter
    if (typeFilter && lead.property.type !== typeFilter) {
      return false;
    }

    // Date filter (createdAt)
    const created = new Date(lead.createdAt);
    if (dateFilter === "today" && !isSameDay(created, now)) {
      return false;
    }
    if (dateFilter === "last7" && created < sevenDaysAgo) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <DashboardLayout
        title="Meus Leads em Atendimento"
        description="Organize seus leads com calma, registre próximos passos e acompanhe cada oportunidade no seu ritmo."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Corretor", href: "/broker/dashboard" },
          { label: "Leads" },
        ]}
      >
        <CenteredSpinner message="Carregando seus leads..." />
      </DashboardLayout>
    );
  }

  // Função para obter badge de status
  const getStatusBadge = (status: "RESERVED" | "ACCEPTED") => {
    if (status === "RESERVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" />
          Novo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        Em atendimento
      </span>
    );
  };

  // Contadores para os filtros
  const counts = {
    all: leads.length,
    reserved: leads.filter((l) => l.status === "RESERVED").length,
    accepted: leads.filter((l) => l.status === "ACCEPTED").length,
    taskToday: leadsWithTaskToday.length,
  };

  return (
    <DashboardLayout
      title="Meus Leads"
      description="Gerencie seus leads de forma simples e eficiente."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Leads" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          {/* Toggle Lista/Pipeline */}
          <div className="hidden sm:flex items-center bg-white/10 rounded-lg p-0.5 border border-white/20">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "list" ? "bg-white text-teal-700" : "text-white/80 hover:text-white"
              }`}
            >
              <LayoutList className="w-4 h-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode("pipeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "pipeline" ? "bg-white text-teal-700" : "text-white/80 hover:text-white"
              }`}
            >
              <Columns3 className="w-4 h-4" />
              Pipeline
            </button>
          </div>
          <button
            onClick={fetchLeads}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      }
    >
      <div className="bg-gray-50 min-h-screen">
        {/* Contadores inteligentes - visíveis quando tem algo relevante */}
        {(smartCounters.awaitingResponse > 0 || smartCounters.noContact48h > 0) && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-2">
              <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                {smartCounters.awaitingResponse > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs whitespace-nowrap">
                    <Bell className="w-3.5 h-3.5 text-rose-600" />
                    <span className="text-rose-700 font-medium">{smartCounters.awaitingResponse} cliente(s) aguardando seu retorno</span>
                  </div>
                )}
                {smartCounters.taskToday > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs whitespace-nowrap">
                    <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-amber-700 font-medium">{smartCounters.taskToday} tarefa(s) hoje</span>
                  </div>
                )}
                {smartCounters.noContact48h > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs whitespace-nowrap">
                    <PhoneOff className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-600 font-medium">{smartCounters.noContact48h} sem contato há 48h</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Barra de filtros e toggle de visualização */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto">
            {/* Toggle mobile + Filtros */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Toggle Lista/Pipeline - Mobile */}
                <div className="sm:hidden flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === "list" ? "bg-white text-teal-700 shadow-sm" : "text-gray-600"
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    Lista
                  </button>
                  <button
                    onClick={() => setViewMode("pipeline")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === "pipeline" ? "bg-white text-teal-700 shadow-sm" : "text-gray-600"
                    }`}
                  >
                    <Columns3 className="w-3.5 h-3.5" />
                    Pipeline
                  </button>
                </div>

                {/* Filtros - scroll horizontal */}
                <div className="flex-1 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-2 min-w-max">
                    {[
                      { key: "all" as const, label: "Todos", count: counts.all, color: "teal" },
                      { key: "reserved" as const, label: "Novos", count: counts.reserved, color: "amber" },
                      { key: "accepted" as const, label: "Em atendimento", count: counts.accepted, color: "emerald" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setFilter(item.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                          filter === item.key
                            ? "bg-teal-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {item.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                          filter === item.key ? "bg-white/20" : "bg-gray-200"
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botão de filtros avançados */}
            <div className="px-4 pb-3 flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showFilters || cityFilter || typeFilter || dateFilter !== "all"
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {(cityFilter || typeFilter || dateFilter !== "all") && (
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                )}
              </button>
              
              {/* Quick stats */}
              <div className="ml-auto text-sm text-gray-500">
                {filteredLeads.length} {filteredLeads.length === 1 ? "lead" : "leads"}
              </div>
            </div>
            
            {/* Filtros avançados colapsáveis */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-100"
                >
                  <div className="px-4 py-3 bg-gray-50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Cidade..."
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                      >
                        <option value="">Tipo</option>
                        <option value="HOUSE">Casa</option>
                        <option value="APARTMENT">Apartamento</option>
                        <option value="CONDO">Condomínio</option>
                        <option value="STUDIO">Studio</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { value: "all" as const, label: "Qualquer data" },
                        { value: "today" as const, label: "Hoje" },
                        { value: "last7" as const, label: "7 dias" },
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => setDateFilter(item.value)}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            dateFilter === item.value
                              ? "bg-teal-600 text-white"
                              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {(cityFilter || typeFilter || dateFilter !== "all") && (
                      <button
                        onClick={() => {
                          setCityFilter("");
                          setTypeFilter("");
                          setDateFilter("all");
                        }}
                        className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Leads Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error ? (
          <EmptyState
            title="Não foi possível carregar seus leads"
            description={error}
            action={
              <button
                onClick={fetchLeads}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
              >
                Tentar novamente
              </button>
            }
          />
        ) : leads.length === 0 ? (
          <EmptyState
            title="Nenhum lead ativo no momento"
            description="Quando você assumir ou receber novos leads, eles aparecem aqui."
            action={
              <Link
                href="/broker/leads/mural"
                className="inline-block mt-4 px-6 py-3 glass-teal text-white font-medium rounded-lg transition-colors"
              >
                Ver Mural de Leads
              </Link>
            }
          />
        ) : viewMode === "pipeline" ? (
          /* ===== MODO PIPELINE ===== */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PIPELINE_STAGES.map((stage) => {
                const stageLeads = leadsByPipelineStage[stage.id];
                const Icon = stage.icon;
                
                return (
                  <DroppableColumn key={stage.id} stageId={stage.id}>
                    {/* Header da coluna */}
                    <div className={`flex items-center gap-2 p-2 ${stage.bgColor} rounded-t-lg border-b border-gray-200`}>
                      <Icon className={`w-4 h-4 ${stage.color}`} />
                      <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                      <span className="ml-auto text-xs font-bold text-gray-600">{stageLeads.length}</span>
                    </div>
                    
                    {/* Cards da coluna */}
                    <div className="p-2 space-y-2 min-h-[150px] bg-gray-50/50">
                      {stageLeads.length === 0 ? (
                        <p className="text-[10px] text-gray-400 text-center py-4">Nenhum lead</p>
                      ) : (
                        stageLeads.map((lead) => (
                          <DraggableCard key={lead.id} lead={lead} formatPrice={formatPrice} />
                        ))
                      )}
                    </div>
                  </DroppableColumn>
                );
              })}
            </div>
            
            {/* Drag Overlay */}
            <DragOverlay>
              {activeLead ? (
                <div className="bg-white rounded-lg border-2 border-teal-400 p-2 shadow-xl text-xs rotate-2 scale-105">
                  <p className="font-semibold truncate">{activeLead.property.title}</p>
                  <p className="text-gray-500 text-[10px]">{activeLead.property.city}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            title="Nenhum lead encontrado"
            description="Tente ajustar os filtros para ver mais leads."
          />
        ) : (
          /* ===== MODO LISTA ===== */
          <div className="space-y-3">
            {filteredLeads.map((lead) => {
              const isExpanded = expandedLeadId === lead.id;
              
              return (
                <motion.div
                  key={lead.id}
                  layout
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Card compacto - sempre visível */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                  >
                    <div className="flex gap-3">
                      {/* Imagem pequena */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={lead.property.images[0]?.url || "/placeholder.jpg"}
                          alt={lead.property.title}
                          fill
                          className="object-cover"
                        />
                        {/* Badge de status sobreposto */}
                        {lead.hasUnreadMessages && (
                          <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                        )}
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {lead.property.title}
                            </h3>
                            <p className="text-teal-600 font-bold text-base sm:text-lg">
                              {formatPrice(lead.property.price)}
                            </p>
                          </div>
                          {getStatusBadge(lead.status)}
                        </div>
                        
                        {/* Linha de info rápida */}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {lead.property.city}
                          </span>
                          <span>•</span>
                          <span>{PROPERTY_TYPES[lead.property.type] || lead.property.type}</span>
                          <span>•</span>
                          <span>{getTimeAgo(lead.createdAt)}</span>
                        </div>

                        {/* Alertas inline */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {lead.nextActionDate && (() => {
                            const actionDate = new Date(lead.nextActionDate);
                            const isOverdue = actionDate < now && !isSameDay(actionDate, now);
                            const isToday = isSameDay(actionDate, now);
                            if (isOverdue || isToday) {
                              return (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  isOverdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                                }`}>
                                  <Clock className="w-2.5 h-2.5" />
                                  {isOverdue ? "Atrasada" : "Hoje"}
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {lead.hasUnreadMessages && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                              <MessageCircle className="w-2.5 h-2.5" />
                              Mensagem
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chevron para expandir */}
                      <div className="flex-shrink-0 self-center">
                        <ChevronDown 
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Área expandida */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-100"
                      >
                        <div className="p-4 bg-gray-50/50 space-y-4">
                          {/* Endereço completo */}
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                              {lead.property.street}
                              {lead.property.neighborhood && `, ${lead.property.neighborhood}`}
                              {` - ${lead.property.city}/${lead.property.state}`}
                            </span>
                          </div>

                          {/* Detalhes do imóvel */}
                          <div className="flex flex-wrap gap-3 text-xs">
                            {lead.property.bedrooms && (
                              <span className="px-2 py-1 bg-white rounded border border-gray-200">
                                {lead.property.bedrooms} quartos
                              </span>
                            )}
                            {lead.property.bathrooms && (
                              <span className="px-2 py-1 bg-white rounded border border-gray-200">
                                {lead.property.bathrooms} banheiros
                              </span>
                            )}
                            {lead.property.areaM2 && (
                              <span className="px-2 py-1 bg-white rounded border border-gray-200">
                                {lead.property.areaM2}m²
                              </span>
                            )}
                          </div>

                          {/* Info do contato */}
                          {lead.contact && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-900 text-sm">{lead.contact.name}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {lead.contact.phone && (
                                  <>
                                    <a
                                      href={`tel:${lead.contact.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                      Ligar
                                    </a>
                                    {getWhatsAppUrl(lead.contact.phone) && (
                                      <a
                                        href={getWhatsAppUrl(lead.contact.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-xs font-medium text-green-700 transition-colors"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        WhatsApp
                                      </a>
                                    )}
                                  </>
                                )}
                                <a
                                  href={`mailto:${lead.contact.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  Email
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Timeline */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Criado {getTimeAgo(lead.createdAt)}
                            </span>
                            {lead.respondedAt && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Respondido {getTimeAgo(lead.respondedAt)}
                              </span>
                            )}
                            {lead.reservedUntil && lead.status === "RESERVED" && (
                              <CountdownTimer targetDate={new Date(lead.reservedUntil)} />
                            )}
                          </div>

                          {/* Ações principais */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            {lead.status === "RESERVED" && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAccept(lead.id); }}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Aceitar
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleReject(lead.id); }}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Recusar
                                </button>
                              </>
                            )}
                            {lead.status === "ACCEPTED" && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleComplete(lead.id); }}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Concluir
                                </button>
                                <Link
                                  href={`/broker/chats?lead=${lead.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Chat
                                </Link>
                                <Link
                                  href={`/broker/leads/${lead.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors text-sm"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Detalhes
                                </Link>
                              </>
                            )}
                          </div>

                          {/* Notas rápidas */}
                          <div className="pt-2 border-t border-gray-200">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleToggleNotes(lead.id); }}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
                            >
                              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openNotesLeadId === lead.id ? "rotate-90" : ""}`} />
                              {openNotesLeadId === lead.id ? "Ocultar notas" : "Notas rápidas"}
                            </button>

                            {openNotesLeadId === lead.id && (
                              <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                                {notesError[lead.id] && (
                                  <p className="text-xs text-red-600">{notesError[lead.id]}</p>
                                )}
                                {notesLoading[lead.id] && !notesByLead[lead.id] ? (
                                  <p className="text-xs text-gray-500">Carregando...</p>
                                ) : (
                                  <>
                                    {notesByLead[lead.id]?.length ? (
                                      <div className="space-y-1 max-h-24 overflow-y-auto">
                                        {notesByLead[lead.id].map((note) => (
                                          <div key={note.id} className="p-2 bg-white rounded border border-gray-100 text-xs">
                                            <p className="text-gray-700">{note.content}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                              {new Date(note.createdAt).toLocaleDateString("pt-BR")}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500">Nenhuma nota ainda.</p>
                                    )}
                                  </>
                                )}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={noteDrafts[lead.id] || ""}
                                    onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                                    placeholder="Adicionar nota..."
                                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddNote(lead.id)}
                                    disabled={!!notesLoading[lead.id]}
                                    className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
