"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Home,
  Users,
  Clock,
  Plus,
  Eye,
  Activity,
  MessageSquare,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import PropertyListItem from "@/components/dashboard/PropertyListItem";
import LeadListItem from "@/components/dashboard/LeadListItem";
import DashboardLayout from "@/components/DashboardLayout";
import BrokerOnboarding, { resetBrokerOnboarding } from "@/components/onboarding/BrokerOnboarding";
import LeadSearchBar from "@/components/crm/LeadSearchBar";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

 interface AutoReplyMetrics {
   range: "24h" | "7d";
   since: string;
   enabled: boolean;
   counts: {
     sent: number;
     skipped: number;
     failed: number;
   };
   skippedByReason: Array<{ reason: string; count: number }>;
   recent: Array<{
     id: string;
     leadId: string;
     decision: string;
     reason: string | null;
     createdAt: string;
     propertyTitle: string | null;
     contactName: string | null;
   }>;
 }

function formatMinutesCompact(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes || 0));
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days <= 0) return `${hours}h`;
  if (remHours <= 0) return `${days}d`;
  return `${days}d${remHours}h`;
}

function clampNumber(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function formatPercent(value: number) {
  const v = clampNumber(value);
  if (v <= 0) return "0%";
  if (v >= 100) return "100%";
  return `${Math.round(v)}%`;
}

function hexToRgba(hex: string, alpha: number) {
  const raw = String(hex || "").replace("#", "").trim();
  if (raw.length !== 6) return `rgba(148, 163, 184, ${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if (![r, g, b].every((x) => Number.isFinite(x))) return `rgba(148, 163, 184, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  nextActionDate?: string | null;
  nextActionNote?: string | null;
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
  const [myLeadsLoading, setMyLeadsLoading] = useState(true);
  const [myLeadsError, setMyLeadsError] = useState<string | null>(null);
  const [leadFilter, setLeadFilter] = useState<"ALL" | "NEW" | "IN_SERVICE">("ALL");

  const [autoReplyMetrics, setAutoReplyMetrics] = useState<AutoReplyMetrics | null>(null);
  const [autoReplyLoading, setAutoReplyLoading] = useState(true);
  const [autoReplyError, setAutoReplyError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const previewUserId = searchParams.get("previewUserId");

  const [pipelineCounts, setPipelineCounts] = useState<Record<PipelineStage, number> | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineTrend, setPipelineTrend] = useState<{ value: number; isPositive: boolean } | null>(null);
  const [pipelineFilterStage, setPipelineFilterStage] = useState<PipelineStage | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const BROKER_CHAT_LAST_READ_PREFIX = "zlw_broker_chat_last_read_";

  const userId = (session?.user as any)?.id as string | undefined;

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchMyLeads();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchPipelineSummary();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUnreadMessages();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchAutoReplyMetrics();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const onFocus = () => fetchUnreadMessages();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchUnreadMessages();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId]);

  const fetchUnreadMessages = async () => {
    try {
      const response = await fetch("/api/broker/chats");
      const data = await response.json();
      if (response.ok && data.chats) {
        const total = (data.chats as any[]).reduce(
          (acc: number, chat: any) => acc + (chat.unreadCount || 0),
          0
        );
        setUnreadMessages(total);
      }
    } catch (err) {
      console.error("Error fetching unread messages:", err);
    }
  };

  const fetchAutoReplyMetrics = async () => {
    try {
      setAutoReplyError(null);
      setAutoReplyLoading(true);
      const response = await fetch("/api/broker/auto-reply-metrics?range=24h");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `API error: ${response.status}`);
      }

      setAutoReplyMetrics(data || null);
    } catch (error) {
      console.error("Error fetching auto-reply metrics:", error);
      setAutoReplyMetrics(null);
      setAutoReplyError("Não conseguimos carregar o resumo do assistente offline agora.");
    } finally {
      setAutoReplyLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Use real userId from session, or previewUserId for admin preview
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
      // Set empty arrays to prevent undefined errors
      setMetrics(null);
      setProperties([]);
      setLeads([]);
      setDashboardError("Não conseguimos carregar os dados do seu painel agora. Se quiser, atualize a página em alguns instantes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyLeads = async () => {
    try {
      setMyLeadsError(null);
      setMyLeadsLoading(true);
      const response = await fetch("/api/leads/my-pipeline");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `API error: ${response.status}`);
      }

      setMyLeads(Array.isArray(data) ? (data as MyLead[]) : []);
    } catch (error) {
      console.error("Error fetching my leads:", error);
      setMyLeads([]);
      setMyLeadsError("Não conseguimos carregar seus leads ativos agora. Se quiser, tente novamente em alguns instantes.");
    } finally {
      setMyLeadsLoading(false);
    }
  };

  const fetchPipelineSummary = async () => {
    try {
      setPipelineError(null);
      setPipelineLoading(true);
      const response = await fetch("/api/leads/my-pipeline");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `API error: ${response.status}`);
      }
      const initial: Record<PipelineStage, number> = {
        NEW: 0,
        CONTACT: 0,
        VISIT: 0,
        PROPOSAL: 0,
        DOCUMENTS: 0,
        WON: 0,
        LOST: 0,
      };

      const now = new Date();
      const startCurrent = new Date(now);
      startCurrent.setDate(now.getDate() - 7);
      const startPrev = new Date(now);
      startPrev.setDate(now.getDate() - 14);
      let currentWindow = 0;
      let prevWindow = 0;

      (Array.isArray(data) ? data : []).forEach((lead: any) => {
        const stage = (lead.pipelineStage || "NEW") as PipelineStage;
        if (initial[stage] !== undefined) {
          initial[stage] += 1;
        }

        const createdAt = lead?.createdAt ? new Date(lead.createdAt) : null;
        if (createdAt && !Number.isNaN(createdAt.getTime())) {
          if (createdAt >= startCurrent) {
            currentWindow += 1;
          } else if (createdAt >= startPrev && createdAt < startCurrent) {
            prevWindow += 1;
          }
        }
      });

      setPipelineCounts(initial);

      if (prevWindow <= 0 && currentWindow <= 0) {
        setPipelineTrend(null);
      } else if (prevWindow <= 0 && currentWindow > 0) {
        setPipelineTrend({ value: 100, isPositive: true });
      } else {
        const delta = ((currentWindow - prevWindow) / Math.max(1, prevWindow)) * 100;
        setPipelineTrend({ value: Math.round(Math.abs(delta)), isPositive: delta >= 0 });
      }
    } catch (error) {
      console.error("Error fetching pipeline summary:", error);
      setPipelineCounts(null);
      setPipelineError(
        "Não conseguimos carregar o resumo do seu funil agora. Se quiser, atualize a página em alguns instantes."
      );
      setPipelineTrend(null);
    } finally {
      setPipelineLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const today = new Date();
  const activeMyLeads = myLeads.filter((lead: any) => lead?.pipelineStage !== "WON" && lead?.pipelineStage !== "LOST");
  const newLeads = activeMyLeads.filter((lead: any) => (lead.pipelineStage || "NEW") === "NEW");
  const inServiceLeads = activeMyLeads.filter((lead: any) => (lead.pipelineStage || "NEW") !== "NEW");
  const leadsToday = activeMyLeads.filter((lead) =>
    isSameDay(new Date(lead.createdAt), today)
  );

  const dayTotal = newLeads.length + inServiceLeads.length;
  const dayChartData = [
    {
      key: "in_service",
      name: "Em atendimento",
      value: inServiceLeads.length,
      color: "#8b5cf6",
    },
    {
      key: "new",
      name: "Novos",
      value: newLeads.length,
      color: "#3b82f6",
    },
  ].filter((x) => x.value > 0);

  const dayBaseline = typeof metrics?.leadsLast7Days === "number" ? metrics.leadsLast7Days / 7 : null;
  const dayTrend =
    dayBaseline && dayBaseline > 0
      ? {
          value: Math.round(Math.abs(((leadsToday.length - dayBaseline) / dayBaseline) * 100)),
          isPositive: leadsToday.length >= dayBaseline,
        }
      : null;

  const pipelineStageMeta: Array<{ stage: PipelineStage; label: string; color: string }> = [
    { stage: "NEW", label: "Novo", color: "#3b82f6" },
    { stage: "CONTACT", label: "Contato", color: "#06b6d4" },
    { stage: "VISIT", label: "Visita", color: "#14b8a6" },
    { stage: "PROPOSAL", label: "Proposta", color: "#f59e0b" },
    { stage: "DOCUMENTS", label: "Documentos", color: "#fb7185" },
    { stage: "WON", label: "Ganho", color: "#22c55e" },
    { stage: "LOST", label: "Perdido", color: "#94a3b8" },
  ];

  const pipelineTotal = pipelineCounts
    ? Object.values(pipelineCounts).reduce((sum, value) => sum + value, 0)
    : 0;
  const pipelineChartData = pipelineCounts
    ? pipelineStageMeta
        .map((m) => ({
          stage: m.stage,
          name: m.label,
          value: clampNumber(pipelineCounts[m.stage] || 0),
          color: m.color,
          pct: pipelineTotal > 0 ? (clampNumber(pipelineCounts[m.stage] || 0) / pipelineTotal) * 100 : 0,
        }))
        .filter((x) => x.value > 0)
    : [];

  const remindersToday = myLeads.filter((lead) => {
    if (!lead.nextActionDate) return false;
    const d = new Date(lead.nextActionDate);
    return isSameDay(d, today) || d < today;
  });

  const sortedRemindersToday = [...remindersToday].sort((a, b) => {
    if (!a.nextActionDate || !b.nextActionDate) return 0;
    return new Date(a.nextActionDate).getTime() - new Date(b.nextActionDate).getTime();
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

  if (loading) {
    return (
      <DashboardLayout
        title="Dashboard do Corretor"
        description="Aqui está um resumo do seu desempenho"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Corretor", href: "/broker/dashboard" },
          { label: "Dashboard" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={
        <>
          <span className="md:hidden">{getGreeting()},</span>
          <span className="hidden md:inline">
            {getGreeting()}, {session?.user?.name ?? "Corretor"} 👋
          </span>
        </>
      }
      description="Aqui está um resumo do seu desempenho"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Dashboard" },
      ]}
      actions={
        <Link
          href="/broker/properties/new"
          className="flex items-center gap-2 px-6 py-3 glass-teal text-white font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Imóvel
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dashboardError && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {dashboardError}
          </div>
        )}

        {/* Busca global de leads */}
        <div className="mb-6" data-onboarding="leads-section">
          <LeadSearchBar className="max-w-md" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Link
            href="/broker/properties"
            className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ver Imóveis</h3>
                <p className="text-sm text-gray-600">Gerenciar anúncios</p>
              </div>
            </div>
          </Link>

          <Link
            href="/broker/leads"
            className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Minha lista de leads</h3>
                <p className="text-sm text-gray-500 mt-1">Acompanhe suas oportunidades</p>
              </div>
            </div>
          </Link>

          <Link
            href="/broker/chats"
            className="relative p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
          >
            {unreadMessages > 0 && (
              <div className="absolute -top-2 -right-2 min-w-[24px] h-6 px-2 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="relative p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Conversas com clientes</h3>
                <p className="text-sm text-gray-600">
                  {unreadMessages > 0
                    ? `${unreadMessages} mensagem${unreadMessages > 1 ? "s" : ""} não lida${unreadMessages > 1 ? "s" : ""}`
                    : "Responda clientes pelo chat"}
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/broker/messages"
            className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="relative p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                <MessageCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Conversas do time</h3>
                <p className="text-sm text-gray-600">Chat interno com a imobiliária</p>
              </div>
            </div>
          </Link>

          <Link
            href="/broker/agenda"
            className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Agenda de visitas</h3>
                <p className="text-sm text-gray-600">Ver horários combinados</p>
              </div>
            </div>
          </Link>
        </div>

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
          <MetricCard
            title="Lembretes marcados"
            value={metrics?.leadsWithReminders || 0}
            icon={Clock}
            subtitle="Leads com próxima ação"
            iconColor="text-orange-600"
            iconBgColor="bg-orange-50"
          />
        </div>

        <div className="mb-8">
          <StatCard
            title="Assistente offline (últimas 24h)"
            action={
              <Link href="/broker/profile" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Configurar
              </Link>
            }
          >
            {autoReplyError ? (
              <div className="text-sm text-gray-600">{autoReplyError}</div>
            ) : autoReplyLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-3">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Skeleton className="h-60" />
                  <Skeleton className="h-60" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {!autoReplyMetrics?.enabled ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    O assistente offline está desativado.
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MetricCard
                    title="Respostas enviadas"
                    value={autoReplyMetrics?.counts?.sent || 0}
                    icon={MessageSquare}
                    subtitle="IA respondeu por você"
                    iconColor="text-emerald-700"
                    iconBgColor="bg-emerald-50"
                    className="p-4"
                  />
                  <MetricCard
                    title="Puladas"
                    value={autoReplyMetrics?.counts?.skipped || 0}
                    icon={Clock}
                    subtitle="Decisões de skip"
                    iconColor="text-amber-700"
                    iconBgColor="bg-amber-50"
                    className="p-4"
                  />
                  <MetricCard
                    title="Falhas"
                    value={autoReplyMetrics?.counts?.failed || 0}
                    icon={Activity}
                    subtitle="Erros/saídas vazias"
                    iconColor="text-rose-700"
                    iconBgColor="bg-rose-50"
                    className="p-4"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Principais motivos de skip</p>
                      <p className="text-xs text-gray-500">24h</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(autoReplyMetrics?.skippedByReason || []).length === 0 ? (
                        <p className="text-sm text-gray-600">Nenhum skip registrado no período.</p>
                      ) : (
                        (autoReplyMetrics?.skippedByReason || []).map((row) => (
                          <div key={row.reason} className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-gray-700 truncate">{row.reason}</span>
                            <span className="text-xs font-semibold text-gray-900 tabular-nums">{row.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Últimos eventos</p>
                      <p className="text-xs text-gray-500">24h</p>
                    </div>
                    <div className="mt-3 space-y-3">
                      {(autoReplyMetrics?.recent || []).length === 0 ? (
                        <p className="text-sm text-gray-600">Nenhum evento registrado no período.</p>
                      ) : (
                        (autoReplyMetrics?.recent || []).map((row) => {
                          const decision = String(row.decision || "");
                          const badge =
                            decision === "SENT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : decision === "FAILED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200";
                          const title = row.propertyTitle || "Lead";
                          const subtitle = [row.contactName || null, row.reason || null].filter(Boolean).join(" · ");
                          return (
                            <Link
                              key={row.id}
                              href={`/broker/leads/${row.leadId}`}
                              className="block rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{title}</p>
                                  {subtitle ? (
                                    <p className="mt-0.5 text-xs text-gray-600 line-clamp-1">{subtitle}</p>
                                  ) : (
                                    <p className="mt-0.5 text-xs text-gray-500">&nbsp;</p>
                                  )}
                                  <p className="mt-1 text-[10px] text-gray-400">
                                    {row.createdAt ? new Date(row.createdAt).toLocaleString("pt-BR") : ""}
                                  </p>
                                </div>
                                <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge}`}>
                                  {decision || "—"}
                                </span>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </StatCard>
        </div>

        {/* Resumo dos Leads */}
        <div className="mb-8">
          <StatCard
            title="Resumo dos Leads"
            action={
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-gray-500">vs média 7d</span>
                <TrendPill trend={dayTrend} />
              </div>
            }
          >
            {myLeadsError ? (
              <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                {myLeadsError}
              </div>
            ) : myLeadsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="mt-2 h-7 w-10 rounded" />
                    </div>
                    <Skeleton className="h-20 w-20 rounded-full" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-11/12 rounded" />
                    <Skeleton className="h-3 w-10/12 rounded" />
                  </div>
                </div>
                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="mt-2 h-8 w-10 rounded" />
                    <Skeleton className="mt-2 h-3 w-32 rounded" />
                    <Skeleton className="mt-4 h-2 w-full rounded-full" />
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="mt-2 h-8 w-10 rounded" />
                    <Skeleton className="mt-2 h-3 w-36 rounded" />
                    <Skeleton className="mt-4 h-2 w-full rounded-full" />
                  </div>
                </div>
              </div>
            ) : activeMyLeads.length === 0 ? (
              <div className="text-sm text-gray-600">
                Nenhum lead ativo no momento. Quando você tiver leads gerados pelos imóveis que anunciar, um resumo rápido do seu dia aparece aqui.
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-4"
              >
                <button
                  type="button"
                  onClick={() => router.push("/broker/leads")}
                  className="md:col-span-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4 text-left hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Total ativo</p>
                      <p className="text-2xl font-semibold text-gray-900">{dayTotal}</p>
                      <p className="mt-1 text-xs text-gray-500">Novos + em atendimento</p>
                    </div>
                    <div className="h-20 w-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={
                              dayChartData.length > 0
                                ? dayChartData
                                : [{ name: "Ativos", value: dayTotal, color: "#94a3b8" }]
                            }
                            dataKey="value"
                            nameKey="name"
                            innerRadius={26}
                            outerRadius={36}
                            paddingAngle={3}
                            stroke="rgba(255,255,255,0.9)"
                            strokeWidth={2}
                            isAnimationActive
                          >
                            {(
                              dayChartData.length > 0
                                ? dayChartData
                                : [{ name: "Ativos", value: dayTotal, color: "#94a3b8" }]
                            ).map((entry) => (
                              <Cell key={String((entry as any).name)} fill={(entry as any).color} />
                            ))}
                          </Pie>
                          <Tooltip
                            cursor={false}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid rgba(229,231,235,1)",
                              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                            }}
                            formatter={(value: any, name: any) => [`${value}`, String(name || "")]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {dayChartData.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {dayChartData.map((row) => (
                        <span
                          key={row.key}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                          <span>
                            {row.name}: {row.value}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-gray-100 bg-white p-4 cursor-pointer"
                    onClick={() => router.push("/broker/leads")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Novos</p>
                        <p className="mt-1 text-3xl font-semibold text-gray-900 tabular-nums">{newLeads.length}</p>
                        <p className="mt-1 text-xs text-gray-500">Leads no topo do funil</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${dayTotal > 0 ? (newLeads.length / dayTotal) * 100 : 0}%` }}
                        transition={{ duration: 0.45 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: "#3b82f6" }}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-gray-100 bg-white p-4 cursor-pointer"
                    onClick={() => router.push("/broker/leads")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Leads de hoje</p>
                        <p className="mt-1 text-3xl font-semibold text-gray-900 tabular-nums">{leadsToday.length}</p>
                        <p className="mt-1 text-xs text-gray-500">Oportunidades que chegaram nas últimas horas</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                        <Plus className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${dayTotal > 0 ? (leadsToday.length / dayTotal) * 100 : 0}%` }}
                        transition={{ duration: 0.45 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: "#14b8a6" }}
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </StatCard>
        </div>

        {/* Meu funil de leads */}
        <div className="mb-8" data-onboarding="pipeline-section">
          <StatCard
            title="Meu funil de leads"
            action={
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-gray-500">vs 7d anteriores</span>
                <TrendPill trend={pipelineTrend} />
              </div>
            }
          >
            {pipelineError ? (
              <p className="text-sm text-gray-600">{pipelineError}</p>
            ) : pipelineLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="mt-2 h-7 w-12 rounded" />
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="mt-2 h-6 w-10 rounded" />
                      <Skeleton className="mt-2 h-3 w-28 rounded" />
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                      <Skeleton className="h-3 w-24 rounded" />
                      <Skeleton className="mt-2 h-6 w-10 rounded" />
                      <Skeleton className="mt-2 h-3 w-32 rounded" />
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="mt-2 h-6 w-10 rounded" />
                      <Skeleton className="mt-2 h-3 w-24 rounded" />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-8 rounded-2xl border border-gray-100 bg-white p-4">
                  <Skeleton className="h-4 w-44 rounded" />
                  <Skeleton className="mt-2 h-3 w-64 rounded" />
                  <div className="mt-6 space-y-3">
                    <Skeleton className="h-5 w-full rounded" />
                    <Skeleton className="h-5 w-11/12 rounded" />
                    <Skeleton className="h-5 w-10/12 rounded" />
                    <Skeleton className="h-5 w-9/12 rounded" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Skeleton className="h-9 w-full rounded-xl" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </div>
                </div>
              </div>
            ) : !pipelineCounts ||
              Object.values(pipelineCounts).reduce((sum, value) => sum + value, 0) === 0 ? (
              <p className="text-sm text-gray-600">
                Ainda não há leads suficientes para montar um funil completo. Assim que você começar a receber e atender leads,
                este quadro mostra em que etapa estão suas oportunidades.
              </p>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-4"
              >
                <div className="md:col-span-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4">
                  <p className="text-xs font-medium text-gray-500">Total no funil</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{pipelineTotal}</p>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                      <p className="text-xs text-gray-500">Topo do funil</p>
                      <p className="text-xl font-semibold text-gray-900 tabular-nums">{pipelineCounts.NEW + pipelineCounts.CONTACT}</p>
                      <p className="text-xs text-gray-500 mt-1">Novos e primeiro contato</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                      <p className="text-xs text-gray-500">Em negociação</p>
                      <p className="text-xl font-semibold text-gray-900 tabular-nums">{pipelineCounts.VISIT + pipelineCounts.PROPOSAL + pipelineCounts.DOCUMENTS}</p>
                      <p className="text-xs text-gray-500 mt-1">Visitas, propostas e docs</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-3">
                      <p className="text-xs text-gray-500">Resultado</p>
                      <p className="text-xl font-semibold text-gray-900 tabular-nums">{pipelineCounts.WON + pipelineCounts.LOST}</p>
                      <p className="text-xs text-gray-500 mt-1">Ganho + perdido</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-8 rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Distribuição por etapa</p>
                      <p className="text-xs text-gray-500 mt-1">Clique em uma etapa para filtrar</p>
                    </div>
                    {pipelineFilterStage ? (
                      <button
                        type="button"
                        onClick={() => setPipelineFilterStage(null)}
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                      >
                        Limpar filtro
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={pipelineChartData}
                        layout="vertical"
                        margin={{ top: 6, right: 18, bottom: 6, left: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid rgba(229,231,235,1)",
                            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                          }}
                          formatter={(value: any, name: any, props: any) => {
                            const pct = props?.payload?.pct;
                            return [`${value} (${formatPercent(pct)})`, String(name || "")];
                          }}
                        />
                        <Bar dataKey="value" radius={[10, 10, 10, 10]} isAnimationActive>
                          {pipelineChartData.map((entry) => {
                            const isDim = pipelineFilterStage ? entry.stage !== pipelineFilterStage : false;
                            const fill = isDim ? hexToRgba(entry.color, 0.22) : entry.color;
                            return (
                              <Cell
                                key={String(entry.stage)}
                                fill={fill}
                                onClick={() =>
                                  setPipelineFilterStage((prev) => (prev === entry.stage ? null : (entry.stage as PipelineStage)))
                                }
                                cursor="pointer"
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {pipelineChartData.slice(0, 8).map((row) => (
                      <button
                        key={String(row.stage)}
                        type="button"
                        onClick={() =>
                          setPipelineFilterStage((prev) => (prev === row.stage ? null : (row.stage as PipelineStage)))
                        }
                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                          pipelineFilterStage && pipelineFilterStage !== row.stage
                            ? "border-gray-100 bg-gray-50 opacity-60"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                            <span className="text-xs text-gray-600 truncate">{row.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-900 tabular-nums">{row.value}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </StatCard>
        </div>

        {/* Tarefas de hoje */}
        <div className="mb-8" data-onboarding="tasks-section">
          <StatCard title="Tarefas de hoje">
            {sortedRemindersToday.length === 0 ? (
              <p className="text-sm text-gray-600">
                Você ainda não marcou lembretes específicos para os seus leads. Quando marcar um dia e um pequeno resumo na
                ficha do lead, eles aparecem aqui para te ajudar a lembrar o que fazer.
              </p>
            ) : (
              <div className="space-y-3 text-sm text-gray-700">
                <p className="text-xs text-gray-500">
                  Estes são os lembretes que você marcou para hoje (ou dias anteriores). Use como uma listinha rápida de
                  próximos passos.
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sortedRemindersToday.map((lead) => {
                    const due = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
                    const isOverdue = due && due < today && !isSameDay(due, today);
                    const isToday = due && isSameDay(due, today);
                    const label = isOverdue ? "Atrasado" : isToday ? "Hoje" : "Próximo";

                    return (
                      <div
                        key={lead.id}
                        className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-b-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold line-clamp-1">
                            {lead.property?.title || "Lead"}
                          </p>
                          {lead.property && (
                            <p className="text-xs text-gray-500">
                              {lead.property.city} - {lead.property.state}
                            </p>
                          )}
                          {lead.nextActionNote && (
                            <p className="mt-1 text-xs text-gray-700 line-clamp-2">
                              {lead.nextActionNote}
                            </p>
                          )}
                          {due && (
                            <p className="mt-1 text-[10px] text-gray-400">
                              {label} · {due.toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/broker/leads/${lead.id}`}
                          className="text-[11px] text-blue-600 hover:text-blue-700 flex-shrink-0"
                        >
                          Ver lead
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </StatCard>
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
                <div className="text-center py-8 text-gray-500">
                  <Home className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum imóvel cadastrado ainda</p>
                  <Link
                    href="/broker/properties/new"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
                  >
                    Criar primeiro imóvel
                  </Link>
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
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>
                    {leadFilter === "NEW"
                      ? "Nenhum lead novo dos imóveis que você anunciou para esse filtro agora."
                      : leadFilter === "IN_SERVICE"
                      ? "Nenhum lead em atendimento no momento para esse filtro."
                      : "Nenhum lead encontrado para esse filtro ainda. Assim que seus anúncios começarem a gerar contatos, eles aparecem aqui."}
                  </p>
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

      {/* Onboarding Tour */}
      <BrokerOnboarding />
    </DashboardLayout>
  );
}
