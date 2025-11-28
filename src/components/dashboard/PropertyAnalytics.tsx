"use client";

import {
  Eye,
  Users,
  Heart,
  TrendingUp,
  Globe,
  MessageSquare,
  Calendar,
  MousePointerClick,
  Phone,
  Mail,
} from "lucide-react";

interface AnalyticsData {
  views: {
    total: number;
    last7Days: number;
    trend: number; // percentage
  };
  leads: {
    total: number;
    last7Days: number;
    trend: number;
  };
  favorites: {
    total: number;
    last7Days: number;
  };
  sources?: {
    website: number;
    olx: number;
    google: number;
    direct: number;
  };
  conversionRate?: number; // leads / views * 100
  avgResponseTime?: string;
  contactMethods?: {
    whatsapp: number;
    phone: number;
    email: number;
  };
}

interface PropertyAnalyticsProps {
  data: AnalyticsData;
}

export default function PropertyAnalytics({ data }: PropertyAnalyticsProps) {
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
    if (trend < 0) return <TrendingUp className="w-3.5 h-3.5 text-red-600 rotate-180" />;
    return null;
  };

  const getTrendText = (trend: number) => {
    if (trend === 0) return "sem mudança";
    const prefix = trend > 0 ? "+" : "";
    return `${prefix}${trend}% vs. semana anterior`;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">📊 Desempenho do anúncio</h2>
        <p className="text-sm text-gray-600">
          Acompanhe como seu imóvel está performando nos últimos 7 dias
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Views */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            {data.views.trend !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                data.views.trend > 0 ? "text-green-600" : "text-red-600"
              }`}>
                {getTrendIcon(data.views.trend)}
                <span>{Math.abs(data.views.trend)}%</span>
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {data.views.total.toLocaleString()}
          </div>
          <p className="text-sm text-gray-600 mb-2">Visualizações totais</p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{data.views.last7Days}</span> últimos 7 dias
          </p>
        </div>

        {/* Leads */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            {data.leads.trend !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                data.leads.trend > 0 ? "text-green-600" : "text-red-600"
              }`}>
                {getTrendIcon(data.leads.trend)}
                <span>{Math.abs(data.leads.trend)}%</span>
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {data.leads.total}
          </div>
          <p className="text-sm text-gray-600 mb-2">Pedidos de contato</p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{data.leads.last7Days}</span> últimos 7 dias
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {data.conversionRate?.toFixed(1) || "0.0"}%
          </div>
          <p className="text-sm text-gray-600 mb-2">Taxa de conversão</p>
          <p className="text-xs text-gray-500">
            Leads gerados por visualização
          </p>
        </div>
      </div>

      {/* Traffic Sources */}
      {data.sources && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-600" />
            Origem das visitas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {data.sources.website}
              </div>
              <p className="text-xs text-gray-600">Seu site</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {data.sources.olx}
              </div>
              <p className="text-xs text-gray-600">Portais (OLX, etc)</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {data.sources.google}
              </div>
              <p className="text-xs text-gray-600">Google</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {data.sources.direct}
              </div>
              <p className="text-xs text-gray-600">Link direto</p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Methods */}
      {data.contactMethods && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            Métodos de contato preferidos
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {data.contactMethods.whatsapp}
              </div>
              <p className="text-xs text-gray-600">WhatsApp</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <Phone className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {data.contactMethods.phone}
              </div>
              <p className="text-xs text-gray-600">Telefone</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <Mail className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {data.contactMethods.email}
              </div>
              <p className="text-xs text-gray-600">E-mail</p>
            </div>
          </div>
        </div>
      )}

      {/* Response Time */}
      {data.avgResponseTime && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-100 rounded-xl">
              <Calendar className="w-6 h-6 text-teal-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Tempo médio de resposta: <span className="text-teal-600">{data.avgResponseTime}</span>
              </h3>
              <p className="text-sm text-gray-600">
                Responder rapidamente aumenta as chances de fechar negócio
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
