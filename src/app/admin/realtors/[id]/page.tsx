"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  MapPin,
  Phone,
  Star,
  Clock,
  Activity,
  TrendingUp,
  Users,
  AlertTriangle,
  RefreshCw,
  Eye,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface Realtor {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  publicSlug?: string | null;
  publicHeadline?: string | null;
  publicCity?: string | null;
  publicState?: string | null;
  phone?: string | null;
  realtorCreci?: string | null;
  realtorCreciState?: string | null;
  realtorType?: string | null;
}

interface ScoreHistoryEntry {
  id: string;
  action: string;
  points: number;
  description?: string | null;
  createdAt: string;
}

interface RealtorQueueData {
  id: string;
  realtorId: string;
  position: number;
  score: number;
  status: string;
  activeLeads: number;
  bonusLeads: number;
  totalAccepted: number;
  totalRejected: number;
  totalExpired: number;
  avgResponseTime: number | null;
  lastActivity: string;
  scoreHistory?: ScoreHistoryEntry[];
}

interface RealtorStatsData {
  id: string;
  realtorId: string;
  leadsAccepted: number;
  leadsRejected: number;
  leadsExpired: number;
  leadsCompleted: number;
  visitsScheduled: number;
  visitsCompleted: number;
  avgRating: number | null;
  totalRatings: number;
  avgResponseTime: number | null;
  lastLeadAcceptedAt?: string | null;
}

interface LeadPreview {
  id: string;
  status: string;
  createdAt: string;
  respondedAt?: string | null;
  completedAt?: string | null;
  property: {
    id: string;
    title: string;
    city: string;
    state: string;
    price: number;
  };
  contact?: {
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  rating?: {
    rating: number;
  } | null;
}

interface ReportPreview {
  id: string;
  targetType: string;
  reason: string;
  severity?: string | null;
  status: string;
  description: string;
  createdAt: string;
  reportedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  property?: {
    id: string;
    title: string;
    city: string;
    state: string;
  } | null;
  lead?: {
    id: string;
    status: string;
    property?: {
      id: string;
      title: string;
      city: string;
      state: string;
    } | null;
  } | null;
}

interface RealtorOverviewResponse {
  success: boolean;
  error?: string;
  realtor: Realtor;
  queue: RealtorQueueData | null;
  stats: RealtorStatsData | null;
  leads: LeadPreview[];
  reports: ReportPreview[];
}

export default function AdminRealtorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const realtorId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [savingScore, setSavingScore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [realtor, setRealtor] = useState<Realtor | null>(null);
  const [queue, setQueue] = useState<RealtorQueueData | null>(null);
  const [stats, setStats] = useState<RealtorStatsData | null>(null);
  const [leads, setLeads] = useState<LeadPreview[]>([]);
  const [reports, setReports] = useState<ReportPreview[]>([]);

  const [scoreDraft, setScoreDraft] = useState<string>("");

  useEffect(() => {
    if (!realtorId) return;
    fetchOverview();
  }, [realtorId]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/realtors/${realtorId}`);
      const data: RealtorOverviewResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não conseguimos carregar os dados deste corretor agora.");
      }

      setRealtor(data.realtor);
      setQueue(data.queue);
      setStats(data.stats);
      setLeads(data.leads || []);
      setReports(data.reports || []);

      if (data.queue) {
        setScoreDraft(String(data.queue.score));
      }
    } catch (err: any) {
      console.error("Error fetching admin realtor overview:", err);
      setError(err?.message || "Não conseguimos carregar os dados deste corretor agora.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!queue) return;
    try {
      const newStatus = queue.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const res = await fetch("/api/admin/queue/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId: queue.id, status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error || "Erro ao atualizar status na fila");
        return;
      }
      await fetchOverview();
    } catch (err) {
      console.error("Error toggling realtor status:", err);
      alert("Erro ao atualizar status na fila");
    }
  };

  const handleSaveScore = async () => {
    if (!queue) return;
    const parsed = parseInt(scoreDraft, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      alert("Informe um score válido (número inteiro maior ou igual a zero).");
      return;
    }

    try {
      setSavingScore(true);
      const res = await fetch(`/api/admin/realtors/${realtorId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newScore: parsed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        alert(data?.error || "Erro ao salvar score do corretor");
        return;
      }
      await fetchOverview();
    } catch (err) {
      console.error("Error saving manual score:", err);
      alert("Erro ao salvar score do corretor");
    } finally {
      setSavingScore(false);
    }
  };

  const getRealtorTypeLabel = (type?: string | null) => {
    if (type === "IMOBILIARIA") return "Imobiliária";
    if (type === "AUTONOMO") return "Autônomo";
    return null;
  };

