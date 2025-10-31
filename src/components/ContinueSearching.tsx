"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { ApiProperty } from "@/types/api";
import PropertyCardPremium from "@/components/modern/PropertyCardPremium";

export default function ContinueSearching() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = (session as any)?.user || null;
  
  const [label, setLabel] = useState<string | null>(null);
  const [params, setParams] = useState<string | null>(null);
  const [items, setItems] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastSearch");
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj?.label) setLabel(String(obj.label));
      if (obj?.params) setParams(String(obj.params));
    } catch {}
  }, []);

  // (Removido) favoritos locais para simplificar o card

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
  
  // (Removido) toggleFavoriteById – PropertyCardPremium já lida com UI interna de favorito

  if (!params) return null;

  // Layout padronizado: grid responsivo, sem setas de scroll

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Continue buscando: {label}
          </h2>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            Resultados mais recentes
            {total > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full glass-teal text-white text-xs font-medium">
                +{Math.max(total - items.length, 0) + items.length} novos
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden shadow-md animate-pulse bg-white">
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="text-gray-500">Sem resultados salvos para continuar.</div>
        ) : (
          items.map((p) => (
            <PropertyCardPremium
              key={p.id}
              property={p}
              onOpenOverlay={(id) => window.dispatchEvent(new CustomEvent('open-overlay', { detail: { id } }))}
            />
          ))
        )}
      </div>
    </section>
  );
}
