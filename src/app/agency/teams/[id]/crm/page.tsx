"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import AgencyLeadSidePanel from "../../../../../components/leads/AgencyLeadSidePanel";
import { getPusherClient } from "@/lib/pusher-client";

type PipelineMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  queuePosition?: number;
};

type PipelineLead = {
  id: string;
  status: string;
  pipelineStage: string;
  createdAt: string;
  pendingReplyAt?: string | null;
  contact?: { name?: string | null; phone?: string | null } | null;
  property?: {
    id?: string | null;
    title?: string | null;
    price?: number | null;
    city?: string | null;
    state?: string | null;
  } | null;
  realtor?: { id: string; name: string | null; email: string | null } | null;
};

type TeamPipelineResponse = {
  success: boolean;
  team?: { id: string; name: string } | null;
  members?: PipelineMember[];
  leads?: PipelineLead[];
  pageInfo?: {
    nextCursor: string | null;
    hasMore: boolean;
  };
  error?: string;
};

type AgencyInsightsResponse = {
  success: boolean;
  funnel?: {
    activeTotal: number;
    newLast24h: number;
    unassigned: number;
    byStage: Record<string, number>;
  };
  sla?: {
    pendingReplyTotal: number;
    pendingReplyLeads: Array<{
      leadId: string;
      realtorId: string | null;
      realtorName: string | null;
      contactName: string | null;
      propertyTitle: string | null;
      pipelineStage: string | null;
      lastClientAt: string;
    }>;
  };
};

function formatShortDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return d.toISOString();
  }
}

function formatSlaAge(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return `${hours}h ${rem.toString().padStart(2, "0")}m`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return `${days}d ${hrs}h`;
}

