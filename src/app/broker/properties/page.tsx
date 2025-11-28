"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Home, Plus, Search, Eye, Users, BarChart3 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PropertyCardV2 from "@/components/dashboard/PropertyCardV2";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

interface BrokerProperty {
  id: string;
  title: string;
  price: number;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  type: string;
  city: string;
  state: string;
  street: string;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  description: string | null;
  image: string | null;
  images: Array<{ url: string }> | null;
  views: number;
  leads: number;
  favorites: number;
  scheduledVisits: number;
  completedVisits: number;
  pendingApprovals: number;
  createdAt: string;
}

type BrokerPropertyWithQuality = BrokerProperty & { qualityScore: number };

export default function BrokerPropertiesPage() {
  const { status } = useSession();

  const [properties, setProperties] = useState<BrokerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED" | "DRAFT">("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "leads" | "views" | "price_desc" | "price_asc">("recent");
  const [onlyWithLeads, setOnlyWithLeads] = useState(false);
  const [qualityFilter, setQualityFilter] = useState<"ALL" | "NEEDS_IMPROVEMENT" | "GOOD">("ALL");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchProperties();
  }, [status]);

  const fetchProperties = async () => {
    try {
      setError(null);
      setLoading(true);

      // Reaproveita a mesma API de propriedades do proprietário,
      // mas aqui enxergando como "estoque" do corretor.
      const response = await fetch("/api/owner/properties");
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Não conseguimos carregar seus imóveis agora. Se quiser, tente novamente em alguns instantes."
        );
      }

      setProperties(Array.isArray(data.properties) ? data.properties : []);
    } catch (err: any) {
      console.error("Error fetching broker properties:", err);
      setError(
        err?.message ||
          "Não conseguimos carregar seus imóveis agora. Se quiser, tente novamente em alguns instantes."
      );
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateQualityScore = (property: BrokerProperty): number => {
    const checks = [
      Array.isArray(property.images) && property.images.length >= 5,
      typeof property.description === "string" && property.description.length >= 100,
      property.bedrooms !== null,
      property.bathrooms !== null,
      property.areaM2 !== null,
      property.neighborhood !== null,
    ];
    const score = (checks.filter(Boolean).length / checks.length) * 100;
    return Math.round(score);
  };

  const propertiesWithQuality: BrokerPropertyWithQuality[] = properties.map((p) => ({
    ...p,
    qualityScore: calculateQualityScore(p),
  }));

  const totalProperties = propertiesWithQuality.length;
  const totalActive = propertiesWithQuality.filter((p) => p.status === "ACTIVE").length;
  const totalViews = propertiesWithQuality.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalLeads = propertiesWithQuality.reduce((sum, p) => sum + (p.leads || 0), 0);

  const filteredProperties = propertiesWithQuality
    .filter((p) => (statusFilter === "ALL" ? true : p.status === statusFilter))
    .filter((p) => (onlyWithLeads ? p.leads > 0 : true))
    .filter((p) => {
      if (qualityFilter === "ALL") return true;
      if (qualityFilter === "NEEDS_IMPROVEMENT") return p.qualityScore < 70;
      return p.qualityScore >= 70;
    })
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.neighborhood || "").toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
      );
    });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case "leads":
        return b.leads - a.leads;
      case "views":
        return b.views - a.views;
      case "price_desc":
        return b.price - a.price;
      case "price_asc":
        return a.price - b.price;
      case "recent":
      default: {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
    }
  });

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Meus imóveis"
        description="Veja de forma simples os imóveis do seu estoque e os leads gerados em cada um."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Corretor", href: "/broker/dashboard" },
          { label: "Meus imóveis" },
        ]}
      >
        <CenteredSpinner message="Carregando seus imóveis..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Meus imóveis"
      description="Veja de forma simples os imóveis do seu estoque e os leads gerados em cada um."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Meus imóveis" },
      ]}
      actions={
        <Link
          href="/owner/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-white text-teal-700 hover:bg-teal-50 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo anúncio
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
            {error}
          </div>
        )}

        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <EmptyState
              icon={<Home className="w-12 h-12 mx-auto mb-3 text-gray-300" />}
              title="Você ainda não tem imóveis cadastrados"
              description="Assim que você criar seus anúncios, eles aparecem aqui para você acompanhar leads, visitas e negociações."
              action={
                <Link
                  href="/owner/new"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-teal-200 bg-white text-teal-700 hover:bg-teal-50 font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Criar primeiro anúncio
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl p-6 mb-8 text-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold mb-1">Visão geral do seu estoque</h2>
                  <p className="text-xs md:text-sm text-teal-100">
                    {totalProperties} imóveis no total, {totalActive} ativos e {totalLeads} leads gerados.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs md:text-sm">
                  <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1 text-teal-100">
                      <Home className="w-3.5 h-3.5" />
                      <span>Imóveis</span>
                    </div>
                    <div className="text-base md:text-lg font-bold">{totalProperties}</div>
                  </div>
                  <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1 text-teal-100">
                      <Users className="w-3.5 h-3.5" />
                      <span>Leads</span>
                    </div>
                    <div className="text-base md:text-lg font-bold">{totalLeads}</div>
                  </div>
                  <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1 text-teal-100">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Views</span>
                    </div>
                    <div className="text-base md:text-lg font-bold">{totalViews}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por título, cidade ou bairro..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div className="flex flex-wrap gap-3 items-center justify-between md:justify-end w-full md:w-auto">
                  <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs">
                    {["ALL", "ACTIVE", "PAUSED", "DRAFT"].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setStatusFilter(value as any)}
                        className={`px-3 py-1 rounded-full font-medium transition-colors ${
                          statusFilter === value
                            ? "bg-white text-teal-700 shadow-sm"
                            : "text-gray-600 hover:text-gray-800"
                        }`}
                      >
                        {value === "ALL" && "Todos"}
                        {value === "ACTIVE" && "Ativos"}
                        {value === "PAUSED" && "Pausados"}
                        {value === "DRAFT" && "Rascunhos"}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs justify-end">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Ordenar por</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="recent">Mais recentes</option>
                        <option value="leads">Mais leads</option>
                        <option value="views">Mais views</option>
                        <option value="price_desc">Maior preço</option>
                        <option value="price_asc">Menor preço</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Qualidade</span>
                      <select
                        value={qualityFilter}
                        onChange={(e) => setQualityFilter(e.target.value as any)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="ALL">Todas</option>
                        <option value="NEEDS_IMPROVEMENT">Abaixo de 70%</option>
                        <option value="GOOD">70% ou mais</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOnlyWithLeads((prev) => !prev)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                        onlyWithLeads
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Somente com leads</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {sortedProperties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-600">
                Nenhum imóvel encontrado com os filtros atuais. Ajuste a busca ou os filtros para ver outros imóveis.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedProperties.map((property) => (
                  <PropertyCardV2
                    key={property.id}
                    id={property.id}
                    href={`/property/${property.id}`}
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
                    views={property.views}
                    leads={property.leads}
                    favorites={property.favorites}
                    qualityScore={property.qualityScore}
                    hasDescription={typeof property.description === "string" && property.description.length >= 100}
                    hasMinPhotos={Array.isArray(property.images) && property.images.length >= 5}
                    missingFields={[]}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
