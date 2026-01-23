"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Check, CheckCheck, MessageCircle, Search, Send, User, ChevronLeft } from "lucide-react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { getPusherClient } from "@/lib/pusher-client";
import { PUSHER_EVENTS } from "@/lib/pusher-server";

interface ChatUser {
  id: string;
  name: string | null;
  email?: string | null;
  role?: string | null;
  image?: string | null;
}

interface TeamChatMessage {
  id: string;
  threadId: string;
  content: string;
  senderId: string;
  senderRole: string;
  sender?: ChatUser | null;
  createdAt: string | null;
}

interface TeamChatThread {
  id: string;
  teamId: string;
  owner: ChatUser | null;
  realtor: ChatUser | null;
  lastMessage: TeamChatMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  updatedAt: string | null;
}

interface TeamChatTeam {
  id: string;
  name: string;
  ownerId: string;
}

interface TeamChatReceipt {
  userId: string;
  lastDeliveredAt: string | null;
  lastReadAt: string | null;
}

function initials(value: string) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  try {
    if (diffDays === 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return date.toLocaleDateString("pt-BR", { weekday: "short" });
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return date.toISOString();
  }
}

function renderMessageContent(content: string) {
  const parts = String(content || "").split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, idx) => {
    if (part.match(/^https?:\/\//)) {
      return (
        <a
          key={`link-${idx}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline break-all"
        >
          {part}
        </a>
      );
    }
    return (
      <span key={`text-${idx}`} className="whitespace-pre-wrap break-words">
        {part}
      </span>
    );
  });
}

export default function AgencyTeamChatPanel() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const role = (session as any)?.user?.role || (session as any)?.role || null;
  const userId = (session as any)?.user?.id || (session as any)?.userId || "";

  const threadIdFromUrl = searchParams?.get("thread") || null;
  const realtorIdFromUrl = searchParams?.get("realtor") || null;
  const textFromUrl = searchParams?.get("text") || null;

  const [team, setTeam] = useState<TeamChatTeam | null>(null);
  const [threads, setThreads] = useState<TeamChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const selectedThreadIdRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [counterpartReceipt, setCounterpartReceipt] = useState<TeamChatReceipt | null>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const didPrefillDraftRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread = useMemo(() => {
    return threads.find((t) => String(t.id) === String(selectedThreadId)) || null;
  }, [threads, selectedThreadId]);

  const threadIdsKey = useMemo(() => {
    return threads
      .map((t) => String(t.id))
      .sort()
      .join("|");
  }, [threads]);

  const counterpart = useMemo(() => {
    if (!activeThread) return null;
    if (role === "REALTOR") return activeThread.owner;
    return activeThread.realtor;
  }, [activeThread, role]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.trim().toLowerCase();
    return threads.filter((t) => {
      const person = role === "REALTOR" ? t.owner : t.realtor;
      const name = (person?.name || "").toLowerCase();
      const email = (person?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [threads, searchQuery, role]);

  const fetchThreads = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const response = await fetch("/api/team-chat/threads");
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não foi possível carregar o chat do time.");
      }

      setTeam(data.team || null);
      const list: TeamChatThread[] = Array.isArray(data.threads) ? data.threads : [];
      setThreads(list);

      setSelectedThreadId((prev) => {
        if (!list.length) return null;
        if (prev && list.some((t) => String(t.id) === String(prev))) return prev;
        return String(list[0].id);
      });

      if (!list.length) {
        setMessages([]);
      }
    } catch (err: any) {
      console.error("Error loading agency team chat threads:", err);
      if (!silent) setError(err?.message || "Não foi possível carregar o chat do time.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const markThreadRead = useCallback(async (threadId: string) => {
    if (!threadId) return;
    try {
      await fetch(`/api/team-chat/threads/${threadId}/read`, { method: "POST" });
    } catch {
      // ignore
    }
  }, []);

  const markThreadDelivered = useCallback(async (threadId: string) => {
    if (!threadId) return;
    try {
      await fetch(`/api/team-chat/threads/${threadId}/delivered`, { method: "POST" });
    } catch {
      // ignore
    }
  }, []);

  const fetchMessages = useCallback(async (threadId: string, silent = false) => {
    if (!threadId) return;

    try {
      if (!silent) {
        setMessagesLoading(true);
        setMessagesError(null);
      }

      const response = await fetch(`/api/team-chat/threads/${threadId}?limit=100`);
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não foi possível carregar a conversa.");
      }

      const list: TeamChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
      if (selectedThreadIdRef.current === threadId) {
        setCounterpartReceipt((data?.thread?.counterpartReceipt as TeamChatReceipt | null) || null);
        setMessages(list);
        await markThreadDelivered(threadId);
        setTimeout(() => {
          if (selectedThreadIdRef.current === threadId) {
            void markThreadRead(threadId);
          }
        }, 700);
        setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)));
      }
    } catch (err: any) {
      console.error("Error loading agency team chat messages:", err);
      if (!silent && selectedThreadIdRef.current === threadId) {
        setMessagesError(err?.message || "Não foi possível carregar a conversa.");
      }
    } finally {
      if (!silent && selectedThreadIdRef.current === threadId) {
        setMessagesLoading(false);
      }
    }
  }, [markThreadRead, markThreadDelivered]);

  const statusForMessage = useCallback(
    (message: TeamChatMessage) => {
      if (!message?.createdAt) return "sent" as const;

      const deliveredAt = counterpartReceipt?.lastDeliveredAt ? new Date(counterpartReceipt.lastDeliveredAt) : null;
      const readAt = counterpartReceipt?.lastReadAt ? new Date(counterpartReceipt.lastReadAt) : null;
      const msgAt = new Date(message.createdAt);
      if (Number.isNaN(msgAt.getTime())) return "sent" as const;

      if (readAt && !Number.isNaN(readAt.getTime()) && readAt >= msgAt) return "read" as const;
      if (deliveredAt && !Number.isNaN(deliveredAt.getTime()) && deliveredAt >= msgAt) return "delivered" as const;
      return "sent" as const;
    },
    [counterpartReceipt]
  );

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchThreads();
  }, [fetchThreads, status]);

  useEffect(() => {
    if (!threadIdFromUrl) return;
    if (!threads.length) return;
    if (!threads.some((t) => String(t.id) === String(threadIdFromUrl))) return;
    setSelectedThreadId(String(threadIdFromUrl));
  }, [threadIdFromUrl, threads]);

  useEffect(() => {
    if (!realtorIdFromUrl) return;
    if (threadIdFromUrl) return;
    if (!threads.length) return;

    const target = threads.find((t) => String(t.realtor?.id || "") === String(realtorIdFromUrl)) || null;
    if (!target) return;
    setSelectedThreadId(String(target.id));
  }, [realtorIdFromUrl, threadIdFromUrl, threads]);

  useEffect(() => {
    if (!textFromUrl) return;
    if (!selectedThreadId) return;
    if (didPrefillDraftRef.current) return;

    setDraft((prev) => {
      if (String(prev || "").trim().length > 0) return prev;
      didPrefillDraftRef.current = true;
      return String(textFromUrl);
    });
  }, [textFromUrl, selectedThreadId]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(() => fetchThreads(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchThreads, status]);

  useEffect(() => {
    if (!selectedThreadId) {
      selectedThreadIdRef.current = null;
      return;
    }

    selectedThreadIdRef.current = selectedThreadId;
    fetchMessages(selectedThreadId);
  }, [selectedThreadId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedThreadId]);

  useEffect(() => {
    if (!threadIdsKey || !userId) return;

    const pusher = getPusherClient();
    const threadIds = threadIdsKey.split("|").filter(Boolean);

    const handler = (payload: { threadId: string; message: TeamChatMessage }) => {
      if (!payload?.threadId || !payload?.message) return;
      const incoming = payload.message;

      setThreads((prev) =>
        prev.map((thread) => {
          if (String(thread.id) !== String(payload.threadId)) return thread;
          const isOwn = String(incoming.senderId) === String(userId);
          const shouldIncrement = !isOwn && String(payload.threadId) !== String(selectedThreadIdRef.current);
          return {
            ...thread,
            lastMessage: incoming,
            lastMessageAt: incoming.createdAt,
            updatedAt: incoming.createdAt || thread.updatedAt,
            unreadCount: shouldIncrement ? (thread.unreadCount || 0) + 1 : isOwn ? 0 : thread.unreadCount,
          };
        })
      );

      if (String(payload.threadId) === String(selectedThreadIdRef.current)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(incoming.id))) return prev;
          return [...prev, incoming];
        });
        markThreadRead(payload.threadId);
      }
    };

    const receiptHandler = (payload: { threadId: string; userId: string; lastDeliveredAt: string | null; lastReadAt: string | null }) => {
      if (!payload?.threadId || !payload?.userId) return;
      if (String(payload.userId) === String(userId)) return;
      if (String(selectedThreadIdRef.current) !== String(payload.threadId)) return;
      setCounterpartReceipt({
        userId: String(payload.userId),
        lastDeliveredAt: payload.lastDeliveredAt ?? null,
        lastReadAt: payload.lastReadAt ?? null,
      });
    };

    threadIds.forEach((threadId) => {
      const channelName = `private-team-chat-${threadId}`;
      const channel = pusher.subscribe(channelName);
      channel.bind(PUSHER_EVENTS.TEAM_CHAT_MESSAGE, handler as any);
      channel.bind(PUSHER_EVENTS.TEAM_CHAT_RECEIPT, receiptHandler as any);
    });

    return () => {
      threadIds.forEach((threadId) => {
        try {
          const channelName = `private-team-chat-${threadId}`;
          const channel = pusher.channel(channelName);
          channel?.unbind(PUSHER_EVENTS.TEAM_CHAT_MESSAGE, handler as any);
          channel?.unbind(PUSHER_EVENTS.TEAM_CHAT_RECEIPT, receiptHandler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      });
    };
  }, [threadIdsKey, userId, markThreadRead]);

  const handleSelectThread = (threadId: string) => {
    selectedThreadIdRef.current = threadId;
    setSelectedThreadId(threadId);
    setMessages([]);
    setMessagesError(null);
  };

  const handleSend = async () => {
    if (!activeThread?.id || !draft.trim() || sending) return;
    const content = draft.trim();
    setDraft("");

    const tempId = `temp-${Date.now()}`;
    const tempMessage: TeamChatMessage = {
      id: tempId,
      threadId: activeThread.id,
      content,
      senderId: String(userId || ""),
      senderRole: String(role || ""),
      sender: session?.user
        ? {
            id: String((session.user as any).id || ""),
            name: ((session.user as any).name as any) || null,
            role: ((session.user as any).role as any) || null,
            image: ((session.user as any).image as any) || null,
          }
        : null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setSending(true);

    try {
      const response = await fetch(`/api/team-chat/threads/${activeThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não foi possível enviar a mensagem.");
      }

      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, ...data.message } : m)));
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id
            ? {
                ...t,
                lastMessage: data.message,
                lastMessageAt: data.message?.createdAt || new Date().toISOString(),
                unreadCount: 0,
              }
            : t
        )
      );
    } catch (err: any) {
      console.error("Error sending agency team chat message:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert(err?.message || "Não foi possível enviar esta mensagem agora.");
    } finally {
      setSending(false);
    }
  };

  const renderThreadName = (thread: TeamChatThread) => {
    const person = role === "REALTOR" ? thread.owner : thread.realtor;
    return person?.name || person?.email || "Contato";
  };

  const renderThreadSub = (thread: TeamChatThread) => {
    if (thread.lastMessage?.content) return thread.lastMessage.content;
    return "Nenhuma mensagem ainda";
  };

  const renderAvatar = (thread: TeamChatThread) => {
    const person = role === "REALTOR" ? thread.owner : thread.realtor;
    const name = person?.name || person?.email || "";

    if (person?.image) {
      return (
        <Image
          src={person.image}
          alt={name || "Avatar"}
          width={48}
          height={48}
          className="w-12 h-12 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
        <span className="text-xs font-bold text-teal-700">{initials(name) || "TC"}</span>
      </div>
    );
  };

  if (status === "loading") {
    return (
      <div className="py-12">
        <CenteredSpinner message="Carregando sessão..." />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <EmptyState title="Você precisa entrar" description="Faça login para ver o chat do time." />;
  }

  if (role !== "AGENCY" && role !== "ADMIN") {
    return <EmptyState title="Acesso negado" description="Este chat é exclusivo para agência." />;
  }

  if (loading) {
    return <CenteredSpinner message="Carregando conversas..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Não conseguimos carregar o chat do time"
        description={error}
        action={
          <button
            type="button"
            onClick={() => fetchThreads()}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-neutral-900 text-white hover:bg-black"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  if (!team || threads.length === 0) {
    return (
      <EmptyState
        title="Nenhum corretor no time"
        description="Assim que você adicionar corretores ao time, eles aparecerão aqui para conversar."
      />
    );
  }

  return (
    <div className="min-h-[520px] bg-white rounded-xl border border-gray-200 overflow-hidden flex min-w-0 w-full max-w-full">
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-gray-50 ${
          selectedThreadId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar corretores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">{searchQuery ? "Nenhum corretor encontrado" : "Nenhum corretor ainda"}</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isActive = String(thread.id) === String(selectedThreadId);
              const lastTime = thread.lastMessageAt || thread.updatedAt;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full p-4 flex gap-3 hover:bg-white transition-colors border-b border-gray-100 text-left ${
                    isActive ? "bg-white border-l-4 border-l-teal-500" : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {renderAvatar(thread)}
                    {thread.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">{thread.unreadCount > 9 ? "9+" : thread.unreadCount}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm truncate">{renderThreadName(thread)}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(lastTime)}</span>
                    </div>
                    <p
                      className={`text-xs truncate ${
                        thread.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                      }`}
                    >
                      {renderThreadSub(thread)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col min-w-0 ${selectedThreadId ? "flex" : "hidden md:flex"}`}>
        {activeThread ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedThreadId(null)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-teal-100 flex-shrink-0">
                {counterpart?.image ? (
                  <Image src={counterpart.image} alt="" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-700" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{counterpart?.name || counterpart?.email || ""}</h3>
                <p className="text-xs text-gray-500 truncate">{team?.name || "Time"}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
              {messagesLoading && messages.length === 0 ? (
                <CenteredSpinner message="Carregando conversa..." />
              ) : messagesError ? (
                <EmptyState title="Não foi possível carregar" description={messagesError} />
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-gray-400 mt-1">Comece a conversa enviando uma mensagem</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = String(msg.senderId) === String(userId);
                  const status = isMe ? statusForMessage(msg) : null;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          isMe
                            ? "bg-teal-600 text-white rounded-br-md"
                            : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                        }`}
                      >
                        <p className="leading-relaxed">{renderMessageContent(msg.content)}</p>
                        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isMe ? "text-teal-100" : "text-gray-400"}`}>
                          <span>
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>
                          {isMe && !String(msg.id || "").startsWith("temp-") ? (
                            status === "read" ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                            ) : status === "delivered" ? (
                              <CheckCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                  disabled={sending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className="p-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-full transition-colors flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Suas conversas</h3>
              <p className="text-sm text-gray-500 max-w-xs">Selecione um corretor à esquerda para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
