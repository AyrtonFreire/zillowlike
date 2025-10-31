"use client";
import { PropertyCardPremium } from "@/components/modern";
import Carousel from "@/components/ui/Carousel";

export default function SimilarCarousel({ properties, onOpenOverlay }: { properties: any[]; onOpenOverlay?: (id: string) => void }) {
  if (!properties || properties.length === 0) return null;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 font-display">Também pode gostar</h2>
      </div>
      <div className="md:hidden">
        <Carousel items={properties} renderItem={(p) => <div className="px-1"><PropertyCardPremium property={p} onOpenOverlay={onOpenOverlay} /></div>} />
      </div>
      <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {properties.map(p => <PropertyCardPremium key={p.id} property={p} onOpenOverlay={onOpenOverlay} />)}
      </div>
    </div>
  );
}
