"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { buildPropertyPath } from "@/lib/slug";
import { track } from "@/lib/analytics";

export type PortfolioProperty = {
  id: string;
  title: string;
  price: number | null;
  type: string;
  purpose: string | null;
  city: string;
  state: string;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  parkingSpots: number | null;
  conditionTags?: string[];
  createdAt: string;
  images: { url: string }[];
  // Optional fields used by PortfolioFull filters/map (present in PublicProperty payload).
  latitude?: number | null;
  longitude?: number | null;
  yearBuilt?: number | null;
  condoFee?: number | null;
  iptuYearly?: number | null;
  inCondominium?: boolean | null;
  furnished?: boolean | null;
  petFriendly?: boolean | null;
  petsSmall?: boolean | null;
  petsLarge?: boolean | null;
  hasPool?: boolean | null;
  hasGym?: boolean | null;
  hasElevator?: boolean | null;
  hasBalcony?: boolean | null;
  hasPlayground?: boolean | null;
  hasPartyRoom?: boolean | null;
  hasGourmet?: boolean | null;
  hasConcierge24h?: boolean | null;
  comfortAC?: boolean | null;
  comfortHeating?: boolean | null;
  comfortSolar?: boolean | null;
  comfortNoiseWindows?: boolean | null;
  comfortLED?: boolean | null;
  comfortWaterReuse?: boolean | null;
  accRamps?: boolean | null;
  accWideDoors?: boolean | null;
  accAccessibleElevator?: boolean | null;
  accTactile?: boolean | null;
  finishCabinets?: boolean | null;
  finishCounterGranite?: boolean | null;
  finishCounterQuartz?: boolean | null;
  viewSea?: boolean | null;
  viewCity?: boolean | null;
  viewRiver?: boolean | null;
  viewLake?: boolean | null;
};

function formatBRL(valueCents: number | null): string {
  if (!valueCents || valueCents <= 0) return "Consulte";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valueCents / 100);
  } catch {
    return `R$ ${(valueCents / 100).toFixed(0)}`;
  }
}

function humanizeToken(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return raw
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function PortfolioPropertyTile({
  property,
  priority,
  badge,
  onOpenOverlay,
  size = "regular",
}: {
  property: PortfolioProperty;
  priority: boolean;
  badge?: string | null;
  onOpenOverlay: (id: string) => void;
  size?: "regular" | "large";
}) {
  const href = buildPropertyPath(property.id, property.title);
  const imageUrl = property.images?.[0]?.url || null;
  const aspectClass = size === "large" ? "aspect-[16/10]" : "aspect-[4/3]";
  const priceClass = size === "large" ? "text-3xl" : "text-2xl";

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
      onClick={(e) => {
        try {
          track({ name: "listing_click", payload: { propertyId: property.id } } as any);
        } catch {}
        e.preventDefault();
        onOpenOverlay(property.id);
      }}
    >
      <div className={`relative ${aspectClass} overflow-hidden bg-slate-100`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={property.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 33vw"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex h-full w-full items-center justify-center text-slate-400">
            <MapPin className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        {badge ? (
          <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-900 shadow-sm">
            {badge}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className={`font-serif ${priceClass} leading-none text-slate-950`}>{formatBRL(property.price)}</div>
          <div className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            {[humanizeToken(property.purpose), humanizeToken(property.type)].filter(Boolean).join(" • ")}
          </div>
        </div>

        <div>
          <div className="line-clamp-2 text-base font-semibold leading-6 text-slate-950">{property.title}</div>
          <div className="mt-2 text-sm text-slate-600">
            {[property.neighborhood, property.city, property.state].filter(Boolean).join(", ")}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">
          {property.bedrooms != null ? <span>{property.bedrooms} quartos</span> : null}
          {property.bathrooms != null ? <span>{property.bathrooms} banhos</span> : null}
          {property.areaM2 != null ? <span>{property.areaM2} m²</span> : null}
          {property.parkingSpots != null ? (
            <span>
              {property.parkingSpots} vaga{property.parkingSpots === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-600">
          <span>{property.neighborhood || property.city}</span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-900">
            Ver detalhes
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
