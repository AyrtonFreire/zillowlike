"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  MessageCircle,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import DashboardLayout from "@/components/DashboardLayout";
import { getPusherClient } from "@/lib/pusher-client";
import { useToast } from "@/contexts/ToastContext";
import LeadTimeline from "@/components/crm/LeadTimeline";
import { buildPropertyPath } from "@/lib/slug";

interface Lead {
  id: string;
  status: string;
  createdAt: string;
  reservedUntil?: string | null;
  respondedAt?: string | null;
  completedAt?: string | null;
  pipelineStage?: "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";
  lostReason?:
    | "CLIENT_DESISTIU"
    | "FECHOU_OUTRO_IMOVEL"
    | "CONDICAO_FINANCEIRA"
    | "NAO_RESPONDEU"
    | "OUTRO"
    | null;
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
  clientChatToken?: string | null;
}

const STAGE_BADGE = {
  NEW: { label: "Novo", className: "bg-blue-50 text-blue-700 border-blue-100" },
  CONTACT: { label: "Contato", className: "bg-amber-50 text-amber-700 border-amber-100" },
  VISIT: { label: "Visita", className: "bg-teal-50 text-teal-700 border-teal-100" },
  PROPOSAL: { label: "Proposta", className: "bg-orange-50 text-orange-700 border-orange-100" },
  DOCUMENTS: { label: "Documentos", className: "bg-pink-50 text-pink-700 border-pink-100" },
  WON: { label: "Ganho", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  LOST: { label: "Perdido", className: "bg-gray-50 text-gray-700 border-gray-200" },
} as const;

interface LeadNote {
  id: string;
  leadId: string;
  realtorId: string;
  content: string;
  createdAt: string;
}

interface LeadMessage {
  id: string;
  leadId: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string | null;
    role: string;
  } | null;
}

interface SimilarPropertyItem {
  property: {
    id: string;
    title: string;
    price: number | null;
    city: string;
    state: string;
    neighborhood?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    images: { url: string }[];
  };
  matchScore: number;
  matchReasons: string[];
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const realtorId = (session?.user as any)?.id || "";

  const advancedDetailsRef = useCallback((node: HTMLDivElement | null) => {
    (advancedDetailsRef as any).current = node;
  }, []);

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [messages, setMessages] = useState<LeadMessage[]>([]);

  const [showLeadHelp, setShowLeadHelp] = useState(false);

  const [reminderDate, setReminderDate] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [reminderSaving, setReminderSaving] = useState(false);

  const [resultReason, setResultReason] = useState<
    | "CLIENT_DESISTIU"
    | "FECHOU_OUTRO_IMOVEL"
    | "CONDICAO_FINANCEIRA"
    | "NAO_RESPONDEU"
    | "OUTRO"
    | ""
  >("");
  const [resultSaving, setResultSaving] = useState(false);

