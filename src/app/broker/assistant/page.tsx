"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, CalendarClock, ClipboardList, Copy, MoreHorizontal, Send, Sparkles, Users } from "lucide-react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import RealtorAssistantFeed from "@/components/crm/RealtorAssistantFeed";
import { getPusherClient } from "@/lib/pusher-client";

type CategoryKey = "ALL" | "Leads" | "Visitas" | "Lembretes" | "Outros";

type Counts = {
  ALL: number;
  Leads: number;
  Visitas: number;
  Lembretes: number;
  Outros: number;
};

type AssistantItem = {
  id: string;
  leadId?: string | null;
  type: string;
  title: string;
  message: string;
  status: "ACTIVE" | "SNOOZED" | "RESOLVED" | "DISMISSED";
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

type BatchRow = {
  item: AssistantItem;
  status: "pending" | "ok" | "error";
  ai?: AiAssistResult | null;
  error?: string | null;
  sending?: boolean;
  sent?: boolean;
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

export default function BrokerAssistantPage() {
  const { data: session, status } = useSession();
  const role = (session as any)?.user?.role || (session as any)?.role;
  const realtorId = (session as any)?.user?.id || (session as any)?.userId || "";

  const [category, setCategory] = useState<CategoryKey>("ALL");
  const [query, setQuery] = useState<string>("");
  const [priority, setPriority] = useState<"" | "LOW" | "MEDIUM" | "HIGH">("");
  const [includeSnoozed, setIncludeSnoozed] = useState(true);
  const [snoozedCount, setSnoozedCount] = useState(0);
  const [counts, setCounts] = useState<Counts>({
    ALL: 0,
    Leads: 0,
    Visitas: 0,
    Lembretes: 0,
    Outros: 0,
  });
  const statsEtagRef = useRef<string | null>(null);

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchLimit, setBatchLimit] = useState(5);
  const [batchOnlyLeadMessages, setBatchOnlyLeadMessages] = useState(true);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const recordAssistantEvent = useCallback(
    (input: {
      event: "DRAFT_COPIED" | "DRAFT_SENT" | "DRAFT_EDITED";
      itemId: string;
      leadId?: string | null;
      itemType?: string | null;
      metadata?: Record<string, any>;
    }) => {
      try {
        fetch(`/api/assistant/events?context=REALTOR`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: input.event,
            itemId: String(input.itemId),
            context: "REALTOR",
            leadId: input.leadId ? String(input.leadId) : undefined,
            itemType: input.itemType ? String(input.itemType) : undefined,
            metadata: input.metadata || undefined,
          }),
          keepalive: true,
        }).catch(() => null);
      } catch {
      }
    },
    []
  );

  const fetchStats = useCallback(async () => {
    if (!realtorId) return;
    try {
      const response = await fetch(
        "/api/assistant/stats",
        statsEtagRef.current ? { headers: { "if-none-match": statsEtagRef.current } } : undefined
      );

      if (response.status === 304) return;

      const etag = response.headers.get("etag");
      if (etag) statsEtagRef.current = etag;

      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success || !json?.counts) {
        return;
      }

      const next = json.counts as Counts;
      setSnoozedCount(Number(json?.snoozedCount || 0));
      setCounts({
        ALL: Number(next.ALL || 0),
        Leads: Number(next.Leads || 0),
        Visitas: Number(next.Visitas || 0),
        Lembretes: Number(next.Lembretes || 0),
        Outros: Number(next.Outros || 0),
      });
    } catch {
    }
  }, [realtorId]);

  const navItems = useMemo(() => {
    return [
      { key: "ALL" as const, label: "Inbox", icon: ClipboardList, count: counts.ALL },
      { key: "Leads" as const, label: "Leads", icon: Users, count: counts.Leads },
      { key: "Visitas" as const, label: "Visitas", icon: CalendarClock, count: counts.Visitas },
      { key: "Lembretes" as const, label: "Lembretes", icon: Bell, count: counts.Lembretes },
      { key: "Outros" as const, label: "Outros", icon: MoreHorizontal, count: counts.Outros },
    ];
  }, [counts]);

  const canAccess = role === "REALTOR" || role === "ADMIN";

  const runBatchGenerate = useCallback(async () => {
    if (!realtorId) return;
    if (batchGenerating) return;
    setBatchError(null);
    setBatchGenerating(true);
    setBatchRows([]);

    try {
      const search = new URLSearchParams();
      search.set("limit", "200");
      search.set("order", "PRIORITY");
      const q = query ? String(query).trim() : "";
      if (q) search.set("q", q);
      if (category && category !== "ALL") search.set("category", String(category));
      if (priority) search.set("priority", String(priority));
      search.set("includeSnoozed", includeSnoozed ? "1" : "0");

      const listRes = await fetch(`/api/assistant/items?${search.toString()}`);
      const listJson = await listRes.json().catch(() => null);
      if (!listRes.ok || !listJson?.success) {
        throw new Error(listJson?.error || "Não conseguimos carregar os itens do assistente.");
      }

      const rawItems = Array.isArray(listJson.items) ? (listJson.items as any[]) : [];
      const normalized: AssistantItem[] = rawItems
        .map((it: any) => ({
          id: String(it?.id || ""),
          leadId: it?.leadId ? String(it.leadId) : null,
          type: String(it?.type || ""),
          title: String(it?.title || ""),
          message: String(it?.message || ""),
          status: String(it?.status || "ACTIVE") as any,
        }))
        .filter((it) => it.id && (it.status === "ACTIVE" || it.status === "SNOOZED"));

      const filtered = (batchOnlyLeadMessages
        ? normalized.filter((it) => !!it.leadId && canSendAiDraftToClient(it.type))
        : normalized
      ).slice(0, Math.max(1, Math.min(10, Math.floor(Number(batchLimit) || 5))));

      if (filtered.length === 0) {
        setBatchRows([]);
        return;
      }

      setBatchRows(filtered.map((item) => ({ item, status: "pending", ai: null, error: null })));

      for (const item of filtered) {
        try {
          const genRes = await fetch(`/api/assistant/items/${encodeURIComponent(item.id)}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const genJson = await genRes.json().catch(() => null);
          if (!genRes.ok || !genJson?.success) {
            throw new Error(genJson?.error || "Falha ao gerar sugestão.");
          }
          const data = genJson?.data as AiAssistResult | undefined;
          if (!data?.itemId || !data?.draft) {
            throw new Error("Resposta inválida da IA.");
          }

          setBatchRows((prev) =>
            prev.map((r) => (r.item.id === item.id ? { ...r, status: "ok", ai: data, error: null } : r))
          );
        } catch (err: any) {
          setBatchRows((prev) =>
            prev.map((r) =>
              r.item.id === item.id
                ? { ...r, status: "error", ai: null, error: err?.message || "Falha ao gerar." }
                : r
            )
          );
        }
      }
    } catch (err: any) {
      setBatchError(err?.message || "Não conseguimos gerar sugestões em lote.");
    } finally {
      setBatchGenerating(false);
    }
  }, [batchGenerating, batchLimit, batchOnlyLeadMessages, category, includeSnoozed, priority, query, realtorId]);

  const runBatchGenerateSelected = useCallback(async () => {
    if (!realtorId) return;
    if (batchGenerating) return;
    const ids = Array.from(new Set((selectedIds || []).map((x) => String(x)).filter(Boolean)));
    if (ids.length === 0) return;
    setBatchError(null);
    setBatchGenerating(true);
    setBatchRows([]);

    try {
      const search = new URLSearchParams();
      search.set("limit", "200");
      search.set("order", "PRIORITY");
      const q = query ? String(query).trim() : "";
      if (q) search.set("q", q);
      if (category && category !== "ALL") search.set("category", String(category));
      if (priority) search.set("priority", String(priority));
      search.set("includeSnoozed", includeSnoozed ? "1" : "0");

      const listRes = await fetch(`/api/assistant/items?${search.toString()}`);
      const listJson = await listRes.json().catch(() => null);
      if (!listRes.ok || !listJson?.success) {
        throw new Error(listJson?.error || "Não conseguimos carregar os itens do assistente.");
      }

      const rawItems = Array.isArray(listJson.items) ? (listJson.items as any[]) : [];
      const normalized: AssistantItem[] = rawItems
        .map((it: any) => ({
          id: String(it?.id || ""),
          leadId: it?.leadId ? String(it.leadId) : null,
          type: String(it?.type || ""),
          title: String(it?.title || ""),
          message: String(it?.message || ""),
          status: String(it?.status || "ACTIVE") as any,
        }))
        .filter((it) => it.id);

      const itemsById = new Map(normalized.map((it) => [String(it.id), it]));
      const selected = ids
        .map((id) => itemsById.get(String(id)) || null)
        .filter(Boolean) as AssistantItem[];

      if (selected.length === 0) {
        setBatchRows([]);
        return;
      }

      setBatchRows(selected.map((item) => ({ item, status: "pending", ai: null, error: null })));

      for (const item of selected) {
        try {
          const genRes = await fetch(`/api/assistant/items/${encodeURIComponent(item.id)}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const genJson = await genRes.json().catch(() => null);
          if (!genRes.ok || !genJson?.success) {
            throw new Error(genJson?.error || "Falha ao gerar sugestão.");
          }
          const data = genJson?.data as AiAssistResult | undefined;
          if (!data?.itemId || !data?.draft) {
            throw new Error("Resposta inválida da IA.");
          }

          setBatchRows((prev) =>
            prev.map((r) => (r.item.id === item.id ? { ...r, status: "ok", ai: data, error: null } : r))
          );
        } catch (err: any) {
          setBatchRows((prev) =>
            prev.map((r) =>
              r.item.id === item.id
                ? { ...r, status: "error", ai: null, error: err?.message || "Falha ao gerar." }
                : r
            )
          );
        }
      }
    } catch (err: any) {
      setBatchError(err?.message || "Não conseguimos gerar sugestões em lote.");
    } finally {
      setBatchGenerating(false);
    }
  }, [batchGenerating, category, includeSnoozed, priority, query, realtorId, selectedIds]);

  const sendBatchDraft = useCallback(
    async (row: BatchRow) => {
      const leadId = row.item.leadId ? String(row.item.leadId) : "";
      const content = row.ai?.draft ? String(row.ai.draft).trim() : "";
      if (!leadId || !content) return;

      setBatchRows((prev) => prev.map((r) => (r.item.id === row.item.id ? { ...r, sending: true } : r)));
      try {
        const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}/client-messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.message?.id) {
          throw new Error(data?.error || "Não conseguimos enviar esta mensagem agora.");
        }

        try {
          recordAssistantEvent({
            event: "DRAFT_SENT",
            itemId: String(row.item.id),
            leadId,
            itemType: row.item.type,
            metadata: { source: "batch_assist" },
          });
        } catch {
        }

        try {
          fetch(`/api/assistant/items/${encodeURIComponent(row.item.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "resolve" }),
            keepalive: true,
          }).catch(() => null);
        } catch {
        }

        setBatchRows((prev) =>
          prev.map((r) => (r.item.id === row.item.id ? { ...r, sending: false, sent: true } : r))
        );
      } catch (err: any) {
        setBatchError(err?.message || "Não conseguimos enviar esta mensagem agora.");
      } finally {
        setBatchRows((prev) => prev.map((r) => (r.item.id === row.item.id ? { ...r, sending: false } : r)));
      }
    },
    [recordAssistantEvent]
  );

  useEffect(() => {
    if (!realtorId || !canAccess) return;
    fetchStats();

    let cancelled = false;
    let interval: any;
    interval = setInterval(() => {
      if (cancelled) return;
      fetchStats();
    }, 180000);

    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${realtorId}`;
      const channel = pusher.subscribe(channelName);
      const handler = () => {
        if (cancelled) return;
        fetchStats();
      };
      channel.bind("assistant-updated", handler as any);

      return () => {
        cancelled = true;
        clearInterval(interval);
        try {
          channel.unbind("assistant-updated", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
        }
      };
    } catch {
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, [realtorId, canAccess, fetchStats]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {status === "loading" && <CenteredSpinner />}

      {status !== "loading" && (!realtorId || !canAccess) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm font-semibold text-gray-900">Acesso negado</p>
          <p className="mt-1 text-sm text-gray-600">Faça login como corretor para acessar o Assistente.</p>
        </div>
      )}

      {status !== "loading" && realtorId && canAccess && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="lg:sticky lg:top-28 h-fit">
            <div className="rounded-3xl border border-gray-200/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-4">
              <p className="text-[12px] font-extrabold text-gray-900">Categorias</p>
              <div className="mt-3 space-y-1">
                {navItems.map((it) => {
                  const active = it.key === category;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => setCategory(it.key)}
                      className={
                        active
                          ? "w-full flex items-center justify-between rounded-2xl px-3 py-2 bg-gray-900 text-white"
                          : "w-full flex items-center justify-between rounded-2xl px-3 py-2 text-gray-900 hover:bg-gray-50"
                      }
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={
                            active
                              ? "inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/10"
                              : "inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 border border-gray-200"
                          }
                        >
                          <Icon className={active ? "w-4.5 h-4.5" : "w-4.5 h-4.5 text-gray-700"} />
                        </span>
                        <span className={active ? "text-sm font-bold" : "text-sm font-semibold"}>{it.label}</span>
                      </span>
                      <span
                        className={
                          active
                            ? "min-w-[28px] h-7 px-2 rounded-full bg-white/15 text-white text-xs font-bold flex items-center justify-center"
                            : "min-w-[28px] h-7 px-2 rounded-full bg-gray-100 text-gray-800 text-xs font-bold flex items-center justify-center"
                        }
                      >
                        {it.count > 99 ? "99+" : it.count}
                      </span>
                    </button>
                  );
                })}
              </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
                  <p className="text-[11px] font-semibold text-gray-900">Dica</p>
                  <p className="mt-1 text-[11px] text-gray-700">
                    Use as categorias para focar em um tipo de pendência por vez e manter o feed limpo.
                  </p>
                </div>

              </div>
          </aside>

          <section className="min-w-0">
            <div className="rounded-3xl border border-gray-200/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900 truncate">
                      {category === "ALL" ? "Inbox" : category}
                    </p>
                    <p className="mt-0.5 text-[12px] font-semibold text-gray-600">
                      {category === "ALL"
                        ? `${counts.ALL} pendência${counts.ALL === 1 ? "" : "s"}`
                        : `${counts[category]} pendência${counts[category] === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por título ou mensagem..."
                      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={priority}
                      onChange={(e) => setPriority((e.target.value || "") as any)}
                      className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      aria-label="Prioridade"
                    >
                      <option value="">Todas</option>
                      <option value="HIGH">Alta</option>
                      <option value="MEDIUM">Média</option>
                      <option value="LOW">Baixa</option>
                    </select>

                    {snoozedCount > 0 && (
                      <label className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900">
                        <input
                          type="checkbox"
                          checked={includeSnoozed}
                          onChange={(e) => setIncludeSnoozed(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Mostrar adiados
                      </label>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setBatchOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 text-left"
                  >
                    <span className="inline-flex items-center gap-2 text-[12px] font-extrabold text-gray-900">
                      <Sparkles className="w-4 h-4" />
                      Automações assistidas (beta)
                    </span>
                    <span className="text-[11px] font-semibold text-gray-600">
                      {batchOpen ? "Fechar" : "Abrir"}
                    </span>
                  </button>

                  {batchOpen && (
                    <div className="mt-3">
                      {batchError && <div className="mb-2 text-[12px] font-semibold text-red-700">{batchError}</div>}

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-gray-800">
                          Quantidade
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={batchLimit}
                            onChange={(e) => setBatchLimit(Math.max(1, Math.min(10, Number(e.target.value || 5))))}
                            className="w-20 rounded-xl border border-gray-200 bg-white px-2 py-1 text-[12px]"
                          />
                        </label>

                        <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={batchOnlyLeadMessages}
                            onChange={(e) => setBatchOnlyLeadMessages(e.target.checked)}
                            className="h-4 w-4"
                          />
                          Apenas itens com mensagem para lead
                        </label>

                        <button
                          type="button"
                          disabled={batchGenerating}
                          onClick={() => runBatchGenerate()}
                          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60"
                        >
                          <Sparkles className="w-4 h-4" />
                          {batchGenerating ? "Gerando..." : "Gerar em lote"}
                        </button>
                      </div>

                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-[12px] font-semibold text-gray-700">
                          Selecionados no feed: <span className="font-extrabold text-gray-900">{selectedIds.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={batchGenerating || selectedIds.length === 0}
                            onClick={() => runBatchGenerateSelected()}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60"
                          >
                            <Sparkles className="w-4 h-4" />
                            {batchGenerating ? "Gerando..." : "Gerar para selecionados"}
                          </button>
                          <button
                            type="button"
                            disabled={selectedIds.length === 0}
                            onClick={() => setSelectedIds([])}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12px] font-bold text-gray-900 disabled:opacity-60"
                          >
                            Limpar seleção
                          </button>
                        </div>
                      </div>

                      {batchRows.length > 0 && (
                        <div className="mt-3 space-y-3">
                          {batchRows.map((row) => {
                            const canSend = !!row.item.leadId && canSendAiDraftToClient(row.item.type) && !!row.ai?.draft;
                            return (
                              <div key={row.item.id} className="rounded-2xl border border-gray-200 bg-white p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[12px] font-extrabold text-gray-900">{row.item.title}</div>
                                    <div className="mt-0.5 text-[12px] text-gray-700">{row.item.message}</div>
                                    <div className="mt-1 text-[11px] font-semibold text-gray-500">{row.item.type}</div>
                                  </div>
                                  <div className="shrink-0 text-[11px] font-semibold text-gray-600">
                                    {row.status === "pending" ? "Gerando..." : row.status === "error" ? "Erro" : "Pronto"}
                                  </div>
                                </div>

                                {row.status === "error" && row.error && (
                                  <div className="mt-2 text-[12px] font-semibold text-red-700">{row.error}</div>
                                )}

                                {row.status === "ok" && row.ai?.draft && (
                                  <>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                      <div className="text-[11px] font-semibold text-gray-700">Texto pronto</div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await copyText(row.ai?.draft || "");
                                            try {
                                              recordAssistantEvent({
                                                event: "DRAFT_COPIED",
                                                itemId: String(row.item.id),
                                                leadId: row.item.leadId ?? null,
                                                itemType: row.item.type,
                                                metadata: { source: "batch_assist" },
                                              });
                                            } catch {
                                            }
                                          }}
                                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                          Copiar
                                        </button>

                                        {canSend && (
                                          <button
                                            type="button"
                                            disabled={!!row.sending || !!row.sent}
                                            onClick={() => sendBatchDraft(row)}
                                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                            {row.sent ? "Enviado" : row.sending ? "Enviando..." : "Enviar"}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-900 whitespace-pre-wrap">
                                      {row.ai.draft}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <RealtorAssistantFeed
                    realtorId={realtorId}
                    embedded
                    categoryFilter={category}
                    query={query}
                    priority={priority}
                    includeSnoozed={includeSnoozed}
                    showCategoryHeadings={category === "ALL"}
                    showChatTab={false}
                    selectionEnabled
                    selectedIds={selectedIds}
                    onToggleSelected={(itemId, selected) => {
                      setSelectedIds((prev) => {
                        const id = String(itemId);
                        const set = new Set((prev || []).map((x) => String(x)));
                        if (selected) set.add(id);
                        else set.delete(id);
                        return Array.from(set);
                      });
                    }}
                    onDidMutate={() => {
                      statsEtagRef.current = null;
                      fetchStats();
                    }}
                  />
                </div>
              </div>
          </section>
        </div>
      )}
    </div>
  );
}
