"use client";

import { useState } from "react";
import { SlidersHorizontal, X, Home, DollarSign, Bed, Bath, Maximize2, ChevronDown } from "lucide-react";

type FilterValues = {
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  type: string;
  areaMin: string;
};

type SearchFiltersBarProps = {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
};

export default function SearchFiltersBar({ filters, onFiltersChange, onClearFilters }: SearchFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const propertyTypes = [
    { value: "", label: "Todos os tipos" },
    { value: "HOUSE", label: "Casa" },
    { value: "APARTMENT", label: "Apartamento" },
    { value: "CONDO", label: "Condomínio" },
    { value: "LAND", label: "Terreno" },
  ];

  const bedroomOptions = [
    { value: "", label: "Qualquer" },
    { value: "1", label: "1+" },
    { value: "2", label: "2+" },
    { value: "3", label: "3+" },
    { value: "4", label: "4+" },
    { value: "5", label: "5+" },
  ];

  const bathroomOptions = [
    { value: "", label: "Qualquer" },
    { value: "1", label: "1+" },
    { value: "2", label: "2+" },
    { value: "3", label: "3+" },
    { value: "4", label: "4+" },
  ];

  const hasActiveFilters = 
    filters.minPrice || 
    filters.maxPrice || 
    filters.bedrooms || 
    filters.bathrooms || 
    filters.type || 
    filters.areaMin;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      {/* Main Filter Bar */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              showAdvanced || hasActiveFilters
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtros</span>
            {hasActiveFilters && !showAdvanced && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                {[filters.minPrice, filters.maxPrice, filters.bedrooms, filters.bathrooms, filters.type, filters.areaMin].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {/* Quick Filters - Always Visible */}
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Property Type */}
            <div className="relative">
              <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={filters.type}
                onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer min-w-[160px]"
              >
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Bedrooms */}
            <div className="relative">
              <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={filters.bedrooms}
                onChange={(e) => onFiltersChange({ ...filters, bedrooms: e.target.value })}
                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer min-w-[120px]"
              >
                {bedroomOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value ? `${opt.label} quartos` : opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bathrooms */}
            <div className="relative">
              <Bath className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={filters.bathrooms}
                onChange={(e) => onFiltersChange({ ...filters, bathrooms: e.target.value })}
                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer min-w-[120px]"
              >
                {bathroomOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value ? `${opt.label} banheiros` : opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="px-6 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price Range */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                Faixa de Preço
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Mínimo"
                  value={filters.minPrice}
                  onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="number"
                  placeholder="Máximo"
                  value={filters.maxPrice}
                  onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="mt-2 flex gap-2">
                {['100000', '300000', '500000', '1000000'].map(price => (
                  <button
                    key={price}
                    onClick={() => onFiltersChange({ ...filters, maxPrice: price })}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    {Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                  </button>
                ))}
              </div>
            </div>

            {/* Area */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5" />
                Área Mínima (m²)
              </label>
              <input
                type="number"
                placeholder="Ex: 50"
                value={filters.areaMin}
                onChange={(e) => onFiltersChange({ ...filters, areaMin: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <div className="mt-2 flex gap-2">
                {['50', '100', '150', '200'].map(area => (
                  <button
                    key={area}
                    onClick={() => onFiltersChange({ ...filters, areaMin: area })}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    {area}m²
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex items-end">
              <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 font-medium">
                  💡 Dica: Use os filtros para refinar sua busca e encontrar o imóvel ideal!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
