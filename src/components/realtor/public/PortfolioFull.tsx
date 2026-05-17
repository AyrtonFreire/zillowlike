"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Grid3X3, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import SearchFiltersBarZillow, { type FilterValues } from "@/components/SearchFiltersBarZillow";
import PortfolioPropertyTile, { type PortfolioProperty } from "./PortfolioPropertyTile";

const MapWithPriceBubbles = dynamic(
  () => import("@/components/GoogleMapWithPriceBubbles"),
  { ssr: false }
);

const PAGE_SIZE = 18;

const EMPTY_FILTERS: FilterValues = {
  minPrice: "",
  maxPrice: "",
  bedrooms: "",
  bathrooms: "",
  type: "",
  inCondominium: false,
  areaMin: "",
  parkingSpots: "",
  yearBuiltMin: "",
  yearBuiltMax: "",
  purpose: "",
  petFriendly: false,
  furnished: false,
  hasPool: false,
  hasGym: false,
  hasElevator: false,
  hasBalcony: false,
  hasPlayground: false,
  hasPartyRoom: false,
  hasGourmet: false,
  hasConcierge24h: false,
  comfortAC: false,
  comfortHeating: false,
  comfortSolar: false,
  comfortNoiseWindows: false,
  comfortLED: false,
  comfortWaterReuse: false,
  accRamps: false,
  accWideDoors: false,
  accAccessibleElevator: false,
  accTactile: false,
  finishCabinets: false,
  finishCounterGranite: false,
  finishCounterQuartz: false,
  viewSea: false,
  viewCity: false,
  viewRiver: false,
  viewLake: false,
  petsSmall: false,
  petsLarge: false,
  condoFeeMin: "",
  condoFeeMax: "",
  iptuMin: "",
  iptuMax: "",
  keywords: "",
};

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

function requireBool(enabled: boolean, value: boolean | null | undefined): boolean {
  if (!enabled) return true;
  return Boolean(value);
}

function applyFilters(property: PortfolioProperty, f: FilterValues): boolean {
  if (f.type && String(property.type || "") !== f.type) return false;
  if (f.purpose && String(property.purpose || "") !== f.purpose) return false;

  const isInCondominium =
    Boolean(property.inCondominium) ||
    String(property.type || "").toUpperCase() === "CONDO";
  if (f.inCondominium && !isInCondominium) return false;

  const priceCents = Number(property.price || 0);
  const minPriceCents = f.minPrice ? Math.max(0, Number(f.minPrice) * 100) : null;
  const maxPriceCents = f.maxPrice ? Math.max(0, Number(f.maxPrice) * 100) : null;
  if (minPriceCents != null && priceCents < minPriceCents) return false;
  if (maxPriceCents != null && priceCents > maxPriceCents) return false;

  const beds = property.bedrooms ?? 0;
  const baths = property.bathrooms ?? 0;
  const area = property.areaM2 ?? 0;
  const parking = property.parkingSpots ?? 0;
  const yearBuilt = property.yearBuilt ?? 0;

  const minBeds = f.bedrooms ? Number(f.bedrooms) : null;
  const minBaths = f.bathrooms ? Number(f.bathrooms) : null;
  const minArea = f.areaMin ? Number(f.areaMin) : null;
  const minParking = f.parkingSpots ? Number(f.parkingSpots) : null;
  const minYear = f.yearBuiltMin ? Number(f.yearBuiltMin) : null;
  const maxYear = f.yearBuiltMax ? Number(f.yearBuiltMax) : null;

  if (minBeds != null && beds < minBeds) return false;
  if (minBaths != null && baths < minBaths) return false;
  if (minArea != null && area < minArea) return false;
  if (minParking != null && parking < minParking) return false;
  if (minYear != null && yearBuilt < minYear) return false;
  if (maxYear != null && yearBuilt > maxYear) return false;

  const condoFee = Number(property.condoFee || 0);
  const iptuYearly = Number(property.iptuYearly || 0);
  const minCondoCents = f.condoFeeMin ? Math.max(0, Number(f.condoFeeMin) * 100) : null;
  const maxCondoCents = f.condoFeeMax ? Math.max(0, Number(f.condoFeeMax) * 100) : null;
  const minIptuCents = f.iptuMin ? Math.max(0, Number(f.iptuMin) * 100) : null;
  const maxIptuCents = f.iptuMax ? Math.max(0, Number(f.iptuMax) * 100) : null;
  if (minCondoCents != null && condoFee < minCondoCents) return false;
  if (maxCondoCents != null && condoFee > maxCondoCents) return false;
  if (minIptuCents != null && iptuYearly < minIptuCents) return false;
  if (maxIptuCents != null && iptuYearly > maxIptuCents) return false;

  if (!requireBool(f.furnished, property.furnished)) return false;
  if (!requireBool(f.petFriendly, property.petFriendly)) return false;
  if (!requireBool(f.petsSmall, property.petsSmall)) return false;
  if (!requireBool(f.petsLarge, property.petsLarge)) return false;
  if (!requireBool(f.hasPool, property.hasPool)) return false;
  if (!requireBool(f.hasGym, property.hasGym)) return false;
  if (!requireBool(f.hasElevator, property.hasElevator)) return false;
  if (!requireBool(f.hasBalcony, property.hasBalcony)) return false;
  if (!requireBool(f.hasPlayground, property.hasPlayground)) return false;
  if (!requireBool(f.hasPartyRoom, property.hasPartyRoom)) return false;
  if (!requireBool(f.hasGourmet, property.hasGourmet)) return false;
  if (!requireBool(f.hasConcierge24h, property.hasConcierge24h)) return false;
  if (!requireBool(f.comfortAC, property.comfortAC)) return false;
  if (!requireBool(f.comfortHeating, property.comfortHeating)) return false;
  if (!requireBool(f.comfortSolar, property.comfortSolar)) return false;
  if (!requireBool(f.comfortNoiseWindows, property.comfortNoiseWindows)) return false;
  if (!requireBool(f.comfortLED, property.comfortLED)) return false;
  if (!requireBool(f.comfortWaterReuse, property.comfortWaterReuse)) return false;
  if (!requireBool(f.accRamps, property.accRamps)) return false;
  if (!requireBool(f.accWideDoors, property.accWideDoors)) return false;
  if (!requireBool(f.accAccessibleElevator, property.accAccessibleElevator)) return false;
  if (!requireBool(f.accTactile, property.accTactile)) return false;
  if (!requireBool(f.finishCabinets, property.finishCabinets)) return false;
  if (!requireBool(f.finishCounterGranite, property.finishCounterGranite)) return false;
  if (!requireBool(f.finishCounterQuartz, property.finishCounterQuartz)) return false;
  if (!requireBool(f.viewSea, property.viewSea)) return false;
  if (!requireBool(f.viewCity, property.viewCity)) return false;
  if (!requireBool(f.viewRiver, property.viewRiver)) return false;
  if (!requireBool(f.viewLake, property.viewLake)) return false;

  if (f.keywords) {
    const kw = f.keywords.trim().toLowerCase();
    if (kw) {
      const text = [property.title, property.neighborhood, property.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!text.includes(kw)) return false;
    }
  }

  return true;
}

