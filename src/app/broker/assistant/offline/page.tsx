"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Activity, Clock, MessageSquare, Settings } from "lucide-react";
import Toast from "@/components/Toast";
import Input from "@/components/ui/Input";
import Accordion from "@/components/ui/Accordion";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";

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
};

type AutoReplyMetrics = {
  range: "24h" | "7d";
  since: string;
  enabled: boolean;
  counts: {
    sent: number;
    skipped: number;
    failed: number;
  };
  skippedByReason: Array<{ reason: string; count: number }>;
  recent: Array<{
    id: string;
    leadId: string;
    decision: string;
    reason: string | null;
    createdAt: string;
    propertyTitle: string | null;
    contactName: string | null;
  }>;
};

const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  mon: { enabled: true, start: "09:00", end: "18:00" },
  tue: { enabled: true, start: "09:00", end: "18:00" },
  wed: { enabled: true, start: "09:00", end: "18:00" },
  thu: { enabled: true, start: "09:00", end: "18:00" },
  fri: { enabled: true, start: "09:00", end: "18:00" },
  sat: { enabled: false, start: "09:00", end: "13:00" },
  sun: { enabled: false, start: "09:00", end: "13:00" },
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

  const canAccess = role === "REALTOR" || role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && canAccess) {
      fetchAll();
    }
  }, [status, canAccess, router]);

  useEffect(() => {
    if (!canAccess || status !== "authenticated") return;
    fetchMetrics();
  }, [range, canAccess, status]);

  const fetchSettings = async () => {
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
    });
  };

  const fetchMetrics = async () => {
    try {
      setMetricsError(null);
      setMetricsLoading(true);
      const res = await fetch(`/api/broker/auto-reply-metrics?range=${range}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `API error: ${res.status}`);
      setMetrics(data || null);
    } catch (err) {
      setMetrics(null);
      setMetricsError("Não conseguimos carregar os logs do assistente offline agora.");
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSettings(), fetchMetrics()]);
    } finally {
      setLoading(false);
    }
  };

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
      });

      setToast({ message: "Configurações salvas com sucesso!", type: "success" });
    } catch (err) {
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
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">O que significa 09:00–18:00?</p>
              <p className="mt-1 text-sm text-gray-700">
                Esse é o horário em que a IA pode responder por você. Fora desse horário ela não responde, mesmo que você esteja offline.
              </p>
            </div>

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
          title="Logs (assistente offline)"
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard
                  title="Respostas enviadas"
                  value={metrics?.counts?.sent || 0}
                  icon={MessageSquare}
                  subtitle="IA respondeu por você"
                  iconColor="text-emerald-700"
                  iconBgColor="bg-emerald-50"
                  className="p-4"
                />
                <MetricCard
                  title="Puladas"
                  value={metrics?.counts?.skipped || 0}
                  icon={Clock}
                  subtitle="Decisões de skip"
                  iconColor="text-amber-700"
                  iconBgColor="bg-amber-50"
                  className="p-4"
                />
                <MetricCard
                  title="Falhas"
                  value={metrics?.counts?.failed || 0}
                  icon={Activity}
                  subtitle="Erros/saídas vazias"
                  iconColor="text-rose-700"
                  iconBgColor="bg-rose-50"
                  className="p-4"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Principais motivos de skip</p>
                    <p className="text-xs text-gray-500">{range}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(metrics?.skippedByReason || []).length === 0 ? (
                      <p className="text-sm text-gray-600">Nenhum skip registrado no período.</p>
                    ) : (
                      (metrics?.skippedByReason || []).map((row) => (
                        <div key={row.reason} className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-gray-700 truncate">{row.reason}</span>
                          <span className="text-xs font-semibold text-gray-900 tabular-nums">{row.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Últimos eventos</p>
                    <p className="text-xs text-gray-500">{range}</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(metrics?.recent || []).length === 0 ? (
                      <p className="text-sm text-gray-600">Nenhum evento registrado no período.</p>
                    ) : (
                      (metrics?.recent || []).map((row) => {
                        const decision = String(row.decision || "");
                        const badge =
                          decision === "SENT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : decision === "FAILED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200";
                        const title = row.propertyTitle || "Lead";
                        const subtitle = [row.contactName || null, row.reason || null].filter(Boolean).join(" · ");
                        return (
                          <Link
                            key={row.id}
                            href={`/broker/leads/${row.leadId}`}
                            className="block rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 line-clamp-1">{title}</p>
                                {subtitle ? (
                                  <p className="mt-0.5 text-xs text-gray-600 line-clamp-1">{subtitle}</p>
                                ) : (
                                  <p className="mt-0.5 text-xs text-gray-500">&nbsp;</p>
                                )}
                                <p className="mt-1 text-[10px] text-gray-400">
                                  {row.createdAt ? new Date(row.createdAt).toLocaleString("pt-BR") : ""}
                                </p>
                              </div>
                              <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge}`}>
                                {decision || "—"}
                              </span>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </StatCard>
      </div>
    </>
  );
}
