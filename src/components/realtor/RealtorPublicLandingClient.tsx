"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { ModernNavbar } from "@/components/modern";
import { buildPropertyPath } from "@/lib/slug";
import { track } from "@/lib/analytics";
import AgencyPublicProfileSections from "@/components/realtor/AgencyPublicProfileSections";
import RealtorReviewsSection from "@/components/realtor/RealtorReviewsSection";
import SeloAtividade from "@/components/realtor/SeloAtividade";
import RatingStars from "@/components/queue/RatingStars";
import PropertyDetailsModalJames from "@/components/PropertyDetailsModalJames";
import Drawer from "@/components/ui/Drawer";
import SearchFiltersBarZillow, { type FilterValues } from "@/components/SearchFiltersBarZillow";
import {
  ArrowUpRight,
  BadgeDollarSign,
  BedDouble,
  Building2,
  Check,
  Copy,
  Globe,
  Grid3X3,
  Info,
  Instagram,
  Linkedin,
  MapPin,
  MessageCircle,
  Phone,
  PawPrint,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

const MapWithPriceBubbles = dynamic(() => import("@/components/GoogleMapWithPriceBubbles"), { ssr: false });

type PublicProperty = {
  id: string;
  title: string;
  price: number | null;
  type: string;
  inCondominium?: boolean | null;
  purpose: string | null;
  city: string;
  state: string;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  parkingSpots: number | null;
  yearBuilt: number | null;
  condoFee: number | null;
  iptuYearly: number | null;
  furnished: boolean | null;
  petFriendly: boolean | null;
  petsSmall: boolean | null;
  petsLarge: boolean | null;
  hasPool: boolean | null;
  hasGym: boolean | null;
  hasElevator: boolean | null;
  hasBalcony: boolean | null;
  hasPlayground: boolean | null;
  hasPartyRoom: boolean | null;
  hasGourmet: boolean | null;
  hasConcierge24h: boolean | null;
  comfortAC: boolean | null;
  comfortHeating: boolean | null;
  comfortSolar: boolean | null;
  comfortNoiseWindows: boolean | null;
  comfortLED: boolean | null;
  comfortWaterReuse: boolean | null;
  accRamps: boolean | null;
  accWideDoors: boolean | null;
  accAccessibleElevator: boolean | null;
  accTactile: boolean | null;
  finishCabinets: boolean | null;
  finishCounterGranite: boolean | null;
  finishCounterQuartz: boolean | null;
  viewSea: boolean | null;
  viewCity: boolean | null;
  viewRiver: boolean | null;
  viewLake: boolean | null;
  conditionTags: string[];
  createdAt: string;
  updatedAt: string;
  leadsCount: number;
  viewsCount: number;
  images: { url: string }[];
};

type RealtorPublicLandingClientProps = {
  siteUrl: string;
  pageUrl: string;
  realtor: {
    id: string;
    name: string;
    role: "REALTOR" | "AGENCY";
    publicSlug: string | null;
    image: string | null;
    publicHeadline: string | null;
    publicBio: string | null;
    publicCity: string | null;
    publicState: string | null;
    publicServiceAreas: string[];
    publicWhatsApp: string | null;
    publicPhoneOptIn: boolean;
    phoneVerified: boolean;
    phone: string | null;
    instagram: string | null;
    linkedin: string | null;
    avgRating: number;
    totalRatings: number;
    avgResponseTime: number | null;
    experience: number | null;
    soldCount: number;
    rentedCount: number;
    lastActivity: string | null;
    team: { id: string; name: string } | null;
    creci: string | null;
    creciState: string | null;
  };
  properties: PublicProperty[];
  initialRatingsPreview: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    authorName: string | null;
    authorImage: string | null;
  }>;
  agencyProfile?: {
    website: string | null;
    specialties: string[];
    yearsInBusiness: number | null;
    serviceAreas: string[];
    completion: {
      score: number;
      checklist: Array<{ key: string; label: string; done: boolean }>;
    };
    teamMembers: Array<{
      id: string;
      name: string;
      image: string | null;
      headline: string | null;
      publicSlug: string | null;
      whatsappHref: string | null;
    }>;
    ctaCards: Array<{
      key: string;
      intent: "BUY" | "RENT" | "LIST";
      title: string;
      description: string;
      actionLabel: string;
      href: string | null;
      contactName: string | null;
      helper: string | null;
    }>;
    operationMetrics: Array<{
      label: string;
      value: string;
      helper: string;
    }>;
  } | null;
};

const DEFAULT_PAGE_SIZE = 36;

function BrandWhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.02 0C5.42 0 .05 5.37.05 11.97c0 2.11.55 4.17 1.6 5.98L0 24l6.2-1.63a11.9 11.9 0 0 0 5.82 1.5h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.19-1.24-6.19-3.48-8.42ZM12.02 21.7h-.01a9.7 9.7 0 0 1-4.95-1.36l-.35-.2-3.68.96.98-3.59-.23-.36A9.68 9.68 0 0 1 2.33 12C2.33 6.63 6.65 2.31 12.02 2.31c2.58 0 5.01 1.01 6.83 2.83A9.6 9.6 0 0 1 21.7 12c0 5.36-4.32 9.7-9.68 9.7Zm5.62-7.25c-.31-.15-1.83-.9-2.12-1-.29-.1-.5-.15-.71.15-.21.31-.82 1-.99 1.2-.18.2-.35.23-.66.08-.31-.15-1.28-.47-2.44-1.5-.9-.8-1.5-1.8-1.68-2.1-.18-.31-.02-.48.13-.63.14-.14.31-.35.46-.53.15-.18.2-.31.31-.52.1-.2.05-.39-.03-.54-.08-.15-.71-1.7-.98-2.33-.26-.62-.52-.54-.71-.55-.18-.01-.39-.01-.6-.01-.21 0-.54.08-.82.39-.28.31-1.08 1.05-1.08 2.56 0 1.51 1.11 2.97 1.25 3.17.15.21 2.18 3.33 5.28 4.67.74.32 1.32.51 1.77.66.74.24 1.42.2 1.96.12.6-.09 1.83-.75 2.09-1.47.26-.72.26-1.35.18-1.47-.08-.12-.28-.2-.59-.35Z" />
    </svg>
  );
}

function BrandInstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.75-.9a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
    </svg>
  );
}

function BrandFacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.08 10.13 24v-8.43H7.08v-3.5h3.05V9.43c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.96h-1.52c-1.49 0-1.96.93-1.96 1.88v2.25h3.33l-.53 3.5h-2.8V24C19.61 23.08 24 18.1 24 12.07Z" />
    </svg>
  );
}

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

function formatBRL(valueCents: number | null) {
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

function normalizePhone(value: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || null;
}

function buildWhatsAppUrl(phoneDigits: string, message: string) {
  const base = `https://wa.me/${phoneDigits}`;
  const text = encodeURIComponent(message);
  return `${base}?text=${text}`;
}

function formatPhoneForTel(value: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `+${digits}` : null;
}

function toDateLabel(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function normalizeExternalUrl(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function normalizeInstagramUrl(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "").replace(/^www\.instagram\.com\//i, "");
  if (!handle) return null;
  return `https://www.instagram.com/${handle}`;
}

function formatCompactUrl(value: string | null) {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) return null;
  return normalized.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

function humanizeToken(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return raw
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function RealtorPublicLandingClient({
  siteUrl,
  pageUrl,
  realtor,
  properties,
  initialRatingsPreview,
  agencyProfile,
}: RealtorPublicLandingClientProps) {
  void siteUrl;
  const { data: session } = useSession();

  const [highlight, setHighlight] = useState<string>("featured");
  const [visibleCount, setVisibleCount] = useState(DEFAULT_PAGE_SIZE);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInstagram, setCopiedInstagram] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);

  const [desktopViewMode, setDesktopViewMode] = useState<"list" | "map">("list");
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);

  const [reviewsOpen, setReviewsOpen] = useState(false);
  const reviewsHistoryPushedRef = useRef(false);
  const closingFromPopstateRef = useRef(false);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayPropertyId, setOverlayPropertyId] = useState<string | null>(null);

  const isOwner = useMemo(() => {
    const sid = (session as any)?.user?.id || (session as any)?.userId;
    return sid && String(sid) === String(realtor.id);
  }, [realtor.id, session]);

  const whatsappDigits = useMemo(() => {
    const wa = normalizePhone(realtor.publicWhatsApp);
    if (wa) return wa;
    if (realtor.publicPhoneOptIn && realtor.phoneVerified) {
      const phone = normalizePhone(realtor.phone);
      if (phone) return phone;
    }
    return null;
  }, [realtor.phone, realtor.phoneVerified, realtor.publicPhoneOptIn, realtor.publicWhatsApp]);

  const serviceAreaChips = useMemo(() => {
    const areas = Array.isArray(realtor.publicServiceAreas) ? realtor.publicServiceAreas : [];
    return areas.map((a) => String(a || "").trim()).filter(Boolean);
  }, [realtor.publicServiceAreas]);

  const locationLabel = useMemo(() => {
    const loc = [realtor.publicCity, realtor.publicState].filter(Boolean).join("/");
    return loc || null;
  }, [realtor.publicCity, realtor.publicState]);

  const defaultRegionLabel = useMemo(() => {
    return serviceAreaChips[0] || locationLabel || "sua região";
  }, [locationLabel, serviceAreaChips]);

  const baseIntroMessage = useMemo(() => {
    return `Oi, vim do seu perfil no OggaHub. Quero receber opções de imóveis em ${defaultRegionLabel}. Pode me ajudar?`;
  }, [defaultRegionLabel]);

  const teamLabel = realtor.team?.name ? realtor.team.name : null;

  const telHref = useMemo(() => {
    if (!realtor.publicPhoneOptIn || !realtor.phoneVerified) return null;
    return formatPhoneForTel(realtor.phone);
  }, [realtor.phone, realtor.phoneVerified, realtor.publicPhoneOptIn]);

  const ratingValueLabel = useMemo(() => {
    return realtor.avgRating > 0 ? realtor.avgRating.toFixed(1) : "—";
  }, [realtor.avgRating]);

  const profileNarrative = useMemo(() => {
    return (
      realtor.publicBio ||
      realtor.publicHeadline ||
      `${realtor.name} apresenta uma seleção pública de imóveis com foco em clareza, confiança e contexto de mercado.`
    );
  }, [realtor.name, realtor.publicBio, realtor.publicHeadline]);

  const testimonialsPreview = useMemo(() => {
    return (initialRatingsPreview || [])
      .filter((r) => Boolean(r.comment && String(r.comment).trim()))
      .slice(0, 2);
  }, [initialRatingsPreview]);

  const heroStats = useMemo(() => {
    const items: Array<{ label: string; value: string }> = [
      { label: "Imóveis ativos", value: String(properties.length) },
    ];

    if (realtor.soldCount > 0) items.push({ label: "Imóveis vendidos", value: String(realtor.soldCount) });
    if (realtor.rentedCount > 0) items.push({ label: "Imóveis alugados", value: String(realtor.rentedCount) });
    if (realtor.experience != null && realtor.experience > 0) {
      items.push({
        label: "Experiência",
        value: `${realtor.experience} ano${realtor.experience === 1 ? "" : "s"}`,
      });
    }

    return items;
  }, [properties.length, realtor.experience, realtor.rentedCount, realtor.soldCount]);

  const roleLabel = realtor.role === "AGENCY" ? "Imobiliária" : "Corretor";

  const heroImage = useMemo(() => {
    return properties.find((item) => item.images?.[0]?.url)?.images?.[0]?.url || realtor.image || null;
  }, [properties, realtor.image]);

  const websiteHref = useMemo(() => normalizeExternalUrl(agencyProfile?.website || null), [agencyProfile?.website]);

  const instagramHref = useMemo(() => normalizeInstagramUrl(realtor.instagram), [realtor.instagram]);

  const linkedinHref = useMemo(() => normalizeExternalUrl(realtor.linkedin), [realtor.linkedin]);

  const socialLinks = useMemo(() => {
    const items: Array<{ key: string; label: string; href: string; icon: ReactNode }> = [];
    if (instagramHref) items.push({ key: "instagram", label: "Instagram", href: instagramHref, icon: <Instagram className="h-4 w-4" /> });
    if (linkedinHref) items.push({ key: "linkedin", label: "LinkedIn", href: linkedinHref, icon: <Linkedin className="h-4 w-4" /> });
    if (websiteHref) items.push({ key: "website", label: "Website", href: websiteHref, icon: <Globe className="h-4 w-4" /> });
    return items;
  }, [instagramHref, linkedinHref, websiteHref]);

  const keyInfoEntries = useMemo(() => {
    const items: Array<{ label: string; value: ReactNode }> = [];

    if (locationLabel) {
      items.push({
        label: "Base de atuação",
        value: locationLabel,
      });
    }

    if (serviceAreaChips.length > 0) {
      items.push({
        label: "Áreas atendidas",
        value: (
          <div className="flex flex-wrap gap-2">
            {serviceAreaChips.slice(0, 8).map((area) => (
              <span key={area} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {area}
              </span>
            ))}
          </div>
        ),
      });
    }

    if (websiteHref) {
      items.push({
        label: "Website",
        value: (
          <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-slate-700 underline-offset-4 hover:underline">
            {formatCompactUrl(websiteHref)}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ),
      });
    }

    return items;
  }, [locationLabel, serviceAreaChips, websiteHref]);

  const hasKeyInfo = keyInfoEntries.length > 0;

  const topFacts = useMemo(() => {
    const items: Array<{ label: string; value: string; helper: string }> = [
      {
        label: "Portfólio",
        value: String(properties.length),
        helper: realtor.role === "AGENCY" ? "Imóveis ativos da agência" : "Imóveis ativos no perfil",
      },
    ];

    if (realtor.role === "AGENCY") {
      items.push({
        label: "Corretores",
        value: String(agencyProfile?.teamMembers.length || 0),
        helper: "Perfis públicos vinculados",
      });
    } else if (realtor.experience != null && realtor.experience > 0) {
      items.push({
        label: "Experiência",
        value: `${realtor.experience} ano${realtor.experience === 1 ? "" : "s"}`,
        helper: "Tempo declarado de atuação",
      });
    }

    if (locationLabel) {
      items.push({
        label: "Base",
        value: locationLabel,
        helper: "Cidade e estado públicos",
      });
    }

    if (realtor.totalRatings > 0) {
      items.push({
        label: "Avaliações",
        value: ratingValueLabel,
        helper: `${realtor.totalRatings} review${realtor.totalRatings === 1 ? "" : "s"} pública${realtor.totalRatings === 1 ? "" : "s"}`,
      });
    } else if (realtor.avgResponseTime != null) {
      items.push({
        label: "Resposta média",
        value: `${realtor.avgResponseTime} min`,
        helper: "Tempo médio de resposta",
      });
    }

    if (websiteHref) {
      items.push({
        label: "Website",
        value: formatCompactUrl(websiteHref) || "Site",
        helper: "Canal institucional",
      });
    } else if (teamLabel) {
      items.push({
        label: "Equipe",
        value: teamLabel,
        helper: "Time associado ao perfil",
      });
    }

    if (serviceAreaChips.length > 0) {
      items.push({
        label: "Regiões",
        value: String(serviceAreaChips.length),
        helper: serviceAreaChips.slice(0, 2).join(" • "),
      });
    }

    return items.slice(0, 4);
  }, [agencyProfile?.teamMembers.length, locationLabel, properties.length, ratingValueLabel, realtor.avgResponseTime, realtor.experience, realtor.role, realtor.totalRatings, serviceAreaChips, teamLabel, websiteHref]);

  const teamPreview = useMemo(() => {
    return (agencyProfile?.teamMembers || []).slice(0, 3);
  }, [agencyProfile?.teamMembers]);

  const isFeatured = (p: PublicProperty) => Array.isArray(p.conditionTags) && p.conditionTags.includes("Destaque");
  const isPetsOk = (p: PublicProperty) => Boolean(p.petFriendly) || Boolean(p.petsSmall) || Boolean(p.petsLarge);
  const isNew = (p: PublicProperty) => {
    const created = new Date(p.createdAt);
    if (Number.isNaN(created.getTime())) return false;
    const days = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 14;
  };

  const filteredInventory = useMemo(() => {
    const f = filters;
    const minPriceCents = f.minPrice ? Math.max(0, Number(f.minPrice) * 100) : null;
    const maxPriceCents = f.maxPrice ? Math.max(0, Number(f.maxPrice) * 100) : null;
    const minBeds = f.bedrooms ? Math.max(0, Number(f.bedrooms)) : null;
    const minBaths = f.bathrooms ? Math.max(0, Number(f.bathrooms)) : null;
    const minArea = f.areaMin ? Math.max(0, Number(f.areaMin)) : null;
    const minParking = f.parkingSpots ? Math.max(0, Number(f.parkingSpots)) : null;
    const minYear = f.yearBuiltMin ? Math.max(0, Number(f.yearBuiltMin)) : null;
    const maxYear = f.yearBuiltMax ? Math.max(0, Number(f.yearBuiltMax)) : null;
    const minCondoCents = f.condoFeeMin ? Math.max(0, Number(f.condoFeeMin) * 100) : null;
    const maxCondoCents = f.condoFeeMax ? Math.max(0, Number(f.condoFeeMax) * 100) : null;
    const minIptuCents = f.iptuMin ? Math.max(0, Number(f.iptuMin) * 100) : null;
    const maxIptuCents = f.iptuMax ? Math.max(0, Number(f.iptuMax) * 100) : null;
    const kw = String(f.keywords || "").trim().toLowerCase();

    const requireBool = (enabled: boolean, value: any) => {
      if (!enabled) return true;
      return Boolean(value);
    };

    return (properties || []).filter((p) => {
      if (f.type && String(p.type || "") !== String(f.type)) return false;
      if (f.purpose && String(p.purpose || "") !== String(f.purpose)) return false;

      const isInCondominium = Boolean((p as any)?.inCondominium) || String(p.type || "").toUpperCase() === "CONDO";
      if (f.inCondominium && !isInCondominium) return false;

      const price = Number(p.price || 0);
      if (minPriceCents != null && price < minPriceCents) return false;
      if (maxPriceCents != null && price > maxPriceCents) return false;

      const beds = p.bedrooms != null ? Number(p.bedrooms) : 0;
      const baths = p.bathrooms != null ? Number(p.bathrooms) : 0;
      const area = p.areaM2 != null ? Number(p.areaM2) : 0;
      const parking = p.parkingSpots != null ? Number(p.parkingSpots) : 0;
      const yearBuilt = p.yearBuilt != null ? Number(p.yearBuilt) : 0;

      if (minBeds != null && beds < minBeds) return false;
      if (minBaths != null && baths < minBaths) return false;
      if (minArea != null && area < minArea) return false;
      if (minParking != null && parking < minParking) return false;
      if (minYear != null && yearBuilt < minYear) return false;
      if (maxYear != null && yearBuilt > maxYear) return false;

      const condoFee = Number(p.condoFee || 0);
      const iptuYearly = Number(p.iptuYearly || 0);
      if (minCondoCents != null && condoFee < minCondoCents) return false;
      if (maxCondoCents != null && condoFee > maxCondoCents) return false;
      if (minIptuCents != null && iptuYearly < minIptuCents) return false;
      if (maxIptuCents != null && iptuYearly > maxIptuCents) return false;

      if (!requireBool(f.petFriendly, p.petFriendly || p.petsSmall || p.petsLarge)) return false;
      if (!requireBool(f.furnished, p.furnished)) return false;

      if (!requireBool(f.hasPool, p.hasPool)) return false;
      if (!requireBool(f.hasGym, p.hasGym)) return false;
      if (!requireBool(f.hasElevator, p.hasElevator)) return false;
      if (!requireBool(f.hasBalcony, p.hasBalcony)) return false;
      if (!requireBool(f.hasPlayground, p.hasPlayground)) return false;
      if (!requireBool(f.hasPartyRoom, p.hasPartyRoom)) return false;
      if (!requireBool(f.hasGourmet, p.hasGourmet)) return false;
      if (!requireBool(f.hasConcierge24h, p.hasConcierge24h)) return false;

      if (!requireBool(f.comfortAC, p.comfortAC)) return false;
      if (!requireBool(f.comfortHeating, p.comfortHeating)) return false;
      if (!requireBool(f.comfortSolar, p.comfortSolar)) return false;
      if (!requireBool(f.comfortNoiseWindows, p.comfortNoiseWindows)) return false;
      if (!requireBool(f.comfortLED, p.comfortLED)) return false;
      if (!requireBool(f.comfortWaterReuse, p.comfortWaterReuse)) return false;

      if (!requireBool(f.accRamps, p.accRamps)) return false;
      if (!requireBool(f.accWideDoors, p.accWideDoors)) return false;
      if (!requireBool(f.accAccessibleElevator, p.accAccessibleElevator)) return false;
      if (!requireBool(f.accTactile, p.accTactile)) return false;

      if (!requireBool(f.finishCabinets, p.finishCabinets)) return false;
      if (!requireBool(f.finishCounterGranite, p.finishCounterGranite)) return false;
      if (!requireBool(f.finishCounterQuartz, p.finishCounterQuartz)) return false;

      if (!requireBool(f.viewSea, p.viewSea)) return false;
      if (!requireBool(f.viewCity, p.viewCity)) return false;
      if (!requireBool(f.viewRiver, p.viewRiver)) return false;
      if (!requireBool(f.viewLake, p.viewLake)) return false;

      if (!requireBool(f.petsSmall, p.petsSmall)) return false;
      if (!requireBool(f.petsLarge, p.petsLarge)) return false;

      if (kw) {
        const title = String(p.title || "").toLowerCase();
        const neighborhood = String(p.neighborhood || "").toLowerCase();
        const city = String(p.city || "").toLowerCase();
        const state = String(p.state || "").toLowerCase();
        if (!title.includes(kw) && !neighborhood.includes(kw) && !city.includes(kw) && !state.includes(kw)) return false;
      }

      return true;
    });
  }, [filters, properties]);

  const featuredList = useMemo(() => {
    const tagged = filteredInventory.filter((p) => Array.isArray(p.conditionTags) && p.conditionTags.includes("Destaque"));
    if (tagged.length > 0) return tagged;
    const sorted = [...filteredInventory].sort((a, b) => {
      const dl = (b.leadsCount || 0) - (a.leadsCount || 0);
      if (dl !== 0) return dl;
      const dv = (b.viewsCount || 0) - (a.viewsCount || 0);
      if (dv !== 0) return dv;
      return b.createdAt.localeCompare(a.createdAt);
    });
    return sorted.slice(0, 24);
  }, [filteredInventory]);

  const newList = useMemo(() => {
    return [...filteredInventory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [filteredInventory]);

  const popularList = useMemo(() => {
    return [...filteredInventory].sort((a, b) => {
      const dl = (b.leadsCount || 0) - (a.leadsCount || 0);
      if (dl !== 0) return dl;
      const dv = (b.viewsCount || 0) - (a.viewsCount || 0);
      if (dv !== 0) return dv;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [filteredInventory]);

  const neighborhoodHighlights = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of filteredInventory) {
      const nb = String(p.neighborhood || "").trim();
      if (!nb) continue;
      counts.set(nb, (counts.get(nb) || 0) + 1);
    }
    const list = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nb, c]) => ({ key: `nb:${nb}`, label: nb, count: c }));
    return list;
  }, [filteredInventory]);

  const highlights = useMemo(() => {
    const base: Array<{ key: string; label: string; icon: ReactNode }> = [
      { key: "featured", label: "Destaques", icon: <Sparkles className="h-5 w-5 text-accent" /> },
      { key: "new", label: "Novos", icon: <Info className="h-5 w-5 text-emerald-600" /> },
      { key: "popular", label: "Procurados", icon: <TrendingUp className="h-5 w-5 text-indigo-600" /> },
      { key: "pets", label: "Pet", icon: <PawPrint className="h-5 w-5 text-rose-600" /> },
      { key: "beds2", label: "2+ quartos", icon: <BedDouble className="h-5 w-5 text-sky-600" /> },
      { key: "upto600k", label: "Até 600k", icon: <BadgeDollarSign className="h-5 w-5 text-warning" /> },
    ];

    const neighborhoods = neighborhoodHighlights.map((h) => ({
      key: h.key,
      label: h.label,
      icon: <MapPin className="h-5 w-5 text-accent" />,
    }));

    return [...base, ...neighborhoods];
  }, [neighborhoodHighlights]);

  const highlightList = useMemo(() => {
    if (highlight === "new") return newList;
    if (highlight === "popular") return popularList;
    if (highlight === "pets") return popularList.filter(isPetsOk);
    if (highlight === "beds2") return popularList.filter((p) => p.bedrooms != null && p.bedrooms >= 2);
    if (highlight === "upto600k")
      return popularList.filter((p) => (p.price != null ? p.price / 100 <= 600000 : false));
    if (highlight.startsWith("nb:")) {
      const nb = highlight.slice(3);
      return newList.filter((p) => String(p.neighborhood || "").trim() === nb);
    }
    return featuredList;
  }, [featuredList, highlight, newList, popularList]);

  const searchedList = useMemo(() => {
    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return highlightList;

    return highlightList.filter((p) => {
      const title = String(p.title || "").toLowerCase();
      const neighborhood = String(p.neighborhood || "").toLowerCase();
      const city = String(p.city || "").toLowerCase();
      const state = String(p.state || "").toLowerCase();
      return title.includes(q) || neighborhood.includes(q) || city.includes(q) || state.includes(q);
    });
  }, [highlightList, searchTerm]);

  const visibleList = useMemo(() => {
    return searchedList.slice(0, visibleCount);
  }, [searchedList, visibleCount]);

  const canLoadMore = visibleCount < searchedList.length;

  const handleWhatsApp = (message: string, action: string, payload?: Record<string, any>) => {
    if (!whatsappDigits) return;
    try {
      track({ name: "whatsapp_click", payload: { action, ...payload } } as any);
    } catch {}
    window.open(buildWhatsAppUrl(whatsappDigits, message), "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      const text = String(pageUrl || "");
      const nav: any = typeof navigator !== "undefined" ? navigator : null;

      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand("copy");
        ta.remove();
        if (!ok) throw new Error("copy_failed");
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {}
  };

  const shareTemplates = useMemo(() => {
    const name = String(realtor.name || "Corretor").trim();
    const loc = locationLabel ? `\n📍 ${locationLabel}` : "";
    const headline = realtor.publicHeadline ? `\n${String(realtor.publicHeadline).trim()}` : "";
    const base = `Confira meu perfil no OggaHub: ${pageUrl}`;

    return [
      {
        key: "whatsapp",
        label: "Texto WhatsApp",
        text: `Oi! Sou ${name}.${headline}${loc}\n\n${base}`,
      },
      {
        key: "instagram",
        label: "Legenda Instagram",
        text: `${name}${headline}${loc}\n\nQuer comprar ou alugar? Me chama no direct/WhatsApp e eu te envio opções.\n\n${base}`,
      },
      {
        key: "facebook",
        label: "Post Facebook",
        text: `🚀 Quer ajuda para comprar/alugar? Fala comigo!\n\n${name}${loc}\n${base}`,
      },
    ];
  }, [locationLabel, pageUrl, realtor.name, realtor.publicHeadline]);

  const handleInstagramShare = async () => {
    const caption = shareTemplates.find((t) => t.key === "instagram")?.text || pageUrl;
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedInstagram(true);
      setTimeout(() => setCopiedInstagram(false), 1500);
    } catch {}

    try {
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    } catch {}
  };

  const openReviews = (source: string) => {
    setReviewsOpen(true);
    try {
      track({ name: "public_profile_reviews_open", payload: { source } } as any);
    } catch {}
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!reviewsOpen) {
      reviewsHistoryPushedRef.current = false;
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    if (!reviewsHistoryPushedRef.current) {
      try {
        const nextState = { ...(window.history.state || {}), __reviewsOverlay: true };
        window.history.pushState(nextState, "", window.location.href);
        reviewsHistoryPushedRef.current = true;
      } catch {
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setReviewsOpen(false);
      }
    };

    const onPopState = () => {
      if (!reviewsHistoryPushedRef.current) return;
      reviewsHistoryPushedRef.current = false;
      closingFromPopstateRef.current = true;
      setReviewsOpen(false);
      closingFromPopstateRef.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
    };
  }, [reviewsOpen]);

  const closeReviewsOverlay = () => {
    if (typeof window !== "undefined") {
      document.body.style.overflow = "";
      if (reviewsHistoryPushedRef.current && !closingFromPopstateRef.current) {
        try {
          window.history.back();
          return;
        } catch {
        }
      }
    }
    reviewsHistoryPushedRef.current = false;
    setReviewsOpen(false);
  };

  const openOverlay = useCallback((propertyId: string, source: string) => {
    setOverlayPropertyId(propertyId);
    setOverlayOpen(true);
    try {
      track({ name: "property_quickview_open", payload: { propertyId, source } } as any);
    } catch {}
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    setOverlayPropertyId(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenOverlay = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce?.detail?.id) {
        openOverlay(String(ce.detail.id), "profile_map");
      }
    };
    window.addEventListener("open-overlay", handleOpenOverlay as EventListener);
    return () => window.removeEventListener("open-overlay", handleOpenOverlay as EventListener);
  }, [openOverlay]);

  const ShareSection = ({ id, wrapperClassName }: { id: string; wrapperClassName: string }) => {
    const tileBase =
      "group flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
    const srOnly = "sr-only";

    return (
      <section id={id} className={wrapperClassName}>
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Distribuição</div>
          <h3 className="mt-2 font-serif text-2xl text-slate-950">Compartilhar perfil</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Use os canais abaixo para divulgar o perfil público sem sair do padrão institucional.</p>

          <div className="mt-5 grid grid-cols-3 gap-3 justify-items-start">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareTemplates.find((t) => t.key === "whatsapp")?.text || pageUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${tileBase} relative`}
              aria-label="Compartilhar no WhatsApp"
              title="WhatsApp"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]">
                <BrandWhatsAppIcon className="h-5 w-5 text-white" />
              </span>
              <span className={srOnly}>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleInstagramShare}
              className={`${tileBase} relative`}
              aria-label="Compartilhar no Instagram"
              title={copiedInstagram ? "Legenda copiada" : "Instagram"}
            >
              {copiedInstagram ? (
                <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/30 backdrop-blur">
                  <Check className="h-3.5 w-3.5 text-white" />
                </span>
              ) : null}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#515bd4]">
                <BrandInstagramIcon className="h-5 w-5 text-white" />
              </span>
              <span className={srOnly}>Instagram</span>
            </button>

            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(shareTemplates.find((t) => t.key === "facebook")?.text || pageUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${tileBase} relative`}
              aria-label="Compartilhar no Facebook"
              title="Facebook"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2]">
                <BrandFacebookIcon className="h-5 w-5 text-white" />
              </span>
              <span className={srOnly}>Facebook</span>
            </a>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Link do perfil</div>
                <div className="mt-2 break-all text-xs font-mono text-slate-700">{pageUrl}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 transition duration-150 ${
                  copiedLink
                    ? "scale-[1.06] border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
                aria-label="Copiar link do perfil"
                title={copiedLink ? "Link copiado" : "Copiar link"}
              >
                {copiedLink ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4 text-slate-700" />}
                <span className={srOnly}>Copiar link</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <div className="sticky top-0 z-[300] border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <ModernNavbar forceLight={true} />
      </div>

      <main className="pb-32 md:pb-12">
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950">
          <div className="absolute inset-0">
            {heroImage ? (
              <Image
                src={heroImage}
                alt={realtor.name}
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-30"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.28),_transparent_35%),linear-gradient(135deg,_#0f172a,_#111827_48%,_#042f2e)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-teal-950/70" />
          </div>

          <div className="relative mx-auto max-w-[1400px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
                    {realtor.role === "AGENCY" ? <Building2 className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                    {roleLabel} no OggaHub
                  </span>
                  {realtor.creci && realtor.creciState ? (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
                      CRECI {realtor.creci}/{realtor.creciState}
                    </span>
                  ) : null}
                  {teamLabel ? (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
                      {teamLabel}
                    </span>
                  ) : null}
                  {realtor.lastActivity ? <SeloAtividade lastActivity={realtor.lastActivity} /> : null}
                </div>

                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-5">
                  <div className="shrink-0 rounded-[28px] border border-white/15 bg-white/10 p-1.5 shadow-lg backdrop-blur-sm">
                    {realtor.image ? (
                      <Image
                        src={realtor.image}
                        alt={realtor.name}
                        width={112}
                        height={112}
                        className="h-20 w-20 rounded-[22px] object-cover sm:h-24 sm:w-24"
                        priority
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-white/10 text-3xl font-semibold text-white sm:h-24 sm:w-24">
                        {(realtor.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h1 className="font-serif text-3xl leading-tight text-white sm:text-5xl lg:text-6xl">{realtor.name}</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-white/78 sm:text-base sm:leading-7">{realtor.publicHeadline || profileNarrative}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {locationLabel ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm">
                          <MapPin className="h-3.5 w-3.5" />
                          {locationLabel}
                        </span>
                      ) : null}
                      {serviceAreaChips.slice(0, 4).map((area) => (
                        <span key={area} className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm">
                          {area}
                        </span>
                      ))}
                    </div>

                    <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                      {whatsappDigits ? (
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(baseIntroMessage, "hero_primary")}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 sm:w-auto"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Falar no WhatsApp
                        </button>
                      ) : null}

                      {telHref ? (
                        <a
                          href={`tel:${telHref}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto"
                          onClick={() => {
                            try {
                              track({ name: "public_profile_call", payload: { source: "hero" } } as any);
                            } catch {}
                          }}
                        >
                          <Phone className="h-4 w-4" />
                          Ligar agora
                        </a>
                      ) : null}

                      <a
                        href="#grid"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto"
                      >
                        <Grid3X3 className="h-4 w-4" />
                        Explorar imóveis
                      </a>

                      <button
                        type="button"
                        onClick={() => openReviews("hero_reviews_cta")}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10 sm:w-auto"
                      >
                        Ver avaliações
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/15 bg-white/10 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.3)] backdrop-blur-md sm:p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">Confiança pública</div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="font-serif text-4xl leading-none text-white sm:text-5xl">{ratingValueLabel}</div>
                    <div className="mt-2">
                      <RatingStars readonly rating={Math.round(realtor.avgRating)} size="sm" />
                    </div>
                  </div>
                  <div className="text-right text-xs text-white/80 sm:text-sm">
                    <div>{realtor.totalRatings} avaliação{realtor.totalRatings === 1 ? "" : "s"}</div>
                    {realtor.avgResponseTime != null ? <div className="mt-1">{realtor.avgResponseTime} min de resposta média</div> : null}
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/10 p-4 text-sm leading-7 text-white/75">
                  Perfil público pensado para apresentar atendimento, confiança e portfólio em um único lugar.
                </div>

                {teamPreview.length > 0 ? (
                  <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Equipe publicada</div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex -space-x-3">
                        {teamPreview.map((member) => (
                          <div key={member.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-slate-900 bg-white/20">
                            {member.image ? (
                              <Image src={member.image} alt={member.name} width={40} height={40} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                                {(member.name || "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-white/80">
                        <div className="font-medium text-white">{agencyProfile?.teamMembers.length} profissionais em destaque</div>
                        <div className="text-xs text-white/60">Atendimento conectado ao perfil institucional</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
          <div className="relative -mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:-mt-10">
            <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
              {topFacts.map((item) => (
                <div key={item.label} className="bg-white px-6 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{item.value}</div>
                  <div className="mt-1 text-sm text-slate-600">{item.helper}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-200 py-5">
            <nav className="flex items-center gap-x-6 gap-y-3 overflow-x-auto whitespace-nowrap pb-1 text-sm text-slate-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <a href="#about" className="transition hover:text-slate-950">Sobre</a>
              {realtor.role === "AGENCY" && agencyProfile?.teamMembers.length ? (
                <a href="#team" className="transition hover:text-slate-950">Equipe</a>
              ) : null}
              <a href="#grid" className="transition hover:text-slate-950">Imóveis</a>
              <button type="button" onClick={() => openReviews("section_nav")} className="transition hover:text-slate-950">
                Avaliações
              </button>
              {isOwner ? (
                <a href="#share" className="transition hover:text-slate-950">Compartilhar</a>
              ) : null}
            </nav>
          </div>

          <div className="grid gap-10 pt-10 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <section id="about" className="scroll-mt-28 border-b border-slate-200 pb-10">
                <div className={`grid gap-8 ${hasKeyInfo ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
                  <div className="max-w-4xl">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Apresentação</div>
                    <h2 className="mt-3 font-serif text-2xl text-slate-950 sm:text-4xl">Conheça o perfil, o atendimento e a curadoria deste profissional.</h2>
                    <div className="mt-5 whitespace-pre-line text-[15px] leading-8 text-slate-700">
                      {profileNarrative}
                    </div>
                  </div>

                  {hasKeyInfo ? (
                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Informações-chave</div>
                      <div className="mt-4 space-y-5 text-sm text-slate-700">
                        {keyInfoEntries.map((item) => (
                          <div key={item.label}>
                            <div className="font-medium text-slate-950">{item.label}</div>
                            <div className="mt-2">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {testimonialsPreview.length > 0 ? (
                <section className="border-b border-slate-200 py-10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Prova social</div>
                      <h2 className="mt-2 font-serif text-2xl text-slate-950 sm:text-3xl">Avaliações em destaque</h2>
                    </div>
                    <button type="button" onClick={() => openReviews("featured_reviews")} className="text-left text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
                      Ver todas
                    </button>
                  </div>

                  <div className={`mt-6 grid gap-4 ${testimonialsPreview.length === 1 ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
                    {testimonialsPreview.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openReviews("hero_testimonial")}
                        className="rounded-[28px] border border-slate-200 bg-white p-6 text-left transition hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-950">{item.authorName || "Cliente"}</div>
                            <div className="mt-1 text-xs text-slate-500">{toDateLabel(item.createdAt)}</div>
                          </div>
                          <RatingStars readonly rating={item.rating} size="sm" />
                        </div>
                        <div className="mt-4 text-[15px] leading-7 text-slate-700">“{item.comment}”</div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {realtor.role === "AGENCY" && agencyProfile ? (
                <AgencyPublicProfileSections
                  agencySlug={realtor.publicSlug}
                  agencyName={realtor.name}
                  website={agencyProfile.website}
                  specialties={agencyProfile.specialties}
                  yearsInBusiness={agencyProfile.yearsInBusiness}
                  serviceAreas={agencyProfile.serviceAreas}
                  completion={agencyProfile.completion}
                  teamMembers={agencyProfile.teamMembers}
                  ctaCards={agencyProfile.ctaCards}
                  operationMetrics={agencyProfile.operationMetrics}
                />
              ) : null}

              <section id="grid" className="scroll-mt-28 pt-10">
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Portfólio público</div>
                    <h2 className="mt-2 font-serif text-3xl text-slate-950 sm:text-4xl">Explore a vitrine deste perfil</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                      Quando a carteira cresce, a busca, os filtros e o mapa ajudam o visitante a encontrar o imóvel certo sem perder o contexto do perfil.
                    </p>
                  </div>
                </div>

                {properties.length > 0 ? (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {featuredList.slice(0, Math.min(3, featuredList.length)).map((property, index) => (
                      <PropertyTile
                        key={`featured-${property.id}`}
                        property={property}
                        priority={index < 3}
                        badge={isFeatured(property) ? "Destaque" : isNew(property) ? "Novo" : null}
                        onOpenOverlay={(id) => openOverlay(id, "profile_featured_shelf")}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Buscar na vitrine</div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {searchedList.length} resultado{searchedList.length === 1 ? "" : "s"} dentro da seleção ativa.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 lg:items-end">
                      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setDesktopViewMode("list");
                          setMapBounds(null);
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          desktopViewMode === "list"
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <Grid3X3 className="h-4 w-4" />
                        Lista
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            setMobileMapOpen(true);
                          } else {
                            setDesktopViewMode("map");
                          }
                          setMapBounds(null);
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          desktopViewMode === "map"
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        Mapa
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltersOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                      >
                        <Search className="h-4 w-4" />
                        Refinar
                      </button>
                      </div>

                      <div className="w-full lg:w-[360px]">
                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-slate-300 focus-within:bg-white">
                          <Search className="h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const next = searchInput.trim();
                              setSearchTerm(next);
                              setVisibleCount(DEFAULT_PAGE_SIZE);
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
                              setVisibleCount(DEFAULT_PAGE_SIZE);
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
                            const next = searchInput.trim();
                            setSearchTerm(next);
                            setVisibleCount(DEFAULT_PAGE_SIZE);
                          }}
                          className="rounded-full p-1 transition hover:bg-slate-100"
                          aria-label="Buscar"
                        >
                          <Search className="h-4 w-4 text-slate-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                  {highlights.map((item) => {
                    const active = item.key === highlight;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setHighlight(item.key);
                          setVisibleCount(DEFAULT_PAGE_SIZE);
                          try {
                            track({ name: "public_profile_highlight", value: item.key } as any);
                          } catch {}
                        }}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                        }`}
                      >
                        <span className={active ? "text-white" : "text-slate-500"}>{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {properties.length === 0 ? (
                  <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-14 text-center">
                    <div className="text-base font-semibold text-slate-950">Ainda não há imóveis publicados neste perfil.</div>
                    <div className="mt-2 text-sm text-slate-600">Volte em breve para ver novas entradas na vitrine.</div>
                  </div>
                ) : searchedList.length === 0 ? (
                  <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-14 text-center">
                    <div className="text-base font-semibold text-slate-950">Nenhum imóvel corresponde à seleção atual.</div>
                    <div className="mt-2 text-sm text-slate-600">Ajuste os filtros, a busca ou o recorte em destaque.</div>
                  </div>
                ) : (
                  <div className="mt-8">
                    {desktopViewMode === "map" ? (
                      <div>
                        <div className="h-[70vh] overflow-hidden rounded-[32px] border border-slate-200 bg-white">
                          <MapWithPriceBubbles
                            items={
                              searchedList
                                .filter((p) => p.latitude != null && p.longitude != null)
                                .filter((p) => {
                                  if (!mapBounds) return true;
                                  const lat = Number(p.latitude);
                                  const lng = Number(p.longitude);
                                  return lat >= mapBounds.minLat && lat <= mapBounds.maxLat && lng >= mapBounds.minLng && lng <= mapBounds.maxLng;
                                })
                                .slice(0, 1500)
                                .map((p) => ({
                                  id: p.id,
                                  price: Number(p.price || 0),
                                  latitude: Number(p.latitude),
                                  longitude: Number(p.longitude),
                                  title: p.title,
                                }))
                            }
                            isLoading={false}
                            autoLoad={true}
                            onBoundsChange={(bounds) => setMapBounds(bounds)}
                          />
                        </div>
                        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                          <div>{mapBounds ? "Exibindo somente a área visível do mapa." : "Mova o mapa para restringir a vitrine geográfica."}</div>
                          <button
                            type="button"
                            onClick={() => {
                              setDesktopViewMode("list");
                              setMapBounds(null);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                          >
                            <Grid3X3 className="h-4 w-4" />
                            Ver lista
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
                        {visibleList.map((property, index) => (
                          <PropertyTile
                            key={property.id}
                            property={property}
                            priority={index < 6}
                            badge={isFeatured(property) ? "Destaque" : isNew(property) ? "Novo" : null}
                            onOpenOverlay={(id) => openOverlay(id, "profile_grid")}
                          />
                        ))}
                      </div>
                    )}

                    {canLoadMore ? (
                      <div className="pt-8">
                        <button
                          type="button"
                          onClick={() => {
                            setVisibleCount((value) => Math.min(value + DEFAULT_PAGE_SIZE, searchedList.length));
                            try {
                              track({ name: "public_profile_load_more", value: String(highlight) } as any);
                            } catch {}
                          }}
                          className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                        >
                          Carregar mais imóveis
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
                </div>
              </section>
            </div>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Contato e confiança</div>
                <h3 className="mt-2 font-serif text-2xl text-slate-950">Fale com este perfil</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">Use os canais disponíveis para iniciar a conversa e explorar a carteira com contexto.</p>

                <div className="mt-5 space-y-3">
                  {whatsappDigits ? (
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(baseIntroMessage, "sidebar_primary")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Falar no WhatsApp
                    </button>
                  ) : null}

                  {telHref ? (
                    <a
                      href={`tel:${telHref}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                      onClick={() => {
                        try {
                          track({ name: "public_profile_call", payload: { source: "sidebar" } } as any);
                        } catch {}
                      }}
                    >
                      <Phone className="h-4 w-4" />
                      Ligar agora
                    </a>
                  ) : null}

                  {!whatsappDigits && !telHref ? (
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                      Os canais diretos ainda não estão publicados. Enquanto isso, você pode explorar os imóveis e avaliar a reputação pública deste perfil.
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 space-y-4">
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{stat.label}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => openReviews("sidebar_card")}
                  className="mt-6 flex w-full items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Avaliações públicas</div>
                    <div className="mt-1 text-xs text-slate-600">Clique para abrir a experiência completa de reviews.</div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-3xl text-slate-950">{ratingValueLabel}</div>
                    <div className="text-xs text-slate-600">{realtor.totalRatings} no total</div>
                  </div>
                </button>

                {socialLinks.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {socialLinks.map((item) => (
                      <a
                        key={item.key}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        {item.icon}
                        {item.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </section>

              {isOwner ? <ShareSection id="share" wrapperClassName="scroll-mt-28" /> : null}
            </aside>
          </div>
        </section>
      </main>

      {reviewsOpen ? (
        <div className="fixed inset-0 z-[60000]">
          <div className="absolute inset-0 bg-black/50" onClick={closeReviewsOverlay} />
          <div className="relative h-full w-full flex items-center justify-center p-0 sm:p-6">
            <div className="relative h-full w-full overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl sm:h-[min(920px,calc(100vh-3rem))] sm:max-w-6xl sm:rounded-3xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
                <div className="text-base font-semibold text-slate-900">Avaliações</div>
                <button
                  type="button"
                  onClick={closeReviewsOverlay}
                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Fechar
                </button>
              </div>

              <div className="h-[calc(100%-53px)] overflow-y-auto bg-slate-50 p-4 sm:p-6">
                <RealtorReviewsSection
                  realtorId={realtor.id}
                  initialAvgRating={realtor.avgRating}
                  initialTotalRatings={realtor.totalRatings}
                  embedded
                  variant="google"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PropertyDetailsModalJames propertyId={overlayPropertyId} open={overlayOpen} onClose={closeOverlay} />

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
          totalResults={filteredInventory.length}
          onFiltersChange={(newFilters) => setFilters(newFilters)}
          onClearFilters={() => {
            setFilters(EMPTY_FILTERS);
            setVisibleCount(DEFAULT_PAGE_SIZE);
          }}
          onApply={(applied) => {
            setFilters(applied);
            setVisibleCount(DEFAULT_PAGE_SIZE);
            setFiltersOpen(false);
          }}
        />
      </Drawer>

      {mobileMapOpen ? (
        <div className="fixed inset-0 z-[59990] bg-white md:hidden">
          <div className="relative flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mapa da vitrine</div>
              <div className="mt-1 text-sm font-medium text-slate-700">{searchedList.length} imóvel{searchedList.length === 1 ? "" : "is"}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMapOpen(false);
                setMapBounds(null);
              }}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
          <button
            aria-label="Voltar para lista"
            type="button"
            onClick={() => {
              setMobileMapOpen(false);
              setMapBounds(null);
            }}
            className="fixed bottom-24 left-1/2 z-[59999] flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-lg transition-all hover:shadow-xl"
          >
            <Grid3X3 className="h-5 w-5 text-slate-700" />
            <span className="font-semibold text-slate-800">Ver lista</span>
          </button>
          <div className="absolute inset-x-0 bottom-0 top-16">
            <MapWithPriceBubbles
              items={
                searchedList
                  .filter((p) => p.latitude != null && p.longitude != null)
                  .filter((p) => {
                    if (!mapBounds) return true;
                    const lat = Number(p.latitude);
                    const lng = Number(p.longitude);
                    return lat >= mapBounds.minLat && lat <= mapBounds.maxLat && lng >= mapBounds.minLng && lng <= mapBounds.maxLng;
                  })
                  .slice(0, 1500)
                  .map((p) => ({
                    id: p.id,
                    price: Number(p.price || 0),
                    latitude: Number(p.latitude),
                    longitude: Number(p.longitude),
                    title: p.title,
                  }))
              }
              isLoading={false}
              autoLoad={true}
              onBoundsChange={(b) => setMapBounds(b)}
            />
          </div>
        </div>
      ) : null}

      {whatsappDigits && !mobileMapOpen && !reviewsOpen && !overlayOpen ? (
        <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 bg-white/90 p-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => handleWhatsApp(baseIntroMessage, "sticky_mobile")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-400 hover:shadow"
          >
            <MessageCircle className="h-5 w-5" />
            Falar no WhatsApp
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PropertyTile({
  property,
  priority,
  badge,
  onOpenOverlay,
}: {
  property: PublicProperty;
  priority: boolean;
  badge: string | null;
  onOpenOverlay: (id: string) => void;
}) {
  const href = buildPropertyPath(property.id, property.title);
  const imageUrl = property.images?.[0]?.url || null;

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
      onClick={(e) => {
        try {
          track({ name: "listing_click", payload: { propertyId: property.id } } as any);
        } catch {}

        e.preventDefault();
        onOpenOverlay(property.id);
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
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
          <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
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
          <div className="font-serif text-2xl leading-none text-slate-950">{formatBRL(property.price)}</div>
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
          {property.parkingSpots != null ? <span>{property.parkingSpots} vaga{property.parkingSpots === 1 ? "" : "s"}</span> : null}
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
