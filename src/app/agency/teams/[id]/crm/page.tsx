"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  MapPin,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Users,
  SlidersHorizontal,
  RotateCcw,
  X,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";

interface TeamPipelineLead {
  id: string;
  status: string;
  pipelineStage: "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";
  createdAt: string;
  property: {
    id: string;
    title: string;
    price: number;
    type: string;
    city: string;
    state: string;
    neighborhood?: string | null;
    images: Array<{ url: string }>;
  };
  contact?: {
    name: string;
    phone?: string | null;
  } | null;
  realtor?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

type TeamLeadsTab = "active" | "closed";

interface TeamMember {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  queuePosition?: number;
}

const currencyBRL = (value: number) => {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  } catch {
    return String(value || 0);
  }
};

const formatShortDate = (value: string) => {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
  } catch {
    return "";
  }
};

const STAGE_ORDER: TeamPipelineLead["pipelineStage"][] = [
  "NEW",
  "CONTACT",
  "VISIT",
  "PROPOSAL",
  "DOCUMENTS",
  "WON",
  "LOST",
];

const STAGE_CONFIG: Record<TeamPipelineLead["pipelineStage"], { label: string; description: string }> = {
  NEW: {
    label: "Novo",
    description: "Leads que chegaram e ainda não tiveram contato.",
  },
  CONTACT: {
    label: "Em contato",
    description: "Algum corretor já falou ou tentou falar com o cliente.",
  },
  VISIT: {
    label: "Visita",
    description: "Visita combinada ou já realizada.",
  },
  PROPOSAL: {
    label: "Proposta",
    description: "Cliente avaliando valores ou condições.",
  },
  DOCUMENTS: {
    label: "Documentação",
    description: "Acertando documentos e detalhes finais.",
  },
  WON: {
    label: "Fechado",
    description: "Negócio concluído (vendido/alugado).",
  },
  LOST: {
    label: "Fechado",
    description: "Lead encerrado.",
  },
};

