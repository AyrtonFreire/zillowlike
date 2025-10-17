"use client";

import { useEffect, useState } from "react";
import { Users, Activity, TrendingUp, Clock, Star, RefreshCw, Award } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AdminMetrics {
  overview: {
    totalRealtors: number;
    activeRealtors: number;
    totalLeads: number;
    availableLeads: number;
    acceptedLeads: number;
    expiredLeads: number;
    avgResponseTime: number;
    avgRating: number;
    conversionRate: number;
    responseRate: number;
  };
  topRealtors: Array<{
    id: string;
    name: string;
    email: string;
    score: number;
    position: number;
    activeLeads: number;
    totalAccepted: number;
    avgResponseTime: number | null;
  }>;
  leadsByStatus: Array<{
    status: string;
    count: number;
  }>;
  leadsByDay: Array<{
    date: string;
    count: number;
  }>;
}

const COLORS = {
  PENDING: "#F59E0B",
  AVAILABLE: "#10B981",
  RESERVED: "#F97316",
  ACCEPTED: "#3B82F6",
  REJECTED: "#EF4444",
  EXPIRED: "#6B7280",
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics(true);
    // Auto-refresh a cada 1 minuto
    const interval = setInterval(() => fetchMetrics(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const url = `/api/admin/metrics?t=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Erro ao carregar métricas</p>
      </div>
    );
  }

  const { overview, topRealtors, leadsByStatus, leadsByDay } = metrics;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
              <p className="text-gray-600 mt-1">Visão geral do sistema de fila</p>
            </div>
            <button
              onClick={() => {
                setRefreshing(true);
                fetchMetrics(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Corretores Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.activeRealtors}/{overview.totalRealtors}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Leads Totais</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalLeads}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Tempo Médio</p>
                <p className="text-2xl font-bold text-gray-900">{overview.avgResponseTime}min</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Avaliação Média</p>
                <p className="text-2xl font-bold text-gray-900">{overview.avgRating.toFixed(1)} ⭐</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <p className="text-blue-100 text-sm mb-2">Taxa de Conversão</p>
            <p className="text-4xl font-bold mb-2">{overview.conversionRate}%</p>
            <p className="text-blue-100 text-sm">Leads aceitos vs total</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
            <p className="text-green-100 text-sm mb-2">Taxa de Resposta</p>
            <p className="text-4xl font-bold mb-2">{overview.responseRate}%</p>
            <p className="text-green-100 text-sm">Leads respondidos</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white">
            <p className="text-purple-100 text-sm mb-2">Leads Disponíveis</p>
            <p className="text-4xl font-bold mb-2">{overview.availableLeads}</p>
            <p className="text-purple-100 text-sm">No mural agora</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leads por Status */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Leads por Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadsByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.status}: ${entry.count}`}
                >
                  {leadsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS] || "#6B7280"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Leads por Dia */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Leads Criados (Últimos 30 dias)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadsByDay.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString("pt-BR")}
                />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Corretores */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Top 10 Corretores</h3>
            <Award className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Posição</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Score</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Leads Ativos</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Aceitos</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tempo Médio</th>
                </tr>
              </thead>
              <tbody>
                {topRealtors.map((realtor, index) => (
                  <tr key={realtor.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <span className="text-2xl">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </span>
                        )}
                        <span className="font-semibold text-gray-900">#{realtor.position}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{realtor.name}</p>
                        <p className="text-sm text-gray-500">{realtor.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                        {realtor.score} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{realtor.activeLeads}</td>
                    <td className="py-3 px-4 text-gray-900">{realtor.totalAccepted}</td>
                    <td className="py-3 px-4 text-gray-900">
                      {realtor.avgResponseTime ? `${realtor.avgResponseTime}min` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
