"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Users,
  Clock,
  MapPin,
  Smartphone,
  Monitor,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { buildPropertyPath } from "@/lib/slug";

interface PropertyAnalytics {
  id: string;
  title: string;
  metrics: {
    totalViews: number;
    uniqueVisitors: number;
    favorites: number;
    leads: number;
    conversionRate: number;
    avgTimeOnPage: number;
    bounceRate: number;
  };
  traffic: {
    direct: number;
    search: number;
    social: number;
    referral: number;
  };
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  trend: {
    viewsChange: number;
    leadsChange: number;
  };
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      fetchAnalytics();
    }
  }, [status, selectedPeriod, router]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/owner/analytics?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("pt-BR").format(num);
  };

  const formatPercent = (num: number) => {
    return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-600";
  };

  // Aggregate metrics
  const totalMetrics = properties.reduce(
    (acc, prop) => ({
      views: acc.views + prop.metrics.totalViews,
      visitors: acc.visitors + prop.metrics.uniqueVisitors,
      favorites: acc.favorites + prop.metrics.favorites,
      leads: acc.leads + prop.metrics.leads,
    }),
    { views: 0, visitors: 0, favorites: 0, leads: 0 }
  );

  const avgConversionRate =
    properties.length > 0
      ? properties.reduce((acc, p) => acc + p.metrics.conversionRate, 0) / properties.length
      : 0;

  if (loading) {
    return (
      <DashboardLayout
        title="Analytics"
        description="Métricas dos seus imóveis"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Proprietário", href: "/owner/dashboard" },
          { label: "Analytics" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Analytics"
      description="Métricas e insights dos seus imóveis"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Proprietário", href: "/owner/dashboard" },
        { label: "Analytics" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="mb-6 flex gap-2">
          {[
            { value: "7d", label: "7 dias" },
            { value: "30d", label: "30 dias" },
            { value: "90d", label: "90 dias" },
            { value: "all", label: "Todo período" },
          ].map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === period.value
                  ? "bg-teal text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Visualizações</span>
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(totalMetrics.views)}</div>
            <p className="text-sm text-gray-500 mt-1">
              {formatNumber(totalMetrics.visitors)} visitantes únicos
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Favoritos</span>
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(totalMetrics.favorites)}</div>
            <p className="text-sm text-gray-500 mt-1">
              {((totalMetrics.favorites / totalMetrics.views) * 100 || 0).toFixed(1)}% dos visitantes
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Leads</span>
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(totalMetrics.leads)}</div>
            <p className="text-sm text-gray-500 mt-1">
              Mensagens recebidas
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Conversão</span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{avgConversionRate.toFixed(1)}%</div>
            <p className="text-sm text-gray-500 mt-1">
              Visualizações → Leads
            </p>
          </div>
        </div>

        {/* Properties Analytics */}
        {properties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum dado disponível
            </h3>
            <p className="text-gray-600 mb-6">
              Publique imóveis para começar a ver analytics
            </p>
            <Link
              href="/start"
              className="inline-flex items-center gap-2 px-6 py-3 glass-teal text-white font-medium rounded-xl transition-colors"
            >
              Publicar Imóvel
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {property.title}
                    </h3>
                    <Link
                      href={buildPropertyPath(property.id, property.title)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Ver página do imóvel →
                    </Link>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600">Views</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(property.metrics.totalViews)}
                    </div>
                    {property.trend.viewsChange !== 0 && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(property.trend.viewsChange)}`}>
                        {getTrendIcon(property.trend.viewsChange)}
                        <span>{formatPercent(property.trend.viewsChange)}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600">Favoritos</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(property.metrics.favorites)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((property.metrics.favorites / property.metrics.totalViews) * 100 || 0).toFixed(1)}% taxa
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600">Leads</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(property.metrics.leads)}
                    </div>
                    {property.trend.leadsChange !== 0 && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(property.trend.leadsChange)}`}>
                        {getTrendIcon(property.trend.leadsChange)}
                        <span>{formatPercent(property.trend.leadsChange)}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600">Conversão</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {property.metrics.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Views → Leads
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Tempo médio</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatTime(property.metrics.avgTimeOnPage)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Taxa de rejeição</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {property.metrics.bounceRate.toFixed(1)}%
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Dispositivos</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Mobile: {property.devices.mobile}% • Desktop: {property.devices.desktop}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
