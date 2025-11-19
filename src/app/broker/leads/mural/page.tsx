"use client";

import { useEffect, useState } from "react";
import { Filter, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import LeadCardWithTime from "@/components/broker/LeadCardWithTime";
import PriorityLeadModal from "@/components/broker/PriorityLeadModal";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

interface Lead {
  id: string;
  status: string;
  visitDate: string | null;
  visitTime: string | null;
  createdAt: string;
  reservedUntil?: string | null;
  realtorId?: string | null;
  candidatesCount: number;
  property: {
    id: string;
    title: string;
    price: number;
    type: string;
    city: string;
    state: string;
    neighborhood?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    images: Array<{ url: string }>;
  };
  contact?: {
    name: string;
    email: string;
    phone?: string | null;
  } | null;
}

export default function MuralLeadsPage() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: "",
    state: "",
    type: "",
    minPrice: "",
    maxPrice: "",
  });
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "matching">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "last7">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [priorityLead, setPriorityLead] = useState<Lead | null>(null);

  const realtorId = (session?.user as any)?.id || "";

  useEffect(() => {
    fetchLeads();
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [filters]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append("city", filters.city);
      if (filters.state) params.append("state", filters.state);
      if (filters.type) params.append("type", filters.type);
      if (filters.minPrice) params.append("minPrice", filters.minPrice);
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);

      const response = await fetch(`/api/leads/mural?${params.toString()}`);
      const data = await response.json();
      setLeads(data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const filteredLeads = leads.filter((lead) => {
    // Status (lado do corretor) – baseado em status do lead no mural
    if (statusFilter === "available" && lead.status !== "AVAILABLE") return false;
    if (statusFilter === "matching" && lead.status !== "MATCHING") return false;

    // Data de criação
    const created = new Date(lead.createdAt);
    if (dateFilter === "today" && !isSameDay(created, now)) {
      return false;
    }
    if (dateFilter === "last7" && created < sevenDaysAgo) {
      return false;
    }

    return true;
  });

  const handleCandidate = async (leadId: string) => {
    if (!realtorId) {
      alert("Você precisa estar logado como corretor");
      return;
    }

    try {
      const response = await fetch(`/api/leads/${leadId}/candidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Candidatura enviada. Agora são ${data.totalCandidates} corretores interessados neste lead.`);
        fetchLeads();
      } else {
        alert("Não conseguimos registrar sua candidatura agora. Tente novamente mais tarde.");
      }
    } catch (error) {
      console.error("Error candidating:", error);
      alert("Não conseguimos registrar sua candidatura agora. Tente novamente mais tarde.");
    }
  };

  const handleAccept = async (leadId: string) => {
    if (!confirm("Você gostaria de assumir este lead agora?")) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Lead assumido com sucesso! Fique à vontade para fazer o primeiro contato do seu jeito.");
        fetchLeads();
      } else {
        alert("Não conseguimos assumir este lead agora. Tente novamente mais tarde.");
      }
    } catch (error) {
      console.error("Error accepting lead:", error);
      alert("Não conseguimos assumir este lead agora. Tente novamente mais tarde.");
    }
  };

  const handleReject = async (leadId: string) => {
    if (!confirm("Você gostaria de recusar este lead agora?")) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Lead recusado com sucesso! Obrigado por considerar.");
        fetchLeads();
      } else {
        alert("Não conseguimos recusar este lead agora. Tente novamente mais tarde.");
      }
    } catch (error) {
      console.error("Error rejecting lead:", error);
      alert("Não conseguimos recusar este lead agora. Tente novamente mais tarde.");
    }
  };

  if (loading) {
    return <CenteredSpinner message="Carregando leads do mural..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Mural de Leads
              </h1>
              <p className="text-gray-600 mt-1">
                {filteredLeads.length} leads disponíveis
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
              >
                <Filter className="w-5 h-5" />
                Filtros
              </button>
              <button
                onClick={fetchLeads}
                className="flex items-center gap-2 px-4 py-2 glass-teal text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Atualizar
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <input
                  type="text"
                  placeholder="Cidade"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Estado (ex: PE)"
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos os tipos</option>
                  <option value="HOUSE">Casa</option>
                  <option value="APARTMENT">Apartamento</option>
                  <option value="CONDO">Condomínio</option>
                  <option value="STUDIO">Studio</option>
                </select>
                <input
                  type="number"
                  placeholder="Preço mínimo"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Preço máximo"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {/* Status / Data do lead */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === "all"
                        ? "glass-teal text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Todos os status
                  </button>
                  <button
                    onClick={() => setStatusFilter("available")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === "available"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Abertos no mural
                  </button>
                  <button
                    onClick={() => setStatusFilter("matching")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === "matching"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Com candidatos
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[ 
                    { value: "all" as const, label: "Todas as datas" },
                    { value: "today" as const, label: "Hoje" },
                    { value: "last7" as const, label: "Últimos 7 dias" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setDateFilter(item.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        dateFilter === item.value
                          ? "glass-teal text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setFilters({ city: "", state: "", type: "", minPrice: "", maxPrice: "" });
                      setStatusFilter("all");
                      setDateFilter("all");
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leads List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredLeads.length === 0 ? (
          <EmptyState
            title="Nenhum lead disponível no momento"
            description="Assim que surgirem novas oportunidades alinhadas com o seu perfil, elas aparecem aqui automaticamente."
          />
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <LeadCardWithTime
                key={lead.id}
                lead={lead as any}
                onCandidate={() => handleCandidate(lead.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Priority Lead Modal */}
      {priorityLead && (
        <PriorityLeadModal
          lead={priorityLead as any}
          onAccept={() => handleAccept(priorityLead.id)}
          onReject={() => handleReject(priorityLead.id)}
          onClose={() => setPriorityLead(null)}
        />
      )}
    </div>
  );
}
