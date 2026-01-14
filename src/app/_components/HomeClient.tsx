"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Toast from "@/components/Toast";
import EmptyState from "@/components/ui/EmptyState";
import { buildSearchParams, parseFiltersFromSearchParams } from "@/lib/url";
import type { GetFavoritesResponse, GetPropertiesResponse, ApiProperty } from "@/types/api";
import { buildPropertyPath } from "@/lib/slug";
import { ptBR } from "@/lib/i18n/property";

type Property = ApiProperty;

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function HomeClient() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [type, setType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [q, setQ] = useState("");
  const [bedroomsMin, setBedroomsMin] = useState("");
  const [bathroomsMin, setBathroomsMin] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [sort, setSort] = useState("recent");

  const [items, setItems] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [page, setPage] = useState(1);
  const pageSize = viewMode === 'map' ? 500 : 24;
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<Array<{label: string; params: string; ts: number}>>([]);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    return buildSearchParams({
      city,
      state,
      type,
      minPrice,
      maxPrice,
      q,
      bedroomsMin,
      bathroomsMin,
      areaMin,
      sort,
      page,
      pageSize,
    });
  }, [city, state, type, minPrice, maxPrice, q, bedroomsMin, bathroomsMin, areaMin, sort, page, pageSize]);

  async function search() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/properties?${queryString}`);
      if (!res.ok) {
        const msg = res.status === 400 ? "Parâmetros inválidos na busca." : "Falha ao carregar imóveis.";
        setToast({ message: msg, type: "error" });
        setItems([]);
        setTotal(0);
        return;
      }
      const data: GetPropertiesResponse = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveCurrentSearch() {
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: q ? `Busca: ${q}` : 'Busca', params: queryString }),
      });
      if (res.status === 401) {
        setToast({ message: 'Faça login para salvar buscas.', type: 'info' });
        return;
      }
      if (!res.ok) {
        setToast({ message: 'Falha ao salvar busca.', type: 'error' });
        return;
      }
      setToast({ message: 'Busca salva!', type: 'success' });
      // reload list
      fetch('/api/saved-searches').then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d.items)) setSavedSearches(d.items);
        }
      }).catch(() => {});
    } catch {}
  }

  async function toggleFavorite(id: string) {
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id }),
      });
      if (res.status === 401) {
        setToast({ message: 'Faça login para salvar favoritos.', type: 'info' });
        return;
      }
      if (!res.ok) return;
      await res.json();
      setFavorites((prev) => {
        const has = prev.includes(id);
        if (has) return prev.filter((x) => x !== id);
        return [...prev, id];
      });
    } catch {}
  }

  useEffect(() => {
    // read initial filters from URL on first mount using utils
    const sp = new URLSearchParams(window.location.search);
    const f = parseFiltersFromSearchParams(sp);
    if (f.city) setCity(f.city);
    if (f.state) setState(f.state);
    if (f.type) setType(f.type);
    if (f.q) setQ(f.q);
    if (f.minPrice) setMinPrice(f.minPrice);
    if (f.maxPrice) setMaxPrice(f.maxPrice);
    if (f.page) setPage(f.page);
    if (f.bedroomsMin) setBedroomsMin(f.bedroomsMin);
    if (f.bathroomsMin) setBathroomsMin(f.bathroomsMin);
    if (f.areaMin) setAreaMin(f.areaMin);
    if (f.sort) setSort(f.sort);
    // then trigger a search
    // eslint-disable-next-line react-hooks/exhaustive-deps
    search();
    // fetch favorites for current user (ignore errors/401)
    fetch('/api/favorites').then(async (r) => {
      if (r.ok) {
        const d: GetFavoritesResponse = await r.json();
        setFavorites(Array.isArray(d.items) ? d.items : []);
      }
    }).catch(() => {});
    // fetch saved searches for current user (ignore errors/401)
    fetch('/api/saved-searches').then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.items)) setSavedSearches(d.items);
      }
    }).catch(() => {});
  }, []);

  function pushUrl() {
    const url = queryString ? `/?${queryString}` : "/";
    router.replace(url);
  }

  function handleSearchClick() {
    setPage(1);
    // push URL first for shareability
    pushUrl();
    search();
  }

  useEffect(() => {
    // when switching to map, reset to page 1 and refetch a larger pageSize
    setPage(1);
    pushUrl();
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  return (
    <main className="min-h-screen bg-gray-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-3xl font-bold text-blue-600">
                OggaHub
              </Link>
              <nav className="hidden lg:flex space-x-8">
                <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium text-base">Comprar</Link>
                <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium text-base">Alugar</Link>
                <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium text-base">Vender</Link>
                <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium text-base">Financiar</Link>
                <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium text-base">Meu Lar</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium text-base">Gerenciar</Link>
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium text-base">Anunciar</Link>
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium text-base">Ajuda</Link>
              <Link href="/auth/signin" className="text-gray-700 hover:text-blue-600 font-medium text-base">Entrar</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section with Background Image */}
      <div className="relative h-[600px] bg-cover bg-center bg-no-repeat" style={{backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"}}>
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        {/* Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="mx-auto max-w-7xl px-4 w-full">
            <div className="max-w-2xl">
              {/* Hero Text */}
              <div className="mb-8">
                <h1 className="text-6xl font-bold text-white mb-4 leading-tight">
                  Sonhe.
                </h1>
                <h2 className="text-6xl font-bold text-white leading-tight">
                  Alugue. Compre.
                </h2>
              </div>
              {/* Search Bar */}
              <div className="bg-white rounded-lg p-4 shadow-lg">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite endereço, bairro ou cidade..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                      <button
                        aria-label="Buscar imóveis"
                        onClick={handleSearchClick}
                        className="absolute right-2 top-2 glass-teal text-white px-6 py-1.5 rounded-md text-sm font-medium transition-colors duration-200"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>
                  {/* Filters */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <input
                      className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[160px]"
                      placeholder="Cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                    <input
                      className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-20"
                      placeholder="UF"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      maxLength={2}
                    />
                    <select
                      className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[120px]"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="">Todos os tipos</option>
                      <option value="HOUSE">Casa</option>
                      <option value="APARTMENT">Apartamento</option>
                      <option value="CONDO">Condomínio</option>
                      <option value="TOWNHOUSE">Sobrado</option>
                      <option value="STUDIO">Studio</option>
                      <option value="LAND">Terreno</option>
                      <option value="RURAL">Imóvel rural</option>
                      <option value="COMMERCIAL">Comercial</option>
                    </select>
                    <input
                      className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-20"
                      placeholder="Mín"
                      value={minPrice}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    <input
                      className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-20"
                      placeholder="Máx"
                      value={maxPrice}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    <input
                      className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-28"
                      placeholder="Quartos mín"
                      value={bedroomsMin}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => setBedroomsMin(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    <input
                      className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-32"
                      placeholder="Banheiros mín"
                      value={bathroomsMin}
                      inputMode="decimal"
                      onChange={(e) => setBathroomsMin(e.target.value.replace(/[^0-9.]/g, ""))}
                    />
                    <input
                      className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-32"
                      placeholder="Área mín (m²)"
                      value={areaMin}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => setAreaMin(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    <select
                      className="px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[180px]"
                      aria-label="Ordenar por"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recent">Relevância/Recentes</option>
                      <option value="price_asc">Preço: menor → maior</option>
                      <option value="price_desc">Preço: maior → menor</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {total} {total === 1 ? "imóvel encontrado" : "imóveis encontrados"}
            </h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'map' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mapa
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
              aria-label="Página anterior"
              onClick={() => { if (page > 1) { setPage(page - 1); pushUrl(); search(); } }}
              disabled={page <= 1 || isLoading}
            >
              ← Anterior
            </button>
            <div className="text-sm text-gray-600">Página {page} {total > 0 ? `de ${Math.max(1, Math.ceil(total / pageSize))}` : ""}</div>
            <button
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
              aria-label="Próxima página"
              onClick={() => {
                const maxPage = Math.max(1, Math.ceil(total / pageSize));
                if (page < maxPage) { setPage(page + 1); pushUrl(); search(); }
              }}
              disabled={isLoading || (total <= page * pageSize)}
            >
              Próxima →
            </button>
            <button
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
              aria-label="Salvar busca"
              onClick={saveCurrentSearch}
              disabled={isLoading}
            >
              Salvar busca
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="col-span-full py-12">
                <EmptyState
                  title="Nenhum imóvel encontrado"
                  description={
                    q || city || state || type || minPrice || maxPrice || bedroomsMin || bathroomsMin || areaMin
                      ? "Tente ajustar os filtros ou limpar a busca para ver outras opções."
                      : "Assim que surgirem imóveis compatíveis com o que você procura, eles aparecem aqui."
                  }
                />
              </div>
            ) : (
              items.map((p) => (
                <div key={p.id} onMouseEnter={() => setHoveredId(p.id)} onMouseLeave={() => setHoveredId(null)} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <div className="relative">
                    <div className="aspect-w-16 aspect-h-12">
                      {p.images?.[0]?.url ? (
                        <Image
                          src={p.images[0].url}
                          alt={p.title}
                          width={800}
                          height={480}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-sm">Sem foto</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <button onClick={() => toggleFavorite(p.id)} className={`bg-white/90 hover:bg-white p-2 rounded-full transition-colors duration-200 ${favorites.includes(p.id) ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
                        {p.title}
                      </h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2 whitespace-nowrap">
                        {ptBR.type(p.type)}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-1">
                      {p.street}{p.neighborhood ? ", " + p.neighborhood : ""} - {p.city}/{p.state}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      {p.bedrooms && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                          </svg>
                          {p.bedrooms} quartos
                        </span>
                      )}
                      {p.bathrooms && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm9-4h-5v2h5V7a1 1 0 00-1-1H5a1 1 0 01-1 1v2h5V9h10z" clipRule="evenodd" />
                          </svg>
                          {Number(p.bathrooms)} banheiros
                        </span>
                      )}
                      {p.areaM2 && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                          {p.areaM2} m²
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-gray-900">
                        R$ {(p.price / 100).toLocaleString("pt-BR")}
                      </div>
                      <Link 
                        href={buildPropertyPath(p.id, p.title)} 
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                      >
                        Ver detalhes →
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="h-[600px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Map items={items} highlightId={hoveredId ?? undefined} onHoverChange={(id) => setHoveredId(id)} />
          </div>
        )}
    </div>
    </main>
  );
}
