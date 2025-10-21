"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ModernNavbar, HeroSection, ThemeToggle, PropertyCardPremium } from "@/components/modern";
import QuickCategories from "@/components/QuickCategories";
import NeighborhoodGrid from "@/components/NeighborhoodGrid";
import ContinueSearching from "@/components/ContinueSearching";
import Guides from "@/components/Guides";
import SiteFooter from "@/components/Footer";
import PropertyDetailsModal from "@/components/PropertyDetailsModal";
import SearchFiltersBar from "@/components/SearchFiltersBar";
import Image from "next/image";
import { buildSearchParams, parseFiltersFromSearchParams } from "@/lib/url";
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);

  // Fecha dropdown ao clicar fora ou pressionar ESC
  useEffect(() => {
    if (!filtersOpen) return;
    const handleClick = (e: Event) => {
      if (!filtersRef.current) return;
      const target = e.target as Node | null;
      if (target && !filtersRef.current.contains(target)) {
        setFiltersOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
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
  }, [searchParams]);

  // Verificar se há busca ativa
  const hasSearched = useMemo(() => {
    return !!(search || city || type || minPrice || maxPrice || bedroomsMin || bathroomsMin || areaMin);
  }, [search, city, type, minPrice, maxPrice, bedroomsMin, bathroomsMin, areaMin]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      
      {/* Hero Section */}
      {!hasSearched && <HeroSection />}
      
      {/* Quick Categories */}
      {!hasSearched && <QuickCategories />}
      
      {/* Neighborhood Grid */}
      {!hasSearched && <NeighborhoodGrid />}
      
      {/* Continue Searching */}
      {!hasSearched && <ContinueSearching />}

      {/* Search Results - Split Screen Layout */}
      {hasSearched && (
        <div className={`${viewMode === 'split' ? 'flex' : ''} h-[calc(100vh-80px)]`}>
          {/* Left Side - Property List */}
          <div className={`w-full ${viewMode === 'split' ? 'lg:w-1/2' : 'lg:w-full'} overflow-y-auto`}> 
            <div className="pt-20 px-6 lg:px-8">
              {/* Header + Controles */}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {total > 0 ? `${total} imóveis encontrados` : 'Nenhum imóvel encontrado'}
                  </h1>
                  {city && (
                    <p className="text-gray-600">
                      em <span className="font-medium">{city}, {state}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('split')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${viewMode === 'split' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Lista + Mapa
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Somente Lista
                    </button>
                  </div>
                  <div className="relative" ref={filtersRef}>
                    <button
                      onClick={() => setFiltersOpen((v) => !v)}
                      className="px-4 py-2 rounded-md text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-50"
                    >
                      Filtros
                    </button>
                    {filtersOpen && (
                      <div className="absolute right-0 mt-2 z-50">
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
                          }}
                          onFiltersChange={(newFilters) => {
                            setMinPrice(newFilters.minPrice);
                            setMaxPrice(newFilters.maxPrice);
                            setBedroomsMin(newFilters.bedrooms);
                            setBathroomsMin(newFilters.bathrooms);
                            setType(newFilters.type);
                            setAreaMin(newFilters.areaMin);
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
                              sort,
                              page: 1,
                            });
                            router.push(`/?${params}`, { scroll: false });
                          }}
                          onClearFilters={() => {
                            setMinPrice("");
                            setMaxPrice("");
                            setBedroomsMin("");
                            setBathroomsMin("");
                            setType("");
                            setAreaMin("");
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
                            router.push(`/?${params}`, { scroll: false });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Property Cards Grid */}
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
            </div>
          </div>

          {/* Right Side - Interactive Map (Desktop Only, oculto se 'Somente Lista') */}
          {viewMode === 'split' && (
            <div className="hidden lg:block lg:w-1/2 sticky top-24 h-[calc(100vh-96px)]">
              <MapWithPriceBubbles
                items={properties}
                isLoading={isLoading}
                onBoundsChange={async (bounds) => {
                  // Fetch properties within the new map bounds
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('minLat', bounds.minLat.toString());
                  params.set('maxLat', bounds.maxLat.toString());
                  params.set('minLng', bounds.minLng.toString());
                  params.set('maxLng', bounds.maxLng.toString());
                  try {
                    const res = await fetch(`/api/properties?${params.toString()}`);
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {featuredLoading ? (
              [...Array(6)].map((_, i) => (
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
              ))
            ) : featured.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-16">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-lg font-medium">Sem destaques no momento</p>
                <p className="text-sm mt-1">Novos imóveis serão exibidos aqui em breve</p>
              </div>
            ) : (
              featured.map((property) => (
                <PropertyCardPremium
                  key={property.id}
                  property={property}
                  onOpenOverlay={openOverlay}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Guides */}
      {!hasSearched && <Guides />}

      {/* Footer */}
      <SiteFooter />

      {/* Property Details Modal */}
      <PropertyDetailsModal
        propertyId={overlayItem?.id || null}
        open={overlayOpen}
        onClose={closeOverlay}
      />

      {/* Theme Toggle - Fixed position */}
      <div className="fixed bottom-8 left-8 z-40">
        <ThemeToggle />
      </div>

      {/* Dropdown já renderizado próximo ao botão */}
    </div>
  );
}
