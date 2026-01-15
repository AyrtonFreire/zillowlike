"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Activity, AlertTriangle, Kanban, Settings, Users } from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";

type Team = {
  id: string;
  name: string;
};

type AgencyInsight = {
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  href?: string;
  hrefLabel?: string;
};

type AgencyInsightsResponse = {
  success: boolean;
  generatedAt: string;
  team: Team | null;
  summary: string;
  funnel: {
    total: number;
    activeTotal: number;
    newLast24h: number;
    unassigned: number;
    byStage: Record<string, number>;
  };
  sla: {
    pendingReplyTotal: number;
    pendingReplyLeads: Array<{
      leadId: string;
      contactName: string | null;
      propertyTitle: string | null;
      pipelineStage: string | null;
      realtorId: string | null;
      realtorName: string | null;
      lastClientAt: string;
    }>;
  };
  members: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    role: string;
    activeLeads: number;
    pendingReply: number;
    stalledLeads: number;
  }>;
  highlights: AgencyInsight[];
};

function InlineSpinner({ message }: { message: string }) {
  return (
    <div className="py-16 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
}

export default function AgencyDashboardPage() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<AgencyInsightsResponse | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [metricsDays, setMetricsDays] = useState<1 | 7 | 30 | 90>(7);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<null | {
    days: number;
    total: number;
    counts: Record<string, number>;
    newestAt: string | null;
  }>(null);

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "AGENCY" && role !== "ADMIN") {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setInsightsError(null);
        const r = await fetch("/api/agency/insights", { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as AgencyInsightsResponse | null;
        if (!r.ok || !j?.success) {
          throw new Error((j as any)?.error || "Não conseguimos carregar o briefing agora.");
        }
        setInsights(j);
        setTeam(j.team || null);
      } catch (e: any) {
        setInsights(null);
        setTeam(null);
        setInsightsError(e?.message || "Não conseguimos carregar o briefing agora.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [role, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "AGENCY" && role !== "ADMIN") return;

    const run = async () => {
      try {
        setMetricsLoading(true);
        setMetricsError(null);
        const r = await fetch(`/api/assistant/metrics?context=AGENCY&days=${metricsDays}`, { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as any;
        if (!r.ok || !j?.success) {
          throw new Error(j?.error || "Não conseguimos carregar métricas agora.");
        }
        setMetrics({
          days: Number(j.days || metricsDays),
          total: Number(j.total || 0),
          counts: (j.counts && typeof j.counts === "object" ? j.counts : {}) as Record<string, number>,
          newestAt: j.newestAt ? String(j.newestAt) : null,
        });
      } catch (e: any) {
        setMetrics(null);
        setMetricsError(e?.message || "Não conseguimos carregar métricas agora.");
      } finally {
        setMetricsLoading(false);
      }
    };

    run();
  }, [metricsDays, role, status]);

  const severityStyles = (severity: AgencyInsight["severity"]) => {
    if (severity === "critical") {
      return {
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        card: "border-rose-100 bg-white",
        label: "Crítico",
      };
    }
    if (severity === "warning") {
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        card: "border-amber-100 bg-white",
        label: "Atenção",
      };
    }
    return {
      badge: "border-slate-200 bg-slate-50 text-slate-700",
      card: "border-slate-100 bg-white",
      label: "Info",
    };
  };

  if (status === "loading" || loading) {
    return <InlineSpinner message="Carregando painel..." />;
  }

  return (
    <div className="space-y-6">
      {insightsError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {insightsError}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500">Workspace</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 truncate">{team?.name || "Agência"}</p>
            <p className="mt-1 text-sm text-gray-600">
              {team?.id
                ? "Acompanhe o funil do time e redistribua responsáveis sem perder o contexto."
                : "Vincule seu time para começar a distribuir leads e acompanhar o funil."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {team?.id ? (
              <Link
                href={`/agency/teams/${team.id}/crm`}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
              >
                <Kanban className="w-4 h-4 mr-2" />
                Abrir leads
              </Link>
            ) : (
              <Link
                href="/agency/team"
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurar time
              </Link>
            )}

            <Link
              href="/agency/team"
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ajustes
            </Link>
          </div>
        </div>
      </div>

      {insights?.team ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <MetricCard
              title="Leads ativos"
              value={insights.funnel.activeTotal}
              icon={Activity}
              subtitle="Em andamento no time"
              iconColor="text-teal-700"
              iconBgColor="bg-teal-50"
            />
            <MetricCard
              title="Sem responsável"
              value={insights.funnel.unassigned}
              icon={Users}
              subtitle="Distribuir para o time"
              iconColor="text-amber-700"
              iconBgColor="bg-amber-50"
            />
            <MetricCard
              title="Pendentes (SLA)"
              value={insights.sla.pendingReplyTotal}
              icon={AlertTriangle}
              subtitle="Cliente aguardando resposta"
              iconColor="text-rose-700"
              iconBgColor="bg-rose-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <StatCard
                title="Uso da IA"
                action={
                  <div className="flex items-center gap-2">
                    <select
                      value={metricsDays}
                      onChange={(e) => setMetricsDays(Number(e.target.value) as any)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                      aria-label="Período"
                    >
                      <option value={1}>Hoje</option>
                      <option value={7}>7 dias</option>
                      <option value={30}>30 dias</option>
                      <option value={90}>90 dias</option>
                    </select>
                  </div>
                }
              >
                {metricsError ? (
                  <div className="text-sm text-amber-800">{metricsError}</div>
                ) : metricsLoading ? (
                  <div className="text-sm text-gray-600">Carregando métricas...</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {(() => {
                      const c = metrics?.counts || {};
                      const generated = Number(c.ASSISTANT_DRAFT_GENERATED || 0) + Number(c.ASSISTANT_DRAFT_FALLBACK || 0);
                      const copied = Number(c.ASSISTANT_DRAFT_COPIED || 0);
                      const sent = Number(c.ASSISTANT_DRAFT_SENT || 0);
                      const resolved = Number(c.ASSISTANT_ITEM_RESOLVED || 0);
                      const cards = [
                        { label: "Drafts gerados", value: generated },
                        { label: "Drafts copiados", value: copied },
                        { label: "Drafts enviados", value: sent },
                        { label: "Itens resolvidos", value: resolved },
                      ];
                      return cards.map((it) => (
                        <div key={it.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                          <div className="text-[11px] font-semibold text-gray-500">{it.label}</div>
                          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{it.value}</div>
                          <div className="mt-1 text-xs text-gray-500">Últimos {metricsDays} dia{metricsDays === 1 ? "" : "s"}</div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </StatCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <StatCard
                title="Alertas do time"
                action={
                  <Link
                    href={`/agency/teams/${insights.team.id}/crm`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Abrir leads
                  </Link>
                }
              >
                {Array.isArray(insights.highlights) && insights.highlights.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {insights.highlights.map((h, idx) => {
                      const s = severityStyles(h.severity);
                      return (
                        <div key={`${h.title}-${idx}`} className="py-3 flex items-start gap-3">
                          <span
                            className={`mt-0.5 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.badge}`}
                          >
                            {s.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{h.title}</p>
                            <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">{h.detail}</p>
                          </div>
                          {h.href ? (
                            <Link href={h.href} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                              {h.hrefLabel || "Abrir"}
                            </Link>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    Nenhum alerta importante por enquanto. Conforme seu time receber e atender leads, os pontos de atenção aparecem aqui.
                  </div>
                )}
              </StatCard>
            </div>
          </div>
        </>
      ) : (
        <StatCard title="Comece por aqui">
          <div className="text-sm text-gray-600">
            Não encontramos um time associado a esta agência ainda. Vá em{" "}
            <Link href="/agency/team" className="text-blue-600 hover:text-blue-700 font-semibold">
              Meu time
            </Link>{" "}
            para configurar membros, convites e preferências.
          </div>
        </StatCard>
      )}
    </div>
  );
}
