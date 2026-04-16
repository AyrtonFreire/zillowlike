"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Building2, CalendarDays, Loader2, MapPin, PlusCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

const projectStatusOptions = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "PRE_LAUNCH", label: "Pré-lançamento" },
  { value: "LAUNCH", label: "Lançamento" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "SOLD_OUT", label: "Esgotado" },
  { value: "ARCHIVED", label: "Arquivado" },
] as const;

type DeveloperProject = {
  id: string;
  teamId: string;
  name: string;
  slug: string | null;
  status: string;
  description: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  coverImageUrl: string | null;
  expectedLaunchAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  unitsSummary: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
    blocked: number;
  };
};

type DeveloperProjectsResponse = {
  success: boolean;
  workspace: {
    teamId: string;
    teamName: string | null;
    viewerWorkspaceRole: string | null;
    canManageWorkspace: boolean;
  };
  projects: DeveloperProject[];
  summary: {
    totalProjects: number;
    activeProjects: number;
    draftProjects: number;
    totalUnits: number;
    availableUnits: number;
  };
};

type ProjectForm = {
  name: string;
  status: string;
  city: string;
  state: string;
  neighborhood: string;
  expectedLaunchAt: string;
  coverImageUrl: string;
  description: string;
};

const emptyForm: ProjectForm = {
  name: "",
  status: "DRAFT",
  city: "",
  state: "",
  neighborhood: "",
  expectedLaunchAt: "",
  coverImageUrl: "",
  description: "",
};

