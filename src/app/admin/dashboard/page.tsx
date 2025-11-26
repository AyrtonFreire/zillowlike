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
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [source, setSource] = useState<"all" | "board" | "direct">("all");

  useEffect(() => {
    fetchMetrics(true, days, source);
    // Auto-refresh a cada 1 minuto
    const interval = setInterval(() => fetchMetrics(false, days, source), 60000);
    return () => clearInterval(interval);
  }, [days, source]);

  const fetchMetrics = async (
    isInitial = false,
    customDays: 7 | 30 | 90 = days,
    customSource: "all" | "board" | "direct" = source,
  ) => {
    try {
      if (isInitial) setLoading(true);
      const params = new URLSearchParams();
      params.set("t", String(Date.now()));
      params.set("days", String(customDays));
      params.set("source", customSource);
      const url = `/api/admin/metrics?${params.toString()}`;
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
              <p className="text-gray-600 mt-1">Visão geral do sistema de fila</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Período:</span>
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d as 7 | 30 | 90)}
                      className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                        days === d
                          ? "bg-teal-50 border-teal-300 text-teal-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Origem:</span>
                  {[
                    { value: "all", label: "Todos" },
                    { value: "board", label: "Fila / mural" },
                    { value: "direct", label: "Diretos" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSource(opt.value as "all" | "board" | "direct")}
                      className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                        source === opt.value
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setRefreshing(true);
                    fetchMetrics(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-teal-200 bg-white text-teal-700 hover:bg-teal-50 transition-colors text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Atualizando..." : "Atualizar"}
                </button>
                <a
                  href={`/api/admin/leads/export?days=${days}&source=${source}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <path d="M4 4h16v4" />
                    <path d="M9 12l3 3 3-3" />
                    <path d="M12 3v12" />
                    <path d="M4 20h16" />
                  </svg>
                  Exportar CSV
                </a>
              </div>
            </div>
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
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-gray-900">{overview.conversionRate}%</p>
              </div>
              <div className="p-3 bg-teal-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-teal-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Leads aceitos vs total</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Taxa de Resposta</p>
                <p className="text-3xl font-bold text-gray-900">{overview.responseRate}%</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Leads respondidos</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Leads Disponíveis</p>
                <p className="text-3xl font-bold text-gray-900">{overview.availableLeads}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">No mural agora</p>
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
