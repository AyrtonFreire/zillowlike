"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export type AreaCard = {
  id: string;
  city: "Petrolina" | "Juazeiro";
  name: string; // bairro/região
  avgPrice?: number; // em centavos
  count?: number;
  image: string;
};

const DEFAULT_AREAS: AreaCard[] = [
  { id: "pt-centro", city: "Petrolina", name: "Centro", avgPrice: 38000000, count: 24, image: "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1200&auto=format&fit=crop" },
  { id: "pt-jardim", city: "Petrolina", name: "Jardim Amazonas", avgPrice: 42000000, count: 18, image: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c52f?q=80&w=1200&auto=format&fit=crop" },
  { id: "jz-centro", city: "Juazeiro", name: "Centro", avgPrice: 32000000, count: 20, image: "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1200&auto=format&fit=crop" },
  { id: "jz-santo", city: "Juazeiro", name: "Santo Antônio", avgPrice: 35000000, count: 16, image: "https://images.unsplash.com/photo-1460899960812-f6ee1ecaf117?q=80&w=1200&auto=format&fit=crop" },
];

export default function NeighborhoodGrid({ items = DEFAULT_AREAS }: { items?: AreaCard[] }) {
  const router = useRouter();
  function goTo(area: AreaCard) {
    const sp = new URLSearchParams();
    sp.set("city", area.city);
    sp.set("state", area.city === "Petrolina" ? "PE" : "BA");
    // opcional: enviar q=bairro
    // sp.set("q", area.name);
    router.push(`/?${sp.toString()}`);
  }
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Explorar por áreas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((a) => (
          <button key={a.id} className="text-left group rounded-xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-all" onClick={() => goTo(a)}>
            <div className="relative">
              <Image src={a.image} alt={a.name} width={800} height={500} className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <div className="font-semibold drop-shadow-sm">{a.name} · {a.city}</div>
                <div className="text-xs text-white/90">
                  {typeof a.avgPrice === "number" ? `Preço médio R$ ${(a.avgPrice/100).toLocaleString('pt-BR')}` : "Preço médio —"}
                  {typeof a.count === "number" ? ` · ${a.count} imóveis` : ""}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
