"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Filter,
  Search,
  Eye,
  RefreshCw
} from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import EmptyState from "@/components/ui/EmptyState";

interface Lead {
  id: string;
  status: string;
  propertyId: string;
  userId: string;
  realtorId: string | null;
  createdAt: string;
  updatedAt: string;
  property: {
    title: string;
    city: string;
    state: string;
    ownerId: string | null;
  };
  user: {
    name: string;
    email: string;
  };
  realtor: {
    name: string;
    email: string;
  } | null;
}

interface RealtorQueue {
  id: string;
  realtorId: string;
  status: string;
  position: number;
  activeLeads: number;
  lastActivity: string;
  realtor: {
    name: string;
    email: string;
  };
  _count: {
    candidatures: number;
  };
}

interface Stats {
  total: number;
  pending: number;
  matching: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  expired: number;
}

export default function AdminLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [queues, setQueues] = useState<RealtorQueue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch leads
      const leadsRes = await fetch("/api/admin/leads");
      if (!leadsRes.ok) {
        const text = await leadsRes.text().catch(() => "");
        console.error("Error fetching admin leads (HTTP):", { status: leadsRes.status, statusText: leadsRes.statusText, body: text });
        throw new Error("leads-error");
      }
      const leadsData = await leadsRes.json();
      if (leadsData.success) {
        setLeads(leadsData.leads);
        setStats(leadsData.stats);
      } else {
        console.error("Error fetching admin leads (no success flag):", leadsData);
        setLeads([]);
        setStats(null);
        throw new Error("leads-error");
      }

      // Fetch realtor queues
      const queuesRes = await fetch("/api/admin/realtor-queues");
      if (!queuesRes.ok) {
        const text = await queuesRes.text().catch(() => "");
        console.error("Error fetching admin realtor queues (HTTP):", { status: queuesRes.status, statusText: queuesRes.statusText, body: text });
        throw new Error("queues-error");
      }
      const queuesData = await queuesRes.json();
      if (queuesData.success) {
        setQueues(queuesData.queues);
      } else {
        console.error("Error fetching admin realtor queues (no success flag):", queuesData);
        setQueues([]);
        throw new Error("queues-error");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Não conseguimos carregar os dados de leads agora. Se quiser, tente novamente em alguns instantes.");
      if (!leads.length) {
        setLeads([]);
        setStats(null);
      }
      if (!queues.length) {
        setQueues([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      MATCHING: "bg-blue-100 text-blue-800",
      WAITING_REALTOR_ACCEPT: "bg-purple-100 text-purple-800",
      WAITING_OWNER_APPROVAL: "bg-orange-100 text-orange-800",
      CONFIRMED: "bg-green-100 text-green-800",
      COMPLETED: "bg-gray-100 text-gray-800",
      CANCELLED: "bg-red-100 text-red-800",
      EXPIRED: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "Pendente",
      MATCHING: "Buscando Corretor",
      WAITING_REALTOR_ACCEPT: "Aguardando Corretor",
      WAITING_OWNER_APPROVAL: "Aguardando Proprietário",
      CONFIRMED: "Confirmado",
      COMPLETED: "Concluído",
      CANCELLED: "Cancelado",
      EXPIRED: "Expirado",
    };
    return labels[status] || status;
  };

  const filteredLeads = leads.filter((lead) => {
    if (filter !== "all" && lead.status !== filter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        lead.property.title.toLowerCase().includes(searchLower) ||
        lead.user.name.toLowerCase().includes(searchLower) ||
        lead.user.email.toLowerCase().includes(searchLower) ||
        (lead.realtor?.name || "").toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Leads</h1>
              <p className="text-gray-600 mt-1">Monitore todos os leads e atendimentos</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchData()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {error}
          </div>
        )}
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Leads</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <Users className="w-12 h-12 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Confirmados</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Concluídos</p>
                  <p className="text-3xl font-bold text-gray-600 mt-1">{stats.completed}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-gray-600" />
              </div>
            </div>
          </div>
        )}

        {/* Realtor Queues */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Fila de Corretores</h2>
            <p className="text-sm text-gray-600 mt-1">Status e prioridade dos corretores</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Corretor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads Ativos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {queues.map((queue) => (
                  <tr key={queue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{queue.realtor.name}</p>
                        <p className="text-sm text-gray-500">{queue.realtor.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        queue.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {queue.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900 font-medium">{queue.position}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900 font-medium">{queue.activeLeads}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(queue.lastActivity).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por imóvel, cliente ou corretor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos os Status</option>
                <option value="PENDING">Pendentes</option>
                <option value="MATCHING">Buscando Corretor</option>
                <option value="WAITING_REALTOR_ACCEPT">Aguardando Corretor</option>
                <option value="WAITING_OWNER_APPROVAL">Aguardando Proprietário</option>
                <option value="CONFIRMED">Confirmados</option>
                <option value="COMPLETED">Concluídos</option>
                <option value="CANCELLED">Cancelados</option>
                <option value="EXPIRED">Expirados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Leads</h2>
            <p className="text-sm text-gray-600 mt-1">{filteredLeads.length} leads encontrados</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imóvel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Corretor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criado em</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10">
                      <EmptyState
                        icon={<AlertCircle className="w-12 h-12 text-gray-300" />}
                        title="Nenhum lead encontrado para este filtro"
                        description={
                          search || filter !== "all"
                            ? "Tente ajustar os filtros ou limpar a busca para enxergar o quadro completo, sem pressa."
                            : "Assim que novos leads entrarem no sistema, eles aparecem aqui automaticamente."
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{lead.property.title}</p>
                          <p className="text-sm text-gray-500">{lead.property.city}, {lead.property.state}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{lead.user.name}</p>
                          <p className="text-sm text-gray-500">{lead.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {lead.realtor ? (
                          <div>
                            <p className="font-medium text-gray-900">{lead.realtor.name}</p>
                            <p className="text-sm text-gray-500">{lead.realtor.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Sem corretor</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(lead.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Ver lead
                          </Link>
                          {lead.realtorId && (
                            <Link
                              href={`/broker/dashboard?previewUserId=${lead.realtorId}`}
                              className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm"
                              title="Ver como corretor"
                            >
                              <Eye className="w-4 h-4" />
                              Corretor
                            </Link>
                          )}
                          {lead.property.ownerId && (
                            <Link
                              href={`/owner/dashboard?previewUserId=${lead.property.ownerId}`}
                              className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm"
                              title="Ver como proprietário"
                            >
                              <Eye className="w-4 h-4" />
                              Proprietário
                            </Link>
                          )}
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
    </div>
  );
}
