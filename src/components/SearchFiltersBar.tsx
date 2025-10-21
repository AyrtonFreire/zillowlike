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
  compact?: boolean; // quando true, renderiza apenas o painel (sem top bar/sticky)
  open?: boolean;    // usado no modo compacto
  onClose?: () => void; // usado no modo compacto
  variant?: 'modal' | 'dropdown'; // aparência do painel compacto
};

export default function SearchFiltersBar({ filters, onFiltersChange, onClearFilters, compact = false, open = false, onClose, variant = 'modal' }: SearchFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const PRICE_MIN = 0;
  const PRICE_MAX = 2000000; // 2M
  const PRICE_STEP = 10000;  // 10k

  const minPriceNum = Number(filters.minPrice || 0);
  const maxPriceNum = Number(filters.maxPrice || 0) || 0;
  const currentMin = isNaN(minPriceNum) ? 0 : Math.max(PRICE_MIN, Math.min(minPriceNum, PRICE_MAX));
  const currentMax = isNaN(maxPriceNum) || maxPriceNum === 0 ? PRICE_MAX : Math.max(PRICE_MIN, Math.min(maxPriceNum, PRICE_MAX));

  const pct = (v: number) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const fmtBRL = (v: number) => v === PRICE_MAX ? '∞' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

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

  // Painel avançado isolado (modo compacto)
  const renderAdvancedPanel = () => (
    <div className={`${variant === 'modal' ? 'container mx-auto max-w-6xl px-4' : ''}`}>
      <div className={`${variant === 'modal' ? 'pb-6 pt-6 border border-gray-200 bg-white rounded-xl shadow-md' : 'p-4 bg-white rounded-xl shadow-xl border border-gray-200 w-[min(92vw,800px)]'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-700">Filtros</div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-sm">Fechar</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tipo de imóvel */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Home className="w-4 h-4 text-gray-700" />
              Tipo de imóvel
            </label>
            <div className="flex flex-wrap gap-2">
              {propertyTypes.slice(1).map((type) => (
                <button
                  key={type.value}
                  onClick={() => onFiltersChange({ ...filters, type: filters.type === type.value ? '' : type.value })}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    filters.type === type.value
                      ? 'bg-gray-900 text-white border border-gray-900'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          {/* Price Range */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-700" />
              Faixa de Preço
            </label>
            {/* Slider dupla alça (refinado) */}
            <div className="px-1">
              <div className="relative h-14 select-none">
                {/* Trilho */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full bg-gray-200" />
                {/* Faixa selecionada */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-sm"
                  style={{ left: `${pct(currentMin)}%`, right: `${100 - pct(currentMax)}%` }}
                />
                {/* Inputs range sobrepostos */}
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={PRICE_STEP}
                  value={currentMin}
                  onChange={(e) => {
                    const v = Math.min(Number(e.target.value), currentMax - PRICE_STEP);
                    onFiltersChange({ ...filters, minPrice: String(v) });
                  }}
                  className="range-input absolute left-0 right-0 w-full appearance-none bg-transparent outline-none"
                />
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={PRICE_STEP}
                  value={currentMax}
                  onChange={(e) => {
                    const v = Math.max(Number(e.target.value), currentMin + PRICE_STEP);
                    onFiltersChange({ ...filters, maxPrice: v === PRICE_MAX ? '' : String(v) });
                  }}
                  className="range-input absolute left-0 right-0 w-full appearance-none bg-transparent outline-none"
                />
                {/* Chips de valor acima das alças */}
                <div
                  className="absolute -top-2 text-[11px] font-bold text-gray-800"
                  style={{ left: `${pct(currentMin)}%`, transform: 'translate(-50%, -100%)' }}
                >
                  <span className="px-2 py-1 bg-white rounded-md shadow ring-1 ring-gray-200">{fmtBRL(currentMin)}</span>
                </div>
                <div
                  className="absolute -top-2 text-[11px] font-bold text-gray-800"
                  style={{ left: `${pct(currentMax)}%`, transform: 'translate(-50%, -100%)' }}
                >
                  <span className="px-2 py-1 bg-white rounded-md shadow ring-1 ring-gray-200">{currentMax === PRICE_MAX ? 'Sem limite' : fmtBRL(currentMax)}</span>
                </div>
                {/* Rótulos mínimos/máximos nas extremidades */}
                <div className="absolute -bottom-5 left-0 text-[11px] text-gray-500">R$ 0</div>
                <div className="absolute -bottom-5 right-0 text-[11px] text-gray-500">{fmtBRL(PRICE_MAX)}</div>
              </div>
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
            <div className="flex flex-wrap gap-2 pt-0.5">
              {['50', '100', '150', '200'].map(area => (
                <button
                  key={area}
                  onClick={() => onFiltersChange({ ...filters, areaMin: area })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    filters.areaMin === area
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-900 hover:text-white hover:border-gray-900'
                  }`}
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
        <div className="flex items-center justify-between mt-6">
          <button onClick={onClearFilters} className="text-sm text-red-600 hover:text-red-700">Limpar tudo</button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">Aplicar</button>
        </div>
      </div>
      <style jsx>{`
        .range-input { height: 28px; pointer-events: auto; }
        .range-input::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 9999px;
          background: linear-gradient(180deg,#3b82f6,#7c3aed);
          border: 2px solid #fff; box-shadow: 0 1px 6px rgba(0,0,0,.25);
          cursor: pointer; position: relative; z-index: 2;
        }
        .range-input::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 9999px;
          background: linear-gradient(180deg,#3b82f6,#7c3aed);
          border: 2px solid #fff; box-shadow: 0 1px 6px rgba(0,0,0,.25);
          cursor: pointer; position: relative; z-index: 2;
        }
        .range-input::-webkit-slider-runnable-track { height: 2px; background: transparent; }
        .range-input::-moz-range-track { height: 2px; background: transparent; }
      `}</style>
    </div>
  );

  if (compact) {
    if (!open) return null;
    return renderAdvancedPanel();
  }

  return (
    <div className="bg-white border-b border-gray-100 sticky top-20 z-20 shadow-sm mb-6">
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

          {/* (Removido) Botões rápidos de Tipo de imóvel do topo */}

          {/* Controles de 'Quartos' e 'Banheiros' removidos do topo (permanecem no painel avançado) */}

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
              {/* Tipo de imóvel */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-700" />
                  Tipo de imóvel
                </label>
                <div className="flex flex-wrap gap-2">
                  {propertyTypes.slice(1).map((type) => (
                    <button
                      key={type.value}
                      onClick={() => onFiltersChange({ ...filters, type: filters.type === type.value ? '' : type.value })}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        filters.type === type.value
                          ? 'bg-gray-900 text-white border border-gray-900'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Price Range */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-700" />
                  Faixa de Preço
                </label>
                {/* Slider dupla alça (refinado) */}
                <div className="px-1">
                  <div className="relative h-14 select-none">
                    {/* Trilho */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full bg-gray-200" />
                    {/* Faixa selecionada */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-sm"
                      style={{ left: `${pct(currentMin)}%`, right: `${100 - pct(currentMax)}%` }}
                    />
                    {/* Inputs range sobrepostos */}
                    <input
                      type="range"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={PRICE_STEP}
                      value={currentMin}
                      onChange={(e) => {
                        const v = Math.min(Number(e.target.value), currentMax - PRICE_STEP);
                        onFiltersChange({ ...filters, minPrice: String(v) });
                      }}
                      className="range-input absolute left-0 right-0 w-full appearance-none bg-transparent outline-none"
                    />
                    <input
                      type="range"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={PRICE_STEP}
                      value={currentMax}
                      onChange={(e) => {
                        const v = Math.max(Number(e.target.value), currentMin + PRICE_STEP);
                        onFiltersChange({ ...filters, maxPrice: v === PRICE_MAX ? '' : String(v) });
                      }}
                      className="range-input absolute left-0 right-0 w-full appearance-none bg-transparent outline-none"
                    />
                    {/* Chips de valor acima das alças */}
                    <div
                      className="absolute -top-2 text-[11px] font-bold text-gray-800"
                      style={{ left: `${pct(currentMin)}%`, transform: 'translate(-50%, -100%)' }}
                    >
                      <span className="px-2 py-1 bg-white rounded-md shadow ring-1 ring-gray-200">{fmtBRL(currentMin)}</span>
                    </div>
                    <div
                      className="absolute -top-2 text-[11px] font-bold text-gray-800"
                      style={{ left: `${pct(currentMax)}%`, transform: 'translate(-50%, -100%)' }}
                    >
                      <span className="px-2 py-1 bg-white rounded-md shadow ring-1 ring-gray-200">{currentMax === PRICE_MAX ? 'Sem limite' : fmtBRL(currentMax)}</span>
                    </div>
                    {/* Rótulos mínimos/máximos nas extremidades */}
                    <div className="absolute -bottom-5 left-0 text-[11px] text-gray-500">R$ 0</div>
                    <div className="absolute -bottom-5 right-0 text-[11px] text-gray-500">{fmtBRL(PRICE_MAX)}</div>
                  </div>
                  {/* Estilos do input range */}
                  <style jsx>{`
                    .range-input { height: 28px; pointer-events: auto; }
                    .range-input::-webkit-slider-thumb {
                      -webkit-appearance: none; appearance: none;
                      width: 18px; height: 18px; border-radius: 9999px;
                      background: linear-gradient(180deg,#3b82f6,#7c3aed);
                      border: 2px solid #fff; box-shadow: 0 1px 6px rgba(0,0,0,.25);
                      cursor: pointer; position: relative; z-index: 2;
                    }
                    .range-input::-moz-range-thumb {
                      width: 18px; height: 18px; border-radius: 9999px;
                      background: linear-gradient(180deg,#3b82f6,#7c3aed);
                      border: 2px solid #fff; box-shadow: 0 1px 6px rgba(0,0,0,.25);
                      cursor: pointer; position: relative; z-index: 2;
                    }
                    .range-input::-webkit-slider-runnable-track { height: 2px; background: transparent; }
                    .range-input::-moz-range-track { height: 2px; background: transparent; }
                  `}</style>
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
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {['50', '100', '150', '200'].map(area => (
                    <button
                      key={area}
                      onClick={() => onFiltersChange({ ...filters, areaMin: area })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        filters.areaMin === area
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-900 hover:text-white hover:border-gray-900'
                      }`}
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
