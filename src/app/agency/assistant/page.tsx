"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  Bot,
  Clock3,
  Gauge,
  Settings,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import { AgencyAssistantFeed } from "@/components/crm/AgencyAssistantFeed";

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
  team: Team | null;
  aiConfig: {
    channels: Record<string, boolean>;
    automations: Record<string, boolean>;
    thresholds: Record<string, number>;
    coaching: {
      overloadLeadsPerAgent: number;
      maxPendingReplyPerAgent: number;
      minExecutionScore: number;
      alertOnWorkloadImbalance: boolean;
      autoPrioritizeCriticalItems: boolean;
    };
  };
  coaching: {
    teamExecutionScore: number;
    minExecutionScoreTarget: number;
    avgFirstResponseMinutes: number | null;
    workloadImbalanceIndex: number;
    automationCoverage: {
      enabledRules: number;
      totalRules: number;
      activeChannels: number;
      totalChannels: number;
    };
    alerts: AgencyInsight[];
    members: Array<{
      userId: string;
      name: string | null;
      email: string | null;
      role: string;
      activeLeads: number;
      pendingReply: number;
      stalledLeads: number;
      activeClients?: number;
      clientPendingReply?: number;
      clientNoFirstContact?: number;
      avgFirstResponseMinutes?: number | null;
      executionScore: number;
      workloadStatus: "balanced" | "attention" | "overloaded";
      totalPending: number;
    }>;
  };
};

type AssistantStatsResponse = {
  success: boolean;
  counts: {
    ALL: number;
    Leads: number;
    Visitas: number;
    Lembretes: number;
    Outros: number;
  };
  snoozedCount: number;
};

type AssistantMetricsResponse = {
  success: boolean;
  total: number;
  newestAt: string | null;
  counts: Record<string, number>;
  quota?: {
    period: string;
    periodStart: string;
    used: number;
    limit: number;
    remaining: number;
  } | null;
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function workloadBadgeClass(status: "balanced" | "attention" | "overloaded") {
  if (status === "overloaded") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "attention") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function severityStyles(severity: AgencyInsight["severity"]) {
  if (severity === "critical") {
    return {
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      label: "Crítico",
    };
  }

  if (severity === "warning") {
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      label: "Atenção",
    };
  }

  return {
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    label: "Info",
  };
}

