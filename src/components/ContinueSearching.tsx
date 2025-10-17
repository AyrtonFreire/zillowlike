"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ApiProperty } from "@/types/api";
import { Heart, MapPin, Bed, Bath, Maximize2 } from "lucide-react";

export default function ContinueSearching() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = (session as any)?.user || null;
  
  const [label, setLabel] = useState<string | null>(null);
  const [params, setParams] = useState<string | null>(null);
  const [items, setItems] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number>(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastSearch");
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj?.label) setLabel(String(obj.label));
      if (obj?.params) setParams(String(obj.params));
    } catch {}
  }, []);

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

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!params) return;
      setLoading(true);
      try {
        const url = `/api/properties?${params}&page=1&pageSize=12&sort=recent`;
        const r = await fetch(url);
        if (!r.ok) return;
        const d = await r.json();
        if (!ignore) {
          setItems(Array.isArray(d.properties) ? d.properties : []);
          setTotal(typeof d.total === 'number' ? d.total : (Array.isArray(d.properties) ? d.properties.length : 0));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [params]);
  
  const toggleFavorite = async (propertyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
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
  };

  if (!params) return null;

  function scrollBy(delta: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Continue buscando: {label}
          </h2>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            Resultados mais recentes
            {total > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                +{Math.max(total - items.length, 0) + items.length} novos
              </span>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            aria-label="Anterior"
            onClick={() => scrollBy(-480)}
            className="p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            aria-label="Próximo"
            onClick={() => scrollBy(480)}
            className="p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pr-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' as any, msOverflowStyle: 'none' as any }}
      >
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="min-w-[320px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse snap-start">
              <div className="h-40 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-6 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="text-gray-500">Sem resultados salvos para continuar.</div>
        ) : (
          items.map((p) => (
            <Link
              key={p.id}
              href={`/property/${p.id}`}
              className="min-w-[320px] snap-start cursor-pointer block group"
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches && !(e as any).metaKey && !(e as any).ctrlKey && !(e as any).shiftKey) {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('open-overlay', { detail: { id: p.id } }));
                }
              }}
            >
              {/* Card Container com Sombra Suave - Mesmo estilo do PropertyCard */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                
                {/* Image Container - 70% da altura */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  {p.images?.[0]?.url ? (
                    <Image 
                      src={p.images[0].url} 
                      alt={p.title} 
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">Sem foto</span>
                      </div>
                    </div>
                  )}

                  {/* Tag Flutuante - Canto Superior Esquerdo */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-3 py-1 bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-semibold rounded-full shadow-md">
                      {p.type === 'HOUSE' ? 'Casa' : 
                       p.type === 'APARTMENT' ? 'Apartamento' :
                       p.type === 'CONDO' ? 'Condomínio' :
                       p.type === 'STUDIO' ? 'Studio' :
                       p.type === 'LAND' ? 'Terreno' :
                       p.type === 'COMMERCIAL' ? 'Comercial' : 'Imóvel'}
                    </span>
                  </div>

                  {/* Botão Favoritar - Canto Superior Direito */}
                  <button 
                    onClick={(e) => toggleFavorite(p.id, e)} 
                    className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 z-10 hover:scale-110 ${
                      favorites.includes(p.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white/90 text-gray-700 hover:bg-white'
                    }`}
                    aria-label={favorites.includes(p.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    title={favorites.includes(p.id) ? "Remover dos favoritos" : "Salvar imóvel"}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(p.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Conteúdo - 30% da altura */}
                <div className="p-4">
                  {/* Preço em Destaque */}
                  <div className="mb-3">
                    <p className="text-2xl font-semibold text-gray-900">
                      R$ {(p.price / 100).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  {/* Features Compactas */}
                  <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
                    {p.bedrooms != null && (
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        <span className="font-medium">{p.bedrooms}</span>
                      </div>
                    )}
                    {p.bathrooms != null && (
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        <span className="font-medium">{Number(p.bathrooms)}</span>
                      </div>
                    )}
                    {p.areaM2 && (
                      <div className="flex items-center gap-1">
                        <Maximize2 className="w-4 h-4" />
                        <span className="font-medium">{p.areaM2} m²</span>
                      </div>
                    )}
                  </div>

                  {/* Endereço com Ícone */}
                  <div className="flex items-start gap-1.5 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                    <span className="line-clamp-1">
                      {p.street}{p.neighborhood ? `, ${p.neighborhood}` : ""}
                    </span>
                  </div>

                  {/* Cidade/Estado */}
                  <p className="text-xs text-gray-500">
                    {p.city}, {p.state}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
