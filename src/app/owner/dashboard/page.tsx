"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import Image from "next/image";

interface Metrics {
  activeProperties: number;
  totalViews: number;
  viewsLast7Days: number;
  viewTrend: {
    value: number;
    isPositive: boolean;
  };
  contactsGenerated: number;
  contactsLast7Days: number;
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

interface Contact {
  id: string;
  propertyTitle: string;
  realtorName: string;
  status: string;
  createdAt: string;
}

export default function OwnerDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [viewsByProperty, setViewsByProperty] = useState<ViewData[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: session, status } = useSession();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/owner/properties`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setMetrics(data.metrics);
        setProperties(data.properties);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setProperties([]);
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
      title={`${getGreeting()}, Maria 👋`}
      description="Veja o desempenho dos seus imóveis"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Proprietário", href: "/owner/dashboard" },
        { label: "Dashboard" },
      ]}
      actions={
        <Link
          href="/owner/new"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Anúncio
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Imóveis Ativos"
            value={metrics?.activeProperties || 0}
            icon={Home}
            subtitle="Publicados"
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />
          <MetricCard
            title="Visualizações"
            value={metrics?.totalViews || 0}
            icon={Eye}
            trend={metrics?.viewTrend}
            subtitle="Total de acessos"
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />
          <MetricCard
            title="Contatos Gerados"
            value={metrics?.contactsGenerated || 0}
            icon={Users}
            subtitle={`${metrics?.contactsLast7Days || 0} nos últimos 7 dias`}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
          <MetricCard
            title="Taxa de Conversão"
            value={
              metrics?.totalViews && metrics?.contactsGenerated
                ? `${Math.round((metrics.contactsGenerated / metrics.totalViews) * 100)}%`
                : "0%"
            }
            icon={TrendingUp}
            subtitle="Views → Contatos"
            iconColor="text-orange-600"
            iconBgColor="bg-orange-50"
          />
        </div>

        {/* Premium CTA */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6" />
                <h3 className="text-2xl font-bold">Destaque seu anúncio</h3>
              </div>
              <p className="text-blue-100 mb-4">
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
                      {...property}
                      onEdit={(id) => console.log("Edit", id)}
                      onDelete={(id) => console.log("Delete", id)}
                      onToggleStatus={(id) => console.log("Toggle", id)}
                    />
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    <Home className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium mb-2">
                      Nenhum imóvel cadastrado
                    </p>
                    <p className="text-sm mb-4">
                      Comece criando seu primeiro anúncio
                    </p>
                    <Link
                      href="/owner/new"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Criar Anúncio
                    </Link>
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
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((item.views / Math.max(...viewsByProperty.map(v => v.views))) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sem dados ainda</p>
              </div>
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
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhum contato recebido ainda</p>
              </div>
            )}
          </div>
        </StatCard>
      </div>
    </DashboardLayout>
  );
}
