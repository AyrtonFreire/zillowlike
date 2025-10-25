"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ApiProperty } from "@/types/api";
import { Heart, MapPin, Bed, Bath, Maximize2 } from "lucide-react";
import PropertyCard from "@/components/PropertyCard";

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
  
  async function toggleFavoriteById(propertyId: string) {
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
        setFavorites(prev => method === 'POST' ? [...prev, propertyId] : prev.filter(id => id !== propertyId));
      }
    } catch (err) { console.error(err); }
  }

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
            <div key={p.id} className="min-w-[320px] snap-start">
              <PropertyCard
                property={p}
                onFavoriteToggle={toggleFavoriteById}
                isFavorite={favorites.includes(p.id)}
                onOpenOverlay={(id) => window.dispatchEvent(new CustomEvent('open-overlay', { detail: { id } }))}
                className=""
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
