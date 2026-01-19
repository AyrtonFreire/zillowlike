"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Activity, AlertTriangle, MessageCircle, Settings, Users, X } from "lucide-react";
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

type PipelineMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  queuePosition?: number;
  publicWhatsApp?: string | null;
  phoneNormalized?: string | null;
  phone?: string | null;
};

type PipelineLead = {
  id: string;
  status: string;
  pipelineStage: string;
  createdAt: string;
  contact?: { name?: string | null; phone?: string | null } | null;
  property?: { title?: string | null } | null;
  realtor?: { id: string; name: string | null; email: string | null } | null;
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

  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [noticeSuccess, setNoticeSuccess] = useState<string | null>(null);
  const [pipelineMembers, setPipelineMembers] = useState<PipelineMember[]>([]);
  const [pipelineLeads, setPipelineLeads] = useState<PipelineLead[]>([]);
  const [selectedRealtorId, setSelectedRealtorId] = useState<string>("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [noticeTitle, setNoticeTitle] = useState<string>("Aviso da agência");
  const [noticeMessage, setNoticeMessage] = useState<string>("");
  const [sendingNotice, setSendingNotice] = useState(false);

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  const realtorOptions = useMemo(() => {
    const list = Array.isArray(pipelineMembers) ? pipelineMembers : [];
    return list
      .filter((m) => String(m.role || "").toUpperCase() === "AGENT")
      .slice()
      .sort((a, b) => {
        const an = String(a.name || a.email || "").toLowerCase();
        const bn = String(b.name || b.email || "").toLowerCase();
        return an.localeCompare(bn);
      });
  }, [pipelineMembers]);

  const selectedRealtor = useMemo(() => {
    return realtorOptions.find((m) => String(m.userId) === String(selectedRealtorId)) || null;
  }, [realtorOptions, selectedRealtorId]);

  const leadsForSelectedRealtor = useMemo(() => {
    const rid = String(selectedRealtorId || "").trim();
    if (!rid) return [];
    return (Array.isArray(pipelineLeads) ? pipelineLeads : []).filter((l) => String(l.realtor?.id || "") === rid);
  }, [pipelineLeads, selectedRealtorId]);

  const selectedLeadIdSet = useMemo(() => new Set(selectedLeadIds.map(String)), [selectedLeadIds]);

  const getRealtorWhatsAppUrl = useMemo(() => {
    const raw =
      String(selectedRealtor?.publicWhatsApp || "").trim() ||
      String(selectedRealtor?.phoneNormalized || "").trim() ||
      String(selectedRealtor?.phone || "").trim();
    if (!raw) return null;
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;
    const withCountry = digits.startsWith("55") ? digits : digits.length >= 10 ? `55${digits}` : digits;
    const text = String(noticeMessage || noticeTitle || "Olá!").trim();
    return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
  }, [noticeMessage, noticeTitle, selectedRealtor?.phone, selectedRealtor?.phoneNormalized, selectedRealtor?.publicWhatsApp]);

  const openNoticeModal = async () => {
    setNoticeOpen(true);
    setNoticeError(null);
    setNoticeSuccess(null);
    setSelectedLeadIds([]);
    setNoticeTitle("Aviso da agência");
    setNoticeMessage("");

    const teamId = insights?.team?.id ? String(insights.team.id) : "";
    if (!teamId) {
      setNoticeError("Não foi possível identificar o time.");
      return;
    }

    try {
      setNoticeLoading(true);
      const r = await fetch(`/api/teams/${teamId}/pipeline`, { cache: "no-store" });
      const j = (await r.json().catch(() => null)) as any;
      if (!r.ok || !j?.success) {
        throw new Error(j?.error || "Não conseguimos carregar os dados do time agora.");
      }
      setPipelineMembers(Array.isArray(j.members) ? (j.members as PipelineMember[]) : []);
      setPipelineLeads(Array.isArray(j.leads) ? (j.leads as PipelineLead[]) : []);

      const agents = Array.isArray(j.members)
        ? (j.members as PipelineMember[]).filter((m) => String(m.role || "").toUpperCase() === "AGENT")
        : [];
      setSelectedRealtorId(agents[0]?.userId ? String(agents[0].userId) : "");
    } catch (e: any) {
      setNoticeError(e?.message || "Não conseguimos carregar os dados do time agora.");
      setPipelineMembers([]);
      setPipelineLeads([]);
      setSelectedRealtorId("");
    } finally {
      setNoticeLoading(false);
    }
  };

  const closeNoticeModal = () => {
    if (sendingNotice) return;
    setNoticeOpen(false);
  };

  const toggleLead = (leadId: string, selected: boolean) => {
    const id = String(leadId);
    if (!id) return;
    setSelectedLeadIds((prev) => {
      const next = new Set(prev.map(String));
      if (selected) {
        if (next.size >= 50) return prev;
        next.add(id);
      } else {
        next.delete(id);
      }
      return Array.from(next);
    });
  };

  const sendNotice = async () => {
    const teamId = insights?.team?.id ? String(insights.team.id) : "";
    const realtorId = String(selectedRealtorId || "").trim();
    if (!teamId) {
      setNoticeError("Não foi possível identificar o time.");
      return;
    }
    if (!realtorId) {
      setNoticeError("Selecione um corretor.");
      return;
    }
    if (!Array.isArray(selectedLeadIds) || selectedLeadIds.length === 0) {
      setNoticeError("Selecione pelo menos 1 lead.");
      return;
    }

    try {
      setSendingNotice(true);
      setNoticeError(null);
      setNoticeSuccess(null);
      const r = await fetch("/api/agency/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          realtorId,
          leadIds: selectedLeadIds.map(String),
          title: String(noticeTitle || "Aviso da agência").trim(),
          message: String(noticeMessage || "").trim(),
        }),
      });
      const j = (await r.json().catch(() => null)) as any;
      if (!r.ok) {
        throw new Error(j?.error || "Não conseguimos enviar o aviso agora.");
      }
      setNoticeSuccess("Aviso enviado.");
      setSelectedLeadIds([]);
    } catch (e: any) {
      setNoticeError(e?.message || "Não conseguimos enviar o aviso agora.");
    } finally {
      setSendingNotice(false);
    }
  };


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
                <MessageCircle className="w-4 h-4 mr-2" />
                Leads do time
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
            <div className="lg:col-span-3">
              <StatCard
                title="Alertas do time"
                action={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openNoticeModal}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Avisar corretor
                    </button>
                    <Link
                      href={`/agency/teams/${insights.team.id}/crm`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Abrir leads
                    </Link>
                  </div>
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
          </div>

          {noticeOpen && (
            <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeNoticeModal} />
              <div className="relative z-[60001] bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-gray-900">Avisar corretor</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Envie um aviso direto para o corretor, com lista de leads e ações rápidas.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={sendingNotice}
                    onClick={closeNoticeModal}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {noticeLoading ? (
                    <div className="text-sm text-gray-600">Carregando corretores e leads...</div>
                  ) : (
                    <>
                      {noticeError && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          {noticeError}
                        </div>
                      )}

                      {noticeSuccess && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                          {noticeSuccess}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-[11px] font-semibold text-gray-600">Corretor</span>
                          <select
                            value={selectedRealtorId}
                            onChange={(e) => {
                              setSelectedRealtorId(String(e.target.value));
                              setSelectedLeadIds([]);
                              setNoticeError(null);
                              setNoticeSuccess(null);
                            }}
                            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                          >
                            <option value="">Selecione...</option>
                            {realtorOptions.map((m) => (
                              <option key={m.userId} value={m.userId}>
                                {String(m.name || m.email || m.userId)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="block text-[11px] font-semibold text-gray-600">Título</span>
                          <input
                            value={noticeTitle}
                            onChange={(e) => setNoticeTitle(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                            placeholder="Aviso da agência"
                          />
                        </label>
                      </div>

                      {getRealtorWhatsAppUrl && selectedRealtorId && (
                        <div>
                          <a
                            href={getRealtorWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp do corretor
                          </a>
                        </div>
                      )}

                      <label className="block">
                        <span className="block text-[11px] font-semibold text-gray-600">Mensagem</span>
                        <textarea
                          value={noticeMessage}
                          onChange={(e) => setNoticeMessage(e.target.value)}
                          rows={4}
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                          placeholder="Ex: Esses leads estão aguardando resposta. Pode priorizar hoje?"
                        />
                      </label>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold text-gray-800">Leads do corretor</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!selectedRealtorId || leadsForSelectedRealtor.length === 0}
                              onClick={() => {
                                const all = leadsForSelectedRealtor.map((l) => String(l.id)).filter(Boolean).slice(0, 50);
                                setSelectedLeadIds(all);
                              }}
                              className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-60"
                            >
                              Selecionar todos
                            </button>
                            <button
                              type="button"
                              disabled={selectedLeadIds.length === 0}
                              onClick={() => setSelectedLeadIds([])}
                              className="text-[11px] font-semibold text-gray-600 hover:text-gray-800 disabled:opacity-60"
                            >
                              Limpar
                            </button>
                          </div>
                        </div>

                        {!selectedRealtorId ? (
                          <div className="mt-2 text-sm text-gray-600">Selecione um corretor para listar os leads.</div>
                        ) : leadsForSelectedRealtor.length === 0 ? (
                          <div className="mt-2 text-sm text-gray-600">Nenhum lead atribuído a este corretor.</div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {leadsForSelectedRealtor.map((l) => {
                              const leadId = String(l.id);
                              const label =
                                String(l.contact?.name || "").trim() ||
                                String(l.property?.title || "").trim() ||
                                `Lead ${leadId}`;

                              const checked = selectedLeadIdSet.has(leadId);
                              const disableSelect = !checked && selectedLeadIdSet.size >= 50;

                              return (
                                <label
                                  key={leadId}
                                  className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={disableSelect}
                                    onChange={(e) => toggleLead(leadId, e.target.checked)}
                                    className="mt-1 h-4 w-4"
                                  />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-gray-900 line-clamp-1">{label}</span>
                                    {l.property?.title ? (
                                      <span className="block text-[11px] text-gray-600 line-clamp-1">{String(l.property.title)}</span>
                                    ) : null}
                                  </span>
                                </label>
                              );
                            })}
                            {selectedLeadIdSet.size >= 50 && (
                              <div className="text-[11px] font-semibold text-amber-800">
                                Limite de 50 leads por aviso.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={sendingNotice}
                    onClick={closeNoticeModal}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-60"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    disabled={sendingNotice || noticeLoading}
                    onClick={sendNotice}
                    className="px-4 py-2 text-sm font-semibold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 disabled:opacity-60"
                  >
                    {sendingNotice ? "Enviando..." : "Enviar aviso"}
                  </button>
                </div>
              </div>
            </div>
          )}
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
