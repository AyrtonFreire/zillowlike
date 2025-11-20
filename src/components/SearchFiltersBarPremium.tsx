"use client";

import { useState } from "react";
import { X, Home, DollarSign, Bed, Bath, Maximize2, Car, PawPrint, Sofa, Waves, Dumbbell, Building2, MapPin, Sparkles, ShieldCheck, Accessibility, Lightbulb, Eye } from "lucide-react";

type FilterValues = {
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  type: string;
  areaMin: string;
  parkingSpots: string;
  yearBuiltMin: string;
  yearBuiltMax: string;
  status: string;
  petFriendly: boolean;
  furnished: boolean;
  hasPool: boolean;
  hasGym: boolean;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasSeaView: boolean;
  condoFeeMin: string;
  condoFeeMax: string;
  iptuMin: string;
  iptuMax: string;
  keywords: string;
};

type SearchFiltersBarPremiumProps = {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
  onApply: () => void;
};

export default function SearchFiltersBarPremium({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  onApply 
}: SearchFiltersBarPremiumProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const updateFilter = (key: keyof FilterValues, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply();
  };

  const handleClear = () => {
    const cleared: FilterValues = {
      minPrice: '', maxPrice: '', bedrooms: '', bathrooms: '', type: '', areaMin: '',
      parkingSpots: '', yearBuiltMin: '', yearBuiltMax: '', status: '',
      petFriendly: false, furnished: false, hasPool: false, hasGym: false,
      hasElevator: false, hasBalcony: false, hasSeaView: false,
      condoFeeMin: '', condoFeeMax: '', iptuMin: '', iptuMax: '', keywords: ''
    };
    setLocalFilters(cleared);
    onClearFilters();
  };

  const activeCount = Object.entries(localFilters).filter(([_, v]) => v && v !== '').length;

  const propertyTypes = [
    { value: "HOUSE", label: "Casa", icon: "🏛️" },
    { value: "APARTMENT", label: "Apartamento", icon: "🏢" },
    { value: "CONDO", label: "Condomínio", icon: "🏰" },
    { value: "LAND", label: "Terreno", icon: "🌳" },
  ];

  const formatCurrency = (value: string) => {
    if (!value) return '';
    const num = parseInt(value.replace(/\D/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR');
  };

  const parseCurrency = (formatted: string) => {
    return formatted.replace(/\D/g, '');
  };

  // Amenidades organizadas por categoria (estilo James Edition)
  const amenitiesCategories = [
    {
      title: "Lazer & Bem-Estar",
      icon: <Waves className="w-4 h-4" />,
      items: [
        { key: 'hasPool', label: 'Piscina', icon: '🏊' },
        { key: 'hasGym', label: 'Academia', icon: '🏋️' },
      ]
    },
    {
      title: "Conforto & Estrutura",
      icon: <Building2 className="w-4 h-4" />,
      items: [
        { key: 'hasElevator', label: 'Elevador', icon: '🛗' },
        { key: 'hasBalcony', label: 'Varanda', icon: '🌿' },
      ]
    },
    {
      title: "Vistas Privilegiadas",
      icon: <Eye className="w-4 h-4" />,
      items: [
        { key: 'hasSeaView', label: 'Vista Mar', icon: '🌊' },
      ]
    },
    {
      title: "Outros",
      icon: <Sparkles className="w-4 h-4" />,
      items: [
        { key: 'furnished', label: 'Mobiliado', icon: '🛋️' },
        { key: 'petFriendly', label: 'Aceita Pets', icon: '🐾' },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 via-gray-800 to-black">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-6">
          
          {/* Header Premium */}
          <div className="text-center pb-4 border-b border-amber-500/20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-full border border-amber-500/30 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Filtros Premium</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Refine sua busca com precisão</p>
          </div>

          {/* Price Range - Customizável */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Faixa de Preço</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Mínimo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="text"
                    value={formatCurrency(localFilters.minPrice)}
                    onChange={(e) => updateFilter('minPrice', parseCurrency(e.target.value))}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-amber-500/30 rounded-lg text-white placeholder-gray-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Máximo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="text"
                    value={formatCurrency(localFilters.maxPrice)}
                    onChange={(e) => updateFilter('maxPrice', parseCurrency(e.target.value))}
                    placeholder="∞"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-amber-500/30 rounded-lg text-white placeholder-gray-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                  />
                </div>
              </div>
            </div>
            {/* Quick price buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Até 500k', min: '', max: '500000' },
                { label: '500k-1M', min: '500000', max: '1000000' },
                { label: '1M-3M', min: '1000000', max: '3000000' },
                { label: 'Acima 3M', min: '3000000', max: '' },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    updateFilter('minPrice', preset.min);
                    updateFilter('maxPrice', preset.max);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-white/5 border border-gray-700 text-gray-300 rounded-full hover:border-amber-500/50 hover:text-amber-400 transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700/50" />

          {/* Property Type */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Tipo de Imóvel</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => updateFilter('type', localFilters.type === type.value ? '' : type.value)}
                  className={`px-4 py-4 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 ${
                    localFilters.type === type.value
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 border-2 border-amber-400'
                      : 'bg-white/5 border border-gray-700 text-gray-300 hover:border-amber-500/50 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700/50" />

          {/* Rooms */}
          <div className="space-y-5">
            {/* Bedrooms */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Quartos</h3>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {['', '1', '2', '3', '4', '5+'].map((num) => (
                  <button
                    key={num}
                    onClick={() => updateFilter('bedrooms', num === '5+' ? '5' : num)}
                    className={`py-3 text-sm font-semibold rounded-lg transition-all ${
                      localFilters.bedrooms === (num === '5+' ? '5' : num)
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg border-2 border-amber-400'
                        : 'bg-white/5 border border-gray-700 text-gray-300 hover:border-amber-500/50'
                    }`}
                  >
                    {num || 'Todos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bathrooms */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bath className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Banheiros</h3>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['', '1', '2', '3', '4+'].map((num) => (
                  <button
                    key={num}
                    onClick={() => updateFilter('bathrooms', num === '4+' ? '4' : num)}
                    className={`py-3 text-sm font-semibold rounded-lg transition-all ${
                      localFilters.bathrooms === (num === '4+' ? '4' : num)
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg border-2 border-amber-400'
                        : 'bg-white/5 border border-gray-700 text-gray-300 hover:border-amber-500/50'
                    }`}
                  >
                    {num || 'Todos'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700/50" />

          {/* More Filters */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Especificações</h3>
            
            {/* Area */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <Maximize2 className="w-4 h-4" />
                <span>Área mínima</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['50', '100', '150', '200'].map((area) => (
                  <button
                    key={area}
                    onClick={() => updateFilter('areaMin', area)}
                    className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      localFilters.areaMin === area
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg'
                        : 'bg-white/5 border border-gray-700 text-gray-300 hover:border-amber-500/50'
                    }`}
                  >
                    {area}m²
                  </button>
                ))}
              </div>
            </div>

            {/* Parking */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <Car className="w-4 h-4" />
                <span>Vagas de garagem</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['', '1', '2', '3', '4+'].map((spots) => (
                  <button
                    key={spots}
                    onClick={() => updateFilter('parkingSpots', spots === '4+' ? '4' : spots)}
                    className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                      localFilters.parkingSpots === (spots === '4+' ? '4' : spots)
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg'
                        : 'bg-white/5 border border-gray-700 text-gray-300 hover:border-amber-500/50'
                    }`}
                  >
                    {spots || 'Todos'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700/50" />

          {/* Amenities by Category */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Comodidades Premium
            </h3>
            
            {amenitiesCategories.map((category, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {category.icon}
                  <span>{category.title}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {category.items.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => updateFilter(item.key as keyof FilterValues, !localFilters[item.key as keyof FilterValues])}
                      className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                        localFilters[item.key as keyof FilterValues]
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 border-2 border-amber-400'
                          : 'bg-white/5 border border-gray-700 text-gray-300 hover:border-amber-500/50 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Padding */}
          <div className="h-24" />
        </div>
      </div>

      {/* Fixed Footer - Premium Style */}
      <div className="border-t border-amber-500/20 bg-gradient-to-r from-gray-900 via-black to-gray-900 px-5 py-4 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          {/* Clear button */}
          <button
            onClick={handleClear}
            className="text-sm font-semibold text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Limpar
          </button>

          {/* Apply button */}
          <button
            onClick={handleApply}
            className="flex-1 max-w-[240px] py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-lg shadow-lg shadow-amber-500/30 transition-all transform hover:scale-105"
          >
            {activeCount > 0 ? `Aplicar Filtros (${activeCount})` : 'Aplicar Filtros'}
          </button>
        </div>
      </div>
    </div>
  );
}
