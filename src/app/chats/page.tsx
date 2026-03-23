"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { MessageCircle, Send, ChevronLeft, Home } from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import { getPusherClient } from "@/lib/pusher-client";

type ChatPreview = {
  leadId: string;
  token: string;
  createdAt: string;
  conversationState?: "ACTIVE" | "ARCHIVED" | "CLOSED" | string;
  conversationArchivedAt?: string | null;
  conversationClosedAt?: string | null;
  conversationLastActivityAt?: string | null;
  contactName: string;
  contactEmail: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageFromClient?: boolean;
  property: {
    id: string;
    title: string;
    price: number;
    city: string;
    state: string;
    image?: string | null;
  };
};

type ChatMessage = {
  id: string;
  fromClient: boolean;
  content: string;
  createdAt: string;
  source?: string | null;
};

type ChatLeadInfo = {
  id: string;
  createdAt?: string;
  conversation?: {
    state?: "ACTIVE" | "ARCHIVED" | "CLOSED" | string;
    archivedAt?: string | null;
    closedAt?: string | null;
    lastActivityAt?: string | null;
  } | null;
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
  responsible?: {
    id: string;
    name?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
};

const QUICK_MESSAGES = [
  "Olá! Gostaria de agendar uma visita.",
  "Qual a disponibilidade para visitar?",
  "O imóvel ainda está disponível?",
  "Podemos negociar o valor?",
];

function formatPrice(price: number | null | undefined) {
  if (!price) return "";
  try {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  } catch {
    return String(price);
  }
}

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function UserChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const pollRef = useRef<number | null>(null);
  const pollStopRef = useRef<number | null>(null);

  const markChatAsRead = useCallback((leadId: string) => {
    if (!leadId) return;
    if (typeof window === "undefined") return;
    try {
      const key = `zlw_user_chat_last_read_${leadId}`;
      window.localStorage.setItem(key, new Date().toISOString());
    } catch {
      // ignore
    }
  }, []);

  const leadIdFromUrl = searchParams.get("lead");
  const tokenFromUrl = searchParams.get("token");
  const openChat = searchParams.get("openChat") === "1";
  const openChatPropertyId = searchParams.get("propertyId") || "";
  const openChatDirect = (searchParams.get("direct") || "").toLowerCase() === "1";

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null);
  const [leadInfo, setLeadInfo] = useState<ChatLeadInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const applyConversationState = useCallback((leadId: string, conversation?: ChatLeadInfo["conversation"] | null) => {
    if (!leadId || !conversation) return;

    const patch = {
      conversationState: String(conversation.state || "ACTIVE"),
      conversationArchivedAt: conversation.archivedAt || null,
      conversationClosedAt: conversation.closedAt || null,
      conversationLastActivityAt: conversation.lastActivityAt || null,
    };

    setChats((prev) => prev.map((chat) => (chat.leadId === leadId ? { ...chat, ...patch } : chat)));
    setSelectedChat((prev) => (prev?.leadId === leadId ? { ...prev, ...patch } : prev));
    setLeadInfo((prev) => (prev?.id === leadId ? { ...prev, conversation } : prev));
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch("/api/chats");
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não foi possível carregar suas conversas.");
      }
      const nextChats = Array.isArray(data.chats) ? data.chats : [];
      setChats(nextChats);
      setSelectedChat((current) => {
        if (!current?.leadId) return current;
        return nextChats.find((chat: ChatPreview) => chat.leadId === current.leadId) || current;
      });
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar suas conversas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const createLeadForProperty = useCallback(async () => {
    if (!session) return;
    if (!openChat || !openChatPropertyId) return;

    const s: any = session as any;
    const name = String(s?.user?.name || s?.user?.fullName || "").trim();
    const email = String(s?.user?.email || "").trim();
    if (!name || name.length < 2 || !email) {
      return;
    }

    const payload: any = {
      propertyId: openChatPropertyId,
      name,
      email,
      phone: String(s?.user?.phone || "").trim() || undefined,
      isDirect: openChatDirect,
    };

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return;

    const leadId = String(data?.leadId || "");
    if (!leadId) return;

    router.replace(`/chats?lead=${encodeURIComponent(leadId)}`);
  }, [openChat, openChatDirect, openChatPropertyId, router, session]);

  const fetchChatByToken = useCallback(async (token: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/chat/${token}?t=${Date.now()}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos abrir esta conversa agora.");
      }
      setLeadInfo(data.lead || null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      applyConversationState(String(data?.lead?.id || ""), data?.lead?.conversation || null);
      setShowSuggestions(true);

      const leadId = String(data?.lead?.id || "");
      if (leadId) markChatAsRead(leadId);
    } finally {
      setMessagesLoading(false);
    }
  }, [applyConversationState, markChatAsRead]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    if (openChat && openChatPropertyId) {
      void createLeadForProperty();
    }
    fetchChats();
  }, [createLeadForProperty, fetchChats, openChat, openChatPropertyId, session, status]);

  useEffect(() => {
    if (!session) return;
    if (!leadIdFromUrl) return;
    if (!Array.isArray(chats) || chats.length === 0) return;

    const found = chats.find((c) => c.leadId === leadIdFromUrl);
    if (found) setSelectedChat(found);
  }, [chats, leadIdFromUrl, session]);

  useEffect(() => {
    if (!tokenFromUrl) return;
    if (!selectedChat) {
      void fetchChatByToken(tokenFromUrl);
    }
  }, [fetchChatByToken, selectedChat, tokenFromUrl]);

  useEffect(() => {
    if (!selectedChat?.token) return;
    void fetchChatByToken(selectedChat.token);
  }, [fetchChatByToken, selectedChat?.token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const selectedToken = useMemo(() => {
    return selectedChat?.token || tokenFromUrl || "";
  }, [selectedChat?.token, tokenFromUrl]);

  const waitingAssistantReply = useMemo(() => {
    if (!messages.length) return false;
    const last = messages[messages.length - 1];
    return !!last?.fromClient;
  }, [messages]);

  const fetchMessagesOnly = useCallback(async () => {
    if (!selectedToken) return;
    try {
      const response = await fetch(`/api/chat/${selectedToken}?t=${Date.now()}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) return;

      const next = Array.isArray(data.messages) ? data.messages : [];
      setMessages((prev) => {
        if (!prev.length) return next;
        if (!next.length) return prev;
        if (prev.length !== next.length) return next;
        const prevIds = new Set(prev.map((m) => m.id));
        for (const m of next) {
          if (!prevIds.has(m.id)) return next;
        }
        return prev;
      });

      if (data.lead) {
        setLeadInfo((prev) => ({ ...(prev || data.lead), ...data.lead }));
        applyConversationState(String(data?.lead?.id || ""), data?.lead?.conversation || null);
      }
    } catch {
      // ignore
    }
  }, [applyConversationState, selectedToken]);

  const startShortPolling = useCallback(() => {
    if (typeof window === "undefined") return;
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (pollStopRef.current) window.clearTimeout(pollStopRef.current);

    void fetchMessagesOnly();
    pollRef.current = window.setInterval(() => {
      void fetchMessagesOnly();
    }, 1200);

    pollStopRef.current = window.setTimeout(() => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      pollStopRef.current = null;
    }, 60_000);
  }, [fetchMessagesOnly]);

  useEffect(() => {
    if (!selectedToken) return;

    const id = window.setInterval(() => {
      void fetchMessagesOnly();
    }, 15_000);

    return () => {
      window.clearInterval(id);
    };
  }, [fetchMessagesOnly, selectedToken]);

  useEffect(() => {
    if (!selectedToken || !waitingAssistantReply) return;

    const id = window.setInterval(() => {
      void fetchMessagesOnly();
    }, 2000);

    return () => {
      window.clearInterval(id);
    };
  }, [fetchMessagesOnly, selectedToken, waitingAssistantReply]);

  useEffect(() => {
    if (!leadInfo?.id) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `chat-${leadInfo.id}`;
      const channel = pusher.subscribe(channelName);

      const handler = (data: {
        id: string;
        leadId: string;
        fromClient: boolean;
        content: string;
        createdAt: string;
        source?: string | null;
      }) => {
        if (cancelled) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;

          if (data.fromClient) {
            const tempIndex = prev.findIndex((m) => m.id.startsWith("temp-") && m.content === data.content);
            if (tempIndex !== -1) {
              const clone = [...prev];
              clone[tempIndex] = { ...clone[tempIndex], id: data.id, createdAt: data.createdAt };
              return clone;
            }
          }

          return [
            ...prev,
            {
              id: data.id,
              fromClient: data.fromClient,
              content: data.content,
              createdAt: data.createdAt,
              source: (data as any)?.source ?? null,
            },
          ];
        });
      };

      channel.bind("new-chat-message", handler as any);
      channel.bind("lead-chat-state-changed", (data: {
        state?: string;
        archivedAt?: string | null;
        closedAt?: string | null;
        lastActivityAt?: string | null;
      }) => {
        if (cancelled) return;
        applyConversationState(String(leadInfo.id), {
          state: String(data?.state || "ACTIVE"),
          archivedAt: data?.archivedAt ?? null,
          closedAt: data?.closedAt ?? null,
          lastActivityAt: data?.lastActivityAt ?? null,
        });
      });

      return () => {
        cancelled = true;
        try {
          channel.unbind("new-chat-message", handler as any);
          channel.unbind("lead-chat-state-changed");
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      return;
    }
  }, [applyConversationState, leadInfo?.id]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (pollStopRef.current) window.clearTimeout(pollStopRef.current);
    };
  }, []);

  const handleSend = async () => {
    if (!draft.trim() || !selectedToken || sending) return;
    if (String(leadInfo?.conversation?.state || selectedChat?.conversationState || "ACTIVE") === "CLOSED") return;

    const content = draft.trim();
    setDraft("");

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, fromClient: true, content, createdAt: new Date().toISOString() },
    ]);

    try {
      setSending(true);
      const response = await fetch(`/api/chat/${selectedToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-chat-context": "client" },
        body: JSON.stringify({ content }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos enviar esta mensagem agora.");
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.message.id, createdAt: data.message.createdAt } : m))
      );

      if (data?.conversation) {
        applyConversationState(String(leadInfo?.id || selectedChat?.leadId || ""), data.conversation);
      }

      startShortPolling();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const selectedConversationState = String(leadInfo?.conversation?.state || selectedChat?.conversationState || "ACTIVE");
  const selectedChatIsArchived = selectedConversationState === "ARCHIVED";
  const selectedChatIsClosed = selectedConversationState === "CLOSED";

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!session) {
    const callbackUrl = `/chats${tokenFromUrl ? `?token=${encodeURIComponent(tokenFromUrl)}` : ""}`;
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Suas conversas</h1>
          <p className="text-gray-600 mb-8">Entre para acessar e continuar conversas sobre imóveis.</p>
          <button
            type="button"
            onClick={() => signIn(undefined, { callbackUrl })}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
          >
            Entrar / Criar conta
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Não conseguimos carregar suas conversas</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Conversas</h1>
        <p className="text-gray-600 mt-1">Gerencie suas conversas com corretores e anunciantes.</p>

        <div className="mt-6 h-[calc(100vh-220px)] min-h-[520px] bg-white rounded-xl border border-gray-200 overflow-hidden flex">
          <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col bg-gray-50 ${selectedChat ? "hidden md:flex" : "flex"}`}>
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="text-sm font-semibold text-gray-900">Suas conversas</div>
              <div className="text-xs text-gray-500 mt-1">Clique em uma conversa para abrir</div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-10 text-center">
                  <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">Nenhuma conversa ainda</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat.leadId}
                    type="button"
                    onClick={() => {
                      setSelectedChat(chat);
                      markChatAsRead(chat.leadId);
                      router.replace(`/chats?lead=${encodeURIComponent(chat.leadId)}`);
                    }}
                    className={`w-full p-4 flex gap-3 hover:bg-white transition-colors border-b border-gray-100 text-left ${
                      selectedChat?.leadId === chat.leadId ? "bg-white border-l-4 border-l-teal-500" : ""
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {chat.property.image ? (
                        <Image src={chat.property.image} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-gray-900 text-sm truncate">{chat.property.title}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(chat.lastMessageAt)}</span>
                      </div>
                      {chat.conversationState === "ARCHIVED" && (
                        <p className="text-[10px] text-amber-700">Arquivada</p>
                      )}
                      {chat.conversationState === "CLOSED" && (
                        <p className="text-[10px] text-rose-700">Encerrada</p>
                      )}
                      <p className="text-xs text-gray-600 truncate">
                        {chat.property.city}/{chat.property.state}
                      </p>
                      {chat.lastMessage && (
                        <p className="text-xs text-gray-500 truncate mt-1">{chat.lastMessage}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className={`flex-1 flex flex-col ${selectedChat || tokenFromUrl ? "flex" : "hidden md:flex"}`}>
            {(selectedChat || tokenFromUrl) ? (
              <>
                <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {leadInfo?.property?.title || selectedChat?.property.title || "Conversa"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {leadInfo?.property?.city || selectedChat?.property.city || ""}
                      {(leadInfo?.property?.state || selectedChat?.property.state) ? `/${leadInfo?.property?.state || selectedChat?.property.state}` : ""}
                      {leadInfo?.property?.price || selectedChat?.property.price ? ` • ${formatPrice((leadInfo?.property?.price as any) || selectedChat?.property.price)}` : ""}
                    </div>
                    {selectedChatIsArchived && (
                      <p className="text-[10px] text-amber-700 mt-0.5">Conversa arquivada</p>
                    )}
                    {selectedChatIsClosed && (
                      <p className="text-[10px] text-rose-700 mt-0.5">Conversa encerrada</p>
                    )}
                  </div>

                  {leadInfo?.property?.id && (
                    <Link
                      href={`/property/${leadInfo.property.id}`}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                    >
                      Ver imóvel
                    </Link>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  {selectedChatIsArchived && (
                    <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900">
                      Esta conversa foi arquivada por inatividade. Se você enviar uma nova mensagem, ela será reativada automaticamente.
                    </div>
                  )}
                  {selectedChatIsClosed && (
                    <div className="mb-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-900">
                      Esta conversa foi encerrada. O histórico continua disponível, mas novas mensagens estão desativadas.
                    </div>
                  )}
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-600">Inicie a conversa</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs">
                        Selecione uma sugestão abaixo ou escreva sua mensagem.
                      </p>

                      {showSuggestions && (
                        <div className="mt-6 w-full max-w-sm space-y-2">
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Sugestões</p>
                          {QUICK_MESSAGES.map((msg, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setDraft(msg);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs bg-white hover:bg-teal-50 border border-gray-200 hover:border-teal-200 rounded-lg transition-colors text-gray-700 hover:text-teal-700"
                            >
                              {msg}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.fromClient ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              msg.fromClient
                                ? "bg-teal-600 text-white"
                                : "bg-white text-gray-900 border border-gray-200"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <div
                              className={`flex items-center gap-1 mt-1 text-[10px] ${
                                msg.fromClient ? "text-teal-200 justify-end" : "text-gray-400"
                              }`}
                            >
                              {msg.fromClient ? (
                                <span>Você</span>
                              ) : (
                                <span
                                  className={`px-1.5 py-0.5 rounded-md font-medium ${
                                    String((msg as any).source) === "AUTO_REPLY_AI"
                                      ? "bg-violet-100 text-violet-700"
                                      : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {String((msg as any).source) === "AUTO_REPLY_AI" ? "Assistente" : "Corretor(a)"}
                                </span>
                              )}
                              <span>·</span>
                              <span>{formatTime(msg.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-white">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSend();
                    }}
                    className="flex items-center gap-3"
                  >
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={selectedChatIsClosed ? "Conversa encerrada" : "Digite sua mensagem..."}
                      className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                      disabled={sending || !selectedToken || selectedChatIsClosed}
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending || !selectedToken || selectedChatIsClosed}
                      className="p-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-full transition-colors flex-shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Suas conversas</h3>
                  <p className="text-sm text-gray-500 max-w-xs">Selecione uma conversa à esquerda para visualizar mensagens</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
