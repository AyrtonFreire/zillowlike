"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Send,
  Search,
  Phone,
  CheckCheck,
  Check,
  ExternalLink,
  Home,
  User,
  ChevronLeft,
} from "lucide-react";
import { buildPropertyPath } from "@/lib/slug";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import { getPusherClient } from "@/lib/pusher-client";

interface ChatPreview {
  leadId: string;
  clientChatToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageFromClient?: boolean;
  unreadCount: number;
  daysUntilArchive?: number | null;
  conversationState?: "ACTIVE" | "ARCHIVED" | "CLOSED" | string;
  conversationArchivedAt?: string | null;
  conversationClosedAt?: string | null;
  conversationLastActivityAt?: string | null;
  property: {
    id: string;
    title: string;
    price: number;
    city: string;
    state: string;
    image?: string;
  };
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderType: "CLIENT" | "REALTOR" | "OWNER" | "ASSISTANT";
  source?: string | null;
  createdAt: string;
  read: boolean;
}

interface ConversationSnapshot {
  state?: "ACTIVE" | "ARCHIVED" | "CLOSED" | string;
  archivedAt?: string | null;
  closedAt?: string | null;
  lastActivityAt?: string | null;
}

export default function BrokerChatsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const leadIdFromUrl = searchParams.get("lead");
  const draftFromUrl = searchParams.get("draft");
  const userId = (session?.user as any)?.id || "";

  const STORAGE_PREFIX = "zlw_broker_chat_last_read_";

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const chatsEtagRef = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didApplyDraftRef = useRef<string | null>(null);

  const applyConversationState = useCallback((leadId: string, conversation?: ConversationSnapshot | null) => {
    if (!leadId || !conversation) return;

    const patch = {
      conversationState: String(conversation.state || "ACTIVE"),
      conversationArchivedAt: conversation.archivedAt || null,
      conversationClosedAt: conversation.closedAt || null,
      conversationLastActivityAt: conversation.lastActivityAt || null,
    };

    setChats((prev) => prev.map((chat) => (chat.leadId === leadId ? { ...chat, ...patch } : chat)));
    setSelectedChat((prev) => (prev?.leadId === leadId ? { ...prev, ...patch } : prev));
  }, []);

  const fetchChats = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setError(null);
        setLoading(true);
      }

      const headers: Record<string, string> = {};
      if (chatsEtagRef.current) headers["If-None-Match"] = chatsEtagRef.current;

      const response = await fetch("/api/broker/chats", { headers });
      if (response.status === 304) {
        return;
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível carregar as conversas.");
      }

      const nextEtag = response.headers.get("etag");
      if (nextEtag) chatsEtagRef.current = nextEtag;

      const nextChats = Array.isArray(data.chats) ? data.chats : [];
      setChats(nextChats);
      setSelectedChat((current) => {
        if (!current?.leadId) return current;
        return nextChats.find((chat: ChatPreview) => chat.leadId === current.leadId) || current;
      });
    } catch (err: any) {
      console.error("Error fetching chats:", err);
      if (!silent) setError(err?.message || "Erro ao carregar conversas.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (leadId: string, silent = false) => {
    try {
      if (!silent) setMessagesLoading(true);
      const response = await fetch(`/api/leads/${leadId}/client-messages`, { cache: "no-store" });
      const data = await response.json();

      if (response.ok && data.messages) {
        setMessages(data.messages);
        applyConversationState(leadId, data.conversation || null);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, [applyConversationState]);

  // Fetch all chats
  useEffect(() => {
    if (!userId) return;
    fetchChats();
  }, [fetchChats, userId]);

  // Selecionar chat automaticamente se vier lead na URL
  useEffect(() => {
    if (leadIdFromUrl && chats.length > 0 && !selectedChat) {
      const chatFromUrl = chats.find(c => c.leadId === leadIdFromUrl);
      if (chatFromUrl) {
        setSelectedChat(chatFromUrl);
      }
    }
  }, [leadIdFromUrl, chats, selectedChat]);

  useEffect(() => {
    if (!draftFromUrl) {
      didApplyDraftRef.current = null;
      return;
    }
    if (!selectedChat?.leadId) return;
    if (leadIdFromUrl && selectedChat.leadId !== leadIdFromUrl) return;

    if (didApplyDraftRef.current === draftFromUrl) return;
    didApplyDraftRef.current = draftFromUrl;

    setNewMessage(draftFromUrl);
    setTimeout(() => inputRef.current?.focus(), 0);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("draft");
      const next = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}${url.hash}`;
      window.history.replaceState(window.history.state, "", next);
    } catch {
      // ignore
    }
  }, [draftFromUrl, leadIdFromUrl, selectedChat?.leadId]);

  const markChatAsRead = useCallback((leadId: string) => {
    if (!leadId) return;
    if (typeof window === "undefined") return;

    setChats((prev) => prev.map((c) => (c.leadId === leadId ? { ...c, unreadCount: 0 } : c)));
    try {
      const key = `${STORAGE_PREFIX}${leadId}`;
      window.localStorage.setItem(key, new Date().toISOString());
    } catch {
      // ignore
    }

    try {
      void fetch("/api/broker/chats/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
    } catch {
      // ignore
    }
  }, [STORAGE_PREFIX]);

  // Fetch messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.leadId);
      markChatAsRead(selectedChat.leadId);
    }
  }, [fetchMessages, markChatAsRead, selectedChat]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages
  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(() => {
      fetchMessages(selectedChat.leadId, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages, selectedChat]);

  useEffect(() => {
    if (!selectedChat?.leadId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `chat-${selectedChat.leadId}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        fetchMessages(selectedChat.leadId, true);
        fetchChats(true);
      };

      channel.bind("new-chat-message", handler as any);
      channel.bind("lead-chat-state-changed", handler as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("new-chat-message", handler as any);
          channel.unbind("lead-chat-state-changed", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      return;
    }
  }, [fetchChats, fetchMessages, selectedChat?.leadId]);

  const waitingAssistantReply = useMemo(() => {
    if (!messages.length) return false;
    const last = messages[messages.length - 1];
    return last.senderType === "CLIENT";
  }, [messages]);

  useEffect(() => {
    if (!selectedChat?.leadId || !waitingAssistantReply) return;

    const interval = window.setInterval(() => {
      void fetchMessages(selectedChat.leadId, true);
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchMessages, selectedChat?.leadId, waitingAssistantReply]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${userId}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        fetchChats(true);
      };

      channel.bind("assistant:item_updated", handler as any);
      channel.bind("assistant:items_recalculated", handler as any);
      channel.bind("new-chat-message", handler as any);
      channel.bind("lead-chat-state-changed", handler as any);
      channel.bind("lead-chat-read-receipt", handler as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("assistant:item_updated", handler as any);
          channel.unbind("assistant:items_recalculated", handler as any);
          channel.unbind("new-chat-message", handler as any);
          channel.unbind("lead-chat-state-changed", handler as any);
          channel.unbind("lead-chat-read-receipt", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      return;
    }
  }, [fetchChats, userId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;
    if (String(selectedChat.conversationState || "ACTIVE") === "CLOSED") return;

    try {
      setSending(true);
      const response = await fetch(`/api/leads/${selectedChat.leadId}/client-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        applyConversationState(selectedChat.leadId, data.conversation || null);
        setNewMessage("");
        inputRef.current?.focus();
        fetchChats(true);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const reopenConversation = useCallback(async () => {
    if (!selectedChat?.leadId) return;

    try {
      const response = await fetch(`/api/leads/${selectedChat.leadId}/conversation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reopen" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não foi possível reabrir a conversa.");
      }

      applyConversationState(selectedChat.leadId, data.conversation || null);
      await fetchChats(true);
      await fetchMessages(selectedChat.leadId, true);
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err?.message || "Não foi possível reabrir a conversa.");
    }
  }, [applyConversationState, fetchChats, fetchMessages, selectedChat]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Ontem";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("pt-BR", { weekday: "short" });
    } else {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const selectedConversationState = String(selectedChat?.conversationState || "ACTIVE");
  const selectedChatIsArchived = selectedConversationState === "ARCHIVED";
  const selectedChatIsClosed = selectedConversationState === "CLOSED";

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.clientName.toLowerCase().includes(query) ||
        chat.property.title.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  const displayChats = filteredChats.map((chat) => {
    let unreadCount = Number(chat.unreadCount || 0);
    try {
      const key = `${STORAGE_PREFIX}${chat.leadId}`;
      const lastRead = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (lastRead && chat.lastMessageAt && new Date(lastRead) >= new Date(chat.lastMessageAt)) {
        unreadCount = 0;
      }
    } catch {
      // ignore
    }
    return { ...chat, unreadCount };
  });

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    for (const msg of messages) {
      const groupDate = formatMessageDate(msg.createdAt);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.date !== groupDate) {
        groups.push({ date: groupDate, messages: [msg] });
      } else {
        lastGroup.messages.push(msg);
      }
    }
    return groups;
  }, [messages]);

  if (loading) {
    return <CenteredSpinner message="Carregando conversas..." />;
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden relative">
      {error && (
        <div className="absolute top-4 left-1/2 z-50 w-[min(640px,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
          {error}
        </div>
      )}

      <div className={`fixed inset-0 bg-black/20 z-20 md:hidden transition-opacity ${selectedChat ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setSelectedChat(null)} />

      <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${selectedChat ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {displayChats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
              </p>
            </div>
          ) : (
            displayChats.map((chat) => (
              <button
                key={chat.leadId}
                type="button"
                onClick={() => {
                  setSelectedChat(chat);
                  markChatAsRead(chat.leadId);
                }}
                className={`w-full p-4 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${
                  selectedChat?.leadId === chat.leadId ? "bg-teal-50/50" : "bg-white"
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
                  {chat.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-semibold flex items-center justify-center">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm truncate">{chat.clientName}</span>
                    {chat.lastMessageAt && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(chat.lastMessageAt)}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 truncate mb-1">{chat.property.title}</p>
                  {chat.conversationState === "ARCHIVED" && (
                    <p className="text-[10px] text-amber-700 mb-1">Arquivada</p>
                  )}
                  {chat.conversationState === "CLOSED" && (
                    <p className="text-[10px] text-rose-700 mb-1">Encerrada</p>
                  )}
                  {chat.lastMessage && (
                    <p className={`text-xs truncate ${chat.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                      {chat.lastMessage}
                    </p>
                  )}
                  {chat.daysUntilArchive !== null && chat.daysUntilArchive !== undefined && chat.daysUntilArchive <= 3 && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      {chat.daysUntilArchive <= 0 ? "Arquivamento iminente" : `Arquiva em ${chat.daysUntilArchive} dia(s)`}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col min-w-0 ${selectedChat ? "flex" : "hidden md:flex"}`}>
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-teal-100 flex-shrink-0">
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{selectedChat.clientName}</h3>
                <p className="text-xs text-gray-500 truncate">
                  {selectedChat.property.title} • {formatPrice(selectedChat.property.price)}
                </p>
                {selectedChatIsArchived && (
                  <p className="text-[10px] text-amber-700 mt-0.5">Conversa arquivada</p>
                )}
                {selectedChatIsClosed && (
                  <p className="text-[10px] text-rose-700 mt-0.5">Conversa encerrada</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {selectedChatIsArchived && (
                  <button
                    type="button"
                    onClick={() => void reopenConversation()}
                    className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                  >
                    Reabrir
                  </button>
                )}
                {selectedChat.clientPhone && (
                  <a
                    href={`tel:${selectedChat.clientPhone}`}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Ligar"
                  >
                    <Phone className="w-5 h-5 text-gray-600" />
                  </a>
                )}
                <Link
                  href={`/broker/leads/${selectedChat.leadId}`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Ver lead"
                >
                  <ExternalLink className="w-5 h-5 text-gray-600" />
                </Link>
              </div>
            </div>

            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <Link
                href={buildPropertyPath(selectedChat.property.id, selectedChat.property.title)}
                className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                  {selectedChat.property.image ? (
                    <Image src={selectedChat.property.image} alt="" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{selectedChat.property.title}</p>
                  <p className="text-teal-600 font-bold text-sm">{formatPrice(selectedChat.property.price)}</p>
                  <p className="text-xs text-gray-500">{selectedChat.property.city}/{selectedChat.property.state}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {selectedChatIsArchived && (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900">
                  Esta conversa foi arquivada por inatividade. Você pode reabrir agora ou simplesmente enviar uma nova mensagem.
                </div>
              )}
              {selectedChatIsClosed && (
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-900">
                  Esta conversa foi encerrada. O histórico continua disponível, mas novas mensagens estão desativadas.
                </div>
              )}
              {messagesLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-gray-400 mt-1">Comece a conversa enviando uma mensagem</p>
                  </div>
                </div>
              ) : (
                groupedMessages.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    <div className="flex items-center justify-center mb-4">
                      <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-500 shadow-sm border border-gray-100">
                        {group.date}
                      </span>
                    </div>

                    {group.messages.map((msg) => {
                      const isMe = msg.senderType !== "CLIENT";
                      const isAssistant = msg.senderType === "ASSISTANT" || String(msg.source) === "AUTO_REPLY_AI";
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              isMe
                                ? "bg-teal-600 text-white rounded-br-md"
                                : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-teal-200" : "text-gray-400"}`}>
                              {msg.senderType !== "CLIENT" && (
                                <span
                                  className={`mr-auto px-1.5 py-0.5 rounded-md font-medium text-[10px] ${
                                    isAssistant ? "bg-violet-100 text-violet-700" : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {isAssistant ? "Assistente" : "Corretor(a)"}
                                </span>
                              )}
                              <span className="text-[10px]">
                                {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isMe && (msg.read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedChatIsClosed ? "Conversa encerrada" : "Digite sua mensagem..."}
                  className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                  disabled={sending || selectedChatIsClosed}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending || selectedChatIsClosed}
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
              <p className="text-sm text-gray-500 max-w-xs">
                Selecione uma conversa à esquerda para visualizar e responder mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
