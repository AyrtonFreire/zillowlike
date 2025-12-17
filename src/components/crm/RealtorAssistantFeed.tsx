"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ExternalLink, Eye, MessageCircle } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";

type AssistantAction = {
  type: string;
  leadId?: string;
  [key: string]: any;
};

type AssistantItem = {
  id: string;
  realtorId: string;
  leadId?: string | null;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "ACTIVE" | "SNOOZED" | "RESOLVED" | "DISMISSED";
  source: string;
  title: string;
  message: string;
  dueAt?: string | null;
  snoozedUntil?: string | null;
  primaryAction?: AssistantAction | null;
  secondaryAction?: AssistantAction | null;
  createdAt: string;
  updatedAt: string;
};

function formatShortDateTime(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return d.toISOString();
  }
}

function getPriorityLabel(priority: AssistantItem["priority"]) {
  if (priority === "HIGH") return "Alta";
  if (priority === "MEDIUM") return "Média";
  return "Baixa";
}

function getPriorityClasses(priority: AssistantItem["priority"]) {
  if (priority === "HIGH") return "bg-red-50 text-red-700 border-red-100";
  if (priority === "MEDIUM") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-gray-50 text-gray-600 border-gray-200";
}

function getActionLabel(action: AssistantAction) {
  if (action.type === "OPEN_CHAT") return "Abrir conversa";
  if (action.type === "OPEN_LEAD") return "Abrir lead";
  return "Abrir";
}

function getActionIcon(action: AssistantAction) {
  if (action.type === "OPEN_CHAT") return MessageCircle;
  if (action.type === "OPEN_LEAD") return Eye;
  return ExternalLink;
}

