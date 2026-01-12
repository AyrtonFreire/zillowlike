"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import { Users, Kanban } from "lucide-react";

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

  const briefingToneClasses = (severity: AgencyInsight["severity"]) => {
    if (severity === "critical") return "border-red-200 bg-red-50";
    if (severity === "warning") return "border-amber-200 bg-amber-50";
    return "border-gray-200 bg-white";
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-semibold text-gray-900">Workspace</p>
          <p className="mt-1 text-sm text-gray-600">
            {team ? (
              <>
                <span className="font-medium text-gray-900">{team.name}</span>
                <span className="text-gray-500"> • </span>
                <span className="text-gray-500">{team.id}</span>
              </>
            ) : (
              "Não encontramos um time associado a esta agência ainda."
            )}
          </p>
        </div>

        {insightsError && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
            {insightsError}
          </div>
        )}

        {insights?.team && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Briefing do time</div>
                <div className="mt-1 text-sm text-gray-600">{insights.summary}</div>
              </div>
              <Link
                href={`/agency/teams/${insights.team.id}/crm`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold"
              >
                Abrir CRM
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                <div className="text-[11px] text-gray-500">Ativos</div>
                <div className="text-lg font-semibold text-gray-900">{insights.funnel.activeTotal}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                <div className="text-[11px] text-gray-500">Sem responsável</div>
                <div className="text-lg font-semibold text-gray-900">{insights.funnel.unassigned}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                <div className="text-[11px] text-gray-500">Pendentes (SLA)</div>
                <div className="text-lg font-semibold text-gray-900">{insights.sla.pendingReplyTotal}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                <div className="text-[11px] text-gray-500">Novos 24h</div>
                <div className="text-lg font-semibold text-gray-900">{insights.funnel.newLast24h}</div>
              </div>
            </div>

            {Array.isArray(insights.highlights) && insights.highlights.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.highlights.map((h, idx) => (
                  <div
                    key={`${h.title}-${idx}`}
                    className={`rounded-2xl border p-4 ${briefingToneClasses(h.severity)}`}
                  >
                    <div className="text-xs font-semibold text-gray-900">{h.title}</div>
                    <div className="mt-1 text-sm text-gray-700">{h.detail}</div>
                    {h.href && (
                      <div className="mt-2">
                        <Link
                          href={h.href}
                          className="inline-flex items-center text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {h.hrefLabel || "Abrir"}
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/agency/team"
            className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-gray-50 p-2 text-gray-700 group-hover:bg-gray-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Time</div>
                <div className="mt-1 text-sm text-gray-600">
                  Veja membros e acesse o CRM do time.
                </div>
              </div>
            </div>
          </Link>

          <Link
            href={team ? `/agency/teams/${team.id}/crm` : "/agency/team"}
            className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-gray-50 p-2 text-gray-700 group-hover:bg-gray-100">
                <Kanban className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Funil (CRM)</div>
                <div className="mt-1 text-sm text-gray-600">
                  Acompanhe as etapas e gargalos do time.
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-sm font-semibold text-gray-900">Próximos passos (MVP)</div>
          <div className="mt-2 text-sm text-gray-600">
            Configure seus corretores via convites por e-mail e acompanhe o funil do time.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
