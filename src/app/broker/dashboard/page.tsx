"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home,
  TrendingUp,
  Users,
  Clock,
  Plus,
  Eye,
  DollarSign,
  Activity,
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

export default function BrokerDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // TODO: Get real userId from auth session
      const userId = "demo-realtor-id";
      
      const response = await fetch(`/api/metrics/realtor?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();

      setMetrics(data.metrics || null);
      setProperties(data.recentProperties || []);
      setLeads(data.recentLeads || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Set empty arrays to prevent undefined errors
      setProperties([]);
      setLeads([]);
    } finally {
      setLoading(false);
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
      title={`${getGreeting()}, João 👋`}
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
            <div className="space-y-3">
              {leads.length > 0 ? (
                leads.map((lead) => (
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
                  <p>Nenhum lead recebido ainda</p>
                </div>
              )}
            </div>
          </StatCard>
        </div>

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
