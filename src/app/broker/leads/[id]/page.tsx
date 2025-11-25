"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, MapPin, Calendar, Clock, ArrowLeft, MessageCircle } from "lucide-react";
import CountdownTimer from "@/components/queue/CountdownTimer";
import StatusIndicator from "@/components/queue/StatusIndicator";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { getPusherClient } from "@/lib/pusher-client";
import { useToast } from "@/contexts/ToastContext";
import LeadTimeline from "@/components/crm/LeadTimeline";

interface Lead {
  id: string;
  status: "RESERVED" | "ACCEPTED" | "COMPLETED";
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

const MESSAGE_TEMPLATES = [
  {
    id: "first-contact",
    label: "Primeiro contato",
    text:
      "Oi, tudo bem? Aqui é o(a) corretor(a) deste imóvel. Vi seu interesse e posso te ajudar com mais detalhes e condições. Podemos falar por aqui ou por WhatsApp?",
  },
  {
    id: "visit-confirmation",
    label: "Confirmação de visita",
    text:
      "Só passando para confirmar nossa visita ao imóvel. Se precisar alterar horário ou tiver alguma dúvida, é só me avisar por aqui.",
  },
  {
    id: "docs-request",
    label: "Pedido de documentos",
    text:
      "Para avançarmos com a proposta, vou precisar de alguns documentos básicos (RG, CPF e comprovante de renda). Assim que puder, me envie por aqui ou pelo WhatsApp.",
  },
];

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
  const [messageDraft, setMessageDraft] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  const [clientChatLoading, setClientChatLoading] = useState(false);

  const [showMessagesHistory, setShowMessagesHistory] = useState(false);
  const [showNotesHistory, setShowNotesHistory] = useState(false);
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

  const leadId = (params?.id as string) || "";
  const toast = useToast();

  useEffect(() => {
    if (!realtorId || !leadId) return;
    fetchLead();
    fetchLeadNotes();
    fetchMessages();
  }, [realtorId, leadId]);

  useEffect(() => {
    if (!leadId) return;
    const interval = setInterval(() => {
      fetchMessages({ isBackground: true });
    }, 30000);
    return () => clearInterval(interval);
  }, [leadId]);

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

        setLastMessageId((prev) => data.message.id || prev);
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

  const fetchLead = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/leads/${leadId}`);
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos encontrar este lead agora.");
      }

      setLead(data.lead);
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
  };

  const fetchLeadNotes = async () => {
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
  };

  const handleSendMessage = async () => {
    const content = messageDraft.trim();
    if (!content) {
      toast.warning("Campo vazio", "Escreva uma mensagem antes de enviar.");
      return;
    }

    try {
      setSendingMessage(true);
      setMessagesError(null);

      const response = await fetch(`/api/leads/${leadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos enviar esta mensagem agora.");
      }

