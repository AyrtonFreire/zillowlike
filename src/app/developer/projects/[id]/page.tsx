"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Building2, CalendarDays, DoorOpen, Loader2, MapPin, Pencil, PlusCircle, Save, Trash2, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

type DeveloperUnit = {
  id: string;
  projectId: string;
  reference: string;
  title: string | null;
  status: string;
  typology: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  privateAreaM2: number | null;
  priceInCents: string | null;
  floor: number | null;
  block: string | null;
  tower: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

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
  units?: DeveloperUnit[];
};

type DeveloperProjectDetailResponse = {
  success: boolean;
  workspace: {
    teamId: string;
    teamName: string | null;
    viewerWorkspaceRole: string | null;
    canManageWorkspace: boolean;
  };
  project: DeveloperProject;
};

type UnitForm = {
  reference: string;
  title: string;
  status: string;
  typology: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpots: string;
  privateAreaM2: string;
  price: string;
  floor: string;
  block: string;
  tower: string;
  notes: string;
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

const unitStatusOptions = [
  { value: "AVAILABLE", label: "Disponível" },
  { value: "RESERVED", label: "Reservada" },
  { value: "SOLD", label: "Vendida" },
  { value: "BLOCKED", label: "Bloqueada" },
] as const;

const unitStatusFilterOptions = [
  { value: "ALL", label: "Todos os status" },
  ...unitStatusOptions,
] as const;

const projectStatusOptions = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "PRE_LAUNCH", label: "Pré-lançamento" },
  { value: "LAUNCH", label: "Lançamento" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "SOLD_OUT", label: "Esgotado" },
  { value: "ARCHIVED", label: "Arquivado" },
] as const;

const emptyForm: UnitForm = {
  reference: "",
  title: "",
  status: "AVAILABLE",
  typology: "",
  bedrooms: "",
  bathrooms: "",
  parkingSpots: "",
  privateAreaM2: "",
  price: "",
  floor: "",
  block: "",
  tower: "",
  notes: "",
};

