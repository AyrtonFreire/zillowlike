"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Home,
  MessageSquare,
  TrendingUp,
  Activity,
  DollarSign,
  UserCheck,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

interface DashboardStats {
  users: {
    total: number;
    realtors: number;
    owners: number;
    newThisMonth: number;
    growth: number;
  };
  properties: {
    total: number;
    active: number;
    pending: number;
    sold: number;
    avgPrice: number;
  };
  leads: {
    total: number;
    open: number;
    accepted: number;
    rejected: number;
    conversionRate: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    growth: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/dashboard-stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Painel Administrativo"
        description="Visão geral e gerenciamento do sistema"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Painel Administrativo"
      description="Visão geral e gerenciamento do sistema"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Admin" },
      ]}
      actions={
        <>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Gerenciar Usuários
          </Link>
          <Link
            href="/admin/properties"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Gerenciar Imóveis
          </Link>
        </>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              {stats && stats.users.growth > 0 && (
                <span className="flex items-center text-sm text-green-600 font-medium">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  {stats.users.growth}%
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats?.users.total || 0}
            </h3>
            <p className="text-gray-600 text-sm mt-1">Total de Usuários</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Corretores:</span>
                <span className="font-semibold">{stats?.users.realtors || 0}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Proprietários:</span>
                <span className="font-semibold">{stats?.users.owners || 0}</span>
              </div>
            </div>
          </div>

          {/* Total Properties */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Home className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats?.properties.total || 0}
            </h3>
            <p className="text-gray-600 text-sm mt-1">Total de Imóveis</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ativos:</span>
                <span className="font-semibold text-green-600">
                  {stats?.properties.active || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Pendentes:</span>
                <span className="font-semibold text-yellow-600">
                  {stats?.properties.pending || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Total Leads */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats?.leads.total || 0}
            </h3>
            <p className="text-gray-600 text-sm mt-1">Total de Leads</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxa de Conversão:</span>
                <span className="font-semibold text-purple-600">
                  {stats?.leads.conversionRate || 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Aceitos:</span>
                <span className="font-semibold">
                  {stats?.leads.accepted || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              {stats && stats.revenue.growth > 0 && (
                <span className="flex items-center text-sm text-green-600 font-medium">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  {stats.revenue.growth}%
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              R$ {((stats?.revenue.total || 0) / 100).toLocaleString("pt-BR")}
            </h3>
            <p className="text-gray-600 text-sm mt-1">Valor Total em Imóveis</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Preço Médio:</span>
                <span className="font-semibold">
                  R${" "}
                  {((stats?.properties.avgPrice || 0) / 100).toLocaleString(
                    "pt-BR"
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/users"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Gerenciar Usuários
                </h3>
                <p className="text-sm text-gray-600">
                  Promover roles, banir usuários
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/properties"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Gerenciar Imóveis
                </h3>
                <p className="text-sm text-gray-600">
                  Aprovar, editar, remover imóveis
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/logs"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Logs do Sistema</h3>
                <p className="text-sm text-gray-600">
                  Auditoria e monitoramento
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
              Atividade Recente
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Novo imóvel cadastrado
                  </p>
                  <p className="text-xs text-gray-600">Casa em Petrolina - PE</p>
                </div>
                <span className="text-xs text-gray-500">Há 5 min</span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Novo usuário registrado
                  </p>
                  <p className="text-xs text-gray-600">Corretor de imóveis</p>
                </div>
                <span className="text-xs text-gray-500">Há 12 min</span>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Lead aguardando aprovação
                  </p>
                  <p className="text-xs text-gray-600">
                    Apartamento em Juazeiro - BA
                  </p>
                </div>
                <span className="text-xs text-gray-500">Há 1 hora</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
