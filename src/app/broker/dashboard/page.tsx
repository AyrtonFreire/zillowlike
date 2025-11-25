"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Home,
  TrendingUp,
  Users,
  Clock,
  Plus,
  Eye,
  Activity,
  Crown,
} from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import PropertyListItem from "@/components/dashboard/PropertyListItem";
import LeadListItem from "@/components/dashboard/LeadListItem";
import DashboardLayout from "@/components/DashboardLayout";
import BrokerOnboarding, { resetBrokerOnboarding } from "@/components/onboarding/BrokerOnboarding";
import LeadSearchBar from "@/components/crm/LeadSearchBar";

interface Metrics {
  activeProperties: number;
  totalProperties: number;
  leadsLast7Days: number;
  leadTrend: {
    value: number;
    isPositive: boolean;
  };
  acceptanceRate: number;
  avgResponseTime: number;
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
  status: "RESERVED" | "ACCEPTED";
  createdAt: string;
  reservedUntil?: string | null;
  property?: {
    id: string;
    title: string;
    city: string;
    state: string;
  };
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
  const [partnerStatus, setPartnerStatus] = useState<
    "NONE" | "PENDING" | "APPROVED" | "REJECTED"
  >("NONE");
  const [partnerStatusLoading, setPartnerStatusLoading] = useState(true);

  const searchParams = useSearchParams();
  const previewUserId = searchParams.get("previewUserId");

