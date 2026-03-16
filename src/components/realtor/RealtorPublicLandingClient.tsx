"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { ModernNavbar } from "@/components/modern";
import { buildPropertyPath } from "@/lib/slug";
import { track } from "@/lib/analytics";
import RealtorReviewsSection from "@/components/realtor/RealtorReviewsSection";
import SeloAtividade from "@/components/realtor/SeloAtividade";
import RatingStars from "@/components/queue/RatingStars";
import PropertyDetailsModalJames from "@/components/PropertyDetailsModalJames";
import Drawer from "@/components/ui/Drawer";
import SearchFiltersBarZillow, { type FilterValues } from "@/components/SearchFiltersBarZillow";
import {
  BadgeDollarSign,
  BedDouble,
  Clock,
  Copy,
  Grid3X3,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  PawPrint,
  QrCode,
  Search,
  Sparkles,
  Star,
  TrendingUp,
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
    image: string | null;
    publicHeadline: string | null;
    publicBio: string | null;
    publicCity: string | null;
    publicState: string | null;
    publicServiceAreas: string[];
    publicWhatsApp: string | null;
    publicPhoneOptIn: boolean;
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
};

const DEFAULT_PAGE_SIZE = 36;

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

export default function RealtorPublicLandingClient({
  siteUrl: _siteUrl,
  pageUrl,
  realtor,
  properties,
  initialRatingsPreview,
}: RealtorPublicLandingClientProps) {
  const { data: session } = useSession();

  const [highlight, setHighlight] = useState<string>("featured");
  const [visibleCount, setVisibleCount] = useState(DEFAULT_PAGE_SIZE);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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
    if (realtor.publicPhoneOptIn) {
      const phone = normalizePhone(realtor.phone);
      if (phone) return phone;
    }
    return null;
  }, [realtor.phone, realtor.publicPhoneOptIn, realtor.publicWhatsApp]);

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
    if (!realtor.publicPhoneOptIn) return null;
    return formatPhoneForTel(realtor.phone);
  }, [realtor.phone, realtor.publicPhoneOptIn]);

  const ratingValueLabel = useMemo(() => {
    return realtor.avgRating > 0 ? realtor.avgRating.toFixed(1) : "—";
  }, [realtor.avgRating]);

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
      await navigator.clipboard.writeText(pageUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {}
  };

  const handleCopyText = async () => {
    const text = `Olá! Se você está buscando imóvel para comprar/alugar, me chama aqui: ${pageUrl}. Eu te mando opções do nosso estoque no WhatsApp.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1500);
    } catch {}
  };

  const handleDownloadQr = () => {
    const url = `https://chart.googleapis.com/chart?chs=512x512&cht=qr&chl=${encodeURIComponent(pageUrl)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qrcode-${realtor.name || "perfil"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
    return (
      <section id={id} className={wrapperClassName}>
        <div className="text-base font-semibold text-gray-900">Compartilhar</div>
        <div className="mt-3 rounded-3xl border border-neutral-200 bg-white/80 backdrop-blur p-5 shadow-sm">
          <div className="text-sm text-gray-600">Use esse link nas redes sociais e no WhatsApp.</div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 shadow-sm hover:shadow transition-shadow"
            >
              <span className="inline-flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copiar link
              </span>
              {copiedLink ? <span className="text-gray-900">Copiado</span> : null}
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 shadow-sm hover:shadow transition-shadow"
            >
              <span className="inline-flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copiar texto pronto
              </span>
              {copiedText ? <span className="text-gray-900">Copiado</span> : null}
            </button>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="inline-flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 shadow-sm hover:shadow transition-shadow"
            >
              <span className="inline-flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Baixar QR Code
              </span>
            </button>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="sticky top-0 z-[300]">
        <ModernNavbar forceLight={true} />
      </div>

      <main className="mx-auto max-w-screen-2xl pb-24 md:pb-12">
        <div className="lg:flex lg:items-start lg:gap-6">
          <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-20 lg:w-72 lg:shrink-0 lg:mt-4">
            <div className="rounded-3xl border border-neutral-200 bg-white/90 backdrop-blur p-2 shadow-sm">
              <a
                href="#grid"
                className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-neutral-800 hover:bg-neutral-50 transition-colors"
              >
                <span className="h-10 w-10 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-700 group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-colors">
                  <Grid3X3 className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">Imóveis</span>
              </a>
              <button
                type="button"
                onClick={() => openReviews("sidebar")}
                className="mt-1 w-full text-left group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-neutral-800 hover:bg-neutral-50 transition-colors"
              >
                <span className="h-10 w-10 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-700 group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-colors">
                  <Star className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">Avaliações</span>
              </button>
              {isOwner ? (
                <a
                  href="#compartilhar"
                  className="mt-1 group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-neutral-800 hover:bg-neutral-50 transition-colors"
                >
                  <span className="h-10 w-10 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-700 group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-colors">
                    <Copy className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold">Compartilhar</span>
                </a>
              ) : null}
            </div>

            <div className="mt-4 space-y-6">
              <div className="px-2">
                <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden max-h-[calc(100vh-260px)] flex flex-col">
                  <SearchFiltersBarZillow
                    variant="panel"
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
                    }}
                  />
                </div>
              </div>

              {isOwner ? <ShareSection id="compartilhar" wrapperClassName="px-2" /> : null}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <section className="px-4 sm:px-6 lg:px-10 pt-6">
              <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-white to-teal-50" />
                <div className="relative p-5 sm:p-7">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    <div className="flex items-start gap-4 sm:gap-5">
                      <div className="flex-shrink-0">
                        <div className="rounded-3xl p-[2px] bg-accent shadow-sm">
                          <div className="rounded-3xl bg-white p-[2px]">
                            {realtor.image ? (
                              <Image
                                src={realtor.image}
                                alt={realtor.name}
                                width={128}
                                height={128}
                                className="h-[104px] w-[104px] sm:h-[120px] sm:w-[120px] rounded-3xl object-cover"
                                priority
                              />
                            ) : (
                              <div className="h-[104px] w-[104px] sm:h-[120px] sm:w-[120px] rounded-3xl bg-gray-100 flex items-center justify-center text-4xl font-semibold text-gray-700">
                                {(realtor.name || "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight truncate">{realtor.name}</h1>
                          {realtor.creci && realtor.creciState ? (
                            <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 border border-neutral-200">
                              CRECI {realtor.creci}/{realtor.creciState}
                            </span>
                          ) : null}
                          {teamLabel ? (
                            <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-neutral-700 border border-neutral-200">
                              Time {teamLabel}
                            </span>
                          ) : null}
                          {realtor.lastActivity ? <SeloAtividade lastActivity={realtor.lastActivity} /> : null}
                        </div>

                        <div className="mt-3 text-sm sm:text-base text-neutral-900 whitespace-pre-line">
                          {realtor.publicHeadline ? <div className="font-semibold">{realtor.publicHeadline}</div> : null}
                          {realtor.publicBio ? <div className="mt-1 text-neutral-700">{realtor.publicBio}</div> : null}
                          {locationLabel ? <div className="mt-1 text-neutral-600">{locationLabel}</div> : null}
                          {serviceAreaChips.length > 0 ? (
                            <div className="mt-1 text-neutral-600">Atendo: {serviceAreaChips.slice(0, 5).join(" • ")}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-[380px]">
                      <div className="rounded-3xl border border-neutral-200 bg-white/80 backdrop-blur p-4 sm:p-5 shadow-sm">
                        <div className="flex items-end justify-between gap-4">
                          <button type="button" onClick={() => openReviews("hero_rating")} className="text-left">
                            <div className="text-4xl sm:text-5xl font-bold text-neutral-900 leading-none">{ratingValueLabel}</div>
                            <div className="mt-2">
                              <RatingStars readonly rating={Math.round(realtor.avgRating)} size="sm" />
                            </div>
                            <div className="mt-1 text-xs font-semibold text-neutral-600">
                              {realtor.totalRatings} avaliação{realtor.totalRatings === 1 ? "" : "s"}
                            </div>
                          </button>

                          <div className="text-right">
                            {realtor.avgResponseTime != null ? (
                              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700">
                                <Clock className="h-4 w-4" />
                                {realtor.avgResponseTime} min
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className={`mt-4 grid gap-2 ${
                            heroStats.length === 1 ? "grid-cols-1" : "grid-cols-2"
                          }`}
                        >
                          {heroStats.map((s) => (
                            <div key={s.label} className="rounded-2xl border border-neutral-200 bg-white px-3 py-2">
                              <div className="text-[11px] font-semibold text-neutral-500">{s.label}</div>
                              <div className="mt-0.5 text-lg font-semibold text-neutral-900">{s.value}</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {whatsappDigits ? (
                            <button
                              type="button"
                              onClick={() => handleWhatsApp(baseIntroMessage, "hero_primary")}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors shadow-sm hover:shadow"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Falar no WhatsApp
                            </button>
                          ) : (
                            <div className="rounded-2xl border border-neutral-200 bg-white/70 px-4 py-3 text-sm font-semibold text-neutral-700">
                              WhatsApp não configurado
                            </div>
                          )}

                          {telHref ? (
                            <a
                              href={`tel:${telHref}`}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors shadow-sm hover:shadow"
                              onClick={() => {
                                try {
                                  track({ name: "public_profile_call", payload: { source: "hero" } } as any);
                                } catch {}
                              }}
                            >
                              <Phone className="h-4 w-4" />
                              Ligar
                            </a>
                          ) : (
                            <div className="rounded-2xl border border-neutral-200 bg-white/70 px-4 py-3 text-sm font-semibold text-neutral-700">
                              Telefone não disponível
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {testimonialsPreview.length > 0 ? (
                    <div className={`mt-5 grid gap-3 ${testimonialsPreview.length === 1 ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
                      {testimonialsPreview.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => openReviews("hero_testimonial")}
                          className="text-left rounded-3xl border border-neutral-200 bg-white/80 hover:bg-white p-4 shadow-sm hover:shadow transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-neutral-900 truncate">{t.authorName || "Cliente"}</div>
                              <div className="text-xs text-neutral-500">{toDateLabel(t.createdAt)}</div>
                            </div>
                            <div className="flex-shrink-0">
                              <RatingStars readonly rating={t.rating} size="sm" />
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-neutral-700 max-h-[4.5rem] overflow-hidden">“{t.comment}”</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="mt-6 px-4 sm:px-6 lg:px-10">
              <div className="flex items-start gap-4 overflow-x-auto pb-2">
                {highlights.map((h) => {
                  const active = h.key === highlight;
                  return (
                    <button
                      key={h.key}
                      type="button"
                      onClick={() => {
                        setHighlight(h.key);
                        setVisibleCount(DEFAULT_PAGE_SIZE);
                        try {
                          track({ name: "public_profile_highlight", value: h.key } as any);
                        } catch {}
                      }}
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                    >
                      <div className={`h-16 w-16 rounded-full p-[2px] ${active ? "bg-accent" : "bg-neutral-200"}`}>
                        <div
                          className={`h-full w-full rounded-full flex items-center justify-center transition-colors ${
                            active ? "bg-white text-neutral-900" : "bg-white text-neutral-700"
                          }`}
                        >
                          {h.icon}
                        </div>
                      </div>
                      <div className={`text-[11px] font-semibold ${active ? "text-neutral-900" : "text-neutral-600"}`}>{h.label}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <nav className="lg:hidden sticky top-16 z-40 bg-white/90 backdrop-blur border-y border-neutral-200">
              <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10 h-12 flex items-center justify-around">
                <a href="#grid" className="p-2 text-gray-900">
                  <Grid3X3 className="h-5 w-5" />
                </a>
                <button type="button" onClick={() => openReviews("mobile_nav")} className="p-2 text-gray-700">
                  <Star className="h-5 w-5" />
                </button>
              </div>
            </nav>

            <section id="grid" className="mt-0 scroll-mt-24">
              <div className="px-4 sm:px-6 lg:px-10 pt-4 pb-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-900">Imóveis</div>
                    <div className="md:hidden flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFiltersOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-800"
                      >
                        <Search className="h-4 w-4" />
                        Filtros
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMapOpen(true);
                          setMapBounds(null);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-800"
                      >
                        <MapPin className="h-4 w-4" />
                        Ver mapa
                      </button>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDesktopViewMode("list");
                        setMapBounds(null);
                      }}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                        desktopViewMode === "list"
                          ? "border-accent bg-accent text-white"
                          : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                      Lista
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDesktopViewMode("map");
                        setMapBounds(null);
                      }}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                        desktopViewMode === "map"
                          ? "border-accent bg-accent text-white"
                          : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                      Mapa
                    </button>

                    <button
                      type="button"
                      onClick={() => setFiltersOpen(true)}
                      className="lg:hidden inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                    >
                      <Search className="h-4 w-4" />
                      Filtros
                    </button>
                  </div>
                  <div className="w-full md:max-w-md">
                    <div className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg bg-white hover:border-neutral-400 transition-colors focus-within:ring-2 focus-within:ring-accent">
                      <Search className="w-4 h-4 text-neutral-400" />
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
                        placeholder="Buscar por bairro, cidade, título..."
                        className="flex-1 outline-none text-sm bg-transparent"
                      />
                      {searchInput.trim() ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchInput("");
                            setSearchTerm("");
                            setVisibleCount(DEFAULT_PAGE_SIZE);
                          }}
                          className="p-1 hover:bg-neutral-100 rounded transition-colors"
                          aria-label="Limpar"
                        >
                          <X className="w-4 h-4 text-neutral-500" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          const next = searchInput.trim();
                          setSearchTerm(next);
                          setVisibleCount(DEFAULT_PAGE_SIZE);
                        }}
                        className="p-1 hover:bg-neutral-100 rounded transition-colors"
                        aria-label="Buscar"
                      >
                        <Search className="w-4 h-4 text-neutral-700" />
                      </button>
                    </div>
                    {searchTerm ? (
                      <div className="mt-1 text-xs text-neutral-600">{searchedList.length} resultado(s)</div>
                    ) : null}
                  </div>
                </div>
              </div>
              {properties.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="text-sm font-semibold text-gray-900">Ainda não há imóveis disponíveis aqui.</div>
                  <div className="text-sm text-gray-600 mt-1">Volte em breve para ver as novidades.</div>
                </div>
              ) : searchedList.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="text-sm font-semibold text-gray-900">Nenhum imóvel encontrado.</div>
                  <div className="text-sm text-gray-600 mt-1">Tente remover a busca ou mudar o highlight.</div>
                </div>
              ) : (
                <>
                  {desktopViewMode === "map" ? (
                    <div className="md:px-4">
                      <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden h-[70vh]">
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
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-neutral-600">
                          {mapBounds ? "Filtrando nesta área" : "Mova o mapa para filtrar"}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDesktopViewMode("list");
                            setMapBounds(null);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                        >
                          <Grid3X3 className="h-4 w-4" />
                          Ver lista
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-[2px] md:gap-5 bg-neutral-200 md:bg-transparent md:px-4">
                      {visibleList.map((p, idx) => (
                        <PropertyTile
                          key={p.id}
                          property={p}
                          priority={idx < 9}
                          badge={isFeatured(p) ? "Destaque" : isNew(p) ? "Novo" : null}
                          onOpenOverlay={(id) => openOverlay(id, "profile_grid")}
                        />
                      ))}
                    </div>
                  )}
                  {canLoadMore ? (
                    <div className="px-4 sm:px-6 lg:px-10 py-6">
                      <button
                        type="button"
                        onClick={() => {
                          setVisibleCount((v) => Math.min(v + DEFAULT_PAGE_SIZE, searchedList.length));
                          try {
                            track({ name: "public_profile_load_more", value: String(highlight) } as any);
                          } catch {}
                        }}
                        className="w-full rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors shadow-sm hover:shadow"
                      >
                        Carregar mais
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            <div className="lg:hidden">
              {isOwner ? (
                <ShareSection id="compartilhar-mobile" wrapperClassName="px-4 sm:px-6 lg:px-10 pt-10 scroll-mt-24" />
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {reviewsOpen ? (
        <div className="fixed inset-0 z-[60000]">
          <div className="absolute inset-0 bg-black/50" onClick={closeReviewsOverlay} />
          <div className="relative h-full w-full flex items-center justify-center p-0 sm:p-6">
            <div className="relative h-full w-full sm:h-[min(920px,calc(100vh-3rem))] sm:max-w-6xl rounded-none sm:rounded-3xl bg-white shadow-2xl border border-neutral-200 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-neutral-200">
                <div className="text-base font-semibold text-neutral-900">Avaliações</div>
                <button
                  type="button"
                  onClick={closeReviewsOverlay}
                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  Fechar
                </button>
              </div>

              <div className="h-[calc(100%-53px)] overflow-y-auto bg-neutral-50 p-4 sm:p-6">
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
        <div className="md:hidden fixed inset-0 z-[59990] bg-white">
          <div className="h-14 px-3 flex items-center justify-center border-b bg-white/95 backdrop-blur relative">
            <div className="text-sm text-gray-600 font-medium">{searchedList.length} imóveis</div>
          </div>
          <button
            aria-label="Voltar para lista"
            type="button"
            onClick={() => {
              setMobileMapOpen(false);
              setMapBounds(null);
            }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[59999] px-5 py-3 rounded-full bg-white border-2 border-gray-200 shadow-lg hover:shadow-xl flex items-center gap-2 transition-all"
          >
            <Grid3X3 className="w-5 h-5 text-teal-600" />
            <span className="font-semibold text-gray-800">Ver Lista</span>
          </button>
          <div className="absolute inset-x-0 top-14 bottom-0">
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

      {whatsappDigits ? (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] p-3 bg-white/90 backdrop-blur border-t border-gray-200">
          <button
            type="button"
            onClick={() => handleWhatsApp(baseIntroMessage, "sticky_mobile")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors shadow-sm hover:shadow"
          >
            <MessageCircle className="h-5 w-5" />
            Enviar mensagem
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
      className="group relative aspect-square bg-white overflow-hidden md:rounded-2xl md:ring-1 md:ring-neutral-200 md:shadow-sm md:hover:shadow md:hover:ring-accent transition"
      onClick={(e) => {
        try {
          track({ name: "listing_click", payload: { propertyId: property.id } } as any);
        } catch {}

        e.preventDefault();
        onOpenOverlay(property.id);
      }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={property.title}
          fill
          sizes="(max-width: 768px) 33vw, 33vw"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 h-full w-full flex items-center justify-center text-gray-300 bg-gray-50">
          <MapPin className="h-7 w-7" />
        </div>
      )}

      {badge ? (
        <div className="absolute left-1 top-1 rounded-full bg-accent text-white text-[10px] font-semibold px-2 py-1 shadow-sm">
          {badge}
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="text-sm font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] truncate">{formatBRL(property.price)}</div>
        {property.neighborhood ? (
          <div className="text-xs text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] truncate">{property.neighborhood}</div>
        ) : null}
      </div>
    </Link>
  );
}