export default function RealtorAssistantFeed(props: {
  realtorId?: string;
  leadId?: string;
  compact?: boolean;
  embedded?: boolean;
  onDidMutate?: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<AssistantItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const etagRef = useRef<string | null>(null);
  const [snoozeMenuFor, setSnoozeMenuFor] = useState<string | null>(null);

  const realtorId = props.realtorId;
  const leadId = props.leadId;

  const visibleItems = useMemo(() => {
    return items.filter((i) => i.status === "ACTIVE");
  }, [items]);

  const activeCount = visibleItems.length;

  const fetchItems = useCallback(async () => {
    if (!realtorId) return;
    try {
      setError(null);
      setLoading(true);
      const qs = leadId ? `?leadId=${encodeURIComponent(leadId)}` : "";
      const response = await fetch(`/api/assistant/items${qs}`,
        etagRef.current
          ? {
              headers: {
                "if-none-match": etagRef.current,
              },
            }
          : undefined
      );

      if (response.status === 304) {
        return;
      }

      const nextEtag = response.headers.get("etag");
      if (nextEtag) {
        etagRef.current = nextEtag;
      }

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos carregar o Assistente agora.");
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      setItems([]);
      setError(err?.message || "Não conseguimos carregar o Assistente agora.");
    } finally {
      setLoading(false);
    }
  }, [realtorId, leadId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!snoozeMenuFor) return;
    const onDown = (ev: MouseEvent) => {
      const target = ev.target as Element | null;
      if (!target) return;
      if (target.closest('[data-snooze-root="true"]')) return;
      setSnoozeMenuFor(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
    };
  }, [snoozeMenuFor]);

  useEffect(() => {
    if (!realtorId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${realtorId}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        fetchItems();
      };

      channel.bind("assistant-updated", handler as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("assistant-updated", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }
  }, [realtorId, fetchItems]);

  const performAction = async (itemId: string, payload: any) => {
    try {
      setSnoozeMenuFor(null);
      setActingId(itemId);
      setError(null);
      const response = await fetch(`/api/assistant/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos atualizar este item agora.");
      }

      if (data?.item?.id) {
        setItems((prev) => prev.map((it) => (it.id === data.item.id ? data.item : it)));
      }

      etagRef.current = null;
      props.onDidMutate?.();
      await fetchItems();
    } catch (err: any) {
      setError(err?.message || "Não conseguimos atualizar este item agora.");
      etagRef.current = null;
      await fetchItems();
    } finally {
      setActingId(null);
    }
  };

  const handleOpenAction = (action: AssistantAction, item: AssistantItem) => {
    const targetLeadId = action.leadId || item.leadId || undefined;

    if (action.type === "OPEN_CHAT") {
      if (targetLeadId) {
        router.push(`/broker/chats?lead=${targetLeadId}`);
        return;
      }
      router.push("/broker/chats");
      return;
    }

    if (action.type === "OPEN_LEAD") {
      if (targetLeadId) {
        router.push(`/broker/leads/${targetLeadId}`);
        return;
      }
      router.push("/broker/leads");
      return;
    }

    if (targetLeadId) {
      router.push(`/broker/leads/${targetLeadId}`);
      return;
    }
  };

  const defaultPrimaryAction = (item: AssistantItem): AssistantAction | null => {
    if (!item.leadId) return null;
    if (item.type === "UNANSWERED_CLIENT_MESSAGE") {
      return { type: "OPEN_CHAT", leadId: item.leadId };
    }
    return { type: "OPEN_LEAD", leadId: item.leadId };
  };

  const snoozeOptions = useMemo(() => {
    return [
      { label: "1h", minutes: 60 },
      { label: "6h", minutes: 360 },
      { label: "12h", minutes: 720 },
      { label: "24h", minutes: 1440 },
    ];
  }, []);

  const content = (
    <>
      {error && <p className={props.embedded ? "text-xs text-red-600" : "mt-3 text-xs text-red-600"}>{error}</p>}

      {loading && (
        <p className={props.embedded ? "text-xs text-gray-500" : "mt-3 text-xs text-gray-500"}>
          Carregando...
        </p>
      )}

      {!loading && visibleItems.length === 0 && !error && (
        <div
          className={
            props.embedded
              ? "rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-700"
              : "mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-700"
          }
        >
          O Assistente vai te avisar sobre leads sem resposta, lembretes vencidos e próximos passos.
        </div>
      )}

      {visibleItems.length > 0 && (
        <div className={props.embedded ? "space-y-3" : "mt-4 space-y-3"}>
          {visibleItems.map((item) => {
            const dueLabel = formatShortDateTime(item.dueAt || null);
            const snoozeLabel = item.status === "SNOOZED" ? formatShortDateTime(item.snoozedUntil || null) : null;
            const primary = defaultPrimaryAction(item);

            const PrimaryIcon = primary ? getActionIcon(primary) : null;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPriorityClasses(
                          item.priority
                        )}`}
                      >
                        Prioridade {getPriorityLabel(item.priority)}
                      </span>
                      {item.status === "SNOOZED" && snoozeLabel && (
                        <span className="text-[10px] text-gray-500">
                          Sonecado até {snoozeLabel}
                        </span>
                      )}
                      {item.status === "ACTIVE" && dueLabel && (
                        <span className="text-[10px] text-gray-500">
                          Vence em {dueLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-gray-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {item.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => performAction(item.id, { action: "resolve" })}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      title="Marcar como resolvido"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolver
                    </button>

                    <div className="relative" data-snooze-root="true">
                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => setSnoozeMenuFor((prev) => (prev === item.id ? null : item.id))}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        title="Lembrar depois"
                      >
                        Lembrar depois
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {snoozeMenuFor === item.id && (
                        <div className="absolute right-0 mt-2 w-36 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-20">
                          {snoozeOptions.map((opt) => (
                            <button
                              key={opt.minutes}
                              type="button"
                              disabled={actingId === item.id}
                              onClick={async () => {
                                setSnoozeMenuFor(null);
                                await performAction(item.id, { action: "snooze", minutes: opt.minutes });
                              }}
                              className="w-full text-left px-3 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {primary && (
                      <button
                        type="button"
                        onClick={() => handleOpenAction(primary, item)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg glass-teal text-white text-[11px] font-semibold"
                      >
                        {PrimaryIcon && <PrimaryIcon className="w-3.5 h-3.5" />}
                        {getActionLabel(primary)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    props.embedded ? (
      <div>
        {content}
      </div>
    ) : (
      <div className={props.compact ? "bg-white rounded-xl border border-gray-200 p-4" : "bg-white rounded-2xl border border-gray-200 p-5"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Assistente do Corretor</h2>
            <p className="text-xs text-gray-500 mt-1">
              {activeCount > 0
                ? `${activeCount} pendência${activeCount > 1 ? "s" : ""} para você agir agora.`
                : "Sem pendências no momento."}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchItems}
            className="text-[11px] font-semibold text-blue-700 hover:text-blue-800"
          >
            Atualizar
          </button>
        </div>

        {content}
      </div>
    )
  );
}
