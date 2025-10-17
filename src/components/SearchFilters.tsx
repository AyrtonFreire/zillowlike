"use client";

import { useState } from "react";

interface SearchFiltersProps {
  onFiltersChange: (filters: any) => void;
  initialFilters?: any;
  className?: string;
}

export default function SearchFilters({ onFiltersChange, initialFilters = {}, className = "" }: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFiltersChange({});
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className={`relative ${className}`}>
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`btn btn-secondary px-4 py-2 text-sm font-medium transition-all ${
          activeFiltersCount > 0 ? 'bg-primary-50 text-primary-700 border-primary-200' : ''
        }`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtros
        {activeFiltersCount > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Filters Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute top-full left-0 mt-2 w-80 lg:w-96 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/60 z-50 animate-fade-in">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filtros de busca</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filter Groups */}
              <div className="space-y-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-3">
                    Faixa de preço
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Mín"
                        value={filters.minPrice || ''}
                        onChange={(e) => updateFilter('minPrice', e.target.value)}
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Máx"
                        value={filters.maxPrice || ''}
                        onChange={(e) => updateFilter('maxPrice', e.target.value)}
                        className="input text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-3">
                    Tipo de imóvel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'HOUSE', label: 'Casa' },
                      { value: 'APARTMENT', label: 'Apartamento' },
                      { value: 'CONDO', label: 'Condomínio' },
                      { value: 'STUDIO', label: 'Studio' },
                      { value: 'LAND', label: 'Terreno' },
                      { value: 'COMMERCIAL', label: 'Comercial' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updateFilter('type', filters.type === type.value ? '' : type.value)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                          filters.type === type.value
                            ? 'bg-primary-50 text-primary-700 border-primary-200'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bedrooms & Bathrooms */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-3">
                      Quartos
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, '5+'].map((num) => (
                        <button
                          key={num}
                          onClick={() => updateFilter('bedrooms', filters.bedrooms === num ? '' : num)}
                          className={`flex-1 px-2 py-2 text-sm font-medium rounded-lg border transition-all ${
                            filters.bedrooms === num
                              ? 'bg-primary-50 text-primary-700 border-primary-200'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-3">
                      Banheiros
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, '4+'].map((num) => (
                        <button
                          key={num}
                          onClick={() => updateFilter('bathrooms', filters.bathrooms === num ? '' : num)}
                          className={`flex-1 px-2 py-2 text-sm font-medium rounded-lg border transition-all ${
                            filters.bathrooms === num
                              ? 'bg-primary-50 text-primary-700 border-primary-200'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-3">
                    Área mínima (m²)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 80"
                    value={filters.areaMin || ''}
                    onChange={(e) => updateFilter('areaMin', e.target.value)}
                    className="input text-sm"
                  />
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-3">
                    Ordenar por
                  </label>
                  <select
                    value={filters.sort || 'recent'}
                    onChange={(e) => updateFilter('sort', e.target.value)}
                    className="input text-sm"
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="price_asc">Menor preço</option>
                    <option value="price_desc">Maior preço</option>
                    <option value="area_desc">Maior área</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={clearFilters}
                  className="btn btn-ghost flex-1 text-sm"
                >
                  Limpar tudo
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="btn btn-primary flex-1 text-sm"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
