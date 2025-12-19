"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { MessageCircle, Send, ChevronLeft, Home } from "lucide-react";
import { ModernNavbar } from "@/components/modern";

type ChatPreview = {
  leadId: string;
  token: string;
  createdAt: string;
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
};

type ChatLeadInfo = {
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

  const leadIdFromUrl = searchParams.get("lead");
  const tokenFromUrl = searchParams.get("token");

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

  const fetchChats = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch("/api/chats");
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não foi possível carregar suas conversas.");
      }
      setChats(Array.isArray(data.chats) ? data.chats : []);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar suas conversas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChatByToken = useCallback(async (token: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/chat/${token}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos abrir esta conversa agora.");
      }
      setLeadInfo(data.lead || null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setShowSuggestions(true);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    fetchChats();
  }, [fetchChats, session, status]);

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

  const handleSend = async () => {
    if (!draft.trim() || !selectedToken || sending) return;

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
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

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
                            <div className={`mt-1 text-[10px] ${msg.fromClient ? "text-teal-200 text-right" : "text-gray-400"}`}>
                              {formatTime(msg.createdAt)}
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
                      placeholder="Digite sua mensagem..."
                      className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                      disabled={sending || !selectedToken}
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending || !selectedToken}
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
