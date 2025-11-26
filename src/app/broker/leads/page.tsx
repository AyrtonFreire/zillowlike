"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Phone, Mail, MapPin, Calendar, CheckCircle, XCircle, Clock, RefreshCw, 
  MessageCircle, AlertCircle, ChevronDown, ChevronRight, Filter, User,
  ExternalLink, MoreHorizontal, Sparkles
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
      description="Organize seus leads com calma e acompanhe cada oportunidade."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Leads" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/broker/crm"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors border border-white/20"
          >
            <Sparkles className="w-4 h-4" />
            Jornada
          </Link>
          <button
            onClick={fetchLeads}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors border border-white/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      }
    >
      <div className="bg-gray-50 min-h-screen">
        {/* Barra de filtros fixa no mobile */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto">
            {/* Filtros principais - scroll horizontal no mobile */}
            <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                {[
                  { key: "all" as const, label: "Todos", count: counts.all, color: "teal" },
                  { key: "reserved" as const, label: "Novos", count: counts.reserved, color: "amber" },
                  { key: "accepted" as const, label: "Em atendimento", count: counts.accepted, color: "emerald" },
                  { key: "taskToday" as const, label: "Tarefas hoje", count: counts.taskToday, color: "rose" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setFilter(item.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      filter === item.key
                        ? `bg-${item.color}-600 text-white shadow-md`
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={filter === item.key ? { backgroundColor: item.color === "teal" ? "#0d9488" : item.color === "amber" ? "#d97706" : item.color === "emerald" ? "#059669" : "#e11d48" } : {}}
                  >
                    {item.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      filter === item.key ? "bg-white/20" : "bg-gray-200"
                    }`}>
                      {item.count}
                    </span>
                  </button>
                ))}
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

        {/* Leads List */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            title="Nenhum lead ativo no momento"
            description="Quando você assumir ou receber novos leads, eles aparecem aqui para você acompanhar com calma."
            action={
              <Link
                href="/broker/leads/mural"
                className="inline-block mt-4 px-6 py-3 glass-teal text-white font-medium rounded-lg transition-colors"
              >
                Ver Mural de Leads
              </Link>
            }
          />
        ) : (
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
