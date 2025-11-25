"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Phone, Mail, MapPin, Calendar, CheckCircle, XCircle, Clock, RefreshCw, MessageCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Image from "next/image";
import Link from "next/link";
import CountdownTimer from "@/components/queue/CountdownTimer";
import StatusIndicator from "@/components/queue/StatusIndicator";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

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
    return <CenteredSpinner message="Carregando seus leads..." />;
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
                className="flex items-center gap-2 px-4 py-2 glass-teal text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Atualizar
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 space-y-3">
            {/* Status filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "all"
                    ? "glass-teal text-white"
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
                Novos ({leads.filter((l) => l.status === "RESERVED").length})
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
              <button
                onClick={() => setFilter("taskToday")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "taskToday"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Com tarefa para hoje ({leadsWithTaskToday.length})
              </button>
            </div>

            {/* Extra filters: cidade, tipo, data */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Filtrar por cidade"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os tipos</option>
                <option value="HOUSE">Casa</option>
                <option value="APARTMENT">Apartamento</option>
                <option value="CONDO">Condomínio</option>
                <option value="STUDIO">Studio</option>
              </select>
              <div className="flex gap-2">
                {[ 
                  { value: "all" as const, label: "Todas as datas" },
                  { value: "today" as const, label: "Hoje" },
                  { value: "last7" as const, label: "Últimos 7 dias" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setDateFilter(item.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      dateFilter === item.value
                        ? "glass-teal text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
                          {/* Indicadores visuais de pendências */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {lead.nextActionDate && (() => {
                              const actionDate = new Date(lead.nextActionDate);
                              const today = new Date();
                              const isOverdue = actionDate < today && !isSameDay(actionDate, today);
                              const isToday = isSameDay(actionDate, today);
                              if (isOverdue || isToday) {
                                return (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                    isOverdue 
                                      ? "bg-red-100 text-red-700 border border-red-200" 
                                      : "bg-orange-100 text-orange-700 border border-orange-200"
                                  }`}>
                                    <Clock className="w-3 h-3" />
                                    {isOverdue ? "Tarefa atrasada" : "Tarefa para hoje"}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {lead.hasUnreadMessages && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                <MessageCircle className="w-3 h-3" />
                                Nova mensagem
                              </span>
                            )}
                            {!lead.lastContactAt && lead.status === "ACCEPTED" && (() => {
                              const created = new Date(lead.createdAt);
                              const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                              if (created < fiveDaysAgo) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                                    <AlertCircle className="w-3 h-3" />
                                    Sem contato recente
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {lead.lastContactAt && (() => {
                              const lastContact = new Date(lead.lastContactAt);
                              const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                              if (lastContact < fiveDaysAgo) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                                    <AlertCircle className="w-3 h-3" />
                                    +5 dias sem contato
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
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
                              <div className="flex items-center gap-3 text-gray-700 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  <a
                                    href={`tel:${lead.contact.phone}`}
                                    className="hover:text-blue-600 transition-colors"
                                  >
                                    {lead.contact.phone}
                                  </a>
                                </div>
                                {getWhatsAppUrl(lead.contact.phone) && (
                                  <a
                                    href={getWhatsAppUrl(lead.contact.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-700 hover:text-green-800 font-medium"
                                  >
                                    Abrir WhatsApp
                                  </a>
                                )}
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
                            <button className="flex items-center gap-2 px-4 py-2 glass-teal text-white font-medium rounded-lg transition-colors">
                              <Calendar className="w-5 h-5" />
                              Marcar Visita
                            </button>
                            <button
                              onClick={() => handleComplete(lead.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-5 h-5" />
                              Concluir Atendimento
                            </button>
                          </>
                        )}
                      </div>

                      <div className="mt-2">
                        <Link
                          href={`/broker/leads/${lead.id}`}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Abrir tela de detalhes deste lead
                        </Link>
                      </div>

                      {/* Notas rápidas do lead */}
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <button
                          type="button"
                          onClick={() => handleToggleNotes(lead.id)}
                          className="text-xs font-medium text-gray-700 hover:text-gray-900"
                        >
                          {openNotesLeadId === lead.id
                            ? "Esconder notas"
                            : "Ver / adicionar notas rápidas sobre este cliente"}
                        </button>

                        {openNotesLeadId === lead.id && (
                          <div className="mt-3 space-y-3">
                            {notesError[lead.id] && (
                              <p className="text-xs text-red-600">{notesError[lead.id]}</p>
                            )}

                            {notesLoading[lead.id] && !notesByLead[lead.id] ? (
                              <p className="text-xs text-gray-500">Carregando notas...</p>
                            ) : (
                              <>
                                {notesByLead[lead.id]?.length ? (
                                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-xs text-gray-700">
                                    {notesByLead[lead.id].map((note) => (
                                      <div
                                        key={note.id}
                                        className="px-2 py-1 rounded-md bg-gray-50 border border-gray-100"
                                      >
                                        <p className="whitespace-pre-wrap">{note.content}</p>
                                        <p className="mt-1 text-[10px] text-gray-400">
                                          {new Date(note.createdAt).toLocaleString("pt-BR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500">
                                    Use este espaço para anotar, com suas próprias palavras, pontos importantes da conversa
                                    ou próximos passos combinados com o cliente.
                                  </p>
                                )}
                              </>
                            )}

                            <div className="space-y-2">
                              <textarea
                                value={noteDrafts[lead.id] || ""}
                                onChange={(e) =>
                                  setNoteDrafts((prev) => ({ ...prev, [lead.id]: e.target.value }))
                                }
                                rows={2}
                                placeholder="Ex: Combinou retorno amanhã à tarde; prefere contato por WhatsApp."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleAddNote(lead.id)}
                                  disabled={!!notesLoading[lead.id]}
                                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold glass-teal text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {notesLoading[lead.id] ? "Salvando..." : "Salvar nota"}
                                </button>
                              </div>
                            </div>
                          </div>
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