function formatProjectStatus(value?: string | null) {
  switch (value) {
    case "DRAFT":
      return "Rascunho";
    case "PRE_LAUNCH":
      return "Pré-lançamento";
    case "LAUNCH":
      return "Lançamento";
    case "ACTIVE":
      return "Ativo";
    case "SOLD_OUT":
      return "Esgotado";
    case "ARCHIVED":
      return "Arquivado";
    default:
      return "Não definido";
  }
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

export default function DeveloperProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<DeveloperProjectsResponse | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/developer/projects");
      return;
    }

    if (status !== "authenticated") return;

    let active = true;

    const loadProjects = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetch("/api/developer/projects", { cache: "no-store" });
        const data = await result.json().catch(() => null);

        if (!result.ok || !data?.success) {
          if (!active) return;
          setError(data?.error || "Não foi possível carregar os empreendimentos.");
          setResponse(null);
          return;
        }

        if (!active) return;
        setResponse(data as DeveloperProjectsResponse);
      } catch {
        if (!active) return;
        setError("Erro inesperado ao carregar a área de empreendimentos.");
        setResponse(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProjects();

    return () => {
      active = false;
    };
  }, [router, status]);

  const canManageWorkspace = Boolean(response?.workspace.canManageWorkspace);

  async function handleCreateProject() {
    if (saving || !canManageWorkspace) return;

    setSaving(true);
    setToast(null);

    try {
      const result = await fetch("/api/developer/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success || !data?.project) {
        setToast({ message: data?.error || "Não foi possível criar o empreendimento.", type: "error" });
        return;
      }

      setResponse((current) => {
        if (!current) return current;
        const nextProjects = [data.project as DeveloperProject, ...current.projects];
        return {
          ...current,
          projects: nextProjects,
          summary: {
            totalProjects: nextProjects.length,
            activeProjects: nextProjects.filter((project) => project.status === "ACTIVE" || project.status === "LAUNCH").length,
            draftProjects: nextProjects.filter((project) => project.status === "DRAFT").length,
            totalUnits: nextProjects.reduce((sum, project) => sum + project.unitsSummary.total, 0),
            availableUnits: nextProjects.reduce((sum, project) => sum + project.unitsSummary.available, 0),
          },
        };
      });
      setForm(emptyForm);
      setToast({ message: "Empreendimento criado com sucesso.", type: "success" });
    } catch {
      setToast({ message: "Erro inesperado ao criar o empreendimento.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Empreendimentos"
        description="Carregando o pipeline institucional da incorporadora."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Incorporadora", href: "/developer" },
          { label: "Empreendimentos" },
        ]}
      >
        <div className="flex items-center justify-center py-24 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <DashboardLayout
        title="Empreendimentos"
        description="Cadastre e acompanhe os lançamentos vinculados ao workspace DEVELOPER."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Incorporadora", href: "/developer" },
          { label: "Empreendimentos" },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/developer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao painel
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {error || !response ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
              <div className="text-base font-semibold">Não foi possível carregar os empreendimentos.</div>
              <div className="mt-2 text-sm">{error || "Workspace da incorporadora não encontrado."}</div>
              <div className="mt-4">
                <Link href={role === "DEVELOPER" || role === "ADMIN" ? "/developer" : "/developer/register"} className="text-sm font-semibold underline">
                  Voltar
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2">
                <MetricCard label="Empreendimentos" value={response.summary.totalProjects} helper="Base inicial do portfólio de lançamentos" />
                <MetricCard label="Projetos ativos" value={response.summary.activeProjects} helper="Lançamentos em fase comercial" />
                <MetricCard label="Rascunhos" value={response.summary.draftProjects} helper="Estruturas ainda em preparação" />
                <MetricCard label="Unidades cadastradas" value={response.summary.totalUnits} helper="Prontas para futura gestão granular" />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-950">Portfólio do workspace</h2>
                      <p className="mt-1 text-sm text-neutral-600">
                        {response.workspace.teamName || "Sua incorporadora"} · {response.projects.length} empreendimento(s) cadastrado(s)
                      </p>
                    </div>
                    <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-700">
                      {response.workspace.viewerWorkspaceRole || "Sem papel"}
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {response.projects.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
                        Nenhum empreendimento cadastrado ainda. Use o formulário ao lado para criar o primeiro lançamento do workspace.
                      </div>
                    ) : (
                      response.projects.map((project) => (
                        <article key={project.id} className="rounded-2xl border border-neutral-200 p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                                <Building2 className="h-3.5 w-3.5" />
                                {formatProjectStatus(project.status)}
                              </div>
                              <h3 className="mt-3 text-lg font-semibold text-neutral-950">{project.name}</h3>
                              <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-600">
                                {project.city || project.state || project.neighborhood ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    {[project.neighborhood, project.city, project.state].filter(Boolean).join(" · ")}
                                  </span>
                                ) : null}
                                {project.expectedLaunchAt ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="h-4 w-4" />
                                    Previsão: {new Date(project.expectedLaunchAt).toLocaleDateString("pt-BR")}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid min-w-[220px] grid-cols-2 gap-3 text-sm">
                              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Unidades</div>
                                <div className="mt-1 font-semibold text-neutral-950">{project.unitsSummary.total}</div>
                              </div>
                              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Disponíveis</div>
                                <div className="mt-1 font-semibold text-neutral-950">{project.unitsSummary.available}</div>
                              </div>
                            </div>
                          </div>

                          {project.description ? (
                            <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                              {project.description}
                            </div>
                          ) : null}

                          <div className="mt-4">
                            <Link
                              href={`/developer/projects/${project.id}`}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 underline"
                            >
                              Gerenciar unidades
                            </Link>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <aside className="space-y-6">
                  <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-5 w-5 text-neutral-700" />
                      <h2 className="text-base font-semibold text-neutral-950">Novo empreendimento</h2>
                    </div>
                    <div className="mt-4 space-y-4">
                      <Input
                        label="Nome do empreendimento"
                        required
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        disabled={!canManageWorkspace || saving}
                        placeholder="Ex.: Reserva do Lago"
                      />
                      <Select
                        label="Status"
                        value={form.status}
                        onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                        disabled={!canManageWorkspace || saving}
                      >
                        {projectStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                          label="Cidade"
                          value={form.city}
                          onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                          disabled={!canManageWorkspace || saving}
                        />
                        <Input
                          label="Estado"
                          value={form.state}
                          onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                          disabled={!canManageWorkspace || saving}
                        />
                        <Input
                          label="Bairro"
                          value={form.neighborhood}
                          onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))}
                          disabled={!canManageWorkspace || saving}
                        />
                        <Input
                          label="Previsão de lançamento"
                          type="date"
                          value={form.expectedLaunchAt}
                          onChange={(event) => setForm((current) => ({ ...current, expectedLaunchAt: event.target.value }))}
                          disabled={!canManageWorkspace || saving}
                        />
                      </div>
                      <Input
                        label="Imagem de capa"
                        value={form.coverImageUrl}
                        onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))}
                        disabled={!canManageWorkspace || saving}
                        placeholder="https://..."
                      />
                      <Textarea
                        label="Descrição"
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        disabled={!canManageWorkspace || saving}
                        rows={5}
                        placeholder="Resumo institucional, localização e proposta do lançamento."
                      />
                      <button
                        type="button"
                        onClick={handleCreateProject}
                        disabled={!canManageWorkspace || saving}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        Criar empreendimento
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-neutral-950">Próximas extensões</h2>
                    <div className="mt-4 space-y-3 text-sm text-neutral-700">
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        Cadastro de unidades por tipologia, preço, metragem e disponibilidade.
                      </div>
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        Integração de leads por empreendimento para esteira comercial dedicada.
                      </div>
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        Materiais do lançamento como tabela, book e assets institucionais.
                      </div>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
