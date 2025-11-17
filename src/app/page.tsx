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
import { LayoutList, Map, ChevronDown } from "lucide-react";
 
import PropertyDetailsModalJames from "@/components/PropertyDetailsModalJames";
import SearchFiltersBar from "@/components/SearchFiltersBar";
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

  // Estados do overlay
  const [overlayId, setOverlayId] = useState<string | null>(null);
  const [overlayItem, setOverlayItem] = useState<Property | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);

  // Estados de busca e filtros
  const [search, setSearch] = useState("");
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
  const [status, setStatus] = useState("");
  const [petFriendly, setPetFriendly] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [hasGym, setHasGym] = useState(false);
  const [hasElevator, setHasElevator] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [hasSeaView, setHasSeaView] = useState(false);
  const [condoFeeMin, setCondoFeeMin] = useState("");
  const [condoFeeMax, setCondoFeeMax] = useState("");
  const [iptuMin, setIptuMin] = useState("");
  const [iptuMax, setIptuMax] = useState("");
  const [keywords, setKeywords] = useState("");

  // Parse dos parâmetros da URL
  useEffect(() => {
    const filters = parseFiltersFromSearchParams(searchParams);
    setSearch(filters.q || "");
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
    setStatus(filters.status || "");
    setPetFriendly(filters.petFriendly === "true");
    setFurnished(filters.furnished === "true");
    setHasPool(filters.hasPool === "true");
    setHasGym(filters.hasGym === "true");
    setHasElevator(filters.hasElevator === "true");
    setHasBalcony(filters.hasBalcony === "true");
    setHasSeaView(filters.hasSeaView === "true");
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
    if (hasSearched) {
      setIsLoading(true);
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
        page,
        pageSize: 12
      });

      fetch(`/api/properties?${params}`)
        .then(async res => {
          if (!res.ok) {
            const text = await res.text();
            console.error('Search failed (HTTP error):', { status: res.status, statusText: res.statusText, body: text });
            return null;
          }
          try {
            return await res.json();
          } catch (err) {
            console.error('Search failed (JSON parse error):', err);
            return null;
          }
        })
        .then((data: any) => {
          if (!data) {
            setProperties([]);
            setTotal(0);
            return;
          }
          console.log('Search response:', data);
          if (data.success) {
            setProperties(data.properties || []);
            setTotal(data.total || 0);
            setNextPage(2);
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
          }
        })
        .catch(err => {
          console.error('Search failed (network error):', err);
          setProperties([]);
          setTotal(0);
        })
        .finally(() => setIsLoading(false));
    }
  }, [hasSearched, search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, sort, page]);

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
      <ModernNavbar />
      
      {/* Hero Section */}
      {!hasSearched && <HeroSection />}

      

      {/* Continue Searching removido */}


      {/* Search Results - Split Screen Layout */}
      {hasSearched && (
        <div className={`${viewMode === 'split' ? 'flex' : ''} h-[calc(100vh-80px)]`}>
          {/* Left Side - Property List */}
          <div className={`w-full ${viewMode === 'split' ? 'lg:w-1/2' : 'lg:w-full'} overflow-y-auto`}> 
            <div className="pt-20 px-6 lg:px-8">
              {/* Header + Controles - Redesigned Premium */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                      {total > 0 ? `${total.toLocaleString('pt-BR')} ${total === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}` : 'Nenhum imóvel encontrado'}
                    </h1>
                    {city && (
                      <p className="text-gray-600 text-lg">
                        em <span className="font-semibold text-gray-900">{city}, {state}</span>
                      </p>
                    )}
                  </div>
                </div>
                  
                {/* Botão "Salvar busca" removido para reduzir poluição visual */}

                {/* View Mode Toggle + Sort - Premium Style */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* View mode toggle - Hidden on mobile (use floating button instead) */}
                  <div className="hidden sm:inline-flex rounded-2xl border-2 border-gray-200 bg-white p-1.5 shadow-md" role="group" aria-label="Alternar visualização">
                    <button
                      type="button"
                      aria-pressed={viewMode === 'split'}
                      onClick={() => { setViewMode('split'); try { track({ name: 'filters_apply', payload: { action: 'view_split' } }); } catch {} }}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'split' ? 'glass-teal text-white shadow-md' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Map className="w-4 h-4" />
                      <span>Lista + Mapa</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={viewMode === 'list'}
                      onClick={() => { setViewMode('list'); try { track({ name: 'filters_apply', payload: { action: 'view_list' } }); } catch {} }}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'list' ? 'glass-teal text-white shadow-md' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <LayoutList className="w-4 h-4" />
                      <span>Somente Lista</span>
                    </button>
                  </div>
                  {/* Sort control */}
                  <div className="min-w-[180px]">
                    <Select
                      aria-label="Ordenar resultados"
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
                          sort: newSort,
                          page: 1,
                        });
                        try { track({ name: 'sort_change', value: newSort }); } catch {}
                        router.push(`/?${params}`, { scroll: false });
                      }}
                    >
                      <option value="recent">Mais recentes</option>
                      <option value="price_asc">Menor preço</option>
                      <option value="price_desc">Maior preço</option>
                      <option value="area_desc">Maior área</option>
                    </Select>
                  </div>
                  <div className="relative hidden md:block" ref={filtersRef}>
                    <button
                      aria-haspopup="dialog"
                      aria-expanded={filtersOpen}
                      onClick={() => setFiltersOpen((v) => !v)}
                      className="px-4 py-2 rounded-md text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-50"
                    >
                      Filtros
                    </button>
                    {filtersOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm"
                          onClick={() => setFiltersOpen(false)}
                          aria-hidden
                        />
                        {/* Panel */}
                        <div className="filters-panel fixed top-20 sm:top-24 md:top-28 lg:top-1/2 xl:top-1/2 2xl:top-1/2 left-1/2 -translate-x-1/2 lg:-translate-y-1/2 z-[200] w-full max-w-5xl px-4">
                          <SearchFiltersBar
                            compact
                            open
                            variant="dropdown"
                            onClose={() => setFiltersOpen(false)}
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
                            status,
                            petFriendly,
                            furnished,
                            hasPool,
                            hasGym,
                            hasElevator,
                            hasBalcony,
                            hasSeaView,
                            condoFeeMin,
                            condoFeeMax,
                            iptuMin,
                            iptuMax,
                            keywords,
                          }}
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
                            setStatus(newFilters.status);
                            setPetFriendly(newFilters.petFriendly);
                            setFurnished(newFilters.furnished);
                            setHasPool(newFilters.hasPool);
                            setHasGym(newFilters.hasGym);
                            setHasElevator(newFilters.hasElevator);
                            setHasBalcony(newFilters.hasBalcony);
                            setHasSeaView(newFilters.hasSeaView);
                            setCondoFeeMin(newFilters.condoFeeMin);
                            setCondoFeeMax(newFilters.condoFeeMax);
                            setIptuMin(newFilters.iptuMin);
                            setIptuMax(newFilters.iptuMax);
                            setKeywords(newFilters.keywords);
                            const params = buildSearchParams({
                              q: search,
                              city,
                              state,
                              type: newFilters.type,
                              minPrice: newFilters.minPrice,
                              maxPrice: newFilters.maxPrice,
                              bedroomsMin: newFilters.bedrooms,
                              bathroomsMin: newFilters.bathrooms,
                              areaMin: newFilters.areaMin,
                              parkingSpots: newFilters.parkingSpots,
                              yearBuiltMin: newFilters.yearBuiltMin,
                              yearBuiltMax: newFilters.yearBuiltMax,
                              status: newFilters.status,
                              petFriendly: newFilters.petFriendly ? "true" : "",
                              furnished: newFilters.furnished ? "true" : "",
                              hasPool: newFilters.hasPool ? "true" : "",
                              hasGym: newFilters.hasGym ? "true" : "",
                              hasElevator: newFilters.hasElevator ? "true" : "",
                              hasBalcony: newFilters.hasBalcony ? "true" : "",
                              hasSeaView: newFilters.hasSeaView ? "true" : "",
                              condoFeeMin: newFilters.condoFeeMin,
                              condoFeeMax: newFilters.condoFeeMax,
                              iptuMin: newFilters.iptuMin,
                              iptuMax: newFilters.iptuMax,
                              keywords: newFilters.keywords,
                              sort,
                              page: 1,
                            });
                            try { track({ name: 'filters_apply', payload: newFilters as any }); } catch {}
                            router.push(`/?${params}`, { scroll: false });
                          }}
                          onClearFilters={() => {
                            setMinPrice("");
                            setMaxPrice("");
                            setBedroomsMin("");
                            setBathroomsMin("");
                            setType("");
                            setAreaMin("");
                            setParkingSpots("");
                            setYearBuiltMin("");
                            setYearBuiltMax("");
                            setStatus("");
                            setPetFriendly(false);
                            setFurnished(false);
                            setHasPool(false);
                            setHasGym(false);
                            setHasElevator(false);
                            setHasBalcony(false);
                            setHasSeaView(false);
                            setCondoFeeMin("");
                            setCondoFeeMax("");
                            setIptuMin("");
                            setIptuMax("");
                            setKeywords("");
                            setPage(1);
                            const params = buildSearchParams({
                              q: search,
                              city,
                              state,
                              type: "",
                              minPrice: "",
                              maxPrice: "",
                              bedroomsMin: "",
                              bathroomsMin: "",
                              areaMin: "",
                              sort,
                              page: 1,
                            });
                            try { track({ name: 'filters_clear' }); } catch {}
                            router.push(`/?${params}`, { scroll: false });
                          }}
                        />
                        </div>
                        <style jsx>{`
                          /* Centralizar verticalmente no md somente se a viewport for alta o suficiente */
                          @media (min-width: 768px) and (min-height: 800px) {
                            .filters-panel { top: 50% !important; transform: translate(-50%, -50%) !important; }
                          }
                        `}</style>
                      </>
                    )}
                  </div>
                  {/* Mobile: open Drawer for filters */}
                  <div className="md:hidden">
                    <button
                      aria-haspopup="dialog"
                      aria-expanded={filtersOpen}
                      onClick={() => { setFiltersOpen(true); try { track({ name: 'filters_open', source: 'mobile' }); } catch {} }}
                      className="px-4 py-2 rounded-md text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-50 relative"
                    >
                      Filtros
                      {(() => {
                        const count = [minPrice, maxPrice, bedroomsMin, bathroomsMin, type, areaMin, parkingSpots, yearBuiltMin, yearBuiltMax, status, petFriendly ? '1' : '', furnished ? '1' : '', hasPool ? '1' : '', hasGym ? '1' : '', hasElevator ? '1' : '', hasBalcony ? '1' : '', hasSeaView ? '1' : '', condoFeeMin, condoFeeMax, iptuMin, iptuMax, keywords].filter(Boolean).length;
                        return count > 0 ? <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{count}</span> : null;
                      })()}
                    </button>
                    <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros" side="right">
                      <SearchFiltersBar
                        compact
                        open
                        variant="modal"
                        isApplying={isApplyingFilters}
                        onClose={() => {
                          setIsApplyingFilters(true);
                          setTimeout(() => {
                            setFiltersOpen(false);
                            setIsApplyingFilters(false);
                          }, 300);
                        }}
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
                          status,
                          petFriendly,
                          furnished,
                          hasPool,
                          hasGym,
                          hasElevator,
                          hasBalcony,
                          hasSeaView,
                          condoFeeMin,
                          condoFeeMax,
                          iptuMin,
                          iptuMax,
                          keywords,
                        }}
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
                          setStatus(newFilters.status);
                          setPetFriendly(newFilters.petFriendly);
                          setFurnished(newFilters.furnished);
                          setHasPool(newFilters.hasPool);
                          setHasGym(newFilters.hasGym);
                          setHasElevator(newFilters.hasElevator);
                          setHasBalcony(newFilters.hasBalcony);
                          setHasSeaView(newFilters.hasSeaView);
                          setCondoFeeMin(newFilters.condoFeeMin);
                          setCondoFeeMax(newFilters.condoFeeMax);
                          setIptuMin(newFilters.iptuMin);
                          setIptuMax(newFilters.iptuMax);
                          setKeywords(newFilters.keywords);
                        }}
                        onClearFilters={() => {
                          setMinPrice("");
                          setMaxPrice("");
                          setBedroomsMin("");
                          setBathroomsMin("");
                          setType("");
                          setAreaMin("");
                          setParkingSpots("");
                          setYearBuiltMin("");
                          setYearBuiltMax("");
                          setStatus("");
                          setPetFriendly(false);
                          setFurnished(false);
                          setHasPool(false);
                          setHasGym(false);
                          setHasElevator(false);
                          setHasBalcony(false);
                          setHasSeaView(false);
                          setCondoFeeMin("");
                          setCondoFeeMax("");
                          setIptuMin("");
                          setIptuMax("");
                          setKeywords("");
                          setPage(1);
                        }}
                      />
                      <div className="mt-4">
                        <button
                          onClick={() => {
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
                              page: 1,
                            });
                            setFiltersOpen(false);
                            try { track({ name: 'filters_apply', payload: { type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin } }); } catch {}
                            router.push(`/?${params}`, { scroll: false });
                          }}
                          className="w-full px-4 py-2 rounded-lg bg-neutral-900 text-white font-semibold"
                        >
                          Aplicar
                        </button>
                      </div>
                    </Drawer>
                  </div>
                </div>
              </div>

              {/* Property Cards Grid */}
              {/* Active Filters Chips */}
              {(minPrice || maxPrice || bedroomsMin || bathroomsMin || type || areaMin) && (
                <div className="px-6 lg:px-8 -mt-3 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {type && (
                      <button onClick={() => { setType(""); setPage(1); const params = buildSearchParams({ q: search, city, state, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin, sort, page: 1 }); router.push(`/?${params}`, { scroll: false }); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-sm text-neutral-800">
                        <span>Tipo: {type === 'HOUSE' ? 'Casa' : type === 'APARTMENT' ? 'Apartamento' : type === 'CONDO' ? 'Condomínio' : type === 'LAND' ? 'Terreno' : type}</span>
                        <span className="text-neutral-500">×</span>
                      </button>
                    )}
                    {minPrice && (
                      <button onClick={() => { setMinPrice(""); setPage(1); const params = buildSearchParams({ q: search, city, state, type, maxPrice, bedroomsMin, bathroomsMin, areaMin, sort, page: 1 }); router.push(`/?${params}`, { scroll: false }); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-sm text-neutral-800">
                        <span>Min: {Number(minPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</span>
                        <span className="text-neutral-500">×</span>
                      </button>
                    )}
                    {maxPrice && (
                      <button onClick={() => { setMaxPrice(""); setPage(1); const params = buildSearchParams({ q: search, city, state, type, minPrice, bedroomsMin, bathroomsMin, areaMin, sort, page: 1 }); router.push(`/?${params}`, { scroll: false }); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-sm text-neutral-800">
                        <span>Max: {Number(maxPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</span>
                        <span className="text-neutral-500">×</span>
                      </button>
                    )}
                    {bedroomsMin && (
                      <button onClick={() => { setBedroomsMin(""); setPage(1); const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bathroomsMin, areaMin, sort, page: 1 }); router.push(`/?${params}`, { scroll: false }); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-sm text-neutral-800">
                        <span>Quartos: {bedroomsMin}+</span>
                        <span className="text-neutral-500">×</span>
                      </button>
                    )}
                    {bathroomsMin && (
                      <button onClick={() => { setBathroomsMin(""); setPage(1); const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, areaMin, sort, page: 1 }); router.push(`/?${params}`, { scroll: false }); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-sm text-neutral-800">
                        <span>Banheiros: {bathroomsMin}+</span>
                        <span className="text-neutral-500">×</span>
                      </button>
                    )}
                    {areaMin && (
                      <button onClick={() => { setAreaMin(""); setPage(1); const params = buildSearchParams({ q: search, city, state, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, sort, page: 1 }); router.push(`/?${params}`, { scroll: false }); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-sm text-neutral-800">
                        <span>Área: {areaMin}m²+</span>
                        <span className="text-neutral-500">×</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMinPrice(""); setMaxPrice(""); setBedroomsMin(""); setBathroomsMin(""); setType(""); setAreaMin(""); setPage(1);
                        const params = buildSearchParams({ q: search, city, state, sort, page: 1 });
                        router.push(`/?${params}`, { scroll: false });
                      }}
                      className="ml-auto text-sm text-red-600 hover:text-red-700"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </div>
              )}

              <div className={`grid gap-6 ${viewMode === 'list' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="card animate-pulse p-4">
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
                ) : properties.length === 0 ? (
                  <div className="col-span-full text-center py-16">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-lg font-medium text-gray-600">Nenhum imóvel encontrado</p>
                    <p className="text-sm text-gray-500 mt-1">Tente ajustar os filtros de busca</p>
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
            <div className="hidden lg:block lg:w-1/2 sticky top-24 h-[calc(100vh-96px)]">
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
                    status,
                    petFriendly: petFriendly ? "true" : "",
                    furnished: furnished ? "true" : "",
                    hasPool: hasPool ? "true" : "",
                    hasGym: hasGym ? "true" : "",
                    hasElevator: hasElevator ? "true" : "",
                    hasBalcony: hasBalcony ? "true" : "",
                    hasSeaView: hasSeaView ? "true" : "",
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
          )}
        </div>
      )}

      {/* Featured Listings (Homepage) */}
      {!hasSearched && (
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Destaques</h2>
            <Link href="#" className="text-primary-600 hover:text-primary-800 text-sm font-medium">Ver mais</Link>
          </div>
          {featuredLoading ? (
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
              {/* Mobile/Tablet: Carousel */}
              <div className="md:hidden">
                <Carousel
                  items={featured}
                  auto
                  renderItem={(property) => (
                    <div className="px-1">
                      <PropertyCardPremium property={property} onOpenOverlay={openOverlay} />
                    </div>
                  )}
                />
              </div>
              {/* Desktop: Grid */}
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
          )}
        </div>
      )}

      {/* Guides */}
      {!hasSearched && (
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 font-display">Explorar</h2>
          </div>
          <Tabs
            items={[
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
                      <Carousel items={trending} auto renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} />
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
                      <Carousel items={newest} auto renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} />
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
                    <div className="md:hidden"><Carousel items={furnishedList} auto renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
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
                    <div className="md:hidden"><Carousel items={luxuryList} auto renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
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
                    <div className="md:hidden"><Carousel items={condoList} auto renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
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
                    <div className="md:hidden"><Carousel items={studioList} auto renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
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
                    <div className="md:hidden"><Carousel items={landList} auto renderItem={(p)=> (<div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={openOverlay} /></div>)} /></div>
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
                  status,
                  petFriendly: petFriendly ? "true" : "",
                  furnished: furnished ? "true" : "",
                  hasPool: hasPool ? "true" : "",
                  hasGym: hasGym ? "true" : "",
                  hasElevator: hasElevator ? "true" : "",
                  hasBalcony: hasBalcony ? "true" : "",
                  hasSeaView: hasSeaView ? "true" : "",
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
