"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import PortfolioPropertyTile, { type PortfolioProperty } from "./PortfolioPropertyTile";

const PAGE_SIZE = 18;

function matchesSearch(property: PortfolioProperty, term: string): boolean {
  if (!term) return true;
  const haystack = [
    property.title,
    property.city,
    property.state,
    property.neighborhood ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(term.toLowerCase());
}

export default function PortfolioFull({
  realtorName,
  properties,
  onOpenOverlay,
}: {
  realtorName: string;
  properties: PortfolioProperty[];
  onOpenOverlay: (id: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const firstName = realtorName.split(" ")[0] || realtorName;

  const filtered = useMemo(() => {
    return properties.filter((p) => matchesSearch(p, searchTerm));
  }, [properties, searchTerm]);

  const visible = filtered.slice(0, visibleCount);
  const canLoadMore = visibleCount < filtered.length;

  return (
    <section id="grid" className="scroll-mt-28 py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-slate-950 sm:text-3xl">
            Carteira de {firstName}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {properties.length} imóveis ativos
            {searchTerm
              ? ` · ${filtered.length} resultado${filtered.length === 1 ? "" : "s"} para "${searchTerm}"`
              : ""}
            .
          </p>
        </div>

        <div className="w-full sm:w-[360px]">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-slate-300 focus-within:bg-white">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchTerm(searchInput.trim());
                  setVisibleCount(PAGE_SIZE);
                }
              }}
              placeholder="Buscar por bairro, cidade ou título"
              className="flex-1 bg-transparent text-sm text-slate-800 outline-none"
            />
            {searchInput.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchTerm("");
                  setVisibleCount(PAGE_SIZE);
                }}
                className="rounded-full p-1 transition hover:bg-slate-100"
                aria-label="Limpar"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setSearchTerm(searchInput.trim());
                setVisibleCount(PAGE_SIZE);
              }}
              className="rounded-full p-1 transition hover:bg-slate-100"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4 text-slate-700" />
            </button>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Nenhum imóvel encontrado para &ldquo;{searchTerm}&rdquo;.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((property, index) => (
            <PortfolioPropertyTile
              key={property.id}
              property={property}
              priority={index < 3}
              onOpenOverlay={onOpenOverlay}
            />
          ))}
        </div>
      )}

      {canLoadMore ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Ver mais imóveis
          </button>
        </div>
      ) : null}
    </section>
  );
}
