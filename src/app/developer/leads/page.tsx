"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  DoorOpen,
  Filter,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCcw,
  Search,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { formatPublicCode } from "@/lib/public-code";

type DeveloperLeadListItem = {
  id: string;
  publicCode?: string | null;
  status: string;
  pipelineStage?: string | null;
  createdAt: string;
  hasUnreadMessages?: boolean;
  lastMessageAt?: string | null;
  developmentProject?: {
    id: string;
    name: string;
  } | null;
  developmentUnit?: {
    id: string;
    reference: string;
    title?: string | null;
    status: string;
  } | null;
  property: {
    id: string;
    publicCode?: string | null;
    title: string;
    price?: number;
    city: string;
    state: string;
    neighborhood?: string | null;
    images: Array<{ url: string }>;
  };
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

type DeveloperLeadsResponse = {
  success: boolean;
  workspace: {
    teamId: string;
    teamName: string | null;
    viewerWorkspaceRole: string | null;
    canManageWorkspace: boolean;
  };
  scope: {
    project: {
      id: string;
      name: string | null;
    } | null;
    unit: {
      id: string;
      reference: string;
      title: string | null;
    } | null;
  };
  items: DeveloperLeadListItem[];
};

const currencyBRL = (value: number) => {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(Number(value || 0) / 100));
  } catch {
    return String(value || 0);
  }
};

const formatShortDate = (value: string) => {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
};

const stageLabel = (stage?: string | null) => {
  const s = String(stage || "").toUpperCase();
  if (!s) return "Novo";
  if (s === "NEW") return "Novo";
  if (s === "CONTACT") return "Em contato";
  if (s === "VISIT") return "Visita";
  if (s === "PROPOSAL") return "Proposta";
  if (s === "DOCUMENTS") return "Documentos";
  if (s === "WON") return "Fechado";
  if (s === "LOST") return "Perdido";
  return s;
};

const statusLabel = (status?: string | null) => {
  const s = String(status || "").toUpperCase();
  if (!s) return "Não definido";
  if (s === "RESERVED") return "Reservado";
  if (s === "ACCEPTED") return "Aceito";
  if (s === "COMPLETED") return "Concluído";
  if (s === "CANCELLED") return "Cancelado";
  if (s === "EXPIRED") return "Expirado";
  if (s === "OWNER_REJECTED") return "Recusado pelo proprietário";
  return s;
};

function stageBadgeClass(stage?: string | null) {
  const normalized = getCanonicalStage(stage);
  if (normalized === "WON") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "LOST") return "border-rose-200 bg-rose-50 text-rose-700";
  if (normalized === "DOCUMENTS") return "border-violet-200 bg-violet-50 text-violet-700";
  if (normalized === "PROPOSAL") return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
  if (normalized === "VISIT") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "CONTACT") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-neutral-200 bg-neutral-100 text-neutral-700";
}

function statusBadgeClass(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "CANCELLED" || normalized === "OWNER_REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (normalized === "EXPIRED") return "border-orange-200 bg-orange-50 text-orange-700";
  if (normalized === "ACCEPTED") return "border-blue-200 bg-blue-50 text-blue-700";
  if (normalized === "RESERVED") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-neutral-200 bg-white text-neutral-600";
}

function funnelStageClass(stage: PipelineStage, currentStage: PipelineStage, nextStage: PipelineStage | null) {
  if (stage === currentStage) return "border-neutral-900 bg-neutral-900 text-white";
  if (nextStage && stage === nextStage) return "border-teal-200 bg-teal-50 text-teal-700";
  return "border-neutral-200 bg-white text-neutral-500";
}

const PIPELINE_STAGE_OPTIONS = [
  { value: "ALL", label: "Todas as etapas" },
  { value: "NEW", label: "Novo" },
  { value: "CONTACT", label: "Em contato" },
  { value: "VISIT", label: "Visita" },
  { value: "PROPOSAL", label: "Proposta" },
  { value: "DOCUMENTS", label: "Documentos" },
  { value: "WON", label: "Fechado" },
  { value: "LOST", label: "Perdido" },
] as const;

