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
  Users,
  Crown,
  BarChart3,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import PropertyListItem from "@/components/dashboard/PropertyListItem";
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

interface ViewData {
  name: string;
  views: number;
}

export default function OwnerDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [viewsByProperty, setViewsByProperty] = useState<ViewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const previewUserId = searchParams.get("previewUserId");

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
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
        setViewsByProperty(
          Array.isArray(data.properties)
            ? data.properties.map((p: any) => ({ name: p.title, views: Number(p.views) || 0 }))
            : []
        );
      } else {
        console.error("Error fetching dashboard data (no success flag):", data);
        setMetrics(null);
        setProperties([]);
        setViewsByProperty([]);
        setDashboardError("Não conseguimos carregar os dados do seu painel agora. Se quiser, atualize a página em alguns instantes.");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setMetrics(null);
      setProperties([]);
      setViewsByProperty([]);
      setDashboardError("Não conseguimos carregar os dados do seu painel agora. Se quiser, atualize a página em alguns instantes.");
    } finally {
      setLoading(false);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
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
          Anunciar imóvel
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
            title="Visualizações"
            value={metrics?.totalViews ?? 0}
            icon={Eye}
            subtitle="Em todos os imóveis"
            iconColor="text-teal-700"
            iconBgColor="bg-teal-50"
          />
          <MetricCard
            title="Favoritos"
            value={metrics?.totalFavorites ?? 0}
            icon={Heart}
            subtitle="Em todos os imóveis"
            iconColor="text-rose-600"
            iconBgColor="bg-rose-50"
          />
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
                      description="Comece criando seu primeiro anúncio para receber interessados."
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
                description="Assim que seus anúncios começarem a receber visualizações, você acompanha aqui o desempenho de cada imóvel."
              />
            )}
          </StatCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
