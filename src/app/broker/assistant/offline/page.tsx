"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, AlertTriangle, Calendar, Inbox, Send, Settings } from "lucide-react";
import Toast from "@/components/Toast";
import Input from "@/components/ui/Input";
import Accordion from "@/components/ui/Accordion";
import StatCard from "@/components/dashboard/StatCard";
import OfflineAssistantTile from "@/components/broker/OfflineAssistantTile";
import OfflineTechDiagnostics from "@/components/broker/OfflineTechDiagnostics";
import OfflineLeadFilters from "@/components/broker/OfflineLeadFilters";
import OfflineLeadCard from "@/components/broker/OfflineLeadCard";
import { formatPipelineStageLabel } from "@/lib/offline-assistant-intelligence";
import {
  computeTopActionableCounts,
  leadMatchesFilter,
  type OfflineLeadFilter,
} from "@/lib/offline-assistant-presentation";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

type WeekSchedule = Record<DayKey, DaySchedule>;

type AutoReplySettings = {
  enabled: boolean;
  timezone: string;
  weekSchedule: WeekSchedule;
  cooldownMinutes: number;
  maxRepliesPerLeadPer24h: number;
  rollout?: {
    experimentName?: string | null;
    rolloutPercent?: number | null;
    experimentPercent?: number | null;
    realtorBucket?: number | null;
    rolloutEnabled?: boolean | null;
  } | null;
  versions?: {
    promptVersion?: string | null;
    guardrailsVersion?: string | null;
    policyVersion?: string | null;
    scoringVersion?: string | null;
    contextVersion?: string | null;
  } | null;
};

type AutoReplyMetrics = {
  range: "24h" | "7d";
  since: string;
  enabled: boolean;
  rollout?: AutoReplySettings["rollout"];
  versions?: AutoReplySettings["versions"];
  items: Array<{
    leadId: string;
    contactName: string | null;
    propertyTitle: string | null;
    lastActivityAt: string | null;
    counts: { sent: number; skipped: number; failed: number };
    lastClientMessagePreview: string | null;
    lastAssistantMessagePreview: string | null;
    handoffNeeded: boolean;
    nextQuestion: string | null;
    visitRequested: boolean;
    visitPreferences: { period: string | null; days: string[] | null; time: string | null } | null;
    clientSlots: Record<string, any> | null;
    conversationMode: string | null;
    qualification: {
      score?: number | null;
      dataCompleteness?: number | null;
      leadTemperature?: string | null;
      responsePriority?: string | null;
      recommendedAction?: string | null;
    } | null;
    handoff: {
      needed?: boolean | null;
      reason?: string | null;
      priority?: string | null;
      recommendedAction?: string | null;
    } | null;
    policy: {
      nextQuestion?: string | null;
      recommendedAction?: string | null;
    } | null;
    commercialSummary: string | null;
    propertyContext: {
      propertySummary?: string | null;
      regionSummary?: string | null;
      fitHighlights?: string[] | null;
      attentionFlags?: string[] | null;
    } | null;
    operationalPlaybook: {
      headline?: string | null;
      whyNow?: string | null;
      pipelineStage?: string | null;
      actionChecklist?: string[] | null;
      followUpDraft?: string | null;
    } | null;
    experiment: {
      variant?: string | null;
      rolloutPercent?: number | null;
      experimentPercent?: number | null;
      rolloutEnabled?: boolean | null;
    } | null;
    guardrails: {
      version?: string | null;
      scenario?: string | null;
      appliedRules?: string[] | null;
    } | null;
  }>;
};

type AutoReplyOverview = {
  range: "24h" | "7d";
  since: string;
  enabled: boolean;
  rollout?: AutoReplySettings["rollout"];
  versions?: AutoReplySettings["versions"];
  counts: { sent: number; skipped: number; failed: number };
  funnel?: {
    hotLeads?: number | null;
    urgentLeads?: number | null;
    handoffLeads?: number | null;
    visitLeads?: number | null;
    qualifiedLeads?: number | null;
    averageDataCompleteness?: number | null;
  } | null;
  experiments?: Array<{ variant: string; count: number }>;
  guardrails?: {
    scenarios?: Array<{ scenario: string; count: number }>;
    rules?: Array<{ rule: string; count: number }>;
  } | null;
  operational?: {
    avgChecklistItems?: number | null;
    pipelineStages?: Array<{ stage: string; count: number }>;
  } | null;
};

