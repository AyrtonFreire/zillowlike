"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusher-client";
import {
  Home,
  Users,
  Clock,
  Activity,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import PropertyListItem from "@/components/dashboard/PropertyListItem";
import LeadListItem from "@/components/dashboard/LeadListItem";
import BrokerOnboarding, { resetBrokerOnboarding } from "@/components/onboarding/BrokerOnboarding";
import LeadSearchBar from "@/components/crm/LeadSearchBar";
import { formatConversationModeLabel, formatLeadTemperatureLabel, formatPipelineStageLabel, formatPriorityLabel } from "@/lib/offline-assistant-intelligence";
import { motion } from "framer-motion";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface Metrics {
  activeProperties: number;
  totalProperties: number;
  leadsLast7Days: number;
  leadTrend: {
    value: number;
    isPositive: boolean;
  };
  avgResponseTime: number;
  avgResponseTimeTrend?: {
    value: number;
    isPositive: boolean;
  };
  activeLeads: number;
  leadsWithReminders: number;
}

function formatTokenLabel(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  return raw
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

function TrendPill({ trend }: { trend: { value: number; isPositive: boolean } | null }) {
  if (!trend) {
    return (
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
        —
      </span>
    );
  }
  const isPositive = Boolean(trend.isPositive);
  const color = isPositive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
  const arrow = isPositive ? "↑" : "↓";
  const v = Math.round(Math.abs(trend.value));
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>
      <span>{arrow}</span>
      <span className="tabular-nums">{v}%</span>
    </span>
  );
}

interface Property {
  id: string;
  title: string;
  price: number;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  image: string;
  views: number;
  leads: number;
}

interface Lead {
  id: string;
  propertyTitle: string;
  contactName: string;
  contactPhone: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  createdAt: string;
}

type OfflineAssistantDashboardSummary = {
  success: boolean;
  enabled: boolean;
  rollout?: {
    rolloutPercent?: number | null;
    experimentPercent?: number | null;
    rolloutEnabled?: boolean | null;
  } | null;
  versions?: {
    promptVersion?: string | null;
    guardrailsVersion?: string | null;
  } | null;
  range: "24h" | "7d";
  windowSince: string;
  seenAt: string | null;
  windowTotals: {
    leads: number;
    sent: number;
    failed: number;
    lastActivityAt: string | null;
    handoffLeads: number;
    visitRequestedLeads: number;
    hotLeads: number;
    urgentLeads: number;
    qualifiedLeads: number;
    avgDataCompleteness: number;
    topVariant: string | null;
    topGuardrailScenario: string | null;
  };
  newTotals: {
    leads: number;
    sent: number;
    failed: number;
    lastActivityAt: string | null;
  };
  items: Array<{
    leadId: string;
    contactName: string | null;
    propertyTitle: string | null;
    lastActivityAt: string | null;
    counts: { sent: number; failed: number };
    handoffNeeded: boolean;
    visitRequested: boolean;
    conversationMode: string | null;
    leadTemperature: string | null;
    responsePriority: string | null;
    commercialSummary: string | null;
    propertyContext?: {
      propertySummary?: string | null;
      regionSummary?: string | null;
    } | null;
    operationalPlaybook?: {
      headline?: string | null;
      pipelineStage?: string | null;
    } | null;
    experiment?: {
      variant?: string | null;
    } | null;
    guardrails?: {
      scenario?: string | null;
    } | null;
  }>;
};

interface MyLead {
  id: string;
  status: string;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    city: string;
    state: string;
  };
  pipelineStage?: PipelineStage;
}

type PipelineStage =
  | "NEW"
  | "CONTACT"
  | "VISIT"
  | "PROPOSAL"
  | "DOCUMENTS"
  | "WON"
  | "LOST";

