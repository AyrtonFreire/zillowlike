"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowLeft, ChevronRight, Loader2, Users, SlidersHorizontal, RotateCcw } from "lucide-react";
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

const initials = (nameOrEmail: string) => {
  const raw = String(nameOrEmail || "").trim();
  if (!raw) return "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || raw[0];
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${String(first).toUpperCase()}${String(last).toUpperCase()}`.slice(0, 2);
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
    label: "Perdido",
    description: "Negócio não avançou.",
  },
};

export default function AgencyTeamCrmPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const params = useParams();
  const teamId = params?.id as string;

  const router = useRouter();

  const searchParams = useSearchParams();
  const stageParam = searchParams.get("stage");
  const realtorParam = searchParams.get("realtorId");

  const stageFilter = stageParam ? stageParam.toUpperCase() : null;
  const realtorFilter = realtorParam ? String(realtorParam) : null;

  const [teamName, setTeamName] = useState<string>("Time");
  const [leads, setLeads] = useState<TeamPipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showTeamHelp, setShowTeamHelp] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    void fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const key = "zlw_help_team_crm_v1";
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        setShowTeamHelp(true);
      }
    } catch {
      // ignore
    }
  }, []);

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
        throw new Error(data?.error || "Não conseguimos carregar o funil deste time agora.");
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
      setError(err?.message || "Não conseguimos carregar o funil deste time agora.");
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

  const clearFilters = () => {
    router.push(`/agency/teams/${teamId}/crm`);
  };

  const handleDismissTeamHelp = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("zlw_help_team_crm_v1", "dismissed");
      }
    } catch {
      // ignore
    }
    setShowTeamHelp(false);
  };

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

  const handleAdvanceStage = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const currentIndex = STAGE_ORDER.indexOf(lead.pipelineStage);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 2) {
      return;
    }

    const nextStage = STAGE_ORDER[currentIndex + 1];

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

  const leadsByStage = useMemo(() => {
    const map: Record<TeamPipelineLead["pipelineStage"], TeamPipelineLead[]> = {
      NEW: [],
      CONTACT: [],
      VISIT: [],
      PROPOSAL: [],
      DOCUMENTS: [],
      WON: [],
      LOST: [],
    };

    const stageValid = !!(stageFilter && (STAGE_ORDER as string[]).includes(stageFilter));

    let filtered = leads;

    if (realtorFilter) {
      if (realtorFilter === "unassigned") {
        filtered = filtered.filter((l) => !l.realtor?.id);
      } else {
        filtered = filtered.filter((l) => l.realtor?.id === realtorFilter);
      }
    }

    if (stageValid) {
      filtered = filtered.filter((l) => l.pipelineStage === (stageFilter as any));
    }

    for (const lead of filtered) {
      const stage = lead.pipelineStage || "NEW";
      map[stage].push(lead);
    }

    return map;
  }, [leads, realtorFilter, stageFilter]);

  const stagesToRender = useMemo(() => {
    const stageValid = !!(stageFilter && (STAGE_ORDER as string[]).includes(stageFilter));
    if (stageValid) return [stageFilter as TeamPipelineLead["pipelineStage"]];
    return STAGE_ORDER;
  }, [stageFilter]);

  const filterLabel = useMemo(() => {
    const parts: string[] = [];

    const stageValid = !!(stageFilter && (STAGE_ORDER as string[]).includes(stageFilter));
    if (stageValid) {
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
  }, [members, realtorFilter, stageFilter]);

  const stageSelectValue = useMemo(() => {
    const stageValid = !!(stageFilter && (STAGE_ORDER as string[]).includes(stageFilter));
    return stageValid ? String(stageFilter) : "";
  }, [stageFilter]);

  const isTeamOwner = !!(
    currentUserId && members.some((member) => member.userId === currentUserId && member.role === "OWNER")
  );

  if (loading) {
    return <CenteredSpinner message="Carregando funil do time..." />;
  }

  return (
    <DashboardLayout
      title={`Funil do time: ${teamName}`}
      description="Veja em que etapa estão as oportunidades atendidas pela sua equipe."
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

        {showTeamHelp && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            <p className="pr-2">
              {isTeamOwner
                ? "Dica rápida: use este funil para enxergar como os leads do time estão distribuídos entre as etapas e entre os corretores."
                : "Dica rápida: este funil mostra em que etapa estão os leads do time. Foque principalmente nos leads em que você aparece como responsável."}
            </p>
            <button
              type="button"
              onClick={handleDismissTeamHelp}
              className="ml-2 flex-shrink-0 text-[11px] font-semibold text-blue-700 hover:text-blue-800"
            >
              Entendi
            </button>
          </div>
        )}

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
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              >
                <option value="">Todas as etapas</option>
                {STAGE_ORDER.map((stage) => (
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

        {members.length > 0 && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[11px] text-gray-700 flex flex-col gap-1">
            <p className="font-semibold text-xs text-gray-900">Fila interna do time</p>
            <p className="text-[11px] text-gray-500 mb-1">
              {isTeamOwner
                ? "Ordem de prioridade atual entre os corretores do time."
                : "Ordem interna de prioridade entre os corretores do time."}
            </p>
            <div className="flex flex-wrap gap-2">
              {members
                .filter((m) => m.role !== "ASSISTANT")
                .map((member, index) => (
                  <span
                    key={member.userId}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-gray-50 border border-gray-200"
                  >
                    <span className="text-[10px] font-semibold text-gray-500">#{index + 1}</span>
                    <span className="w-6 h-6 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[10px] font-bold text-gray-700">
                      {initials(member.name || member.email || "")}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-800">
                      {member.name || member.email || "Membro"}
                    </span>
                  </span>
                ))}
            </div>
          </div>
        )}

        <div className="grid grid-flow-col auto-cols-[85%] gap-4 overflow-x-auto md:grid-flow-row md:auto-cols-auto md:grid-cols-3 lg:grid-cols-4 md:overflow-visible">
          {stagesToRender.map((stage) => {
            const config = STAGE_CONFIG[stage];
            const stageLeads = leadsByStage[stage];

            return (
              <div
                key={stage}
                className="rounded-2xl border border-gray-200 bg-white flex flex-col max-h-[70vh] shadow-sm"
              >
                <div className="p-4 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">{config.label}</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200">
                      {stageLeads.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">{config.description}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/60 rounded-b-2xl">
                  {stageLeads.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center">
                      <p className="text-sm font-semibold text-gray-900">Nenhum lead</p>
                      <p className="mt-1 text-xs text-gray-500">Quando um lead entrar nesta etapa, ele aparece aqui.</p>
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white rounded-2xl border border-gray-200 p-4 text-sm text-gray-800 flex flex-col gap-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                            <Image
                              src={lead.property.images[0]?.url || "/placeholder.jpg"}
                              alt={lead.property.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-gray-900 line-clamp-2">{lead.property.title}</p>
                              <span className="text-[11px] font-semibold text-gray-700 tabular-nums whitespace-nowrap">
                                {currencyBRL(lead.property.price)}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">
                                {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                                {lead.property.city} - {lead.property.state}
                              </span>
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold text-gray-700">
                                Lead: {lead.id.slice(0, 6)}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700">
                                {formatShortDate(lead.createdAt)}
                              </span>
                            </div>

                            {lead.contact?.name && (
                              <p className="text-xs text-gray-600 mt-2">Cliente: {lead.contact.name}</p>
                            )}

                            {members.length > 0 && (
                              <div className="mt-3 flex items-center gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[11px] font-bold text-gray-700">
                                    {initials(lead.realtor?.name || lead.realtor?.email || "")}
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700">Responsável</span>
                                </div>
                                <select
                                  value={lead.realtor?.id || ""}
                                  onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                                  disabled={!!assigning[lead.id]}
                                  className="ml-auto text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white max-w-[200px]"
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
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center text-xs text-gray-500">
                            Detalhes
                            <ChevronRight className="w-3 h-3 ml-1 opacity-40" />
                          </span>
                          {stage !== "WON" && stage !== "LOST" && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStage(lead.id)}
                              disabled={!!updating[lead.id]}
                              className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {updating[lead.id] ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                  Movendo...
                                </>
                              ) : (
                                "Avançar etapa"
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
