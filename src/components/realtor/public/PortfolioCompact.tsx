"use client";

import PortfolioPropertyTile, { type PortfolioProperty } from "./PortfolioPropertyTile";

export default function PortfolioCompact({
  realtorName,
  properties,
  onOpenOverlay,
}: {
  realtorName: string;
  properties: PortfolioProperty[];
  onOpenOverlay: (id: string) => void;
}) {
  if (properties.length === 0) return null;
  const firstName = realtorName.split(" ")[0] || realtorName;
  const cols = properties.length === 1 ? "lg:grid-cols-1" : "lg:grid-cols-2";

  return (
    <section id="grid" className="scroll-mt-28 py-12">
      <h2 className="font-serif text-2xl text-slate-950 sm:text-3xl">
        Recomendados por {firstName}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        {properties.length === 1
          ? "1 imóvel ativo agora — fale com o corretor para receber novidades."
          : `${properties.length} imóveis ativos agora — fale com o corretor para receber novidades.`}
      </p>
      <div className={`mt-6 grid gap-6 ${cols}`}>
        {properties.map((property, index) => (
          <PortfolioPropertyTile
            key={property.id}
            property={property}
            priority={index === 0}
            onOpenOverlay={onOpenOverlay}
            size="large"
          />
        ))}
      </div>
    </section>
  );
}
