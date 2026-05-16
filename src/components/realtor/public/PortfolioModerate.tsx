"use client";

import { useMemo, useState } from "react";
import PortfolioPropertyTile, { type PortfolioProperty } from "./PortfolioPropertyTile";

type PurposeTab = "ALL" | "SALE" | "RENT";

function tabFor(purpose: string | null): PurposeTab {
  const v = (purpose || "").trim().toUpperCase();
  if (v === "RENT" || v === "ALUGUEL") return "RENT";
  if (v === "SALE" || v === "BUY" || v === "VENDA") return "SALE";
  return "ALL";
}

export default function PortfolioModerate({
  realtorName,
  properties,
  onOpenOverlay,
}: {
  realtorName: string;
  properties: PortfolioProperty[];
  onOpenOverlay: (id: string) => void;
}) {
  const firstName = realtorName.split(" ")[0] || realtorName;

  const counts = useMemo(() => {
    let sale = 0;
    let rent = 0;
    for (const p of properties) {
      const t = tabFor(p.purpose);
      if (t === "SALE") sale++;
      else if (t === "RENT") rent++;
    }
    return { sale, rent };
  }, [properties]);

  const mixed = counts.sale > 0 && counts.rent > 0;
  const [tab, setTab] = useState<PurposeTab>("ALL");

  const filtered = useMemo(() => {
    if (!mixed || tab === "ALL") return properties;
    return properties.filter((p) => tabFor(p.purpose) === tab);
  }, [mixed, properties, tab]);

  return (
    <section id="grid" className="scroll-mt-28 py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-slate-950 sm:text-3xl">
            Carteira de {firstName}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {properties.length} imóveis ativos publicados.
          </p>
        </div>
        {mixed ? (
          <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
            {(["ALL", "SALE", "RENT"] as const).map((value) => {
              const label = value === "ALL" ? "Tudo" : value === "SALE" ? `Comprar (${counts.sale})` : `Alugar (${counts.rent})`;
              const active = tab === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    active ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((property, index) => (
          <PortfolioPropertyTile
            key={property.id}
            property={property}
            priority={index < 3}
            onOpenOverlay={onOpenOverlay}
          />
        ))}
      </div>
    </section>
  );
}