export default function AgencyTeamCrmPage() {
  const params = useParams();
  const teamId = params?.id as string;

  const router = useRouter();

  const searchParams = useSearchParams();
  const stageParam = searchParams.get("stage");
  const realtorParam = searchParams.get("realtorId");
  const tabParam = searchParams.get("tab");

  const stageFilter = stageParam ? stageParam.toUpperCase() : null;
  const realtorFilter = realtorParam ? String(realtorParam) : null;

  const tab: TeamLeadsTab = tabParam === "closed" || tabParam === "won" || tabParam === "lost" ? "closed" : "active";

  const [teamName, setTeamName] = useState<string>("Time");
  const [leads, setLeads] = useState<TeamPipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [assignError, setAssignError] = useState<string | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    void fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const fetchLeads = async (opts?: { silent?: boolean }) => {
    try {
      setError(null);
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await fetch(`/api/teams/${teamId}/pipeline`);
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos carregar os leads deste time agora.");
      }

      setTeamName(data.team?.name || "Time");
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      if (Array.isArray(data.members)) {
        const sortedMembers: TeamMember[] = [...data.members].sort((a, b) => {
          const aPos = typeof a.queuePosition === "number" ? a.queuePosition : 0;
          const bPos = typeof b.queuePosition === "number" ? b.queuePosition : 0;
          return aPos - bPos;
        });
        setMembers(sortedMembers);
      } else {
        setMembers([]);
      }
    } catch (err: any) {
      console.error("Error fetching team pipeline:", err);
      setError(err?.message || "Não conseguimos carregar os leads deste time agora.");
      setLeads([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const updateFilterParam = (key: "stage" | "realtorId", value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    const qs = next.toString();
    router.push(qs ? `/agency/teams/${teamId}/crm?${qs}` : `/agency/teams/${teamId}/crm`);
  };

  const setTabParam = (nextTab: TeamLeadsTab) => {
    const next = new URLSearchParams(searchParams.toString());
    if (nextTab === "active") {
      next.delete("tab");
    } else {
      next.set("tab", nextTab);
      next.delete("stage");
    }
    const qs = next.toString();
    router.push(qs ? `/agency/teams/${teamId}/crm?${qs}` : `/agency/teams/${teamId}/crm`);
  };

  const clearFilters = () => {
    router.push(`/agency/teams/${teamId}/crm`);
  };

  const closeDrawer = () => {
    setOpenLeadId(null);
  };

  useEffect(() => {
    if (!openLeadId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openLeadId]);

  const handleAssignLead = async (leadId: string, newRealtorId: string) => {
    if (!newRealtorId) return;

    try {
      setAssignError(null);
      setAssigning((prev) => ({ ...prev, [leadId]: true }));

      const response = await fetch(`/api/leads/${leadId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId: newRealtorId }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos reatribuir este lead agora.");
      }

      const updatedRealtor = data.lead?.realtor || null;
      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, realtor: updatedRealtor } : lead)),
      );
    } catch (err: any) {
      console.error("Error assigning team lead:", err);
      setAssignError(err?.message || "Não conseguimos reatribuir este lead agora.");
    } finally {
      setAssigning((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  const handleSetStage = async (leadId: string, nextStage: TeamPipelineLead["pipelineStage"]) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    if (lead.pipelineStage === nextStage) return;
    if (!confirm(`Mover este lead para a etapa "${STAGE_CONFIG[nextStage].label}"?`)) return;

    try {
      setUpdating((prev) => ({ ...prev, [leadId]: true }));
      const response = await fetch(`/api/leads/${leadId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos atualizar a etapa deste lead agora.");
      }

      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, pipelineStage: nextStage } : l)));
    } catch (err: any) {
      console.error("Error updating team pipeline stage:", err);
      alert(err?.message || "Não conseguimos atualizar a etapa deste lead agora.");
    } finally {
      setUpdating((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  const leadsFilteredByRealtor = useMemo(() => {
    let filtered = leads;

    if (realtorFilter) {
      if (realtorFilter === "unassigned") {
        filtered = filtered.filter((l) => !l.realtor?.id);
      } else {
        filtered = filtered.filter((l) => l.realtor?.id === realtorFilter);
      }
    }

    return filtered;
  }, [leads, realtorFilter]);

  const counts = useMemo(() => {
    const activeCount = leadsFilteredByRealtor.filter((l) => l.pipelineStage !== "WON" && l.pipelineStage !== "LOST").length;
    const closedCount = leadsFilteredByRealtor.filter((l) => l.pipelineStage === "WON" || l.pipelineStage === "LOST").length;
    return { activeCount, closedCount };
  }, [leadsFilteredByRealtor]);

  const leadsForTab = useMemo(() => {
    const stageValid = !!(stageFilter && (STAGE_ORDER as string[]).includes(stageFilter));

    let filtered = leadsFilteredByRealtor;

    if (tab === "active") {
      filtered = filtered.filter((l) => l.pipelineStage !== "WON" && l.pipelineStage !== "LOST");
      if (stageValid) {
        const stage = stageFilter as TeamPipelineLead["pipelineStage"];
        filtered = filtered.filter((l) => l.pipelineStage === stage);
      }
    }

    if (tab === "closed") {
      filtered = filtered.filter((l) => l.pipelineStage === "WON" || l.pipelineStage === "LOST");
    }

    const sorted = [...filtered].sort((a, b) => {
      const aUnassigned = !a.realtor?.id;
      const bUnassigned = !b.realtor?.id;
      if (aUnassigned !== bUnassigned) return aUnassigned ? -1 : 1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

    return sorted;
  }, [leadsFilteredByRealtor, stageFilter, tab]);

  const selectedLead = useMemo(() => {
    if (!openLeadId) return null;
    return leads.find((l) => l.id === openLeadId) || null;
  }, [leads, openLeadId]);

  const filterLabel = useMemo(() => {
    const parts: string[] = [];

    if (tab === "active") parts.push("Status: ativos");
    if (tab === "closed") parts.push("Status: fechados");

    const stageValid = !!(stageFilter && (STAGE_ORDER as string[]).includes(stageFilter));
    if (tab === "active" && stageValid) {
      parts.push(`Etapa: ${STAGE_CONFIG[stageFilter as TeamPipelineLead["pipelineStage"]].label}`);
    }

    if (realtorFilter) {
      if (realtorFilter === "unassigned") {
        parts.push("Responsável: sem atribuição");
      } else {
        const member = members.find((m) => m.userId === realtorFilter);
        const name = member?.name || member?.email || realtorFilter;
        parts.push(`Responsável: ${name}`);
      }
    }

    return parts.join(" • ");
  }, [members, realtorFilter, stageFilter, tab]);

  const stageSelectValue = useMemo(() => {
    const stageValid = !!(stageFilter && (STAGE_ORDER as string[]).includes(stageFilter));
    if (tab !== "active") return "";
    return stageValid ? String(stageFilter) : "";
  }, [stageFilter, tab]);

  if (loading) {
    return <CenteredSpinner message="Carregando leads do time..." />;
  }

  return (
    <DashboardLayout
      title={`Leads do time: ${teamName}`}
      description="Acompanhe os leads do time, reatribua responsáveis e atualize etapas."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Agência", href: "/agency/dashboard" },
        { label: "Meu time", href: "/agency/team" },
        { label: teamName },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => history.back()}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <Users className="w-4 h-4" />
              <span>Leads de todos os corretores do time</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchLeads({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Atualizar
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Filtros</p>
                  <p className="text-xs text-gray-500">Refine a visualização por etapa e responsável</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!stageFilter && !realtorFilter}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Limpar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Etapa</label>
              <select
                value={stageSelectValue}
                onChange={(e) => updateFilterParam("stage", String(e.target.value))}
                disabled={tab !== "active"}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm disabled:opacity-60"
              >
                <option value="">Todas as etapas</option>
                {STAGE_ORDER.filter((s) => s !== "WON" && s !== "LOST").map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_CONFIG[stage].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Responsável</label>
              <select
                value={realtorFilter || ""}
                onChange={(e) => updateFilterParam("realtorId", String(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              >
                <option value="">Todos</option>
                <option value="unassigned">Sem responsável</option>
                {members
                  .filter((m) => m.role !== "ASSISTANT")
                  .map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name || member.email || "Membro"}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-gray-500 truncate">{filterLabel || "Mostrando todos os leads do time."}</div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}
        {assignError && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {assignError}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTabParam("active")}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              tab === "active" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            Ativos
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${tab === "active" ? "bg-white/15" : "bg-gray-100"}`}>
              {counts.activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabParam("closed")}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              tab === "closed" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Fechados
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${tab === "closed" ? "bg-white/15" : "bg-gray-100"}`}>
              {counts.closedCount}
            </span>
          </button>
        </div>

        {leadsForTab.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm font-semibold text-gray-900">
              {tab === "active" ? "Nenhum lead ativo" : "Nenhum lead fechado"}
            </p>
            <p className="mt-1 text-sm text-gray-600">Ajuste os filtros para encontrar resultados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leadsForTab.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => setOpenLeadId(lead.id)}
                className="w-full text-left rounded-2xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    <Image
                      src={lead.property.images[0]?.url || "/placeholder.jpg"}
                      alt={lead.property.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">{lead.property.title}</p>
                        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">
                            {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                            {lead.property.city} - {lead.property.state}
                          </span>
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-semibold text-gray-900 tabular-nums">{currencyBRL(lead.property.price)}</p>
                        <p className="mt-1 text-[11px] text-gray-500">{formatShortDate(lead.createdAt)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold text-gray-700">
                        {STAGE_CONFIG[lead.pipelineStage]?.label || lead.pipelineStage}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700">
                        Lead: {lead.id.slice(0, 6)}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700">
                        {lead.realtor?.name || lead.realtor?.email ? `Responsável: ${lead.realtor?.name || lead.realtor?.email}` : "Sem responsável"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 text-gray-400">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedLead && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
            <div
              className="absolute inset-y-0 right-0 w-full sm:max-w-xl bg-white shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Detalhes do lead</p>
                  <p className="text-xs text-gray-500 truncate">{selectedLead.property.title}</p>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4">
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    <Image
                      src={selectedLead.property.images[0]?.url || "/placeholder.jpg"}
                      alt={selectedLead.property.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 leading-snug">{selectedLead.property.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{currencyBRL(selectedLead.property.price)}</p>
                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">
                        {selectedLead.property.neighborhood && `${selectedLead.property.neighborhood}, `}
                        {selectedLead.property.city} - {selectedLead.property.state}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold text-gray-700">
                        {STAGE_CONFIG[selectedLead.pipelineStage]?.label || selectedLead.pipelineStage}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700">
                        Lead: {selectedLead.id.slice(0, 6)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <p className="text-sm font-semibold text-gray-900">Gestão</p>
                  <p className="mt-1 text-xs text-gray-500">Atualize responsável e etapa (sem ações de contato).</p>

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Responsável</label>
                      <select
                        value={selectedLead.realtor?.id || ""}
                        onChange={(e) => handleAssignLead(selectedLead.id, e.target.value)}
                        disabled={!!assigning[selectedLead.id]}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                      >
                        <option value="">Escolher corretor</option>
                        {members
                          .filter((m) => m.role !== "ASSISTANT")
                          .map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.name || member.email || "Membro"}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Etapa</label>
                      <select
                        value={selectedLead.pipelineStage}
                        onChange={(e) => handleSetStage(selectedLead.id, e.target.value as TeamPipelineLead["pipelineStage"])}
                        disabled={!!updating[selectedLead.id]}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                      >
                        {STAGE_ORDER.map((stage) => (
                          <option key={stage} value={stage}>
                            {STAGE_CONFIG[stage].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {selectedLead.pipelineStage !== "WON" && (
                      <button
                        type="button"
                        onClick={() => handleSetStage(selectedLead.id, "WON")}
                        disabled={!!updating[selectedLead.id]}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                      >
                        Marcar como fechado
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
