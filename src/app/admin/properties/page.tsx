"use client";

import { useEffect, useState } from "react";
import {
  Home,
  Search,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Property {
  id: string;
  title: string;
  price: number;
  type: string;
  status: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number | null;
  createdAt: string;
  images: { url: string }[];
  owner: {
    name: string | null;
    email: string | null;
  };
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/admin/properties");
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (propertyId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchProperties();
      } else {
        alert("Erro ao atualizar status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Erro ao atualizar status");
    }
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

    try {
      const response = await fetch(`/api/admin/properties/${propertyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchProperties();
      } else {
        alert("Erro ao excluir imóvel");
      }
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Erro ao excluir imóvel");
    }
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || property.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: "bg-green-100 text-green-700",
      PAUSED: "bg-yellow-100 text-yellow-700",
      DRAFT: "bg-gray-100 text-gray-700",
      SOLD: "bg-red-100 text-red-700",
      RENTED: "bg-blue-100 text-blue-700",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      ACTIVE: "Ativo",
      PAUSED: "Pausado",
      DRAFT: "Rascunho",
      SOLD: "Vendido",
      RENTED: "Alugado",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      HOUSE: "Casa",
      APARTMENT: "Apartamento",
      CONDO: "Condomínio",
      STUDIO: "Studio",
      LAND: "Terreno",
      COMMERCIAL: "Comercial",
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gerenciar Imóveis
              </h1>
              <p className="text-gray-600 mt-1">
                {filteredProperties.length} imóveis encontrados
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por título ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="PAUSED">Pausado</option>
              <option value="DRAFT">Rascunho</option>
              <option value="SOLD">Vendido</option>
              <option value="RENTED">Alugado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="relative h-48 bg-gray-100">
                {property.images[0] ? (
                  <Image
                    src={property.images[0].url}
                    alt={property.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Home className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                      property.status
                    )}`}
                  >
                    {getStatusLabel(property.status)}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                  {property.title}
                </h3>
                <p className="text-xl font-bold text-blue-600 mb-3">
                  R$ {(property.price / 100).toLocaleString("pt-BR")}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span>{property.bedrooms} quartos</span>
                  <span>{property.bathrooms} banheiros</span>
                  {property.areaM2 && <span>{property.areaM2}m²</span>}
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  {property.city}, {property.state}
                </p>

                <div className="text-xs text-gray-500 mb-4">
                  Proprietário: {property.owner.name || property.owner.email}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/property/${property.id}`}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-center text-sm font-medium"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Ver
                  </Link>
                  {property.status === "DRAFT" && (
                    <button
                      onClick={() =>
                        handleStatusChange(property.id, "ACTIVE")
                      }
                      className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Aprovar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum imóvel encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
