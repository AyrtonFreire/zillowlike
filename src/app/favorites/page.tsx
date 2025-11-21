"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ModernNavbar, PropertyCardPremium } from "@/components/modern";
import SiteFooter from "@/components/Footer";
import Select from "@/components/ui/Select";
import { Heart, Filter, Grid3x3, List } from "lucide-react";

import type { ApiProperty } from "@/types/api";

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"recent" | "price_asc" | "price_desc" | "area_desc">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      if (status === "loading") return;
      if (!session) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const res = await fetch(`/api/favorites`);
        const data = await res.json().catch(() => ({ items: [] }));
        const list: string[] = Array.isArray(data.items) ? data.items : [];
        
        setFavorites(new Set(list));
        
        const results: ApiProperty[] = [];
        await Promise.all(
          list.map(async (id: string) => {
            const r = await fetch(`/api/properties?id=${id}`);
            if (r.ok) {
              const d = await r.json();
              if (d.item) results.push(d.item);
            }
          })
        );
        setItems(results);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session, status]);

  const sorted = useMemo(() => {
    const arr = [...items];
    if (sort === "price_asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") arr.sort((a, b) => b.price - a.price);
    else if (sort === "area_desc") arr.sort((a, b) => (b.areaM2 || 0) - (a.areaM2 || 0));
    else arr.sort((a, b) => b.price - a.price); // Default: por preço
    return arr;
  }, [items, sort]);

  async function toggleFavorite(id: string) {
    if (!session) return;
    
    const r = await fetch("/api/favorites", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ propertyId: id }) 
    });
    
    if (r.ok) {
      setItems((prev) => prev.filter((p) => p.id !== id));
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // Verificar se está logado
  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Faça login para ver seus favoritos</h1>
          <p className="text-gray-600 mb-8">
            Salve seus imóveis favoritos e acesse-os de qualquer dispositivo.
          </p>
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-6 py-3 glass-teal text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Fazer Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      
      {/* Header da Página */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500 fill-current" />
                Meus Favoritos
              </h1>
              <p className="text-gray-600 mt-1">
                {loading ? "Carregando..." : `${sorted.length} ${sorted.length === 1 ? 'imóvel salvo' : 'imóveis salvos'}`}
              </p>
            </div>
            
            {/* Controles */}
            <div className="flex items-center gap-3">
              {/* Ordenar */}
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
              >
                <option value="recent">Mais recentes</option>
                <option value="price_asc">Menor preço</option>
                <option value="price_desc">Maior preço</option>
                <option value="area_desc">Maior área</option>
              </Select>
              
              {/* View Mode */}
              <div className="inline-flex rounded-full border border-neutral-200 bg-white p-1 shadow-sm" role="group" aria-label="Alternar visualização">
                <button
                  type="button"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === "grid" ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
                  title="Grade"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === "list" ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
                  title="Lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center">
            <Heart className="w-20 h-20 mx-auto mb-6 text-gray-300" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Nenhum favorito ainda
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Explore nossos imóveis com calma e, se quiser, clique no coração para salvar seus favoritos e voltar a eles quando for conveniente.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 glass-teal text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Explorar Imóveis
            </Link>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === "grid"
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1"
          }`}>
            {sorted.map((property) => (
              <PropertyCardPremium
                key={property.id}
                property={property}
              />
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
