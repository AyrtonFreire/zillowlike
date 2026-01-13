"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  MapPin,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Users,
  RotateCcw,
  X,
  CheckCircle2,
} from "lucide-react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import Tabs from "@/components/ui/Tabs";
import LeadTimeline from "@/components/crm/LeadTimeline";

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

type LeadInternalMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderRole?: string;
  sender?: {
    id: string;
    name: string | null;
    role: string;
  } | null;
};

type LeadClientMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderType?: string;
  fromClient?: boolean;
};

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

  const { data: session } = useSession();

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  const isAgency = role === "AGENCY";

  const searchParams = useSearchParams();
  const stageParam = searchParams.get("stage");
  const realtorParam = searchParams.get("realtorId");
  const tabParam = searchParams.get("tab");
  const qParam = searchParams.get("q");

  const stageFilter = stageParam ? stageParam.toUpperCase() : null;
  const realtorFilter = realtorParam ? String(realtorParam) : null;
  const queryFilter = qParam ? String(qParam) : "";

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

  const [drawerTab, setDrawerTab] = useState<string>("summary");

  const [internalMessages, setInternalMessages] = useState<LeadInternalMessage[]>([]);
  const [clientMessages, setClientMessages] = useState<LeadClientMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [qDraft, setQDraft] = useState<string>(queryFilter);

  useEffect(() => {
    setQDraft(queryFilter);
  }, [queryFilter]);

  useEffect(() => {
    const next = String(qDraft || "").trim();
    const current = String(queryFilter || "").trim();
    if (next === current) return;
    const t = window.setTimeout(() => {
      updateFilterParam("q", next);
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

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

  const updateFilterParam = (key: "stage" | "realtorId" | "q", value: string) => {
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
    setDrawerTab("summary");
    setInternalMessages([]);
    setClientMessages([]);
    setMessagesError(null);
  }, [openLeadId]);

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

    if (isAgency) return;

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

    const q = String(queryFilter || "").trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((l) => {
        const haystack = [
          l.id,
          l.property?.title,
          l.property?.city,
          l.property?.state,
          l.property?.neighborhood,
          l.contact?.name,
          l.contact?.phone,
          l.realtor?.name,
          l.realtor?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      const aUnassigned = !a.realtor?.id;
      const bUnassigned = !b.realtor?.id;
      if (aUnassigned !== bUnassigned) return aUnassigned ? -1 : 1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

    return sorted;
  }, [leadsFilteredByRealtor, queryFilter, stageFilter, tab]);

  const summaryCounts = useMemo(() => {
    const unassigned = leadsForTab.filter((l) => !l.realtor?.id).length;
    const newCount = leadsForTab.filter((l) => l.pipelineStage === "NEW").length;
    return { unassigned, newCount };
  }, [leadsForTab]);

  const selectedLead = useMemo(() => {
    if (!openLeadId) return null;
    return leads.find((l) => l.id === openLeadId) || null;
  }, [leads, openLeadId]);

  useEffect(() => {
    if (!selectedLead?.id) return;

    let cancelled = false;

    const run = async () => {
      try {
        setMessagesLoading(true);
        setMessagesError(null);

        const [internalRes, clientRes] = await Promise.all([
          fetch(`/api/leads/${selectedLead.id}/messages`, { cache: "no-store" }),
          fetch(`/api/leads/${selectedLead.id}/client-messages`, { cache: "no-store" }),
        ]);

        const internalJson = await internalRes.json().catch(() => null);
        const clientJson = await clientRes.json().catch(() => null);

        if (!cancelled) {
          if (internalRes.ok && Array.isArray(internalJson?.messages)) {
            setInternalMessages(internalJson.messages as LeadInternalMessage[]);
          } else {
            setInternalMessages([]);
          }

          if (clientRes.ok && Array.isArray(clientJson?.messages)) {
            setClientMessages(clientJson.messages as LeadClientMessage[]);
          } else {
            setClientMessages([]);
          }
        }

        if (!internalRes.ok || !clientRes.ok) {
          const message =
            internalJson?.error || clientJson?.error || "Não conseguimos carregar as mensagens deste lead agora.";
          if (!cancelled) setMessagesError(String(message));
        }
      } catch (e: any) {
        if (!cancelled) setMessagesError(e?.message || "Não conseguimos carregar as mensagens deste lead agora.");
        if (!cancelled) {
          setInternalMessages([]);
          setClientMessages([]);
        }
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedLead?.id]);

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

    if (String(queryFilter || "").trim()) {
      parts.push(`Busca: ${String(queryFilter).trim()}`);
    }

    return parts.join(" • ");
  }, [members, queryFilter, realtorFilter, stageFilter, tab]);

  const stageSelectValue = useMemo(() => {
    const stageValid = !!(stageFilter && (STAGE_ORDER as string[]).includes(stageFilter));
    if (tab !== "active") return "";
    return stageValid ? String(stageFilter) : "";
  }, [stageFilter, tab]);

  if (loading) {
    return <CenteredSpinner message="Carregando leads do time..." />;
  }

  return (
    <div className="py-2">
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

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-[11px] font-semibold text-gray-500">Leads</div>
            <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{leadsForTab.length}</div>
            <div className="mt-1 text-xs text-gray-500">{tab === "active" ? "Ativos" : "Fechados"}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-[11px] font-semibold text-gray-500">Novos</div>
            <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{summaryCounts.newCount}</div>
            <div className="mt-1 text-xs text-gray-500">Na seleção atual</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-[11px] font-semibold text-gray-500">Sem responsável</div>
            <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{summaryCounts.unassigned}</div>
            <div className="mt-1 text-xs text-gray-500">Atribuir quando possível</div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <input
                  value={qDraft}
                  onChange={(e) => setQDraft(String(e.target.value))}
                  placeholder="Nome, imóvel, cidade, id, corretor..."
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                />
                {qDraft ? (
                  <button
                    type="button"
                    onClick={() => setQDraft("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    aria-label="Limpar busca"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="w-full lg:w-56">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Etapa</label>
              <select
                value={stageSelectValue}
                onChange={(e) => updateFilterParam("stage", String(e.target.value))}
                disabled={tab !== "active"}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm disabled:opacity-60"
              >
                <option value="">Todas</option>
                {STAGE_ORDER.filter((s) => s !== "WON" && s !== "LOST").map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_CONFIG[stage].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full lg:w-64">
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

            <button
              type="button"
              onClick={clearFilters}
              disabled={!stageFilter && !realtorFilter && !queryFilter}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Limpar
            </button>
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

              <div className="p-4 border-b border-gray-200">
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
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold text-gray-700">
                    {STAGE_CONFIG[selectedLead.pipelineStage]?.label || selectedLead.pipelineStage}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700">
                    Lead: {selectedLead.id.slice(0, 6)}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700">
                    {selectedLead.realtor?.name || selectedLead.realtor?.email
                      ? `Responsável: ${selectedLead.realtor?.name || selectedLead.realtor?.email}`
                      : "Sem responsável"}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <Tabs
                  key={openLeadId || "drawer"}
                  defaultKey={drawerTab}
                  onChange={(k) => setDrawerTab(k)}
                  items={[
                    {
                      key: "summary",
                      label: "Resumo",
                      content: (
                        <div className="space-y-4">
                          {selectedLead.contact?.name || selectedLead.contact?.phone ? (
                            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                              <p className="text-sm font-semibold text-gray-900">Contato</p>
                              <div className="mt-2 text-sm text-gray-700">
                                <div className="font-semibold text-gray-900">{selectedLead.contact?.name || "Cliente"}</div>
                                {selectedLead.contact?.phone ? (
                                  <div className="mt-1 text-xs text-gray-500">{selectedLead.contact.phone}</div>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
                              <p className="text-sm font-semibold text-gray-900">Contato não informado</p>
                              <p className="mt-1 text-sm text-gray-600">Quando o lead tiver dados, eles aparecem aqui.</p>
                            </div>
                          )}

                          <div className="rounded-2xl border border-gray-200 bg-white p-4">
                            <p className="text-sm font-semibold text-gray-900">Atividade</p>
                            <p className="mt-1 text-xs text-gray-500">Histórico do que aconteceu com este lead.</p>
                            <div className="mt-3">
                              <LeadTimeline leadId={selectedLead.id} createdAt={selectedLead.createdAt} pipelineStage={selectedLead.pipelineStage} />
                            </div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "manage",
                      label: "Gestão",
                      content: (
                        <div className="space-y-4">
                          {assignError && (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                              {assignError}
                            </div>
                          )}

                          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                            <p className="text-sm font-semibold text-gray-900">Atribuição</p>
                            <p className="mt-1 text-xs text-gray-500">Atualize responsável (e etapa quando permitido).</p>

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

                              {!isAgency ? (
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Etapa</label>
                                  <select
                                    value={selectedLead.pipelineStage}
                                    onChange={(e) =>
                                      handleSetStage(selectedLead.id, e.target.value as TeamPipelineLead["pipelineStage"])
                                    }
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
                              ) : null}
                            </div>

                            {!isAgency ? (
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
                            ) : (
                              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                Como agência, você pode redistribuir responsáveis, mas não altera a etapa do funil.
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "activity",
                      label: "Atividade",
                      content: (
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                          <p className="text-sm font-semibold text-gray-900">Linha do tempo</p>
                          <p className="mt-1 text-xs text-gray-500">Eventos e mudanças do lead.</p>
                          <div className="mt-3">
                            <LeadTimeline leadId={selectedLead.id} createdAt={selectedLead.createdAt} pipelineStage={selectedLead.pipelineStage} />
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "messages",
                      label: "Mensagens",
                      content: (
                        <div className="space-y-4">
                          {messagesError && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                              {messagesError}
                            </div>
                          )}

                          {messagesLoading ? (
                            <div className="py-10">
                              <CenteredSpinner message="Carregando mensagens..." />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                <p className="text-sm font-semibold text-gray-900">Cliente</p>
                                <p className="mt-1 text-xs text-gray-500">Somente leitura.</p>
                                <div className="mt-3 space-y-2">
                                  {clientMessages.length === 0 ? (
                                    <div className="text-sm text-gray-600">Sem mensagens.</div>
                                  ) : (
                                    clientMessages.map((m) => {
                                      const fromClient = m.fromClient || m.senderType === "CLIENT";
                                      return (
                                        <div
                                          key={m.id}
                                          className={`rounded-2xl border px-4 py-3 text-sm ${
                                            fromClient
                                              ? "border-gray-200 bg-white text-gray-800"
                                              : "border-blue-100 bg-blue-50 text-blue-900"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="text-[11px] font-semibold opacity-70">
                                              {fromClient ? "Cliente" : "Time"}
                                            </div>
                                            <div className="text-[11px] opacity-60">{formatShortDate(String(m.createdAt))}</div>
                                          </div>
                                          <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                <p className="text-sm font-semibold text-gray-900">Internas</p>
                                <p className="mt-1 text-xs text-gray-500">Somente leitura.</p>
                                <div className="mt-3 space-y-2">
                                  {internalMessages.length === 0 ? (
                                    <div className="text-sm text-gray-600">Sem mensagens internas.</div>
                                  ) : (
                                    internalMessages.map((m) => (
                                      <div key={m.id} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="text-[11px] font-semibold text-gray-600 truncate">
                                            {m.sender?.name || m.sender?.role || m.senderRole || "Mensagem"}
                                          </div>
                                          <div className="text-[11px] text-gray-400">{formatShortDate(String(m.createdAt))}</div>
                                        </div>
                                        <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