  const [similarItems, setSimilarItems] = useState<SimilarPropertyItem[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareGenerating, setShareGenerating] = useState(false);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [showNotes, setShowNotes] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);

  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  const [completingLead, setCompletingLead] = useState(false);
  const [clearingReminder, setClearingReminder] = useState(false);
  const [archivingLead, setArchivingLead] = useState(false);

  const leadId = (params?.id as string) || "";
  const toast = useToast();

  useEffect(() => {
    if (!leadId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-lead-${leadId}`;
      const channel = pusher.subscribe(channelName);

      const handler = (data: { leadId: string; message: LeadMessage }) => {
        if (!data?.message || cancelled) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });
      };

      channel.bind("lead-message", handler as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("lead-message", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore pusher errors on cleanup
        }
      };
    } catch (err) {
      console.error("Error subscribing to lead messages channel:", err);
    }
  }, [leadId]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const key = "zlw_help_lead_detail_v1";
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        setShowLeadHelp(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const fetchLead = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/leads/${leadId}`);
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos encontrar este lead agora.");
      }

      setLead(data.lead);
      setSelectedImageIndex(0);
      if (data.lead.nextActionDate) {
        const d = new Date(data.lead.nextActionDate);
        setReminderDate(d.toISOString().split("T")[0]);
      }
      if (data.lead.nextActionNote) {
        setReminderNote(data.lead.nextActionNote);
      }

      if (data.lead.lostReason) {
        setResultReason(data.lead.lostReason);
      }
    } catch (err: any) {
      console.error("Error fetching lead detail:", err);
      setError(err?.message || "Não conseguimos carregar os detalhes deste lead agora.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const fetchLeadNotes = useCallback(async () => {
    try {
      setNotesError(null);
      setNotesLoading(true);

      const response = await fetch(`/api/leads/${leadId}/notes`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível carregar as notas deste lead.");
      }

      setNotes(data.notes || []);
    } catch (err: any) {
      console.error("Error fetching lead notes:", err);
      setNotesError(err?.message || "Não foi possível carregar as notas deste lead.");
    } finally {
      setNotesLoading(false);
    }
  }, [leadId]);

  const fetchSimilar = useCallback(async () => {
    try {
      setSimilarError(null);
      setSimilarLoading(true);

      const response = await fetch(`/api/leads/${leadId}/similar-properties?limit=6`);
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Não conseguimos carregar imóveis similares do seu estoque agora. Se quiser, tente novamente em alguns instantes."
        );
      }

      setSimilarItems(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      console.error("Error fetching similar properties:", err);
      setSimilarError(
        err?.message ||
          "Não conseguimos carregar imóveis similares do seu estoque agora. Se quiser, tente novamente em alguns instantes."
      );
      setSimilarItems([]);
    } finally {
      setSimilarLoading(false);
    }
  }, [leadId]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/messages`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível carregar as mensagens deste lead.");
      }

      const newMessages: LeadMessage[] = data.messages || [];
      setMessages(newMessages);
    } catch (err: any) {
      console.error("Error fetching lead messages:", err);
    } finally {
      // no-op
    }
  }, [leadId]);

  useEffect(() => {
    if (!realtorId || !leadId) return;
    fetchLead();
    fetchLeadNotes();
    fetchMessages();
    fetchSimilar();
  }, [realtorId, leadId, fetchLead, fetchLeadNotes, fetchMessages, fetchSimilar]);

  const handleSaveReminder = async () => {
    try {
      setReminderSaving(true);
      const body: any = {};
      if (reminderDate) body.date = reminderDate;
      if (reminderNote) body.note = reminderNote;
      if (!reminderDate && !reminderNote) {
        // Se nada for preenchido, limpa o lembrete
        body.date = null;
        body.note = null;
      }

      const response = await fetch(`/api/leads/${leadId}/reminder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos salvar este lembrete agora.");
      }
    toast.success("Lembrete salvo!", "O próximo passo foi registrado.");
    } catch (err: any) {
      console.error("Error saving lead reminder:", err);
      toast.error("Erro ao salvar lembrete", err?.message || "Não conseguimos salvar este lembrete agora.");
    } finally {
      setReminderSaving(false);
    }
  };

  const handleClearReminder = async () => {
    if (!leadId) return;
    if (!hasReminderActive) return;

    const confirmed = await toast.confirm({
      title: "Marcar próximo passo como feito?",
      message: "Isso vai remover o lembrete deste lead.",
      confirmText: "Sim, concluído",
      cancelText: "Cancelar",
      variant: "info",
    });

    if (!confirmed) return;

    try {
      setClearingReminder(true);
      const response = await fetch(`/api/leads/${leadId}/reminder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: null, note: null }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos atualizar este lead agora.");
      }

      setReminderDate("");
      setReminderNote("");
      toast.success("Próximo passo concluído", "O lembrete foi removido.");
      await fetchLead();
    } catch (err: any) {
      console.error("Error clearing lead reminder:", err);
      toast.error("Erro ao concluir próximo passo", err?.message || "Tente novamente.");
    } finally {
      setClearingReminder(false);
    }
  };

  const handleQuickReminder = (type: "CALL_TOMORROW" | "WAITING_RESPONSE" | "SCHEDULE_VISIT") => {
    const now = new Date();

    if (type === "CALL_TOMORROW") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setReminderDate(tomorrow.toISOString().split("T")[0]);
      setReminderNote("Ligar amanhã para saber a decisão.");
      return;
    }

    if (type === "WAITING_RESPONSE") {
      setReminderDate(now.toISOString().split("T")[0]);
      setReminderNote("Aguardando resposta do cliente.");
      return;
    }

    if (type === "SCHEDULE_VISIT") {
      setReminderNote("Combinar visita com o cliente.");
    }
  };

  const handleOpenClientChat = () => {
    if (!leadId) return;
    // Redireciona para o hub de conversas com o lead selecionado
    router.push(`/broker/chats?lead=${leadId}`);
  };

  const handleSaveResult = async () => {
    try {
      setResultSaving(true);
      const body: any = {};
      if (resultReason) {
        body.reason = resultReason;
      }

      const response = await fetch(`/api/leads/${leadId}/lost`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos salvar este resultado agora.");
      }

      setLead((prev) => (prev ? { ...prev, pipelineStage: "LOST", lostReason: resultReason || null } : prev));
      toast.info("Lead marcado como perdido", "O registro foi atualizado.");
    } catch (err: any) {
      console.error("Error saving lead result:", err);
      toast.error("Erro ao salvar resultado", err?.message || "Não conseguimos salvar este resultado agora.");
    } finally {
      setResultSaving(false);
    }
  };

  const handleCompleteLead = async () => {
    if (!leadId) return;
    if (lead?.pipelineStage === "WON") {
      toast.info("Já concluído", "Este lead já está marcado como ganho.");
      return;
    }

    if (lead?.pipelineStage === "LOST") {
      toast.warning("Não disponível", "Este lead já está marcado como perdido.");
      return;
    }

    const confirmed = await toast.confirm({
      title: "Concluir atendimento?",
      message: "Isso marca este lead como resolvido e move para Fechado (ganho).",
      confirmText: "Sim, concluir",
      cancelText: "Cancelar",
      variant: "info",
    });

    if (!confirmed) return;

    try {
      setCompletingLead(true);
      const response = await fetch(`/api/leads/${leadId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "WON" }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || "Não conseguimos concluir este atendimento agora.");
      }

      toast.success("Atendimento concluído", "Lead movido para Fechado (ganho).");
      await fetchLead();
    } catch (err: any) {
      console.error("Error completing lead:", err);
      toast.error("Erro ao concluir atendimento", err?.message || "Tente novamente.");
    } finally {
      setCompletingLead(false);
    }
  };

  const handleOpenLostShortcut = () => {
    setShowAdvancedDetails(true);
    try {
      const node = (advancedDetailsRef as any).current as HTMLDivElement | null;
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {
      // ignore
    }
  };

  const handleArchiveLead = async () => {
    if (!leadId) return;
    const confirmed = await toast.confirm({
      title: "Arquivar lead?",
      message: "Isso vai mover este lead para Fechado como perdido e removê-lo da sua lista de ativos.",
      confirmText: "Sim, arquivar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      setArchivingLead(true);
      const response = await fetch(`/api/leads/${leadId}/lost`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "OUTRO" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos arquivar este lead agora.");
      }

      toast.info("Lead arquivado", "Movido para Fechado como perdido.");
      await fetchLead();
      router.push("/broker/crm");
    } catch (err: any) {
      console.error("Error archiving lead:", err);
      toast.error("Erro ao arquivar lead", err?.message || "Tente novamente.");
    } finally {
      setArchivingLead(false);
    }
  };

  const handleGenerateSimilarLink = async () => {
    try {
      setShareGenerating(true);

      const body: any = {};
      if (similarItems.length > 0) {
        body.propertyIds = similarItems.map((item) => item.property.id);
      }

      const response = await fetch(`/api/leads/${leadId}/similar-properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Não conseguimos gerar o link de imóveis similares agora. Tente novamente em alguns instantes."
        );
      }

      setShareUrl(data.shareUrl || null);
      setShareExpiresAt(data.expiresAt || null);

      toast.success(
        "Link gerado!",
        "Você pode enviar este link para o cliente ver outros imóveis do seu estoque."
      );
    } catch (err: any) {
      console.error("Error generating similar properties link:", err);
      toast.error(
        "Erro ao gerar link",
        err?.message || "Não conseguimos gerar o link de imóveis similares agora. Tente novamente em alguns instantes."
      );
    } finally {
      setShareGenerating(false);
    }
  };

  const handleDismissLeadHelp = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("zlw_help_lead_detail_v1", "dismissed");
      }
    } catch {
      // ignore storage errors
    }
    setShowLeadHelp(false);
  };

  const handleAddNote = async () => {
    const content = noteDraft.trim();
    if (!content) {
      toast.warning("Campo vazio", "Escreva uma nota antes de salvar.");
      return;
    }

    try {
      setNotesError(null);
      setNotesLoading(true);

      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos salvar esta nota agora.");
      }

      setNotes((prev) => [...prev, data.note]);
      setNoteDraft("");
    } catch (err: any) {
      console.error("Error creating lead note:", err);
      setNotesError(err?.message || "Não conseguimos salvar esta nota agora.");
    } finally {
      setNotesLoading(false);
    }
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

  const formatPrice = (price?: number | null) => {
    if (typeof price !== "number") return "Preço sob consulta";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado!", `${label} copiado para a área de transferência.`);
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      toast.error("Não foi possível copiar", "Seu navegador bloqueou a cópia. Tente novamente.");
    }
  };

  const handleQuickNote = (type: "WHATSAPP" | "LIGACAO" | "EMAIL") => {
    const now = new Date();
    const timeLabel = now.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const prefix =
      type === "WHATSAPP"
        ? `[WhatsApp - ${timeLabel}] `
        : type === "LIGACAO"
        ? `[Ligação - ${timeLabel}] `
        : `[E-mail - ${timeLabel}] `;
    setNoteDraft((prev) => (prev ? `${prev}\n${prefix}` : prefix));
  };

  const getWhatsAppUrl = (phone?: string | null) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "";
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${withCountry}`;
  };

  const hasReminderActive = Boolean(reminderDate || reminderNote);
  const whatsappUrl = lead?.contact?.phone ? getWhatsAppUrl(lead.contact.phone) : "";
  const hasWhatsApp = Boolean(whatsappUrl);

  if (loading) {
    return (
      <DashboardLayout
        title="Lead do imóvel"
        description="Carregando detalhes..."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Corretor", href: "/broker/dashboard" },
          { label: "CRM", href: "/broker/crm" },
          { label: "Detalhes" },
        ]}
      >
        <CenteredSpinner message="Carregando detalhes do lead..." />
      </DashboardLayout>
    );
  }

  if (error || !lead) {
    return (
      <DashboardLayout
        title="Lead do imóvel"
        description="Erro ao carregar"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Corretor", href: "/broker/dashboard" },
          { label: "CRM", href: "/broker/crm" },
          { label: "Detalhes" },
        ]}
      >
        <div className="max-w-4xl mx-auto py-10">
          <EmptyState
            title="Não conseguimos carregar este lead"
            description={error || "Ele pode ter sido removido ou não está mais ativo na sua lista."}
            action={
              <button
                onClick={fetchLead}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
              >
                Tentar novamente
              </button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Lead do imóvel"
      description={lead.property.title}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "CRM", href: "/broker/crm" },
        { label: "Detalhes" },
      ]}
    >
      <div className="max-w-5xl mx-auto py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Imagem do imóvel */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="relative w-full h-56 rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                <Image
                  src={lead.property.images[selectedImageIndex]?.url || lead.property.images[0]?.url || "/placeholder.jpg"}
                  alt={lead.property.title}
                  fill
                  className="object-cover"
                />
              </div>

              {lead.property.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {lead.property.images.slice(0, 8).map((img, idx) => {
                    const isActive = idx === selectedImageIndex;
                    return (
                      <button
                        key={`${img.url}-${idx}`}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg border ${
                          isActive ? "border-teal-500 ring-2 ring-teal-200" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Image
                          src={img.url || "/placeholder.jpg"}
                          alt={lead.property.title}
                          fill
                          className="object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Informações principais / Cabeçalho do lead */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {lead.contact?.name || "Lead sem nome"}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Interessado em: {" "}
                    <span className="font-semibold text-gray-900">{lead.property.title}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {lead.property.street}, {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                      {lead.property.city} - {lead.property.state}
                    </span>
                  </p>
                  {lead.contact && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                      {lead.contact.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {lead.contact.phone}
                        </span>
                      )}
                      {lead.contact.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {lead.contact.email}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${
                      (STAGE_BADGE as any)[(lead.pipelineStage || "NEW") as any]?.className ||
                      "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {(STAGE_BADGE as any)[(lead.pipelineStage || "NEW") as any]?.label || (lead.pipelineStage || "Novo")}
                  </span>
                </div>
              </div>

              {/* Linha do tempo simples */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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
                {lead.completedAt && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Concluído {getTimeAgo(lead.completedAt)}</span>
                  </div>
                )}
              </div>

              {hasReminderActive && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                  <Clock className="w-3 h-3" />
                  <span>
                    Próximo passo:
                    {" "}
                    {reminderNote || "rever este lead"}
                    {reminderDate &&
                      ` · ${new Date(reminderDate).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}`}
                  </span>
                </div>
              )}

              <div className="mt-4">
                <p className="text-[11px] text-gray-500 mb-1">Gestão do lead</p>
                <div className="flex flex-wrap gap-2">
                  {lead.pipelineStage !== "WON" && lead.pipelineStage !== "LOST" && (
                    <button
                      type="button"
                      onClick={handleCompleteLead}
                      disabled={completingLead}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Marcar como resolvido"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {completingLead ? "Concluindo..." : "Concluir atendimento"}
                    </button>
                  )}

                  {hasReminderActive && (
                    <button
                      type="button"
                      onClick={handleClearReminder}
                      disabled={clearingReminder}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Marcar próximo passo como feito"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      {clearingReminder ? "Concluindo..." : "Próximo passo feito"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenLostShortcut}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs sm:text-sm font-semibold hover:bg-red-100"
                    title="Marcar lead como perdido"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Marcar como perdido
                  </button>

                  <button
                    type="button"
                    onClick={handleArchiveLead}
                    disabled={archivingLead}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Arquivar (remover da lista)"
                  >
                    {archivingLead ? "Arquivando..." : "Arquivar lead"}
                  </button>
                </div>
              </div>

              {/* Ações rápidas */}
              <div className="mt-4">
                <p className="text-[11px] text-gray-500 mb-1">Ações rápidas</p>
                <div className="flex flex-wrap gap-2">
                  {hasWhatsApp ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenClientChat}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-teal text-white text-xs sm:text-sm font-semibold"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Abrir conversa
                    </button>
                  )}

                  {lead.contact?.phone && (
                    <a
                      href={`tel:${lead.contact.phone}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Ligar
                    </a>
                  )}

                  {lead.contact?.email && (
                    <a
                      href={`mailto:${lead.contact.email}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      E-mail
                    </a>
                  )}

                  {hasWhatsApp && (
                    <button
                      type="button"
                      onClick={handleOpenClientChat}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Abrir conversa
                    </button>
                  )}

                  <Link
                    href={buildPropertyPath(lead.property.id, lead.property.title)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Ver anúncio
                  </Link>
                </div>
              </div>

              {showLeadHelp && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
                  <p className="font-semibold text-gray-900 text-sm mb-2">Roteiro rápido para este lead</p>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>
                      Falar com o cliente pelo canal que você preferir (telefone, WhatsApp ou e-mail).
                    </li>
                    <li>
                      Registrar uma nota rápida com o que foi combinado, para não depender só da memória.
                    </li>
                    <li>
                      Definir um próximo passo simples no lembrete na lateral (dia e um pequeno resumo).
                    </li>
                  </ol>
                  <p className="mt-2 text-[11px] text-gray-500">
                    Use apenas o que fizer sentido para você neste momento. O painel é um apoio, não uma obrigação.
                  </p>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleDismissLeadHelp}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Entendi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Corpo principal */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna esquerda: atividades + interação */}
            <div className="lg:col-span-8 space-y-6">
              {/* Timeline de atividades */}
              <LeadTimeline
                leadId={leadId}
                createdAt={lead.createdAt}
                respondedAt={lead.respondedAt}
                completedAt={lead.completedAt}
                pipelineStage={lead.pipelineStage}
                notes={notes}
                messages={messages}
              />

              {/* Notas rápidas */}
              <div className="bg-white rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNotes((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm font-semibold text-gray-900">Notas</span>
                  <span className="text-xs text-gray-500 inline-flex items-center gap-2">
                    {notes.length ? `${notes.length} nota(s)` : "Nenhuma nota"}
                    {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {showNotes && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">
                        Anote com suas próprias palavras os pontos combinados, dúvidas do cliente ou próximos passos. Essas notas ficam
                        visíveis apenas para você e também aparecem no histórico de atividades.
                      </p>
                    </div>

                    {notes.length === 0 && (
                      <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>Sem notas ainda. Registre o que combinou no primeiro contato para não esquecer.</span>
                          <button
                            type="button"
                            onClick={() => handleQuickNote("WHATSAPP")}
                            className="text-[11px] font-semibold text-blue-700 hover:text-blue-800"
                          >
                            Registrar primeiro contato
                          </button>
                        </div>
                      </div>
                    )}

                    {notesError && <p className="text-xs text-red-600 mb-2">{notesError}</p>}

                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 justify-between items-center">
                        <p className="text-[11px] text-gray-500">
                          Se preferir, use os botões abaixo para marcar rapidamente uma conversa por WhatsApp, ligação ou e-mail e depois
                          complemente com seus detalhes.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickNote("WHATSAPP")}
                            className="text-[11px] text-green-700 hover:text-green-800 font-medium"
                          >
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickNote("LIGACAO")}
                            className="text-[11px] text-gray-700 hover:text-gray-900 font-medium"
                          >
                            Ligação
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickNote("EMAIL")}
                            className="text-[11px] text-blue-700 hover:text-blue-800 font-medium"
                          >
                            E-mail
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        rows={3}
                        placeholder="Ex: Cliente pediu retorno depois das 18h; está avaliando financiamento; prefere contato por WhatsApp."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddNote}
                          disabled={notesLoading}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold glass-teal text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {notesLoading ? "Salvando..." : "Salvar nota"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna direita: contexto e próximos passos */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
              {/* Lembrete de próximo passo */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/80">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-sm font-semibold text-gray-900">Próximo passo</h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      hasReminderActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {hasReminderActive ? "Definido" : "Não definido"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Marque um dia e um resumo curto para lembrar o que precisa fazer com este lead (ex: ligar, enviar mensagem,
                  combinar visita).
                </p>

                <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-gray-500">Atalhos:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickReminder("CALL_TOMORROW")}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Ligar amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickReminder("WAITING_RESPONSE")}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Aguardando resposta
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickReminder("SCHEDULE_VISIT")}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Agendar visita
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-700 mb-1">Dia</label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-gray-700 mb-1">Resumo</label>
                    <input
                      type="text"
                      value={reminderNote}
                      onChange={(e) => setReminderNote(e.target.value)}
                      placeholder="Ex: Ligar depois das 18h para saber decisão."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-gray-500">
                  Se você apagar a data e o texto e salvar, o lembrete é removido para este lead.
                </p>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveReminder}
                    disabled={reminderSaving}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold glass-teal text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {reminderSaving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>

              {/* Resumo do imóvel */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Resumo do imóvel</h2>
                <div className="mb-3">
                  <span className="text-gray-500 block text-xs">Preço</span>
                  <span className="font-semibold text-gray-900">{formatPrice(lead.property.price)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
                  <div>
                    <span className="text-gray-500 block text-xs">Tipo</span>
                    <span className="font-medium">{lead.property.type}</span>
                  </div>
                  {lead.property.bedrooms && (
                    <div>
                      <span className="text-gray-500 block text-xs">Quartos</span>
                      <span className="font-medium">{lead.property.bedrooms}</span>
                    </div>
                  )}
                  {lead.property.bathrooms && (
                    <div>
                      <span className="text-gray-500 block text-xs">Banheiros</span>
                      <span className="font-medium">{lead.property.bathrooms}</span>
                    </div>
                  )}
                  {lead.property.areaM2 && (
                    <div>
                      <span className="text-gray-500 block text-xs">Área</span>
                      <span className="font-medium">{lead.property.areaM2}m²</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const value = `${lead.property.street}${lead.property.neighborhood ? `, ${lead.property.neighborhood}` : ""}, ${lead.property.city} - ${lead.property.state}`;
                        copyToClipboard("Endereço", value);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar endereço
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const origin = typeof window !== "undefined" ? window.location.origin : "";
                        const value = `${origin}${buildPropertyPath(lead.property.id, lead.property.title)}`;
                        copyToClipboard("Link", value);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar link
                    </button>
                  </div>

                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs text-gray-500">
                      Abra o anúncio completo se precisar de mais detalhes, fotos ou descrição completa.
                    </p>
                    <Link
                      href={buildPropertyPath(lead.property.id, lead.property.title)}
                      className="inline-flex items-center px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Ver anúncio
                    </Link>
                  </div>
                </div>
              </div>

              {/* Imóveis similares do seu estoque */}
              <div className="bg-white rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowSimilar((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm font-semibold text-gray-900">Imóveis similares</span>
                  <span className="text-xs text-gray-500 inline-flex items-center gap-2">
                    {similarItems.length ? `${similarItems.length} sugestão(ões)` : "Sem sugestões"}
                    {showSimilar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {showSimilar && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-3">
                      Sugestões de imóveis seus parecidos com este (tipo, região e faixa de preço). Use como apoio na conversa ou
                      gere um link para o cliente.
                    </p>

                    {similarError && (
                      <p className="text-[11px] text-red-600 mb-2">{similarError}</p>
                    )}

                    {similarLoading && !similarItems.length ? (
                      <p className="text-xs text-gray-500">Buscando imóveis do seu estoque...</p>
                    ) : similarItems.length === 0 ? (
                      <p className="text-xs text-gray-500 mb-3">
                        Ainda não encontramos imóveis seus parecidos com este. Assim que você tiver mais imóveis na mesma região e
                        faixa de preço, eles aparecem aqui.
                      </p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {similarItems.map((item) => (
                          <Link
                            key={item.property.id}
                            href={buildPropertyPath(item.property.id, item.property.title)}
                            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 hover:bg-white hover:border-gray-200 transition-colors"
                          >
                            <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                              {item.property.images?.[0]?.url && (
                                <Image
                                  src={item.property.images[0].url}
                                  alt={item.property.title}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {item.property.title}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                {item.property.neighborhood ? `${item.property.neighborhood}, ` : ""}
                                {item.property.city}/{item.property.state}
                              </p>
                              <p className="text-[11px] text-gray-900 font-semibold">
                                {formatPrice(item.property.price)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={handleGenerateSimilarLink}
                        disabled={shareGenerating}
                        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-semibold glass-teal text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {shareGenerating ? (
                          "Gerando link..."
                        ) : (
                          <>
                            <LinkIcon className="w-3.5 h-3.5" />
                            Gerar link para enviar ao cliente
                          </>
                        )}
                      </button>

                      {shareUrl && (
                        <div className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <p className="font-medium mb-1">Link gerado:</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={shareUrl}
                              className="flex-1 px-2 py-1 rounded border border-gray-200 bg-white text-[11px] text-gray-700"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard("Link", shareUrl)}
                              className="px-2 py-1 rounded bg-gray-900 text-white text-[11px] font-semibold"
                            >
                              Copiar
                            </button>
                          </div>
                          {shareExpiresAt && (
                            <p className="mt-1 text-[10px] text-gray-500">
                              Válido até {new Date(shareExpiresAt).toLocaleDateString("pt-BR")}.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Seção avançada: mais detalhes da negociação */}
              <div ref={advancedDetailsRef} className="bg-white rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDetails((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm font-semibold text-gray-900">Mais detalhes da negociação</span>
                  <span className="text-xs text-gray-500">
                    {showAdvancedDetails ? "Recolher" : "Ver opções"}
                  </span>
                </button>

                {showAdvancedDetails && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 text-xs text-gray-600 space-y-4">
                    <div>
                      <p className="mb-2">
                        Se este lead não for adiante, marque um motivo simples. Isso ajuda você (e, no futuro, o sistema) a
                        entender por que alguns negócios não avançam.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="sm:col-span-2">
                          <label className="block text-gray-700 mb-1">Motivo da perda (opcional)</label>
                          <select
                            value={resultReason}
                            onChange={(e) => setResultReason(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione um motivo (se aplicável)</option>
                            <option value="CLIENT_DESISTIU">Cliente desistiu / mudou de ideia</option>
                            <option value="FECHOU_OUTRO_IMOVEL">Fechou com outro imóvel</option>
                            <option value="CONDICAO_FINANCEIRA">Condição financeira / crédito</option>
                            <option value="NAO_RESPONDEU">Cliente não respondeu mais</option>
                            <option value="OUTRO">Outro motivo</option>
                          </select>
                        </div>
                        <div className="flex justify-end sm:justify-start">
                          <button
                            type="button"
                            onClick={handleSaveResult}
                            disabled={resultSaving || !resultReason}
                            className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {resultSaving ? "Salvando..." : "Marcar como perdido"}
                          </button>
                        </div>
                      </div>

                      {lead.pipelineStage === "LOST" && lead.lostReason && (
                        <p className="mt-2 text-[11px] text-gray-500">
                          Este lead está marcado como perdido ( {" "}
                          {resultReason === "CLIENT_DESISTIU"
                            ? "cliente desistiu/mudou de ideia"
                            : resultReason === "FECHOU_OUTRO_IMOVEL"
                            ? "fechou com outro imóvel"
                            : resultReason === "CONDICAO_FINANCEIRA"
                            ? "condição financeira/crédito"
                            : resultReason === "NAO_RESPONDEU"
                            ? "cliente não respondeu mais"
                            : "outro motivo"}
                          ).
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                      Em breve, esta área poderá reunir também documentos do cliente, visitas agendadas e preferências de contato.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
