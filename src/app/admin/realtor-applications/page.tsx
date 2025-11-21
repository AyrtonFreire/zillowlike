"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Award,
  Loader2
} from "lucide-react";

interface Application {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  cpf: string;
  creci: string;
  creciState: string;
  creciExpiry: string;
  phone: string;
  realtorType: string;
  experience: number;
  specialties: string[];
  bio: string | null;
  creciDocumentUrl: string;
  identityDocumentUrl: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

const getRealtorTypeLabel = (type: string) => {
  if (type === "IMOBILIARIA") return "Imobiliária";
  if (type === "AUTONOMO") return "Autônomo";
  return type || "-";
};

export default function RealtorApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (session?.user) {
      const role = (session.user as any).role;
      if (role !== "ADMIN") {
        router.push("/dashboard");
      } else {
        fetchApplications();
      }
    }
  }, [status, session, router]);

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/admin/realtor-applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    if (!confirm("Tem certeza que deseja aprovar esta aplicação?")) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/realtor-applications/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      if (res.ok) {
        alert("Aplicação aprovada com sucesso!");
        fetchApplications();
        setSelectedApp(null);
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao aprovar aplicação");
      }
    } catch (error) {
      alert("Erro ao aprovar aplicação");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    if (!rejectionReason.trim()) {
      alert("Por favor, informe o motivo da rejeição");
      return;
    }

    if (!confirm("Tem certeza que deseja rejeitar esta aplicação?")) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/realtor-applications/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, reason: rejectionReason }),
      });

      if (res.ok) {
        alert("Aplicação rejeitada");
        fetchApplications();
        setSelectedApp(null);
        setRejectionReason("");
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao rejeitar aplicação");
      }
    } catch (error) {
      alert("Erro ao rejeitar aplicação");
    } finally {
      setProcessing(false);
    }
  };

  const filteredApplications = applications.filter(app => 
    filter === "ALL" ? true : app.status === filter
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    const icons = {
      PENDING: <Clock className="w-4 h-4" />,
      APPROVED: <CheckCircle className="w-4 h-4" />,
      REJECTED: <XCircle className="w-4 h-4" />,
    };
    const labels = {
      PENDING: "Pendente",
      APPROVED: "Aprovado",
      REJECTED: "Rejeitado",
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Aplicações de Corretores"
        description="Carregando..."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Aplicações" },
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
      title="Aplicações de Corretores"
      description={`${filteredApplications.length} aplicações encontradas`}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Aplicações" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex gap-3">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? "glass-teal text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              {status === "ALL" ? "Todas" : status === "PENDING" ? "Pendentes" : status === "APPROVED" ? "Aprovadas" : "Rejeitadas"}
            </button>
          ))}
        </div>

        {/* Applications List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredApplications.map(app => (
            <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{app.user.name}</h3>
                    <p className="text-sm text-gray-600">{app.user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Aplicado em: {new Date(app.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                {getStatusBadge(app.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-gray-400" />
                  <span>CRECI: {app.creci}-{app.creciState}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{app.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{app.experience} anos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Válido até: {new Date(app.creciExpiry).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>Tipo: {getRealtorTypeLabel(app.realtorType)}</span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Especialidades:</p>
                <div className="flex flex-wrap gap-2">
                  {app.specialties.map(specialty => (
                    <span key={specialty} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              {app.bio && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{app.bio}</p>
                </div>
              )}

              {app.status === "REJECTED" && app.rejectionReason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 mb-1">Motivo da Rejeição:</p>
                  <p className="text-sm text-red-700">{app.rejectionReason}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedApp(app)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalhes
                </button>

                {app.status === "APPROVED" && (
                  <Link
                    href={`/broker/dashboard?previewUserId=${app.user.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Ver como corretor"
                  >
                    <Eye className="w-4 h-4" />
                    Ver como corretor
                  </Link>
                )}

                {app.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={processing}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => setSelectedApp(app)}
                      disabled={processing}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {filteredApplications.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Nenhuma aplicação encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes/Rejeição */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Detalhes da Aplicação
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Documentos:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href={selectedApp.creciDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm">Ver CRECI</span>
                  </a>
                  <a
                    href={selectedApp.identityDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm">Ver RG/CNH</span>
                  </a>
                </div>
              </div>

              {selectedApp.status === "PENDING" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo da Rejeição (se aplicável):
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Informe o motivo caso vá rejeitar..."
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {selectedApp.status === "PENDING" && (
                <>
                  <button
                    onClick={() => handleApprove(selectedApp.id)}
                    disabled={processing}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleReject(selectedApp.id)}
                    disabled={processing || !rejectionReason.trim()}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setSelectedApp(null);
                  setRejectionReason("");
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
