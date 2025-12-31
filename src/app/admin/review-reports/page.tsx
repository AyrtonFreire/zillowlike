"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { AlertTriangle, Eye, Filter, Loader2, Search, ShieldAlert, Star } from "lucide-react";

type ReviewStatus = "PUBLISHED" | "PENDING" | "HIDDEN" | "REMOVED";

type ReviewReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

type ReportUser = {
  id: string;
  name: string | null;
  email: string | null;
};

type ProfileUser = {
  id: string;
  name: string | null;
  publicSlug?: string | null;
  role?: string | null;
};

type RatingRef = {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  realtor?: ProfileUser | null;
  owner?: ProfileUser | null;
  author?: ProfileUser | null;
};

type ReviewReport = {
  id: string;
  reason: string;
  description: string | null;
  status: ReviewReportStatus;
  createdAt: string;
  updatedAt: string;
  reportedBy: ReportUser;
  realtorRating?: RatingRef | null;
  ownerRating?: RatingRef | null;
};

type Stats = {
  total: number;
  open: number;
  resolved: number;
  dismissed: number;
};

export default function AdminReviewReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"ALL" | ReviewReportStatus>("OPEN");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReviewReport | null>(null);
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
      const res = await fetch(`/api/admin/review-reports?${params.toString()}`);
      if (!res.ok) throw new Error("http");
      const data = await res.json();
      if (!data?.success) throw new Error("api");
      setReports(data.reports || []);
      setStats(data.stats || null);
    } catch {
      setError("Não conseguimos carregar as denúncias de avaliações agora.");
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
  }, [status, statusFilter]);

  const filteredReports = useMemo(() => {
    if (!search.trim()) return reports;
    const term = search.toLowerCase();
    return reports.filter((r) => {
      const target = r.realtorRating || r.ownerRating;
      const parts = [
        r.reason,
        r.description || "",
        r.reportedBy?.name || "",
        r.reportedBy?.email || "",
        target?.comment || "",
        target?.realtor?.name || "",
        target?.owner?.name || "",
        target?.author?.name || "",
      ];
      return parts.some((p) => p.toLowerCase().includes(term));
    });
  }, [reports, search]);

  const updateReportStatus = async (reportId: string, newStatus: ReviewReportStatus) => {
    try {
      setUpdating(true);
      const res = await fetch("/api/admin/review-reports/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status: newStatus }),
      });
      if (!res.ok) throw new Error("http");
      const data = await res.json();
      if (!data?.success) throw new Error("api");
      await fetchReports();
    } catch {
      alert("Não conseguimos atualizar o status desta denúncia agora.");
    } finally {
      setUpdating(false);
    }
  };

  const moderateReview = async (targetType: "REALTOR" | "OWNER", ratingId: string, status: ReviewStatus) => {
    try {
      setUpdating(true);
      const res = await fetch("/api/admin/review-moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, ratingId, status }),
      });
      if (!res.ok) throw new Error("http");
      const data = await res.json();
      if (!data?.success) throw new Error("api");
      await fetchReports();
    } catch {
      alert("Não conseguimos moderar esta avaliação agora.");
    } finally {
      setUpdating(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Denúncias de avaliações"
        description="Carregando denúncias..."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Denúncias de avaliações" },
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
      title="Denúncias de avaliações"
      description="Modere avaliações denunciadas (corretores e anunciantes)"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Denúncias de avaliações" },
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
              <ShieldAlert className="w-8 h-8 text-teal-600" />
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
                <p className="text-sm text-gray-600">Resolvidas</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolved}</p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Arquivadas</p>
                <p className="text-3xl font-bold text-gray-700 mt-1">{stats.dismissed}</p>
              </div>
              <Filter className="w-8 h-8 text-gray-600" />
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
                  placeholder="Buscar por motivo, denunciante, comentário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Status:</span>
              </div>
              {(["ALL", "OPEN", "RESOLVED", "DISMISSED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "glass-teal text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {s === "ALL" ? "Todas" : s === "OPEN" ? "Abertas" : s === "RESOLVED" ? "Resolvidas" : "Arquivadas"}
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
              <div className="px-6 py-12 text-center text-sm text-gray-500">Nenhuma denúncia encontrada.</div>
            ) : (
              filteredReports.map((report) => {
                const isRealtor = Boolean(report.realtorRating);
                const targetType: "REALTOR" | "OWNER" = isRealtor ? "REALTOR" : "OWNER";
                const target = (report.realtorRating || report.ownerRating) as RatingRef;
                const targetProfile = isRealtor ? target.realtor : target.owner;
                const profileHref = targetProfile?.publicSlug ? (isRealtor ? `/realtor/${targetProfile.publicSlug}` : `/owner/${targetProfile.publicSlug}`) : null;

                return (
                  <div key={report.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                        <Star className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {isRealtor ? "Avaliação de corretor" : "Avaliação de anunciante"} · {report.reason}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            report.status === "OPEN" ? "bg-red-50 text-red-700" : report.status === "RESOLVED" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}>
                            {report.status === "OPEN" ? "Aberta" : report.status === "RESOLVED" ? "Resolvida" : "Arquivada"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            target.status === "PUBLISHED" ? "bg-teal-50 text-teal-800" : target.status === "HIDDEN" ? "bg-yellow-50 text-yellow-800" : target.status === "REMOVED" ? "bg-red-50 text-red-800" : "bg-gray-100 text-gray-700"
                          }`}>
                            Review: {target.status}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                          {targetProfile?.name && <span>Perfil: {targetProfile.name}</span>}
                          {profileHref && (
                            <span className="flex items-center gap-1">
                              <span className="text-gray-300">·</span>
                              <Link href={profileHref} className="text-blue-600 hover:underline" target="_blank">
                                Ver perfil
                              </Link>
                            </span>
                          )}
                          <span>Denunciante: {report.reportedBy?.name || report.reportedBy?.email}</span>
                          <span>Criada em {new Date(report.createdAt).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => setSelected(report)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Denúncia</h2>
                  <div className="text-xs text-gray-500">Criada em {new Date(selected.createdAt).toLocaleString("pt-BR")}</div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  Fechar
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-3 rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-900 mb-1">Motivo</div>
                  <div className="text-sm text-gray-700">{selected.reason}</div>
                </div>

                {selected.description && (
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="text-sm font-semibold text-gray-900 mb-1">Descrição</div>
                    <p className="text-sm text-gray-800 whitespace-pre-line">{selected.description}</p>
                  </div>
                )}

                <div className="p-3 rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-900 mb-1">Avaliação denunciada</div>
                  <div className="text-sm text-gray-700 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      {(selected.realtorRating || selected.ownerRating)?.rating}
                    </span>
                    <span>Status: {(selected.realtorRating || selected.ownerRating)?.status}</span>
                  </div>
                  {(selected.realtorRating || selected.ownerRating)?.comment && (
                    <p className="text-sm text-gray-800 mt-2 whitespace-pre-line">{(selected.realtorRating || selected.ownerRating)?.comment}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  disabled={updating}
                  onClick={() => updateReportStatus(selected.id, "RESOLVED")}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-60"
                >
                  Marcar denúncia como resolvida
                </button>
                <button
                  disabled={updating}
                  onClick={() => updateReportStatus(selected.id, "DISMISSED")}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm font-medium disabled:opacity-60"
                >
                  Arquivar denúncia
                </button>
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">Moderação da avaliação</div>
                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    disabled={updating}
                    onClick={() => {
                      const isRealtor = Boolean(selected.realtorRating);
                      const targetType: "REALTOR" | "OWNER" = isRealtor ? "REALTOR" : "OWNER";
                      const ratingId = (selected.realtorRating || selected.ownerRating)?.id as string;
                      moderateReview(targetType, ratingId, "PUBLISHED");
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium disabled:opacity-60"
                  >
                    Publicar
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => {
                      const isRealtor = Boolean(selected.realtorRating);
                      const targetType: "REALTOR" | "OWNER" = isRealtor ? "REALTOR" : "OWNER";
                      const ratingId = (selected.realtorRating || selected.ownerRating)?.id as string;
                      moderateReview(targetType, ratingId, "HIDDEN");
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-sm font-medium disabled:opacity-60"
                  >
                    Ocultar
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => {
                      const isRealtor = Boolean(selected.realtorRating);
                      const targetType: "REALTOR" | "OWNER" = isRealtor ? "REALTOR" : "OWNER";
                      const ratingId = (selected.realtorRating || selected.ownerRating)?.id as string;
                      moderateReview(targetType, ratingId, "REMOVED");
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium disabled:opacity-60"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
