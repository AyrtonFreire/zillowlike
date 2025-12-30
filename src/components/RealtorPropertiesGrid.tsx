"use client";

import { useState, useMemo } from "react";
import PropertyCardPremium from "@/components/modern/PropertyCardPremium";
import { Building2, Filter, ChevronDown, X } from "lucide-react";

interface Property {
  id: string;
  title: string;
  price: number;
  city: string;
  state: string;
  bedrooms?: number;
  bathrooms?: number;
  areaM2?: number;
  neighborhood?: string;
  parkingSpots?: number;
  conditionTags?: string[];
  type: string;
  purpose: string;
  images: { url: string }[];
  createdAt?: string | Date;
  viewsCount?: number;
  leadsCount?: number;
  benchmarkPricePerM2?: number | null;
  benchmarkConversionRate?: number | null;
  benchmarkLeadsTop20Threshold?: number | null;
}

interface RealtorPropertiesGridProps {
  properties: Property[];
  realtorName: string;
}

const PROPERTY_TYPES: Record<string, string> = {
  HOUSE: "Casa",
  APARTMENT: "Apartamento",
  CONDO: "Condomínio",
  LAND: "Terreno",
  COMMERCIAL: "Comercial",
  FARM: "Fazenda/Sítio",
};

const PRICE_RANGES = [
  { label: "Todos os preços", min: 0, max: Infinity },
  { label: "Até R$ 200 mil", min: 0, max: 200000 },
  { label: "R$ 200 mil - R$ 500 mil", min: 200000, max: 500000 },
  { label: "R$ 500 mil - R$ 1 milhão", min: 500000, max: 1000000 },
  { label: "R$ 1 milhão - R$ 2 milhões", min: 1000000, max: 2000000 },
  { label: "Acima de R$ 2 milhões", min: 2000000, max: Infinity },
];

export default function RealtorPropertiesGrid({ properties, realtorName }: RealtorPropertiesGridProps) {
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [purposeFilter, setPurposeFilter] = useState<string>("ALL");
  const [priceRangeIndex, setPriceRangeIndex] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  // Tipos disponíveis neste corretor
  const availableTypes = useMemo(() => {
    const types = new Set(properties.map((p) => p.type));
    return Array.from(types);
  }, [properties]);

  // Verificar se tem venda e aluguel
  const hasSale = properties.some((p) => p.purpose === "SALE");
  const hasRent = properties.some((p) => p.purpose === "RENT");

  // Filtrar imóveis
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // Filtro por tipo
      if (typeFilter !== "ALL" && p.type !== typeFilter) return false;

      // Filtro por finalidade
      if (purposeFilter !== "ALL" && p.purpose !== purposeFilter) return false;

      // Filtro por preço
      const range = PRICE_RANGES[priceRangeIndex];
      if (p.price < range.min || p.price > range.max) return false;

      return true;
    });
  }, [properties, typeFilter, purposeFilter, priceRangeIndex]);

  const hasActiveFilters = typeFilter !== "ALL" || purposeFilter !== "ALL" || priceRangeIndex !== 0;

  const clearFilters = () => {
    setTypeFilter("ALL");
    setPurposeFilter("ALL");
    setPriceRangeIndex(0);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Imóveis anunciados por {realtorName}</h2>
          <p className="text-sm text-gray-600">
            {filteredProperties.length} imóve{filteredProperties.length === 1 ? "l" : "is"} encontrado{filteredProperties.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Botão de filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasActiveFilters
              ? "bg-teal-100 text-teal-700 border border-teal-200"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 w-5 h-5 flex items-center justify-center bg-teal-600 text-white text-xs rounded-full">
              {(typeFilter !== "ALL" ? 1 : 0) + (purposeFilter !== "ALL" ? 1 : 0) + (priceRangeIndex !== 0 ? 1 : 0)}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tipo de imóvel */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo de imóvel</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="ALL">Todos os tipos</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {PROPERTY_TYPES[type] || type}
                  </option>
                ))}
              </select>
            </div>

            {/* Finalidade */}
            {hasSale && hasRent && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Finalidade</label>
                <select
                  value={purposeFilter}
                  onChange={(e) => setPurposeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="ALL">Venda e Aluguel</option>
                  <option value="SALE">Apenas Venda</option>
                  <option value="RENT">Apenas Aluguel</option>
                </select>
              </div>
            )}

            {/* Faixa de preço */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Faixa de preço</label>
              <select
                value={priceRangeIndex}
                onChange={(e) => setPriceRangeIndex(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {PRICE_RANGES.map((range, idx) => (
                  <option key={idx} value={idx}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid de imóveis */}
      {filteredProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-600">
          <Building2 className="h-10 w-10 text-gray-300 mb-2" />
          {hasActiveFilters ? (
            <>
              <p className="text-sm">Nenhum imóvel encontrado com os filtros selecionados.</p>
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Limpar filtros
              </button>
            </>
          ) : (
            <>
              <p className="text-sm">Nenhum imóvel ativo encontrado para este profissional no momento.</p>
              <p className="text-xs text-gray-500 mt-1">Volte em breve para ver novos anúncios.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filteredProperties.map((p) => (
            <PropertyCardPremium
              key={p.id}
              property={{
                id: p.id,
                title: p.title,
                price: p.price,
                city: p.city,
                state: p.state,
                bedrooms: p.bedrooms,
                bathrooms: p.bathrooms,
                areaM2: p.areaM2,
                neighborhood: p.neighborhood,
                parkingSpots: p.parkingSpots,
                conditionTags: p.conditionTags || [],
                type: p.type as any,
                purpose: p.purpose as any,
                images: p.images,
                createdAt: p.createdAt,
                viewsCount: p.viewsCount,
                leadsCount: p.leadsCount,
                benchmarkPricePerM2: p.benchmarkPricePerM2 ?? null,
                benchmarkConversionRate: p.benchmarkConversionRate ?? null,
                benchmarkLeadsTop20Threshold: p.benchmarkLeadsTop20Threshold ?? null,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