function countActiveFilters(f: FilterValues): number {
  let count = 0;
  for (const value of Object.values(f)) {
    if (typeof value === "boolean" && value) count++;
    else if (typeof value === "string" && value.trim().length > 0) count++;
  }
  return count;
}

type ViewMode = "list" | "map";

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const firstName = realtorName.split(" ")[0] || realtorName;

  const filtered = useMemo(() => {
    return properties.filter((p) => matchesSearch(p, searchTerm) && applyFilters(p, filters));
  }, [properties, searchTerm, filters]);

  const visible = filtered.slice(0, visibleCount);
  const canLoadMore = visibleCount < filtered.length;
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const mapItems = useMemo(
    () =>
      filtered
        .filter(
          (p) =>
            typeof p.latitude === "number" &&
            typeof p.longitude === "number" &&
            p.latitude !== 0 &&
            p.longitude !== 0
        )
        .slice(0, 1500)
        .map((p) => ({
          id: p.id,
          price: Number(p.price || 0),
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          title: p.title,
        })),
    [filtered]
  );

  return (
    <section id="grid" className="scroll-mt-28 py-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-slate-950 sm:text-3xl">
            Carteira de {firstName}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {properties.length} imóveis ativos
            {searchTerm
              ? ` · ${filtered.length} resultado${filtered.length === 1 ? "" : "s"} para "${searchTerm}"`
              : activeFilterCount > 0
                ? ` · ${filtered.length} dentro dos filtros`
                : ""}
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "map"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Mapa
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Refinar
            {activeFilterCount > 0 ? (
              <span className="ml-1 rounded-full bg-slate-900 px-1.5 text-[10px] text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <div className="w-full sm:w-[280px] lg:w-[320px]">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 transition focus-within:border-slate-300 focus-within:bg-white">
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
            </div>
          </div>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="mt-6 h-[520px] overflow-hidden rounded-3xl border border-slate-200">
          {mapItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Nenhum imóvel com coordenadas para exibir no mapa.
            </div>
          ) : (
            <MapWithPriceBubbles items={mapItems} isLoading={false} autoLoad />
          )}
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Nenhum imóvel encontrado
          {searchTerm ? ` para "${searchTerm}"` : ""}
          {activeFilterCount > 0 ? " com os filtros atuais" : ""}.
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

      {viewMode === "list" && canLoadMore ? (
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

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        contentClassName="p-0 overflow-hidden flex-1 min-h-0"
      >
        <SearchFiltersBarZillow
          variant="drawer"
          disablePreview
          filters={filters}
          totalResults={filtered.length}
          onFiltersChange={(next) => setFilters(next)}
          onClearFilters={() => {
            setFilters(EMPTY_FILTERS);
            setVisibleCount(PAGE_SIZE);
          }}
          onApply={(applied) => {
            setFilters(applied);
            setVisibleCount(PAGE_SIZE);
            setFiltersOpen(false);
          }}
        />
      </Drawer>
    </section>
  );
}
