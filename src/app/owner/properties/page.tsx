"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Plus, Search } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PropertyCardV2 from "@/components/dashboard/PropertyCardV2";

type PropertyStatus = "ACTIVE" | "PAUSED" | "DRAFT";

interface Property {
  id: string;
  title: string;
  price: number;
  status: PropertyStatus;
  type: string;
  city: string;
  state: string;
  street: string;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  image: string | null;
  description: string | null;
  images: Array<{ url: string }> | null;
  createdAt: string;
  stats: {
    views: number;
    leads: number;
    favorites: number;
  };
  conversionRatePct?: number | null;
  daysSinceLastLead?: number | null;
  platformComparisonPct?: number | null;
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
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
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


  const handleStatusToggle = async (id: string, currentStatus: PropertyStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setStatusLoading(id);
    
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
    } finally {
      setStatusLoading(null);
    }
  };

  const calculateQualityScore = (property: Property): number => {
    let score = 0;
    const checks = [
      property.images && property.images.length >= 5,
      property.description && property.description.length >= 100,
      property.bedrooms !== null,
      property.bathrooms !== null,
      property.areaM2 !== null,
      property.neighborhood !== null,
    ];
    score = (checks.filter(Boolean).length / checks.length) * 100;
    return Math.round(score);
  };

  const getMissingFields = (property: Property): string[] => {
    const missing: string[] = [];
    if (!property.neighborhood) missing.push("Preencher bairro");
    if (!property.bedrooms) missing.push("Adicionar n° de quartos");
    if (!property.bathrooms) missing.push("Adicionar n° de banheiros");
    if (!property.areaM2) missing.push("Informar área em m²");
    return missing;
  };

  const filteredProperties = properties.filter(p => {
    const matchesFilter = filter === "ALL" || p.status === filter;
    const matchesSearch = search === "" || 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });


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
      description="Gerencie seu portfólio de anúncios e acompanhe o desempenho de cada imóvel"
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
        {/* Summary Bar */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-1">{metrics?.totalProperties || 0}</h2>
              <p className="text-teal-100">Imóveis no seu portfólio</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold">{metrics?.totalViews || 0}</div>
                <div className="text-xs text-teal-100">Visualizações</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics?.totalLeads || 0}</div>
                <div className="text-xs text-teal-100">Leads</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics?.totalFavorites || 0}</div>
                <div className="text-xs text-teal-100">Favoritos</div>
              </div>
            </div>
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

        {/* Properties Grid */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <PropertyCardV2
                key={property.id}
                id={property.id}
                href={`/owner/properties/${property.id}`}
                title={property.title}
                price={property.price}
                status={property.status}
                image={property.image}
                street={property.street}
                neighborhood={property.neighborhood}
                city={property.city}
                state={property.state}
                bedrooms={property.bedrooms}
                bathrooms={property.bathrooms}
                areaM2={property.areaM2}
                type={property.type}
                views={property.stats.views}
                leads={property.stats.leads}
                conversionRatePct={(property as any).conversionRatePct ?? (property as any)?.analytics?.conversionRatePct ?? null}
                daysSinceLastLead={(property as any).daysSinceLastLead ?? (property as any)?.analytics?.daysSinceLastLead ?? null}
                platformComparisonPct={(property as any).platformComparisonPct ?? (property as any)?.analytics?.platformComparisonPct ?? null}
                favorites={property.stats.favorites}
                qualityScore={calculateQualityScore(property)}
                hasDescription={typeof property.description === "string" && property.description.length >= 100}
                hasMinPhotos={Array.isArray(property.images) && property.images.length >= 5}
                missingFields={getMissingFields(property)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