const STATUS_OPTIONS = [
  { value: "ALL", label: "Todos os status" },
  { value: "RESERVED", label: "Reservado" },
  { value: "ACCEPTED", label: "Aceito" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "EXPIRED", label: "Expirado" },
  { value: "OWNER_REJECTED", label: "Recusado pelo proprietário" },
] as const;

const UNIT_LINK_OPTIONS = [
  { value: "ALL", label: "Todos os vínculos" },
  { value: "WITH_UNIT", label: "Com unidade" },
  { value: "PROJECT_ONLY", label: "Só empreendimento" },
] as const;

const PIPELINE_STAGE_FLOW = ["NEW", "CONTACT", "VISIT", "PROPOSAL", "DOCUMENTS", "WON", "LOST"] as const;
type PipelineStage = (typeof PIPELINE_STAGE_FLOW)[number];
type PriorityFilter = "ALL" | "FIRST_CONTACT" | "NEGOTIATION" | "UNREAD" | "CLOSED";
type LeadSortOption = "recent" | "oldest" | "last_message" | "price_desc" | "price_asc" | "stage";

function getCanonicalStage(stage?: string | null): PipelineStage {
  const normalized = String(stage || "NEW").toUpperCase();
  if (PIPELINE_STAGE_FLOW.includes(normalized as PipelineStage)) {
    return normalized as PipelineStage;
  }
  return "NEW";
}

function getNextQuickStage(stage?: string | null): PipelineStage | null {
  const current = getCanonicalStage(stage);
  const currentIndex = PIPELINE_STAGE_FLOW.indexOf(current);
  if (current === "WON" || current === "LOST") return null;
  if (currentIndex < 0) return "CONTACT";
  const next = PIPELINE_STAGE_FLOW[currentIndex + 1];
  return next || null;
}

function matchesPriorityFilter(lead: DeveloperLeadListItem, priorityFilter: PriorityFilter) {
  const stage = getCanonicalStage(lead.pipelineStage);

  if (priorityFilter === "FIRST_CONTACT") {
    return stage === "NEW" || stage === "CONTACT";
  }

  if (priorityFilter === "NEGOTIATION") {
    return stage === "VISIT" || stage === "PROPOSAL" || stage === "DOCUMENTS";
  }

  if (priorityFilter === "UNREAD") {
    return Boolean(lead.hasUnreadMessages);
  }

  if (priorityFilter === "CLOSED") {
    return stage === "WON" || stage === "LOST";
  }

  return true;
}

function priorityFilterLabel(priorityFilter: PriorityFilter) {
  if (priorityFilter === "FIRST_CONTACT") return "Primeiro contato";
  if (priorityFilter === "NEGOTIATION") return "Negociação ativa";
  if (priorityFilter === "UNREAD") return "Mensagens não lidas";
  if (priorityFilter === "CLOSED") return "Finalizados";
  return "Todas as prioridades";
}

function sortOptionLabel(sort: LeadSortOption) {
  if (sort === "oldest") return "Mais antigos";
  if (sort === "last_message") return "Última atividade";
  if (sort === "price_desc") return "Maior preço";
  if (sort === "price_asc") return "Menor preço";
  if (sort === "stage") return "Etapa do funil";
  return "Mais recentes";
}

const LEAD_SORT_OPTIONS: Array<{ value: LeadSortOption; label: string }> = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "last_message", label: "Última atividade" },
  { value: "price_desc", label: "Maior preço" },
  { value: "price_asc", label: "Menor preço" },
  { value: "stage", label: "Etapa do funil" },
];

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{value}</div>
      <div className="mt-2 text-sm text-neutral-600">{helper}</div>
    </div>
  );
}

