"use client";

import { useState, useEffect } from "react";
import { X, Home, DollarSign, Bed, Bath, Maximize2, Car, PawPrint, Sofa, Waves, Dumbbell, Building2, MapPin, Sun, Leaf, Accessibility, Sparkles, Mountain, ArrowUpCircle, Wind } from "lucide-react";
import { buildSearchParams } from "@/lib/url";

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
  // Lazer / Condomínio
  hasPool: boolean;
  hasGym: boolean;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasPlayground: boolean;
  hasPartyRoom: boolean;
  hasGourmet: boolean;
  hasConcierge24h: boolean;
  // Conforto / Energia
  comfortAC: boolean;
  comfortHeating: boolean;
  comfortSolar: boolean;
  comfortNoiseWindows: boolean;
  comfortLED: boolean;
  comfortWaterReuse: boolean;
  // Acessibilidade
  accRamps: boolean;
  accWideDoors: boolean;
  accAccessibleElevator: boolean;
  accTactile: boolean;
  // Acabamentos
  finishCabinets: boolean;
  finishCounterGranite: boolean;
  finishCounterQuartz: boolean;
  // Vista / Posição
  viewSea: boolean;
  viewCity: boolean;
  positionFront: boolean;
  positionBack: boolean;
  // Pets
  petsSmall: boolean;
  petsLarge: boolean;
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
  totalResults?: number;
  // Parâmetros de localização para incluir no preview
  city?: string;
  state?: string;
  search?: string;
};

