"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ModernNavbar, HeroSection, PropertyCardPremium } from "@/components/modern";
import Select from "@/components/ui/Select";
import Drawer from "@/components/ui/Drawer";
import Pagination from "@/components/ui/Pagination";
import NeighborhoodGrid from "@/components/NeighborhoodGrid";
import ContinueSearching from "@/components/ContinueSearching";
import Guides from "@/components/Guides";
import SiteFooter from "@/components/Footer";
import Carousel from "@/components/ui/Carousel";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import { LayoutList, Map, ChevronDown, KeyRound, Building2, Briefcase, Search, X } from "lucide-react";

const PropertyDetailsModalJames = dynamic(() => import("@/components/PropertyDetailsModalJames"), { ssr: false });
import SearchFiltersBarZillow from "@/components/SearchFiltersBarZillow";
import Image from "next/image";
import { buildSearchParams, parseFiltersFromSearchParams } from "@/lib/url";
import { track } from "@/lib/analytics";
import type { ApiProperty } from "@/types/api";

type Property = ApiProperty;
const MapWithPriceBubbles = dynamic(() => import("@/components/MapWithPriceBubbles"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const user = (session as any)?.user || null;

  // Estados principais
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [featured, setFeatured] = useState<Property[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [trending, setTrending] = useState<Property[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [newest, setNewest] = useState<Property[]>([]);
  const [newestLoading, setNewestLoading] = useState(true);
  // Explore new categories
  const [furnishedList, setFurnishedList] = useState<Property[]>([]);
  const [furnishedLoading, setFurnishedLoading] = useState(true);
  const [luxuryList, setLuxuryList] = useState<Property[]>([]);
  const [luxuryLoading, setLuxuryLoading] = useState(true);
  const [condoList, setCondoList] = useState<Property[]>([]);
  const [condoLoading, setCondoLoading] = useState(true);
  const [studioList, setStudioList] = useState<Property[]>([]);
  const [studioLoading, setStudioLoading] = useState(true);
  const [landList, setLandList] = useState<Property[]>([]);
  const [landLoading, setLandLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split');
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<'price' | 'beds' | 'type' | 'area' | 'parking' | 'more' | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [nextPage, setNextPage] = useState(2);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Fecha dropdown ao clicar fora ou pressionar ESC
  useEffect(() => {
    if (!filtersOpen) return;
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    const handleClick = (e: Event) => {
      if (!isDesktop) return; // mobile: não fechar ao clicar fora
      if (!filtersRef.current) return;
      const target = e.target as Node | null;
      if (target && !filtersRef.current.contains(target)) {
        setFiltersOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false); // ESC funciona em mobile e desktop
    };
    document.addEventListener('mousedown', handleClick as EventListener, true);
    document.addEventListener('touchstart', handleClick as EventListener, true);
    document.addEventListener('keydown', handleKey as EventListener, true);
    return () => {
      document.removeEventListener('mousedown', handleClick as EventListener, true);
      document.removeEventListener('touchstart', handleClick as EventListener, true);
      document.removeEventListener('keydown', handleKey as EventListener, true);
    };
  }, [filtersOpen]);

  // Fecha activeFilterDropdown ao clicar fora
  useEffect(() => {
    if (!activeFilterDropdown) return;
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Verifica se o clique foi fora do dropdown ativo
      const dropdown = target.closest('.relative');
      if (!dropdown || !dropdown.querySelector(`[data-dropdown="${activeFilterDropdown}"]`)) {
        setActiveFilterDropdown(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveFilterDropdown(null);
    };
    // Pequeno delay para não conflitar com o clique que abre o dropdown
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick as EventListener, true);
      document.addEventListener('touchstart', handleClick as EventListener, true);
      document.addEventListener('keydown', handleKey as EventListener, true);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick as EventListener, true);
      document.removeEventListener('touchstart', handleClick as EventListener, true);
      document.removeEventListener('keydown', handleKey as EventListener, true);
    };
  }, [activeFilterDropdown]);

  // Estados do overlay
  const [overlayId, setOverlayId] = useState<string | null>(null);
  const [overlayItem, setOverlayItem] = useState<Property | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  // Estados de busca e filtros
  const [search, setSearch] = useState(""); // termo aplicado na busca (URL / resultados)
  const [searchInput, setSearchInput] = useState(""); // texto digitado na barra de busca
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [type, setType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedroomsMin, setBedroomsMin] = useState("");
  const [bathroomsMin, setBathroomsMin] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  
  // Novos filtros avançados
  const [parkingSpots, setParkingSpots] = useState("");
  const [yearBuiltMin, setYearBuiltMin] = useState("");
  const [yearBuiltMax, setYearBuiltMax] = useState("");
  const [purpose, setPurpose] = useState("");
  const [petFriendly, setPetFriendly] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [hasGym, setHasGym] = useState(false);
  const [hasElevator, setHasElevator] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [viewSea, setViewSea] = useState(false);
  const [condoFeeMin, setCondoFeeMin] = useState("");
  const [condoFeeMax, setCondoFeeMax] = useState("");
  const [iptuMin, setIptuMin] = useState("");
  const [iptuMax, setIptuMax] = useState("");
  const [keywords, setKeywords] = useState("");
  const [parkingSpotsMin, setParkingSpotsMin] = useState("");
  
  // Novos filtros de amenidades completos
  const [hasPlayground, setHasPlayground] = useState(false);
  const [hasPartyRoom, setHasPartyRoom] = useState(false);
  const [hasGourmet, setHasGourmet] = useState(false);
  const [hasConcierge24h, setHasConcierge24h] = useState(false);
  const [comfortAC, setComfortAC] = useState(false);
  const [comfortHeating, setComfortHeating] = useState(false);
  const [comfortSolar, setComfortSolar] = useState(false);
  const [comfortNoiseWindows, setComfortNoiseWindows] = useState(false);
  const [comfortLED, setComfortLED] = useState(false);
  const [comfortWaterReuse, setComfortWaterReuse] = useState(false);
  const [accRamps, setAccRamps] = useState(false);
  const [accWideDoors, setAccWideDoors] = useState(false);
  const [accAccessibleElevator, setAccAccessibleElevator] = useState(false);
  const [accTactile, setAccTactile] = useState(false);
  const [finishCabinets, setFinishCabinets] = useState(false);
  const [finishCounterGranite, setFinishCounterGranite] = useState(false);
  const [finishCounterQuartz, setFinishCounterQuartz] = useState(false);
  const [viewCity, setViewCity] = useState(false);
  const [positionFront, setPositionFront] = useState(false);
  const [positionBack, setPositionBack] = useState(false);
  const [petsSmall, setPetsSmall] = useState(false);
  const [petsLarge, setPetsLarge] = useState(false);
  
  // Autocomplete para barra de busca
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{label: string; city: string; state: string; neighborhood: string | null; count: number}>>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Parse dos parâmetros da URL
  useEffect(() => {
    const filters = parseFiltersFromSearchParams(searchParams);
    setSearch(filters.q || "");
    setSearchInput(filters.q || "");
    setCity(filters.city || "");
    setState(filters.state || "");
    setType(filters.type || "");
    setMinPrice(filters.minPrice || "");
    setMaxPrice(filters.maxPrice || "");
    setBedroomsMin(filters.bedroomsMin || "");
    setBathroomsMin(filters.bathroomsMin || "");
    setAreaMin(filters.areaMin || "");
    setSort(filters.sort || "recent");
    setPage(filters.page || 1);
    
    // Novos filtros avançados
    setParkingSpots(filters.parkingSpots || "");
    setYearBuiltMin(filters.yearBuiltMin || "");
    setYearBuiltMax(filters.yearBuiltMax || "");
    setPurpose(filters.purpose || "");
    setPetFriendly(filters.petFriendly === "true");
    setFurnished(filters.furnished === "true");
    setHasPool(filters.hasPool === "true");
    setHasGym(filters.hasGym === "true");
    setHasElevator(filters.hasElevator === "true");
    setHasBalcony(filters.hasBalcony === "true");
    setViewSea(filters.viewSea === "true");
    setCondoFeeMin(filters.condoFeeMin || "");
    setCondoFeeMax(filters.condoFeeMax || "");
    setIptuMin(filters.iptuMin || "");
    setIptuMax(filters.iptuMax || "");
    setKeywords(filters.keywords || "");
  }, [searchParams]);

  // Verificar se há busca ativa
  const hasSearched = useMemo(() => {
    return !!(search || city || type || minPrice || maxPrice || bedroomsMin || bathroomsMin || areaMin);
  }, [search, city, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin]);

  // Contar filtros avançados ativos (para o chip "Mais")
  const advancedFiltersCount = useMemo(() => {
    let count = 0;
    if (petFriendly) count++;
    if (furnished) count++;
    if (hasPool) count++;
    if (hasGym) count++;
    if (hasElevator) count++;
    if (hasBalcony) count++;
    if (hasPlayground) count++;
    if (hasPartyRoom) count++;
    if (hasGourmet) count++;
    if (hasConcierge24h) count++;
    if (comfortAC) count++;
    if (comfortHeating) count++;
    if (comfortSolar) count++;
    if (comfortNoiseWindows) count++;
    if (comfortLED) count++;
    if (comfortWaterReuse) count++;
    if (accRamps) count++;
    if (accWideDoors) count++;
    if (accAccessibleElevator) count++;
    if (accTactile) count++;
    if (finishCabinets) count++;
    if (finishCounterGranite) count++;
    if (finishCounterQuartz) count++;
    if (viewSea) count++;
    if (viewCity) count++;
    if (positionFront) count++;
    if (positionBack) count++;
    if (petsSmall) count++;
    if (petsLarge) count++;
    if (condoFeeMin) count++;
    if (condoFeeMax) count++;
    if (iptuMin) count++;
    if (iptuMax) count++;
    if (keywords) count++;
    if (yearBuiltMin) count++;
    if (yearBuiltMax) count++;
    return count;
  }, [
    petFriendly, furnished, hasPool, hasGym, hasElevator, hasBalcony,
    hasPlayground, hasPartyRoom, hasGourmet, hasConcierge24h,
    comfortAC, comfortHeating, comfortSolar, comfortNoiseWindows, comfortLED, comfortWaterReuse,
    accRamps, accWideDoors, accAccessibleElevator, accTactile,
    finishCabinets, finishCounterGranite, finishCounterQuartz,
    viewSea, viewCity, positionFront, positionBack,
    petsSmall, petsLarge, condoFeeMin, condoFeeMax, iptuMin, iptuMax,
    keywords, yearBuiltMin, yearBuiltMax
  ]);

  // Gerar resumo para chips
  const getPriceSummary = () => {
    if (!minPrice && !maxPrice) return 'Preço';
    const formatPrice = (val: string) => {
      const num = parseInt(val);
      if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `R$ ${(num / 1000).toFixed(0)}K`;
      return `R$ ${num.toLocaleString('pt-BR')}`;
    };
    if (minPrice && maxPrice) return `${formatPrice(minPrice)}-${formatPrice(maxPrice)}`;
    if (minPrice) return `Acima de ${formatPrice(minPrice)}`;
    return `Até ${formatPrice(maxPrice)}`;
  };

  const getBedsBathsSummary = () => {
    if (!bedroomsMin && !bathroomsMin) return 'Quartos & Banheiros';
    const parts = [];
    if (bedroomsMin) parts.push(`${bedroomsMin}+ qts`);
    if (bathroomsMin) parts.push(`${bathroomsMin}+ bhs`);
    return parts.join(', ');
  };

  const getTypeSummary = () => {
    if (!type) return 'Tipo de Imóvel';
    const typeMap: Record<string, string> = {
      'HOUSE': 'Casa',
      'APARTMENT': 'Apartamento',
      'CONDO': 'Condomínio',
      'LAND': 'Terreno'
    };
    return typeMap[type] || 'Tipo de Imóvel';
  };

  const getAreaSummary = () => {
    if (!areaMin) return 'Área';
    return `${areaMin}m²+`;
  };

  const getParkingSummary = () => {
    if (!parkingSpots) return 'Vagas';
    return `${parkingSpots} vagas`;
  };

  // Buscar sugestões da API quando o usuário digita na barra de resultados
  useEffect(() => {
    if (!hasSearched) return; // Só quando está na página de resultados
    
    const fetchSuggestions = async () => {
      if (searchInput.length > 0) {
        setIsFetchingSuggestions(true);
        try {
          const response = await fetch(`/api/locations?q=${encodeURIComponent(searchInput)}`);
          const data = await response.json();
          if (data.success) {
            setSearchSuggestions(data.suggestions || []);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSearchSuggestions([]);
        } finally {
          setIsFetchingSuggestions(false);
        }
      } else {
        setSearchSuggestions([]);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchInput, hasSearched]);

  // Fechar autocomplete ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Função para selecionar uma sugestão
  const handleSelectSuggestion = useCallback((suggestion: {label: string; city: string; state: string; neighborhood: string | null}) => {
    setCity(suggestion.city);
    setState(suggestion.state);
    setSearch(suggestion.neighborhood || '');
    setSearchInput(suggestion.neighborhood || '');
    setShowSearchSuggestions(false);
    
    // Fazer a busca imediatamente
    const params = buildSearchParams({ 
      q: suggestion.neighborhood || '', 
      city: suggestion.city, 
      state: suggestion.state, 
      type, 
      minPrice, 
      maxPrice, 
      bedroomsMin, 
      bathroomsMin, 
      areaMin, 
      purpose,
      sort, 
      page: 1 
    });
    router.push(`/?${params}`);
  }, [type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, router]);

  // Aplicar busca quando usuário aperta Enter ou clica na lupa
  const applySearch = useCallback(() => {
    const query = searchInput.trim();
    // Atualiza o termo aplicado para acionar a busca de imóveis
    setSearch(query);

    const params = buildSearchParams({
      q: query,
      city,
      state,
      type,
      minPrice,
      maxPrice,
      bedroomsMin,
      bathroomsMin,
      areaMin,
      purpose,
      sort,
      page: 1
    });

    setShowSearchSuggestions(false);
    router.push(`/?${params}`);
  }, [searchInput, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, router]);

  // Helper para buscar categoria com fallback por localidade (pode receber city/state overrides)
  const fetchCategory = useCallback(async (baseParams: Record<string, any>, loc?: { city?: string; state?: string }) => {
    const p1 = buildSearchParams({
      page: 1,
      pageSize: 12,
      sort: 'recent',
      city: loc?.city ?? city,
      state: loc?.state ?? state,
      ...baseParams,
    });
    try {
      const res = await fetch(`/api/properties?${p1}`);
      const data = await res.json();
      if (data?.properties?.length) return data.properties as Property[];
    } catch {}
    // Fallback sem cidade/estado ou sem resultados
    const p2 = buildSearchParams({ page: 1, pageSize: 12, sort: 'recent', ...baseParams });
    try {
      const res2 = await fetch(`/api/properties?${p2}`);
      const data2 = await res2.json();
      return (data2?.properties || []) as Property[];
    } catch {
      return [] as Property[];
    }
  }, [city, state]);

  // Carregar categorias da seção Explorar (homepage)
  useEffect(() => {
    if (hasSearched) return; // apenas quando não há busca ativa
    let cancelled = false;
    (async () => {
      // Derivar localidade preferida: 1) última da busca (localStorage); 2) cidade do primeiro imóvel numa busca geral; 3) sem localidade
      let preferredCity: string | undefined;
      let preferredState: string | undefined;
      try {
        if (typeof window !== 'undefined') {
          preferredCity = localStorage.getItem('lastCity') || undefined;
          preferredState = localStorage.getItem('lastState') || undefined;
        }
        if (!preferredCity || !preferredState) {
          const res = await fetch('/api/properties?pageSize=1&sort=recent');
          const data = await res.json();
          const first = data?.properties?.[0];
          if (first?.city && first?.state) {
            preferredCity = preferredCity || first.city;
            preferredState = preferredState || first.state;
          }
        }
      } catch {}
      setFurnishedLoading(true); setLuxuryLoading(true); setCondoLoading(true); setStudioLoading(true); setLandLoading(true);
      const [furnished, luxury, condos, studios, lands] = await Promise.all([
        fetchCategory({ furnished: 'true' }, { city: preferredCity, state: preferredState }),
        fetchCategory({ minPrice: '1500000' }, { city: preferredCity, state: preferredState }), // Luxo: R$1,5M+
        fetchCategory({ type: 'CONDO' }, { city: preferredCity, state: preferredState }),
        fetchCategory({ type: 'STUDIO' }, { city: preferredCity, state: preferredState }),
        fetchCategory({ type: 'LAND' }, { city: preferredCity, state: preferredState }),
      ]);
      if (cancelled) return;
      setFurnishedList(furnished); setFurnishedLoading(false);
      setLuxuryList(luxury); setLuxuryLoading(false);
      setCondoList(condos); setCondoLoading(false);
      setStudioList(studios); setStudioLoading(false);
      setLandList(lands); setLandLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchCategory, hasSearched]);

  // Carregar favoritos
  useEffect(() => {
    if (user) {
      fetch('/api/favorites')
        .then(res => res.json())
        .then((data: any) => {
          if (data.success) {
            setFavorites(data.favorites || []);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Carregar propriedades em destaque
  useEffect(() => {
    if (!hasSearched) {
      setFeaturedLoading(true);
      fetch('/api/properties?pageSize=12')
        .then(res => res.json())
        .then((data: any) => {
          if (data.success) {
            setFeatured(data.properties || []);
          }
        })
        .catch(console.error)
        .finally(() => setFeaturedLoading(false));

      // Trending (ex: maior preço)
      setTrendingLoading(true);
      fetch('/api/properties?pageSize=12&sort=price_desc')
        .then(res => res.json())
        .then((data: any) => { if (data.success) setTrending(data.properties || []); })
        .catch(console.error)
        .finally(() => setTrendingLoading(false));

      // Newest (mais recentes)
      setNewestLoading(true);
      fetch('/api/properties?pageSize=12&sort=recent')
        .then(res => res.json())
        .then((data: any) => { if (data.success) setNewest(data.properties || []); })
        .catch(console.error)
        .finally(() => setNewestLoading(false));
    }
  }, [hasSearched]);

  // Carregar propriedades baseado na busca
  useEffect(() => {
    if (!hasSearched) {
      setSearchError(null);
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    const params = buildSearchParams({
      q: search,
      city,
      state,
      type,
      minPrice,
      maxPrice,
      bedroomsMin,
      bathroomsMin,
      areaMin,
      parkingSpots,
      yearBuiltMin,
      yearBuiltMax,
      purpose,
      petFriendly: petFriendly ? "true" : "",
      furnished: furnished ? "true" : "",
      hasPool: hasPool ? "true" : "",
      hasGym: hasGym ? "true" : "",
      hasElevator: hasElevator ? "true" : "",
      hasBalcony: hasBalcony ? "true" : "",
      hasPlayground: hasPlayground ? "true" : "",
      hasPartyRoom: hasPartyRoom ? "true" : "",
      hasGourmet: hasGourmet ? "true" : "",
      hasConcierge24h: hasConcierge24h ? "true" : "",
      comfortAC: comfortAC ? "true" : "",
      comfortHeating: comfortHeating ? "true" : "",
      comfortSolar: comfortSolar ? "true" : "",
      comfortNoiseWindows: comfortNoiseWindows ? "true" : "",
      comfortLED: comfortLED ? "true" : "",
      comfortWaterReuse: comfortWaterReuse ? "true" : "",
      accRamps: accRamps ? "true" : "",
      accWideDoors: accWideDoors ? "true" : "",
      accAccessibleElevator: accAccessibleElevator ? "true" : "",
      accTactile: accTactile ? "true" : "",
      finishCabinets: finishCabinets ? "true" : "",
      finishCounterGranite: finishCounterGranite ? "true" : "",
      finishCounterQuartz: finishCounterQuartz ? "true" : "",
      viewSea: viewSea ? "true" : "",
      viewCity: viewCity ? "true" : "",
      positionFront: positionFront ? "true" : "",
      positionBack: positionBack ? "true" : "",
      petsSmall: petsSmall ? "true" : "",
      petsLarge: petsLarge ? "true" : "",
      condoFeeMin,
      condoFeeMax,
      iptuMin,
      iptuMax,
      keywords,
      sort,
      page,
      pageSize: 12
    });

    fetch(`/api/properties?${params}`)
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error('Search failed (HTTP error):', { purpose: res.status, statusText: res.statusText, body: text });
          setSearchError('Não conseguimos carregar os imóveis agora. Se quiser, tente novamente em alguns instantes.');
          return null;
        }
        try {
          return await res.json();
        } catch (err) {
          console.error('Search failed (JSON parse error):', err);
          setSearchError('Não conseguimos carregar os imóveis agora. Se quiser, tente novamente em alguns instantes.');
          return null;
        }
      })
      .then((data: any) => {
        if (!data) {
          setProperties([]);
          setTotal(0);
          return;
        }
        if (data.success) {
          setProperties(data.properties || []);
          setTotal(data.total || 0);
          setNextPage(2);
          setSearchError(null);
          try {
            const labelParts: string[] = [];
            if (city) labelParts.push(city);
            if (state) labelParts.push(state);
            if (type) labelParts.push(type === 'HOUSE' ? 'Casa' : type === 'APARTMENT' ? 'Apartamento' : type);
            const label = labelParts.length ? labelParts.join(', ') : 'Sua última busca';
            localStorage.setItem('lastSearch', JSON.stringify({ label, params: params.toString() }));
          } catch {}
        } else {
          console.error('Search failed (no success flag):', data);
          setProperties([]);
          setTotal(0);
          setSearchError('Não conseguimos carregar os imóveis agora. Se quiser, tente novamente em alguns instantes.');
        }
      })
      .catch(err => {
        console.error('Search failed (network error):', err);
        setProperties([]);
        setTotal(0);
        setSearchError('Não conseguimos carregar os imóveis agora. Se quiser, tente novamente em alguns instantes.');
      })
      .finally(() => setIsLoading(false));
  }, [
    hasSearched,
    search,
    city,
    state,
    type,
    minPrice,
    maxPrice,
    bedroomsMin,
    bathroomsMin,
    areaMin,
    parkingSpots,
    yearBuiltMin,
    yearBuiltMax,
    purpose,
    petFriendly,
    furnished,
    hasPool,
    hasGym,
    hasElevator,
    hasBalcony,
    hasPlayground,
    hasPartyRoom,
    hasGourmet,
    hasConcierge24h,
    comfortAC,
    comfortHeating,
    comfortSolar,
    comfortNoiseWindows,
    comfortLED,
    comfortWaterReuse,
    accRamps,
    accWideDoors,
    accAccessibleElevator,
    accTactile,
    finishCabinets,
    finishCounterGranite,
    finishCounterQuartz,
    viewSea,
    viewCity,
    positionFront,
    positionBack,
    petsSmall,
    petsLarge,
    condoFeeMin,
    condoFeeMax,
    iptuMin,
    iptuMax,
    keywords,
    sort,
    page,
  ]);

  const loadMore = async () => {
    if (isLoadingMore) return;
    if (properties.length >= total) return;
    setIsLoadingMore(true);
    try {
      const params = buildSearchParams({
        q: search,
        city,
        state,
        type,
        minPrice,
        maxPrice,
        bedroomsMin,
        bathroomsMin,
        areaMin,
        parkingSpots,
        yearBuiltMin,
        yearBuiltMax,
        purpose,
        petFriendly: petFriendly ? "true" : "",
        furnished: furnished ? "true" : "",
        hasPool: hasPool ? "true" : "",
        hasGym: hasGym ? "true" : "",
        hasElevator: hasElevator ? "true" : "",
        hasBalcony: hasBalcony ? "true" : "",
        hasPlayground: hasPlayground ? "true" : "",
        hasPartyRoom: hasPartyRoom ? "true" : "",
        hasGourmet: hasGourmet ? "true" : "",
        hasConcierge24h: hasConcierge24h ? "true" : "",
        comfortAC: comfortAC ? "true" : "",
        comfortHeating: comfortHeating ? "true" : "",
        comfortSolar: comfortSolar ? "true" : "",
        comfortNoiseWindows: comfortNoiseWindows ? "true" : "",
        comfortLED: comfortLED ? "true" : "",
        comfortWaterReuse: comfortWaterReuse ? "true" : "",
        accRamps: accRamps ? "true" : "",
        accWideDoors: accWideDoors ? "true" : "",
        accAccessibleElevator: accAccessibleElevator ? "true" : "",
        accTactile: accTactile ? "true" : "",
        finishCabinets: finishCabinets ? "true" : "",
        finishCounterGranite: finishCounterGranite ? "true" : "",
        finishCounterQuartz: finishCounterQuartz ? "true" : "",
        viewSea: viewSea ? "true" : "",
        viewCity: viewCity ? "true" : "",
        positionFront: positionFront ? "true" : "",
        positionBack: positionBack ? "true" : "",
        petsSmall: petsSmall ? "true" : "",
        petsLarge: petsLarge ? "true" : "",
        condoFeeMin,
        condoFeeMax,
        iptuMin,
        iptuMax,
        keywords,
        sort,
        page: nextPage,
        pageSize: 12,
      });
      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      if (data?.success) {
        setProperties((prev) => [...prev, ...(data.properties || [])]);
        setNextPage((p) => p + 1);
        if ((data.properties || []).length === 0) {
          setTotal(prev => prev); // noop
        }
      }
    } catch (e) {
      console.error('Load more failed', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Ouvir eventos de destaque vindos do mapa
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const id = ce?.detail?.id ?? null;
      setHoverId(id);
    };
    window.addEventListener('list-highlight-card', handler as EventListener);
    return () => window.removeEventListener('list-highlight-card', handler as EventListener);
  }, []);

  // Funções de controle
  const toggleFavorite = useCallback(async (propertyId: string) => {
    if (!user) {
      // Redirecionar para login se não estiver autenticado
      router.push('/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      const method = favorites.includes(propertyId) ? 'DELETE' : 'POST';
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId })
      });

      if (res.ok) {
        setFavorites(prev => 
          method === 'POST' 
            ? [...prev, propertyId]
            : prev.filter(id => id !== propertyId)
        );
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [user, favorites, router]);

  const openOverlay = useCallback(async (propertyId: string) => {
    try { track({ name: 'card_click', id: propertyId }); } catch {}
    setOverlayId(propertyId);
    setOverlayOpen(true);
    setOverlayLoading(true);

    try {
      const res = await fetch(`/api/properties?id=${propertyId}`);
      const data = await res.json();
      
      if (data.item) {
        setOverlayItem(data.item);
      }
    } catch (error) {
      console.error('Error loading property:', error);
    } finally {
      setOverlayLoading(false);
    }
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    setOverlayId(null);
    setOverlayItem(null);
  }, []);

  // Listen for open-overlay events from ContinueSearching
  useEffect(() => {
    const handleOpenOverlay = (e: CustomEvent) => {
      if (e.detail?.id) {
        openOverlay(e.detail.id);
      }
    };
    window.addEventListener('open-overlay', handleOpenOverlay as EventListener);
    return () => window.removeEventListener('open-overlay', handleOpenOverlay as EventListener);
  }, [openOverlay]);

  // Intercept clicks on links to /property/:id to open overlay instead of navigating
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // ignore if overlay is not available
      if (!openOverlay) return;
      // only left click without modifiers
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== 'A') el = el.parentElement;
      if (!el || el.tagName !== 'A') return;
      const a = el as HTMLAnchorElement;
      try {
        const url = new URL(a.href, window.location.origin);
        if (url.origin !== window.location.origin) return; // external
        const m = url.pathname.match(/^\/property\/(.+)$/);
        if (!m) return;
        const id = m[1];
        if (!id) return;
        e.preventDefault();
        openOverlay(id);
      } catch {}
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [openOverlay]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar sempre visível */}
      {!hasSearched && (
        <div className="relative">
          <HeroSection />
          <div className="absolute inset-x-0 top-0 z-[250]">
            <ModernNavbar />
          </div>
        </div>
      )}
      {hasSearched && (
        <div className="z-50">
          <ModernNavbar forceLight={true} />
        </div>
      )}

      {!hasSearched && <ContinueSearching />}

      {/* Perfis principais: comprador, proprietário, corretor */}
      {!hasSearched && (
        <div className="bg-gradient-to-b from-gray-100 via-gray-100 to-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
            <div className="max-w-4xl mx-auto mb-10 sm:mb-12 px-1 sm:px-0">
              <p className="text-xs sm:text-sm font-semibold tracking-[0.18em] text-teal-600 uppercase text-left">
                Para quem é o Zillowlike
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-display text-gray-900 text-left">
                Três formas de usar a plataforma
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-xl text-left">
                Um lugar único para quem busca um lar, para quem quer anunciar com agilidade
                e para corretores que desejem um hub para seus negócios
              </p>
            </div>

            <div className="grid gap-6 md:gap-8 md:grid-cols-3 items-stretch">
              {/* Comprador / locatário */}
              <div className="relative flex">
                <div className="relative bg-[#f5f2ec] rounded-[32px] shadow-[0_26px_70px_rgba(15,23,42,0.22)] overflow-hidden flex flex-col h-full w-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_90px_rgba(15,23,42,0.28)]">
                  {/* Faixa colorida + foto circular recortada */}
                  <div className="relative h-40 bg-teal-700">
                    <div className="absolute left-1/2 bottom-0 translate-y-1/2 -translate-x-1/2 h-32 w-32 sm:h-36 sm:w-36 rounded-full overflow-hidden border-[6px] border-[#f5f2ec] shadow-[0_18px_45px_rgba(15,23,42,0.45)] bg-teal-500">
                      <Image
                        src="https://images.unsplash.com/photo-1600585154340-0ef3c08c0632?auto=format&fit=crop&w=800&q=80"
                        alt="Casal feliz comemorando novo imóvel"
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  {/* Conteúdo */}
                  <div className="flex flex-col flex-1 items-center text-center px-7 sm:px-8 pt-20 pb-9">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                      Quero encontrar um imóvel
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                      Explore casas e apartamentos com informações claras, facilidade de busca e agenda de visitas simples.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          const el = document.getElementById("explorar");
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
                      className="mt-2 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold border border-teal-600 text-teal-700 hover:bg-teal-50 transition-all"
                    >
                      Explorar imóveis
                    </button>
                  </div>
                </div>
              </div>

              {/* Proprietário */}
              <div className="relative flex">
                <div className="relative bg-[#f5f2ec] rounded-[32px] shadow-[0_26px_70px_rgba(15,23,42,0.22)] overflow-hidden flex flex-col h-full w-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_90px_rgba(15,23,42,0.28)]">
                  {/* Faixa colorida + foto circular recortada */}
                  <div className="relative h-40 bg-amber-700">
                    <div className="absolute left-1/2 bottom-0 translate-y-1/2 -translate-x-1/2 h-32 w-32 sm:h-36 sm:w-36 rounded-full overflow-hidden border-[6px] border-[#f5f2ec] shadow-[0_18px_45px_rgba(15,23,42,0.45)] bg-amber-500">
                      <Image
                        src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80"
                        alt="Fachada de uma casa moderna e bem iluminada"
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  {/* Conteúdo */}
                  <div className="flex flex-col flex-1 items-center text-center px-7 sm:px-8 pt-20 pb-9">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                      Quero vender ou alugar meu imóvel
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                      Anuncie seu imóvel com enorme visibilidade para toda região, caso queira praticidade, unimos o interessado no seu imóvel a um corretor responsável pela intermediação da venda.
                    </p>
                    <Link
                      href="/owner"
                      className="mt-2 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold border border-amber-600 text-amber-700 hover:bg-amber-50 transition-all"
                    >
                      Acessar área do proprietário
                    </Link>
                  </div>
                </div>
              </div>

              {/* Corretor */}
              <div className="relative flex">
                <div className="relative bg-[#f5f2ec] rounded-[32px] shadow-[0_26px_70px_rgba(15,23,42,0.22)] overflow-hidden flex flex-col h-full w-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_90px_rgba(15,23,42,0.28)]">
                  {/* Faixa colorida + foto circular recortada */}
                  <div className="relative h-40 bg-indigo-900">
                    <div className="absolute left-1/2 bottom-0 translate-y-1/2 -translate-x-1/2 h-32 w-32 sm:h-36 sm:w-36 rounded-full overflow-hidden border-[6px] border-[#f5f2ec] shadow-[0_18px_45px_rgba(15,23,42,0.45)] bg-indigo-600">
                      <Image
                        src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80"
                        alt="Corretor de imóveis sorrindo em frente a um fundo roxo"
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  {/* Conteúdo */}
                  <div className="flex flex-col flex-1 items-center text-center px-7 sm:px-8 pt-20 pb-9">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                      Sou corretor(a)
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                      Organize imóveis, leads e visitas em um dashboard pensado para qualidade de atendimento e,caso seja do seu interesse, indicaremos você para um possível comprador de imóveis postados por pessoa física
                    </p>
                    <Link
                      href="/onboarding"
                      className="mt-2 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold border border-indigo-600 text-indigo-700 hover:bg-indigo-50 transition-all"
                    >
                      Cadastre-se como corretor(a) no site
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SearchHeaderJE removido - usando apenas barra Zillow abaixo */}

      

      {/* Continue Searching removido */}


      {/* Search Results - Split Screen Layout */}
      {hasSearched && (
        <>
          {/* Zillow-style Search Bar - Full Width Above Everything */}
          <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
              <div className="px-4 py-3 bg-white">
                {/* Desktop: Search bar + Inline Filters in one row */}
                <div className="hidden md:flex items-center gap-3">
                  {/* Compact Search Bar - Left Side */}
                  <div ref={searchInputRef} className="w-80 relative">
                    <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors">
                      <Search className="w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => {
                          setSearchInput(e.target.value);
                          setShowSearchSuggestions(true);
                        }}
                        onFocus={() => setShowSearchSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            applySearch();
                          }
                        }}
                        placeholder="Endereço, cidade..."
                        className="flex-1 outline-none text-sm"
                      />
                      <button
                        onClick={() => {
                          applySearch();
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        aria-label="Buscar"
                      >
                        <Search className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    
                    {/* Autocomplete Dropdown */}
                    {showSearchSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
                        {searchSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{suggestion.label}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {suggestion.city}, {suggestion.state}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400 ml-2">
                                {suggestion.count} {suggestion.count === 1 ? 'imóvel' : 'imóveis'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Filter Buttons - Right Side (Desktop) */}
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                  {/* Finalidade: Para venda / Para alugar */}
                  <select
                    value={purpose || "SALE"}
                    onChange={(e) => {
                      const newPurpose = e.target.value as "SALE" | "RENT";
                      setPurpose(newPurpose);
                      const params = buildSearchParams({ q: search, city, state, purpose: newPurpose, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, sort, page: 1 });
                      router.push(`/?${params}`);
                    }}
                    className={`px-3 py-2 rounded-full text-sm font-semibold cursor-pointer border transition-colors ${
                      (purpose || "SALE") === "SALE" || (purpose || "SALE") === "RENT"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-emerald-400"
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <option value="SALE">Para venda</option>
                    <option value="RENT">Para alugar</option>
                  </select>

                  {/* Price */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'price' ? null : 'price')}
                      data-dropdown="price"
                      className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        (minPrice || maxPrice)
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-emerald-400'
                          : activeFilterDropdown === 'price'
                          ? 'border-blue-600 bg-blue-50'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span>{getPriceSummary()}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Price Dropdown */}
                    {activeFilterDropdown === 'price' && (
                      <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Faixa de Preço</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <input
                                  type="number"
                                  placeholder="Mín"
                                  value={minPrice}
                                  onChange={(e) => setMinPrice(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <input
                                  type="number"
                                  placeholder="Máx"
                                  value={maxPrice}
                                  onChange={(e) => setMaxPrice(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => {
                                setMinPrice('');
                                setMaxPrice('');
                                setActiveFilterDropdown(null);
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                              Limpar
                            </button>
                            <button
                              onClick={() => {
                                const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                                router.push(`/?${params}`);
                                setActiveFilterDropdown(null);
                              }}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Beds & Baths */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'beds' ? null : 'beds')}
                      data-dropdown="beds"
                      className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        (bedroomsMin || bathroomsMin)
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-emerald-400'
                          : activeFilterDropdown === 'beds'
                          ? 'border-blue-600 bg-blue-50'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span>{getBedsBathsSummary()}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Beds & Baths Dropdown */}
                    {activeFilterDropdown === 'beds' && (
                      <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quartos (mínimo)</label>
                            <div className="grid grid-cols-6 gap-2">
                              {['', '1', '2', '3', '4', '5+'].map((num) => (
                                <button
                                  key={num}
                                  onClick={() => setBedroomsMin(num)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                    bedroomsMin === num
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-gray-300 hover:border-blue-600'
                                  }`}
                                >
                                  {num || 'Qualquer'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Banheiros (mínimo)</label>
                            <div className="grid grid-cols-6 gap-2">
                              {['', '1', '2', '3', '4', '5+'].map((num) => (
                                <button
                                  key={num}
                                  onClick={() => setBathroomsMin(num)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                    bathroomsMin === num
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-gray-300 hover:border-blue-600'
                                  }`}
                                >
                                  {num || 'Qualquer'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => {
                                setBedroomsMin('');
                                setBathroomsMin('');
                                setActiveFilterDropdown(null);
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                              Limpar
                            </button>
                            <button
                              onClick={() => {
                                const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                                router.push(`/?${params}`);
                                setActiveFilterDropdown(null);
                              }}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Home Type */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'type' ? null : 'type')}
                      data-dropdown="type"
                      className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        type
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-emerald-400'
                          : activeFilterDropdown === 'type'
                          ? 'border-blue-600 bg-blue-50'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span>{getTypeSummary()}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Type Dropdown */}
                    {activeFilterDropdown === 'type' && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                        <div className="space-y-2">
                          {[
                            { value: '', label: 'Todos' },
                            { value: 'HOUSE', label: 'Casa' },
                            { value: 'APARTMENT', label: 'Apartamento' },
                            { value: 'CONDO', label: 'Condomínio' },
                            { value: 'LAND', label: 'Terreno' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setType(option.value);
                                const params = buildSearchParams({ q: search, city, state, type: option.value, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                                router.push(`/?${params}`);
                                setActiveFilterDropdown(null);
                              }}
                              className={`w-full px-4 py-2 rounded-lg text-left text-sm font-medium ${
                                type === option.value
                                  ? 'bg-blue-600 text-white'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Area Filter */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'area' ? null : 'area')}
                      data-dropdown="area"
                      className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        areaMin
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-emerald-400'
                          : activeFilterDropdown === 'area'
                          ? 'border-blue-600 bg-blue-50'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span>{getAreaSummary()}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Area Dropdown */}
                    {activeFilterDropdown === 'area' && (
                      <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Área Mínima (m²)</label>
                            <input
                              type="number"
                              placeholder="Ex: 50"
                              value={areaMin}
                              onChange={(e) => setAreaMin(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => {
                                setAreaMin('');
                                setActiveFilterDropdown(null);
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                              Limpar
                            </button>
                            <button
                              onClick={() => {
                                const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                                router.push(`/?${params}`);
                                setActiveFilterDropdown(null);
                              }}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Parking Spots Filter */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'parking' ? null : 'parking')}
                      data-dropdown="parking"
                      className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        parkingSpots
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-emerald-400'
                          : activeFilterDropdown === 'parking'
                          ? 'border-blue-600 bg-blue-50'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span>{getParkingSummary()}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Parking Dropdown */}
                    {activeFilterDropdown === 'parking' && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                        <div className="space-y-2">
                          {['1+', '2+', '3+', '4+'].map((spots) => (
                            <button
                              key={spots}
                              onClick={() => {
                                setParkingSpots(spots);
                                const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, parkingSpots: spots, purpose, sort, page: 1 });
                                router.push(`/?${params}`);
                                setActiveFilterDropdown(null);
                              }}
                              className={`w-full px-4 py-2 rounded-lg text-left text-sm font-medium ${
                                parkingSpots === spots
                                  ? 'bg-blue-600 text-white'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              {spots} vagas
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* More Filters - abre o mesmo drawer avançado usado no mobile */}
                  <div className="relative">
                    <button
                      onClick={() => setFiltersOpen(true)}
                      className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        advancedFiltersCount > 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-emerald-400'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span>Mais{advancedFiltersCount > 0 ? ` (${advancedFiltersCount})` : ''}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  </div>
                </div>

                {/* Mobile: filtro de finalidade + Search bar + botão Filtros */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newPurpose: "SALE" = "SALE";
                        setPurpose(newPurpose);
                        const params = buildSearchParams({ q: search, city, state, purpose: newPurpose, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${
                        purpose === 'SALE'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Para venda
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newPurpose: "RENT" = "RENT";
                        setPurpose(newPurpose);
                        const params = buildSearchParams({ q: search, city, state, purpose: newPurpose, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${
                        purpose === 'RENT'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Para alugar
                    </button>
                  </div>

                  <div className="flex items-center gap-2 relative">
                    {/* Search Bar com Autocomplete */}
                    <div className="flex-1 relative">
                      <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchInput}
                          onChange={(e) => {
                            setSearchInput(e.target.value);
                            setShowSearchSuggestions(true);
                          }}
                          onFocus={() => setShowSearchSuggestions(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              applySearch();
                            }
                          }}
                          placeholder="Cidade, bairro..."
                          className="flex-1 outline-none text-sm"
                        />
                        <button
                          onClick={() => {
                            applySearch();
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          aria-label="Buscar"
                        >
                          <Search className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      
                      {/* Autocomplete Dropdown Mobile */}
                      {showSearchSuggestions && searchSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
                          {searchSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectSuggestion(suggestion)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{suggestion.label}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {suggestion.city}, {suggestion.state}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 ml-2">
                                  {suggestion.count} {suggestion.count === 1 ? 'imóvel' : 'imóveis'}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* More Button (abre drawer com todos os filtros) */}
                    <button
                      onClick={() => setFiltersOpen(true)}
                      className={`px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        advancedFiltersCount > 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-emerald-400'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      Filtros{advancedFiltersCount > 0 ? ` (${advancedFiltersCount})` : ''}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filters Chips - Logo abaixo da barra de busca (desktop e mobile) - oculto, versão principal fica na sessão de resultados */}
              <div className="hidden px-4 sm:px-6 lg:px-8 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 mr-1">Filtros ativos:</span>
                  
                  {/* Localização (cidade / busca) */}
                  {(city || search) && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>
                        {search
                          ? search
                          : `${city}${state ? `, ${state}` : ''}`}
                      </span>
                      <button
                        onClick={() => {
                          setSearch('');
                          setCity('');
                          setState('');
                          const params = buildSearchParams({ type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Tipo de imóvel */}
                  {type && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>{type === 'HOUSE' ? 'Casa' : type === 'APARTMENT' ? 'Apartamento' : type === 'CONDO' ? 'Condomínio' : 'Terreno'}</span>
                      <button
                        onClick={() => {
                          setType('');
                          const params = buildSearchParams({ q: search, city, state, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Preço mínimo */}
                  {minPrice && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>Min: R$ {parseInt(minPrice).toLocaleString('pt-BR')}</span>
                      <button
                        onClick={() => {
                          setMinPrice('');
                          const params = buildSearchParams({ q: search, city, state, type, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Preço máximo */}
                  {maxPrice && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>Max: R$ {parseInt(maxPrice).toLocaleString('pt-BR')}</span>
                      <button
                        onClick={() => {
                          setMaxPrice('');
                          const params = buildSearchParams({ q: search, city, state, type, minPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Quartos */}
                  {bedroomsMin && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>{bedroomsMin}+ quartos</span>
                      <button
                        onClick={() => {
                          setBedroomsMin('');
                          const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bathroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Banheiros */}
                  {bathroomsMin && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>{bathroomsMin}+ banheiros</span>
                      <button
                        onClick={() => {
                          setBathroomsMin('');
                          const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Pet Friendly */}
                  {petFriendly && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>Aceita Pets</span>
                      <button
                        onClick={() => {
                          setPetFriendly(false);
                          const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Mobiliado */}
                  {furnished && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>Mobiliado</span>
                      <button
                        onClick={() => {
                          setFurnished(false);
                          const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Piscina */}
                  {hasPool && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>Piscina</span>
                      <button
                        onClick={() => {
                          setHasPool(false);
                          const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Academia */}
                  {hasGym && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                      <span>Academia</span>
                      <button
                        onClick={() => {
                          setHasGym(false);
                          const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                          router.push(`/?${params}`);
                        }}
                        className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
          </div>

          {/* Split Screen Container */}
          <div className={viewMode === 'split' ? 'lg:flex lg:h-[calc(100vh-140px)]' : 'lg:h-[calc(100vh-140px)]'}>
            {/* Left Side - Property List */}
            <div className={viewMode === 'split' ? 'w-full lg:w-1/2 lg:overflow-y-auto' : 'w-full lg:w-full lg:overflow-y-auto'}>
              <div className="pt-8 pb-20 px-4 sm:pt-8 sm:pb-24 sm:px-6 lg:px-8">
              {/* Results Counter + Sort */}
              <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {total > 0 ? `${properties.length} de ${total.toLocaleString('pt-BR')} imóveis` : 'Nenhum imóvel encontrado'}
                </h2>
                {total > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Ordenar por</span>
                    <select
                      value={sort}
                      onChange={(e) => {
                        const newSort = e.target.value;
                        setSort(newSort);
                        const params = buildSearchParams({
                          q: search,
                          city,
                          state,
                          type,
                          minPrice,
                          maxPrice,
                          bedroomsMin,
                          bathroomsMin,
                          areaMin,
                          parkingSpots,
                          yearBuiltMin,
                          yearBuiltMax,
                          purpose,
                          petFriendly: petFriendly ? 'true' : '',
                          furnished: furnished ? 'true' : '',
                          hasPool: hasPool ? 'true' : '',
                          hasGym: hasGym ? 'true' : '',
                          hasElevator: hasElevator ? 'true' : '',
                          hasBalcony: hasBalcony ? 'true' : '',
                          hasPlayground: hasPlayground ? 'true' : '',
                          hasPartyRoom: hasPartyRoom ? 'true' : '',
                          hasGourmet: hasGourmet ? 'true' : '',
                          hasConcierge24h: hasConcierge24h ? 'true' : '',
                          comfortAC: comfortAC ? 'true' : '',
                          comfortHeating: comfortHeating ? 'true' : '',
                          comfortSolar: comfortSolar ? 'true' : '',
                          comfortNoiseWindows: comfortNoiseWindows ? 'true' : '',
                          comfortLED: comfortLED ? 'true' : '',
                          comfortWaterReuse: comfortWaterReuse ? 'true' : '',
                          accRamps: accRamps ? 'true' : '',
                          accWideDoors: accWideDoors ? 'true' : '',
                          accAccessibleElevator: accAccessibleElevator ? 'true' : '',
                          accTactile: accTactile ? 'true' : '',
                          finishCabinets: finishCabinets ? 'true' : '',
                          finishCounterGranite: finishCounterGranite ? 'true' : '',
                          finishCounterQuartz: finishCounterQuartz ? 'true' : '',
                          viewSea: viewSea ? 'true' : '',
                          viewCity: viewCity ? 'true' : '',
                          positionFront: positionFront ? 'true' : '',
                          positionBack: positionBack ? 'true' : '',
                          petsSmall: petsSmall ? 'true' : '',
                          petsLarge: petsLarge ? 'true' : '',
                          condoFeeMin,
                          condoFeeMax,
                          iptuMin,
                          iptuMax,
                          keywords,
                          sort: newSort,
                          page: 1,
                        });
                        router.push(`/?${params}`);
                      }}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm font-medium hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="recent">Mais recentes</option>
                      <option value="price_asc">Menor preço</option>
                      <option value="price_desc">Maior preço</option>
                      <option value="area_desc">Maior área</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Active Filters Chips - agora abaixo do contador de resultados (desktop e mobile) */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 mr-1">Filtros ativos:</span>
                
                {/* Localização (cidade / busca) */}
                {(city || search) && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>
                      {search
                        ? search
                        : `${city}${state ? `, ${state}` : ''}`}
                    </span>
                    <button
                      onClick={() => {
                        setSearch('');
                        setCity('');
                        setState('');
                        const params = buildSearchParams({ type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Finalidade (venda / aluguel) */}
                {purpose && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>{purpose === 'RENT' ? 'Para alugar' : 'Para venda'}</span>
                    <button
                      onClick={() => {
                        setPurpose('');
                        const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Tipo de imóvel */}
                {type && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>{type === 'HOUSE' ? 'Casa' : type === 'APARTMENT' ? 'Apartamento' : type === 'CONDO' ? 'Condomínio' : 'Terreno'}</span>
                    <button
                      onClick={() => {
                        setType('');
                        const params = buildSearchParams({ q: search, city, state, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Preço mínimo */}
                {minPrice && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>Min: R$ {parseInt(minPrice).toLocaleString('pt-BR')}</span>
                    <button
                      onClick={() => {
                        setMinPrice('');
                        const params = buildSearchParams({ q: search, city, state, type, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Preço máximo */}
                {maxPrice && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>Max: R$ {parseInt(maxPrice).toLocaleString('pt-BR')}</span>
                    <button
                      onClick={() => {
                        setMaxPrice('');
                        const params = buildSearchParams({ q: search, city, state, type, minPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Quartos */}
                {bedroomsMin && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>{bedroomsMin}+ quartos</span>
                    <button
                      onClick={() => {
                        setBedroomsMin('');
                        const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bathroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Banheiros */}
                {bathroomsMin && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>{bathroomsMin}+ banheiros</span>
                    <button
                      onClick={() => {
                        setBathroomsMin('');
                        const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Pet Friendly */}
                {petFriendly && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>Aceita Pets</span>
                    <button
                      onClick={() => {
                        setPetFriendly(false);
                        const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Mobiliado */}
                {furnished && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>Mobiliado</span>
                    <button
                      onClick={() => {
                        setFurnished(false);
                        const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Piscina */}
                {hasPool && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>Piscina</span>
                    <button
                      onClick={() => {
                        setHasPool(false);
                        const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Academia */}
                {hasGym && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-full text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors">
                    <span>Academia</span>
                    <button
                      onClick={() => {
                        setHasGym(false);
                        const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, purpose, sort, page: 1 });
                        router.push(`/?${params}`);
                      }}
                      className="hover:bg-emerald-200/70 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Property Cards Grid */}
              <div className={`grid gap-4 sm:gap-5 lg:gap-6 ${viewMode === 'list' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="card animate-pulse p-3 sm:p-4">
                      <div className="h-40 bg-gray-200 rounded-xl mb-3"></div>
                      <div className="space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="flex gap-4">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : searchError ? (
                  <div className="col-span-full py-16">
                    <EmptyState
                      icon={
                        <svg
                          className="w-16 h-16 text-gray-300 mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M12 9v4m0 4h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
                          />
                        </svg>
                      }
                      title="Não foi possível carregar os imóveis"
                      description={searchError}
                      action={
                        <button
                          onClick={() => {
                            setSearchError(null);
                            router.refresh();
                          }}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
                        >
                          Tentar novamente
                        </button>
                      }
                    />
                  </div>
                ) : properties.length === 0 ? (
                  <div className="col-span-full py-16">
                    <EmptyState
                      icon={
                        <svg
                          className="w-16 h-16 text-gray-300 mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      }
                      title="Nenhum imóvel encontrado"
                      description={
                        minPrice || maxPrice || bedroomsMin || bathroomsMin || type || areaMin || search
                          ? "Não encontramos nada com esse recorte. Se quiser, você pode aliviar os filtros ou limpar a busca para ver mais opções com calma."
                          : "Ainda não temos imóveis nesse perfil aqui. Assim que surgirem opções parecidas com o que você busca, elas aparecem aqui sem você precisar fazer nada."
                      }
                      action={
                        (minPrice || maxPrice || bedroomsMin || bathroomsMin || type || areaMin || search) ? (
                          <button
                            onClick={() => {
                              setMinPrice("");
                              setMaxPrice("");
                              setBedroomsMin("");
                              setBathroomsMin("");
                              setType("");
                              setAreaMin("");
                              setSearch("");
                              setPage(1);
                              const params = buildSearchParams({ city, state, sort, page: 1 });
                              router.push(`/?${params}`, { scroll: false });
                            }}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
                          >
                            Limpar filtros e ver mais imóveis
                          </button>
                        ) : null
                      }
                    />
                  </div>
                ) : (
                  properties.map((property) => (
                    <div
                      key={property.id}
                      className={`rounded-xl transition-all duration-200 ${hoverId === property.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' : ''}`}
                    >
                      <PropertyCardPremium
                        property={property}
                        onOpenOverlay={openOverlay}
                      />
                    </div>
                  ))
                )}
              </div>
              {/* Load more for list view; keep Pagination for split mode */}
              {viewMode === 'list' ? (
                properties.length < total && (
                  <div className="flex justify-center mt-6">
                    <button onClick={loadMore} disabled={isLoadingMore} className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-semibold disabled:opacity-60">
                      {isLoadingMore ? 'Carregando…' : 'Carregar mais'}
                    </button>
                  </div>
                )
              ) : (
                <Pagination
                  total={total}
                  page={page}
                  pageSize={12}
                  onChange={(newPage) => {
                    setPage(newPage);
                    const params = buildSearchParams({
                      q: search,
                      city,
                      state,
                      type,
                      minPrice,
                      maxPrice,
                      bedroomsMin,
                      bathroomsMin,
                      areaMin,
                      sort,
                      page: newPage,
                      pageSize: 12,
                    });
                    try { track({ name: 'pagination_change', page: newPage }); } catch {}
                    router.push(`/?${params}`, { scroll: false });
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Side - Interactive Map (Desktop Only, oculto se 'Somente Lista') */}
          {viewMode === 'split' && (
            <div className="hidden lg:block lg:w-1/2">
              <div className="sticky top-0 h-[calc(100vh-140px)] overflow-hidden">
                <MapWithPriceBubbles
                  items={properties}
                  isLoading={isLoading}
                  onBoundsChange={async (bounds) => {
                  // Fetch properties within the new map bounds MANTENDO os filtros ativos
                  const params = buildSearchParams({
                    q: search,
                    city,
                    state,
                    type,
                    minPrice,
                    maxPrice,
                    bedroomsMin,
                    bathroomsMin,
                    areaMin,
                    parkingSpots,
                    yearBuiltMin,
                    yearBuiltMax,
                    purpose,
                    petFriendly: petFriendly ? "true" : "",
                    furnished: furnished ? "true" : "",
                    hasPool: hasPool ? "true" : "",
                    hasGym: hasGym ? "true" : "",
                    hasElevator: hasElevator ? "true" : "",
                    hasBalcony: hasBalcony ? "true" : "",
                    viewSea: viewSea ? "true" : "",
                    condoFeeMin,
                    condoFeeMax,
                    iptuMin,
                    iptuMax,
                    keywords,
                    sort,
                    page: 1,
                    minLat: bounds.minLat,
                    maxLat: bounds.maxLat,
                    minLng: bounds.minLng,
                    maxLng: bounds.maxLng,
                  });
                  try {
                    const res = await fetch(`/api/properties?${params}`);
                    const data = await res.json();
                    if (data.success) {
                      setProperties(data.properties || []);
                      setTotal(data.total || 0);
                    }
                  } catch (error) {
                    console.error('Error fetching properties by bounds:', error);
                  }
                }}
                onHoverChange={(id) => setHoverId(id)}
              />
              </div>
            </div>
          )}
          </div>
        </>
      )}

      {/* Featured Listings (Homepage) */}
      {!hasSearched && null}

      {/* Guides */}
      {!hasSearched && (
        <div id="explorar" className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 font-display">Explorar</h2>
          </div>
          <Tabs
            items={[
              { key: 'featured', label: 'Destaques', content: (
                featuredLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="card animate-pulse">
                        <div className="h-48 bg-gray-200 rounded-t-xl"></div>
                        <div className="p-5 space-y-3">
                          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          <div className="flex gap-4">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                          </div>
                          <div className="h-10 bg-gray-200 rounded-lg"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : featured.length === 0 ? (
                  <div className="text-center text-gray-500 py-16">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-lg font-medium">Sem destaques no momento</p>
                    <p className="text-sm mt-1">Novos imóveis serão exibidos aqui em breve</p>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden">
                      <Carousel
                        items={featured}
                        renderItem={(property) => (
                          <div className="px-1">
                            <PropertyCardPremium property={property} onOpenOverlay={openOverlay} />
                          </div>
                        )}
                      />
                    </div>
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
                      {featured.slice(0, 6).map((property) => (
                        <PropertyCardPremium
                          key={property.id}
                          property={property}
                          onOpenOverlay={openOverlay}
                        />
                      ))}
                    </div>
                  </>
                )
              )},
              { key: 'trending', label: 'Em alta', content: (
                trendingLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="card animate-pulse"><div className="h-48 bg-gray-200 rounded-t-xl"></div><div className="p-5 space-y-3"><div className="h-5 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div><div className="h-10 bg-gray-200 rounded-lg"></div></div></div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="md:hidden">
                      <Carousel items={trending} renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} />
                    </div>
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
                      {trending.slice(0, 6).map((p)=> (<PropertyCardPremium key={p.id} property={p} onOpenOverlay={openOverlay} />))}
                    </div>
                  </>
                )
              )},
              { key: 'new', label: 'Novidades', content: (
                newestLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="card animate-pulse"><div className="h-48 bg-gray-200 rounded-t-xl"></div><div className="p-5 space-y-3"><div className="h-5 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div><div className="h-10 bg-gray-200 rounded-lg"></div></div></div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="md:hidden">
                      <Carousel items={newest} renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} />
                    </div>
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
                      {newest.slice(0, 6).map((p)=> (<PropertyCardPremium key={p.id} property={p} onOpenOverlay={openOverlay} />))}
                    </div>
                  </>
                )
              )},
              { key: 'furnished', label: 'Mobiliados', content: (
                furnishedLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (<div key={i} className="card animate-pulse"><div className="h-48 bg-gray-200 rounded-t-xl"></div><div className="p-5 space-y-3"><div className="h-5 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div><div className="h-10 bg-gray-200 rounded-lg"></div></div></div>))}
                  </div>
                ) : (
                  <>
                    <div className="md:hidden"><Carousel items={furnishedList} renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
                      {furnishedList.slice(0, 6).map((p)=> (<PropertyCardPremium key={p.id} property={p} onOpenOverlay={openOverlay} />))}
                    </div>
                  </>
                )
              )},
              { key: 'luxury', label: 'Luxo', content: (
                luxuryLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (<div key={i} className="card animate-pulse"><div className="h-48 bg-gray-200 rounded-t-xl"></div><div className="p-5 space-y-3"><div className="h-5 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div><div className="h-10 bg-gray-200 rounded-lg"></div></div></div>))}
                  </div>
                ) : (
                  <>
                    <div className="md:hidden"><Carousel items={luxuryList} renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
                      {luxuryList.slice(0, 6).map((p)=> (<PropertyCardPremium key={p.id} property={p} onOpenOverlay={openOverlay} />))}
                    </div>
                  </>
                )
              )},
              { key: 'condos', label: 'Condomínios', content: (
                condoLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (<div key={i} className="card animate-pulse"><div className="h-48 bg-gray-200 rounded-t-xl"></div><div className="p-5 space-y-3"><div className="h-5 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div><div className="h-10 bg-gray-200 rounded-lg"></div></div></div>))}
                  </div>
                ) : (
                  <>
                    <div className="md:hidden"><Carousel items={condoList} renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
                      {condoList.slice(0, 6).map((p)=> (<PropertyCardPremium key={p.id} property={p} onOpenOverlay={openOverlay} />))}
                    </div>
                  </>
                )
              )},
              { key: 'studios', label: 'Studios', content: (
                studioLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (<div key={i} className="card animate-pulse"><div className="h-48 bg-gray-200 rounded-t-xl"></div><div className="p-5 space-y-3"><div className="h-5 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div><div className="h-10 bg-gray-200 rounded-lg"></div></div></div>))}
                  </div>
                ) : (
                  <>
                    <div className="md:hidden"><Carousel items={studioList} renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
                      {studioList.slice(0, 6).map((p)=> (<PropertyCardPremium key={p.id} property={p} onOpenOverlay={openOverlay} />))}
                    </div>
                  </>
                )
              )},
              { key: 'lands', label: 'Terrenos', content: (
                landLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (<div key={i} className="card animate-pulse"><div className="h-48 bg-gray-200 rounded-t-xl"></div><div className="p-5 space-y-3"><div className="h-5 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div><div className="h-10 bg-gray-200 rounded-lg"></div></div></div>))}
                  </div>
                ) : (
                  <>
                    <div className="md:hidden"><Carousel items={landList} renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
                    <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
                      {landList.slice(0, 6).map((p)=> (<PropertyCardPremium key={p.id} property={p} onOpenOverlay={openOverlay} />))}
                    </div>
                  </>
                )
              )},
            ]}
          />
        </div>
      )}
      
      {!hasSearched && <Guides />}

      {/* Footer */}
      <SiteFooter />

      {/* Property Details Modal */}
      <PropertyDetailsModalJames
        propertyId={overlayItem?.id || null}
        open={overlayOpen}
        onClose={closeOverlay}
      />

      {/* Filters Drawer Mobile - Estilo Zillow */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
      >
        <SearchFiltersBarZillow
          filters={{
            minPrice,
            maxPrice,
            bedrooms: bedroomsMin,
            bathrooms: bathroomsMin,
            type,
            areaMin,
            parkingSpots,
            yearBuiltMin,
            yearBuiltMax,
            purpose,
            petFriendly,
            furnished,
            hasPool,
            hasGym,
            hasElevator,
            hasBalcony,
            hasPlayground,
            hasPartyRoom,
            hasGourmet,
            hasConcierge24h,
            comfortAC,
            comfortHeating,
            comfortSolar,
            comfortNoiseWindows,
            comfortLED,
            comfortWaterReuse,
            accRamps,
            accWideDoors,
            accAccessibleElevator,
            accTactile,
            finishCabinets,
            finishCounterGranite,
            finishCounterQuartz,
            viewSea,
            viewCity,
            positionFront,
            positionBack,
            petsSmall,
            petsLarge,
            condoFeeMin,
            condoFeeMax,
            iptuMin,
            iptuMax,
            keywords
          }}
          totalResults={total}
          city={city}
          state={state}
          search={search}
          onFiltersChange={(newFilters) => {
            setMinPrice(newFilters.minPrice);
            setMaxPrice(newFilters.maxPrice);
            setBedroomsMin(newFilters.bedrooms);
            setBathroomsMin(newFilters.bathrooms);
            setType(newFilters.type);
            setAreaMin(newFilters.areaMin);
            setParkingSpots(newFilters.parkingSpots);
            setYearBuiltMin(newFilters.yearBuiltMin);
            setYearBuiltMax(newFilters.yearBuiltMax);
            setPurpose(newFilters.purpose);
            setPetFriendly(newFilters.petFriendly);
            setFurnished(newFilters.furnished);
            setHasPool(newFilters.hasPool);
            setHasGym(newFilters.hasGym);
            setHasElevator(newFilters.hasElevator);
            setHasBalcony(newFilters.hasBalcony);
            setHasPlayground(newFilters.hasPlayground);
            setHasPartyRoom(newFilters.hasPartyRoom);
            setHasGourmet(newFilters.hasGourmet);
            setHasConcierge24h(newFilters.hasConcierge24h);
            setComfortAC(newFilters.comfortAC);
            setComfortHeating(newFilters.comfortHeating);
            setComfortSolar(newFilters.comfortSolar);
            setComfortNoiseWindows(newFilters.comfortNoiseWindows);
            setComfortLED(newFilters.comfortLED);
            setComfortWaterReuse(newFilters.comfortWaterReuse);
            setAccRamps(newFilters.accRamps);
            setAccWideDoors(newFilters.accWideDoors);
            setAccAccessibleElevator(newFilters.accAccessibleElevator);
            setAccTactile(newFilters.accTactile);
            setFinishCabinets(newFilters.finishCabinets);
            setFinishCounterGranite(newFilters.finishCounterGranite);
            setFinishCounterQuartz(newFilters.finishCounterQuartz);
            setViewSea(newFilters.viewSea);
            setViewCity(newFilters.viewCity);
            setPositionFront(newFilters.positionFront);
            setPositionBack(newFilters.positionBack);
            setPetsSmall(newFilters.petsSmall);
            setPetsLarge(newFilters.petsLarge);
            setCondoFeeMin(newFilters.condoFeeMin);
            setCondoFeeMax(newFilters.condoFeeMax);
            setIptuMin(newFilters.iptuMin);
            setIptuMax(newFilters.iptuMax);
            setKeywords(newFilters.keywords);
          }}
          onClearFilters={() => {
            // Limpar todos os filtros e aplicar a busca limpa
            const params = buildSearchParams({
              q: search, // Manter a busca de texto se houver
              city,
              state,
              sort,
              page: 1
            });
            router.push(`/?${params}`);
            setFiltersOpen(false);
          }}
          onApply={(appliedFilters) => {
            const params = buildSearchParams({
              q: search,
              city,
              state,
              type: appliedFilters.type,
              minPrice: appliedFilters.minPrice,
              maxPrice: appliedFilters.maxPrice,
              bedroomsMin: appliedFilters.bedrooms,
              bathroomsMin: appliedFilters.bathrooms,
              areaMin: appliedFilters.areaMin,
              parkingSpots: appliedFilters.parkingSpots,
              yearBuiltMin: appliedFilters.yearBuiltMin,
              yearBuiltMax: appliedFilters.yearBuiltMax,
              purpose: appliedFilters.purpose,
              petFriendly: appliedFilters.petFriendly ? 'true' : '',
              furnished: appliedFilters.furnished ? 'true' : '',
              hasPool: appliedFilters.hasPool ? 'true' : '',
              hasGym: appliedFilters.hasGym ? 'true' : '',
              hasElevator: appliedFilters.hasElevator ? 'true' : '',
              hasBalcony: appliedFilters.hasBalcony ? 'true' : '',
              hasPlayground: appliedFilters.hasPlayground ? 'true' : '',
              hasPartyRoom: appliedFilters.hasPartyRoom ? 'true' : '',
              hasGourmet: appliedFilters.hasGourmet ? 'true' : '',
              hasConcierge24h: appliedFilters.hasConcierge24h ? 'true' : '',
              comfortAC: appliedFilters.comfortAC ? 'true' : '',
              comfortHeating: appliedFilters.comfortHeating ? 'true' : '',
              comfortSolar: appliedFilters.comfortSolar ? 'true' : '',
              comfortNoiseWindows: appliedFilters.comfortNoiseWindows ? 'true' : '',
              comfortLED: appliedFilters.comfortLED ? 'true' : '',
              comfortWaterReuse: appliedFilters.comfortWaterReuse ? 'true' : '',
              accRamps: appliedFilters.accRamps ? 'true' : '',
              accWideDoors: appliedFilters.accWideDoors ? 'true' : '',
              accAccessibleElevator: appliedFilters.accAccessibleElevator ? 'true' : '',
              accTactile: appliedFilters.accTactile ? 'true' : '',
              finishCabinets: appliedFilters.finishCabinets ? 'true' : '',
              finishCounterGranite: appliedFilters.finishCounterGranite ? 'true' : '',
              finishCounterQuartz: appliedFilters.finishCounterQuartz ? 'true' : '',
              viewSea: appliedFilters.viewSea ? 'true' : '',
              viewCity: appliedFilters.viewCity ? 'true' : '',
              positionFront: appliedFilters.positionFront ? 'true' : '',
              positionBack: appliedFilters.positionBack ? 'true' : '',
              petsSmall: appliedFilters.petsSmall ? 'true' : '',
              petsLarge: appliedFilters.petsLarge ? 'true' : '',
              condoFeeMin: appliedFilters.condoFeeMin,
              condoFeeMax: appliedFilters.condoFeeMax,
              iptuMin: appliedFilters.iptuMin,
              iptuMax: appliedFilters.iptuMax,
              keywords: appliedFilters.keywords,
              sort,
              page: 1
            });
            router.push(`/?${params}`);
            setFiltersOpen(false);
          }}
        />
      </Drawer>

      {/* Floating mobile map button (hidden when filters are open) */}
      {hasSearched && !mobileMapOpen && !filtersOpen && (
        <button
          aria-label="Abrir mapa"
          onClick={() => setMobileMapOpen(true)}
          className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-full bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl flex items-center gap-2 transition-all hover:scale-105"
        >
          <Map className="w-5 h-5 text-teal-600" />
          <span className="font-semibold text-gray-800">Ver Mapa</span>
        </button>
      )}

      {/* Mobile full-screen map overlay */}
      {mobileMapOpen && (
        <div className="lg:hidden fixed inset-0 z-[9998] bg-white">
          <div className="h-14 px-3 flex items-center justify-center border-b bg-white/95 backdrop-blur relative">
            <div className="text-sm text-gray-600 font-medium">{total} imóveis</div>
          </div>
          {/* Botão Lista na mesma posição do botão Mapa (bottom center) */}
          <button
            aria-label="Voltar para lista"
            onClick={() => setMobileMapOpen(false)}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-full bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl flex items-center gap-2 transition-all hover:scale-105"
          >
            <LayoutList className="w-5 h-5 text-teal-600" />
            <span className="font-semibold text-gray-800">Ver Lista</span>
          </button>
          <div className="absolute inset-x-0 top-14 bottom-0">
            <MapWithPriceBubbles
              items={properties}
              isLoading={isLoading}
              onBoundsChange={async (bounds) => {
                // Fetch properties within the new map bounds MANTENDO os filtros ativos (mobile)
                const params = buildSearchParams({
                  q: search,
                  city,
                  state,
                  type,
                  minPrice,
                  maxPrice,
                  bedroomsMin,
                  bathroomsMin,
                  areaMin,
                  parkingSpots,
                  yearBuiltMin,
                  yearBuiltMax,
                  purpose,
                  petFriendly: petFriendly ? "true" : "",
                  furnished: furnished ? "true" : "",
                  hasPool: hasPool ? "true" : "",
                  hasGym: hasGym ? "true" : "",
                  hasElevator: hasElevator ? "true" : "",
                  hasBalcony: hasBalcony ? "true" : "",
                  viewSea: viewSea ? "true" : "",
                  condoFeeMin,
                  condoFeeMax,
                  iptuMin,
                  iptuMax,
                  keywords,
                  sort,
                  page: 1,
                  minLat: bounds.minLat,
                  maxLat: bounds.maxLat,
                  minLng: bounds.minLng,
                  maxLng: bounds.maxLng,
                });
                try {
                  const res = await fetch(`/api/properties?${params}`);
                  const data = await res.json();
                  if (data.success) {
                    setProperties(data.properties || []);
                    setTotal(data.total || 0);
                  }
                } catch (error) {
                  console.error('Error fetching properties by bounds (mobile):', error);
                }
              }}
              onHoverChange={(id) => setHoverId(id)}
            />
          </div>
        </div>
      )}


      {/* Dropdown já renderizado próximo ao botão */}
    </div>
  );
}