export default function AgencyTeamCrmPage() {
  const params = useParams();
  const teamId = params?.id as string;
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>("");

  const [members, setMembers] = useState<PipelineMember[]>([]);
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [insights, setInsights] = useState<AgencyInsightsResponse | null>(null);

  const [pageInfo, setPageInfo] = useState<{ nextCursor: string | null; hasMore: boolean }>({
    nextCursor: null,
    hasMore: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("");
  const [realtorId, setRealtorId] = useState<string>("");
  const [onlyPendingReply, setOnlyPendingReply] = useState(false);

  const [leadPanelOpen, setLeadPanelOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadPanelInitialTab, setLeadPanelInitialTab] = useState<"ATIVIDADES" | "CHAT" | "NOTAS">("ATIVIDADES");

  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);

  const buildPipelineUrl = (opts: { cursor?: string | null } = {}) => {
    const url = new URL(`/api/teams/${encodeURIComponent(teamId)}/pipeline`, window.location.origin);
    if (query.trim()) url.searchParams.set("q", query.trim());
    if (stage) url.searchParams.set("stage", stage);
    if (realtorId) url.searchParams.set("realtorId", realtorId);
    url.searchParams.set("onlyPendingReply", onlyPendingReply ? "1" : "0");
    url.searchParams.set("limit", "50");
    if (opts.cursor) url.searchParams.set("cursor", String(opts.cursor));
    return url.pathname + url.search;
  };

  const reload = async (opts: { append?: boolean } = {}) => {
    if (!teamId) return;
    const append = !!opts.append;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const pipeUrl = buildPipelineUrl({ cursor: append ? pageInfo.nextCursor : null });

      const [pipeRes, insRes] = await Promise.all([
        fetch(pipeUrl, { cache: "no-store" }),
        append
          ? Promise.resolve(null)
          : fetch(`/api/agency/insights?teamId=${encodeURIComponent(teamId)}`, { cache: "no-store" }),
      ]);

      const pipeJson = (await pipeRes.json().catch(() => null)) as TeamPipelineResponse | null;
      if (!pipeRes.ok || !pipeJson?.success) {
        throw new Error(pipeJson?.error || "Não conseguimos carregar os leads do time agora.");
      }

      if (!append && insRes) {
        const insJson = (await insRes.json().catch(() => null)) as AgencyInsightsResponse | null;
        if (insRes.ok && insJson?.success) {
          setInsights(insJson);
        } else {
          setInsights(null);
        }
      }

      setTeamName(String(pipeJson?.team?.name || ""));
      setMembers(Array.isArray(pipeJson?.members) ? pipeJson!.members! : []);

      const nextLeads = Array.isArray(pipeJson?.leads) ? pipeJson!.leads! : [];
      setLeads((prev) => (append ? [...prev, ...nextLeads] : nextLeads));

      setPageInfo({
        nextCursor: pipeJson?.pageInfo?.nextCursor ?? null,
        hasMore: Boolean(pipeJson?.pageInfo?.hasMore),
      });
    } catch (e: any) {
      setError(e?.message || "Não conseguimos carregar os leads do time agora.");
      if (!append) {
        setMembers([]);
        setLeads([]);
        setInsights(null);
        setTeamName("");
        setPageInfo({ nextCursor: null, hasMore: false });
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!teamId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-agency-${teamId}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        void reload({ append: false });
      };

      channel.bind("agency:leads_updated", handler as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("agency:leads_updated", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    if (!searchParams) return;
    const q = searchParams.get("q");
    const stageParam = searchParams.get("stage");
    const realtorParam = searchParams.get("realtorId");
    const onlyPendingParam = searchParams.get("onlyPendingReply");
    if (q != null) setQuery(String(q));
    if (stageParam != null) setStage(String(stageParam));
    if (realtorParam != null) setRealtorId(String(realtorParam));
    if (onlyPendingParam != null) {
      const raw = String(onlyPendingParam).toLowerCase().trim();
      setOnlyPendingReply(raw === "1" || raw === "true" || raw === "yes");
    }
    setInitialized(true);
  }, [searchParams]);

  useEffect(() => {
    if (!teamId || !initialized) return;
    const t = window.setTimeout(() => {
      void reload({ append: false });
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, initialized, query, stage, realtorId, onlyPendingReply]);

  const pendingMap = useMemo(() => {
    const map = new Map<string, { lastClientAt: string }>();
    for (const l of leads) {
      const leadId = String(l?.id || "");
      const ts = l?.pendingReplyAt ? String(l.pendingReplyAt) : "";
      if (!leadId || !ts) continue;
      map.set(leadId, { lastClientAt: ts });
    }
    return map;
  }, [leads]);

  const realtorOptions = useMemo(() => {
    return (Array.isArray(members) ? members : [])
      .filter((m) => String(m.role || "").toUpperCase() === "AGENT")
      .slice()
      .sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || "")));
  }, [members]);

  const stageOptions = useMemo(() => {
    return ["NEW", "CONTACT", "VISIT", "PROPOSAL", "DOCUMENTS", "WON", "LOST"];
  }, []);

  const stageLabels = useMemo<Record<string, string>>(() => {
    return {
      NEW: "Novo",
      CONTACT: "Em contato",
      VISIT: "Visita",
      PROPOSAL: "Proposta",
      DOCUMENTS: "Documentação",
      WON: "Fechado",
      LOST: "Perdido",
    };
  }, []);

  const openLeadPanel = (id: string, tab: "ATIVIDADES" | "CHAT" | "NOTAS" = "ATIVIDADES") => {
    setSelectedLeadId(String(id));
    setLeadPanelInitialTab(tab);
    setLeadPanelOpen(true);
  };

  const handleAssign = async (leadId: string, nextRealtorId: string) => {
    const id = String(leadId);
    const rid = String(nextRealtorId);
    if (!id) return;
    try {
      setSavingLeadId(id);
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId: rid }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos reatribuir este lead agora.");
      }

      const realtor = realtorOptions.find((m) => String(m.userId) === rid) || null;
      setLeads((prev) =>
        prev.map((l) =>
          String(l.id) === id
            ? {
                ...l,
                realtor: {
                  id: rid,
                  name: realtor?.name ?? null,
                  email: realtor?.email ?? null,
                },
              }
            : l
        )
      );
    } catch (e: any) {
      setError(e?.message || "Não conseguimos reatribuir este lead agora.");
    } finally {
      setSavingLeadId(null);
    }
  };

  return (
    <div className="py-2 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">Time</div>
          <div className="text-lg font-semibold text-gray-900 truncate">{teamName || teamId}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`/api/teams/${encodeURIComponent(teamId)}/leads-export?q=${encodeURIComponent(query)}&stage=${encodeURIComponent(stage)}&realtorId=${encodeURIComponent(realtorId)}&onlyPendingReply=${onlyPendingReply ? "1" : "0"}`}
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Exportar CSV
          </a>
          <Link
            href="/agency/team-chat"
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Chat do time
          </Link>
          <button
            type="button"
            onClick={() => reload()}
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold text-gray-500">Leads ativos</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
            {insights?.funnel?.activeTotal ?? "-"}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold text-gray-500">Novos (24h)</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
            {insights?.funnel?.newLast24h ?? "-"}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold text-gray-500">Sem responsável</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
            {insights?.funnel?.unassigned ?? "-"}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold text-gray-500">Pendentes (SLA)</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
            {insights?.sla?.pendingReplyTotal ?? "-"}
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm lg:shadow-none lg:rounded-t-2xl lg:border lg:border-gray-200 lg:border-b-0">
        <div className="px-0 py-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="block">
              <span className="block text-[11px] font-semibold text-gray-600">Buscar</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cliente, imóvel, corretor, ID..."
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold text-gray-600">Etapa</span>
              <select
                value={stage}
                onChange={(e) => setStage(String(e.target.value))}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="">Todas</option>
                {stageOptions.map((s) => (
                  <option key={s} value={s}>
                    {stageLabels[s] ?? s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold text-gray-600">Responsável</span>
              <select
                value={realtorId}
                onChange={(e) => setRealtorId(String(e.target.value))}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="">Todos</option>
                <option value="unassigned">Sem responsável</option>
                {realtorOptions.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {String(m.name || m.email || m.userId)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 mt-6 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={onlyPendingReply}
                onChange={(e) => setOnlyPendingReply(e.target.checked)}
                className="h-4 w-4"
              />
              Só pendentes (SLA)
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm lg:rounded-b-2xl lg:rounded-t-none lg:border-t-0">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-[11px] font-semibold text-gray-600">
                <th className="pl-2 pr-3 py-3">Lead</th>
                <th className="px-3 py-3">Imóvel</th>
                <th className="px-3 py-3">Etapa</th>
                <th className="px-3 py-3">Responsável</th>
                <th className="px-3 py-3">Criado</th>
                <th className="px-3 py-3">SLA</th>
                <th className="px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-gray-600" colSpan={7}>
                    Carregando...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-gray-600" colSpan={7}>
                    Nenhum lead encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                leads.map((l) => {
                  const leadId = String(l.id);
                  const pending = pendingMap.get(leadId) || null;
                  const slaAge = formatSlaAge(pending?.lastClientAt || null);
                  const assignedId = l.realtor?.id ? String(l.realtor.id) : "";
                  const isPending = !!pending;
                  return (
                    <tr key={leadId} className="hover:bg-gray-50">
                      <td className="pl-2 pr-3 py-3">
                        <button
                          type="button"
                          onClick={() => openLeadPanel(leadId, "ATIVIDADES")}
                          className="font-semibold text-gray-900 hover:underline text-left"
                        >
                          {l.contact?.name || `Lead ${leadId}`}
                        </button>
                        <div className="text-[11px] text-gray-500">ID: {leadId}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900 line-clamp-1">{l.property?.title || "-"}</div>
                        <div className="text-[11px] text-gray-500">
                          {l.property?.city ? `${l.property.city}` : ""}
                          {l.property?.state ? `/${l.property.state}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                          {stageLabels[l.pipelineStage || ""] ?? l.pipelineStage}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="min-w-[220px]">
                          <select
                            value={assignedId}
                            disabled={savingLeadId === leadId}
                            onChange={(e) => handleAssign(leadId, String(e.target.value))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-60"
                          >
                            <option value="">Sem responsável</option>
                            {realtorOptions.map((m) => (
                              <option key={m.userId} value={m.userId}>
                                {String(m.name || m.email || m.userId)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{formatShortDate(l.createdAt)}</td>
                      <td className="px-3 py-3">
                        {isPending ? (
                          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {slaAge ? `Aguardando há ${slaAge}` : "Aguardando"}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500">OK</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => openLeadPanel(leadId, "CHAT")}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Ver chat
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pageInfo.hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loading || loadingMore || !pageInfo.nextCursor}
            onClick={() => reload({ append: true })}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loadingMore ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      )}

      <AgencyLeadSidePanel
        open={leadPanelOpen}
        leadId={selectedLeadId}
        initialTab={leadPanelInitialTab}
        onClose={() => setLeadPanelOpen(false)}
      />
    </div>
  );
}
