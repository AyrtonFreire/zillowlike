"use client";

import { useEffect, useState } from "react";
import { Filter, RefreshCw } from "lucide-react";
import LeadCard from "@/components/queue/LeadCard";

interface Lead {
  id: string;
  status: "AVAILABLE" | "RESERVED" | "ACCEPTED";
  createdAt: string;
  reservedUntil?: string | null;
  realtorId?: string | null;
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
    phone?: string | null;
  };
  _count?: {
    candidatures: number;
  };
}

export default function MuralLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: "",
    state: "",
    type: "",
    minPrice: "",
    maxPrice: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // TODO: Get from auth session
  const realtorId = "demo-realtor-id";

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

  const handleCandidate = async (leadId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/candidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Candidatura enviada com sucesso!");
        fetchLeads();
      } else {
        alert(data.error || "Erro ao candidatar-se");
      }
    } catch (error) {
      console.error("Error candidating:", error);
      alert("Erro ao candidatar-se");
    }
  };

  const handleAccept = async (leadId: string) => {
    if (!confirm("Deseja aceitar este lead?")) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Lead aceito com sucesso!");
        fetchLeads();
      } else {
        alert(data.error || "Erro ao aceitar lead");
      }
    } catch (error) {
      console.error("Error accepting lead:", error);
      alert("Erro ao aceitar lead");
    }
  };

  const handleReject = async (leadId: string) => {
    if (!confirm("Deseja recusar este lead?")) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Lead recusado");
        fetchLeads();
      } else {
        alert(data.error || "Erro ao recusar lead");
      }
    } catch (error) {
      console.error("Error rejecting lead:", error);
      alert("Erro ao recusar lead");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando leads...</p>
        </div>
      </div>
    );
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
                {leads.length} leads disponíveis
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
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setFilters({ city: "", state: "", type: "", minPrice: "", maxPrice: "" })}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leads Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {leads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum lead disponível no momento</p>
            <p className="text-gray-400 text-sm mt-2">
              Novos leads aparecerão aqui automaticamente
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onCandidate={handleCandidate}
                onAccept={handleAccept}
                onReject={handleReject}
                isReservedForMe={lead.realtorId === realtorId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
