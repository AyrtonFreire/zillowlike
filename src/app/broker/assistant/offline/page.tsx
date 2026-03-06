"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, Calendar, Clock, Settings } from "lucide-react";
import Toast from "@/components/Toast";
import Input from "@/components/ui/Input";
import Accordion from "@/components/ui/Accordion";
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
  }>;
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
      const res = await fetch(`/api/broker/auto-reply-lead-summaries?range=${range}`);
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

  const formatRelativeTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 60) return `${Math.max(diffMins, 1)}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return d.toLocaleString("pt-BR");
  };

  const renderSlotsChips = (clientSlots: Record<string, any> | null) => {
    if (!clientSlots || typeof clientSlots !== "object") return null;
    const chips: string[] = [];

    const purpose = String(clientSlots.purpose || "").toUpperCase();
    if (purpose === "COMPRA") chips.push("Compra");
    if (purpose === "LOCACAO") chips.push("Locação");

    if (typeof clientSlots.hasPets === "boolean") chips.push(clientSlots.hasPets ? "Com pets" : "Sem pets");
    if (typeof clientSlots.bedroomsNeeded === "number") chips.push(`${clientSlots.bedroomsNeeded} quartos`);
    if (typeof clientSlots.parkingSpotsNeeded === "number") {
      chips.push(clientSlots.parkingSpotsNeeded === 0 ? "Sem vaga" : `${clientSlots.parkingSpotsNeeded} vagas`);
    }
    if (clientSlots.budget) chips.push(`Orçamento: ${String(clientSlots.budget)}`);
    if (clientSlots.moveTime) chips.push(`Mudança: ${String(clientSlots.moveTime)}`);

    const unique = Array.from(new Set(chips.map((x) => String(x).trim()).filter(Boolean)));
    if (!unique.length) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {unique.slice(0, 6).map((c) => (
          <span key={c} className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700">
            {c}
          </span>
        ))}
      </div>
    );
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

              {(metrics?.items || []).length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <AlertCircle className="w-4 h-4 text-gray-500" />
                    Nenhum lead com atividade do assistente no período.
                  </div>
                  <p className="mt-1 text-sm text-gray-600">Se houver novos leads enquanto você estiver offline, eles aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(metrics?.items || []).map((row) => {
                    const title = row.propertyTitle || "Lead";
                    const contact = row.contactName || "Cliente";
                    const when = formatRelativeTime(row.lastActivityAt);
                    const subtitleParts = [contact, title].filter(Boolean);

                    const showVisit = Boolean(row.visitRequested);
                    const showHandoff = Boolean(row.handoffNeeded);
                    const showFailed = (row.counts?.failed || 0) > 0;
                    const showSkippedOnly = (row.counts?.sent || 0) === 0 && (row.counts?.failed || 0) === 0 && (row.counts?.skipped || 0) > 0;

                    const vp = row.visitPreferences;
                    const vpText = vp
                      ? [
                          vp.period ? String(vp.period) : null,
                          Array.isArray(vp.days) && vp.days.length ? String(vp.days.join("/")) : null,
                          vp.time ? String(vp.time) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "";

                    return (
                      <Link
                        key={row.leadId}
                        href={`/broker/leads/${row.leadId}`}
                        className="block rounded-2xl border border-gray-100 bg-white p-4 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{subtitleParts.join(" · ")}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{when}</p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {showVisit ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Visita solicitada{vpText ? `: ${vpText}` : ""}
                                </span>
                              ) : null}
                              {showHandoff ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                  <Clock className="w-3.5 h-3.5" />
                                  Precisa de retorno
                                </span>
                              ) : null}
                              {showSkippedOnly ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-700">
                                  Assistente pulou
                                </span>
                              ) : null}
                              {showFailed ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                                  Falhou
                                </span>
                              ) : null}
                            </div>

                            {row.lastClientMessagePreview ? (
                              <p className="mt-3 text-xs text-gray-700 line-clamp-2">
                                <span className="font-semibold text-gray-900">Cliente:</span> {row.lastClientMessagePreview}
                              </p>
                            ) : null}
                            {row.lastAssistantMessagePreview ? (
                              <p className="mt-1 text-xs text-gray-700 line-clamp-2">
                                <span className="font-semibold text-gray-900">Assistente:</span> {row.lastAssistantMessagePreview}
                              </p>
                            ) : row.nextQuestion ? (
                              <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                                <span className="font-semibold text-gray-900">Próximo passo:</span> {row.nextQuestion}
                              </p>
                            ) : null}

                            {renderSlotsChips(row.clientSlots)}
                          </div>

                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                              Abrir lead
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </StatCard>
      </div>
    </>
  );
}