export default function BrokerDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [myLeads, setMyLeads] = useState<MyLead[]>([]);
  const [leadFilter, setLeadFilter] = useState<"ALL" | "NEW" | "IN_SERVICE">("ALL");

  const [offlineSummary, setOfflineSummary] = useState<OfflineAssistantDashboardSummary | null>(null);
  const [offlineSummaryLoading, setOfflineSummaryLoading] = useState(false);

  const searchParams = useSearchParams();
  const previewUserId = searchParams.get("previewUserId");
  const [unreadMessages, setUnreadMessages] = useState(0);

  const userId = (session?.user as any)?.id as string | undefined;

  const myPipelineEtagRef = useRef<string | null>(null);
  const brokerChatsEtagRef = useRef<string | null>(null);

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (brokerChatsEtagRef.current) headers["If-None-Match"] = brokerChatsEtagRef.current;

      const response = await fetch("/api/broker/chats", { headers });
      if (response.status === 304) {
        return;
      }
      const data = await response.json();
      if (response.ok && data.chats) {
        const nextEtag = response.headers.get("etag");
        if (nextEtag) brokerChatsEtagRef.current = nextEtag;

        const total = (data.chats as any[]).reduce(
          (acc: number, chat: any) => acc + (chat.unreadCount || 0),
          0
        );
        setUnreadMessages(total);
      }
    } catch (err) {
      console.error("Error fetching unread messages:", err);
    }
  }, []);

  const fetchOfflineAssistantSummary = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;
      const key = "zlw_offline_assistant_seen_at";
      const seenAt = window.localStorage.getItem(key);
      const qs = new URLSearchParams({ range: "24h" });
      if (seenAt) qs.set("seenAt", String(seenAt));

      setOfflineSummaryLoading(true);
      const res = await fetch(`/api/broker/auto-reply-dashboard-summary?${qs.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setOfflineSummary(null);
        return;
      }
      setOfflineSummary(data as OfflineAssistantDashboardSummary);
    } catch {
      setOfflineSummary(null);
    } finally {
      setOfflineSummaryLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const effectiveUserId = previewUserId || userId;
      if (!effectiveUserId) return;

      setDashboardError(null);
      setLoading(true);
      const response = await fetch(`/api/metrics/realtor?userId=${effectiveUserId}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      setMetrics(data.metrics || null);
      setProperties(data.recentProperties || []);
      setLeads(data.recentLeads || []);
      setDashboardError(null);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setMetrics(null);
      setProperties([]);
      setLeads([]);
      setDashboardError("Não conseguimos carregar os dados do seu painel agora. Se quiser, atualize a página em alguns instantes.");
    } finally {
      setLoading(false);
    }
  }, [previewUserId, userId]);

  const fetchMyLeads = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (myPipelineEtagRef.current) headers["If-None-Match"] = myPipelineEtagRef.current;

      const response = await fetch("/api/leads/my-pipeline", { headers });
      if (response.status === 304) {
        return;
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos carregar seus leads ativos agora.");
      }

      const nextEtag = response.headers.get("etag");
      if (nextEtag) myPipelineEtagRef.current = nextEtag;

      setMyLeads(Array.isArray(data) ? (data as MyLead[]) : []);
    } catch (error) {
      console.error("Error fetching my leads:", error);
      setMyLeads([]);
    }
  }, []);

  const fetchMyLeadsSilent = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (myPipelineEtagRef.current) headers["If-None-Match"] = myPipelineEtagRef.current;

      const response = await fetch("/api/leads/my-pipeline", { headers });
      if (response.status === 304) {
        return;
      }
      const data = await response.json();
      if (!response.ok) return;

      const nextEtag = response.headers.get("etag");
      if (nextEtag) myPipelineEtagRef.current = nextEtag;

      setMyLeads(Array.isArray(data) ? (data as MyLead[]) : []);
    } catch {
    }
  }, []);

  useEffect(() => {
    if (userId) {
      void fetchDashboardData();
    }
  }, [userId, fetchDashboardData]);

  useEffect(() => {
    if (userId) {
      void fetchOfflineAssistantSummary();
    }
  }, [userId, fetchOfflineAssistantSummary]);

  useEffect(() => {
    if (userId) {
      void fetchMyLeads();
    }
  }, [userId, fetchMyLeads]);

  useEffect(() => {
    if (userId) {
      void fetchUnreadMessages();
    }
  }, [userId, fetchUnreadMessages]);

  useEffect(() => {
    if (!userId) return;
    const onFocus = () => {
      void fetchUnreadMessages();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchUnreadMessages();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId, fetchUnreadMessages]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${String(userId)}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        fetchUnreadMessages();
        void fetchMyLeadsSilent();
      };

      channel.bind("assistant:item_updated", handler as any);
      channel.bind("assistant:items_recalculated", handler as any);
      channel.bind("new-chat-message", handler as any);
      channel.bind("lead-chat-read-receipt", handler as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("assistant:item_updated", handler as any);
          channel.unbind("assistant:items_recalculated", handler as any);
          channel.unbind("new-chat-message", handler as any);
          channel.unbind("lead-chat-read-receipt", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
        }
      };
    } catch {
      return;
    }
  }, [userId, fetchUnreadMessages, fetchMyLeadsSilent]);

  const newLeads = myLeads.filter((lead: any) => (lead?.pipelineStage || "NEW") === "NEW");
  const inServiceLeads = myLeads.filter((lead: any) => {
    const stage = lead?.pipelineStage || "NEW";
    return stage !== "NEW" && stage !== "WON" && stage !== "LOST";
  });

  const filteredLeads = leads.filter((lead) => {
    if (leadFilter === "NEW") {
      return lead.status === "PENDING";
    }
    if (leadFilter === "IN_SERVICE") {
      return lead.status === "ACCEPTED";
    }
    return true;
  });
  const draftProperties = properties.filter((property) => property.status === "DRAFT");
  const draftPropertiesCount = draftProperties.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dashboardError && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {dashboardError}
          </div>
        )}

        {draftPropertiesCount > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200/80 bg-white px-4 py-4 shadow-sm sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Painel
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {draftPropertiesCount === 1
                    ? "Você tem 1 anúncio em rascunho para revisar."
                    : `Você tem ${draftPropertiesCount} anúncios em rascunho para revisar.`}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Complete os dados e publique quando quiser, sem precisar voltar para a home.
                </p>
              </div>
              <Link
                href="/broker/properties"
                className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100"
              >
                Ver rascunhos
              </Link>
            </div>
          </div>
        )}

        {/* Busca global de leads */}
        <div className="mb-6" data-onboarding="leads-section">
          <LeadSearchBar className="max-w-md" />
        </div>

        {(() => {
          const totals = offlineSummary?.windowTotals || null;
          if (offlineSummaryLoading && !offlineSummary) {
            return (
              <div className="mb-8">
                <StatCard title="Assistente offline">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5 rounded-2xl border border-gray-100 bg-white p-4">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-3 h-3 w-72" />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Skeleton className="h-7 w-28" />
                        <Skeleton className="h-7 w-24" />
                        <Skeleton className="h-7 w-32" />
                      </div>
                    </div>
                    <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Skeleton className="h-28" />
                      <Skeleton className="h-28" />
                      <Skeleton className="h-28" />
                    </div>
                  </div>
                </StatCard>
              </div>
            );
          }
          const shouldShow = !!totals && totals.leads > 0;
          if (!shouldShow) return null;

          const newLeads = offlineSummary?.newTotals?.leads || 0;
          const lastActivityAt = totals?.lastActivityAt || null;
          const periodLabel = offlineSummary?.range === "7d" ? "últimos 7 dias" : "últimas 24h";

          return (
            <div className="mb-8">
              <StatCard
                title="Assistente offline"
                action={
                  <Link
                    href="/broker/assistant/offline"
                    onClick={() => {
                      try {
                        if (typeof window !== "undefined" && lastActivityAt) {
                          window.localStorage.setItem("zlw_offline_assistant_seen_at", String(lastActivityAt));
                        }
                      } catch {
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver detalhes
                  </Link>
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (typeof window !== "undefined" && lastActivityAt) {
                        window.localStorage.setItem("zlw_offline_assistant_seen_at", String(lastActivityAt));
                      }
                    } catch {
                    }
                    router.push("/broker/assistant/offline");
                  }}
                  className="w-full text-left rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          Atividade em {totals.leads} lead{totals.leads > 1 ? "s" : ""} ({periodLabel})
                        </p>
                        {newLeads > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 text-[11px] font-bold">
                            {newLeads} novo{newLeads > 1 ? "s" : ""}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {totals.sent} enviada{totals.sent > 1 ? "s" : ""}
                        {totals.failed > 0 ? ` · ${totals.failed} falha${totals.failed > 1 ? "s" : ""}` : ""}
                        {totals.handoffLeads > 0 ? ` · ${totals.handoffLeads} precisam retorno` : ""}
                        {totals.visitRequestedLeads > 0 ? ` · ${totals.visitRequestedLeads} pediram visita` : ""}
                        {totals.hotLeads > 0 ? ` · ${totals.hotLeads} quentes` : ""}
                        {totals.urgentLeads > 0 ? ` · ${totals.urgentLeads} urgentes` : ""}
                        {totals.qualifiedLeads > 0 ? ` · ${totals.qualifiedLeads} qualificados` : ""}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Rollout {offlineSummary?.rollout?.rolloutEnabled ? "ativo" : "controle"} · {offlineSummary?.rollout?.rolloutPercent ?? 0}% corretores · {offlineSummary?.rollout?.experimentPercent ?? 0}% leads · prompt {offlineSummary?.versions?.promptVersion || "—"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Completude média {totals.avgDataCompleteness}%
                        {totals.topVariant ? ` · variante ${formatTokenLabel(totals.topVariant)}` : ""}
                        {totals.topGuardrailScenario ? ` · guardrail ${formatTokenLabel(totals.topGuardrailScenario)}` : ""}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {totals.handoffLeads > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            Precisa retorno
                          </span>
                        ) : null}
                        {totals.visitRequestedLeads > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700">
                            <Sparkles className="w-3.5 h-3.5" />
                            Visita solicitada
                          </span>
                        ) : null}
                        {totals.failed > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                            Falhas
                          </span>
                        ) : null}
                        {totals.hotLeads > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700">
                            Leads quentes
                          </span>
                        ) : null}
                        {totals.urgentLeads > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                            Prioridade urgente
                          </span>
                        ) : null}
                        {totals.qualifiedLeads > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            Qualificados
                          </span>
                        ) : null}
                        {totals.topVariant ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            {formatTokenLabel(totals.topVariant)}
                          </span>
                        ) : null}
                        {totals.topGuardrailScenario ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                            Guardrail {formatTokenLabel(totals.topGuardrailScenario)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                        Abrir
                      </span>
                    </div>
                  </div>

                  {(offlineSummary?.items || []).length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(offlineSummary?.items || []).slice(0, 3).map((row) => {
                        const t = row.propertyTitle || "Lead";
                        const c = row.contactName || "Cliente";
                        return (
                          <div key={row.leadId} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                            <p className="text-[11px] font-semibold text-gray-900 line-clamp-1">
                              {c} · {t}
                            </p>
                            <p className="mt-0.5 text-[11px] text-gray-600">
                              {row.handoffNeeded ? "Precisa retorno" : ""}
                              {row.handoffNeeded && row.visitRequested ? " · " : ""}
                              {row.visitRequested ? "Visita" : ""}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {row.leadTemperature ? (
                                <span className="inline-flex items-center rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                                  {formatLeadTemperatureLabel(row.leadTemperature)}
                                </span>
                              ) : null}
                              {row.responsePriority ? (
                                <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                  {formatPriorityLabel(row.responsePriority)}
                                </span>
                              ) : null}
                              {row.conversationMode ? (
                                <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                                  {formatConversationModeLabel(row.conversationMode)}
                                </span>
                              ) : null}
                              {row.experiment?.variant ? (
                                <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  {formatTokenLabel(row.experiment.variant)}
                                </span>
                              ) : null}
                              {row.guardrails?.scenario ? (
                                <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                                  {formatTokenLabel(row.guardrails.scenario)}
                                </span>
                              ) : null}
                            </div>
                            {row.commercialSummary ? (
                              <p className="mt-1 text-[11px] text-gray-600 line-clamp-2">{row.commercialSummary}</p>
                            ) : null}
                            {row.operationalPlaybook?.headline ? (
                              <p className="mt-1 text-[11px] text-gray-600 line-clamp-2">
                                {row.operationalPlaybook.headline}
                                {row.operationalPlaybook?.pipelineStage ? ` · ${formatPipelineStageLabel(row.operationalPlaybook.pipelineStage)}` : ""}
                              </p>
                            ) : null}
                            {row.propertyContext?.propertySummary ? (
                              <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{row.propertyContext.propertySummary}</p>
                            ) : row.propertyContext?.regionSummary ? (
                              <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{row.propertyContext.regionSummary}</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </button>
              </StatCard>
            </div>
          );
        })()}

        {/* Metrics Grid - 2 cols on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <MetricCard
            title="Imóveis Ativos"
            value={metrics?.activeProperties || 0}
            icon={Home}
            subtitle={`${metrics?.totalProperties || 0} no total`}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />
          <MetricCard
            title="Leads Recebidos"
            value={metrics?.leadsLast7Days || 0}
            icon={Users}
            trend={metrics?.leadTrend}
            subtitle="Últimos 7 dias"
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />
          <MetricCard
            title="Leads em atendimento"
            value={metrics?.activeLeads || 0}
            icon={Activity}
            subtitle="Reservados/atendendo"
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
        </div>

        <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Prioridades operacionais</div>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">Organize o dia do corretor por urgência e contexto.</h2>
              <p className="mt-1 text-sm text-gray-600">Atalhos para o que pede ação imediata no funil, nas conversas e nos imóveis anunciados.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/profile?onboarding=broker" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                Revisar perfil profissional
              </Link>
              <Link href="/broker/leads" className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100">
                Abrir leads
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setLeadFilter("NEW")}
              className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-blue-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-2xl font-semibold tabular-nums text-blue-900">{newLeads.length}</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-blue-900">Novos para primeiro contato</div>
              <p className="mt-1 text-xs leading-5 text-blue-800">Leads recém-chegados no topo do funil para responder primeiro.</p>
            </button>

            <button
              type="button"
              onClick={() => setLeadFilter("IN_SERVICE")}
              className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-purple-700">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="text-2xl font-semibold tabular-nums text-purple-900">{inServiceLeads.length}</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-purple-900">Em acompanhamento</div>
              <p className="mt-1 text-xs leading-5 text-purple-800">Oportunidades já em contato, visita, proposta ou documentação.</p>
            </button>

            <Link
              href="/broker/chats"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-rose-700">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="text-2xl font-semibold tabular-nums text-rose-900">{unreadMessages}</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-rose-900">Mensagens não lidas</div>
              <p className="mt-1 text-xs leading-5 text-rose-800">Converse com clientes que aguardam retorno para não perder timing comercial.</p>
            </Link>

            <Link
              href="/broker/crm"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-2xl font-semibold tabular-nums text-amber-900">{metrics?.leadsWithReminders || 0}</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-amber-900">Próximas ações</div>
              <p className="mt-1 text-xs leading-5 text-amber-800">Lembretes ativos e pendências que precisam ser movidas no CRM.</p>
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Properties */}
          <StatCard
            title="Imóveis Recentes"
            action={
              <Link
                href="/broker/properties"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todos
              </Link>
            }
          >
            <div className="space-y-3">
              {properties.length > 0 ? (
                properties.map((property) => (
                  <PropertyListItem
                    key={property.id}
                    {...property}
                    onEdit={(id) => console.log("Edit", id)}
                    onDelete={(id) => console.log("Delete", id)}
                    onToggleStatus={(id) => console.log("Toggle", id)}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-500">
                  <Home className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-700">Nenhum imóvel cadastrado ainda</p>
                  <p className="mt-1 text-sm text-gray-500">Seu painel fica mais útil quando você publica o primeiro anúncio e começa a receber contatos.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Link
                      href="/broker/properties/new"
                      className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Criar primeiro imóvel
                    </Link>
                    <Link
                      href="/profile?onboarding=broker"
                      className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
                    >
                      Revisar perfil
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </StatCard>

          {/* Recent Leads */}
          <StatCard
            title="Leads Recentes"
            action={
              <Link
                href="/broker/leads"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todos
              </Link>
            }
          >
            <div className="mb-4 flex gap-2">
              {[
                { value: "ALL" as const, label: "Todos" },
                { value: "NEW" as const, label: "Novos" },
                { value: "IN_SERVICE" as const, label: "Em atendimento" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setLeadFilter(item.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    leadFilter === item.value
                      ? "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <LeadListItem
                    key={lead.id}
                    {...lead}
                    createdAt={new Date(lead.createdAt)}
                    onAccept={(id) => console.log("Accept", id)}
                    onReject={(id) => console.log("Reject", id)}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-700">
                    {leadFilter === "NEW"
                      ? "Nenhum lead novo neste momento."
                      : leadFilter === "IN_SERVICE"
                      ? "Nenhum lead em acompanhamento neste momento."
                      : "Nenhum lead encontrado para esse filtro ainda."}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {leadFilter === "NEW"
                      ? "Quando novos contatos chegarem, eles aparecerão aqui para priorizar o primeiro retorno."
                      : leadFilter === "IN_SERVICE"
                        ? "Assim que você avançar contatos no CRM, eles passarão a compor este recorte operacional."
                        : "Assim que seus anúncios começarem a gerar contatos, este bloco vira um atalho rápido para sua operação."}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Link href="/broker/leads" className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                      Ver lista completa
                    </Link>
                    <Link href="/broker/crm" className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700">
                      Abrir CRM
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </StatCard>
        </div>


        {/* Botão para ver tutorial novamente */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              resetBrokerOnboarding();
              window.location.reload();
            }}
            className="text-sm text-gray-500 hover:text-teal-600 transition-colors underline-offset-2 hover:underline"
          >
            👋 Ver tutorial novamente
          </button>
        </div>
      </div>
      <BrokerOnboarding />
    </>
  );
}
