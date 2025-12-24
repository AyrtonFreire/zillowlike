"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  MessageCircle,
  Phone,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
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
  impactScore?: number;
  lead?: {
    id: string;
    status?: string | null;
    pipelineStage?: string | null;
    clientName?: string | null;
    propertyTitle?: string | null;
  } | null;
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

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getActionLabel(action: AssistantAction, item?: AssistantItem | null) {
  if (action.type === "OPEN_CHAT") {
    if (item?.type === "UNANSWERED_CLIENT_MESSAGE") return "Responder";
    return "Abrir conversa";
  }
  if (action.type === "OPEN_LEAD") {
    if (item && isReminderType(item.type)) return "Ver detalhes";
    return "Abrir lead";
  }
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

function getAiDraftSectionTitle(itemType: string | null | undefined) {
  const t = String(itemType || "").trim();
  if (t === "REMINDER_TODAY" || t === "REMINDER_OVERDUE" || t === "WEEKLY_SUMMARY") return "Plano sugerido";
  return "Texto pronto";
}

function isReminderType(itemType: string | null | undefined) {
  const t = String(itemType || "").trim();
  return t === "REMINDER_TODAY" || t === "REMINDER_OVERDUE";
}

function isInternalChecklistType(itemType: string | null | undefined) {
  const t = String(itemType || "").trim();
  return isReminderType(t) || t === "WEEKLY_SUMMARY";
}

function shouldAutoResolveOnReply(itemType: string | null | undefined) {
  const t = String(itemType || "").trim();
  return t === "UNANSWERED_CLIENT_MESSAGE" || t === "NEW_LEAD" || t === "LEAD_NO_FIRST_CONTACT" || t === "STALE_LEAD";
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
  const optimisticHideRef = useRef<Record<string, number>>({});
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

  const [successById, setSuccessById] = useState<Record<string, { message: string }>>({});
  const successTimersRef = useRef<Record<string, any>>({});
  const delayedRefreshRef = useRef<any>(null);

  const [deleteConfirmForId, setDeleteConfirmForId] = useState<string | null>(null);
  const deleteConfirmTimerRef = useRef<any>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [justResolvedId, setJustResolvedId] = useState<string | null>(null);
  const [justSnoozedId, setJustSnoozedId] = useState<string | null>(null);
  const resolvedTimerRef = useRef<any>(null);

  const realtorId = props.realtorId;
  const leadId = props.leadId;

  useEffect(() => {
    return () => {
      if (resolvedTimerRef.current) {
        clearTimeout(resolvedTimerRef.current);
        resolvedTimerRef.current = null;
      }

      if (deleteConfirmTimerRef.current) {
        clearTimeout(deleteConfirmTimerRef.current);
        deleteConfirmTimerRef.current = null;
      }

      if (delayedRefreshRef.current) {
        clearTimeout(delayedRefreshRef.current);
        delayedRefreshRef.current = null;
      }

      try {
        const timers = successTimersRef.current || {};
        Object.keys(timers).forEach((k) => {
          try {
            clearTimeout(timers[k]);
          } catch {
          }
        });
      } catch {
      }
    };
  }, []);

  const visibleItems = useMemo(() => {
    return items.filter(
      (i) =>
        i.status === "ACTIVE" ||
        !!successById[String(i.id)] ||
        (justResolvedId && i.id === justResolvedId) ||
        (justSnoozedId && i.id === justSnoozedId)
    );
  }, [items, justResolvedId, justSnoozedId, successById]);

  useEffect(() => {
    if (!aiForId) return;

    const exists = items.some((i) => String(i.id) === String(aiForId));
    if (exists) return;

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
  }, [aiForId, aiLoadingId, items]);

  useEffect(() => {
    if (!aiForId) return;

    const existing = items.find((i) => String(i.id) === String(aiForId)) || null;
    const t = existing?.type || aiItemSnapshot?.type || null;
    if (!isInternalChecklistType(t)) return;

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
  }, [aiForId, aiItemSnapshot?.type, aiLoadingId, items]);

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
      const nowMs = Date.now();
      const rawItems = Array.isArray(data.items) ? data.items : [];
      const filtered = rawItems.filter((it: any) => {
        const id = String(it?.id || "");
        const until = optimisticHideRef.current[id];
        if (!until) return true;
        if (until > nowMs) return false;
        try {
          delete optimisticHideRef.current[id];
        } catch {
        }
        return true;
      });
      setItems(filtered);
    } catch (err: any) {
      setItems([]);
      setError(err?.message || "Não conseguimos carregar o Assistente agora.");
    } finally {
      setLoading(false);
    }
  }, [realtorId, leadId]);

  const showSuccess = useCallback((id: string, message: string) => {
    const itemId = String(id || "").trim();
    if (!itemId) return;

    setSuccessById((prev) => ({
      ...prev,
      [itemId]: { message },
    }));

    try {
      if (successTimersRef.current[itemId]) {
        clearTimeout(successTimersRef.current[itemId]);
      }
    } catch {
    }

    successTimersRef.current[itemId] = setTimeout(() => {
      setSuccessById((prev) => {
        if (!prev[itemId]) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      try {
        delete successTimersRef.current[itemId];
      } catch {
      }
    }, 2000);
  }, []);

  const resolveItemsOptimistically = useCallback(
    (ids: string[]) => {
      const unique = Array.from(new Set((ids || []).map((x) => String(x || "")).filter(Boolean)));
      if (unique.length === 0) return;

      const until = Date.now() + 6000;
      unique.forEach((id) => {
        optimisticHideRef.current[String(id)] = until;
      });

      setItems((prev) =>
        prev.map((it) => {
          if (!unique.includes(String(it.id))) return it;
          if (it.status === "RESOLVED") return it;
          return { ...it, status: "RESOLVED" };
        })
      );

      if (aiForId && unique.includes(String(aiForId))) {
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
      }

      unique.forEach((id) => {
        fetch(`/api/assistant/items/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resolve" }),
          keepalive: true,
        }).catch(() => null);
      });
    },
    [aiForId, aiLoadingId]
  );

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

        const idsToResolve = items
          .filter(
            (it) =>
              String(it.leadId || "") === String(params.leadId) &&
              it.status === "ACTIVE" &&
              shouldAutoResolveOnReply(it.type)
          )
          .map((it) => String(it.id));
        resolveItemsOptimistically([String(params.ownerId), ...idsToResolve]);

        showSuccess(String(params.ownerId), "Mensagem enviada");

        setRepliedForId(params.ownerId);
        if (repliedTimerRef.current) clearTimeout(repliedTimerRef.current);
        repliedTimerRef.current = setTimeout(() => {
          setRepliedForId(null);
        }, 2000);

        etagRef.current = null;
        props.onDidMutate?.();
        if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current);
        delayedRefreshRef.current = setTimeout(() => {
          etagRef.current = null;
          fetchItems();
        }, 1200);
      } catch (err: any) {
        setError(err?.message || "Não conseguimos enviar esta mensagem agora.");
      } finally {
        setReplyingForId(null);
      }
    },
    [fetchItems, items, props, resolveItemsOptimistically, showSuccess]
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
  }, [realtorId, fetchItems]);

  const performAction = async (itemId: string, payload: { action: "resolve" | "snooze"; minutes?: number }) => {
    try {
      setActingId(itemId);
      setError(null);
      const response = await fetch(`/api/assistant/items/${encodeURIComponent(itemId)}`, {
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

      if (payload?.action === "resolve" && data?.item?.id) {
        optimisticHideRef.current[String(data.item.id)] = Date.now() + 6000;
        showSuccess(String(data.item.id), "Resolvido");
        if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current);
        delayedRefreshRef.current = setTimeout(() => {
          etagRef.current = null;
          fetchItems();
        }, 1200);
        return;
      }

      if (payload?.action === "snooze" && data?.item?.id) {
        showSuccess(String(data.item.id), "Ok, lembrete adiado");
        if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current);
        delayedRefreshRef.current = setTimeout(() => {
          etagRef.current = null;
          fetchItems();
        }, 1200);
        return;
      }

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

    resolveItemsOptimistically([String(item.id)]);

    if (action.type === "OPEN_CHAT") {
      showSuccess(String(item.id), "Abrindo conversa");
    } else {
      showSuccess(String(item.id), "Abrindo lead");
    }

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

  const requestDeleteLead = async (item: AssistantItem) => {
    const leadId = item.leadId ? String(item.leadId) : null;
    if (!leadId) return;

    if (deleteConfirmForId !== item.id) {
      setDeleteConfirmForId(item.id);
      if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current);
      deleteConfirmTimerRef.current = setTimeout(() => {
        setDeleteConfirmForId(null);
      }, 4500);
      return;
    }

    try {
      setError(null);
      setActingId(item.id);

      const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        const msg =
          json?.error ||
          (res.status === 401
            ? "Sua sessão expirou. Entre novamente e tente de novo."
            : res.status === 403
              ? "Você não tem permissão para excluir este lead."
              : res.status === 404
                ? "Este lead não existe mais (provavelmente já foi removido)."
                : "Não conseguimos excluir este lead agora.");
        throw new Error(msg);
      }

      const idsToResolve = items
        .filter((it) => String(it.leadId || "") === String(leadId) && it.status === "ACTIVE")
        .map((it) => String(it.id));
      resolveItemsOptimistically(idsToResolve.length > 0 ? idsToResolve : [String(item.id)]);

      showSuccess(String(item.id), "Lead excluído");

      setDeleteConfirmForId(null);
      etagRef.current = null;
      props.onDidMutate?.();
      if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current);
      delayedRefreshRef.current = setTimeout(() => {
        etagRef.current = null;
        fetchItems();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Não conseguimos excluir este lead agora.");
    } finally {
      setActingId(null);
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
          Sem pendências. Você será avisado quando houver mensagens sem resposta, visitas próximas ou lembretes vencidos.
        </div>
      )}

      {visibleItems.length > 0 && (
        <div className={props.embedded ? "space-y-3" : "mt-4 space-y-3"}>
          {!aiVisibleItem &&
            aiForId &&
            (aiError || (aiResult && aiResult.itemId === aiForId)) &&
            !isInternalChecklistType(aiItemSnapshot?.type) && (
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
                      <p className="text-[11px] font-semibold text-gray-900">{getAiDraftSectionTitle(aiItemSnapshot?.type)}</p>
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

            const leadGroups = (() => {
              const map = new Map<string, AssistantItem[]>();
              for (const it of group) {
                const key = it.leadId ? `lead:${String(it.leadId)}` : `item:${String(it.id)}`;
                const arr = map.get(key) || [];
                arr.push(it);
                map.set(key, arr);
              }
              return Array.from(map.entries()).map(([key, items]) => {
                const sorted = [...items].sort((a, b) => {
                  const sa = typeof a.impactScore === "number" ? a.impactScore : 0;
                  const sb = typeof b.impactScore === "number" ? b.impactScore : 0;
                  if (sb !== sa) return sb - sa;
                  const da = a.dueAt ? new Date(a.dueAt) : null;
                  const db = b.dueAt ? new Date(b.dueAt) : null;
                  const ta = da && !Number.isNaN(da.getTime()) ? da.getTime() : Number.POSITIVE_INFINITY;
                  const tb = db && !Number.isNaN(db.getTime()) ? db.getTime() : Number.POSITIVE_INFINITY;
                  if (ta !== tb) return ta - tb;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
                return { key, items: sorted };
              });
            })();

            return (
              <div key={`cat-${category}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-gray-700">{category}</p>
                  <p className="text-[11px] font-semibold text-gray-500">{leadGroups.length}</p>
                </div>
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                  {leadGroups.map((leadGroup) => {
                    const item = leadGroup.items[0];
                    const subtasks = leadGroup.items.slice(1);
                    const dueLabel = formatShortDateTime(item.dueAt || null);
                    const snoozeLabel = item.status === "SNOOZED" ? formatShortDateTime(item.snoozedUntil || null) : null;
                    const openChatAction: AssistantAction | null = item.leadId
                      ? { type: "OPEN_CHAT", leadId: item.leadId }
                      : null;
                    const openLeadAction: AssistantAction | null = item.leadId
                      ? { type: "OPEN_LEAD", leadId: item.leadId }
                      : null;
                    const taskLabel = getRealtorAssistantTaskLabel(item.type);
                    const isReminder = isReminderType(item.type);
                    const isInternalChecklist = isInternalChecklistType(item.type);
                    const resolveLabel = isInternalChecklist ? "Marcar como feito" : "Resolver";
                    const resolveTitle = isInternalChecklist ? "Marcar como feito" : "Marcar como resolvido";
                    const isResolvedPreview = justResolvedId === item.id && item.status === "RESOLVED";
                    const isSnoozedPreview = justSnoozedId === item.id && item.status === "SNOOZED";
                    const isTransientPreview = isResolvedPreview || isSnoozedPreview;

                    const now = new Date();
                    let stateLabel: string | null = null;
                    let stateTone: "overdue" | "today" | "tomorrow" | "snoozed" | "due" | null = null;

                    if (item.status === "SNOOZED" && snoozeLabel) {
                      stateLabel = `Sonecado até ${snoozeLabel}`;
                      stateTone = "snoozed";
                    } else if (isResolvedPreview) {
                      stateLabel = "Feito";
                      stateTone = "due";
                    } else if (item.status === "ACTIVE" && item.dueAt) {
                      const d = new Date(item.dueAt);
                      if (!Number.isNaN(d.getTime())) {
                        if (d.getTime() < now.getTime()) {
                          stateLabel = "Vencido";
                          stateTone = "overdue";
                        } else if (isSameDay(d, now)) {
                          stateLabel = "Hoje";
                          stateTone = "today";
                        } else if (isSameDay(d, new Date(startOfDay(now).getTime() + 24 * 60 * 60 * 1000))) {
                          stateLabel = "Amanhã";
                          stateTone = "tomorrow";
                        } else if (dueLabel) {
                          stateLabel = `Vence em ${dueLabel}`;
                          stateTone = "due";
                        }
                      }
                    }

                    const stateClasses =
                      stateTone === "overdue"
                        ? "bg-red-50 text-red-700 border-red-100"
                        : stateTone === "today"
                          ? "bg-amber-50 text-amber-800 border-amber-100"
                          : stateTone === "tomorrow"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : stateTone === "snoozed"
                              ? "bg-gray-50 text-gray-700 border-gray-200"
                              : "bg-gray-50 text-gray-700 border-gray-200";

                    const responderIsPrimary = item.type === "UNANSWERED_CLIENT_MESSAGE";
                    const primaryOpenAction = responderIsPrimary ? openChatAction : openLeadAction;
                    const PrimaryOpenIcon = primaryOpenAction ? getActionIcon(primaryOpenAction) : null;

                    const messageIsLong = String(item.message || "").trim().length > 120;
                    const isExpanded = expandedId === item.id;

                    const effectivePriority =
                      item.status === "ACTIVE" && stateTone === "overdue" ? "HIGH" : item.priority;

                    const priorityLabel = getPriorityLabel(effectivePriority);
                    const chipText = `Prioridade ${priorityLabel}${stateLabel ? ` · ${stateLabel}` : ""}`;

                    const priorityDotClass =
                      effectivePriority === "HIGH"
                        ? "bg-red-500"
                        : effectivePriority === "MEDIUM"
                          ? "bg-amber-500"
                          : "bg-gray-400";

                    const chipClasses =
                      effectivePriority === "HIGH"
                        ? "bg-red-50 text-red-700 border-red-100"
                        : effectivePriority === "MEDIUM"
                          ? "bg-amber-50 text-amber-800 border-amber-100"
                          : "bg-gray-50 text-gray-700 border-gray-200";

                    const successState = successById[String(item.id)];

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.18 }}
                        className={
                          successState
                            ? "rounded-[26px] border border-emerald-200/70 bg-emerald-50 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                            : "rounded-[26px] border border-gray-200/70 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                        }
                      >
                        {successState ? (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/80 border border-emerald-200 text-emerald-700">
                                <CheckCircle2 className="w-5 h-5" />
                              </span>
                              <div>
                                <p className="text-[13px] font-extrabold text-emerald-900">Tudo certo</p>
                                <p className="mt-0.5 text-[12px] font-semibold text-emerald-800">{successState.message}</p>
                              </div>
                            </div>
                            <p className="text-[11px] font-semibold text-emerald-700">2s</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border ${chipClasses}`}>
                                  <span className={`inline-block w-2 h-2 rounded-full ${priorityDotClass}`} />
                                  {chipText}
                                </span>
                              </div>

                              <div className="relative" data-snooze-root="true">
                                <button
                                  type="button"
                                  disabled={actingId === item.id || isTransientPreview || item.status !== "ACTIVE"}
                                  onClick={() => setSnoozeMenuFor((prev) => (prev === item.id ? null : item.id))}
                                  className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                  title="Lembrar depois"
                                >
                                  <Clock className="w-5 h-5" />
                                </button>

                                {snoozeMenuFor === item.id && (
                                  <div className="absolute right-0 mt-2 w-36 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden z-20">
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

                        <div className="mt-4">
                          <p className="text-[22px] leading-7 font-extrabold text-gray-900">{item.title}</p>

                          {(dueLabel || snoozeLabel) && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                              <CalendarDays className="w-4.5 h-4.5" />
                              <span>{snoozeLabel || dueLabel}</span>
                            </div>
                          )}

                          <div className="mt-4">
                            <p className="text-sm text-gray-500">Próxima ação sugerida:</p>
                            <div className={isInternalChecklist ? "mt-1 flex items-start gap-2" : "mt-1"}>
                              {isReminder && <Phone className="w-4 h-4 text-gray-400 mt-1" />}
                              <p
                                className={
                                  isInternalChecklist
                                    ? `text-[15px] leading-6 font-semibold text-gray-900 ${isExpanded ? "" : "line-clamp-3"}`
                                    : `text-[15px] leading-6 font-medium text-gray-800 ${isExpanded ? "" : "line-clamp-3"}`
                                }
                              >
                                {item.message}
                              </p>
                            </div>
                            {messageIsLong && (
                              <button
                                type="button"
                                onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
                                className="mt-1 text-[12px] font-semibold text-blue-700 hover:text-blue-800"
                              >
                                {isExpanded ? "Ver menos" : "Ver mais"}
                              </button>
                            )}
                          </div>
                        </div>

                        {subtasks.length > 0 && (
                          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] font-semibold text-gray-800">Outras pendências deste lead</p>
                              <p className="text-[11px] font-semibold text-gray-500">{subtasks.length}</p>
                            </div>
                            <div className="mt-3 space-y-2">
                              {subtasks.map((st) => {
                                const stOpenChatAction: AssistantAction | null = st.leadId
                                  ? { type: "OPEN_CHAT", leadId: st.leadId }
                                  : null;
                                const stOpenLeadAction: AssistantAction | null = st.leadId
                                  ? { type: "OPEN_LEAD", leadId: st.leadId }
                                  : null;
                                const stIsResponder = st.type === "UNANSWERED_CLIENT_MESSAGE";
                                const stPrimaryOpen = stIsResponder ? stOpenChatAction : stOpenLeadAction;
                                const StOpenIcon = stPrimaryOpen ? getActionIcon(stPrimaryOpen) : null;

                                return (
                                  <div key={st.id} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-[12px] font-semibold text-gray-900">{st.title}</p>
                                        <p className="mt-0.5 text-[11px] text-gray-600 line-clamp-2">{st.message}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {stPrimaryOpen && (
                                          <button
                                            type="button"
                                            disabled={isTransientPreview || st.status !== "ACTIVE"}
                                            onClick={() => handleOpenAction(stPrimaryOpen, st)}
                                            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                            title={getActionLabel(stPrimaryOpen, st)}
                                          >
                                            {StOpenIcon && <StOpenIcon className="w-4 h-4" />}
                                          </button>
                                        )}

                                        <div className="relative" data-snooze-root="true">
                                          <button
                                            type="button"
                                            disabled={actingId === st.id || isTransientPreview || st.status !== "ACTIVE"}
                                            onClick={() => setSnoozeMenuFor((prev) => (prev === st.id ? null : st.id))}
                                            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                            title="Lembrar depois"
                                          >
                                            <Clock className="w-4 h-4" />
                                          </button>

                                          {snoozeMenuFor === st.id && (
                                            <div className="absolute right-0 mt-2 w-36 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden z-20">
                                              {snoozeOptions.map((opt) => (
                                                <button
                                                  key={opt.minutes}
                                                  type="button"
                                                  disabled={actingId === st.id}
                                                  onClick={async () => {
                                                    setSnoozeMenuFor(null);
                                                    await performAction(st.id, { action: "snooze", minutes: opt.minutes });
                                                  }}
                                                  className="w-full text-left px-3 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                                >
                                                  {opt.label}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          disabled={actingId === st.id || isTransientPreview || st.status !== "ACTIVE"}
                                          onClick={() => performAction(st.id, { action: "resolve" })}
                                          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                          title="Marcar como concluído"
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={actingId === item.id || isTransientPreview || item.status !== "ACTIVE"}
                              onClick={() => performAction(item.id, { action: "resolve" })}
                              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
                              title={resolveTitle}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                              {isResolvedPreview ? "Feito" : isReminder ? "Concluir" : resolveLabel}
                            </button>

                            {!!item.leadId && !isReminder && (
                              <button
                                type="button"
                                disabled={actingId === item.id || isTransientPreview || item.status !== "ACTIVE"}
                                onClick={() => requestDeleteLead(item)}
                                className={
                                  deleteConfirmForId === item.id
                                    ? "inline-flex items-center gap-2 px-5 py-3 rounded-full border border-red-200 bg-red-50 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                                    : "inline-flex items-center gap-2 px-5 py-3 rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
                                }
                                title={
                                  deleteConfirmForId === item.id
                                    ? "Clique novamente para excluir permanentemente"
                                    : "Excluir lead"
                                }
                              >
                                <Trash2 className="w-5 h-5" />
                                {deleteConfirmForId === item.id ? "Confirmar" : "Excluir lead"}
                              </button>
                            )}

                            {isReminder ? (
                              openLeadAction && (
                                <button
                                  type="button"
                                  disabled={isTransientPreview || item.status !== "ACTIVE"}
                                  onClick={() => handleOpenAction(openLeadAction, item)}
                                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full glass-teal text-white text-sm font-bold disabled:opacity-60"
                                >
                                  <Eye className="w-5 h-5" />
                                  {getActionLabel(openLeadAction, item)}
                                </button>
                              )
                            ) : (
                              <>
                                {responderIsPrimary && openChatAction && (
                                  <button
                                    type="button"
                                    disabled={isTransientPreview || item.status !== "ACTIVE"}
                                    onClick={() => handleOpenAction(openChatAction, item)}
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full glass-teal text-white text-sm font-bold disabled:opacity-60"
                                  >
                                    <MessageCircle className="w-5 h-5" />
                                    {getActionLabel(openChatAction, item)}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={aiLoadingId === item.id || isTransientPreview || item.status !== "ACTIVE"}
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
                                  className={
                                    responderIsPrimary
                                      ? "inline-flex items-center gap-2 px-5 py-3 rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
                                      : "inline-flex items-center gap-2 px-5 py-3 rounded-full glass-teal text-white text-sm font-bold disabled:opacity-60"
                                  }
                                >
                                  <Sparkles className="w-5 h-5" />
                                  {aiLoadingId === item.id ? "Gerando..." : taskLabel}
                                </button>

                                {!responderIsPrimary && primaryOpenAction && (
                                  <button
                                    type="button"
                                    disabled={isTransientPreview || item.status !== "ACTIVE"}
                                    onClick={() => handleOpenAction(primaryOpenAction, item)}
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
                                  >
                                    {PrimaryOpenIcon && <PrimaryOpenIcon className="w-5 h-5" />}
                                    {getActionLabel(primaryOpenAction, item)}
                                  </button>
                                )}

                                {responderIsPrimary && openLeadAction && (
                                  <button
                                    type="button"
                                    disabled={isTransientPreview || item.status !== "ACTIVE"}
                                    onClick={() => handleOpenAction(openLeadAction, item)}
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
                                  >
                                    <Eye className="w-5 h-5" />
                                    {getActionLabel(openLeadAction, item)}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {!isReminder && aiForId === item.id && (aiError || (aiResult && aiResult.itemId === item.id)) && (
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
                                    <p className="text-[11px] font-semibold text-gray-900">{getAiDraftSectionTitle(item.type)}</p>
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
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
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
