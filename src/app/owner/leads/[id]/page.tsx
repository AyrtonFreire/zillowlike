"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, ArrowLeft, Mail, Phone, MessageCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { getPusherClient } from "@/lib/pusher-client";

interface OwnerLead {
  id: string;
  status: string;
  createdAt: string;
  property: {
    id: string;
    title: string;
    city: string;
    state: string;
  };
  contact?: {
    name: string | null;
    email: string | null;
    phone?: string | null;
  } | null;
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

function formatDateTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return d.toISOString();
  }
}

export default function OwnerLeadChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const leadId = (params?.id as string) || "";

  const [lead, setLead] = useState<OwnerLead | null>(null);
  const [leadLoading, setLeadLoading] = useState(true);
  const [leadError, setLeadError] = useState<string | null>(null);

  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (!leadId || status !== "authenticated") return;
    fetchLead();
    fetchMessages();
  }, [leadId, status]);

  useEffect(() => {
    if (!leadId || status !== "authenticated") return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, [leadId, status]);

  useEffect(() => {
    if (!leadId || status !== "authenticated") return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-lead-${leadId}`;
      const channel = pusher.subscribe(channelName);

      const handler = (data: { leadId: string; message: LeadMessage }) => {
        if (cancelled) return;
        if (data.leadId !== leadId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
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
      console.error("Error subscribing to owner lead messages channel:", err);
    }
  }, [leadId, status]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  const fetchLead = async () => {
    try {
      setLeadError(null);
      setLeadLoading(true);
      const response = await fetch(`/api/owner/leads/${leadId}`);
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos carregar este lead agora.");
      }

      setLead(data.lead as OwnerLead);
    } catch (err: any) {
      console.error("Error fetching owner lead:", err);
      setLeadError(err?.message || "Não conseguimos carregar este lead agora.");
    } finally {
      setLeadLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setMessagesError(null);
      setMessagesLoading(true);
      const response = await fetch(`/api/leads/${leadId}/messages`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos carregar as mensagens deste lead agora.");
      }

      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err: any) {
      console.error("Error fetching lead messages:", err);
      setMessagesError(err?.message || "Não conseguimos carregar as mensagens deste lead agora.");
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const content = messageDraft.trim();
    if (!content || !leadId) return;

    try {
      setSending(true);
      const response = await fetch(`/api/leads/${leadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok || !data?.message) {
        throw new Error(data?.error || "Não conseguimos enviar esta mensagem agora.");
      }

      setMessages((prev) => [...prev, data.message]);
      setMessageDraft("");
    } catch (err: any) {
      console.error("Error sending lead message:", err);
      alert(err?.message || "Não conseguimos enviar esta mensagem agora. Tente novamente em alguns instantes.");
    } finally {
      setSending(false);
    }
  };

  const currentUserId = (session?.user as any)?.id || "";

  const content = () => {
    if (leadLoading) {
      return (
        <div className="py-12">
          <CenteredSpinner message="Carregando lead..." />
        </div>
      );
    }

    if (leadError || !lead) {
      return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <EmptyState
            title="Não conseguimos carregar este lead"
            description={leadError || "Ele pode ter sido removido ou você não tem acesso a ele."}
            action={
              <button
                type="button"
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <button
          type="button"
          onClick={() => router.push("/owner/leads")}
          className="mb-2 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para Meus Leads
        </button>

        {/* Cabeçalho simples */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Conversa sobre</p>
            <h1 className="text-lg font-semibold text-gray-900">{lead.property.title}</h1>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <Calendar className="w-4 h-4" />
              <span>Lead criado em {formatDateTime(lead.createdAt)}</span>
            </p>
          </div>

          {lead.contact && (
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 mt-2">
              <span className="font-medium">Interessado: {lead.contact.name}</span>
              {lead.contact.email && (
                <a
                  href={`mailto:${lead.contact.email}`}
                  className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600"
                >
                  <Mail className="w-4 h-4" />
                  {lead.contact.email}
                </a>
              )}
              {lead.contact.phone && (
                <a
                  href={`tel:${lead.contact.phone}`}
                  className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600"
                >
                  <Phone className="w-4 h-4" />
                  {lead.contact.phone}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Conversa */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Conversa com o corretor
          </h2>

          {messagesError && (
            <p className="text-xs text-red-600 mb-3">{messagesError}</p>
          )}

          <div className="border border-gray-200 rounded-2xl p-3 h-72 overflow-y-auto flex flex-col gap-3 bg-gray-50">
            {messagesLoading ? (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
                Carregando mensagens...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-xs text-gray-500 px-4">
                Use este espaço para alinhar com o corretor detalhes sobre visitas, propostas ou qualquer ponto específico
                deste interessado.
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId || msg.senderRole === "OWNER";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm border ${
                          isMine
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-900 border-gray-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isMine ? "text-blue-100" : "text-gray-400"
                          }`}
                        >
                          {isMine ? "Você" : msg.sender?.name || "Corretor"} - {formatDateTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Caixa de mensagem */}
          <div className="mt-4 flex items-end gap-3">
            <textarea
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              rows={2}
              placeholder="Escreva aqui sua mensagem para o corretor..."
              className="flex-1 resize-none text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={sending || !messageDraft.trim()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      title="Conversa com o corretor"
      description="Troque mensagens simples com o corretor sobre este interessado."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Proprietário", href: "/owner/dashboard" },
        { label: "Leads", href: "/owner/leads" },
        { label: "Conversa" },
      ]}
    >
      {content()}
    </DashboardLayout>
  );
}
