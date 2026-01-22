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
} from "lucide-react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
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

type LeadChannel = "WHATSAPP" | "CHAT";

type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function parseChecklistNote(note: string | null | undefined): ChecklistItem[] {
  const raw = String(note || "").trim();
  if (!raw) return [];

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const checklist = lines
    .map((line) => {
      const m = line.match(/^\[(x|\s)\]\s*(.+)$/i);
      if (!m) return null;
      return {
        id: makeId(),
        done: String(m[1]).toLowerCase() === "x",
        text: String(m[2] || "").trim(),
      } satisfies ChecklistItem;
    })
    .filter((x): x is ChecklistItem => Boolean(x && x.text));

  if (checklist.length >= 2) return checklist;

  // fallback: treat as single-item plan
  return [
    {
      id: makeId(),
      done: false,
      text: raw,
    },
  ];
}

function serializeChecklistNote(items: ChecklistItem[]) {
  return items
    .map((it) => it.text.trim())
    .filter(Boolean)
    .map((text, idx) => {
      const done = Boolean(items[idx]?.done);
      return `[${done ? "x" : " "}] ${text}`;
    })
    .join("\n");
}

function getChecklistSummary(items: ChecklistItem[]) {
  const clean = items.map((x) => x.text.trim()).filter(Boolean);
  if (clean.length === 0) return "rever este lead";
  const firstOpen = items.find((x) => !x.done && x.text.trim());
  if (firstOpen) return firstOpen.text.trim();
  return `${clean.length} tarefa(s) concluída(s)`;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const realtorId = (session?.user as any)?.id || "";

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

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const [activeTab, setActiveTab] = useState<"ATIVIDADES" | "NOTAS" | "IMOVEL" | "SIMILARES">("ATIVIDADES");

  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  const [aiDraftMessage, setAiDraftMessage] = useState("");
  const [messageDraft, setMessageDraft] = useState("");

  const [leadChannelDetected, setLeadChannelDetected] = useState<LeadChannel | null>(null);
  const [leadChannelOverride, setLeadChannelOverride] = useState<LeadChannel | null>(null);

  const [similarItems, setSimilarItems] = useState<SimilarPropertyItem[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareGenerating, setShareGenerating] = useState(false);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [showNotes, setShowNotes] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);

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
        setChecklistItems(parseChecklistNote(data.lead.nextActionNote));
      } else {
        setChecklistItems([]);
      }
    } catch (err: any) {
      console.error("Error fetching lead detail:", err);
      setError(err?.message || "Não conseguimos carregar os detalhes deste lead agora.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const fetchLeadChannel = useCallback(async () => {
    if (!leadId) return;
    try {
      const response = await fetch(`/api/leads/${leadId}/events`);
      const data = await response.json().catch(() => null);
      const events = Array.isArray(data?.events) ? data.events : [];
      const hasWhatsapp = events.some((e: any) => {
        const source = e?.metadata?.source;
        return String(source || "").toUpperCase() === "WHATSAPP";
      });
      if (hasWhatsapp) {
        setLeadChannelDetected("WHATSAPP");
        return;
      }

      // If the lead supports client chat, prefer CHAT.
      if (lead?.clientChatToken) {
        setLeadChannelDetected("CHAT");
        return;
      }

      setLeadChannelDetected(null);
    } catch (err) {
      console.error("Error fetching lead channel via events:", err);
      setLeadChannelDetected(null);
    }
  }, [leadId, lead?.clientChatToken]);

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

  useEffect(() => {
    if (!leadId) return;
    fetchLeadChannel();
  }, [leadId, fetchLeadChannel]);

  const handleSaveReminder = async () => {
    try {
      setReminderSaving(true);
      const body: any = {};
      if (reminderDate) body.date = reminderDate;
      const serializedChecklist = serializeChecklistNote(checklistItems);
      if (serializedChecklist) body.note = serializedChecklist;
      else if (reminderNote) body.note = reminderNote;
      if (!reminderDate && !reminderNote && !serializedChecklist) {
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

  const handleGenerateNextStepSuggestion = async () => {
    if (!leadId) return;
    try {
      setAiSuggestionLoading(true);
      const response = await fetch(`/api/assistant/leads/${leadId}/coach?ai=1`);
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos gerar uma sugestão agora.");
      }

      const payload = data?.data;
      const draft = payload?.draft ? String(payload.draft).trim() : "";
      setAiDraftMessage(draft);
      if (draft) setMessageDraft(draft);

      const planSteps: string[] = Array.isArray(payload?.nextSteps)
        ? payload.nextSteps
            .map((x: unknown) => String(x))
            .filter((x: string) => Boolean(x && x.trim()))
            .slice(0, 6)
        : [];
      if (planSteps.length > 0) {
        setChecklistItems(planSteps.map((text: string) => ({ id: makeId(), text: text.trim(), done: false })));
      } else if (draft) {
        setChecklistItems([{ id: makeId(), text: draft, done: false }]);
      }

      const nextStep =
        (Array.isArray(payload?.nextSteps) && payload.nextSteps.length ? String(payload.nextSteps[0]) : "") ||
        String(payload?.draft || "");

      if (nextStep) {
        setReminderNote(nextStep.trim());
      }

      if (!reminderDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setReminderDate(tomorrow.toISOString().split("T")[0]);
      }

      toast.success("Sugestão gerada", "Revise se quiser e clique em salvar.");
    } catch (err: any) {
      console.error("Error generating next step suggestion:", err);
      toast.error("Erro ao gerar sugestão", err?.message || "Tente novamente em alguns instantes.");
    } finally {
      setAiSuggestionLoading(false);
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
      router.push("/broker/leads");
    } catch (err: any) {
      console.error("Error archiving lead:", err);
      toast.error("Erro ao arquivar lead", err?.message || "Tente novamente.");
    } finally {
      setArchivingLead(false);
    }
  };

  const handleGenerateSimilarLink = async () => {
    if (!leadId) return;
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

  const getWhatsAppUrl = (phone?: string | null, text?: string) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "";
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    const base = `https://wa.me/${withCountry}`;
    if (text && String(text).trim()) {
      return `${base}?text=${encodeURIComponent(String(text).trim())}`;
    }
    return base;
  };

  const hasReminderActive = Boolean(reminderDate || reminderNote || checklistItems.some((x) => x.text.trim()));
  const whatsappUrl = lead?.contact?.phone ? getWhatsAppUrl(lead.contact.phone) : "";
  const hasWhatsApp = Boolean(whatsappUrl);

  const channelAuto: LeadChannel =
    leadChannelDetected === "WHATSAPP"
      ? "WHATSAPP"
      : lead?.clientChatToken
      ? "CHAT"
      : hasWhatsApp
      ? "WHATSAPP"
      : "CHAT";
  const activeChannel = leadChannelOverride || channelAuto;

  if (loading) {
    return <CenteredSpinner message="Carregando detalhes do lead..." />;
  }

  if (error || !lead) {
    return (
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
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {lead.contact?.name || "Lead sem nome"}
                </h1>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${
                    (STAGE_BADGE as any)[(lead.pipelineStage || "NEW") as any]?.className || "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  {(STAGE_BADGE as any)[(lead.pipelineStage || "NEW") as any]?.label || (lead.pipelineStage || "Novo")}
                </span>
              </div>

              <p className="mt-1 text-xs sm:text-sm text-gray-600 truncate">
                Interessado em: <span className="font-semibold text-gray-900">{lead.property.title}</span>
              </p>

              <p className="mt-1 text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate">
                  {lead.property.street}, {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                  {lead.property.city} - {lead.property.state}
                </span>
              </p>

              {lead.contact && (
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-600">
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

              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-gray-600">
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
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Concluído {getTimeAgo(lead.completedAt)}</span>
                  </div>
                )}
              </div>

              {hasReminderActive && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                  <Clock className="w-3 h-3" />
                  <span>
                    Próximo passo: {getChecklistSummary(checklistItems) || reminderNote || "rever este lead"}
                    {reminderDate &&
                      ` · ${new Date(reminderDate).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              {activeChannel === "WHATSAPP" && hasWhatsApp ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700"
                  title="Abrir WhatsApp com texto pronto (você pode editar antes de enviar)"
                >
                  <MessageCircle className="w-4 h-4" />
                  Abrir WhatsApp
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

              <div className="flex flex-wrap justify-end gap-2">
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
                <Link
                  href={buildPropertyPath(lead.property.id, lead.property.title)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Ver anúncio
                </Link>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {lead.pipelineStage !== "WON" && lead.pipelineStage !== "LOST" && (
                  <button
                    type="button"
                    onClick={handleCompleteLead}
                    disabled={completingLead}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Marcar próximo passo como feito"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    {clearingReminder ? "Concluindo..." : "Próximo passo feito"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleArchiveLead}
                  disabled={archivingLead}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Arquivar (remover da lista)"
                >
                  {archivingLead ? "Arquivando..." : "Arquivar lead"}
                </button>
              </div>
            </div>
          </div>

          {showLeadHelp && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
              <p className="font-semibold text-gray-900 text-sm mb-2">Roteiro rápido para este lead</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Falar com o cliente pelo canal principal (WhatsApp ou chat).</li>
                <li>Aplicar o plano (checklist) e mandar a mensagem.</li>
                <li>Registrar uma nota curta com o combinado.</li>
              </ol>
              <p className="mt-2 text-[11px] text-gray-500">
                A ideia é manter tudo acima da dobra: ação, contexto e histórico.
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

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <LeadTimeline
            leadId={leadId}
            createdAt={lead.createdAt}
            respondedAt={lead.respondedAt}
            completedAt={lead.completedAt}
            pipelineStage={lead.pipelineStage}
            notes={notes}
            messages={messages}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900">Similares</h2>
              <p className="text-[11px] text-gray-500">Imóveis do seu estoque que podem ajudar a fechar esse lead.</p>
            </div>
            <button
              type="button"
              onClick={handleGenerateSimilarLink}
              disabled={shareGenerating}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold glass-teal text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {shareGenerating ? "Gerando..." : (
                <>
                  <LinkIcon className="w-3.5 h-3.5" />
                  Gerar link
                </>
              )}
            </button>
          </div>

          <div className="p-4">
            {similarError && <p className="text-[11px] text-red-600 mb-2">{similarError}</p>}

            {similarLoading && !similarItems.length ? (
              <p className="text-xs text-gray-500">Buscando imóveis do seu estoque...</p>
            ) : similarItems.length === 0 ? (
              <p className="text-xs text-gray-500">
                Ainda não encontramos imóveis seus parecidos com este. Assim que você tiver mais imóveis na mesma região e faixa de preço,
                eles aparecem aqui.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {similarItems.map((item) => (
                  <Link
                    key={item.property.id}
                    href={buildPropertyPath(item.property.id, item.property.title)}
                    className="min-w-[240px] max-w-[240px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors overflow-hidden"
                  >
                    <div className="relative h-28 w-full bg-gray-100">
                      {item.property.images?.[0]?.url ? (
                        <Image src={item.property.images[0].url} alt={item.property.title} fill className="object-cover" />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-900 line-clamp-2">{item.property.title}</p>
                      <p className="mt-1 text-[11px] text-gray-500 truncate">
                        {item.property.neighborhood ? `${item.property.neighborhood}, ` : ""}
                        {item.property.city}/{item.property.state}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-900 font-semibold">{formatPrice(item.property.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {shareUrl && (
              <div className="mt-3 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
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
    </div>
  );
}