export default function SearchFiltersBarZillow({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  onApply,
  totalResults,
  city,
  state,
  search
}: SearchFiltersBarZillowProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [previewTotal, setPreviewTotal] = useState<number | undefined>(totalResults);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

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
      petFriendly: false, furnished: false,
      hasPool: false, hasGym: false, hasElevator: false, hasBalcony: false,
      hasPlayground: false, hasPartyRoom: false, hasGourmet: false, hasConcierge24h: false,
      comfortAC: false, comfortHeating: false, comfortSolar: false, comfortNoiseWindows: false,
      comfortLED: false, comfortWaterReuse: false,
      accRamps: false, accWideDoors: false, accAccessibleElevator: false, accTactile: false,
      finishCabinets: false, finishCounterGranite: false, finishCounterQuartz: false,
      viewSea: false, viewCity: false, positionFront: false, positionBack: false,
      petsSmall: false, petsLarge: false,
      condoFeeMin: '', condoFeeMax: '', iptuMin: '', iptuMax: '', keywords: ''
    };
    setLocalFilters(cleared);
    onClearFilters();
  };

  // Buscar preview do total conforme usuário altera filtros localmente
  useEffect(() => {
    const fetchPreviewTotal = async () => {
      setIsLoadingPreview(true);
      try {
        const params = buildSearchParams({
          // Incluir parâmetros de localização
          q: search,
          city,
          state,
          // Filtros locais
          minPrice: localFilters.minPrice,
          maxPrice: localFilters.maxPrice,
          bedroomsMin: localFilters.bedrooms,
          bathroomsMin: localFilters.bathrooms,
          type: localFilters.type,
          areaMin: localFilters.areaMin,
          parkingSpots: localFilters.parkingSpots,
          yearBuiltMin: localFilters.yearBuiltMin,
          yearBuiltMax: localFilters.yearBuiltMax,
          status: localFilters.status,
          petFriendly: localFilters.petFriendly ? 'true' : '',
          furnished: localFilters.furnished ? 'true' : '',
          hasPool: localFilters.hasPool ? 'true' : '',
          hasGym: localFilters.hasGym ? 'true' : '',
          hasElevator: localFilters.hasElevator ? 'true' : '',
          hasBalcony: localFilters.hasBalcony ? 'true' : '',
          hasPlayground: localFilters.hasPlayground ? 'true' : '',
          hasPartyRoom: localFilters.hasPartyRoom ? 'true' : '',
          hasGourmet: localFilters.hasGourmet ? 'true' : '',
          hasConcierge24h: localFilters.hasConcierge24h ? 'true' : '',
          comfortAC: localFilters.comfortAC ? 'true' : '',
          comfortHeating: localFilters.comfortHeating ? 'true' : '',
          comfortSolar: localFilters.comfortSolar ? 'true' : '',
          comfortNoiseWindows: localFilters.comfortNoiseWindows ? 'true' : '',
          comfortLED: localFilters.comfortLED ? 'true' : '',
          comfortWaterReuse: localFilters.comfortWaterReuse ? 'true' : '',
          accRamps: localFilters.accRamps ? 'true' : '',
          accWideDoors: localFilters.accWideDoors ? 'true' : '',
          accAccessibleElevator: localFilters.accAccessibleElevator ? 'true' : '',
          accTactile: localFilters.accTactile ? 'true' : '',
          finishCabinets: localFilters.finishCabinets ? 'true' : '',
          finishCounterGranite: localFilters.finishCounterGranite ? 'true' : '',
          finishCounterQuartz: localFilters.finishCounterQuartz ? 'true' : '',
          viewSea: localFilters.viewSea ? 'true' : '',
          viewCity: localFilters.viewCity ? 'true' : '',
          positionFront: localFilters.positionFront ? 'true' : '',
          positionBack: localFilters.positionBack ? 'true' : '',
          petsSmall: localFilters.petsSmall ? 'true' : '',
          petsLarge: localFilters.petsLarge ? 'true' : '',
          condoFeeMin: localFilters.condoFeeMin,
          condoFeeMax: localFilters.condoFeeMax,
          iptuMin: localFilters.iptuMin,
          iptuMax: localFilters.iptuMax,
          keywords: localFilters.keywords,
          page: 1,
          pageSize: 1 // Apenas para pegar o total
        });
        const res = await fetch(`/api/properties?${params}`);
        const data = await res.json();
        if (data?.success) {
          setPreviewTotal(data.total || 0);
        }
      } catch (error) {
        console.error('Error fetching preview total:', error);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const debounce = setTimeout(fetchPreviewTotal, 500);
    return () => clearTimeout(debounce);
  }, [localFilters]);

  const formatResultsLabel = (count?: number, loading?: boolean) => {
    if (loading) return 'Buscando...';
    if (typeof count !== 'number') return '';
    if (count === 0) return 'Nenhum imóvel encontrado';
    if (count === 1) return '1 imóvel encontrado';
    return `${count} imóveis encontrados`;
  };

  const resultsLabel = formatResultsLabel(previewTotal, isLoadingPreview);

  const propertyTypes = [
    { value: "HOUSE", label: "Casa", icon: "🏠" },
    { value: "APARTMENT", label: "Apartamento", icon: "🏢" },
    { value: "CONDO", label: "Condomínio", icon: "🏘️" },
    { value: "LAND", label: "Terreno", icon: "🌳" },
  ];

  const formatCurrency = (value: string) => {
    if (!value) return '';
    const num = parseInt(value.replace(/\D/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR');
  };

  const parseCurrency = (value: string) => {
    return value.replace(/\D/g, '');
  };

  const AmenityButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'glass-teal text-white shadow-md'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-dark hover:bg-teal-50'
      }`}
    >
      <span className="text-sm">{icon}</span>
      <span className="text-[11px]">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          
          {/* Quick Filters Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filtros Rápidos</h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { updateFilter('minPrice', ''); updateFilter('maxPrice', '500000'); }} className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-full hover:border-teal-dark hover:text-teal-dark transition-colors">
                Até R$ 500k
              </button>
              <button onClick={() => updateFilter('bedrooms', '2')} className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-full hover:border-teal-dark hover:text-teal-dark transition-colors">
                2+ quartos
              </button>
              <button onClick={() => updateFilter('furnished', true)} className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-full hover:border-teal-dark hover:text-teal-dark transition-colors">
                Mobiliado
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Price Range - Customizável */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm font-bold text-gray-900">Faixa de Preço</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Mínimo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={formatCurrency(localFilters.minPrice)}
                    onChange={(e) => updateFilter('minPrice', parseCurrency(e.target.value))}
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Máximo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                  <input
                    type="text"
                    placeholder="Sem limite"
                    value={formatCurrency(localFilters.maxPrice)}
                    onChange={(e) => updateFilter('maxPrice', parseCurrency(e.target.value))}
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                  />
                </div>
              </div>
            </div>
            {/* Atalhos rápidos de preço */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { updateFilter('minPrice', ''); updateFilter('maxPrice', '300000'); }} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">Até 300k</button>
              <button onClick={() => { updateFilter('minPrice', '300000'); updateFilter('maxPrice', '500000'); }} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">300k-500k</button>
              <button onClick={() => { updateFilter('minPrice', '500000'); updateFilter('maxPrice', '1000000'); }} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">500k-1M</button>
              <button onClick={() => { updateFilter('minPrice', '1000000'); updateFilter('maxPrice', ''); }} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">Acima 1M</button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Property Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm font-bold text-gray-900">Tipo de Imóvel</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => updateFilter('type', localFilters.type === type.value ? '' : type.value)}
                  className={`px-4 py-3 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                    localFilters.type === type.value
                      ? 'glass-teal text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-dark hover:bg-teal-50'
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
                <Bed className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-gray-900">Quartos</h3>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {['', '1', '2', '3', '4', '5+'].map((num) => (
                  <button
                    key={num}
                    onClick={() => updateFilter('bedrooms', num === '5+' ? '5' : num)}
                    className={`py-3 text-sm font-semibold rounded-lg transition-all ${
                      localFilters.bedrooms === (num === '5+' ? '5' : num)
                        ? 'glass-teal text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-dark hover:bg-teal-50'
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
                <Bath className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-gray-900">Banheiros</h3>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['', '1', '2', '3', '4+'].map((num) => (
                  <button
                    key={num}
                    onClick={() => updateFilter('bathrooms', num === '4+' ? '4' : num)}
                    className={`py-3 text-sm font-semibold rounded-lg transition-all ${
                      localFilters.bathrooms === (num === '4+' ? '4' : num)
                        ? 'glass-teal text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-dark hover:bg-teal-50'
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
                        ? 'glass-teal text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-dark hover:bg-teal-50'
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
                        ? 'glass-teal text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-dark hover:bg-teal-50'
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

          {/* Comodidades Básicas */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Comodidades Básicas</h3>
            <div className="grid grid-cols-2 gap-2">
              <AmenityButton active={localFilters.petFriendly} onClick={() => updateFilter('petFriendly', !localFilters.petFriendly)} icon={<PawPrint className="w-4 h-4" />} label="Aceita Pets" />
              <AmenityButton active={localFilters.furnished} onClick={() => updateFilter('furnished', !localFilters.furnished)} icon={<Sofa className="w-4 h-4" />} label="Mobiliado" />
            </div>
          </div>

          {/* Lazer e Condomínio */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Waves className="w-4 h-4 text-teal-600" />
              Lazer e Condomínio
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <AmenityButton active={localFilters.hasPool} onClick={() => updateFilter('hasPool', !localFilters.hasPool)} icon="🏊" label="Piscina" />
              <AmenityButton active={localFilters.hasGym} onClick={() => updateFilter('hasGym', !localFilters.hasGym)} icon="🏋️" label="Academia" />
              <AmenityButton active={localFilters.hasElevator} onClick={() => updateFilter('hasElevator', !localFilters.hasElevator)} icon={<Building2 className="w-4 h-4" />} label="Elevador" />
              <AmenityButton active={localFilters.hasBalcony} onClick={() => updateFilter('hasBalcony', !localFilters.hasBalcony)} icon={<Home className="w-4 h-4" />} label="Varanda" />
              <AmenityButton active={localFilters.hasPlayground} onClick={() => updateFilter('hasPlayground', !localFilters.hasPlayground)} icon="🎠" label="Playground" />
              <AmenityButton active={localFilters.hasPartyRoom} onClick={() => updateFilter('hasPartyRoom', !localFilters.hasPartyRoom)} icon="🎉" label="Salão Festas" />
              <AmenityButton active={localFilters.hasGourmet} onClick={() => updateFilter('hasGourmet', !localFilters.hasGourmet)} icon="🍖" label="Espaço Gourmet" />
              <AmenityButton active={localFilters.hasConcierge24h} onClick={() => updateFilter('hasConcierge24h', !localFilters.hasConcierge24h)} icon="🛡️" label="Portaria 24h" />
            </div>
          </div>

          {/* Conforto e Energia */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sun className="w-4 h-4 text-teal-600" />
              Conforto e Energia
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <AmenityButton active={localFilters.comfortAC} onClick={() => updateFilter('comfortAC', !localFilters.comfortAC)} icon={<Wind className="w-4 h-4" />} label="Ar Condicionado" />
              <AmenityButton active={localFilters.comfortHeating} onClick={() => updateFilter('comfortHeating', !localFilters.comfortHeating)} icon="🔥" label="Aquecimento" />
              <AmenityButton active={localFilters.comfortSolar} onClick={() => updateFilter('comfortSolar', !localFilters.comfortSolar)} icon={<Sun className="w-4 h-4" />} label="Energia Solar" />
              <AmenityButton active={localFilters.comfortNoiseWindows} onClick={() => updateFilter('comfortNoiseWindows', !localFilters.comfortNoiseWindows)} icon="🔇" label="Janelas Acústicas" />
              <AmenityButton active={localFilters.comfortLED} onClick={() => updateFilter('comfortLED', !localFilters.comfortLED)} icon="💡" label="Iluminação LED" />
              <AmenityButton active={localFilters.comfortWaterReuse} onClick={() => updateFilter('comfortWaterReuse', !localFilters.comfortWaterReuse)} icon="💧" label="Reuso de Água" />
            </div>
          </div>

          {/* Acessibilidade */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Accessibility className="w-4 h-4 text-teal-600" />
              Acessibilidade
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <AmenityButton active={localFilters.accRamps} onClick={() => updateFilter('accRamps', !localFilters.accRamps)} icon={<Accessibility className="w-4 h-4" />} label="Rampas" />
              <AmenityButton active={localFilters.accWideDoors} onClick={() => updateFilter('accWideDoors', !localFilters.accWideDoors)} icon="🚪" label="Portas Largas" />
              <AmenityButton active={localFilters.accAccessibleElevator} onClick={() => updateFilter('accAccessibleElevator', !localFilters.accAccessibleElevator)} icon={<ArrowUpCircle className="w-4 h-4" />} label="Elevador Acessível" />
              <AmenityButton active={localFilters.accTactile} onClick={() => updateFilter('accTactile', !localFilters.accTactile)} icon="👆" label="Piso Tátil" />
            </div>
          </div>

          {/* Acabamentos */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              Acabamentos
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <AmenityButton active={localFilters.finishCabinets} onClick={() => updateFilter('finishCabinets', !localFilters.finishCabinets)} icon="🗄️" label="Armários Planejados" />
              <AmenityButton active={localFilters.finishCounterGranite} onClick={() => updateFilter('finishCounterGranite', !localFilters.finishCounterGranite)} icon="⬛" label="Bancada Granito" />
              <AmenityButton active={localFilters.finishCounterQuartz} onClick={() => updateFilter('finishCounterQuartz', !localFilters.finishCounterQuartz)} icon="⬜" label="Bancada Quartzo" />
            </div>
          </div>

          {/* Vista e Posição */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Mountain className="w-4 h-4 text-teal-600" />
              Vista e Posição
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <AmenityButton active={localFilters.viewSea} onClick={() => updateFilter('viewSea', !localFilters.viewSea)} icon={<MapPin className="w-4 h-4" />} label="Vista Mar" />
              <AmenityButton active={localFilters.viewCity} onClick={() => updateFilter('viewCity', !localFilters.viewCity)} icon="🌆" label="Vista Cidade" />
              <AmenityButton active={localFilters.positionFront} onClick={() => updateFilter('positionFront', !localFilters.positionFront)} icon="⬆️" label="Posição Frontal" />
              <AmenityButton active={localFilters.positionBack} onClick={() => updateFilter('positionBack', !localFilters.positionBack)} icon="⬇️" label="Posição Fundos" />
            </div>
          </div>

          {/* Pets Específicos */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <PawPrint className="w-4 h-4 text-teal-600" />
              Política de Pets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <AmenityButton active={localFilters.petsSmall} onClick={() => updateFilter('petsSmall', !localFilters.petsSmall)} icon="🐕" label="Pets Pequenos" />
              <AmenityButton active={localFilters.petsLarge} onClick={() => updateFilter('petsLarge', !localFilters.petsLarge)} icon="🐕‍🦺" label="Pets Grandes" />
            </div>
          </div>

          {/* Bottom Padding para não ficar atrás do footer */}
          <div className="h-24" />
        </div>
      </div>

      {/* Fixed Footer - Estilo Zillow */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 shadow-lg">
        {/* Result count - Destacado */}
        {resultsLabel && (
          <div className="mb-3 flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-100">
            <Home className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-semibold text-gray-800">
              {resultsLabel}
            </span>
            {isLoadingPreview && (
              <span className="inline-block w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}
        
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
            className="flex-1 max-w-[200px] py-3 px-6 glass-teal text-white font-semibold rounded-lg shadow-md transition-all hover:scale-105"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
