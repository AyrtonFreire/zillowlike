"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  Send, 
  Wifi, 
  WifiOff, 
  Home, 
  MapPin, 
  ExternalLink,
  User,
  Clock,
  CheckCheck,
  MessageCircle
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";

interface ChatMessage {
  id: string;
  fromClient: boolean;
  content: string;
  createdAt: string;
}

interface ChatLeadInfo {
  id: string;
  createdAt?: string;
  property?: {
    id: string;
    title: string;
    city?: string | null;
    state?: string | null;
    neighborhood?: string | null;
    price?: number | null;
    type?: string | null;
    purpose?: string | null;
    image?: string | null;
  } | null;
  contact?: {
    name?: string | null;
    email?: string | null;
  } | null;
  responsible?: {
    id: string;
    name?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
}

// Mensagens rápidas sugeridas
const QUICK_MESSAGES = [
  "Olá! Gostaria de agendar uma visita.",
  "Qual a disponibilidade para visitar?",
  "O imóvel ainda está disponível?",
  "Podemos negociar o valor?",
];

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  
  try {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  } catch {
    return "";
  }
}

function formatPrice(price: number | null | undefined) {
  if (!price) return null;
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function isSameDay(d1: string, d2: string) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.toDateString() === date2.toDateString();
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ClientChatPage() {
  const params = useParams();
  const token = (params?.token as string) || "";

  const [lead, setLead] = useState<ChatLeadInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(true);
  const [showPropertyCard, setShowPropertyCard] = useState(true);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(inset);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const measure = () => {
      const h = composerRef.current?.getBoundingClientRect().height || 0;
      setComposerHeight(h);
    };

    measure();
    const t = window.setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Carregar chat inicial
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const fetchChat = async () => {
      try {
        const response = await fetch(`/api/chat/${token}`);
        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Não conseguimos carregar este chat agora.");
        }

        if (cancelled) return;

        setLead(data.lead || null);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Error fetching client chat:", err);
        setError(err?.message || "Não conseguimos carregar este chat agora.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchChat();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Conectar ao Pusher para atualizações em tempo real
  useEffect(() => {
    if (!lead?.id) return;

    let cancelled = false;
    
    try {
      const pusher = getPusherClient();
      const channelName = `chat-${lead.id}`;
      const channel = pusher.subscribe(channelName);

      // Evento de conexão
      pusher.connection.bind("connected", () => {
        if (!cancelled) setIsConnected(true);
      });

      pusher.connection.bind("disconnected", () => {
        if (!cancelled) setIsConnected(false);
      });

      // Se já estiver conectado
      if (pusher.connection.state === "connected") {
        setIsConnected(true);
      }

      // Ouvir novas mensagens
      channel.bind("new-chat-message", (data: {
        id: string;
        leadId: string;
        fromClient: boolean;
        content: string;
        createdAt: string;
      }) => {
        if (cancelled) return;
        
        // Quando corretor envia mensagem, parar indicador de digitando
        if (!data.fromClient) {
          setIsTyping(false);
        }

        setMessages((prev) => {
          // Se já temos uma mensagem com esse ID, não faz nada
          if (prev.some((m) => m.id === data.id)) return prev;

          // Se veio do cliente, pode ser a mesma mensagem que acabamos de colocar como temp-*
          if (data.fromClient) {
            const tempIndex = prev.findIndex((m) => m.id.startsWith("temp-") && m.content === data.content);
            if (tempIndex !== -1) {
              const clone = [...prev];
              clone[tempIndex] = {
                ...clone[tempIndex],
                id: data.id,
                createdAt: data.createdAt,
              };
              return clone;
            }
          }

          // Caso geral: apenas adiciona ao final, evitando duplicatas
          return [
            ...prev,
            {
              id: data.id,
              fromClient: data.fromClient,
              content: data.content,
              createdAt: data.createdAt,
            },
          ];
        });
      });

      // Ouvir indicador de digitando do corretor
      channel.bind("typing", (data: { fromClient: boolean }) => {
        if (!cancelled && !data.fromClient) {
          setIsTyping(true);
          // Auto-desligar após 3 segundos
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            if (!cancelled) setIsTyping(false);
          }, 3000);
        }
      });

      return () => {
        cancelled = true;
        try {
          channel.unbind_all();
          pusher.unsubscribe(channelName);
        } catch {
          // Ignore cleanup errors
        }
      };
    } catch (err) {
      console.error("Error setting up Pusher:", err);
    }
  }, [lead?.id]);

  // Auto-scroll para o final
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim() || !token) return;

    const content = draft.trim();
    setDraft("");

    // Adiciona mensagem localmente para feedback imediato
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatMessage = {
      id: tempId,
      fromClient: true,
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      setSending(true);
      const response = await fetch(`/api/chat/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-chat-context": "client" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos enviar esta mensagem agora.");
      }

      // Atualiza o ID da mensagem temporária com o ID real
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: data.message.id, createdAt: data.message.createdAt }
            : m
        )
      );
    } catch (err: any) {
      console.error("Error sending client chat message:", err);
      // Remove a mensagem temporária em caso de erro
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert(err?.message || "Não conseguimos enviar esta mensagem agora. Tente novamente mais tarde.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const title = useMemo(() => {
    if (!lead?.property) return "Conversa sobre o imóvel";
    const parts = [lead.property.title];
    if (lead.property.city) {
      parts.push(`${lead.property.city}${lead.property.state ? ", " + lead.property.state : ""}`);
    }
    return parts.join(" · ");
  }, [lead]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link de chat inválido</h1>
          <p className="text-sm text-gray-600 mb-4">
            Este link de conversa não é válido. Verifique se você copiou o endereço completo ou peça um novo link ao corretor.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Carregando conversa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Não conseguimos abrir esta conversa</h1>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header com avatar do responsável */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Avatar do responsável */}
            {lead?.responsible && (
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                  {lead.responsible.image ? (
                    <Image 
                      src={lead.responsible.image} 
                      alt={lead.responsible.name || ""} 
                      width={48} 
                      height={48} 
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {getInitials(lead.responsible.name)}
                    </span>
                  )}
                </div>
                {/* Badge de conexão */}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isConnected ? "bg-green-500" : "bg-gray-400"
                }`} />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-gray-900 truncate">
                  {lead?.responsible?.name || "Corretor"}
                </h1>
                {lead?.responsible?.role === "REALTOR" && (
                  <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">
                    Corretor
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{title}</p>
              {/* Indicador de digitando */}
              {isTyping && (
                <span className="flex items-center gap-1 text-[11px] text-teal-600 mt-0.5">
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  digitando...
                </span>
              )}
            </div>
            
            {/* Link para ver imóvel */}
            {lead?.property?.id && (
              <Link
                href={`/property/${lead.property.id}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                Ver imóvel
              </Link>
            )}
          </div>
        </div>
        
        {/* Card do imóvel colapsável */}
        {showPropertyCard && lead?.property && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <div className="flex gap-3 items-start">
                {/* Imagem */}
                {lead.property.image && (
                  <div className="relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                    <Image 
                      src={lead.property.image} 
                      alt={lead.property.title} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.property.title}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">
                      {[lead.property.neighborhood, lead.property.city, lead.property.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                  {lead.property.price && (
                    <p className="text-sm font-semibold text-teal-600 mt-1">
                      {formatPrice(lead.property.price)}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setShowPropertyCard(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Esconder"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 py-4 h-full flex flex-col">
          <div
            className="flex-1 overflow-y-auto rounded-2xl bg-white border border-gray-200 p-4 flex flex-col"
            style={{ paddingBottom: Math.max(0, composerHeight + keyboardOffset + 12) }}
          >
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-sm text-gray-500 px-4">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-7 h-7 text-teal-600" />
                </div>
                <p className="font-medium text-gray-800 mb-1">Inicie a conversa</p>
                <p className="text-xs text-gray-500 mb-6 max-w-xs">
                  Tire suas dúvidas, agende uma visita ou negocie diretamente com o responsável pelo imóvel.
                </p>
                
                {/* Mensagens rápidas sugeridas */}
                {showQuickMessages && (
                  <div className="w-full max-w-sm space-y-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Sugestões</p>
                    {QUICK_MESSAGES.map((msg, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setDraft(msg);
                          setShowQuickMessages(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-teal-50 border border-gray-200 hover:border-teal-200 rounded-lg transition-colors text-gray-700 hover:text-teal-700"
                      >
                        {msg}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 flex-1">
                {messages.map((msg, index) => {
                  // Verificar se precisa mostrar separador de data
                  const showDateSeparator = index === 0 || 
                    !isSameDay(messages[index - 1].createdAt, msg.createdAt);
                  
                  return (
                    <div key={msg.id}>
                      {/* Separador de data */}
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-4">
                          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-[11px] font-medium text-gray-500">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className={`flex ${msg.fromClient ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            msg.fromClient
                              ? "bg-teal-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 text-[10px] ${
                            msg.fromClient ? "text-teal-200 justify-end" : "text-gray-400"
                          }`}>
                            <span>{msg.fromClient ? "Você" : (lead?.responsible?.name?.split(" ")[0] || "Corretor")}</span>
                            <span>·</span>
                            <span>{formatTime(msg.createdAt)}</span>
                            {msg.fromClient && !msg.id.startsWith("temp-") && (
                              <CheckCheck className="w-3 h-3 ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Indicador de digitando */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Input */}
      <footer
        ref={composerRef as any}
        className="bg-white border-t border-gray-200 fixed left-0 right-0 safe-area-pb z-20"
        style={{ bottom: keyboardOffset }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Escreva sua mensagem..."
            className="flex-1 resize-none text-sm px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[48px] max-h-32 bg-gray-50"
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 128) + "px";
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:bg-teal-700 active:scale-95 transition-all"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 pb-3">
          Enter para enviar · Shift+Enter nova linha
        </p>
      </footer>
    </div>
  );
}
