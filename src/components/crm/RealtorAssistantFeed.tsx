"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ExternalLink, Eye, MessageCircle, Copy, Sparkles, X } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import { getRealtorAssistantCategory, getRealtorAssistantTaskLabel } from "@/lib/realtor-assistant-ai";

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

type AiAssistResult = {
  itemId: string;
  itemType: string;
  taskLabel: string;
  summary: string;
  draft: string;
  reasons: string[];
  confidence: "low" | "medium" | "high";
};

type AiItemSnapshot = {
  id: string;
  leadId?: string | null;
  type: string;
  title: string;
  message: string;
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

function getMessageSendLabel(itemType: string | null | undefined) {
  const t = String(itemType || "").trim();
  if (t === "NEW_LEAD") return "Fazer primeiro contato";
  if (t === "STALE_LEAD") return "Enviar follow-up";
  if (t === "VISIT_TODAY" || t === "VISIT_TOMORROW") return "Confirmar visita";
  return "Responder";
}

function canSendAiDraftToClient(itemType: string | null | undefined) {
  const t = String(itemType || "").trim();
  return (
    t === "UNANSWERED_CLIENT_MESSAGE" ||
    t === "NEW_LEAD" ||
    t === "LEAD_NO_FIRST_CONTACT" ||
    t === "STALE_LEAD" ||
    t === "VISIT_TODAY" ||
    t === "VISIT_TOMORROW"
  );
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
  const [aiForId, setAiForId] = useState<string | null>(null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAssistResult | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [copiedForId, setCopiedForId] = useState<string | null>(null);
  const copiedTimerRef = useRef<any>(null);
  const [replyingForId, setReplyingForId] = useState<string | null>(null);
  const [repliedForId, setRepliedForId] = useState<string | null>(null);
  const repliedTimerRef = useRef<any>(null);
  const [aiItemSnapshot, setAiItemSnapshot] = useState<AiItemSnapshot | null>(null);

  const realtorId = props.realtorId;
  const leadId = props.leadId;

  const visibleItems = useMemo(() => {
    return items.filter((i) => i.status === "ACTIVE");
  }, [items]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, AssistantItem[]> = {
      Leads: [],
      Visitas: [],
      Lembretes: [],
      Outros: [],
    };

    for (const item of visibleItems) {
      const category = getRealtorAssistantCategory(item.type);
      (groups[category] || groups.Outros).push(item);
    }

    return groups;
  }, [visibleItems]);

  const aiVisibleItem = useMemo(() => {
    if (!aiForId) return null;
    return visibleItems.find((i) => i.id === aiForId) || null;
  }, [aiForId, visibleItems]);

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
    return () => {
      try {
        aiAbortRef.current?.abort();
      } catch {
      }
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
      if (repliedTimerRef.current) {
        clearTimeout(repliedTimerRef.current);
        repliedTimerRef.current = null;
      }
    };
  }, []);

  const sendReply = useCallback(
    async (params: { leadId: string; content: string; ownerId: string }) => {
      if (!params.leadId || !params.content.trim()) return;
      setError(null);
      setReplyingForId(params.ownerId);
      try {
        const response = await fetch(`/api/leads/${encodeURIComponent(params.leadId)}/client-messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: params.content.trim() }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.message?.id) {
          throw new Error(data?.error || "Não conseguimos enviar esta mensagem agora.");
        }

        setRepliedForId(params.ownerId);
        if (repliedTimerRef.current) clearTimeout(repliedTimerRef.current);
        repliedTimerRef.current = setTimeout(() => {
          setRepliedForId(null);
        }, 2000);

        etagRef.current = null;
        props.onDidMutate?.();
        await fetchItems();
      } catch (err: any) {
        setError(err?.message || "Não conseguimos enviar esta mensagem agora.");
      } finally {
        setReplyingForId(null);
      }
    },
    [fetchItems, props]
  );

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

  useEffect(() => {
    if (!realtorId) return;
    if (typeof window === "undefined") return;

    const onFocus = () => fetchItems();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchItems();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchItems, realtorId]);

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

  const generateAi = async (item: { id: string }) => {
    try {
      setAiError(null);
      setAiForId(item.id);
      if (aiLoadingId === item.id) return;

      try {
        aiAbortRef.current?.abort();
      } catch {
      }
      const controller = new AbortController();
      aiAbortRef.current = controller;

      setAiLoadingId(item.id);
      const res = await fetch(`/api/assistant/items/${item.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
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
      setAiForId(item.id);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      setAiResult(null);
      setAiError(err?.message || "Não conseguimos gerar uma sugestão agora.");
      setAiForId(item.id);
    } finally {
      setAiLoadingId(null);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
      }
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
          {!aiVisibleItem && aiForId && (aiError || (aiResult && aiResult.itemId === aiForId)) && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-900">Sugestão do Assistente</p>
                  {aiItemSnapshot?.title && (
                    <p className="mt-1 text-[11px] text-gray-600">{aiItemSnapshot.title}</p>
                  )}
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
                      if (aiLoadingId === aiForId) {
                        aiAbortRef.current?.abort();
                      }
                    } catch {
                    }
                    setAiForId(null);
                    setAiError(null);
                    setAiResult(null);
                    setAiItemSnapshot(null);
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!aiError && aiResult?.draft && (
                <>
                  {Array.isArray(aiResult.reasons) && aiResult.reasons.length > 0 && (
                    <div className="mt-2">
                      <ul className="list-disc ml-5 text-[11px] text-gray-600 space-y-1">
                        {aiResult.reasons.slice(0, 6).map((r, idx) => (
                          <li key={`ai-detached-r-${idx}`}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-gray-900">Texto pronto</p>
                      <button
                        type="button"
                        onClick={async () => {
                          await copyText(aiResult.draft);
                          setCopiedForId(aiForId);
                          if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
                          copiedTimerRef.current = setTimeout(() => {
                            setCopiedForId(null);
                          }, 2000);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedForId === aiForId ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-800 whitespace-pre-wrap">
                      {aiResult.draft}
                    </div>
                    {!!aiItemSnapshot?.leadId && canSendAiDraftToClient(aiItemSnapshot?.type) && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={replyingForId === aiForId}
                          onClick={() =>
                            sendReply({
                              leadId: String(aiItemSnapshot.leadId),
                              content: aiResult.draft,
                              ownerId: String(aiForId),
                            })
                          }
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg glass-teal text-white text-[11px] font-semibold disabled:opacity-60"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {repliedForId === aiForId
                            ? "Enviado"
                            : replyingForId === aiForId
                              ? "Enviando..."
                              : getMessageSendLabel(aiItemSnapshot?.type)}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {aiError && (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={aiLoadingId === aiForId}
                    onClick={() => generateAi({ id: aiForId })}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-60"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}

          {(["Leads", "Visitas", "Lembretes", "Outros"] as const).map((category) => {
            const group = groupedItems[category] || [];
            if (group.length === 0) return null;

            return (
              <div key={`cat-${category}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-gray-700">{category}</p>
                  <p className="text-[11px] font-semibold text-gray-500">{group.length}</p>
                </div>
                <div className="space-y-3">
                  {group.map((item) => {
                    const dueLabel = formatShortDateTime(item.dueAt || null);
                    const snoozeLabel = item.status === "SNOOZED" ? formatShortDateTime(item.snoozedUntil || null) : null;
                    const primary = defaultPrimaryAction(item);
                    const taskLabel = getRealtorAssistantTaskLabel(item.type);
                    const isReminder = item.type === "REMINDER_TODAY" || item.type === "REMINDER_OVERDUE";
                    const resolveLabel = isReminder ? "Marcar como feito" : "Resolver";
                    const resolveTitle = isReminder ? "Marcar como feito" : "Marcar como resolvido";

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
                              title={resolveTitle}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {resolveLabel}
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
                            <button
                              type="button"
                              disabled={aiLoadingId === item.id}
                              onClick={() => {
                                setAiItemSnapshot({
                                  id: item.id,
                                  leadId: item.leadId ?? null,
                                  type: item.type,
                                  title: item.title,
                                  message: item.message,
                                });
                                generateAi({ id: item.id });
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {aiLoadingId === item.id ? "Gerando..." : taskLabel}
                            </button>
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

                        {aiForId === item.id && (aiError || (aiResult && aiResult.itemId === item.id)) && (
                          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-gray-900">
                                  Sugestão do Assistente
                                </p>
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
                              <>
                                {Array.isArray(aiResult.reasons) && aiResult.reasons.length > 0 && (
                                  <div className="mt-2">
                                    <ul className="list-disc ml-5 text-[11px] text-gray-600 space-y-1">
                                      {aiResult.reasons.slice(0, 6).map((r, idx) => (
                                        <li key={`${item.id}-ai-r-${idx}`}>{r}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="mt-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-gray-900">Texto pronto</p>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await copyText(aiResult.draft);
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
                                  {!!item.leadId && canSendAiDraftToClient(item.type) && (
                                    <div className="mt-2 flex justify-end">
                                      <button
                                        type="button"
                                        disabled={replyingForId === item.id}
                                        onClick={() =>
                                          sendReply({
                                            leadId: String(item.leadId),
                                            content: aiResult.draft,
                                            ownerId: item.id,
                                          })
                                        }
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg glass-teal text-white text-[11px] font-semibold disabled:opacity-60"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        {repliedForId === item.id
                                          ? "Enviado"
                                          : replyingForId === item.id
                                            ? "Enviando..."
                                            : getMessageSendLabel(item.type)}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            {aiError && (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  disabled={aiLoadingId === item.id}
                                  onClick={() => generateAi({ id: item.id })}
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
