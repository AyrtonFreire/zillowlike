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
            <div className="lg:col-span-2">
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

            <div className="space-y-6">
              <StatCard title="Próximos passos">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-6 h-6 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-700">
                      1
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Convide corretores</p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        Adicione membros ao time e defina papéis.
                        <Link href="/agency/team#invites" className="ml-2 text-blue-600 hover:text-blue-700 font-semibold">
                          Convidar
                        </Link>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-6 h-6 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-700">
                      2
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Defina a distribuição</p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        Escolha a regra (fila, capturador primeiro ou manual).
                        <Link href="/agency/team#distribution" className="ml-2 text-blue-600 hover:text-blue-700 font-semibold">
                          Ajustar
                        </Link>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-6 h-6 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-700">
                      3
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Acompanhe o funil</p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        Veja quem está com SLA pendente e leads sem responsável.
                        <Link
                          href={`/agency/teams/${insights.team.id}/crm`}
                          className="ml-2 text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Abrir leads
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
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