const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  mon: { enabled: true, start: "18:00", end: "08:00" },
  tue: { enabled: true, start: "18:00", end: "08:00" },
  wed: { enabled: true, start: "18:00", end: "08:00" },
  thu: { enabled: true, start: "18:00", end: "08:00" },
  fri: { enabled: true, start: "18:00", end: "08:00" },
  sat: { enabled: true, start: "18:00", end: "08:00" },
  sun: { enabled: true, start: "18:00", end: "08:00" },
};

const dayLabels: Record<DayKey, string> = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

export default function BrokerAssistantOfflinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const role = (session as any)?.user?.role || (session as any)?.role;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const [settings, setSettings] = useState<AutoReplySettings>({
    enabled: false,
    timezone: "America/Sao_Paulo",
    weekSchedule: DEFAULT_WEEK_SCHEDULE,
    cooldownMinutes: 3,
    maxRepliesPerLeadPer24h: 6,
  });

  const [range, setRange] = useState<"24h" | "7d">("24h");
  const [metrics, setMetrics] = useState<AutoReplyMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AutoReplyOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [filter, setFilter] = useState<OfflineLeadFilter>("ALL");

  const canAccess = role === "REALTOR" || role === "ADMIN";

  const items = useMemo(() => metrics?.items || [], [metrics]);

  const filterCounts = useMemo(() => {
    return {
      total: items.length,
      urgent: items.filter((i) => leadMatchesFilter(i, "URGENT")).length,
      visit: items.filter((i) => leadMatchesFilter(i, "VISIT")).length,
      handoff: items.filter((i) => leadMatchesFilter(i, "HANDOFF")).length,
      hot: items.filter((i) => leadMatchesFilter(i, "HOT")).length,
      qualified: items.filter((i) => leadMatchesFilter(i, "QUALIFIED")).length,
      failed: items.filter((i) => leadMatchesFilter(i, "FAILED")).length,
    };
  }, [items]);

  const filteredItems = useMemo(
    () => items.filter((i) => leadMatchesFilter(i, filter)),
    [items, filter],
  );

  const topCounts = useMemo(
    () => computeTopActionableCounts({ items, overviewSent: overview?.counts?.sent ?? 0 }),
    [items, overview],
  );

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/broker/auto-reply-settings");
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    if (!data) return;
    setSettings({
      enabled: Boolean(data.enabled),
      timezone: data.timezone || "America/Sao_Paulo",
      weekSchedule: data.weekSchedule || DEFAULT_WEEK_SCHEDULE,
      cooldownMinutes: Number(data.cooldownMinutes ?? 3),
      maxRepliesPerLeadPer24h: Number(data.maxRepliesPerLeadPer24h ?? 6),
      rollout: data.rollout || null,
      versions: data.versions || null,
    });
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsError(null);
      setMetricsLoading(true);
      const res = await fetch(`/api/broker/auto-reply-lead-summaries?range=${range}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `API error: ${res.status}`);
      setMetrics(data || null);
    } catch {
      setMetrics(null);
      setMetricsError("Não conseguimos carregar os logs do assistente offline agora.");
    } finally {
      setMetricsLoading(false);
    }
  }, [range]);

  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const res = await fetch(`/api/broker/auto-reply-metrics?range=${range}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `API error: ${res.status}`);
      setOverview(data || null);
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && canAccess) {
      setLoading(true);
      void Promise.all([fetchSettings(), fetchMetrics(), fetchOverview()]).finally(() => {
        setLoading(false);
      });
    }
  }, [status, canAccess, router, fetchSettings, fetchMetrics, fetchOverview]);

  useEffect(() => {
    if (!canAccess || status !== "authenticated") return;
    void Promise.all([fetchMetrics(), fetchOverview()]);
  }, [canAccess, status, fetchMetrics, fetchOverview]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const last = (metrics?.items || [])[0]?.lastActivityAt || null;
      if (!last) return;
      window.localStorage.setItem("zlw_offline_assistant_seen_at", String(last));
    } catch {
    }
  }, [metrics]);

  const formatTokenLabel = useCallback((value: string | null | undefined) => {
    const raw = String(value || "").trim();
    if (!raw) return "—";
    return raw
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/broker/auto-reply-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setToast({ message: data?.error || "Erro ao salvar assistente offline", type: "error" });
        return;
      }

      setSettings({
        enabled: Boolean(data.enabled),
        timezone: data.timezone || "America/Sao_Paulo",
        weekSchedule: data.weekSchedule || DEFAULT_WEEK_SCHEDULE,
        cooldownMinutes: Number(data.cooldownMinutes ?? 3),
        maxRepliesPerLeadPer24h: Number(data.maxRepliesPerLeadPer24h ?? 6),
        rollout: data.rollout || null,
        versions: data.versions || null,
      });

      setToast({ message: "Configurações salvas com sucesso!", type: "success" });
    } catch {
      setToast({ message: "Erro ao salvar assistente offline", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const scheduleItems = useMemo(() => {
    return [
      {
        key: "schedule",
        title: "Horários e limites",
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Timezone"
                value={settings.timezone}
                onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
                placeholder="America/Sao_Paulo"
              />
              <Input
                label="Cooldown (min)"
                type="number"
                min={1}
                max={60}
                value={String(settings.cooldownMinutes)}
                onChange={(e) => setSettings((s) => ({ ...s, cooldownMinutes: Number(e.target.value || 0) }))}
              />
              <Input
                label="Máx. respostas por lead (24h)"
                type="number"
                min={1}
                max={30}
                value={String(settings.maxRepliesPerLeadPer24h)}
                onChange={(e) => setSettings((s) => ({ ...s, maxRepliesPerLeadPer24h: Number(e.target.value || 0) }))}
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center text-xs font-semibold text-gray-500">
                <div />
                <div />
                <div>Início</div>
                <div>Fim</div>
                <div />
              </div>
              {(Object.keys(settings.weekSchedule) as DayKey[]).map((day) => {
                const row = settings.weekSchedule[day];
                return (
                  <div key={day} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                    <div className="text-sm font-medium text-gray-700">{dayLabels[day]}</div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            weekSchedule: {
                              ...s.weekSchedule,
                              [day]: { ...s.weekSchedule[day], enabled: e.target.checked },
                            },
                          }))
                        }
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      Ativo
                    </label>
                    <input
                      type="time"
                      value={row.start}
                      disabled={!row.enabled}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          weekSchedule: {
                            ...s.weekSchedule,
                            [day]: { ...s.weekSchedule[day], start: e.target.value },
                          },
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                    />
                    <input
                      type="time"
                      value={row.end}
                      disabled={!row.enabled}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          weekSchedule: {
                            ...s.weekSchedule,
                            [day]: { ...s.weekSchedule[day], end: e.target.value },
                          },
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                    />
                    <div className="text-xs text-gray-500">{row.enabled ? "" : "Fora do horário"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      },
    ];
  }, [settings]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <p className="text-sm font-semibold text-gray-900">Acesso negado</p>
        <p className="mt-1 text-sm text-gray-600">Faça login como corretor para acessar o Assistente offline.</p>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Assistente offline</h1>
            <p className="mt-1 text-sm text-gray-600">Horários e logs de auto-resposta.</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            <Settings className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
              className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">Ativar assistente offline</div>
              <div className="text-sm text-gray-600">Responde quando você estiver offline e dentro do horário configurado.</div>
            </div>
          </div>

          <Accordion items={scheduleItems} defaultOpen={[]} />
        </div>

        <StatCard
          title="Resumo por lead"
          action={
            <div className="flex items-center gap-2">
              <select
                value={range}
                onChange={(e) => setRange((e.target.value as any) || "24h")}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                aria-label="Período"
              >
                <option value="24h">Últimas 24h</option>
                <option value="7d">Últimos 7 dias</option>
              </select>
            </div>
          }
        >
          {metricsError ? (
            <div className="text-sm text-gray-600">{metricsError}</div>
          ) : metricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Skeleton className="h-60" />
                <Skeleton className="h-60" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!metrics?.enabled ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  O assistente offline está desativado.
                </div>
              ) : null}

              {!overviewLoading && overview ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <OfflineAssistantTile
                      label="Precisam de você"
                      value={topCounts.needsYou}
                      subtext={
                        topCounts.urgent + topCounts.handoff > 0
                          ? `${topCounts.urgent} urgente${topCounts.urgent === 1 ? "" : "s"} + ${topCounts.handoff} retorno`
                          : "Tudo em dia"
                      }
                      icon={AlertTriangle}
                      tone={topCounts.needsYou > 0 ? "rose" : "emerald"}
                      onClick={() => setFilter(topCounts.urgent >= topCounts.handoff ? "URGENT" : "HANDOFF")}
                      active={filter === "URGENT" || filter === "HANDOFF"}
                    />
                    <OfflineAssistantTile
                      label="Visitas pedidas"
                      value={topCounts.visit}
                      subtext={topCounts.visit > 0 ? "toque para filtrar" : "Nenhuma no período"}
                      icon={Calendar}
                      tone={topCounts.visit > 0 ? "purple" : "gray"}
                      onClick={() => setFilter("VISIT")}
                      active={filter === "VISIT"}
                    />
                    <OfflineAssistantTile
                      label="Respostas enviadas"
                      value={overview.counts?.sent || 0}
                      subtext="no período"
                      icon={Send}
                      tone="teal"
                    />
                  </div>

                  <OfflineTechDiagnostics
                    role={role}
                    rollout={overview.rollout}
                    versions={overview.versions}
                    funnel={overview.funnel}
                    experiments={overview.experiments}
                    guardrails={overview.guardrails}
                    operational={overview.operational}
                    formatTokenLabel={formatTokenLabel}
                    formatPipelineStageLabel={formatPipelineStageLabel}
                  />
                </>
              ) : null}

              {items.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Inbox className="w-4 h-4 text-gray-500" />
                    Nenhum lead com atividade do assistente no período.
                  </div>
                  <p className="mt-1 text-sm text-gray-600">Se houver novos leads enquanto você estiver offline, eles aparecerão aqui.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">Leads no período</h3>
                  </div>

                  <OfflineLeadFilters value={filter} onChange={setFilter} counts={filterCounts} />

                  {filteredItems.length === 0 ? (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <AlertCircle className="w-4 h-4 text-gray-500" />
                        Nenhum lead bate com este filtro.
                      </div>
                      <p className="mt-1 text-sm text-gray-600">Tente outro filtro ou volte para “Todos”.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredItems.map((row) => (
                        <OfflineLeadCard
                          key={row.leadId}
                          variant="full"
                          data={{
                            leadId: row.leadId,
                            contactName: row.contactName,
                            propertyTitle: row.propertyTitle,
                            lastActivityAt: row.lastActivityAt,
                            responsePriority: row.handoff?.priority || row.qualification?.responsePriority,
                            visitRequested: row.visitRequested,
                            handoffNeeded: row.handoffNeeded,
                            leadTemperature: row.qualification?.leadTemperature,
                            qualifiedFlag: leadMatchesFilter(row, "QUALIFIED"),
                            counts: row.counts,
                            visitPreferences: row.visitPreferences,
                            lastClientMessagePreview: row.lastClientMessagePreview,
                            policy: row.policy,
                            handoff: row.handoff,
                            qualification: row.qualification,
                            operationalPlaybook: row.operationalPlaybook,
                          }}
                          onCopyToast={(msg) => setToast({ message: msg, type: "success" })}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </StatCard>
      </div>
    </>
  );
}