export default function DeveloperLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [response, setResponse] = useState<DeveloperLeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<(typeof PIPELINE_STAGE_OPTIONS)[number]["value"]>("ALL");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("ALL");
  const [unitLinkFilter, setUnitLinkFilter] = useState<(typeof UNIT_LINK_OPTIONS)[number]["value"]>("ALL");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [sortBy, setSortBy] = useState<LeadSortOption>("recent");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [stageUpdatingByLead, setStageUpdatingByLead] = useState<Record<string, boolean>>({});
  const [stageErrorByLead, setStageErrorByLead] = useState<Record<string, string | null>>({});

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  const projectIdFilter = searchParams.get("projectId");
  const unitIdFilter = searchParams.get("unitId");
  const prioritySearchParam = String(searchParams.get("priority") || "").toUpperCase();

  useEffect(() => {
    if (prioritySearchParam === "FIRST_CONTACT" || prioritySearchParam === "NEGOTIATION" || prioritySearchParam === "UNREAD" || prioritySearchParam === "CLOSED") {
      setPriorityFilter(prioritySearchParam as PriorityFilter);
      return;
    }

    if (!prioritySearchParam) {
      setPriorityFilter("ALL");
    }
  }, [prioritySearchParam]);

  useEffect(() => {
    if (status === "unauthenticated") {
      const params = new URLSearchParams();
      if (projectIdFilter) params.set("projectId", projectIdFilter);
      if (unitIdFilter) params.set("unitId", unitIdFilter);
      if (prioritySearchParam) params.set("priority", prioritySearchParam);
      const callbackUrl = params.toString() ? `/developer/leads?${params.toString()}` : "/developer/leads";
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [prioritySearchParam, projectIdFilter, router, status, unitIdFilter]);

  const fetchLeads = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      setError(null);
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (projectIdFilter) params.set("projectId", projectIdFilter);
      if (unitIdFilter) params.set("unitId", unitIdFilter);

      const result = await fetch(`/api/developer/leads${params.toString() ? `?${params.toString()}` : ""}`, {
        cache: "no-store",
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos carregar os leads do workspace.");
      }

      setResponse(data as DeveloperLeadsResponse);
    } catch (err: any) {
      console.error("Error fetching developer leads:", err);
      setError(err?.message || "Não conseguimos carregar os leads do workspace.");
      setResponse(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [projectIdFilter, unitIdFilter]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetchLeads();
  }, [fetchLeads, status]);

  const handleAdvanceStage = useCallback(async (leadId: string) => {
    if (!response?.workspace?.canManageWorkspace) return;

    const lead = (response.items || []).find((item) => String(item.id) === String(leadId));
    if (!lead) return;

    const nextStage = getNextQuickStage(lead.pipelineStage);
    if (!nextStage) return;

    const previousLead = lead;

    try {
      setStageUpdatingByLead((current) => ({ ...current, [leadId]: true }));
      setStageErrorByLead((current) => ({ ...current, [leadId]: null }));
      setResponse((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                String(item.id) === String(leadId)
                  ? {
                      ...item,
                      pipelineStage: nextStage,
                    }
                  : item
              ),
            }
          : current
      );

      const result = await fetch(`/api/developer/leads/${leadId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success || !data?.lead) {
        throw new Error(data?.error || "Não conseguimos atualizar a etapa deste lead agora.");
      }

      setResponse((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                String(item.id) === String(leadId)
                  ? {
                      ...item,
                      status: data.lead.status || item.status,
                      pipelineStage: data.lead.pipelineStage || item.pipelineStage,
                    }
                  : item
              ),
            }
          : current
      );
    } catch (err: any) {
      console.error("Error advancing developer lead pipeline stage from list:", err);
      setStageErrorByLead((current) => ({
        ...current,
        [leadId]: err?.message || "Não conseguimos atualizar a etapa deste lead agora.",
      }));
      setResponse((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                String(item.id) === String(leadId)
                  ? {
                      ...item,
                      status: previousLead.status,
                      pipelineStage: previousLead.pipelineStage,
                    }
                  : item
              ),
            }
          : current
      );
    } finally {
      setStageUpdatingByLead((current) => ({ ...current, [leadId]: false }));
    }
  }, [response]);

  const leads = useMemo(() => response?.items || [], [response?.items]);
  const summaryBase = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const normalizedStatus = String(lead.status || "").toUpperCase();
      if (statusFilter !== "ALL" && normalizedStatus !== statusFilter) return false;
      if (unitLinkFilter === "WITH_UNIT" && !lead.developmentUnit?.id) return false;
      if (unitLinkFilter === "PROJECT_ONLY" && lead.developmentUnit?.id) return false;
      if (onlyUnread && !lead.hasUnreadMessages) return false;
      if (!q) return true;

      const leadCode = lead.publicCode ? formatPublicCode(String(lead.publicCode)).toLowerCase() : "";
      const propertyCode = lead.property?.publicCode ? formatPublicCode(String(lead.property.publicCode)).toLowerCase() : "";
      const haystack = [
        lead.id,
        lead.property?.title,
        lead.property?.city,
        lead.property?.state,
        lead.property?.neighborhood,
        lead.contact?.name,
        lead.contact?.email,
        lead.contact?.phone,
        lead.developmentProject?.name,
        lead.developmentUnit?.reference,
        lead.developmentUnit?.title,
        leadCode,
        propertyCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [leads, onlyUnread, query, statusFilter, unitLinkFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const normalizedStage = String(lead.pipelineStage || "NEW").toUpperCase();
      const normalizedStatus = String(lead.status || "").toUpperCase();
      if (stageFilter !== "ALL" && normalizedStage !== stageFilter) return false;
      if (statusFilter !== "ALL" && normalizedStatus !== statusFilter) return false;
      if (unitLinkFilter === "WITH_UNIT" && !lead.developmentUnit?.id) return false;
      if (unitLinkFilter === "PROJECT_ONLY" && lead.developmentUnit?.id) return false;
      if (onlyUnread && !lead.hasUnreadMessages) return false;
      if (!matchesPriorityFilter(lead, priorityFilter)) return false;
      if (!q) return true;

      const leadCode = lead.publicCode ? formatPublicCode(String(lead.publicCode)).toLowerCase() : "";
      const propertyCode = lead.property?.publicCode ? formatPublicCode(String(lead.property.publicCode)).toLowerCase() : "";
      const haystack = [
        lead.id,
        lead.property?.title,
        lead.property?.city,
        lead.property?.state,
        lead.property?.neighborhood,
        lead.contact?.name,
        lead.contact?.email,
        lead.contact?.phone,
        lead.developmentProject?.name,
        lead.developmentUnit?.reference,
        lead.developmentUnit?.title,
        leadCode,
        propertyCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [leads, onlyUnread, priorityFilter, query, stageFilter, statusFilter, unitLinkFilter]);

  const hasAdvancedFilters = stageFilter !== "ALL" || statusFilter !== "ALL" || unitLinkFilter !== "ALL" || onlyUnread || priorityFilter !== "ALL";
  const canManagePipeline = Boolean(response?.workspace?.canManageWorkspace);

  const stageSummary = useMemo(
    () =>
      PIPELINE_STAGE_FLOW.map((stage) => ({
        stage,
        count: summaryBase.filter((lead) => getCanonicalStage(lead.pipelineStage) === stage).length,
      })),
    [summaryBase]
  );

  const prioritySummary = useMemo(() => {
    const firstContact = summaryBase.filter((lead) => {
      const stage = getCanonicalStage(lead.pipelineStage);
      return stage === "NEW" || stage === "CONTACT";
    }).length;

    const negotiation = summaryBase.filter((lead) => {
      const stage = getCanonicalStage(lead.pipelineStage);
      return stage === "VISIT" || stage === "PROPOSAL" || stage === "DOCUMENTS";
    }).length;

    const unread = summaryBase.filter((lead) => Boolean(lead.hasUnreadMessages)).length;
    const closed = summaryBase.filter((lead) => {
      const stage = getCanonicalStage(lead.pipelineStage);
      return stage === "WON" || stage === "LOST";
    }).length;

    return {
      firstContact,
      negotiation,
      unread,
      closed,
    };
  }, [summaryBase]);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];

    if (query.trim()) {
      chips.push({ key: "query", label: `Busca: ${query.trim()}`, clear: () => setQuery("") });
    }
    if (stageFilter !== "ALL") {
      chips.push({ key: "stage", label: `Etapa: ${stageLabel(stageFilter)}`, clear: () => setStageFilter("ALL") });
    }
    if (statusFilter !== "ALL") {
      chips.push({
        key: "status",
        label: `Status: ${STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label || statusFilter}`,
        clear: () => setStatusFilter("ALL"),
      });
    }
    if (unitLinkFilter !== "ALL") {
      chips.push({
        key: "unitLink",
        label: `Vínculo: ${UNIT_LINK_OPTIONS.find((option) => option.value === unitLinkFilter)?.label || unitLinkFilter}`,
        clear: () => setUnitLinkFilter("ALL"),
      });
    }
    if (onlyUnread) {
      chips.push({ key: "unread", label: "Somente não lidos", clear: () => setOnlyUnread(false) });
    }
    if (priorityFilter !== "ALL") {
      chips.push({ key: "priority", label: `Prioridade: ${priorityFilterLabel(priorityFilter)}`, clear: () => setPriorityFilter("ALL") });
    }

    return chips;
  }, [onlyUnread, priorityFilter, query, stageFilter, statusFilter, unitLinkFilter]);

  const sorted = useMemo(() => {
    const items = [...filtered];

    items.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sortBy === "last_message") {
        const aValue = new Date(a.lastMessageAt || a.createdAt).getTime();
        const bValue = new Date(b.lastMessageAt || b.createdAt).getTime();
        return bValue - aValue;
      }

      if (sortBy === "price_desc") {
        return Number(b.property?.price || 0) - Number(a.property?.price || 0);
      }

      if (sortBy === "price_asc") {
        return Number(a.property?.price || 0) - Number(b.property?.price || 0);
      }

      if (sortBy === "stage") {
        const rankA = PIPELINE_STAGE_FLOW.indexOf(getCanonicalStage(a.pipelineStage));
        const rankB = PIPELINE_STAGE_FLOW.indexOf(getCanonicalStage(b.pipelineStage));
        if (rankA !== rankB) return rankA - rankB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return items;
  }, [filtered, sortBy]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / pageSize)), [pageSize, sorted.length]);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [currentPage, pageSize, sorted]);

  const currentRange = useMemo(() => {
    if (sorted.length === 0) return { start: 0, end: 0 };
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, sorted.length);
    return { start, end };
  }, [currentPage, pageSize, sorted.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [onlyUnread, pageSize, priorityFilter, query, sortBy, stageFilter, statusFilter, unitLinkFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const summary = useMemo(() => {
    return {
      total: filtered.length,
      unitLinked: filtered.filter((lead) => lead.developmentUnit?.id).length,
      projectOnly: filtered.filter((lead) => lead.developmentProject?.id && !lead.developmentUnit?.id).length,
      unread: filtered.filter((lead) => lead.hasUnreadMessages).length,
    };
  }, [filtered]);

  const title = response?.scope.unit
    ? `Leads da unidade ${response.scope.unit.reference}`
    : response?.scope.project
      ? "Leads do empreendimento"
      : "Leads de lançamentos";

  const description = response?.scope.unit
    ? `${response.scope.project?.name || "Empreendimento"} · ${response.scope.unit.title || response.scope.unit.reference}`
    : response?.scope.project
      ? `Acompanhamento dos leads vinculados a ${response.scope.project.name || "este empreendimento"}.`
      : "Acompanhe os interesses vinculados aos empreendimentos e unidades do workspace DEVELOPER.";

  if (loading) {
    return <CenteredSpinner message="Carregando leads do workspace..." />;
  }

  return (
    <DashboardLayout
      title={title}
      description={description}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Incorporadora", href: "/developer" },
        { label: "Empreendimentos", href: "/developer/projects" },
        { label: "Leads" },
      ]}
      actions={
        <div className="flex flex-wrap gap-3">
          {response?.scope.project?.id ? (
            <Link
              href={`/developer/projects/${response.scope.project.id}`}
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Ver empreendimento
            </Link>
          ) : null}
          <Link
            href="/developer/projects"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos empreendimentos
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <div className="text-base font-semibold">Não foi possível carregar os leads.</div>
            <div className="mt-2 text-sm">{error}</div>
            <div className="mt-4">
              <Link href={role === "DEVELOPER" || role === "ADMIN" ? "/developer/projects" : "/developer/register"} className="text-sm font-semibold underline">
                Voltar
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Leads" value={summary.total} helper="Interesses encontrados com os filtros atuais" />
              <MetricCard label="Por unidade" value={summary.unitLinked} helper="Leads vinculados a unidades específicas" />
              <MetricCard label="Do projeto" value={summary.projectOnly} helper="Leads associados só ao empreendimento" />
              <MetricCard label="Novas mensagens" value={summary.unread} helper="Conversas com atividade não lida para você" />
            </div>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-neutral-950">Resumo do funil</h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Visão agregada do contexto atual da lista. Clique em uma etapa para aplicar ou remover o filtro.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setStageFilter("ALL")}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${stageFilter === "ALL" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}
                    >
                      <span>Todas</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${stageFilter === "ALL" ? "bg-white/15 text-white" : "bg-neutral-100 text-neutral-700"}`}>
                        {summaryBase.length}
                      </span>
                    </button>
                    {stageSummary.map(({ stage, count }) => {
                      const active = stageFilter === stage;
                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => setStageFilter((current) => (current === stage ? "ALL" : stage))}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${active ? "border-neutral-900 bg-neutral-900 text-white" : `${stageBadgeClass(stage)} hover:opacity-90`}`}
                        >
                          <span>{stageLabel(stage)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15 text-white" : "bg-white/70 text-current"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeFilterChips.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeFilterChips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={chip.clear}
                          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
                        >
                          <span>{chip.label}</span>
                          <span className="text-neutral-400">×</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="xl:w-[360px]">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Prioridades da lista</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <button
                      type="button"
                      onClick={() => setPriorityFilter((current) => (current === "FIRST_CONTACT" ? "ALL" : "FIRST_CONTACT"))}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${priorityFilter === "FIRST_CONTACT" ? "border-amber-400 bg-amber-100 shadow-sm" : "border-amber-200 bg-amber-50 hover:bg-amber-100"}`}
                    >
                      <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Primeiro contato</div>
                      <div className="mt-2 text-2xl font-semibold text-amber-900">{prioritySummary.firstContact}</div>
                      <div className="mt-1 text-sm text-amber-800">Leads em `NEW` ou `CONTACT` pedindo evolução inicial.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriorityFilter((current) => (current === "NEGOTIATION" ? "ALL" : "NEGOTIATION"))}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${priorityFilter === "NEGOTIATION" ? "border-sky-400 bg-sky-100 shadow-sm" : "border-sky-200 bg-sky-50 hover:bg-sky-100"}`}
                    >
                      <div className="text-xs font-medium uppercase tracking-wide text-sky-700">Negociação ativa</div>
                      <div className="mt-2 text-2xl font-semibold text-sky-900">{prioritySummary.negotiation}</div>
                      <div className="mt-1 text-sm text-sky-800">Leads entre visita, proposta e documentação.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriorityFilter((current) => (current === "UNREAD" ? "ALL" : "UNREAD"))}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${priorityFilter === "UNREAD" ? "border-blue-400 bg-blue-100 shadow-sm" : "border-blue-200 bg-blue-50 hover:bg-blue-100"}`}
                    >
                      <div className="text-xs font-medium uppercase tracking-wide text-blue-700">Mensagens não lidas</div>
                      <div className="mt-2 text-2xl font-semibold text-blue-900">{prioritySummary.unread}</div>
                      <div className="mt-1 text-sm text-blue-800">Conversas com atividade pendente para acompanhamento.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriorityFilter((current) => (current === "CLOSED" ? "ALL" : "CLOSED"))}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${priorityFilter === "CLOSED" ? "border-emerald-400 bg-emerald-100 shadow-sm" : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"}`}
                    >
                      <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Finalizados</div>
                      <div className="mt-2 text-2xl font-semibold text-emerald-900">{prioritySummary.closed}</div>
                      <div className="mt-1 text-sm text-emerald-800">Leads que já chegaram ao fim do funil.</div>
                    </button>
                  </div>

                  {priorityFilter !== "ALL" ? (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPriorityFilter("ALL")}
                        className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                      >
                        Limpar prioridade
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-950">Lista operacional</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      {response?.workspace.teamName || "Workspace"} · {filtered.length} lead(s) exibido(s)
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {response?.scope.project ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                        <Building2 className="h-3.5 w-3.5" />
                        {response.scope.project.name || "Empreendimento"}
                      </span>
                    ) : null}
                    {response?.scope.unit ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-teal-700">
                        <DoorOpen className="h-3.5 w-3.5" />
                        {response.scope.unit.title || response.scope.unit.reference}
                      </span>
                    ) : null}
                    {response?.scope.project || response?.scope.unit ? (
                      <Link href="/developer/leads" className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-neutral-700 hover:bg-neutral-100">
                        Limpar escopo
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                  <label className="w-full sm:w-48">
                    <span className="sr-only">Ordenar lista</span>
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as LeadSortOption)}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                    >
                      {LEAD_SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar por imóvel, contato, empreendimento ou unidade..."
                      className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters((current) => !current)}
                    className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${showFilters || hasAdvancedFilters ? "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchLeads({ silent: true })}
                    disabled={refreshing}
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
                  >
                    <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Atualizar
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  Exibindo <span className="font-semibold text-neutral-900">{currentRange.start}-{currentRange.end}</span> de <span className="font-semibold text-neutral-900">{sorted.length}</span> lead(s) nesta ordenação.
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Página</span>
                  <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm font-semibold text-neutral-900">{currentPage}/{totalPages}</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 ml-2">Por página</span>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                    className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              {showFilters ? (
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-2 text-sm text-neutral-700">
                      <span className="block font-medium">Etapa</span>
                      <select
                        value={stageFilter}
                        onChange={(event) => setStageFilter(event.target.value as (typeof PIPELINE_STAGE_OPTIONS)[number]["value"])}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                      >
                        {PIPELINE_STAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm text-neutral-700">
                      <span className="block font-medium">Status</span>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number]["value"])}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm text-neutral-700">
                      <span className="block font-medium">Vínculo</span>
                      <select
                        value={unitLinkFilter}
                        onChange={(event) => setUnitLinkFilter(event.target.value as (typeof UNIT_LINK_OPTIONS)[number]["value"])}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                      >
                        {UNIT_LINK_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-2 text-sm text-neutral-700">
                      <span className="block font-medium">Atividade</span>
                      <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={onlyUnread}
                          onChange={(event) => setOnlyUnread(event.target.checked)}
                          className="h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span>Somente com mensagens não lidas</span>
                      </label>
                    </div>
                  </div>

                  {hasAdvancedFilters ? (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setStageFilter("ALL");
                          setStatusFilter("ALL");
                          setUnitLinkFilter("ALL");
                          setOnlyUnread(false);
                          setPriorityFilter("ALL");
                        }}
                        className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6">
                {filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10">
                    <EmptyState
                      title="Nenhum lead encontrado"
                      description={
                        response?.scope.project || response?.scope.unit
                          ? "Ainda não existem leads vinculados a este recorte do lançamento."
                          : "Quando novos interessados forem vinculados aos empreendimentos, eles aparecem aqui."
                      }
                      action={
                        <Link
                          href="/developer/projects"
                          className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Ver empreendimentos
                        </Link>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginated.map((lead) => {
                      const propertyImage = lead.property.images?.[0]?.url || "/placeholder.jpg";
                      const contactName = lead.contact?.name || lead.contact?.email || "Contato";
                      const leadCode = lead.publicCode ? formatPublicCode(String(lead.publicCode)) : "";
                      const displayId = leadCode || (lead.id.length <= 8 ? lead.id : lead.id.slice(-8));
                      const currentStage = getCanonicalStage(lead.pipelineStage);
                      const nextStage = getNextQuickStage(currentStage);
                      const isStageUpdating = Boolean(stageUpdatingByLead[lead.id]);
                      const stageError = stageErrorByLead[lead.id];

                      return (
                        <article key={lead.id} className="rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:bg-neutral-50/60">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 flex-1 gap-4">
                              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                                <Image src={propertyImage} alt={lead.property.title} fill className="object-cover" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${stageBadgeClass(currentStage)}`}>
                                    {stageLabel(lead.pipelineStage)}
                                  </span>
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${statusBadgeClass(lead.status)}`}>
                                    {statusLabel(lead.status)}
                                  </span>
                                  {lead.hasUnreadMessages ? (
                                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                                      Nova mensagem
                                    </span>
                                  ) : null}
                                  <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-neutral-600">
                                    ID {displayId}
                                  </span>
                                </div>

                                <h3 className="mt-3 text-lg font-semibold text-neutral-950">{lead.property.title}</h3>
                                <div className="mt-1 text-sm font-semibold text-teal-700">
                                  {typeof lead.property.price === "number" ? currencyBRL(lead.property.price) : "Preço não informado"}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-600">
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    {[lead.property.neighborhood, lead.property.city, lead.property.state].filter(Boolean).join(" · ")}
                                  </span>
                                  <span>{contactName}</span>
                                  <span>Criado em {formatShortDate(lead.createdAt)}</span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                                  {lead.developmentProject ? (
                                    <Link
                                      href={`/developer/projects/${lead.developmentProject.id}`}
                                      className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-100"
                                    >
                                      <Building2 className="h-3.5 w-3.5" />
                                      {lead.developmentProject.name}
                                    </Link>
                                  ) : null}
                                  {lead.developmentUnit ? (
                                    <Link
                                      href={`/developer/leads?projectId=${lead.developmentProject?.id || response?.scope.project?.id || ""}&unitId=${lead.developmentUnit.id}`}
                                      className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-teal-700 hover:bg-teal-100"
                                    >
                                      <DoorOpen className="h-3.5 w-3.5" />
                                      {lead.developmentUnit.title || lead.developmentUnit.reference}
                                    </Link>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="w-full lg:w-[320px]">
                              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Contato</div>
                                <div className="mt-2 text-sm font-semibold text-neutral-950">{contactName}</div>
                                {lead.contact?.email ? (
                                  <a href={`mailto:${lead.contact.email}`} className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-700 underline">
                                    <Mail className="h-4 w-4" />
                                    {lead.contact.email}
                                  </a>
                                ) : null}
                                {lead.contact?.phone ? (
                                  <a href={`tel:${lead.contact.phone}`} className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-700 underline">
                                    <Phone className="h-4 w-4" />
                                    {lead.contact.phone}
                                  </a>
                                ) : null}
                                <div className="mt-3 text-xs text-neutral-500">
                                  {lead.lastMessageAt ? `Última atividade em ${formatShortDate(lead.lastMessageAt)}` : "Sem mensagens registradas ainda"}
                                </div>
                                <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-3 py-3">
                                  <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Pipeline</div>
                                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-900">
                                    <span>{stageLabel(currentStage)}</span>
                                    {nextStage ? (
                                      <>
                                        <ArrowRight className="h-4 w-4 text-neutral-400" />
                                        <span className="text-neutral-600">{stageLabel(nextStage)}</span>
                                      </>
                                    ) : (
                                      <span className="text-neutral-600">Lead finalizado no funil</span>
                                    )}
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {PIPELINE_STAGE_FLOW.map((stage) => (
                                      <span
                                        key={`${lead.id}-${stage}`}
                                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${funnelStageClass(stage, currentStage, nextStage)}`}
                                      >
                                        {stageLabel(stage)}
                                      </span>
                                    ))}
                                  </div>

                                  {canManagePipeline && nextStage ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleAdvanceStage(lead.id)}
                                      disabled={isStageUpdating}
                                      className="mt-3 inline-flex items-center justify-center rounded-full border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <ArrowRight className="mr-2 h-3.5 w-3.5" />
                                      {isStageUpdating ? "Atualizando..." : `Avançar para ${stageLabel(nextStage)}`}
                                    </button>
                                  ) : !canManagePipeline ? (
                                    <div className="mt-3 text-xs text-neutral-500">Sem permissão para alterar etapa pela listagem.</div>
                                  ) : null}

                                  {stageError ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{stageError}</div> : null}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Link
                                    href={`/developer/leads/${lead.id}`}
                                    className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-white"
                                  >
                                    Abrir lead
                                  </Link>
                                  {lead.developmentProject ? (
                                    <Link
                                      href={`/developer/projects/${lead.developmentProject.id}`}
                                      className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-white"
                                    >
                                      Ver projeto
                                    </Link>
                                  ) : null}
                                  {lead.developmentUnit ? (
                                    <Link
                                      href={`/developer/leads?projectId=${lead.developmentProject?.id || response?.scope.project?.id || ""}&unitId=${lead.developmentUnit.id}`}
                                      className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-white"
                                    >
                                      <MessageCircle className="mr-2 h-3.5 w-3.5" />
                                      Filtrar unidade
                                    </Link>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}

                    {sorted.length > pageSize ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-neutral-600">
                          Página <span className="font-semibold text-neutral-900">{currentPage}</span> de <span className="font-semibold text-neutral-900">{totalPages}</span> · ordenação <span className="font-semibold text-neutral-900">{sortOptionLabel(sortBy)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                            disabled={currentPage <= 1}
                            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Anterior
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                            disabled={currentPage >= totalPages}
                            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Próxima
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
