"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { ApiProperty } from "@/types/api";
import PropertyCardPremium from "@/components/modern/PropertyCardPremium";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ContinueSearching() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = (session as any)?.user || null;

  const [label, setLabel] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [mode, setMode] = useState<"lastSearch" | "featured">("lastSearch");
  const [items, setItems] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number>(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Tentar usar a última busca salva
      try {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem("lastSearch");
          if (raw) {
            const obj = JSON.parse(raw);
            const lastLabel = obj?.label ? String(obj.label) : "Sua última busca";
            const lastParams = obj?.params ? String(obj.params) : null;
            if (lastParams) {
              if (cancelled) return;
              setMode("lastSearch");
              setLabel(lastLabel);
              // Reaproveita a mesma query da última busca, adicionando paginação padrão
              setQuery(`${lastParams}&page=1&pageSize=12&sort=recent`);
              return;
            }
          }
        }
      } catch {}

      // Fallback: imóveis em destaque na região do usuário
      setMode("featured");

      let preferredCity: string | undefined;
      let preferredState: string | undefined;

      try {
        if (typeof window !== "undefined") {
          preferredCity = localStorage.getItem("lastCity") || undefined;
          preferredState = localStorage.getItem("lastState") || undefined;
        }

        if (!preferredCity || !preferredState) {
          const res = await fetch("/api/properties?pageSize=1&sort=recent&lite=1");
          if (res.ok) {
            const data = await res.json();
            const first = data?.properties?.[0];
            if (first?.city && first?.state) {
              preferredCity = preferredCity || first.city;
              preferredState = preferredState || first.state;
            }
          }
        }
      } catch {}

      if (cancelled) return;

      const headerLabel =
        preferredCity && preferredState
          ? `Imóveis em destaque em ${preferredCity}, ${preferredState}`
          : "Imóveis em destaque";

      setLabel(headerLabel);

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "12");
      params.set("sort", "recent");
      if (preferredCity) params.set("city", preferredCity);
      if (preferredState) params.set("state", preferredState);

      setQuery(params.toString());
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // (Removido) favoritos locais para simplificar o card

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!query) return;
      setLoading(true);
      try {
        const url = `/api/properties?${query}&lite=1`;
        const r = await fetch(url);
        if (!r.ok) return;
        const d = await r.json();
        if (!ignore) {
          setItems(Array.isArray(d.properties) ? d.properties : []);
          setTotal(typeof d.total === "number" ? d.total : (Array.isArray(d.properties) ? d.properties.length : 0));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [query]);

  if (!label) return null;

  const scrollBy = (delta: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const handleGoToSearch = () => {
    if (!query) return;
    router.push(`/?${query}`);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:pt-8 sm:pb-10">
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div className="flex items-center gap-4">
          <div>
            <button
              onClick={handleGoToSearch}
              className="text-left group"
            >
              <div className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] text-teal-600 uppercase mb-1">
                {mode === "lastSearch" ? "Continue sua busca" : "Imóveis em destaque na sua região"}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-teal transition-colors">
                {label}
              </div>
            </button>
            <div className="mt-1 text-xs sm:text-sm text-gray-500 flex items-center gap-2">
              {mode === "lastSearch" ? "Baseado na sua última busca" : "Imóveis que podem te interessar perto de você"}
              {total > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full glass-teal text-white text-[10px] sm:text-xs font-medium">
                  {total} {total === 1 ? "imóvel" : "imóveis"}
                </span>
              )}
            </div>
          </div>
          {/* Removido o botão 'Ver todos' para reduzir poluição visual */}
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            aria-label="Anterior"
            onClick={() => scrollBy(-400)}
            className="p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Próximo"
            onClick={() => scrollBy(400)}
            className="p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="w-[320px] flex-shrink-0 snap-start rounded-2xl overflow-hidden shadow-md animate-pulse bg-white">
              <div className="h-48 bg-gray-200" />
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
          <div className="text-gray-500 text-sm">Sem resultados salvos para continuar.</div>
        ) : (
          items.map((p) => (
            <div key={p.id} className="w-[85vw] sm:w-[300px] md:w-[320px] xl:w-[340px] flex-shrink-0 snap-start">
              <PropertyCardPremium
                property={p}
                onOpenOverlay={(id) => window.dispatchEvent(new CustomEvent('open-overlay', { detail: { id } }))}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