  const [pipelineCounts, setPipelineCounts] = useState<Record<PipelineStage, number> | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [teamSummary, setTeamSummary] = useState<{
    id: string;
    name: string;
    activeLeads: number;
  } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchMyLeads();
  }, []);

  useEffect(() => {
    fetchPartnerStatus();
  }, []);

  useEffect(() => {
    fetchPipelineSummary();
  }, []);

  useEffect(() => {
    fetchTeamsPreview();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // TODO: Get real userId from auth session
      const userId = previewUserId || "demo-realtor-id";
      
      setDashboardError(null);
      setLoading(true);
      const response = await fetch(`/api/metrics/realtor?userId=${userId}`);
      
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
      const response = await fetch("/api/leads/my-leads");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `API error: ${response.status}`);
      }

      setMyLeads(Array.isArray(data) ? data : []);
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

      (Array.isArray(data) ? data : []).forEach((lead: any) => {
        const stage = (lead.pipelineStage || "NEW") as PipelineStage;
        if (initial[stage] !== undefined) {
          initial[stage] += 1;
        }
      });

      setPipelineCounts(initial);
    } catch (error) {
      console.error("Error fetching pipeline summary:", error);
      setPipelineCounts(null);
      setPipelineError(
        "Não conseguimos carregar o resumo do seu funil agora. Se quiser, atualize a página em alguns instantes."
      );
    } finally {
      setPipelineLoading(false);
    }
  };

  const fetchPartnerStatus = async () => {
    try {
      setPartnerStatusLoading(true);
      const response = await fetch("/api/realtor/status");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const applicationStatus = data?.partner?.applicationStatus as
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | null;
      const hasQueueEntry = Boolean(data?.partner?.hasQueueEntry);

      let status: "NONE" | "PENDING" | "APPROVED" | "REJECTED" = "NONE";

      if (applicationStatus === "APPROVED" || hasQueueEntry) {
        status = "APPROVED";
      } else if (applicationStatus === "PENDING") {
        status = "PENDING";
      } else if (applicationStatus === "REJECTED") {
        status = "REJECTED";
      }

      setPartnerStatus(status);
    } catch (error) {
      console.error("Error fetching realtor partner status:", error);
      setPartnerStatus("NONE");
    } finally {
      setPartnerStatusLoading(false);
    }
  };

  const fetchTeamsPreview = async () => {
    try {
      const response = await fetch("/api/teams");
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `API error: ${response.status}`);
      }

      const teams = Array.isArray(data.teams) ? data.teams : [];
      if (teams.length === 0) {
        setTeamSummary(null);
        return;
      }

      const firstTeam = teams[0];
      const pipelineResponse = await fetch(`/api/teams/${firstTeam.id}/pipeline`);
      const pipelineData = await pipelineResponse.json();

      if (!pipelineResponse.ok || !pipelineData?.success) {
        throw new Error(pipelineData?.error || `API error: ${pipelineResponse.status}`);
      }

      const leads = Array.isArray(pipelineData.leads) ? pipelineData.leads : [];
      const activeLeads = leads.filter(
        (lead: any) => lead.pipelineStage !== "WON" && lead.pipelineStage !== "LOST"
      ).length;

      setTeamSummary({
        id: String(firstTeam.id),
        name: firstTeam.name || "Time",
        activeLeads,
      });
    } catch (error) {
      console.error("Error fetching teams for dashboard:", error);
      setTeamSummary(null);
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
  const newLeads = myLeads.filter((lead) => lead.status === "RESERVED");
  const inServiceLeads = myLeads.filter((lead) => lead.status === "ACCEPTED");
  const leadsToday = myLeads.filter((lead) =>
    isSameDay(new Date(lead.createdAt), today)
  );

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

  const showPartnerCta = !partnerStatusLoading && partnerStatus !== "APPROVED";

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
      title={`${getGreeting()}, ${session?.user?.name ?? "Corretor"} 👋`}
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
            title="Taxa de Aceitação"
            value={`${metrics?.acceptanceRate || 0}%`}
            icon={TrendingUp}
            subtitle="De todos os leads"
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
          <MetricCard
            title="Tempo de Resposta"
            value={`${metrics?.avgResponseTime || 0}min`}
            icon={Clock}
            subtitle="Média de resposta"
            iconColor="text-orange-600"
            iconBgColor="bg-orange-50"
          />
        </div>

        {/* Meu dia hoje */}
        <div className="mb-8">
          <StatCard title="Meu dia hoje">
            {myLeadsError ? (
              <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                {myLeadsError}
              </div>
            ) : myLeadsLoading ? (
              <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                Carregando seus leads ativos...
              </div>
            ) : myLeads.length === 0 ? (
              <div className="text-sm text-gray-600">
                {partnerStatus === "APPROVED"
                  ? "Nenhum lead ativo no momento. Assim que novos leads da plataforma ou dos seus anúncios chegarem, um resumo rápido do seu dia aparece aqui."
                  : "Nenhum lead ativo no momento. Quando você tiver leads gerados pelos imóveis que anunciar, um resumo rápido do seu dia aparece aqui."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Novos</p>
                  <p className="text-2xl font-semibold text-gray-900">{newLeads.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Leads reservados esperando sua decisão.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Em atendimento</p>
                  <p className="text-2xl font-semibold text-gray-900">{inServiceLeads.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Leads que você já aceitou e está conduzindo.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Leads de hoje</p>
                  <p className="text-2xl font-semibold text-gray-900">{leadsToday.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Novas oportunidades que chegaram nas últimas horas.
                  </p>
                </div>
              </div>
            )}
          </StatCard>
        </div>

        {/* Meu funil de leads */}
        <div className="mb-8" data-onboarding="pipeline-section">
          <StatCard title="Meu funil de leads">
            {pipelineError ? (
              <p className="text-sm text-gray-600">{pipelineError}</p>
            ) : pipelineLoading ? (
              <p className="text-sm text-gray-600">Carregando resumo do funil...</p>
            ) : !pipelineCounts ||
              Object.values(pipelineCounts).reduce((sum, value) => sum + value, 0) === 0 ? (
              <p className="text-sm text-gray-600">
                Ainda não há leads suficientes para montar um funil completo. Assim que você começar a receber e atender leads,
                este quadro mostra em que etapa estão suas oportunidades.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Topo do funil</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {pipelineCounts.NEW + pipelineCounts.CONTACT}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Leads novos ou em primeiro contato.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Em negociação</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {pipelineCounts.VISIT + pipelineCounts.PROPOSAL + pipelineCounts.DOCUMENTS}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Visitas, propostas e documentação em andamento.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Resultado</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {pipelineCounts.WON + pipelineCounts.LOST}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Negócios fechados ou marcados como perdidos.
                  </p>
                </div>
              </div>
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

        {/* Quadro simples de leads em andamento */}
        {myLeads.length > 0 && (
          <div className="mb-8">
            <StatCard title="Meus leads em andamento">
              <p className="text-xs text-gray-500 mb-4">
                Aqui você vê, em blocos, os leads que ainda precisam de decisão e os que você já está atendendo. Para ver os
                detalhes completos ou registrar notas, use a página Meus Leads.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coluna: precisam de decisão */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Precisam de decisão
                    </p>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800">
                      {newLeads.length}
                    </span>
                  </div>
                  {newLeads.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Nenhum lead reservado aguardando sua decisão neste momento.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {newLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800"
                        >
                          <p className="font-semibold line-clamp-1">
                            {lead.property?.title || "Imóvel deste lead"}
                          </p>
                          {lead.property && (
                            <p className="text-[11px] text-gray-500">
                              {lead.property.city} - {lead.property.state}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-gray-500">
                            Recebido em {new Date(lead.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Coluna: em atendimento */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Em atendimento
                    </p>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      {inServiceLeads.length}
                    </span>
                  </div>
                  {inServiceLeads.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Assim que você aceitar um lead, ele aparece aqui como "Em atendimento".
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {inServiceLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800"
                        >
                          <p className="font-semibold line-clamp-1">
                            {lead.property?.title || "Imóvel deste lead"}
                          </p>
                          {lead.property && (
                            <p className="text-[11px] text-gray-500">
                              {lead.property.city} - {lead.property.state}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-gray-500">
                            Em atendimento desde {new Date(lead.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Link
                  href="/broker/leads"
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                >
                  Abrir página completa de Meus Leads
                </Link>
              </div>
            </StatCard>
          </div>
        )}

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
                    {partnerStatus === "APPROVED"
                      ? leadFilter === "NEW"
                        ? "Nenhum lead novo da plataforma ou dos seus anúncios para esse filtro agora."
                        : leadFilter === "IN_SERVICE"
                        ? "Nenhum lead em atendimento no momento para esse filtro."
                        : "Nenhum lead da plataforma ou dos seus anúncios encontrado para esse filtro."
                      : leadFilter === "NEW"
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

        {showPartnerCta && (
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-teal-dark via-teal to-accent text-white shadow-lg p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold uppercase tracking-[0.16em] mb-3">
                <Crown className="w-4 h-4" />
                <span>
                  {partnerStatus === "PENDING"
                    ? "Aplicação em análise"
                    : partnerStatus === "REJECTED"
                    ? "Aplicação não aprovada"
                    : "Programa de corretores parceiros"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                {partnerStatus === "PENDING"
                  ? "Estamos revisando seu cadastro para o programa de parceiros"
                  : partnerStatus === "REJECTED"
                  ? "Sua aplicação para o programa de parceiros foi analisada"
                  : "Quer aparecer na fila inteligente de leads do ZillowLike?"}
              </h2>
              <p className="text-sm sm:text-base text-white/85 max-w-xl">
                {partnerStatus === "PENDING" ? (
                  "Obrigado por se candidatar! Estamos validando seus dados profissionais e em breve você poderá começar a receber leads da fila inteligente, direto aqui no seu painel."
                ) : partnerStatus === "REJECTED" ? (
                  "Sua aplicação para o programa de corretores parceiros não foi aprovada neste momento. Se você tiver dúvidas sobre essa decisão, entre em contato com o suporte da plataforma."
                ) : (
                  <>
                    Para se tornar <span className="font-semibold">corretor parceiro</span>, envie fotos dos seus documentos para análise e o site irá te conectar com interessados em imóveis publicados por pessoas físicas, com distribuição justa e acompanhamento organizado direto no seu painel.
                  </>
                )}
              </p>
            </div>
            {partnerStatus === "REJECTED" ? (
              <div className="w-full md:w-auto flex flex-col items-stretch gap-2">
                <p className="text-[11px] text-white/80 md:text-right">
                  Se você tiver dúvidas, envie uma mensagem pelos canais de contato do ZillowLike.
                </p>
              </div>
            ) : (
              <div className="w-full md:w-auto flex flex-col items-stretch gap-2">
                <Link
                  href="/become-realtor"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold bg-white text-teal-dark shadow-md hover:shadow-lg hover:bg-teal-50 transition-all"
                >
                  <span>
                    {partnerStatus === "PENDING"
                      ? "Acompanhar status da aplicação"
                      : "Conhecer programa de parceria"}
                  </span>
                </Link>
                <p className="text-[11px] text-white/80 md:text-right">
                  {partnerStatus === "PENDING"
                    ? "Avisaremos por e-mail assim que sua análise for concluída."
                    : "Cadastro gratuito, sujeito à validação dos seus dados profissionais."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link
            href="/broker/properties"
            className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                <Eye className="w-6 h-6 text-blue-600" />
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
                <p className="text-sm text-gray-600">Ver e acompanhar todos os seus leads</p>
              </div>
            </div>
          </Link>

          <Link
            href="/broker/crm"
            className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Funil de Leads</h3>
                <p className="text-sm text-gray-600">Ver etapas da negociação</p>
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

          {teamSummary && (
            <Link
              href={`/broker/teams/${teamSummary.id}/crm`}
              className="p-6 bg-white rounded-2xl border border-teal-200 hover:border-teal-300 hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 rounded-xl group-hover:bg-teal-100 transition-colors">
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Seu time</h3>
                  <p className="text-sm text-gray-600">
                    {teamSummary.activeLeads === 0
                      ? "Seu time está sem leads em andamento no momento."
                      : `Seu time: ${teamSummary.activeLeads} ${
                          teamSummary.activeLeads === 1 ? "lead em andamento" : "leads em andamento"
                        }`}
                  </p>
                </div>
              </div>
            </Link>
          )}
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
