"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { MessageCircle, Send } from "lucide-react";
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

function initials(value: string) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return date.toISOString();
  }
}

function formatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return date.toISOString();
  }
}

function formatShortDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
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
          className="text-blue-600 underline break-all"
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

export default function TeamChatPanel({ teamId }: { teamId?: string }) {
  const { data: session, status } = useSession();
  const role = (session as any)?.user?.role || (session as any)?.role || null;
  const userId = (session as any)?.user?.id || (session as any)?.userId || "";
  const isRealtor = role === "REALTOR";
  const sessionUser = (session as any)?.user as { id?: string; name?: string | null; role?: string | null; image?: string | null } | undefined;

  const [team, setTeam] = useState<TeamChatTeam | null>(null);
  const [threads, setThreads] = useState<TeamChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{ hasMore: boolean; nextCursor: string | null }>({
    hasMore: false,
    nextCursor: null,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const selectedThreadIdRef = useRef<string | null>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeThread = useMemo(() => {
    return threads.find((thread) => thread.id === selectedThreadId) || null;
  }, [threads, selectedThreadId]);

  const threadIdsKey = useMemo(() => {
    return threads
      .map((thread) => thread.id)
      .sort()
      .join("|");
  }, [threads]);

  const fetchThreads = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }

        const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
        const response = await fetch(`/api/team-chat/threads${query}`);
        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Nao foi possivel carregar as conversas.");
        }

        setTeam(data.team || null);
        const list: TeamChatThread[] = Array.isArray(data.threads) ? data.threads : [];
        setThreads(list);

        setSelectedThreadId((prev) => {
          if (!list.length) return null;
          if (prev && list.some((thread) => String(thread.id) === String(prev))) return prev;
          return String(list[0].id);
        });

        if (!list.length) {
          setMessages([]);
        }
      } catch (err: any) {
        console.error("Error loading team chat threads:", err);
        if (!silent) setError(err?.message || "Nao foi possivel carregar as conversas do time.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [teamId]
  );

  const markThreadRead = useCallback(async (threadId: string) => {
    if (!threadId) return;
    try {
      await fetch(`/api/team-chat/threads/${threadId}/read`, { method: "POST" });
    } catch {
      // ignore
    }
  }, []);

  const fetchMessages = useCallback(
    async (
      threadId: string,
      options?: { silent?: boolean; cursor?: string | null; append?: boolean; markRead?: boolean }
    ) => {
      if (!threadId) return;
      const currentSelectionAtStart = selectedThreadIdRef.current;
      const silent = options?.silent ?? false;
      const append = options?.append ?? false;
      const markRead = options?.markRead ?? !append;

      try {
        if (!silent) {
          if (append) {
            setLoadingMore(true);
          } else {
            setMessagesLoading(true);
            setMessagesError(null);
          }
        }

        const params = new URLSearchParams();
        if (options?.cursor) params.set("before", options.cursor);
        params.set("limit", "40");
        const query = params.toString();
        const response = await fetch(`/api/team-chat/threads/${threadId}${query ? `?${query}` : ""}`);
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Nao foi possivel carregar esta conversa.");
        }

        const list: TeamChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
        const isStillSelected = selectedThreadIdRef.current === threadId;

        if (isStillSelected) {
          if (append) {
            setMessages((prev) => {
              const seen = new Set(prev.map((msg) => msg.id));
              const older = list.filter((msg) => !seen.has(msg.id));
              return [...older, ...prev];
            });
          } else {
            setMessages(list);
          }

          const nextCursor = data?.pagination?.nextCursor ?? null;
          const hasMore = Boolean(data?.pagination?.hasMore);
          setPagination({ hasMore, nextCursor });

          if (markRead) {
            await markThreadRead(threadId);
            setThreads((prev) =>
              prev.map((thread) =>
                thread.id === threadId ? { ...thread, unreadCount: 0 } : thread
              )
            );
          }
        }
      } catch (err: any) {
        console.error("Error loading team chat messages:", err);
        const isStillSelected = selectedThreadIdRef.current === threadId;
        if (!silent && isStillSelected && !append) {
          setMessagesError(err?.message || "Nao foi possivel carregar esta conversa.");
        }
      } finally {
        const isStillSelected = selectedThreadIdRef.current === threadId;
        const selectionDidNotChange = currentSelectionAtStart === selectedThreadIdRef.current;
        if (!silent && isStillSelected && selectionDidNotChange) {
          if (append) {
            setLoadingMore(false);
          } else {
            setMessagesLoading(false);
          }
        }
      }
    },
    [markThreadRead]
  );

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchThreads();
  }, [fetchThreads, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(() => {
      fetchThreads(true);
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetchThreads, status]);

  useEffect(() => {
    if (selectedThreadId) {
      selectedThreadIdRef.current = selectedThreadId;
      fetchMessages(selectedThreadId);
    } else {
      selectedThreadIdRef.current = null;
    }
  }, [selectedThreadId, fetchMessages]);

  useEffect(() => {
    if (!threadIdsKey) return;
    if (!userId) return;
    const pusher = getPusherClient();
    const threadIds = threadIdsKey.split("|").filter(Boolean);

    const connectionErrorHandler = (err: any) => {
      const message = err?.error?.message || err?.message || "Falha na conexao em tempo real.";
      setRealtimeError(String(message));
    };

    const connectionStateHandler = (states: any) => {
      if (states?.current === "connected") {
        setRealtimeError(null);
      }
    };

    const subscriptionErrorHandler = (status: any) => {
      const code = typeof status === "number" ? status : status?.status;
      if (code === 401 || code === 403) {
        setRealtimeError("Sem permissao para realtime (verifique login/permissoes).");
        return;
      }
      if (code) {
        setRealtimeError(`Realtime indisponivel (status ${String(code)}).`);
        return;
      }
      setRealtimeError("Realtime indisponivel.");
    };

    pusher.connection.bind("error", connectionErrorHandler);
    pusher.connection.bind("state_change", connectionStateHandler);

    const handler = (payload: { threadId: string; message: TeamChatMessage }) => {
      if (!payload?.threadId || !payload?.message) return;
      const incoming = payload.message;

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== payload.threadId) return thread;
          const isOwn = String(incoming.senderId) === String(userId);
          const shouldIncrement = !isOwn && payload.threadId !== selectedThreadId;
          return {
            ...thread,
            lastMessage: incoming,
            lastMessageAt: incoming.createdAt,
            updatedAt: incoming.createdAt || thread.updatedAt,
            unreadCount: shouldIncrement ? (thread.unreadCount || 0) + 1 : isOwn ? 0 : thread.unreadCount,
          };
        })
      );

      if (payload.threadId === selectedThreadId) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === incoming.id)) return prev;

          const isMine = String(incoming.senderId) === String(userId);
          if (isMine) {
            const incomingTime = incoming.createdAt ? new Date(incoming.createdAt).getTime() : Date.now();
            for (let i = prev.length - 1; i >= 0; i -= 1) {
              const candidate = prev[i];
              if (!String(candidate.id || "").startsWith("temp-")) continue;
              if (String(candidate.senderId) !== String(incoming.senderId)) continue;
              if (String(candidate.content || "") !== String(incoming.content || "")) continue;

              const candidateTime = candidate.createdAt ? new Date(candidate.createdAt).getTime() : incomingTime;
              if (Math.abs(incomingTime - candidateTime) > 60_000) continue;

              const next = [...prev];
              next[i] = { ...candidate, ...incoming };
              return next;
            }
          }

          return [...prev, incoming];
        });
        markThreadRead(payload.threadId);
      }
    };

    threadIds.forEach((threadId) => {
      const channelName = `private-team-chat-${threadId}`;
      const channel = pusher.subscribe(channelName);
      channel.bind(PUSHER_EVENTS.TEAM_CHAT_MESSAGE, handler as any);
      channel.bind("pusher:subscription_error", subscriptionErrorHandler as any);
    });

    return () => {
      pusher.connection.unbind("error", connectionErrorHandler);
      pusher.connection.unbind("state_change", connectionStateHandler);
      threadIds.forEach((threadId) => {
        try {
          const channelName = `private-team-chat-${threadId}`;
          const channel = pusher.channel(channelName);
          channel?.unbind(PUSHER_EVENTS.TEAM_CHAT_MESSAGE, handler as any);
          channel?.unbind("pusher:subscription_error", subscriptionErrorHandler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      });
    };
  }, [threadIdsKey, userId, selectedThreadId, markThreadRead]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, selectedThreadId]);

  const handleSelectThread = (threadId: string) => {
    selectedThreadIdRef.current = threadId;
    setSelectedThreadId(threadId);
    setMessages([]);
    setMessagesError(null);
    setPagination({ hasMore: false, nextCursor: null });
  };

  const handleLoadMore = async () => {
    if (!activeThread?.id || loadingMore || !pagination.hasMore || !pagination.nextCursor) return;
    await fetchMessages(activeThread.id, {
      cursor: pagination.nextCursor,
      append: true,
      silent: false,
      markRead: false,
    });
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
      sender: sessionUser
        ? {
            id: String(sessionUser.id || ""),
            name: sessionUser.name || null,
            role: sessionUser.role || null,
            image: sessionUser.image || null,
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
        throw new Error(data?.error || "Nao foi possivel enviar esta mensagem.");
      }

      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? { ...msg, ...data.message } : msg))
      );

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === activeThread.id
            ? {
                ...thread,
                lastMessage: data.message,
                lastMessageAt: data.message?.createdAt || new Date().toISOString(),
                unreadCount: 0,
              }
            : thread
        )
      );
    } catch (err: any) {
      console.error("Error sending team chat message:", err);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      alert(err?.message || "Nao foi possivel enviar esta mensagem agora.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const renderThreadLabel = (thread: TeamChatThread) => {
    const counterpart = isRealtor ? thread.owner : thread.realtor;
    return counterpart?.name || counterpart?.email || "Conversa do time";
  };

  const renderThreadAvatar = (thread: TeamChatThread) => {
    const counterpart = isRealtor ? thread.owner : thread.realtor;
    const name = counterpart?.name || counterpart?.email || "";

    if (counterpart?.image) {
      return (
        <Image
          src={counterpart.image}
          alt={name || "Avatar"}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
        {initials(name) || "TC"}
      </div>
    );
  };

  if (status === "loading") {
    return (
      <div className="py-12">
        <CenteredSpinner message="Carregando sessao..." />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <EmptyState title="Voce precisa entrar" description="Faca login para ver as conversas do time." />;
  }

  if (loading) {
    return (
      <div className="py-12">
        <CenteredSpinner message="Carregando conversas do time..." />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Nao conseguimos carregar o chat do time"
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

  if (!threads.length) {
    return (
      <EmptyState
        title="Nenhuma conversa por enquanto"
        description="Assim que houver um corretor no time, esta conversa aparece aqui."
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="w-full lg:w-80">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Conversas</p>
            {team?.name ? (
              <p className="text-xs text-gray-500 mt-1">{team.name}</p>
            ) : null}
          </div>
          <div className="divide-y divide-gray-100">
            {threads.map((thread) => {
              const isActive = thread.id === selectedThreadId;
              const lastMessage = thread.lastMessage?.content || "Sem mensagens ainda.";
              const lastTime = thread.lastMessageAt || thread.updatedAt;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    isActive ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  {renderThreadAvatar(thread)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{renderThreadLabel(thread)}</p>
                        <p className="text-xs text-gray-500 truncate">{lastMessage}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-[11px] text-gray-400">
                          {lastTime ? formatShortDate(lastTime) : ""}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold">
                            {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col min-h-[520px]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{activeThread ? renderThreadLabel(activeThread) : ""}</p>
              <p className="text-xs text-gray-500">Somente texto e links.</p>
              {realtimeError ? <p className="text-xs text-amber-600 mt-1">{realtimeError}</p> : null}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <MessageCircle className="w-4 h-4" />
              <span>{messages.length} mensagens</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {pagination.hasMore ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  {loadingMore ? "Carregando" : "Carregar mensagens anteriores"}
                </button>
              </div>
            ) : null}
            {messagesLoading ? (
              <CenteredSpinner message="Carregando conversa..." />
            ) : messagesError ? (
              <EmptyState title="Nao foi possivel carregar" description={messagesError} />
            ) : messages.length === 0 ? (
              <div className="text-sm text-gray-500">Nenhuma mensagem ainda. Envie o primeiro aviso.</div>
            ) : (
              messages.map((message) => {
                const isMine = String(message.senderId) === String(userId);
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${
                        isMine ? "bg-neutral-900 text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="leading-relaxed">{renderMessageContent(message.content)}</p>
                      <span className={`block text-[10px] mt-2 ${isMine ? "text-gray-300" : "text-gray-500"}`}>
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>

          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  placeholder="Escreva sua mensagem para o time"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || sending || !activeThread}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Enviando" : "Enviar"}
                </button>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-gray-400">Enter para enviar, Shift+Enter para quebrar linha.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