const emptyProjectForm: ProjectForm = {
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

function formatUnitStatus(value?: string | null) {
  switch (value) {
    case "AVAILABLE":
      return "Disponível";
    case "RESERVED":
      return "Reservada";
    case "SOLD":
      return "Vendida";
    case "BLOCKED":
      return "Bloqueada";
    default:
      return "Não definido";
  }
}

function formatCurrencyFromCents(value?: string | null) {
  if (!value) return null;
  const numeric = Number(value) / 100;
  if (!Number.isFinite(numeric)) return null;
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function summarizeUnits(units: DeveloperUnit[]) {
  return units.reduce(
    (summary, unit) => {
      summary.total += 1;
      if (unit.status === "AVAILABLE") summary.available += 1;
      if (unit.status === "RESERVED") summary.reserved += 1;
      if (unit.status === "SOLD") summary.sold += 1;
      if (unit.status === "BLOCKED") summary.blocked += 1;
      return summary;
    },
    { total: 0, available: 0, reserved: 0, sold: 0, blocked: 0 }
  );
}

function buildProjectForm(project: DeveloperProject): ProjectForm {
  return {
    name: project.name || "",
    status: project.status || "DRAFT",
    city: project.city || "",
    state: project.state || "",
    neighborhood: project.neighborhood || "",
    expectedLaunchAt: project.expectedLaunchAt ? String(project.expectedLaunchAt).slice(0, 10) : "",
    coverImageUrl: project.coverImageUrl || "",
    description: project.description || "",
  };
}

function buildUnitForm(unit: DeveloperUnit): UnitForm {
  return {
    reference: unit.reference || "",
    title: unit.title || "",
    status: unit.status || "AVAILABLE",
    typology: unit.typology || "",
    bedrooms: unit.bedrooms !== null ? String(unit.bedrooms) : "",
    bathrooms: unit.bathrooms !== null ? String(unit.bathrooms) : "",
    parkingSpots: unit.parkingSpots !== null ? String(unit.parkingSpots) : "",
    privateAreaM2: unit.privateAreaM2 !== null ? String(unit.privateAreaM2) : "",
    price: unit.priceInCents ? String(Number(unit.priceInCents) / 100) : "",
    floor: unit.floor !== null ? String(unit.floor) : "",
    block: unit.block || "",
    tower: unit.tower || "",
    notes: unit.notes || "",
  };
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

export default function DeveloperProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitSaving, setEditingUnitSaving] = useState(false);
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<DeveloperProjectDetailResponse | null>(null);
  const [form, setForm] = useState<UnitForm>(emptyForm);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [editingUnitForm, setEditingUnitForm] = useState<UnitForm>(emptyForm);
  const [unitSearch, setUnitSearch] = useState("");
  const [unitStatusFilter, setUnitStatusFilter] = useState("ALL");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/signin?callbackUrl=/developer/projects/${params?.id || ""}`);
      return;
    }

    if (status !== "authenticated" || !params?.id) return;

    let active = true;

    const loadProject = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetch(`/api/developer/projects/${params.id}`, { cache: "no-store" });
        const data = await result.json().catch(() => null);

        if (!result.ok || !data?.success || !data?.project) {
          if (!active) return;
          setError(data?.error || "Não foi possível carregar o empreendimento.");
          setResponse(null);
          return;
        }

        if (!active) return;
        setResponse(data as DeveloperProjectDetailResponse);
        setProjectForm(buildProjectForm((data as DeveloperProjectDetailResponse).project));
      } catch {
        if (!active) return;
        setError("Erro inesperado ao carregar o empreendimento.");
        setResponse(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProject();

    return () => {
      active = false;
    };
  }, [params?.id, router, status]);

  const canManageWorkspace = Boolean(response?.workspace.canManageWorkspace);
  const units = useMemo(() => response?.project.units || [], [response?.project.units]);
  const unitsSummary = response?.project.unitsSummary || summarizeUnits([]);
  const filteredUnits = useMemo(() => {
    const query = unitSearch.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesStatus = unitStatusFilter === "ALL" || unit.status === unitStatusFilter;

      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [unit.reference, unit.title, unit.typology, unit.block, unit.tower, unit.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [unitSearch, unitStatusFilter, units]);
  const hasUnitFilters = Boolean(unitSearch.trim()) || unitStatusFilter !== "ALL";

  async function handleCreateUnit() {
    if (!params?.id || saving || !canManageWorkspace) return;

    setSaving(true);
    setToast(null);

    try {
      const result = await fetch(`/api/developer/projects/${params.id}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success || !data?.unit) {
        setToast({ message: data?.error || "Não foi possível cadastrar a unidade.", type: "error" });
        return;
      }

      setResponse((current) => {
        if (!current) return current;
        const nextUnits = [data.unit as DeveloperUnit, ...(current.project.units || [])];
        return {
          ...current,
          project: {
            ...current.project,
            units: nextUnits,
            unitsSummary: summarizeUnits(nextUnits),
          },
        };
      });
      setForm(emptyForm);
      setToast({ message: "Unidade cadastrada com sucesso.", type: "success" });
    } catch {
      setToast({ message: "Erro inesperado ao cadastrar a unidade.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProject() {
    if (!params?.id || projectSaving || !canManageWorkspace) return;

    setProjectSaving(true);
    setToast(null);

    try {
      const result = await fetch(`/api/developer/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success || !data?.project) {
        setToast({ message: data?.error || "Não foi possível atualizar o empreendimento.", type: "error" });
        return;
      }

      const nextProject = data.project as DeveloperProject;
      setResponse((current) => (current ? { ...current, project: nextProject } : current));
      setProjectForm(buildProjectForm(nextProject));
      setEditingProject(false);
      setToast({ message: "Empreendimento atualizado com sucesso.", type: "success" });
    } catch {
      setToast({ message: "Erro inesperado ao atualizar o empreendimento.", type: "error" });
    } finally {
      setProjectSaving(false);
    }
  }

  function startEditingUnit(unit: DeveloperUnit) {
    setEditingUnitId(unit.id);
    setEditingUnitForm(buildUnitForm(unit));
  }

  function cancelEditingUnit() {
    setEditingUnitId(null);
    setEditingUnitForm(emptyForm);
  }

  async function handleSaveUnit(unitId: string) {
    if (!params?.id || !editingUnitId || editingUnitId !== unitId || editingUnitSaving || !canManageWorkspace) return;

    setEditingUnitSaving(true);
    setToast(null);

    try {
      const result = await fetch(`/api/developer/projects/${params.id}/units/${unitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUnitForm),
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success || !data?.unit) {
        setToast({ message: data?.error || "Não foi possível atualizar a unidade.", type: "error" });
        return;
      }

      const nextUnit = data.unit as DeveloperUnit;
      setResponse((current) => {
        if (!current) return current;
        const nextUnits = (current.project.units || []).map((unit) => (unit.id === unitId ? nextUnit : unit));
        return {
          ...current,
          project: {
            ...current.project,
            units: nextUnits,
            unitsSummary: summarizeUnits(nextUnits),
          },
        };
      });
      cancelEditingUnit();
      setToast({ message: "Unidade atualizada com sucesso.", type: "success" });
    } catch {
      setToast({ message: "Erro inesperado ao atualizar a unidade.", type: "error" });
    } finally {
      setEditingUnitSaving(false);
    }
  }

  async function handleDeleteUnit(unit: DeveloperUnit) {
    if (!params?.id || !canManageWorkspace || deletingUnitId) return;

    const confirmed = window.confirm(
      `Excluir a unidade ${unit.reference}? Essa ação não poderá ser desfeita.`
    );

    if (!confirmed) return;

    setDeletingUnitId(unit.id);
    setToast(null);

    try {
      const result = await fetch(`/api/developer/projects/${params.id}/units/${unit.id}`, {
        method: "DELETE",
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success) {
        setToast({ message: data?.error || "Não foi possível excluir a unidade.", type: "error" });
        return;
      }

      setResponse((current) => {
        if (!current) return current;
        const nextUnits = (current.project.units || []).filter((item) => item.id !== unit.id);
        return {
          ...current,
          project: {
            ...current.project,
            units: nextUnits,
            unitsSummary: summarizeUnits(nextUnits),
          },
        };
      });

      if (editingUnitId === unit.id) {
        cancelEditingUnit();
      }

      setToast({ message: "Unidade excluída com sucesso.", type: "success" });
    } catch {
      setToast({ message: "Erro inesperado ao excluir a unidade.", type: "error" });
    } finally {
      setDeletingUnitId(null);
    }
  }

  async function handleDeleteProject() {
    if (!params?.id || !response?.project || !canManageWorkspace || deletingProject) return;

    if ((response.project.unitsSummary?.total || 0) > 0) {
      setToast({ message: "Exclua todas as unidades antes de remover o empreendimento.", type: "error" });
      return;
    }

    const confirmed = window.confirm(
      `Excluir o empreendimento ${response.project.name}? Essa ação não poderá ser desfeita.`
    );

    if (!confirmed) return;

    setDeletingProject(true);
    setToast(null);

    try {
      const result = await fetch(`/api/developer/projects/${params.id}`, {
        method: "DELETE",
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success) {
        setToast({ message: data?.error || "Não foi possível excluir o empreendimento.", type: "error" });
        return;
      }

      router.push("/developer/projects");
    } catch {
      setToast({ message: "Erro inesperado ao excluir o empreendimento.", type: "error" });
    } finally {
      setDeletingProject(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Empreendimento"
        description="Carregando a operação do lançamento."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Incorporadora", href: "/developer" },
          { label: "Empreendimentos", href: "/developer/projects" },
          { label: "Empreendimento" },
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
        title={response?.project.name || "Empreendimento"}
        description="Gestão inicial de unidades e visão operacional do lançamento."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Incorporadora", href: "/developer" },
          { label: "Empreendimentos", href: "/developer/projects" },
          { label: response?.project.name || "Empreendimento" },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            {canManageWorkspace ? (
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deletingProject}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir empreendimento
              </button>
            ) : null}
            <Link
              href="/developer/projects"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar aos empreendimentos
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {error || !response ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
              <div className="text-base font-semibold">Não foi possível carregar o empreendimento.</div>
              <div className="mt-2 text-sm">{error || "Empreendimento não encontrado."}</div>
              <div className="mt-4">
                <Link href={role === "DEVELOPER" || role === "ADMIN" ? "/developer/projects" : "/developer/register"} className="text-sm font-semibold underline">
                  Voltar
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2">
                <MetricCard label="Unidades" value={unitsSummary.total} helper="Inventário do lançamento" />
                <MetricCard label="Disponíveis" value={unitsSummary.available} helper="Base pronta para comercialização" />
                <MetricCard label="Reservadas" value={unitsSummary.reserved} helper="Em negociação" />
                <MetricCard label="Vendidas" value={unitsSummary.sold} helper="Fechamentos registrados" />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        <Building2 className="h-3.5 w-3.5" />
                        {formatProjectStatus(response.project.status)}
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">{response.project.name}</h2>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-600">
                        {response.project.city || response.project.state || response.project.neighborhood ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {[response.project.neighborhood, response.project.city, response.project.state].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                        {response.project.expectedLaunchAt ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4" />
                            Previsão: {new Date(response.project.expectedLaunchAt).toLocaleDateString("pt-BR")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-700">
                      {response.workspace.viewerWorkspaceRole || "Sem papel"}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">Dados do empreendimento</h3>
                      {canManageWorkspace ? (
                        editingProject ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setProjectForm(buildProjectForm(response.project));
                                setEditingProject(false);
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-white"
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveProject}
                              disabled={projectSaving}
                              className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {projectSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              Salvar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingProject(true)}
                            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar empreendimento
                          </button>
                        )
                      ) : null}
                    </div>

                    {editingProject ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Input label="Nome do empreendimento" value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} disabled={projectSaving} />
                          <Select label="Status" value={projectForm.status} onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))} disabled={projectSaving}>
                            {projectStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </Select>
                          <Input label="Cidade" value={projectForm.city} onChange={(event) => setProjectForm((current) => ({ ...current, city: event.target.value }))} disabled={projectSaving} />
                          <Input label="Estado" value={projectForm.state} onChange={(event) => setProjectForm((current) => ({ ...current, state: event.target.value }))} disabled={projectSaving} />
                          <Input label="Bairro" value={projectForm.neighborhood} onChange={(event) => setProjectForm((current) => ({ ...current, neighborhood: event.target.value }))} disabled={projectSaving} />
                          <Input label="Previsão de lançamento" type="date" value={projectForm.expectedLaunchAt} onChange={(event) => setProjectForm((current) => ({ ...current, expectedLaunchAt: event.target.value }))} disabled={projectSaving} />
                        </div>
                        <Input label="Imagem de capa" value={projectForm.coverImageUrl} onChange={(event) => setProjectForm((current) => ({ ...current, coverImageUrl: event.target.value }))} disabled={projectSaving} placeholder="https://..." />
                        <Textarea label="Descrição" value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} disabled={projectSaving} rows={4} />
                      </div>
                    ) : response.project.description ? (
                      <div className="mt-4 text-sm text-neutral-700">{response.project.description}</div>
                    ) : (
                      <div className="mt-4 text-sm text-neutral-500">Nenhuma descrição institucional cadastrada para este empreendimento.</div>
                    )}
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-base font-semibold text-neutral-950">Unidades do empreendimento</h3>
                      <div className="text-sm text-neutral-500">
                        {hasUnitFilters ? `${filteredUnits.length} de ${units.length} cadastro(s)` : `${units.length} cadastro(s)`}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(220px,0.7fr)_auto] md:items-end">
                      <Input
                        label="Buscar unidade"
                        value={unitSearch}
                        onChange={(event) => setUnitSearch(event.target.value)}
                        placeholder="Referência, título, tipologia, bloco..."
                      />
                      <Select
                        label="Status"
                        value={unitStatusFilter}
                        onChange={(event) => setUnitStatusFilter(event.target.value)}
                      >
                        {unitStatusFilterOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => {
                          setUnitSearch("");
                          setUnitStatusFilter("ALL");
                        }}
                        disabled={!hasUnitFilters}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Limpar filtros
                      </button>
                    </div>

                    {units.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
                        Nenhuma unidade cadastrada ainda. Use o formulário ao lado para iniciar a tabela do lançamento.
                      </div>
                    ) : filteredUnits.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
                        Nenhuma unidade encontrada com os filtros atuais.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredUnits.map((unit) => (
                          <article key={unit.id} className="rounded-2xl border border-neutral-200 p-5">
                            {editingUnitId === unit.id ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="text-sm font-semibold text-neutral-950">Editando unidade {unit.reference}</div>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={cancelEditingUnit} className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50">
                                      <X className="h-3.5 w-3.5" />
                                      Cancelar
                                    </button>
                                    <button type="button" onClick={() => handleSaveUnit(unit.id)} disabled={editingUnitSaving} className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">
                                      {editingUnitSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                      Salvar unidade
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <Input label="Referência" value={editingUnitForm.reference} onChange={(event) => setEditingUnitForm((current) => ({ ...current, reference: event.target.value }))} disabled={editingUnitSaving} />
                                  <Select label="Status" value={editingUnitForm.status} onChange={(event) => setEditingUnitForm((current) => ({ ...current, status: event.target.value }))} disabled={editingUnitSaving}>
                                    {unitStatusOptions.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </Select>
                                  <Input label="Título comercial" value={editingUnitForm.title} onChange={(event) => setEditingUnitForm((current) => ({ ...current, title: event.target.value }))} disabled={editingUnitSaving} />
                                  <Input label="Tipologia" value={editingUnitForm.typology} onChange={(event) => setEditingUnitForm((current) => ({ ...current, typology: event.target.value }))} disabled={editingUnitSaving} />
                                  <Input label="Quartos" value={editingUnitForm.bedrooms} onChange={(event) => setEditingUnitForm((current) => ({ ...current, bedrooms: event.target.value }))} disabled={editingUnitSaving} />
                                  <Input label="Banheiros" value={editingUnitForm.bathrooms} onChange={(event) => setEditingUnitForm((current) => ({ ...current, bathrooms: event.target.value }))} disabled={editingUnitSaving} />
                                  <Input label="Vagas" value={editingUnitForm.parkingSpots} onChange={(event) => setEditingUnitForm((current) => ({ ...current, parkingSpots: event.target.value }))} disabled={editingUnitSaving} />
                                  <Input label="Área privativa (m²)" value={editingUnitForm.privateAreaM2} onChange={(event) => setEditingUnitForm((current) => ({ ...current, privateAreaM2: event.target.value }))} disabled={editingUnitSaving} />
                                  <Input label="Preço (R$)" value={editingUnitForm.price} onChange={(event) => setEditingUnitForm((current) => ({ ...current, price: event.target.value }))} disabled={editingUnitSaving} />
                                  <Input label="Andar" value={editingUnitForm.floor} onChange={(event) => setEditingUnitForm((current) => ({ ...current, floor: event.target.value }))} disabled={editingUnitSaving} />
                                  <Input label="Bloco" value={editingUnitForm.block} onChange={(event) => setEditingUnitForm((current) => ({ ...current, block: event.target.value }))} disabled={editingUnitSaving} />
                                  <Input label="Torre" value={editingUnitForm.tower} onChange={(event) => setEditingUnitForm((current) => ({ ...current, tower: event.target.value }))} disabled={editingUnitSaving} />
                                </div>
                                <Textarea label="Observações" value={editingUnitForm.notes} onChange={(event) => setEditingUnitForm((current) => ({ ...current, notes: event.target.value }))} disabled={editingUnitSaving} rows={4} />
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                                      <DoorOpen className="h-3.5 w-3.5" />
                                      {formatUnitStatus(unit.status)}
                                    </div>
                                    <h4 className="mt-3 text-lg font-semibold text-neutral-950">{unit.title || `Unidade ${unit.reference}`}</h4>
                                    <div className="mt-2 text-sm text-neutral-600">Ref.: {unit.reference}</div>
                                  </div>

                                  <div className="flex flex-col items-end gap-3">
                                    <div className="grid min-w-[250px] grid-cols-2 gap-3 text-sm">
                                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                                        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Tipologia</div>
                                        <div className="mt-1 font-semibold text-neutral-950">{unit.typology || "Não informada"}</div>
                                      </div>
                                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                                        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Preço</div>
                                        <div className="mt-1 font-semibold text-neutral-950">{formatCurrencyFromCents(unit.priceInCents) || "Não informado"}</div>
                                      </div>
                                    </div>
                                    {canManageWorkspace ? (
                                      <div className="flex items-center gap-4">
                                        <button type="button" onClick={() => startEditingUnit(unit)} className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 underline">
                                          <Pencil className="h-4 w-4" />
                                          Editar unidade
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteUnit(unit)}
                                          disabled={deletingUnitId === unit.id}
                                          className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 underline disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {deletingUnitId === unit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                          Excluir unidade
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-neutral-700 md:grid-cols-4">
                                  <div className="rounded-xl bg-neutral-50 px-3 py-3">{unit.privateAreaM2 ? `${unit.privateAreaM2} m² privativos` : "Área não informada"}</div>
                                  <div className="rounded-xl bg-neutral-50 px-3 py-3">{unit.bedrooms !== null ? `${unit.bedrooms} quarto(s)` : "Quartos não informados"}</div>
                                  <div className="rounded-xl bg-neutral-50 px-3 py-3">{unit.bathrooms !== null ? `${unit.bathrooms} banheiro(s)` : "Banheiros não informados"}</div>
                                  <div className="rounded-xl bg-neutral-50 px-3 py-3">{unit.parkingSpots !== null ? `${unit.parkingSpots} vaga(s)` : "Vagas não informadas"}</div>
                                </div>

                                {unit.notes ? (
                                  <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                                    {unit.notes}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <aside className="space-y-6">
                  <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-5 w-5 text-neutral-700" />
                      <h2 className="text-base font-semibold text-neutral-950">Nova unidade</h2>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                          label="Referência"
                          required
                          value={form.reference}
                          onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                          disabled={!canManageWorkspace || saving}
                          placeholder="Ex.: 1203-A"
                        />
                        <Select
                          label="Status"
                          value={form.status}
                          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                          disabled={!canManageWorkspace || saving}
                        >
                          {unitStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Input
                        label="Título comercial"
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                        disabled={!canManageWorkspace || saving}
                        placeholder="Ex.: Unidade com vista nascente"
                      />
                      <Input
                        label="Tipologia"
                        value={form.typology}
                        onChange={(event) => setForm((current) => ({ ...current, typology: event.target.value }))}
                        disabled={!canManageWorkspace || saving}
                        placeholder="Ex.: 2 quartos com suíte"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Quartos" value={form.bedrooms} onChange={(event) => setForm((current) => ({ ...current, bedrooms: event.target.value }))} disabled={!canManageWorkspace || saving} />
                        <Input label="Banheiros" value={form.bathrooms} onChange={(event) => setForm((current) => ({ ...current, bathrooms: event.target.value }))} disabled={!canManageWorkspace || saving} />
                        <Input label="Vagas" value={form.parkingSpots} onChange={(event) => setForm((current) => ({ ...current, parkingSpots: event.target.value }))} disabled={!canManageWorkspace || saving} />
                        <Input label="Área privativa (m²)" value={form.privateAreaM2} onChange={(event) => setForm((current) => ({ ...current, privateAreaM2: event.target.value }))} disabled={!canManageWorkspace || saving} />
                        <Input label="Preço (R$)" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} disabled={!canManageWorkspace || saving} placeholder="650000" />
                        <Input label="Andar" value={form.floor} onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))} disabled={!canManageWorkspace || saving} />
                        <Input label="Bloco" value={form.block} onChange={(event) => setForm((current) => ({ ...current, block: event.target.value }))} disabled={!canManageWorkspace || saving} />
                        <Input label="Torre" value={form.tower} onChange={(event) => setForm((current) => ({ ...current, tower: event.target.value }))} disabled={!canManageWorkspace || saving} />
                      </div>
                      <Textarea
                        label="Observações"
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        disabled={!canManageWorkspace || saving}
                        rows={4}
                        placeholder="Condições, diferenciais, posição solar, varanda, etc."
                      />
                      <button
                        type="button"
                        onClick={handleCreateUnit}
                        disabled={!canManageWorkspace || saving}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        Cadastrar unidade
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-neutral-950">Próximas extensões</h2>
                    <div className="mt-4 space-y-3 text-sm text-neutral-700">
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        Próxima camada: exclusão controlada de unidades, espelho de tabela e regras comerciais por tipologia.
                      </div>
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        Integração de leads diretamente neste empreendimento e nas unidades disponíveis.
                      </div>
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        Materiais comerciais, book de vendas e ativos institucionais do lançamento.
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
