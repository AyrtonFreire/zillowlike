"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Eye,
  Heart,
  Plus,
  MessageSquare,
  Edit2,
  Trash2,
  MoreVertical,
  TrendingUp,
  AlertCircle,
  Users,
  Crown,
  BarChart3,
  Calendar,
  MapPin,
  Clock,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import PropertyListItem from "@/components/dashboard/PropertyListItem";
import OwnerApprovalCard from "@/components/owner/OwnerApprovalCard";
import Image from "next/image";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

interface Metrics {
  totalProperties: number;
  activeProperties: number;
  pausedProperties: number;
  draftProperties: number;
  totalViews: number;
  totalLeads: number;
  totalFavorites: number;
  scheduledVisits: number;
  completedVisits: number;
}

interface Property {
  id: string;
  title: string;
  price: number;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  image: string;
  views: number;
  leads: number;
   scheduledVisits: number;
   completedVisits: number;
   pendingApprovals: number;
}

interface ViewData {
  name: string;
  views: number;
}

interface Contact {
  id: string;
  propertyTitle: string;
  realtorName: string;
  status: string;
  createdAt: string;
}

interface UpcomingVisit {
  id: string;
  visitDate: string;
  visitTime: string;
  property: {
    id: string;
    title: string;
    street: string;
    city: string;
    state: string;
  };
  contact: {
    name: string;
    phone: string | null;
  } | null;
}