      setMessages((prev) => [...prev, data.message]);
      setMessageDraft("");
      setLastMessageId(data.message.id);
      setHasNewMessages(false);
    } catch (err: any) {
      console.error("Error sending lead message:", err);
      setMessagesError(err?.message || "Não conseguimos enviar esta mensagem agora.");
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchMessages = async (options?: { isBackground?: boolean }) => {
    try {
      setMessagesError(null);
      if (!options?.isBackground) {
        setMessagesLoading(true);
        setHasNewMessages(false);
      }

      const response = await fetch(`/api/leads/${leadId}/messages`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível carregar as mensagens deste lead.");
      }

      const newMessages: LeadMessage[] = data.messages || [];
      const newLastId = newMessages.length ? newMessages[newMessages.length - 1].id : null;

      if (options?.isBackground && lastMessageId && newLastId && newLastId !== lastMessageId) {
        setHasNewMessages(true);
      }

      setLastMessageId(newLastId);
      setMessages(newMessages);
    } catch (err: any) {
      console.error("Error fetching lead messages:", err);
      setMessagesError(err?.message || "Não foi possível carregar as mensagens deste lead.");
    } finally {
      if (!options?.isBackground) {
        setMessagesLoading(false);
      }
    }
  };

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

  const openClientChatWindow = (token: string) => {
    if (typeof window === "undefined") return;
    const base = window.location.origin;
    const url = `${base}/chat/${token}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenClientChat = async () => {
    if (!lead || !leadId) return;

    if (lead.clientChatToken) {
      openClientChatWindow(lead.clientChatToken);
      return;
    }

    try {
      setClientChatLoading(true);
      const response = await fetch(`/api/leads/${leadId}/client-chat/token`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data?.success || !data?.token) {
        throw new Error(data?.error || "Não conseguimos gerar o link de conversa agora.");
      }

      const token = String(data.token);
      setLead((prev) => (prev ? { ...prev, clientChatToken: token } : prev));
      openClientChatWindow(token);
    } catch (err: any) {
      console.error("Error opening client chat:", err);
      toast.error("Erro ao abrir chat", err?.message || "Não conseguimos abrir esta conversa agora.");
    } finally {
      setClientChatLoading(false);
    }
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

  if (loading) {
    return <CenteredSpinner message="Carregando detalhes do lead..." />;
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <button
            type="button"
            onClick={() => router.push("/broker/leads")}
            className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar para Meus Leads
          </button>

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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          type="button"
          onClick={() => router.push("/broker/leads")}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para Meus Leads
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Imagem do imóvel */}
            <div className="lg:w-1/3">
              <div className="relative w-full h-56 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={lead.property.images[0]?.url || "/placeholder.jpg"}
                  alt={lead.property.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Lembrete de próximo passo */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Lembrete de próximo passo</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Se quiser, você pode marcar um dia e um resumo curto para lembrar o que precisa fazer com este lead (ex: ligar,
                  enviar mensagem, combinar visita).
                </p>

                <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-gray-500">Atalhos rápidos:</span>
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
                    <label className="block text-gray-700 mb-1">Dia do lembrete</label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-gray-700 mb-1">Resumo rápido</label>
                    <input
                      type="text"
                      value={reminderNote}
                      onChange={(e) => setReminderNote(e.target.value)}
                      placeholder="Ex: Ligar depois das 18h para saber decisão."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    {reminderSaving ? "Salvando lembrete..." : "Salvar lembrete"}
                  </button>
                </div>
              </div>
            </div>

            {/* Informações principais */}
            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Lead do imóvel</h1>
                  <p className="text-lg font-semibold text-gray-900">{lead.property.title}</p>
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {lead.property.street}, {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                      {lead.property.city} - {lead.property.state}
                    </span>
                  </p>
                </div>
                <StatusIndicator status={lead.status as any} />
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
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Concluído {getTimeAgo(lead.completedAt)}</span>
                  </div>
                )}
                {lead.reservedUntil && lead.status === "RESERVED" && (
                  <CountdownTimer targetDate={new Date(lead.reservedUntil)} />
                )}
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
                      Definir um próximo passo simples no lembrete do lado esquerdo (dia e um pequeno resumo).
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

          {/* Blocos de informações */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contato */}
            <div className="lg:col-span-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Dados de contato</h2>
              {lead.contact ? (
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="font-medium">{lead.contact.name}</p>
                  {lead.contact.phone && (
                    <p className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${lead.contact.phone}`} className="hover:text-blue-600">
                          {lead.contact.phone}
                        </a>
                      </span>
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
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${lead.contact.email}`} className="hover:text-blue-600">
                      {lead.contact.email}
                    </a>
                  </p>
                  <p className="mt-3 text-xs text-gray-500">
                    Use o canal que fizer mais sentido para você e para o cliente. Este painel é apenas um apoio para organizar
                    seus atendimentos.
                  </p>

                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Se preferir, você também pode usar um chat simples pela plataforma. Ele é pensado para clientes que não
                      querem depender só do WhatsApp.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenClientChat}
                      disabled={clientChatLoading}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {clientChatLoading ? "Abrindo conversa..." : "Abrir área de conversa com o cliente"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Os dados de contato não estão disponíveis para este lead.</p>
              )}
            </div>

            {/* Resumo do imóvel */}
            <div className="lg:col-span-2 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Resumo do imóvel</h2>
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
              <p className="mt-4 text-xs text-gray-500">
                Se você quiser ver o anúncio completo, pode abrir a página do imóvel em outra aba e continuar com este painel
                aberto.
              </p>
              <Link
                href={`/property/${lead.property.id}`}
                className="mt-2 inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
              >
                Ver anúncio do imóvel
              </Link>
            </div>
          </div>

          {/* Resultado da negociação */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Resultado da negociação</h2>
            <p className="text-xs text-gray-500 mb-3">
              Se este lead não for adiante, você pode marcar um motivo simples. Isso ajuda você (e, no futuro, o sistema) a
              entender melhor por que alguns negócios não avançam.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
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
                Este lead está marcado como perdido ({" "}
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

          {/* Mensagens internas */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Mensagens internas
              {hasNewMessages && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 text-[10px] font-semibold text-red-700">
                  Novas mensagens
                </span>
              )}
            </h2>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Use este espaço para registrar, em forma de conversa, os pontos combinados sobre este lead. No início, as
                mensagens ficam visíveis apenas para você; no futuro, poderão ser compartilhadas também com o proprietário.
              </p>
              <button
                type="button"
                onClick={() => setShowMessagesHistory((prev) => !prev)}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
              >
                {showMessagesHistory ? "Esconder histórico" : "Ver histórico de mensagens"}
              </button>
            </div>

            {messagesError && <p className="text-xs text-red-600 mb-2">{messagesError}</p>}

            {showMessagesHistory && (
              <>
                {messagesLoading && messages.length === 0 ? (
                  <p className="text-xs text-gray-500">Carregando mensagens...</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-gray-500 mb-3">
                    Ainda não há mensagens registradas para este lead. Você pode usar este espaço como uma conversa organizada
                    sobre o atendimento.
                  </p>
                ) : (
                  <div className="mb-4 space-y-2 max-h-48 overflow-y-auto pr-1 text-xs text-gray-700">
                    {messages.map((message) => (
                      <div key={message.id} className="px-3 py-2 rounded-md bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-[11px] text-gray-800 truncate">
                            {message.sender?.name || "Você"}
                            {message.sender?.role && (
                              <span className="ml-1 text-[10px] text-gray-500 uppercase">
                                {message.sender.role === "REALTOR"
                                  ? "Corretor(a)"
                                  : message.sender.role === "OWNER"
                                  ? "Proprietário(a)"
                                  : message.sender.role === "ADMIN"
                                  ? "Admin"
                                  : message.sender.role}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(message.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <p className="text-[11px] text-gray-500">
                  Use os atalhos abaixo para preencher rapidamente uma mensagem comum e depois ajuste com seus detalhes.
                </p>
                <div className="flex flex-wrap gap-2">
                  {MESSAGE_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() =>
                        setMessageDraft((prev) => (prev ? `${prev}\n\n${template.text}` : template.text))
                      }
                      className="text-[11px] text-blue-700 hover:text-blue-800 font-medium"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                onFocus={() => setHasNewMessages(false)}
                rows={2}
                placeholder="Escreva aqui uma mensagem sobre este atendimento (ex: resumo da proposta enviada, pendências, próximos passos)."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sendingMessage}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? "Enviando..." : "Enviar mensagem"}
                </button>
              </div>
            </div>
          </div>

          {/* Notas rápidas */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Notas sobre este lead</h2>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Anote com suas próprias palavras os pontos combinados, dúvidas do cliente ou próximos passos. Essas notas ficam
                visíveis apenas para você.
              </p>
              <button
                type="button"
                onClick={() => setShowNotesHistory((prev) => !prev)}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
              >
                {showNotesHistory ? "Esconder histórico" : "Ver histórico de notas"}
              </button>
            </div>

            {notesError && <p className="text-xs text-red-600 mb-2">{notesError}</p>}

            {showNotesHistory && (
              <>
                {notesLoading && notes.length === 0 ? (
                  <p className="text-xs text-gray-500">Carregando notas...</p>
                ) : notes.length === 0 ? (
                  <p className="text-xs text-gray-500 mb-3">Ainda não há notas registradas para este lead.</p>
                ) : (
                  <div className="mb-4 space-y-1 max-h-40 overflow-y-auto pr-1 text-xs text-gray-700">
                    {notes.map((note) => (
                      <div key={note.id} className="px-2 py-1 rounded-md bg-gray-50 border border-gray-100">
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
                )}
              </>
            )}

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
                    Registrar conversa por WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickNote("LIGACAO")}
                    className="text-[11px] text-gray-700 hover:text-gray-900 font-medium"
                  >
                    Registrar conversa por ligação
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickNote("EMAIL")}
                    className="text-[11px] text-blue-700 hover:text-blue-800 font-medium"
                  >
                    Registrar conversa por e-mail
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
        </div>
      </div>
    </div>
  );
}
