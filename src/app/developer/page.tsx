"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  BriefcaseBusiness,
  Shield,
  Users,
} from "lucide-react";
import { InlineFeedbackBanner } from "@/app/profile/components/ProfilePrimitives";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

type DeveloperDashboardResponse = {
  success: boolean;
  profile: {
    id: string;
    displayName: string;
    legalName: string;
    businessType: string | null;
  };
  workspace: {
    teamId: string;
    teamName: string | null;
    viewerWorkspaceRole: string | null;
    canManageWorkspace: boolean;
    canTransferOwner: boolean;
    membersCount: number;
    invitesCount: number;
    developmentProjectsCount: number;
    leadsCount: number;
  };
  metrics: {
    totalLeads: number;
    unreadLeads: number;
    firstContactLeads: number;
    negotiationLeads: number;
    closedLeads: number;
    projectsCount: number;
  };
  stageSummary: Array<{ stage: string; count: number }>;
  topProjects: Array<{
    id: string;
    name: string;
    status: string;
    city: string | null;
    state: string | null;
    unitsCount: number;
    leadsCount: number;
    availableUnits: number;
  }>;
  recentLeads: Array<{
    id: string;
    publicCode: string | null;
    pipelineStage: string;
    status: string;
    createdAt: string;
    hasUnreadMessages: boolean;
    developmentProject: { id: string; name: string } | null;
    developmentUnit: { id: string; reference: string; title: string | null } | null;
    property: { id: string; title: string; price: number; city: string; state: string } | null;
    contact: { name: string | null; email: string | null } | null;
  }>;
};

function formatBusinessType(value?: string | null) {
  switch (value) {
    case "CONSTRUTORA":
      return "Construtora";
    case "INCORPORADORA":
      return "Incorporadora";
    case "LOTEADORA":
      return "Loteadora";
    case "URBANIZADORA":
      return "Urbanizadora";
    case "MISTA":
      return "Operação mista";
    default:
      return "Não definido";
  }
}

function stageLabel(value?: string | null) {
  switch (String(value || "").toUpperCase()) {
    case "NEW":
      return "Novo";
    case "CONTACT":
      return "Contato";
    case "VISIT":
      return "Visita";
    case "PROPOSAL":
      return "Proposta";
    case "DOCUMENTS":
      return "Documentos";
    case "WON":
      return "Ganho";
    case "LOST":
      return "Perdido";
    default:
      return value || "Sem etapa";
  }
}

function currencyBRL(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{value}</div>
      <div className="mt-2 text-sm text-neutral-600">{helper}</div>
    </div>
  );
}

