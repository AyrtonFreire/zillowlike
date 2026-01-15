"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import { ptBR } from "@/lib/i18n/property";

type AssistantAction = {
  type: string;
  url?: string;
  leadId?: string;
  [key: string]: any;
};

type AssistantItem = {
  id: string;
  leadId?: string | null;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "ACTIVE" | "SNOOZED" | "RESOLVED" | "DISMISSED";
  source: string;
  title: string;
  message: string;
  metadata?: Record<string, any> | null;
  dueAt?: string | null;
  snoozedUntil?: string | null;
  primaryAction?: AssistantAction | null;
  secondaryAction?: AssistantAction | null;
  createdAt: string;
  updatedAt: string;
};

type AiAssistResult = {
  itemId: string;
  itemType: string;
  taskLabel: string;
  summary: string;
  draft: string;
  reasons: string[];
  confidence: "low" | "medium" | "high";
};

async function copyText(text: string) {
  const value = String(text || "");
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  } catch {
  }
}

export function AgencyAssistantFeed(props: {
  teamId: string;
  embedded?: boolean;
  onDidMutate?: () => void;
}) {
  const router = useRouter();

  const [items, setItems] = useState<AssistantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [aiForId, setAiForId] = useState<string | null>(null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAssistResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  const [copiedForId, setCopiedForId] = useState<string | null>(null);
  const copiedTimerRef = useRef<any>(null);

  const etagRef = useRef<string | null>(null);
  const delayedRefreshRef = useRef<any>(null);
  const lastRealtimeUpdateRef = useRef<Record<string, number>>({});

  const recordAssistantEvent = useCallback(
    (input: {
      event: "DRAFT_COPIED" | "DRAFT_SENT" | "DRAFT_EDITED";
      itemId: string;
      leadId?: string | null;
      itemType?: string | null;
      metadata?: Record<string, any>;
    }) => {
      try {
        fetch(`/api/assistant/events?context=AGENCY&teamId=${encodeURIComponent(props.teamId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: input.event,
            itemId: String(input.itemId),
            context: "AGENCY",
            teamId: String(props.teamId),
            leadId: input.leadId ? String(input.leadId) : undefined,
            itemType: input.itemType ? String(input.itemType) : undefined,
            metadata: input.metadata || undefined,
          }),
          keepalive: true,
        }).catch(() => null);
      } catch {
      }
    },
    [props.teamId]
  );

  const fetchItems = useCallback(async () => {
    try {
      setError(null);

      const headers: any = {};
      if (etagRef.current) headers["if-none-match"] = etagRef.current;

      const response = await fetch(`/api/assistant/items?context=AGENCY`, { headers });
      if (response.status === 304) {
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos carregar o Assistente agora.");
      }

      const nextItems = Array.isArray(data.items) ? (data.items as AssistantItem[]) : [];
      setItems(nextItems);
      const nextEtag = response.headers.get("etag");
      etagRef.current = nextEtag || null;
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Não conseguimos carregar o Assistente agora.");
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!props.teamId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-agency-${props.teamId}`;
      const channel = pusher.subscribe(channelName);

      const refresh = () => {
        if (cancelled) return;
        if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current);
        delayedRefreshRef.current = setTimeout(() => {
          if (cancelled) return;
          fetchItems();
        }, 250);
      };

      const onItemUpdated = (data: any) => {
        if (cancelled) return;
        const updated = data?.item;
        if (!updated?.id) {
          refresh();
          return;
        }

        const id = String(updated.id);
        const status = String(updated.status || "");

        const eventMs = (() => {
          const fromItem = updated.updatedAt || updated.resolvedAt || updated.dismissedAt || updated.createdAt || null;
          if (fromItem) {
            const d = new Date(fromItem);
            const t = d.getTime();
            if (!Number.isNaN(t)) return t;
          }
          const fromPayload = data?.ts ? new Date(data.ts).getTime() : 0;
          return Number.isNaN(fromPayload) ? Date.now() : fromPayload;
        })();

        const lastSeen = lastRealtimeUpdateRef.current[id] || 0;
        if (eventMs && lastSeen && eventMs <= lastSeen) {
          return;
        }
        lastRealtimeUpdateRef.current[id] = eventMs || Date.now();

        setItems((prev) => {
          const kept = prev.filter((it) => String(it.id) !== id);
          const next = status === "ACTIVE" || status === "SNOOZED" ? [updated as any, ...kept] : kept;
          return next as any;
        });
      };

      const onItemsRecalculated = () => {
        refresh();
      };

      channel.bind("assistant:item_updated", onItemUpdated as any);
      channel.bind("assistant:items_recalculated", onItemsRecalculated as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("assistant:item_updated", onItemUpdated as any);
          channel.unbind("assistant:items_recalculated", onItemsRecalculated as any);
          pusher.unsubscribe(channelName);
        } catch {
        }
      };
    } catch {
    }
  }, [props.teamId, fetchItems]);

  const handleOpenAction = useCallback(
    (action: AssistantAction | null | undefined, item: AssistantItem) => {
      const url = action?.url ? String(action.url) : null;
      if (action?.type === "OPEN_PAGE" && url) {
        router.push(url);
        return;
      }

      if (item.leadId) {
        router.push(`/agency/teams/${encodeURIComponent(props.teamId)}/crm?lead=${encodeURIComponent(String(item.leadId))}`);
        return;
      }

      router.push(`/agency/teams/${encodeURIComponent(props.teamId)}/crm`);
    },
    [router, props.teamId]
  );

  const performAction = async (itemId: string, payload: { action: "resolve" | "dismiss" | "snooze"; minutes?: number }) => {
    try {
      setActingId(itemId);
      setError(null);

      const response = await fetch(`/api/assistant/items/${encodeURIComponent(itemId)}?context=AGENCY`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos atualizar este item agora.");
      }

      etagRef.current = null;
      props.onDidMutate?.();
      void fetchItems();
    } catch (err: any) {
      setError(err?.message || "Não conseguimos atualizar este item agora.");
    } finally {
      setActingId(null);
    }
  };

  const generateAi = async (itemId: string) => {
    try {
      setAiError(null);
      setAiResult(null);
      setAiForId(itemId);
      if (aiLoadingId === itemId) return;

      try {
        aiAbortRef.current?.abort();
      } catch {
      }

      const controller = new AbortController();
      aiAbortRef.current = controller;

      setAiLoadingId(itemId);
      const res = await fetch(
        `/api/assistant/items/${encodeURIComponent(itemId)}/generate?context=AGENCY&teamId=${encodeURIComponent(props.teamId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        const msg =
          json?.error ||
          (res.status === 401
            ? "Sua sessão expirou. Entre novamente e tente de novo."
            : res.status === 403
              ? "Você não tem permissão para gerar esta sugestão."
              : res.status === 404
                ? "Este item não existe mais (provavelmente já foi resolvido)."
                : res.status === 429
                  ? "Limite de uso atingido. Tente novamente em alguns instantes."
                  : "Não conseguimos gerar uma sugestão agora.");
        throw new Error(msg);
      }

      const data = json?.data as AiAssistResult | undefined;
      if (!data?.itemId || !data?.draft) {
        throw new Error("Não conseguimos gerar uma sugestão agora.");
      }

      setAiResult(data);
      setAiForId(itemId);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      setAiResult(null);
      setAiError(err?.message || "Não conseguimos gerar uma sugestão agora.");
      setAiForId(itemId);
    } finally {
      setAiLoadingId(null);
    }
  };

  const visibleItems = useMemo(() => {
    return items.filter((it) => it.status === "ACTIVE" || it.status === "SNOOZED");
  }, [items]);

  const containerClass = props.embedded ? "" : "max-w-3xl mx-auto";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">Assistente</div>
        <div className="text-xs font-medium text-gray-600">{visibleItems.length} pendência{visibleItems.length === 1 ? "" : "s"}</div>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-gray-600">Carregando...</div>
      ) : error ? (
        <div className="mt-4 text-sm text-red-700">{error}</div>
      ) : visibleItems.length === 0 ? (
        <div className="mt-4 text-sm text-gray-600">Nenhuma pendência no momento.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleItems.map((item) => {
            const isBusy = actingId === item.id;
            const isReminder =
              item.type === "REMINDER_TODAY" || item.type === "REMINDER_OVERDUE" || item.type === "WEEKLY_SUMMARY";
            const showAiBox = aiForId === item.id && (aiError || (aiResult && aiResult.itemId === item.id));
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{item.title}</div>
                    <div className="mt-1 text-sm text-gray-700">{item.message}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAction(item.primaryAction || null, item)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    title="Abrir"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => performAction(item.id, { action: "resolve" })}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolver
                  </button>

                  <button
                    type="button"
                    disabled={isBusy || aiLoadingId === item.id}
                    onClick={() => generateAi(item.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <Sparkles className="w-4 h-4" />
                    {aiLoadingId === item.id ? "Gerando..." : "Gerar com IA"}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => performAction(item.id, { action: "snooze", minutes: 60 })}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <Clock className="w-4 h-4" />
                    Adiar 1h
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => performAction(item.id, { action: "dismiss" })}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                    Dispensar
                  </button>

                  {item.type && (
                    <div className="ml-auto inline-flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                      <Sparkles className="w-4 h-4" />
                      {ptBR.type(item.type)}
                    </div>
                  )}
                </div>

                {showAiBox && (
                  <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-900">Sugestão do Assistente</p>
                        {aiError ? (
                          <p className="mt-1 text-[11px] text-red-600">{aiError}</p>
                        ) : (
                          <p className="mt-1 text-[11px] text-gray-700">{aiResult?.summary}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          try {
                            if (aiLoadingId === item.id) {
                              aiAbortRef.current?.abort();
                            }
                          } catch {
                          }
                          setAiForId(null);
                          setAiError(null);
                          setAiResult(null);
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="Fechar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {!aiError && aiResult?.draft && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-gray-900">
                            {isReminder ? "Checklist" : "Mensagem sugerida"}
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              await copyText(aiResult.draft);
                              try {
                                recordAssistantEvent({
                                  event: "DRAFT_COPIED",
                                  itemId: String(item.id),
                                  leadId: item.leadId ?? null,
                                  itemType: item.type ?? null,
                                  metadata: { source: "agency_feed" },
                                });
                              } catch {
                              }
                              setCopiedForId(item.id);
                              if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
                              copiedTimerRef.current = setTimeout(() => {
                                setCopiedForId(null);
                              }, 2000);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-800 hover:bg-gray-50"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedForId === item.id ? "Copiado" : "Copiar"}
                          </button>
                        </div>

                        <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-800 whitespace-pre-wrap">
                          {aiResult.draft}
                        </div>
                      </div>
                    )}

                    {aiError && (
                      <div className="mt-2">
                        <button
                          type="button"
                          disabled={aiLoadingId === item.id}
                          onClick={() => generateAi(item.id)}
                          className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-60"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
