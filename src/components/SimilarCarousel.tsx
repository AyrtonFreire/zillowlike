"use client";
import * as React from "react";
import { PropertyCardPremium } from "@/components/modern";
import Link from "next/link";
import { buildPropertyPath } from "@/lib/slug";

type Props = {
  properties: any[];
  onOpenOverlay?: (id: string) => void;
  title?: string;
  showHeader?: boolean; // default: false
};

export default function SimilarCarousel({ properties, onOpenOverlay, title, showHeader = false }: Props) {
  if (!properties || properties.length === 0) return null;

  const scrollerRef = React.useRef<HTMLDivElement | null>(null);

  const scrollBy = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.9) * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-6">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-display font-semibold text-gray-900">
            {title || "Imóveis"}
          </h2>
          <div className="hidden sm:flex items-center gap-2">
            <button aria-label="Anterior" onClick={() => scrollBy(-1)} className="w-8 h-8 rounded-full border bg-white hover:bg-gray-50 shadow flex items-center justify-center">‹</button>
            <button aria-label="Próximo" onClick={() => scrollBy(1)} className="w-8 h-8 rounded-full border bg-white hover:bg-gray-50 shadow flex items-center justify-center">›</button>
          </div>
        </div>
      )}

      {/* Single-row horizontal scroller */}
      <div className="relative">
        <div ref={scrollerRef} className="flex gap-4 md:gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {properties.map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-[88vw] sm:w-[340px] md:w-[380px] xl:w-[420px] 2xl:w-[460px]">
              {onOpenOverlay ? (
                <PropertyCardPremium property={p} onOpenOverlay={onOpenOverlay} />
              ) : (
                <Link href={buildPropertyPath(p.id, p.title)} className="block">
                  <PropertyCardPremium property={p} />
                </Link>
              )}
            </div>
          ))}
        </div>
        {/* Mobile arrows - floating */}
        <div className="sm:hidden absolute inset-y-1/2 -translate-y-1/2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <button aria-label="Anterior" onClick={() => scrollBy(-1)} className="pointer-events-auto w-9 h-9 rounded-full border bg-white/95 shadow flex items-center justify-center">‹</button>
          <button aria-label="Próximo" onClick={() => scrollBy(1)} className="pointer-events-auto w-9 h-9 rounded-full border bg-white/95 shadow flex items-center justify-center">›</button>
        </div>
      </div>
    </div>
  );
}
