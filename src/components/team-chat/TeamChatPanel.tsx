"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { MessageCircle, Send, Wand2 } from "lucide-react";
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
  const { data: session } = useSession();
  const role = (session as any)?.user?.role || (session as any)?.role || null;
  const userId = (session as any)?.user?.id || (session as any)?.userId || "";
  const isRealtor = role === "REALTOR";
  const sessionUser = (session as any)?.user as { id?: string; name?: string | null; role?: string | null; image?: string | null } | undefined;

  const [team, setTeam] = useState<TeamChatTeam | null>(null);
  const [threads, setThreads] = useState<TeamChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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

        if (!selectedThreadId && list.length > 0) {
          setSelectedThreadId(String(list[0].id));
        }
        if (list.length === 0) {
          setSelectedThreadId(null);
          setMessages([]);
        }
      } catch (err: any) {
        console.error("Error loading team chat threads:", err);
        if (!silent) setError(err?.message || "Nao foi possivel carregar as conversas do time.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedThreadId, teamId]
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
    async (threadId: string, silent = false) => {
      if (!threadId) return;
      try {
        if (!silent) {
          setMessagesLoading(true);
          setMessagesError(null);
        }
        const response = await fetch(`/api/team-chat/threads/${threadId}`);
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Nao foi possivel carregar esta conversa.");
        }
        const list: TeamChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
        setMessages(list);
        await markThreadRead(threadId);
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === threadId ? { ...thread, unreadCount: 0 } : thread
          )
        );
      } catch (err: any) {
        console.error("Error loading team chat messages:", err);
        if (!silent) {
          setMessagesError(err?.message || "Nao foi possivel carregar esta conversa.");
        }
      } finally {
        if (!silent) setMessagesLoading(false);
      }
    },
    [markThreadRead]
  );

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (selectedThreadId) {
      fetchMessages(selectedThreadId);
    }
  }, [selectedThreadId, fetchMessages]);

  useEffect(() => {
    if (!threadIdsKey) return;
    const pusher = getPusherClient();
    const threadIds = threadIdsKey.split("|").filter(Boolean);

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
          return [...prev, incoming];
        });
        markThreadRead(payload.threadId);
      }
    };

    threadIds.forEach((threadId) => {
      const channelName = `private-team-chat-${threadId}`;
      const channel = pusher.subscribe(channelName);
      channel.bind(PUSHER_EVENTS.TEAM_CHAT_MESSAGE, handler as any);
    });

    return () => {
      threadIds.forEach((threadId) => {
        try {
          const channelName = `private-team-chat-${threadId}`;
          const channel = pusher.channel(channelName);
          channel?.unbind(PUSHER_EVENTS.TEAM_CHAT_MESSAGE, handler as any);
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

  const handleSuggest = async () => {
    if (!activeThread?.id || suggesting) return;
    setSuggesting(true);
    setSuggestError(null);

    try {
      const response = await fetch("/api/team-chat/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeThread.id, prompt: draft.trim() || null }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Nao foi possivel gerar a sugestao.");
      }
      setDraft(data.suggestion || "");
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (err: any) {
      console.error("Error generating suggestion:", err);
      setSuggestError(err?.message || "Nao foi possivel gerar a sugestao.");
    } finally {
      setSuggesting(false);
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
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <MessageCircle className="w-4 h-4" />
              <span>{messages.length} mensagens</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
            {suggestError ? <p className="text-xs text-rose-600 mb-2">{suggestError}</p> : null}
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
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
                  onClick={handleSuggest}
                  disabled={!activeThread || suggesting}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {suggesting ? "Gerando" : "Sugerir"}
                </button>
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