export default function DeveloperDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DeveloperDashboardResponse | null>(null);

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/developer");
      return;
    }

    if (status !== "authenticated") return;

    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/developer/dashboard", { cache: "no-store" });
        const data = await response.json().catch(() => null);

        if (!response.ok || data?.error) {
          if (!active) return;
          setError(data?.error || "Não foi possível carregar o painel executivo da incorporadora.");
          setDashboard(null);
          return;
        }

        if (!active) return;
        setDashboard(data as DeveloperDashboardResponse);
      } catch {
        if (!active) return;
        setError("Erro inesperado ao carregar o painel da incorporadora.");
        setDashboard(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [router, status]);

  if (status === "loading") {
    return <CenteredSpinner message="Carregando painel da incorporadora..." />;
  }

  return (
    <DashboardLayout
      title="Painel da incorporadora"
      description="Base operacional inicial do novo workspace DEVELOPER."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Incorporadora" },
      ]}
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/developer/projects"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Empreendimentos
          </Link>
          <Link
            href="/developer/leads"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Leads
          </Link>
          <Link
            href="/developer/workspace"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Workspace
          </Link>
          <Link
            href="/developer/profile"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Editar perfil
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            Minha conta
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <CenteredSpinner message="Atualizando visão executiva..." />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <div className="text-base font-semibold">Não foi possível carregar o painel.</div>
            <div className="mt-2 text-sm">{error}</div>
            {role !== "DEVELOPER" && role !== "ADMIN" ? (
              <div className="mt-4 text-sm">
                Seu perfil atual ainda não tem acesso ao workspace de incorporadora.
              </div>
            ) : null}
            <div className="mt-4">
              <Link href={role === "DEVELOPER" || role === "ADMIN" ? "/developer/profile" : "/developer/register"} className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 underline">
                Revisar cadastro
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : dashboard ? (
          <>
            {!dashboard.workspace.canManageWorkspace ? (
              <InlineFeedbackBanner
                tone="info"
                title="Sessão com acesso operacional"
                message="Você pode acompanhar o desempenho do workspace, mas ações administrativas continuam restritas ao papel titular ou de gestão."
              />
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2">
              <MetricCard
                label="Leads do workspace"
                value={dashboard.metrics.totalLeads}
                helper="Base comercial vinculada aos empreendimentos"
              />
              <MetricCard
                label="Mensagens não lidas"
                value={dashboard.metrics.unreadLeads}
                helper="Leads pedindo resposta ou retorno"
              />
              <MetricCard
                label="Primeiro contato"
                value={dashboard.metrics.firstContactLeads}
                helper="Oportunidades ainda nas etapas iniciais"
              />
              <MetricCard
                label="Negociação ativa"
                value={dashboard.metrics.negotiationLeads}
                helper="Leads em visita, proposta ou documentos"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                      <Building2 className="h-3.5 w-3.5" />
                      {formatBusinessType(dashboard.profile.businessType)}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
                      {dashboard.profile.displayName}
                    </h2>
                    <p className="mt-2 text-sm text-neutral-600">
                      {dashboard.profile.legalName}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-right">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Workspace</div>
                    <div className="mt-1 text-sm font-semibold text-neutral-900">{dashboard.workspace.viewerWorkspaceRole || "OWNER"}</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Membros</div>
                    <div className="mt-2 text-2xl font-semibold text-neutral-900">{dashboard.workspace.membersCount}</div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Convites</div>
                    <div className="mt-2 text-2xl font-semibold text-neutral-900">{dashboard.workspace.invitesCount}</div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Empreendimentos</div>
                    <div className="mt-2 text-2xl font-semibold text-neutral-900">{dashboard.workspace.developmentProjectsCount}</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 text-sm text-neutral-700 md:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-3">
                    <Users className="h-4 w-4 text-neutral-500" />
                    <span>Time: {dashboard.workspace.teamName || "Workspace sem nome"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-3">
                    <Shield className="h-4 w-4 text-neutral-500" />
                    <span>{dashboard.workspace.canManageWorkspace ? "Gestão liberada para sua sessão" : "Sua sessão está em modo operacional"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-3">
                    <Bell className="h-4 w-4 text-neutral-500" />
                    <span>{dashboard.metrics.unreadLeads} lead(s) com mensagens pendentes</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-3">
                    <BarChart3 className="h-4 w-4 text-neutral-500" />
                    <span>{dashboard.metrics.closedLeads} lead(s) já encerrados no funil</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Link href="/developer/leads?priority=UNREAD" className="rounded-2xl border border-sky-200 bg-sky-50 p-4 transition hover:bg-sky-100">
                    <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Atenção imediata</div>
                    <div className="mt-2 text-sm font-semibold text-sky-950">Responder leads não lidos</div>
                  </Link>
                  <Link href="/developer/projects" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition hover:bg-emerald-100">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Portfólio</div>
                    <div className="mt-2 text-sm font-semibold text-emerald-950">Revisar empreendimentos e unidades</div>
                  </Link>
                  <Link href="/developer/workspace" className="rounded-2xl border border-violet-200 bg-violet-50 p-4 transition hover:bg-violet-100">
                    <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Equipe</div>
                    <div className="mt-2 text-sm font-semibold text-violet-950">Gerenciar membros e convites</div>
                  </Link>
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-950">Resumo do funil</h3>
                  <div className="mt-4 space-y-3">
                    {dashboard.metrics.totalLeads === 0 ? (
                      <EmptyState
                        compact
                        icon={<BarChart3 className="h-8 w-8" />}
                        title="Funil ainda sem leads"
                        description="Assim que os empreendimentos receberem oportunidades, a distribuição por etapa aparecerá aqui."
                      />
                    ) : (
                      dashboard.stageSummary.map((item) => (
                        <div key={item.stage} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                          <span>{stageLabel(item.stage)}</span>
                          <span className="font-semibold text-neutral-950">{item.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-950">Atalhos executivos</h3>
                  <div className="mt-4 space-y-3 text-sm text-neutral-700">
                    <Link href="/developer/leads" className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50">
                      <span className="inline-flex items-center gap-2">
                        <Bell className="h-4 w-4 text-neutral-500" />
                        Operar leads do funil
                      </span>
                      <ArrowRight className="h-4 w-4 text-neutral-500" />
                    </Link>
                    <Link href="/developer/projects" className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50">
                      <span className="inline-flex items-center gap-2">
                        <BriefcaseBusiness className="h-4 w-4 text-neutral-500" />
                        Revisar portfólio
                      </span>
                      <ArrowRight className="h-4 w-4 text-neutral-500" />
                    </Link>
                    <Link href="/developer/workspace" className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50">
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-neutral-500" />
                        Gerenciar equipe
                      </span>
                      <ArrowRight className="h-4 w-4 text-neutral-500" />
                    </Link>
                  </div>
                </section>
              </aside>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-neutral-950">Empreendimentos em destaque</h3>
                  <Link href="/developer/projects" className="text-sm font-semibold text-neutral-700 hover:text-neutral-950">
                    Ver todos
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {dashboard.topProjects.length === 0 ? (
                    <EmptyState
                      compact
                      icon={<BriefcaseBusiness className="h-8 w-8" />}
                      title="Nenhum empreendimento em destaque"
                      description="Cadastre o primeiro empreendimento para começar a acompanhar portfólio, unidades e leads neste painel."
                      action={
                        <Link
                          href="/developer/projects"
                          className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                        >
                          Ir para empreendimentos
                        </Link>
                      }
                    />
                  ) : (
                    dashboard.topProjects.map((project) => (
                      <Link key={project.id} href={`/developer/projects/${project.id}`} className="block rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition hover:bg-neutral-100">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-neutral-950">{project.name}</div>
                            <div className="mt-1 text-xs text-neutral-500">{project.city && project.state ? `${project.city} · ${project.state}` : "Sem localização pública"}</div>
                          </div>
                          <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
                            {project.status}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-neutral-600">
                          <div>
                            <div className="font-semibold text-neutral-900">{project.unitsCount}</div>
                            <div>Unidades</div>
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-900">{project.availableUnits}</div>
                            <div>Disponíveis</div>
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-900">{project.leadsCount}</div>
                            <div>Leads</div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-neutral-950">Leads recentes</h3>
                  <Link href="/developer/leads" className="text-sm font-semibold text-neutral-700 hover:text-neutral-950">
                    Abrir lista
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {dashboard.recentLeads.length === 0 ? (
                    <EmptyState
                      compact
                      icon={<Bell className="h-8 w-8" />}
                      title="Nenhum lead recente"
                      description="Quando os empreendimentos começarem a receber interessados, os leads mais novos aparecerão aqui com atalhos para operação."
                      action={
                        <Link
                          href="/developer/leads"
                          className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                        >
                          Abrir central de leads
                        </Link>
                      }
                    />
                  ) : (
                    dashboard.recentLeads.map((lead) => (
                      <Link key={lead.id} href={`/developer/leads/${lead.id}`} className="block rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition hover:bg-neutral-100">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-neutral-950">
                              {lead.contact?.name || lead.contact?.email || lead.publicCode || lead.id}
                            </div>
                            <div className="mt-1 text-xs text-neutral-500">{lead.developmentProject?.name || "Sem empreendimento"}</div>
                          </div>
                          <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
                            {stageLabel(lead.pipelineStage)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                          <span>{lead.property?.title || "Imóvel sem título"}</span>
                          <span>{currencyBRL(lead.property?.price)}</span>
                          {lead.hasUnreadMessages ? (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">
                              Não lido
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
