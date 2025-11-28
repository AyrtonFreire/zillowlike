"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Eye,
  Heart,
  MessageSquare,
  Edit2,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  Search,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

type PropertyStatus = "ACTIVE" | "PAUSED" | "DRAFT";

interface Property {
  id: string;
  title: string;
  price: number;
  status: PropertyStatus;
  type: string;
  city: string;
  state: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  image: string | null;
  createdAt: string;
  stats: {
    views: number;
    leads: number;
    favorites: number;
  };
}

interface Metrics {
  totalProperties: number;
  activeProperties: number;
  pausedProperties: number;
  draftProperties: number;
  totalViews: number;
  totalLeads: number;
  totalFavorites: number;
}

export default function OwnerPropertiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      fetchProperties();
    }
  }, [status, router]);

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/owner/properties");
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      if (data.success) {
        setProperties(data.properties);
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      const response = await fetch(`/api/owner/properties/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProperties(prev => prev.filter(p => p.id !== id));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: PropertyStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    
    try {
      const response = await fetch(`/api/owner/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setProperties(prev =>
          prev.map(p => (p.id === id ? { ...p, status: newStatus } : p))
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesFilter = filter === "ALL" || p.status === filter;
    const matchesSearch = search === "" || 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getStatusBadge = (status: PropertyStatus) => {
    const styles = {
      ACTIVE: "bg-green-100 text-green-800",
      PAUSED: "bg-yellow-100 text-yellow-800",
      DRAFT: "bg-gray-100 text-gray-800",
    };
    const labels = {
      ACTIVE: "Ativo",
      PAUSED: "Pausado",
      DRAFT: "Rascunho",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Meus Imóveis"
        description="Gerenciar seus anúncios"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Proprietário", href: "/owner/dashboard" },
          { label: "Imóveis" },
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
      title="Meus Imóveis"
      description={`${metrics?.totalProperties || 0} anúncios publicados`}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Proprietário", href: "/owner/dashboard" },
        { label: "Imóveis" },
      ]}
      actions={
        <Link
          href="/owner/new"
          className="flex items-center gap-2 px-6 py-3 glass-teal text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Anúncio
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total</span>
              <Home className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics?.totalProperties || 0}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Visualizações</span>
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics?.totalViews || 0}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Leads</span>
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics?.totalLeads || 0}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Favoritos</span>
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics?.totalFavorites || 0}</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { value: "ALL", label: "Todos" },
                { value: "ACTIVE", label: "Ativos" },
                { value: "PAUSED", label: "Pausados" },
                { value: "DRAFT", label: "Rascunhos" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === item.value
                      ? "bg-teal text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Properties List */}
        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum imóvel encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              {search || filter !== "ALL"
                ? "Tente ajustar os filtros"
                : "Comece publicando seu primeiro imóvel"}
            </p>
            {!search && filter === "ALL" && (
              <Link
                href="/owner/new"
                className="inline-flex items-center gap-2 px-6 py-3 glass-teal text-white font-medium rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
                Publicar Imóvel
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="w-48 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {property.image ? (
                      <Image
                        src={property.image}
                        alt={property.title}
                        width={192}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Home className="w-12 h-12" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {property.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {property.city}, {property.state}
                        </p>
                      </div>
                      {getStatusBadge(property.status)}
                    </div>

                    <div className="text-2xl font-bold text-blue-600 mb-3">
                      {formatPrice(property.price)}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{property.stats.views} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{property.stats.leads} leads</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{property.stats.favorites} favoritos</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/owner/properties/${property.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalhes
                      </Link>
                      <Link
                        href={`/owner/properties/edit/${property.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </Link>

                      <button
                        onClick={() => handleStatusToggle(property.id, property.status)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                      >
                        {property.status === "ACTIVE" ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Ativar
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(property.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                          deleteConfirm === property.id
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-gray-100 hover:bg-red-50 text-red-600"
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleteConfirm === property.id ? "Confirmar?" : "Excluir"}
                      </button>
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
