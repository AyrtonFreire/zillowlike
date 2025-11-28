"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Search,
  Phone,
  MapPin,
  Clock,
  CheckCheck,
  Check,
  MoreVertical,
  ExternalLink,
  Home,
  User,
  ChevronLeft,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

interface ChatPreview {
  leadId: string;
  clientChatToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  daysUntilArchive?: number | null;
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
  senderType: "CLIENT" | "REALTOR" | "OWNER";
  createdAt: string;
  read: boolean;
}

export default function BrokerChatsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const leadIdFromUrl = searchParams.get("lead");
  const userId = (session?.user as any)?.id || "";

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all chats
  useEffect(() => {
    if (!userId) return;
    fetchChats();
  }, [userId]);

  // Selecionar chat automaticamente se vier lead na URL
  useEffect(() => {
    if (leadIdFromUrl && chats.length > 0 && !selectedChat) {
      const chatFromUrl = chats.find(c => c.leadId === leadIdFromUrl);
      if (chatFromUrl) {
        setSelectedChat(chatFromUrl);
      }
    }
  }, [leadIdFromUrl, chats, selectedChat]);

  // Fetch messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.leadId);
    }
  }, [selectedChat]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages
  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(() => {
      fetchMessages(selectedChat.leadId, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  const fetchChats = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch("/api/broker/chats");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível carregar as conversas.");
      }

      setChats(Array.isArray(data.chats) ? data.chats : []);
    } catch (err: any) {
      console.error("Error fetching chats:", err);
      setError(err?.message || "Erro ao carregar conversas.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (leadId: string, silent = false) => {
    try {
      if (!silent) setMessagesLoading(true);
      const response = await fetch(`/api/leads/${leadId}/client-messages`);
      const data = await response.json();

      if (response.ok && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;

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
        setNewMessage("");
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

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

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      chat.clientName.toLowerCase().includes(q) ||
      chat.property.title.toLowerCase().includes(q) ||
      chat.property.city.toLowerCase().includes(q)
    );
  });

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = formatMessageDate(msg.createdAt);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  if (loading) {
    return (
      <DashboardLayout
        title="Conversas"
        description="Gerencie suas conversas com clientes."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Corretor", href: "/broker/dashboard" },
          { label: "Conversas" },
        ]}
      >
        <CenteredSpinner message="Carregando conversas..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Conversas"
      description="Gerencie suas conversas com clientes."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Conversas" },
      ]}
    >
      <div className="h-[calc(100vh-200px)] min-h-[500px] bg-white rounded-xl border border-gray-200 overflow-hidden flex">
        {/* Lista de conversas - Sidebar */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-gray-50 ${
            selectedChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header da lista */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
              />
            </div>
          </div>

          {/* Lista de chats */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.leadId}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full p-4 flex gap-3 hover:bg-white transition-colors border-b border-gray-100 text-left ${
                    selectedChat?.leadId === chat.leadId ? "bg-white border-l-4 border-l-teal-500" : ""
                  }`}
                >
                  {/* Avatar/Thumbnail do imóvel */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                    {chat.property.image ? (
                      <Image src={chat.property.image} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    {/* Badge de não lidas */}
                    {chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">
                          {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm truncate">
                        {chat.clientName}
                      </span>
                      {chat.lastMessageAt && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {formatTime(chat.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate mb-1">
                      {chat.property.title}
                    </p>
                    {chat.lastMessage && (
                      <p className={`text-xs truncate ${
                        chat.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                      }`}>
                        {chat.lastMessage}
                      </p>
                    )}
                    {/* Indicador de expiração próxima */}
                    {chat.daysUntilArchive !== null && chat.daysUntilArchive !== undefined && chat.daysUntilArchive <= 3 && (
                      <p className="text-[10px] text-amber-600 mt-1">
                        ⏳ {chat.daysUntilArchive === 0 ? "Expira hoje" : `Expira em ${chat.daysUntilArchive} dia${chat.daysUntilArchive > 1 ? "s" : ""}`}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Aviso de política de armazenamento */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              💡 Conversas sem atividade por 10 dias são arquivadas automaticamente para manter seu painel organizado.
            </p>
          </div>
        </div>

        {/* Área do chat */}
        <div className={`flex-1 flex flex-col ${selectedChat ? "flex" : "hidden md:flex"}`}>
          {selectedChat ? (
            <>
              {/* Header do chat */}
              <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
                {/* Botão voltar (mobile) */}
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>

                {/* Avatar */}
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-teal-100 flex-shrink-0">
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                </div>

                {/* Info do contato */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {selectedChat.clientName}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedChat.property.title} • {formatPrice(selectedChat.property.price)}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1">
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

              {/* Card do imóvel (colapsado) */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <Link
                  href={`/property/${selectedChat.property.id}`}
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
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {selectedChat.property.title}
                    </p>
                    <p className="text-teal-600 font-bold text-sm">
                      {formatPrice(selectedChat.property.price)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedChat.property.city}/{selectedChat.property.state}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </Link>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Comece a conversa enviando uma mensagem
                      </p>
                    </div>
                  </div>
                ) : (
                  groupedMessages.map((group, groupIdx) => (
                    <div key={groupIdx}>
                      {/* Separador de data */}
                      <div className="flex items-center justify-center mb-4">
                        <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-500 shadow-sm border border-gray-100">
                          {group.date}
                        </span>
                      </div>

                      {/* Mensagens do grupo */}
                      {group.messages.map((msg) => {
                        const isMe = msg.senderType !== "CLIENT";
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
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 ${
                                  isMe ? "text-teal-200" : "text-gray-400"
                                }`}
                              >
                                <span className="text-[10px]">
                                  {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {isMe && (
                                  msg.read ? (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )
                                )}
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

              {/* Input de mensagem */}
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
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-full transition-colors flex-shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Estado vazio - nenhum chat selecionado */
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
    </DashboardLayout>
  );
}
