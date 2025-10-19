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
    <div className="bg-white border-b border-gray-100 sticky top-20 z-20 shadow-sm">
      {/* Main Filter Bar */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all ${
              showAdvanced || hasActiveFilters
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtros</span>
            {hasActiveFilters && !showAdvanced && (
              <span className="ml-1 px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">
                {[filters.minPrice, filters.maxPrice, filters.bedrooms, filters.bathrooms, filters.type, filters.areaMin].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {/* Quick Type Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {propertyTypes.slice(1).map((type) => (
              <button
                key={type.value}
                onClick={() => onFiltersChange({ ...filters, type: filters.type === type.value ? '' : type.value })}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  filters.type === type.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-600 hover:bg-blue-50'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">{type.label}</span>
              </button>
            ))}
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

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all ml-auto border border-red-200"
            >
              <X className="w-4 h-4" />
              <span className="text-sm">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="container mx-auto px-4 pb-6 pt-6 border-t border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Price Range */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-700" />
                  Faixa de Preço
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Mínimo"
                    value={filters.minPrice}
                    onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all"
                  />
                  <div className="w-6 h-0.5 bg-gray-300 rounded-full"></div>
                  <input
                    type="number"
                    placeholder="Máximo"
                    value={filters.maxPrice}
                    onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {['100000', '300000', '500000', '1000000'].map(price => (
                    <button
                      key={price}
                      onClick={() => onFiltersChange({ ...filters, maxPrice: price })}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
                    >
                      {Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                    </button>
                  ))}
                </div>
              </div>

              {/* Area */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-gray-700" />
                  Área Mínima
                </label>
                <input
                  type="number"
                  placeholder="Digite a área em m²"
                  value={filters.areaMin}
                  onChange={(e) => onFiltersChange({ ...filters, areaMin: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all"
                />
                <div className="flex flex-wrap gap-2">
                  {['50', '100', '150', '200'].map(area => (
                    <button
                      key={area}
                      onClick={() => onFiltersChange({ ...filters, areaMin: area })}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
                    >
                      {area}m²+
                    </button>
                  ))}
                </div>
              </div>

              {/* Bedrooms */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Bed className="w-4 h-4 text-gray-700" />
                  Quartos
                </label>
                <div className="flex flex-wrap gap-2">
                  {bedroomOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => onFiltersChange({ ...filters, bedrooms: opt.value })}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        filters.bedrooms === opt.value
                          ? 'bg-gray-900 text-white border border-gray-900'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {opt.value ? `${opt.label} quartos` : opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bathrooms */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Bath className="w-4 h-4 text-gray-700" />
                  Banheiros
                </label>
                <div className="flex flex-wrap gap-2">
                  {bathroomOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => onFiltersChange({ ...filters, bathrooms: opt.value })}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        filters.bathrooms === opt.value
                          ? 'bg-gray-900 text-white border border-gray-900'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {opt.value ? `${opt.label} banheiros` : opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