  const getReportStatusLabel = (status: string) => {
    if (status === "OPEN") return "Aberta";
    if (status === "IN_REVIEW") return "Em análise";
    if (status === "RESOLVED") return "Resolvida";
    if (status === "DISMISSED") return "Arquivada";
    return status;
  };

  const getReportTargetLabel = (targetType: string) => {
    if (targetType === "PROPERTY") return "Anúncio";
    if (targetType === "USER") return "Usuário";
    if (targetType === "LEAD") return "Atendimento";
    if (targetType === "BUG") return "Bug";
    return "Outro";
  };

  const getReportReasonLabel = (reason: string) => {
    if (reason === "FAKE_LISTING") return "Anúncio falso";
    if (reason === "INAPPROPRIATE_PHOTO") return "Foto inadequada";
    if (reason === "SCAM") return "Golpe / estelionato";
    if (reason === "BAD_BEHAVIOR") return "Má conduta";
    if (reason === "BUG") return "Bug no portal";
    return "Outro";
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Corretor"
        description="Carregando painel do corretor..."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Corretores" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando dados do corretor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !realtor) {
    return (
      <DashboardLayout
        title="Corretor"
        description="Erro ao carregar"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Corretores" },
        ]}
      >
        <div className="max-w-3xl mx-auto py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-red-800 mb-1">Não conseguimos carregar este corretor</h2>
                <p className="text-sm text-red-700 mb-4">{error || "Tente novamente em alguns instantes."}</p>
                <button
                  type="button"
                  onClick={fetchOverview}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const typeLabel = getRealtorTypeLabel(realtor.realtorType);
  const statusLabel = queue?.status === "ACTIVE" ? "Ativo na fila" : "Inativo na fila";

