"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AlertTriangle,
  Bug,
  FileWarning,
  Flag,
  Home,
  MessageCircle,
  Search,
  Filter,
  Eye,
  Loader2,
} from "lucide-react";

type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
type ReportTargetType = "PROPERTY" | "USER" | "LEAD" | "BUG" | "OTHER";
type ReportSeverity = "LOW" | "MEDIUM" | "HIGH" | null;

interface ReportUser {
  id: string;
  name: string | null;
  email: string | null;
  role?: string;
}

interface ReportProperty {
  id: string;
  title: string;
  city: string;
  state: string;
}

interface ReportLead {
  id: string;
  status: string;
  property?: ReportProperty | null;
}

interface Report {
  id: string;
  targetType: ReportTargetType;
  reason: string;
  status: ReportStatus;
  severity: ReportSeverity;
  description: string;
  createdAt: string;
  updatedAt: string;
  reportedBy: ReportUser | null;
  targetUser: ReportUser | null;
  property: ReportProperty | null;
  lead: ReportLead | null;
}

interface ReportStats {
  total: number;
  open: number;
  inReview: number;
  resolved: number;
  dismissed: number;
}

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReportStatus>("OPEN");
  const [typeFilter, setTypeFilter] = useState<"ALL" | ReportTargetType>("ALL");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const role = (session as any)?.user?.role;
    if (status === "authenticated" && role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("targetType", typeFilter);

      const query = params.toString();
      const res = await fetch(`/api/admin/reports${query ? `?${query}` : ""}`);

      if (!res.ok) {
        throw new Error("http-error");
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error("api-error");
      }

      setReports(data.reports || []);
      setStats(data.stats || null);
    } catch (e) {
      setError("Não conseguimos carregar as denúncias agora. Se quiser, tente novamente em alguns instantes.");
      setReports([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchReports();
    }
  }, [status, statusFilter, typeFilter]);

  const filteredReports = reports.filter((report) => {
    if (search) {
      const term = search.toLowerCase();
      const parts = [
        report.description,
        report.reason,
        report.reportedBy?.name || "",
        report.reportedBy?.email || "",
        report.targetUser?.name || "",
        report.targetUser?.email || "",
        report.property?.title || "",
        report.property?.city || "",
        report.property?.state || "",
        report.lead?.property?.title || "",
      ];
      if (!parts.some((p) => p.toLowerCase().includes(term))) return false;
    }
    return true;
  });

  const getStatusLabel = (status: ReportStatus) => {
    if (status === "OPEN") return "Aberta";
    if (status === "IN_REVIEW") return "Em análise";
    if (status === "RESOLVED") return "Resolvida";
    return "Arquivada";
  };

  const getStatusClass = (status: ReportStatus) => {
    if (status === "OPEN") return "bg-red-50 text-red-700";
    if (status === "IN_REVIEW") return "bg-yellow-50 text-yellow-700";
    if (status === "RESOLVED") return "bg-green-50 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  const getTargetLabel = (targetType: ReportTargetType) => {
    if (targetType === "PROPERTY") return "Anúncio";
    if (targetType === "USER") return "Usuário";
    if (targetType === "LEAD") return "Atendimento";
    if (targetType === "BUG") return "Bug";
    return "Outro";
  };

  const getReasonLabel = (reason: string) => {
    if (reason === "FAKE_LISTING") return "Anúncio falso";
    if (reason === "INAPPROPRIATE_PHOTO") return "Foto inadequada";
    if (reason === "SCAM") return "Golpe / estelionato";
    if (reason === "BAD_BEHAVIOR") return "Má conduta";
    if (reason === "BUG") return "Bug no portal";
    return "Outro";
  };

  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("http-error");
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error("api-error");
      }

      const updated: Report = data.report;
      setReports((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setSelectedReport((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    } catch (e) {
      alert("Não conseguimos atualizar o status desta denúncia agora.");
    } finally {
      setUpdating(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Denúncias"
        description="Carregando denúncias..."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Denúncias" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Denúncias"
      description="Veja e gerencie denúncias de anúncios, usuários e bugs"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Denúncias" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Flag className="w-8 h-8 text-teal-600" />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Abertas</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.open}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Em análise</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.inReview}</p>
              </div>
              <FileWarning className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolvidas</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolved}</p>
              </div>
              <Home className="w-8 h-8 text-green-600" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex-1 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por anúncio, usuário, motivo ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Status:</span>
              </div>
              {["ALL", "OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "glass-teal text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {s === "ALL"
                    ? "Todas"
                    : s === "OPEN"
                    ? "Abertas"
                    : s === "IN_REVIEW"
                    ? "Em análise"
                    : s === "RESOLVED"
                    ? "Resolvidas"
                    : "Arquivadas"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Tipo:</span>
              {["ALL", "PROPERTY", "USER", "LEAD", "BUG", "OTHER"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    typeFilter === t
                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t === "ALL"
                    ? "Todos"
                    : t === "PROPERTY"
                    ? "Anúncios"
                    : t === "USER"
                    ? "Usuários"
                    : t === "LEAD"
                    ? "Atendimentos"
                    : t === "BUG"
                    ? "Bugs"
                    : "Outros"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lista de denúncias</h2>
              <p className="text-sm text-gray-600 mt-1">{filteredReports.length} denúncias encontradas</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredReports.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-gray-500">
                Nenhuma denúncia encontrada para esses filtros.
              </div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                      {report.targetType === "PROPERTY" && <Home className="w-5 h-5" />}
                      {report.targetType === "USER" && <AlertTriangle className="w-5 h-5" />}
                      {report.targetType === "LEAD" && <MessageCircle className="w-5 h-5" />}
                      {report.targetType === "BUG" && <Bug className="w-5 h-5" />}
                      {report.targetType === "OTHER" && <Flag className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {getTargetLabel(report.targetType)} · {getReasonLabel(report.reason)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(report.status)}`}>
                          {getStatusLabel(report.status)}
                        </span>
                        {report.severity && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              report.severity === "HIGH"
                                ? "bg-red-100 text-red-700"
                                : report.severity === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {report.severity === "HIGH"
                              ? "Alta prioridade"
                              : report.severity === "MEDIUM"
                              ? "Média prioridade"
                              : "Baixa prioridade"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-1 line-clamp-2">{report.description}</p>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                        {report.property && (
                          <span>
                            Anúncio: {report.property.title} · {report.property.city}/{report.property.state}
                          </span>
                        )}
                        {report.targetUser && (
                          <span>
                            Usuário: {report.targetUser.name || report.targetUser.email} ({report.targetUser.role})
                          </span>
                        )}
                        {report.reportedBy && (
                          <span>
                            Denunciante: {report.reportedBy.name || report.reportedBy.email}
                          </span>
                        )}
                        <span>
                          Criada em {new Date(report.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                      Ver detalhes
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedReport && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {getTargetLabel(selectedReport.targetType)} · {getReasonLabel(selectedReport.reason)}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(selectedReport.status)}`}>
                      {getStatusLabel(selectedReport.status)}
                    </span>
                    <span>
                      Criada em {new Date(selectedReport.createdAt).toLocaleString("pt-BR")}
                    </span>
                    {selectedReport.reportedBy && (
                      <span>
                        Denunciante: {selectedReport.reportedBy.name || selectedReport.reportedBy.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {selectedReport.property && (
                  <div className="p-3 rounded-lg border border-gray-200">
                    <div className="text-sm font-semibold text-gray-900 mb-1">Anúncio relacionado</div>
                    <div className="text-sm text-gray-700">
                      {selectedReport.property.title} · {selectedReport.property.city}/{selectedReport.property.state}
                    </div>
                  </div>
                )}

                {selectedReport.targetUser && (
                  <div className="p-3 rounded-lg border border-gray-200">
                    <div className="text-sm font-semibold text-gray-900 mb-1">Usuário relacionado</div>
                    <div className="text-sm text-gray-700">
                      {selectedReport.targetUser.name || selectedReport.targetUser.email} ({
                        selectedReport.targetUser.role
                      })
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900 mb-1">Descrição da denúncia</div>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{selectedReport.description}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedReport.id, "IN_REVIEW")}
                  className="flex-1 px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-sm font-medium disabled:opacity-60"
                >
                  Marcar como em análise
                </button>
                <button
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedReport.id, "RESOLVED")}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-60"
                >
                  Marcar como resolvida
                </button>
                <button
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedReport.id, "DISMISSED")}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm font-medium disabled:opacity-60"
                >
                  Arquivar denúncia
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
