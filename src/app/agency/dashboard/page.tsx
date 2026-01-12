"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import { Activity, AlertTriangle, Kanban, Plus, Settings, Users } from "lucide-react";
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

export default function AgencyDashboardPage() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<AgencyInsightsResponse | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);

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
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [role, status]);

  const severityStyles = (severity: AgencyInsight["severity"]) => {
    if (severity === "critical") {
      return {
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        card: "border-rose-100 bg-white",
        icon: "text-rose-700",
        iconBg: "bg-rose-50",
        label: "Crítico",
      };
    }
    if (severity === "warning") {
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        card: "border-amber-100 bg-white",
        icon: "text-amber-700",
        iconBg: "bg-amber-50",
        label: "Atenção",
      };
    }
    return {
      badge: "border-slate-200 bg-slate-50 text-slate-700",
      card: "border-slate-100 bg-white",
      icon: "text-slate-700",
      iconBg: "bg-slate-50",
      label: "Info",
    };
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Painel da Agência"
        description="Visão geral e próximos passos."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Agência" }]}
      >
        <CenteredSpinner message="Carregando painel..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Painel da Agência"
      description="Organize corretores, acompanhe leads e mantenha o funil em ordem."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Agência" }]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {insightsError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {insightsError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500">Workspace</p>
                <p className="mt-1 text-xl font-semibold text-gray-900 truncate">
                  {team?.name || "Agência"}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {team?.id
                    ? `Time vinculado: ${team.id}`
                    : "Vincule seu time para começar a distribuir leads e acompanhar o funil."}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href="/agency/team"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar
                </Link>

                {team?.id && (
                  <Link
                    href={`/agency/teams/${team.id}/crm`}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
                  >
                    <Kanban className="w-4 h-4 mr-2" />
                    Abrir CRM
                  </Link>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/owner/new"
            className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Cadastrar imóvel</p>
                <p className="text-sm text-gray-600 mt-1">Crie um novo anúncio</p>
              </div>
            </div>
          </Link>
        </div>

        {insights?.team ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
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
              <MetricCard
                title="Novos 24h"
                value={insights.funnel.newLast24h}
                icon={Plus}
                subtitle="Entradas recentes"
                iconColor="text-blue-700"
                iconBgColor="bg-blue-50"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <StatCard
                  title="Alertas do time"
                  action={
                    <Link
                      href={`/agency/teams/${insights.team.id}/crm`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Abrir CRM
                    </Link>
                  }
                >
                  {Array.isArray(insights.highlights) && insights.highlights.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {insights.highlights.map((h, idx) => {
                        const s = severityStyles(h.severity);
                        return (
                          <div
                            key={`${h.title}-${idx}`}
                            className={`rounded-2xl border p-4 ${s.card} hover:bg-gray-50 transition-colors`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 line-clamp-1">{h.title}</p>
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{h.detail}</p>
                              </div>
                              <span
                                className={`flex-shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.badge}`}
                              >
                                {s.label}
                              </span>
                            </div>
                            {h.href && (
                              <div className="mt-3">
                                <Link
                                  href={h.href}
                                  className="inline-flex items-center text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                                >
                                  {h.hrefLabel || "Abrir"}
                                </Link>
                              </div>
                            )}
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

              <div className="space-y-6">
                <StatCard title="Atalhos rápidos">
                  <div className="grid grid-cols-1 gap-3">
                    <Link
                      href="/agency/team"
                      className="p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
                          <Users className="w-6 h-6 text-slate-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Meu time</p>
                          <p className="text-sm text-gray-600 mt-1">Convites, regras e perfil</p>
                        </div>
                      </div>
                    </Link>

                    <Link
                      href={team?.id ? `/agency/teams/${team.id}/crm` : "/agency/team"}
                      className="p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-teal-50 rounded-xl group-hover:bg-teal-100 transition-colors">
                          <Kanban className="w-6 h-6 text-teal-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Funil (CRM)</p>
                          <p className="text-sm text-gray-600 mt-1">Etapas e distribuição</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                </StatCard>

                <StatCard title="Próximos passos">
                  <div className="text-sm text-gray-600">
                    Convide corretores para o time e defina a regra de distribuição de leads. Depois acompanhe o funil para identificar gargalos.
                  </div>
                </StatCard>
              </div>
            </div>
          </>
        ) : (
          <StatCard title="Comece por aqui">
            <div className="text-sm text-gray-600">
              Não encontramos um time associado a esta agência ainda. Vá em <Link href="/agency/team" className="text-blue-600 hover:text-blue-700 font-semibold">Meu time</Link> para configurar membros, convites e preferências.
            </div>
          </StatCard>
        )}
      </div>
    </DashboardLayout>
  );
}