  return (
    <DashboardLayout
      title="Corretor"
      description={realtor.name || realtor.email || "Painel 360º do corretor"}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Corretores" },
        { label: realtor.name || "Detalhes" },
      ]}
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/queue")}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Users className="w-4 h-4" />
            Abrir controle de fila
          </button>
          <Link
            href={`/broker/dashboard?previewUserId=${realtor.id}`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            Ver como corretor
          </Link>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                {realtor.name?.charAt(0).toUpperCase() || "C"}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {realtor.name || "Corretor sem nome"}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    Corretor parceiro
                  </span>
                  {typeLabel && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {typeLabel}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  {realtor.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {realtor.email}
                    </span>
                  )}
                  {realtor.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {realtor.phone}
                    </span>
                  )}
                  {(realtor.publicCity || realtor.publicState) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {realtor.publicCity}
                        {realtor.publicCity && realtor.publicState ? " - " : ""}
                        {realtor.publicState}
                      </span>
                    </span>
                  )}
                  {realtor.realtorCreci && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <UserIcon className="w-3 h-3" />
                      CRECI {realtor.realtorCreci}
                      {realtor.realtorCreciState ? `-${realtor.realtorCreciState}` : ""}
                    </span>
                  )}
                </div>
                {realtor.publicHeadline && (
                  <p className="mt-2 text-sm text-gray-700">{realtor.publicHeadline}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-3">
              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
                    queue?.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  {statusLabel}
                </span>
                {stats && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
                    <Star className="w-3 h-3" />
                    {stats.avgRating ? stats.avgRating.toFixed(1) : "Sem avaliações"}
                    {stats.totalRatings > 0 && ` (${stats.totalRatings})`}
                  </span>
                )}
                {queue && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                    <Users className="w-3 h-3" />
                    #{queue.position} na fila · Score {queue.score}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                {queue && (
                  <button
                    type="button"
                    onClick={handleToggleActive}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      queue.status === "ACTIVE"
                        ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {queue.status === "ACTIVE" ? "Pausar corretor" : "Retomar corretor"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={fetchOverview}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  Atualizar dados
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Leads aceitos</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats?.leadsAccepted ?? queue?.totalAccepted ?? 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Total histórico de leads que este corretor levou adiante.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Leads expirados</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats?.leadsExpired ?? queue?.totalExpired ?? 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Leads que perderam o prazo enquanto estavam com este corretor.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Tempo médio de resposta</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats?.avgResponseTime ?? queue?.avgResponseTime ?? 0}min
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Estimativa baseada no histórico recente de leads.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Leads ativos na fila</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{queue?.activeLeads ?? 0}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Leads que ainda estão em andamento com este corretor.</p>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score manual + histórico */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Score na fila</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Ajuste manualmente o score apenas em casos excepcionais (ex: bônus ou penalidade específica).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={scoreDraft}
                    onChange={(e) => setScoreDraft(e.target.value)}
                    className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleSaveScore}
                    disabled={savingScore || !queue}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold glass-teal text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingScore ? "Salvando..." : "Salvar score"}
                  </button>
                </div>
              </div>

              {queue?.scoreHistory && queue.scoreHistory.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">Histórico recente de score</h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1 text-xs">
                    {queue.scoreHistory.map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between gap-2 py-1 border-b border-gray-50">
                        <div>
                          <p className="font-medium text-gray-800">
                            {entry.action}
                            {typeof entry.points === "number" && (
                              <span
                                className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  entry.points >= 0
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {entry.points >= 0 ? "+" : ""}
                                {entry.points} pts
                              </span>
                            )}
                          </p>
                          {entry.description && (
                            <p className="text-[11px] text-gray-500 mt-0.5">{entry.description}</p>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Leads recentes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Leads recentes deste corretor</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Visão rápida dos últimos atendimentos em que este corretor esteve envolvido.
                  </p>
                </div>
                <span className="text-xs text-gray-500">{leads.length} lead(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Imóvel</th>
                      <th className="px-5 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Cliente</th>
                      <th className="px-5 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-5 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Criado em</th>
                      <th className="px-5 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-xs text-gray-500">
                          Nenhum lead encontrado para este corretor.
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 align-top">
                            <div>
                              <p className="font-medium text-gray-900 line-clamp-1">{lead.property.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {lead.property.city}, {lead.property.state}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-3 align-top">
                            {lead.contact ? (
                              <div>
                                <p className="font-medium text-gray-900 text-xs">{lead.contact.name}</p>
                                <p className="text-xs text-gray-500">{lead.contact.email}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Sem contato vinculado</span>
                            )}
                          </td>
                          <td className="px-5 py-3 align-top">
                            <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                              {lead.status}
                            </span>
                            {lead.rating && (
                              <div className="mt-1 text-[11px] text-yellow-600 inline-flex items-center gap-0.5">
                                <Star className="w-3 h-3" />
                                {lead.rating.rating} estrela(s)
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 align-top text-xs text-gray-500">
                            {new Date(lead.createdAt).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-5 py-3 align-top">
                            <div className="flex flex-wrap gap-2 text-xs">
                              <Link
                                href={`/admin/leads/${lead.id}`}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              >
                                <Eye className="w-3 h-3" />
                                Ver lead
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-6">
            {/* Resumo rápido da fila */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Resumo na fila</h2>
              {queue ? (
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="text-gray-500">Posição atual:</span>{" "}
                    <span className="font-semibold">#{queue.position}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Score:</span>{" "}
                    <span className="font-semibold">{queue.score}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Leads ativos:</span>{" "}
                    <span className="font-semibold">{queue.activeLeads}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Aceitos:</span>{" "}
                    <span className="font-semibold text-emerald-700">{queue.totalAccepted}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Recusados:</span>{" "}
                    <span className="font-semibold text-red-700">{queue.totalRejected}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Expirados:</span>{" "}
                    <span className="font-semibold text-gray-700">{queue.totalExpired}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
                    Para ajustes finos de posição na fila, use a tela de controle de fila. Aqui você tem uma visão rápida do
                    contexto geral.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Este corretor ainda não está na fila inteligente de leads. Você pode ativá-lo a partir da tela de usuários ou da
                  fila.
                </p>
              )}
            </div>

            {/* Denúncias recentes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Denúncias relacionadas</h2>
                <Link
                  href="/admin/reports"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
                >
                  <Eye className="w-3 h-3" />
                  Ver todas
                </Link>
              </div>
              {reports.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Nenhuma denúncia registrada diretamente contra este corretor ou atendimentos associados.
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 text-xs">
                  {reports.map((report) => (
                    <div key={report.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-gray-900">
                          {getReportTargetLabel(report.targetType)} · {getReportReasonLabel(report.reason)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                          {getReportStatusLabel(report.status)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-700 line-clamp-2 mb-1">{report.description}</p>
                      <div className="text-[10px] text-gray-500 flex flex-wrap gap-2">
                        {report.property && (
                          <span>
                            Imóvel: {report.property.title} · {report.property.city}/{report.property.state}
                          </span>
                        )}
                        {report.lead && (
                          <span>Lead: {report.lead.id}</span>
                        )}
                        {report.reportedBy && (
                          <span>Denunciante: {report.reportedBy.name || report.reportedBy.email}</span>
                        )}
                        <span>
                          {new Date(report.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>
    </DashboardLayout>
  );
}