export default function AgencyAssistantPage() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<AgencyInsightsResponse | null>(null);
  const [stats, setStats] = useState<AssistantStatsResponse | null>(null);
  const [metrics, setMetrics] = useState<AssistantMetricsResponse | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [insightsResponse, statsResponse, metricsResponse] = await Promise.all([
          fetch("/api/agency/insights", { cache: "no-store" }),
          fetch("/api/assistant/stats?context=AGENCY", { cache: "no-store" }),
          fetch("/api/assistant/metrics?context=AGENCY&period=month", { cache: "no-store" }),
        ]);

        const insightsJson = (await insightsResponse.json().catch(() => null)) as AgencyInsightsResponse | null;
        const statsJson = (await statsResponse.json().catch(() => null)) as AssistantStatsResponse | null;
        const metricsJson = (await metricsResponse.json().catch(() => null)) as AssistantMetricsResponse | null;

        if (!insightsResponse.ok || !insightsJson?.success) {
          throw new Error((insightsJson as any)?.error || "Não conseguimos carregar a central de IA agora.");
        }

        setInsights(insightsJson);
        setStats(statsResponse.ok && statsJson?.success ? statsJson : null);
        setMetrics(metricsResponse.ok && metricsJson?.success ? metricsJson : null);
      } catch (fetchError: any) {
        setInsights(null);
        setStats(null);
        setMetrics(null);
        setError(fetchError?.message || "Não conseguimos carregar a central de IA agora.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [status]);

  const aiChannelsSummary = useMemo(() => {
    const channels = insights?.aiConfig?.channels || {};
    return Object.entries(channels)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => {
        if (key === "dashboard") return "Dashboard";
        if (key === "teamChat") return "Chat do time";
        if (key === "whatsapp") return "WhatsApp";
        if (key === "email") return "Email";
        return key;
      });
  }, [insights?.aiConfig?.channels]);

  const automationCoveragePercent = useMemo(() => {
    const enabledRules = Number(insights?.coaching?.automationCoverage?.enabledRules || 0);
    const totalRules = Number(insights?.coaching?.automationCoverage?.totalRules || 0);
    if (!totalRules) return 0;
    return Math.round((enabledRules / totalRules) * 100);
  }, [insights?.coaching?.automationCoverage]);

  const coachingTopMembers = useMemo(() => {
    return Array.isArray(insights?.coaching?.members) ? insights.coaching.members.slice(0, 4) : [];
  }, [insights?.coaching?.members]);

  const coachingAlerts = useMemo(() => {
    return Array.isArray(insights?.coaching?.alerts) ? insights.coaching.alerts : [];
  }, [insights?.coaching?.alerts]);

  const generatedDrafts = Number(
    (metrics?.counts?.ASSISTANT_DRAFT_GENERATED || 0) + (metrics?.counts?.ASSISTANT_DRAFT_FALLBACK || 0)
  );
  const resolvedItems = Number(metrics?.counts?.ASSISTANT_ITEM_RESOLVED || 0);
  const snoozedItems = Number(metrics?.counts?.ASSISTANT_ITEM_SNOOZED || 0);

  if (status === "loading" || loading) {
    return <InlineSpinner message="Carregando central de IA..." />;
  }

  if (!insights?.team) {
    return (
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}
        <StatCard title="Ative a IA da agência">
          <div className="text-sm text-gray-600">
            Você precisa vincular um time antes de usar a área de IA. Vá em{" "}
            <Link href="/agency/team" className="font-semibold text-blue-600 hover:text-blue-700">
              Time
            </Link>{" "}
            para configurar membros, regras e guardrails.
          </div>
        </StatCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700">
              <Bot className="h-3.5 w-3.5" />
              IA da Agência
            </div>
            <h1 className="mt-3 text-xl font-semibold text-gray-900">Fila, coaching e automações separadas da operação diária</h1>
            <p className="mt-1 text-sm text-gray-600">
              Use esta área para supervisionar pendências assistidas por IA, revisar gargalos do time e ajustar canais e guardrails sem poluir o painel principal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/agency/team#advanced"
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurar IA
            </Link>
            <Link
              href="/agency/team-chat"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Abrir chat do time
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Pendências ativas</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{stats?.counts?.ALL ?? 0}</div>
            <div className="text-xs text-gray-500">{stats?.snoozedCount ?? 0} item(ns) adiados aguardando retorno</div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Score de execução</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{insights.coaching.teamExecutionScore}</div>
            <div className="text-xs text-gray-500">Meta atual: {insights.coaching.minExecutionScoreTarget}</div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Automações ativas</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{insights.coaching.automationCoverage.enabledRules}</div>
            <div className="text-xs text-gray-500">de {insights.coaching.automationCoverage.totalRules} regras ligadas</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
        <MetricCard
          title="Leads priorizados"
          value={stats?.counts?.Leads ?? 0}
          icon={Sparkles}
          subtitle="Itens focados em leads"
          iconColor="text-emerald-700"
          iconBgColor="bg-emerald-50"
        />
        <MetricCard
          title="Visitas e agenda"
          value={stats?.counts?.Visitas ?? 0}
          icon={Clock3}
          subtitle="Pendências ligadas a visitas"
          iconColor="text-blue-700"
          iconBgColor="bg-blue-50"
        />
        <MetricCard
          title="Sugestões geradas"
          value={generatedDrafts}
          icon={Zap}
          subtitle="Uso de IA no mês"
          iconColor="text-violet-700"
          iconBgColor="bg-violet-50"
        />
        <MetricCard
          title="Itens resolvidos"
          value={resolvedItems}
          icon={Gauge}
          subtitle="Execução no período"
          iconColor="text-amber-700"
          iconBgColor="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <StatCard
            title="Fila operacional da IA"
            action={
              <div className="text-sm text-gray-500">
                {stats?.counts?.ALL ?? 0} pendência{(stats?.counts?.ALL ?? 0) === 1 ? "" : "s"} aberta{(stats?.counts?.ALL ?? 0) === 1 ? "" : "s"}
              </div>
            }
          >
            <AgencyAssistantFeed teamId={insights.team.id} embedded />
          </StatCard>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <StatCard title="Coaching prioritário">
            <div className="space-y-3">
              {coachingTopMembers.length > 0 ? (
                coachingTopMembers.map((member) => (
                  <div key={member.userId} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{member.name || member.email || "Corretor"}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {member.totalPending} pendência(s) • {member.activeLeads} lead(s) ativos
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${workloadBadgeClass(member.workloadStatus)}`}>
                            {member.workloadStatus === "overloaded"
                              ? "Sobrecarregado"
                              : member.workloadStatus === "attention"
                                ? "Atenção"
                                : "Equilibrado"}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-700">
                            Resp. média: {typeof member.avgFirstResponseMinutes === "number" ? `${member.avgFirstResponseMinutes} min` : "-"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${member.executionScore < insights.coaching.minExecutionScoreTarget ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        {member.executionScore}/100
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-600">Ainda não há gargalos individuais relevantes para destacar.</div>
              )}
            </div>
          </StatCard>

          <StatCard title="Métricas de adoção">
            <div className="space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Última atividade</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{formatDateTime(metrics?.newestAt)}</div>
                <div className="text-xs text-gray-500">Itens adiados no período: {snoozedItems}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Quota mensal</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {metrics?.quota ? `${metrics.quota.used} de ${metrics.quota.limit} usos` : "Sem dados de quota"}
                </div>
                <div className="text-xs text-gray-500">
                  {metrics?.quota ? `${metrics.quota.remaining} restantes neste mês` : "A métrica aparecerá quando houver uso registrado."}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Categorias</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                    Leads {stats?.counts?.Leads ?? 0}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                    Visitas {stats?.counts?.Visitas ?? 0}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                    Lembretes {stats?.counts?.Lembretes ?? 0}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                    Outros {stats?.counts?.Outros ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </StatCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatCard title="Automações e guardrails">
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Cobertura</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{automationCoveragePercent}% das regras ativas</div>
              <div className="text-xs text-gray-500">
                {insights.coaching.automationCoverage.enabledRules} de {insights.coaching.automationCoverage.totalRules} regras • {insights.coaching.automationCoverage.activeChannels} de {insights.coaching.automationCoverage.totalChannels} canais
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Canais ativos</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {aiChannelsSummary.length > 0 ? (
                  aiChannelsSummary.map((channel) => (
                    <span key={channel} className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                      {channel}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">Nenhum canal ativo.</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <Shield className="h-3.5 w-3.5" />
                  Guardrails
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {insights.aiConfig.thresholds.clientFirstContactGraceMinutes} min para 1º contato
                </div>
                <div className="text-xs text-gray-500">
                  Lead parado após {insights.aiConfig.thresholds.staleLeadDays} dia(s) sem avanço
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <Users className="h-3.5 w-3.5" />
                  Coaching
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  Até {insights.aiConfig.coaching.maxPendingReplyPerAgent} pendência(s) por corretor
                </div>
                <div className="text-xs text-gray-500">
                  Sobrecarga a partir de {insights.aiConfig.coaching.overloadLeadsPerAgent} leads por carteira
                </div>
              </div>
            </div>
          </div>
        </StatCard>

        <StatCard
          title="Alertas e acompanhamento"
          action={
            <Link href="/agency/team#advanced" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Ajustar regras
            </Link>
          }
        >
          {coachingAlerts.length > 0 ? (
            <div className="space-y-3">
              {coachingAlerts.slice(0, 4).map((alert, index) => {
                const styles = severityStyles(alert.severity);
                return (
                  <div key={`${alert.title}-${index}`} className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
                            {styles.label}
                          </span>
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{alert.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">{alert.detail}</p>
                      </div>
                      {alert.href ? (
                        <Link href={alert.href} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                          {alert.hrefLabel || "Abrir"}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-600">Sem alertas críticos neste momento.</div>
          )}
        </StatCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <BarChart3 className="h-4 w-4 text-gray-700" />
            Como usar esta área
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="text-sm font-semibold text-gray-900">1. Limpe a fila</div>
              <div className="mt-1 text-sm text-gray-600">Resolva, adie ou dispense itens da IA sem misturar isso com o painel operacional.</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="text-sm font-semibold text-gray-900">2. Revise coaching</div>
              <div className="mt-1 text-sm text-gray-600">Veja quem está sobrecarregado e ajuste distribuição antes que o SLA estoure.</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="text-sm font-semibold text-gray-900">3. Ajuste guardrails</div>
              <div className="mt-1 text-sm text-gray-600">Ative ou refine automações e canais conforme a maturidade operacional do seu time.</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Zap className="h-4 w-4 text-violet-600" />
            Estado atual
          </div>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <span>Resposta média do time</span>
              <span className="font-semibold text-gray-900">
                {typeof insights.coaching.avgFirstResponseMinutes === "number" ? `${insights.coaching.avgFirstResponseMinutes} min` : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <span>Desequilíbrio de carga</span>
              <span className="font-semibold text-gray-900">{insights.coaching.workloadImbalanceIndex}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <span>Priorização automática</span>
              <span className="font-semibold text-gray-900">
                {insights.aiConfig.coaching.autoPrioritizeCriticalItems ? "Ligada" : "Desligada"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <span>Alerta de desequilíbrio</span>
              <span className="font-semibold text-gray-900">
                {insights.aiConfig.coaching.alertOnWorkloadImbalance ? "Ligado" : "Desligado"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