export default function OwnerDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [viewsByProperty, setViewsByProperty] = useState<ViewData[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [upcomingVisits, setUpcomingVisits] = useState<UpcomingVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [pendingLeads, setPendingLeads] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const previewUserId = searchParams.get("previewUserId");

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUpcomingVisits();
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPendingLeads();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      setDashboardError(null);
      setLoading(true);
      const params = previewUserId ? `?userId=${previewUserId}` : "";
      const response = await fetch(`/api/owner/properties${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setMetrics(data.metrics);
        setProperties(data.properties);
      } else {
        console.error("Error fetching dashboard data (no success flag):", data);
        setMetrics(null);
        setProperties([]);
        setDashboardError("Não conseguimos carregar os dados do seu painel agora. Se quiser, atualize a página em alguns instantes.");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setMetrics(null);
      setProperties([]);
      setDashboardError("Não conseguimos carregar os dados do seu painel agora. Se quiser, atualize a página em alguns instantes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingVisits = async () => {
    try {
      setVisitsError(null);
      setVisitsLoading(true);
      const params = previewUserId ? `?userId=${previewUserId}` : "";
      const response = await fetch(`/api/owner/leads/confirmed${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const visits = Array.isArray(data) ? (data as UpcomingVisit[]) : [];
      setUpcomingVisits(visits.slice(0, 5));
    } catch (error) {
      console.error("Error fetching confirmed visits:", error);
      setUpcomingVisits([]);
      setVisitsError("Não conseguimos carregar sua agenda de visitas agora. Se quiser, tente novamente em alguns instantes.");
    } finally {
      setVisitsLoading(false);
    }
  };

  const fetchPendingLeads = async () => {
    try {
      setPendingError(null);
      setPendingLoading(true);
      const params = previewUserId ? `?userId=${previewUserId}` : "";
      const response = await fetch(`/api/owner/leads/pending${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setPendingLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching pending leads:", error);
      setPendingLeads([]);
      setPendingError("Não conseguimos carregar os horários pendentes agora. Se quiser, tente novamente em alguns instantes.");
    } finally {
      setPendingLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!deleteConfirm) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 5000); // Auto-cancel after 5s
      return;
    }

    if (deleteConfirm !== id) return;

    try {
      const response = await fetch(`/api/owner/properties/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from list
        setProperties(prev => prev.filter(p => p.id !== id));
        setDeleteConfirm(null);
      } else {
        alert("Erro ao excluir imóvel");
      }
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Erro ao excluir imóvel");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/owner/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update in list
        setProperties(prev =>
          prev.map(p => (p.id === id ? { ...p, status: newStatus as any } : p))
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const refreshAfterDecision = () => {
    // Mantém dashboard em sincronia após aprovar/recusar um horário
    fetchPendingLeads();
    fetchDashboardData();
    fetchUpcomingVisits();
  };

  const formatVisitDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Dashboard do Proprietário"
        description="Veja o desempenho dos seus imóveis"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Proprietário", href: "/owner/dashboard" },
          { label: "Dashboard" },
        ]}
      >
        <CenteredSpinner message="Carregando seu painel..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`${getGreeting()}, ${session?.user?.name ?? "Proprietário"} 👋`}
      description="Veja o desempenho dos seus imóveis"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Proprietário", href: "/owner/dashboard" },
        { label: "Dashboard" },
      ]}
      actions={
        <Link
          href="/owner/new"
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-teal-200 bg-white text-teal-700 hover:bg-teal-50 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Anúncio
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dashboardError && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {dashboardError}
          </div>
        )}
        {/* Metrics Grid - 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <MetricCard
            title="Imóveis Ativos"
            value={metrics?.activeProperties ?? 0}
            icon={Home}
            subtitle={`${metrics?.totalProperties ?? 0} no total`}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />
          <MetricCard
            title="Leads Recebidos"
            value={metrics?.totalLeads ?? 0}
            icon={Users}
            subtitle="Em todos os imóveis"
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />
          <MetricCard
            title="Visitas agendadas"
            value={metrics?.scheduledVisits ?? 0}
            icon={Eye}
            subtitle="Próximos dias"
            iconColor="text-teal-600"
            iconBgColor="bg-teal-50"
          />
          <MetricCard
            title="Visitas concluídas"
            value={metrics?.completedVisits ?? 0}
            icon={TrendingUp}
            subtitle="Histórico de visitas"
            iconColor="text-orange-600"
            iconBgColor="bg-orange-50"
          />
        </div>

        {/* Agenda de visitas & Aprovações pendentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StatCard title="Agenda de visitas">
            {visitsError ? (
              <div className="flex items-center justify-center py-6">
                <div className="text-sm text-gray-500">{visitsError}</div>
              </div>
            ) : visitsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="text-sm text-gray-500">Carregando sua agenda...</div>
              </div>
            ) : upcomingVisits.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-10 h-10 text-gray-300" />}
                title="Nenhuma visita confirmada ainda"
                description="Quando você aprovar horários, suas próximas visitas aparecem aqui, sem pressa."
              />
            ) : (
              <div className="space-y-3">
                {upcomingVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>
                          {formatVisitDate(visit.visitDate)} • {visit.visitTime}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">
                        {visit.property.title}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {visit.property.city} - {visit.property.state}
                        </span>
                      </div>
                    </div>
                    {visit.contact && (
                      <div className="ml-4 text-right text-xs text-gray-600">
                        <div className="font-medium">
                          {visit.contact.name}
                        </div>
                        {visit.contact.phone && (
                          <div className="mt-1">
                            {visit.contact.phone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </StatCard>

          <StatCard title="Aprovações pendentes">
            {pendingError ? (
              <div className="flex items-center justify-center py-6">
                <div className="text-sm text-gray-500">{pendingError}</div>
              </div>
            ) : pendingLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="text-sm text-gray-500">Carregando solicitações...</div>
              </div>
            ) : pendingLeads.length === 0 ? (
              <EmptyState
                icon={<AlertCircle className="w-10 h-10 text-gray-300" />}
                title="Nenhum horário aguardando sua decisão"
                description="Quando surgir uma nova solicitação de visita, ela aparece aqui para você revisar com calma."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>
                      {pendingLeads.length} horário
                      {pendingLeads.length > 1 ? "s" : ""} aguardando sua aprovação
                    </span>
                  </div>
                  <Link
                    href="/owner/leads/pending"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver todos
                  </Link>
                </div>

                {/* Mostra o próximo para decisão direta */}
                <OwnerApprovalCard
                  key={pendingLeads[0].id}
                  lead={pendingLeads[0]}
                  onApprove={refreshAfterDecision}
                  onReject={refreshAfterDecision}
                />

                {pendingLeads.length > 1 && (
                  <div className="text-xs text-gray-500 text-right">
                    + {pendingLeads.length - 1} solicitação
                    {pendingLeads.length - 1 > 1 ? "s" : ""} em espera na página de solicitações.
                  </div>
                )}
              </div>
            )}
          </StatCard>
        </div>

        {/* Premium CTA */}
        <div className="mb-8 glass-teal rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6" />
                <h3 className="text-2xl font-bold">Destaque seu anúncio</h3>
              </div>
              <p className="text-white/80 mb-4">
                Apareça no topo das buscas e receba até 3x mais visualizações
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">
                    ✓
                  </span>
                  Selo de "Destaque" no seu anúncio
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">
                    ✓
                  </span>
                  Prioridade na fila de corretores
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">
                    ✓
                  </span>
                  Relatórios detalhados de desempenho
                </li>
              </ul>
              <Link
                href="/owner/plans"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
              >
                Ver Planos Premium
              </Link>
            </div>
            <div className="hidden lg:block">
              <Crown className="w-32 h-32 text-white/20" />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* My Properties - Spans 2 columns */}
          <div className="lg:col-span-2">
            <StatCard
              title="Meus Imóveis"
              action={
                <Link
                  href="/owner"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver todos
                </Link>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {properties.length > 0 ? (
                  properties.map((property) => (
                    <PropertyListItem
                      key={property.id}
                      id={property.id}
                      title={property.title}
                      price={property.price}
                      image={property.image}
                      status={property.status}
                      views={property.views}
                      leads={property.leads}
                      scheduledVisits={property.scheduledVisits}
                      completedVisits={property.completedVisits}
                      pendingApprovals={property.pendingApprovals}
                      onEdit={(id: string) => console.log("Edit", id)}
                      onDelete={(id: string) => console.log("Delete", id)}
                      onToggleStatus={(id: string) => console.log("Toggle", id)}
                    />
                  ))
                ) : (
                  <div className="col-span-2 py-12">
                    <EmptyState
                      icon={<Home className="w-16 h-16 mx-auto mb-3 text-gray-300" />}
                      title="Nenhum imóvel cadastrado"
                      description="Comece criando seu primeiro anúncio para receber visitas e interessados."
                      action={
                        <Link
                          href="/owner/new"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-teal-200 bg-white text-teal-700 hover:bg-teal-50 font-medium transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          Criar Anúncio
                        </Link>
                      }
                    />
                  </div>
                )}
              </div>
            </StatCard>
          </div>

          {/* Performance Chart */}
          <StatCard title="Visualizações por Imóvel">
            {viewsByProperty.length > 0 ? (
              <div className="space-y-3">
                {viewsByProperty.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate flex-1 mr-2">
                        {item.name}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {item.views}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-teal h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((item.views / Math.max(...viewsByProperty.map(v => v.views))) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<BarChart3 className="w-12 h-12 text-gray-300" />}
                title="Sem dados ainda"
                description="Assim que seus anúncios começarem a receber visitas, você acompanha aqui o desempenho de cada imóvel."
              />
            )}
          </StatCard>
        </div>

        {/* Recent Contacts */}
        <StatCard
          title="Contatos Recentes"
          action={
            <Link
              href="/owner/contacts"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todos
            </Link>
          }
        >
          <div className="space-y-3">
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {contact.propertyTitle}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Atendido por: {contact.realtorName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">
                      {new Date(contact.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Users className="w-12 h-12 text-gray-300" />}
                title="Nenhum contato recebido ainda"
                description="Quando corretores começarem a atender interessados nos seus imóveis, os últimos contatos aparecem aqui."
              />
            )}
          </div>
        </StatCard>
      </div>
    </DashboardLayout>
  );
}
