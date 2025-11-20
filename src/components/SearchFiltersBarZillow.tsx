"use client";

import { useState } from "react";
import { X, Home, DollarSign, Bed, Bath, Maximize2, Car, PawPrint, Sofa, Waves, Dumbbell, Building2, MapPin } from "lucide-react";

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

type SearchFiltersBarZillowProps = {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
  onApply: () => void;
};

export default function SearchFiltersBarZillow({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  onApply 
}: SearchFiltersBarZillowProps) {
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

  const priceOptions = [
    { label: 'Até R$ 300k', min: '', max: '300000' },
    { label: 'R$ 300k - R$ 500k', min: '300000', max: '500000' },
    { label: 'R$ 500k - R$ 1M', min: '500000', max: '1000000' },
    { label: 'Acima de R$ 1M', min: '1000000', max: '' },
  ];

  const propertyTypes = [
    { value: "HOUSE", label: "Casa", icon: "🏠" },
    { value: "APARTMENT", label: "Apartamento", icon: "🏢" },
    { value: "CONDO", label: "Condomínio", icon: "🏘️" },
    { value: "LAND", label: "Terreno", icon: "🌳" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          
          {/* Quick Filters Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filtros Rápidos</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => {
                  updateFilter('minPrice', '');
                  updateFilter('maxPrice', '500000');
                }}
                className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-full hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                Até R$ 500k
              </button>
              <button 
                onClick={() => updateFilter('bedrooms', '2')}
                className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-full hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                2+ quartos
              </button>
              <button 
                onClick={() => updateFilter('furnished', true)}
                className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-full hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                Mobiliado
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Price Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Preço</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {priceOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    updateFilter('minPrice', option.min);
                    updateFilter('maxPrice', option.max);
                  }}
                  className={`px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    localFilters.minPrice === option.min && localFilters.maxPrice === option.max
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Property Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Tipo de Imóvel</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => updateFilter('type', localFilters.type === type.value ? '' : type.value)}
                  className={`px-4 py-3 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                    localFilters.type === type.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <span className="text-lg">{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Rooms */}
          <div className="space-y-4">
            {/* Bedrooms */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Quartos</h3>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {['', '1', '2', '3', '4', '5+'].map((num) => (
                  <button
                    key={num}
                    onClick={() => updateFilter('bedrooms', num === '5+' ? '5' : num)}
                    className={`py-3 text-sm font-semibold rounded-lg transition-all ${
                      localFilters.bedrooms === (num === '5+' ? '5' : num)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
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
                <Bath className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Banheiros</h3>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['', '1', '2', '3', '4+'].map((num) => (
                  <button
                    key={num}
                    onClick={() => updateFilter('bathrooms', num === '4+' ? '4' : num)}
                    className={`py-3 text-sm font-semibold rounded-lg transition-all ${
                      localFilters.bathrooms === (num === '4+' ? '4' : num)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {num || 'Todos'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* More Filters */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Mais Filtros</h3>
            
            {/* Area */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <Maximize2 className="w-4 h-4" />
                <span>Área mínima</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['50', '100', '150', '200'].map((area) => (
                  <button
                    key={area}
                    onClick={() => updateFilter('areaMin', area)}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      localFilters.areaMin === area
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {area}m²
                  </button>
                ))}
              </div>
            </div>

            {/* Parking */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <Car className="w-4 h-4" />
                <span>Vagas de garagem</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['', '1', '2', '3', '4+'].map((spots) => (
                  <button
                    key={spots}
                    onClick={() => updateFilter('parkingSpots', spots === '4+' ? '4' : spots)}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      localFilters.parkingSpots === (spots === '4+' ? '4' : spots)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {spots || 'Todos'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Amenities */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Comodidades</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateFilter('petFriendly', !localFilters.petFriendly)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  localFilters.petFriendly
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <PawPrint className="w-4 h-4" />
                <span>Aceita Pets</span>
              </button>

              <button
                onClick={() => updateFilter('furnished', !localFilters.furnished)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  localFilters.furnished
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <Sofa className="w-4 h-4" />
                <span>Mobiliado</span>
              </button>

              <button
                onClick={() => updateFilter('hasPool', !localFilters.hasPool)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  localFilters.hasPool
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <Waves className="w-4 h-4" />
                <span>Piscina</span>
              </button>

              <button
                onClick={() => updateFilter('hasGym', !localFilters.hasGym)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  localFilters.hasGym
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <Dumbbell className="w-4 h-4" />
                <span>Academia</span>
              </button>

              <button
                onClick={() => updateFilter('hasElevator', !localFilters.hasElevator)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  localFilters.hasElevator
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Elevador</span>
              </button>

              <button
                onClick={() => updateFilter('hasBalcony', !localFilters.hasBalcony)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  localFilters.hasBalcony
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Varanda</span>
              </button>

              <button
                onClick={() => updateFilter('hasSeaView', !localFilters.hasSeaView)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  localFilters.hasSeaView
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Vista Mar</span>
              </button>
            </div>
          </div>

          {/* Bottom Padding para não ficar atrás do footer */}
          <div className="h-24" />
        </div>
      </div>

      {/* Fixed Footer - Estilo Zillow */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          {/* Clear button */}
          <button
            onClick={handleClear}
            className="text-sm font-semibold text-gray-700 underline hover:text-gray-900 transition-colors"
          >
            Limpar tudo
          </button>

          {/* Apply button */}
          <button
            onClick={handleApply}
            className="flex-1 max-w-[200px] py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all"
          >
            {activeCount > 0 ? `Ver resultados (${activeCount})` : 'Ver resultados'}
          </button>
        </div>
      </div>
    </div>
  );
}
