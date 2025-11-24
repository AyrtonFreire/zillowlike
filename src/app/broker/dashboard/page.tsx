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
  DollarSign,
  Activity,
  Crown,
} from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import PropertyListItem from "@/components/dashboard/PropertyListItem";
import LeadListItem from "@/components/dashboard/LeadListItem";
import DashboardLayout from "@/components/DashboardLayout";

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
}

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchMyLeads();
  }, []);

  useEffect(() => {
    fetchPartnerStatus();
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
      const realtorId = previewUserId || "demo-realtor-id"; // TODO: pegar do session
      const response = await fetch(`/api/leads/my-leads?realtorId=${realtorId}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setMyLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching my leads:", error);
      setMyLeads([]);
      setMyLeadsError("Não conseguimos carregar seus leads ativos agora. Se quiser, tente novamente em alguns instantes.");
    } finally {
      setMyLeadsLoading(false);
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
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <p>Nenhum lead encontrado para esse filtro</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <h3 className="font-semibold text-gray-900">Gerenciar Leads</h3>
                <p className="text-sm text-gray-600">Acompanhar contatos</p>
              </div>
            </div>
          </Link>

          <Link
            href="/broker/credits"
            className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Créditos</h3>
                <p className="text-sm text-gray-600">Gerenciar saldo</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
