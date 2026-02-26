"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { X, Share2, Heart, MapPin, ChevronLeft, ChevronRight, Car, Home, Wind, Waves, Building2, Dumbbell, UtensilsCrossed, Baby, PartyPopper, ShieldCheck, Snowflake, Flame, Sun, Video, Zap, Eye, ArrowUp, ArrowDown, Accessibility, DoorOpen, Lightbulb, Droplets, Archive, Gem, Compass, Dog, ChevronDown, School, Pill, ShoppingCart, Landmark, Fuel, Hospital, Building } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import BrandLogo from "@/components/BrandLogo";
import { getLowestFinancing } from "@/lib/financing";
import { normalizePOIs } from "@/lib/overpass";
import { buildPropertyPath } from "@/lib/slug";
import { ptBR } from "@/lib/i18n/property";
import { parseVideoUrl } from "@/lib/video";

const Map = dynamic(() => import("@/components/GoogleMap"), { ssr: false });
const SimilarCarousel = dynamic(() => import("@/components/SimilarCarousel"), { ssr: false });
const PropertyContactCard = dynamic(() => import("@/components/PropertyContactCard"), { ssr: false });

type PropertyDetailsModalProps = {
  propertyId: string | null;
  open: boolean;
  onClose?: () => void;
  variant?: "overlay" | "page";
  mode?: "public" | "internal" | "preview";
  backHref?: string;
  backLabel?: string;
  initialProperty?: PropertyDetails | null;
};

type PropertyDetails = {
  id: string;
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  description: string;
  price: number;
  condoFee?: number | null;
  iptuYearly?: number | null;
  type: string;
  purpose?: 'SALE' | 'RENT';
  videoUrl?: string | null;
  videoProvider?: 'YOUTUBE' | 'VIMEO' | null;
  videoId?: string | null;
  street: string;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  builtAreaM2?: number | null;
  lotAreaM2?: number | null;
  privateAreaM2?: number | null;
  usableAreaM2?: number | null;
  suites?: number | null;
  parkingSpots: number | null;
  floor?: number | null;
  yearBuilt: number | null;
  yearRenovated?: number | null;
  totalFloors?: number | null;
  furnished: boolean;
  petFriendly: boolean;
  images: { url: string; alt?: string | null }[];
  conditionTags?: string[] | null;
  hasBalcony?: boolean | null;
  hasElevator?: boolean | null;
  hasPool?: boolean | null;
  hasGym?: boolean | null;
  hasPlayground?: boolean | null;
  hasPartyRoom?: boolean | null;
  hasGourmet?: boolean | null;
  hasConcierge24h?: boolean | null;
  accRamps?: boolean | null;
  accWideDoors?: boolean | null;
  accAccessibleElevator?: boolean | null;
  accTactile?: boolean | null;
  comfortAC?: boolean | null;
  comfortHeating?: boolean | null;
  comfortSolar?: boolean | null;
  comfortNoiseWindows?: boolean | null;
  comfortLED?: boolean | null;
  comfortWaterReuse?: boolean | null;
  finishFloor?: string | null;
  finishCabinets?: boolean | null;
  finishCounterGranite?: boolean | null;
  finishCounterQuartz?: boolean | null;
  viewSea?: boolean | null;
  viewCity?: boolean | null;
  positionFront?: boolean | null;
  positionBack?: boolean | null;
  sunByRoomNote?: string | null;
  petsSmall?: boolean | null;
  petsLarge?: boolean | null;
  condoRules?: string | null;
  secCCTV?: boolean | null;
  secSallyPort?: boolean | null;
  secNightGuard?: boolean | null;
  secElectricFence?: boolean | null;
  sunOrientation?: string | null;
  hidePrice?: boolean | null;
  hideExactAddress?: boolean | null;
  hideOwnerContact?: boolean | null;
  hideCondoFee?: boolean | null;
  hideIPTU?: boolean | null;
  privateOwnerName?: string | null;
  privateOwnerPhone?: string | null;
  privateOwnerEmail?: string | null;
  privateOwnerAddress?: string | null;
  privateOwnerPrice?: number | null;
  privateBrokerFeePercent?: number | null;
  privateBrokerFeeFixed?: number | null;
  privateExclusive?: boolean | null;
  privateExclusiveUntil?: string | null;
  privateOccupied?: boolean | null;
  privateOccupantInfo?: string | null;
  privateKeyLocation?: string | null;
  privateNotes?: string | null;
  owner?: {
    id: string;
    name: string | null;
    image: string | null;
    role: "USER" | "OWNER" | "REALTOR" | "AGENCY" | "ADMIN";
    publicProfileEnabled?: boolean | null;
    publicSlug?: string | null;
    publicPhoneOptIn?: boolean | null;
  };
};

const FEATURES_ICONS = {
  garden: "🌳",
  fireplace: "🔥",
  pool: "🏊",
  terrace: "🏡",
  jacuzzi: "🛁",
  vineyard: "🍇",
  mountain_view: "⛰️",
  water_view: "💧",
  hilltop: "🏔️",
};

export default function PropertyDetailsModalJames({ propertyId, open, onClose }: PropertyDetailsModalProps) {
  const { variant = "overlay", mode = "public", backHref, backLabel, initialProperty } = arguments[0] as PropertyDetailsModalProps;
  const router = useRouter();
  const isOpen = variant === "page" ? true : open;
  const [activePropertyId, setActivePropertyId] = useState<string | null>(propertyId);
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [thumbsPerPage, setThumbsPerPage] = useState(9);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [photoViewMode, setPhotoViewMode] = useState<"feed" | "fullscreen" | null>(null);
  const [showThumbGrid, setShowThumbGrid] = useState(false);
  const [fullscreenTab, setFullscreenTab] = useState<"photos" | "video">("photos");
  const parsedVideo = useMemo(() => {
    const raw = (property?.videoUrl || "").trim();
    if (!raw) return null;
    return parseVideoUrl(raw);
  }, [property?.videoUrl]);

  const videoThumbUrl = useMemo(() => {
    if (!parsedVideo) return null;
    if (parsedVideo.provider === "YOUTUBE") return `https://i.ytimg.com/vi/${parsedVideo.id}/hqdefault.jpg`;
    return null;
  }, [parsedVideo]);
  const handleClose = useCallback(() => {
    if (variant === "overlay" && typeof window !== "undefined") {
      document.body.style.overflow = "";
    }
    if (variant === "overlay" && typeof window !== "undefined") {
      if (overlayHistoryPushedRef.current && !closingFromPopstateRef.current) {
        try {
          window.history.back();
          return;
        } catch {
          // fallthrough
        }
      }
    }
    overlayHistoryPushedRef.current = false;
    onClose?.();
  }, [onClose, variant]);

  // Mobile/browser back integration for overlay: back should close overlay instead of navigating away
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (variant !== "overlay") return;
    if (!open) {
      overlayHistoryPushedRef.current = false;
      return;
    }

    if (!overlayHistoryPushedRef.current) {
      try {
        const nextState = { ...(window.history.state || {}), __propertyOverlay: true };
        window.history.pushState(nextState, "", window.location.href);
        overlayHistoryPushedRef.current = true;
      } catch {
        // ignore
      }
    }

    const onPopState = () => {
      if (!overlayHistoryPushedRef.current) return;
      overlayHistoryPushedRef.current = false;
      closingFromPopstateRef.current = true;
      handleClose();
      closingFromPopstateRef.current = false;
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [variant, open, handleClose]);
  // Zoom/Pan state for lightbox
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ down: boolean; x: number; y: number }>({ down: false, x: 0, y: 0 });
  const pinchRef = useRef<{ active: boolean; startDist: number; startZoom: number; cx: number; cy: number }>({ active: false, startDist: 0, startZoom: 1, cx: 0, cy: 0 });
  const [showMore, setShowMore] = useState(false);
  const [shouldLoadArea, setShouldLoadArea] = useState(false);
  const [shouldLoadRelated, setShouldLoadRelated] = useState(false);
  const [relatedRequested, setRelatedRequested] = useState(false);
  const areaSectionRef = useRef<HTMLDivElement | null>(null);
  const relatedSectionRef = useRef<HTMLDivElement | null>(null);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [similarProperties, setSimilarProperties] = useState<any[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<{ schools: any[]; markets: any[]; pharmacies: any[]; restaurants: any[]; hospitals: any[]; malls: any[]; parks: any[]; gyms: any[]; fuel: any[]; bakeries: any[]; banks: any[] }>({ schools: [], markets: [], pharmacies: [], restaurants: [], hospitals: [], malls: [], parks: [], gyms: [], fuel: [], bakeries: [], banks: [] });
  const [activePOITab, setActivePOITab] = useState<'schools' | 'markets' | 'pharmacies' | 'restaurants' | 'hospitals' | 'clinics' | 'parks' | 'gyms' | 'fuel' | 'bakeries' | 'banks'>('schools');
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiOpen, setPoiOpen] = useState(false);
  const poiFetchedKeyRef = useRef<string | null>(null);
  const [poiSource, setPoiSource] = useState<'google' | 'osm' | null>(null);
  const trackedViewRef = useRef<Set<string>>(new Set());
  // Lightbox touch resistance state
  const lbStartX = useRef<number | null>(null);
  const lbStartY = useRef<number | null>(null);
  const lbStartTime = useRef<number | null>(null);
  const lbLastX = useRef<number | null>(null);
  const lbLastTime = useRef<number | null>(null);
  const lbMoved = useRef(false);
  const lbLock = useRef<null | "horizontal" | "vertical">(null);
  // Mobile inline gallery swipe state (outside lightbox) - IGUAL AO CARD
  const mobContainerRef = useRef<HTMLDivElement>(null);
  const [mobContainerW, setMobContainerW] = useState(0);
  const [mobIsDragging, setMobIsDragging] = useState(false);
  const [mobDragX, setMobDragX] = useState(0);
  const mobSwipeStartX = useRef<number | null>(null);
  const mobSwipeStartY = useRef<number | null>(null);
  const mobSwipeStartTime = useRef<number | null>(null);
  const mobSwipeLastX = useRef<number | null>(null);
  const mobSwipeLastTime = useRef<number | null>(null);
  const mobSwipeLock = useRef<null | "horizontal" | "vertical">(null);
  
  // Fullscreen gallery swipe state - IGUAL AO CARD
  const fsContainerRef = useRef<HTMLDivElement>(null);
  const [fsContainerW, setFsContainerW] = useState(0);
  const [fsIsDragging, setFsIsDragging] = useState(false);
  const [fsDragX, setFsDragX] = useState(0);
  const fsSwipeStartX = useRef<number | null>(null);
  const fsSwipeStartY = useRef<number | null>(null);
  const fsSwipeStartTime = useRef<number | null>(null);
  const fsSwipeLastX = useRef<number | null>(null);
  const fsSwipeLastTime = useRef<number | null>(null);
  const fsSwipeLock = useRef<null | "horizontal" | "vertical">(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const overlayHistoryPushedRef = useRef(false);
  const closingFromPopstateRef = useRef(false);

  const isPreview = mode === "preview";
  const isPublicLike = mode === "public" || mode === "preview";

  useEffect(() => {
    if (!isOpen) return;
    if (isPreview) return;
    if (shouldLoadRelated) return;

    const root = variant === "overlay" ? (scrollContainerRef.current ?? null) : null;
    const relatedEl = relatedSectionRef.current;

    if (!relatedEl || shouldLoadRelated) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (relatedEl && entry.target === relatedEl && !shouldLoadRelated) {
            setShouldLoadRelated(true);
            try { obs.unobserve(relatedEl); } catch {}
          }
        });
      },
      { root, rootMargin: "200px 0px" }
    );

    if (relatedEl && !shouldLoadRelated) obs.observe(relatedEl);

    return () => {
      try { obs.disconnect(); } catch {}
    };
  }, [isOpen, shouldLoadRelated, property, variant, isPreview]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isPreview) return;
    setLoading(false);
    setError(null);
    setProperty(initialProperty ?? null);
  }, [isOpen, isPreview, initialProperty]);

  const poiCategories = useMemo(() => ([
    { key: 'schools', label: 'Escolas', Icon: School, items: nearbyPlaces.schools },
    { key: 'pharmacies', label: 'Farmácias', Icon: Pill, items: nearbyPlaces.pharmacies },
    { key: 'markets', label: 'Supermercados', Icon: ShoppingCart, items: nearbyPlaces.markets },
    { key: 'restaurants', label: 'Restaurantes', Icon: UtensilsCrossed, items: nearbyPlaces.restaurants },
    { key: 'banks', label: 'Bancos', Icon: Landmark, items: nearbyPlaces.banks },
    { key: 'fuel', label: 'Postos', Icon: Fuel, items: nearbyPlaces.fuel },
    { key: 'bakeries', label: 'Padarias', Icon: ShoppingCart, items: nearbyPlaces.bakeries },
    { key: 'parks', label: 'Parques', Icon: MapPin, items: nearbyPlaces.parks },
    { key: 'gyms', label: 'Academias', Icon: Dumbbell, items: nearbyPlaces.gyms },
    { key: 'hospitals', label: 'Hospitais', Icon: Hospital, items: nearbyPlaces.hospitals },
    { key: 'malls', label: 'Shopping Centers', Icon: Building, items: nearbyPlaces.malls },
  ]), [nearbyPlaces]);
  const [contactOverlayOpen, setContactOverlayOpen] = useState(false);

  useEffect(() => {
    const availableKeys = poiCategories
      .filter((c) => Array.isArray(c.items) && (c.items as any[]).length > 0)
      .map((c) => c.key);

    if (availableKeys.length === 0) return;
    if (!availableKeys.includes(activePOITab)) {
      setActivePOITab(availableKeys[0] as any);
    }
  }, [activePOITab, poiCategories]);

  const mapPoiList = useMemo(() => {
    const list: any[] = [];
    const push = (arr: any[], emoji: string) => {
      (arr || []).slice(0, 3).forEach((p: any) => {
        if (typeof p?.lat !== 'number' || typeof p?.lng !== 'number') return;
        list.push({ lat: p.lat, lng: p.lng, label: p.name, emoji });
      });
    };
    push(nearbyPlaces.schools, '🏫');
    push(nearbyPlaces.pharmacies, '💊');
    push(nearbyPlaces.markets, '🛒');
    push(nearbyPlaces.restaurants, '🍽️');
    push(nearbyPlaces.banks, '🏦');
    push(nearbyPlaces.fuel, '⛽');
    push(nearbyPlaces.bakeries, '🥐');
    push(nearbyPlaces.hospitals, '🏥');
    push(nearbyPlaces.malls, '🛍️');
    push(nearbyPlaces.parks, '🌳');
    push(nearbyPlaces.gyms, '💪');
    return list;
  }, [nearbyPlaces]);

  // Distância aproximada
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371000; // metros
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

  

  const transformCloudinary = (url: string, transformation: string) => {
    try {
      const marker = "/image/upload/";
      const idx = url.indexOf(marker);
      if (idx === -1) return url;
      const head = url.substring(0, idx + marker.length);
      const tail = url.substring(idx + marker.length);
      if (tail.startsWith("f_")) return url;
      return `${head}${transformation}/${tail}`;
    } catch {
      return url;
    }
  };

  const cloudinaryUrl = (url: string | null | undefined, transformation: string) => {
    return transformCloudinary(url || "/placeholder.jpg", transformation);
  };

  const cloudinarySrcSet = (url: string | null | undefined, oneXTransformation: string, twoXTransformation: string) => {
    return `${cloudinaryUrl(url, oneXTransformation)} 1x, ${cloudinaryUrl(url, twoXTransformation)} 2x`;
  };

  const formatDraftBRLFromCents = (cents?: number | null) => {
    if (typeof cents !== "number" || !Number.isFinite(cents)) return "";
    const reais = Math.trunc(cents / 100);
    if (!Number.isFinite(reais) || reais <= 0) return "";
    return String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const normalizeDateToInput = (value?: string | null) => {
    if (!value) return "";
    const s = String(value);
    if (s.length >= 10) return s.slice(0, 10);
    return "";
  };

  const mapFinishFloorToDraft = (v?: string | null) => {
    const s = (v || "").toString().toUpperCase();
    if (s === "PORCELANATO") return "porcelanato";
    if (s === "MADEIRA") return "madeira";
    if (s === "VINILICO") return "vinilico";
    return "";
  };

  const mapSunOrientationToDraft = (v?: string | null) => {
    const s = (v || "").toString().toUpperCase();
    if (s === "NASCENTE" || s === "POENTE") return s;
    return "";
  };

  const handleCloneListing = async () => {
    if (!property) return;
    if (isCloning) return;
    setIsCloning(true);
    try {
      const SAVE_KEY = "owner_new_draft";

      try {
        const existing = window.localStorage.getItem(SAVE_KEY);
        if (existing && existing.trim()) {
          const ok = window.confirm(
            "Você já tem um rascunho salvo em Anunciar imóvel. Deseja substituir pelo anúncio clonado?"
          );
          if (!ok) return;
        }
      } catch {}

      const amenityTagSet = new Set([
        "Varanda",
        "Elevador",
        "Piscina",
        "Academia",
        "Playground",
        "Salão de festas",
        "Espaço gourmet",
        "Portaria 24h",
      ]);
      const conditionTags = Array.isArray(property.conditionTags)
        ? property.conditionTags.filter((t) => typeof t === "string" && !amenityTagSet.has(t))
        : [];

      const images = Array.isArray(property.images)
        ? property.images
            .filter((img: { url: string; alt?: string | null }) => !!img?.url)
            .slice(0, 20)
            .map((img: { url: string; alt?: string | null }) => ({ url: img.url, alt: img.alt ?? undefined, useUrl: true }))
        : [];

      const draft: any = {
        description: property.description || "",
        aiDescriptionGenerations: 0,
        customTitle: property.title || "",
        metaTitle: property.metaTitle || "",
        metaDescription: property.metaDescription || "",
        videoUrl: property.videoUrl || "",
        priceBRL: formatDraftBRLFromCents(property.price),
        type: property.type,
        purpose: property.purpose || "",
        street: property.street || "",
        neighborhood: property.neighborhood || "",
        city: property.city || "",
        state: property.state || "",
        postalCode: property.postalCode || "",
        bedrooms: property.bedrooms ?? "",
        bathrooms: property.bathrooms ?? "",
        areaM2: property.areaM2 ?? "",
        builtAreaM2: property.builtAreaM2 ?? "",
        lotAreaM2: property.lotAreaM2 ?? "",
        privateAreaM2: property.privateAreaM2 ?? "",
        usableAreaM2: property.usableAreaM2 ?? "",
        suites: property.suites ?? "",
        parkingSpots: property.parkingSpots ?? "",
        floor: property.floor ?? "",
        yearBuilt: property.yearBuilt ?? "",
        yearRenovated: property.yearRenovated ?? "",
        totalFloors: property.totalFloors ?? "",
        images: images.length ? images : [{ url: "", useUrl: false }],
        addressNumber: "",
        conditionTags,
        petFriendly: !!property.petFriendly,
        currentStep: 1,
        iptuYearBRL: formatDraftBRLFromCents(property.iptuYearly),
        condoFeeBRL: formatDraftBRLFromCents(property.condoFee),
        hasBalcony: !!property.hasBalcony,
        hasElevator: !!property.hasElevator,
        hasPool: !!property.hasPool,
        hasGym: !!property.hasGym,
        hasPlayground: !!property.hasPlayground,
        hasPartyRoom: !!property.hasPartyRoom,
        hasGourmet: !!property.hasGourmet,
        hasConcierge24h: !!property.hasConcierge24h,
        accRamps: !!property.accRamps,
        accWideDoors: !!property.accWideDoors,
        accAccessibleElevator: !!property.accAccessibleElevator,
        accTactile: !!property.accTactile,
        comfortAC: !!property.comfortAC,
        comfortHeating: !!property.comfortHeating,
        comfortSolar: !!property.comfortSolar,
        comfortNoiseWindows: !!property.comfortNoiseWindows,
        comfortLED: !!property.comfortLED,
        comfortWaterReuse: !!property.comfortWaterReuse,
        finishFloor: mapFinishFloorToDraft(property.finishFloor),
        finishCabinets: !!property.finishCabinets,
        finishCounterGranite: !!property.finishCounterGranite,
        finishCounterQuartz: !!property.finishCounterQuartz,
        viewSea: !!property.viewSea,
        viewCity: !!property.viewCity,
        positionFront: !!property.positionFront,
        positionBack: !!property.positionBack,
        sunByRoomNote: property.sunByRoomNote || "",
        petsSmall: !!property.petsSmall,
        petsLarge: !!property.petsLarge,
        condoRules: property.condoRules || "",
        secCCTV: !!property.secCCTV,
        secSallyPort: !!property.secSallyPort,
        secNightGuard: !!property.secNightGuard,
        secElectricFence: !!property.secElectricFence,
        sunOrientation: mapSunOrientationToDraft(property.sunOrientation),
        privateOwnerName: property.privateOwnerName || "",
        privateOwnerPhone: property.privateOwnerPhone || "",
        privateOwnerEmail: property.privateOwnerEmail || "",
        privateOwnerAddress: property.privateOwnerAddress || "",
        privateOwnerPriceBRL: formatDraftBRLFromCents(property.privateOwnerPrice),
        privateBrokerFeePercent:
          typeof property.privateBrokerFeePercent === "number" && Number.isFinite(property.privateBrokerFeePercent)
            ? String(property.privateBrokerFeePercent)
            : "",
        privateBrokerFeeFixedBRL: formatDraftBRLFromCents(property.privateBrokerFeeFixed),
        privateExclusive: !!property.privateExclusive,
        privateExclusiveUntil: normalizeDateToInput(property.privateExclusiveUntil),
        privateOccupied: !!property.privateOccupied,
        privateOccupantInfo: property.privateOccupantInfo || "",
        privateKeyLocation: property.privateKeyLocation || "",
        privateNotes: property.privateNotes || "",
        hidePrice: !!property.hidePrice,
        hideExactAddress: !!property.hideExactAddress,
        hideOwnerContact: !!property.hideOwnerContact,
        hideCondoFee: !!property.hideCondoFee,
        hideIPTU: !!property.hideIPTU,
        cloneFromPropertyId: property.id,
      };

      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(draft));
      } catch {}
      try {
        const apiDraft = { ...draft };
        delete (apiDraft as any).cloneFromPropertyId;
        fetch("/api/properties/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: apiDraft, currentStep: 1 }),
        }).catch(() => {});
      } catch {}

      router.push("/owner/new");
    } finally {
      setIsCloning(false);
    }
  };

  // Fetch property data
  useEffect(() => {
    if (!isOpen) return;
    if (isPreview) return;
    if (!activePropertyId) return;
    setLoading(true);
    setError(null);
    const endpoint = mode === "internal" ? `/api/owner/properties/${activePropertyId}` : `/api/public/properties/${activePropertyId}`;
    fetch(endpoint)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Erro ao carregar imóvel");
        }
        return res.json();
      })
      .then((data) => {
        if (mode === "internal") {
          if (!data?.success || !data?.property) throw new Error(data?.error || "Erro ao carregar imóvel");
          const p = data.property;
          setProperty({
            ...p,
            description: p.description || "",
            images: Array.isArray(p.images) ? p.images.map((img: any) => ({ url: img.url, alt: img.alt ?? null })) : [],
          });
        } else {
          setProperty(data.item);

          try {
            if (mode === "public" && activePropertyId && !trackedViewRef.current.has(activePropertyId)) {
              trackedViewRef.current.add(activePropertyId);
              fetch(`/api/public/properties/${activePropertyId}/view`, { method: "POST" }).catch(() => {});
            }
          } catch {
          }
        }
      })
      .catch((err) => {
        setError(err.message || "Erro ao carregar imóvel");
        console.error('[PropertyModal] Erro ao carregar detalhes do imóvel:', err);
        setProperty(null);
        setError('Não conseguimos carregar os detalhes deste imóvel agora. Se quiser, volte à lista e tente novamente em instantes.');
      })
      .finally(() => setLoading(false));
  }, [activePropertyId, isOpen, isPreview, mode]);

  useEffect(() => {
    if (!isOpen) return;
    if (mode !== "public") return;
    if (!shouldLoadRelated) return;
    if (!property?.id) return;
    if (relatedRequested) return;

    setRelatedRequested(true);
    const id = property.id;

    fetch(`/api/properties/nearby?id=${id}&radius=3&limit=8`)
      .then((r) => r.json())
      .then((d) => {
        const arr = d?.properties || d?.items || [];
        setNearbyProperties(arr);
      })
      .catch(() => setNearbyProperties([]));

    fetch(`/api/properties/similar?id=${id}&limit=8`)
      .then((r) => r.json())
      .then((d) => {
        const arr = d?.properties || d?.items || [];
        setSimilarProperties(arr);
      })
      .catch(() => setSimilarProperties([]));
  }, [isOpen, shouldLoadRelated, property, relatedRequested, mode]);

  useEffect(() => {
    setActivePropertyId(propertyId);
  }, [propertyId]);

  const handleOpenRelated = useCallback(
    (id: string) => {
      if (!id) return;
      if (variant === "overlay") {
        try {
          window.dispatchEvent(new CustomEvent('open-overlay', { detail: { id } }));
        } catch {}
        return;
      }

      setProperty(null);
      setNearbyProperties([]);
      setSimilarProperties([]);
      setNearbyPlaces({ schools: [], markets: [], pharmacies: [], restaurants: [], hospitals: [], malls: [], parks: [], gyms: [], fuel: [], bakeries: [], banks: [] });
      setPoiLoading(false);
      setPoiOpen(false);
      setRelatedRequested(false);
      setShouldLoadArea(false);
      setShouldLoadRelated(false);
      poiFetchedKeyRef.current = null;
      setPhotoViewMode(null);
      setCurrentImageIndex(0);
      setShowThumbGrid(false);
      setFullscreenTab("photos");
      setActivePropertyId(id);
      requestAnimationFrame(() => {
        try {
          scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
        }
      });
    },
    [scrollContainerRef, variant]
  );

  // Load nearby places (Overpass API) com mirrors/retries/cache
  useEffect(() => {
    const lat = (property as any)?.latitude;
    const lng = (property as any)?.longitude;
    if (mode !== "public") return;
    if (!isOpen || !poiOpen || !shouldLoadArea || !lat || !lng) return;

    const id = (property as any)?.id;
    const key = `${id ?? ""}:${String(lat)}:${String(lng)}`;
    if (poiFetchedKeyRef.current === key) return;
    poiFetchedKeyRef.current = key;

    let ignore = false;
    (async () => {
      try {
        setPoiLoading(true);
        const pickPayload = (d: any) => ({
          schools: Array.isArray(d?.schools) ? d.schools : [],
          markets: Array.isArray(d?.markets) ? d.markets : [],
          pharmacies: Array.isArray(d?.pharmacies) ? d.pharmacies : [],
          restaurants: Array.isArray(d?.restaurants) ? d.restaurants : [],
          hospitals: Array.isArray(d?.hospitals) ? d.hospitals : [],
          malls: Array.isArray(d?.malls) ? d.malls : [],
          parks: Array.isArray(d?.parks) ? d.parks : [],
          gyms: Array.isArray(d?.gyms) ? d.gyms : [],
          fuel: Array.isArray(d?.fuel) ? d.fuel : [],
          bakeries: Array.isArray(d?.bakeries) ? d.bakeries : [],
          banks: Array.isArray(d?.banks) ? d.banks : [],
        });

        try {
          const placesRes = await fetch(`/api/places-nearby?lat=${lat}&lng=${lng}&radius=2000&perCat=10`, { method: 'GET' });
          const placesJson = await placesRes.json().catch(() => null);
          if (placesRes.ok && placesJson?.ok) {
            if (!ignore) {
              setPoiSource('google');
              setNearbyPlaces(pickPayload(placesJson) as any);
            }
            return;
          }
          throw new Error(String(placesJson?.error || `places proxy ${placesRes.status}`));
        } catch {
          const res = await fetch(`/api/overpass?lat=${lat}&lng=${lng}&radius=2000`, { method: 'GET' });
          if (!res.ok) throw new Error(`overpass proxy ${res.status}`);
          const { elements } = await res.json();
          const data = normalizePOIs(elements || []);
          if (!ignore) {
            setPoiSource('osm');
            setNearbyPlaces(data as any);
          }
        }
      } catch (err) {
        console.warn('POIs load failed (silent):', err);
        if (!ignore) {
          setPoiSource(null);
          setNearbyPlaces({ schools: [], markets: [], pharmacies: [], restaurants: [], hospitals: [], malls: [], parks: [], gyms: [], fuel: [], bakeries: [], banks: [] });
        }
      } finally {
        if (!ignore) setPoiLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [isOpen, property, shouldLoadArea, mode, poiOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setProperty(null);
      setCurrentImageIndex(0);
      setPhotoViewMode(null);
      setShowMore(false);
      setError(null);
      setLoading(false);
      setContactOverlayOpen(false);
      setShowThumbGrid(false);
      setNearbyProperties([]);
      setSimilarProperties([]);
      setNearbyPlaces({ schools: [], markets: [], pharmacies: [], restaurants: [], hospitals: [], malls: [], parks: [], gyms: [], fuel: [], bakeries: [], banks: [] });
      setPoiLoading(false);
      setRelatedRequested(false);
      setShouldLoadArea(false);
      setShouldLoadRelated(false);
      setPoiOpen(false);
      setPoiSource(null);
      poiFetchedKeyRef.current = null;
    }
  }, [isOpen]);

  // Close on ESC (respeitando overlay de fotos/contato)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Se overlay de contato está aberto, fecha primeiro
      if (contactOverlayOpen) {
        setContactOverlayOpen(false);
        return;
      }
      // Se está em fullscreen ou feed, volta para detalhes
      if (photoViewMode) {
        setPhotoViewMode(null);
        return;
      }
      // Caso contrário, fecha o modal
      handleClose();
    };
    if (variant === "overlay" && isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [variant, isOpen, handleClose, photoViewMode, contactOverlayOpen]);

  // Keyboard navigation only when in fullscreen gallery
  useEffect(() => {
    if (photoViewMode !== "fullscreen" || !isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (!property) return;
        setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight') {
        if (!property) return;
        setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photoViewMode, isOpen, property]);

  // Prefetch próximas imagens (usa window.Image para não conflitar com Next/Image)
  useEffect(() => {
    if (photoViewMode !== "fullscreen" || !property || !isOpen) return;
    const total = property.images.length;
    const urls = [1, 2, 3]
      .map((d) => property.images[(currentImageIndex + d) % total]?.url)
      .filter(Boolean) as string[];
    urls.forEach((src) => {
      try {
        const img = new (window as any).Image();
        img.src = cloudinaryUrl(src, "f_auto,q_auto:good,w_1400,c_limit,dpr_1.0");
      } catch {}
    });
  }, [photoViewMode, property, currentImageIndex, isOpen]);

  useEffect(() => {
    if (photoViewMode !== "fullscreen" || !isOpen) return;
    const update = () => {
      try {
        const w = fsContainerRef.current?.clientWidth || window.innerWidth;
        setFsContainerW(w);
      } catch {
      }
    };
    requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [photoViewMode, isOpen]);

  // Reset zoom/pan whenever foto muda ou lightbox fecha
  useEffect(() => { 
    if (!isOpen) return;
    setZoom(1); 
    setOffset({ x: 0, y: 0 }); 
  }, [currentImageIndex, photoViewMode, isOpen]);

  // Definir quantidade de miniaturas por página (responsivo)
  useEffect(() => {
    if (!isOpen) return;
    const calc = () => {
      const w = window.innerWidth;
      const n = w < 480 ? 5 : w < 768 ? 7 : w < 1280 ? 9 : 11;
      setThumbsPerPage(n);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [isOpen]);

  // Helper functions
  const prevImage = () => {
    if (!property) return;
    setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    if (!property) return;
    setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
  };

  const handleShare = async () => {
    if (isPreview) return;
    const url = `${window.location.origin}${buildPropertyPath(String(propertyId || ""), property?.title || "")}`;
    if (navigator.share) {
      await navigator.share({ title: property?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleFavorite = async () => {
    if (isPreview) return;
    try {
      const method = isFavorite ? "DELETE" : "POST";
      await fetch("/api/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      setIsFavorite(!isFavorite);
    } catch {}
  };

  if (!isOpen) return null;

  if (loading) {
    return variant === "overlay" ? (
      <div className="fixed inset-0 bg-black/50 z-[12000] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    ) : (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !property) {
    return variant === "overlay" ? (
      <div className="fixed inset-0 bg-black/50 z-[12000] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Não foi possível abrir este imóvel</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Não foi possível abrir este imóvel</h2>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!property) return null;

  const displayImages = property.images.slice(0, 5);
  const truncatedDescription = property.description.length > 400 
    ? property.description.slice(0, 400) + "..." 
    : property.description;

  return (
    <AnimatePresence>
      {variant === "overlay" && open && <div className="fixed inset-0 bg-black/50 z-[12000]" onClick={handleClose} />}
      <div
        className={
          variant === "overlay"
            ? "fixed inset-0 z-[12001] flex items-start justify-center pointer-events-none"
            : "relative w-full flex items-start justify-center"
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          ref={scrollContainerRef}
          className={
            variant === "overlay"
              ? "pointer-events-auto w-full md:w-[92vw] lg:w-[85vw] xl:w-[75vw] max-w-[1400px] h-full bg-white md:rounded-2xl shadow-2xl overflow-y-auto"
              : "w-full max-w-[1400px] bg-white md:rounded-2xl shadow-2xl overflow-y-auto"
          }
        >
        {!isPreview && variant === "overlay" && photoViewMode !== "feed" && (
          <div className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100/80 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between px-4 h-16 max-w-5xl mx-auto">
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label="Voltar"
              >
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>

              <BrandLogo
                tone="dark"
                size={36}
                className="rounded-lg -mx-1 px-1 hover:bg-gray-100 transition-colors"
                wordmarkClassName="text-lg font-semibold tracking-tight"
                onClick={() => {
                  overlayHistoryPushedRef.current = false;
                  onClose?.();
                }}
              />

              {!isPreview && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFavorite}
                    className="p-2 rounded-full hover:bg-gray-100"
                    aria-label="Salvar"
                  >
                    <Heart className={`w-6 h-6 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-800"}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2 rounded-full hover:bg-gray-100"
                    aria-label="Compartilhar"
                  >
                    <Share2 className="w-6 h-6 text-gray-800" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header principal do modal (desktop/tablet). No mobile usamos controles sobre a foto. */}
        {!isPreview && (
        <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-gray-200/70 hidden sm:block">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {photoViewMode === "feed" ? (
              <button
                onClick={() => setPhotoViewMode(null)}
                className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar ao anúncio</span>
              </button>
            ) : variant === "page" ? (
              <Link
                href={backHref || (mode === "internal" ? "/broker/properties" : "/")}
                className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {backLabel || (mode === "internal" ? "Voltar aos imóveis" : "Voltar à busca")}
                </span>
              </Link>
            ) : (
              <button
                onClick={handleClose}
                className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar à busca</span>
              </button>
            )}
            {/* Ações só aparecem em sm+; no mobile usamos os botões sobre a foto */}
            <div className="hidden sm:flex items-center gap-3">
              {mode === "internal" && photoViewMode !== "feed" && (
                <>
                  <Link
                    href={`/broker/properties/${property.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-medium"
                  >
                    Leads & negociação
                  </Link>
                  <Link
                    href={`/owner/properties/edit/${property.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-medium"
                  >
                    Editar anúncio
                  </Link>
                  <button
                    type="button"
                    disabled={isCloning}
                    onClick={handleCloneListing}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Clonar anúncio
                  </button>
                </>
              )}
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-medium"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
              <button
                onClick={handleFavorite}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-medium"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-teal-500 text-teal-500" : ""}`} />
                <span className="hidden sm:inline">Salvar</span>
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Conteúdo com transição animada */}
        <AnimatePresence mode="wait">
          {photoViewMode !== "feed" ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
        {/* Gallery */}
        <div className="max-w-screen-2xl mx-auto md:px-6 lg:px-8 md:py-6">
          {/* Mobile: swipeable gallery - IGUAL AO CARD */}
          <div
            ref={mobContainerRef}
            className="md:hidden relative overflow-hidden aspect-[4/3]"
            style={{ touchAction: 'pan-y' }}
            onTouchStart={(e) => {
              if (!property || e.touches.length !== 1) return;
              setMobContainerW(mobContainerRef.current?.clientWidth || 0);
              const t = e.touches[0];
              const now = performance.now();
              mobSwipeStartX.current = t.clientX;
              mobSwipeStartY.current = t.clientY;
              mobSwipeStartTime.current = now;
              mobSwipeLastX.current = t.clientX;
              mobSwipeLastTime.current = now;
              mobSwipeLock.current = null;
              setMobIsDragging(true);
              setMobDragX(0);
            }}
            onTouchMove={(e) => {
              if (mobSwipeStartX.current == null || mobSwipeStartY.current == null || !property) return;
              const t = e.touches[0];
              const currentX = t.clientX;
              const currentY = t.clientY;
              const now = performance.now();
              mobSwipeLastX.current = currentX;
              mobSwipeLastTime.current = now;

              const dxTotal = currentX - mobSwipeStartX.current;
              const dyTotal = currentY - mobSwipeStartY.current;

              if (!mobSwipeLock.current) {
                const dx0 = Math.abs(dxTotal);
                const dy0 = Math.abs(dyTotal);
                const intentionThreshold = 8;
                if (dx0 < intentionThreshold && dy0 < intentionThreshold) return;
                mobSwipeLock.current = dx0 > dy0 ? "horizontal" : "vertical";
              }

              if (mobSwipeLock.current === "vertical") return;

              // Rubber-band nas bordas
              let dx = dxTotal;
              const atFirst = currentImageIndex === 0;
              const atLast = currentImageIndex === property.images.length - 1;
              if ((atFirst && dx > 0) || (atLast && dx < 0)) {
                dx = dx * 0.35;
              }
              setMobDragX(dx);
              e.preventDefault();
            }}
            onTouchEnd={() => {
              const startX = mobSwipeStartX.current;
              const lastX = mobSwipeLastX.current;
              const startT = mobSwipeStartTime.current;
              const lastT = mobSwipeLastTime.current;
              const lock = mobSwipeLock.current;
              let handledSwipe = false;

              if (startX != null && lastX != null && lock === "horizontal" && property && property.images.length > 1) {
                const dx = lastX - startX;
                const dt = Math.max(1, (lastT ?? performance.now()) - (startT ?? performance.now()));
                const velocity = dx / dt;
                const distanceThreshold = Math.max(50, mobContainerW * 0.15);
                const velocityThreshold = 0.5;
                const total = property.images.length;

                if (velocity <= -velocityThreshold || dx <= -distanceThreshold) {
                  setCurrentImageIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
                  handledSwipe = true;
                } else if (velocity >= velocityThreshold || dx >= distanceThreshold) {
                  setCurrentImageIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
                  handledSwipe = true;
                }
              }

              mobSwipeStartX.current = null;
              mobSwipeStartY.current = null;
              mobSwipeStartTime.current = null;
              mobSwipeLastX.current = null;
              mobSwipeLastTime.current = null;
              mobSwipeLock.current = null;
              setMobIsDragging(false);
              setMobDragX(0);

              // Se não foi swipe horizontal, foi um tap - abre o feed de fotos
              if (!handledSwipe && lock !== "vertical") {
                setPhotoViewMode("feed");
              }
            }}
          >
            {/* Todas as imagens lado a lado - segue o dedo */}
            <motion.div
              animate={{ x: mobIsDragging ? -currentImageIndex * mobContainerW + mobDragX : -currentImageIndex * mobContainerW }}
              transition={mobIsDragging ? { type: 'tween', duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
              className="flex h-full"
              style={{ width: `${property.images.length * 100}%` }}
            >
              {property.images.map((img: { url: string; alt?: string | null }, i: number) => (
                <div key={i} className="relative h-full" style={{ width: `${100 / property.images.length}%` }}>
                  <img
                    src={
                      cloudinaryUrl(
                        img.url,
                        i === 0
                          ? "f_webp,q_auto:best,w_1800,h_1013,c_fill,g_auto,dpr_1.0"
                          : "f_auto,q_auto:good,w_1600,h_900,c_fill,g_auto,dpr_1.0"
                      )
                    }
                    srcSet={
                      i === 0
                        ? cloudinarySrcSet(
                            img.url,
                            "f_webp,q_auto:best,w_1800,h_1013,c_fill,g_auto,dpr_1.0",
                            "f_webp,q_auto:best,w_1800,h_1013,c_fill,g_auto,dpr_2.0"
                          )
                        : cloudinarySrcSet(
                            img.url,
                            "f_auto,q_auto:good,w_1600,h_900,c_fill,g_auto,dpr_1.0",
                            "f_auto,q_auto:good,w_1600,h_900,c_fill,g_auto,dpr_2.0"
                          )
                    }
                    alt={`${property.title} ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : undefined}
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el.dataset.fallback === "1") return;
                      el.dataset.fallback = "1";
                      el.src = img.url || "/placeholder.jpg";
                    }}
                  />
                </div>
              ))}
            </motion.div>

            {variant === "page" && (
              <>
                {!isPreview && (
                  <>
                    {/* Botão voltar no canto superior esquerdo - estilo Zillow */}
                    <Link
                      href={backHref || (mode === "internal" ? "/broker/properties" : "/")}
                      className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-800" />
                    </Link>
                  </>
                )}

                {!isPreview && (
                  <>
                    {/* Ações no canto superior direito */}
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white rounded-full px-1 py-1 shadow-lg">
                      <button onClick={handleFavorite} className="w-8 h-8 flex items-center justify-center">
                        <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
                      </button>
                      <button onClick={handleShare} className="w-8 h-8 flex items-center justify-center">
                        <Share2 className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Contador no canto inferior direito */}
            <div className="absolute bottom-4 right-4 bg-black/70 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
              {currentImageIndex + 1} de {property.images.length}
            </div>

            {/* Dots indicadores */}
            {property.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {property.images.map((_v: { url: string; alt?: string | null }, i: number) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }}
                    className={`w-2 h-2 rounded-full transition-all ${
i === currentImageIndex ? "bg-white w-6" : "bg-white/50 w-2"}`}
                  />
                ))}
              </div>
            )}

            {parsedVideo ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenTab("video");
                  setPhotoViewMode("fullscreen");
                }}
                className="absolute bottom-4 left-4 z-10 px-3 py-2 rounded-lg bg-black/70 text-white text-xs font-semibold inline-flex items-center gap-2 hover:bg-black/80"
              >
                <Video className="w-4 h-4" />
                Vídeo
              </button>
            ) : null}
          </div>

          {/* Desktop: mosaic */}
          <div className="hidden md:grid grid-cols-2 gap-2 h-[500px]">
            <div className="relative rounded-lg overflow-hidden col-span-1 cursor-pointer" onClick={() => setPhotoViewMode("feed")}>
              <img
                src={
                  displayImages[0]?.url
                    ? cloudinaryUrl(displayImages[0].url, "f_webp,q_auto:best,w_1800,h_1013,c_fill,g_auto,dpr_1.0")
                    : "/placeholder.jpg"
                }
                srcSet={
                  displayImages[0]?.url
                    ? cloudinarySrcSet(
                        displayImages[0].url,
                        "f_webp,q_auto:best,w_1800,h_1013,c_fill,g_auto,dpr_1.0",
                        "f_webp,q_auto:best,w_1800,h_1013,c_fill,g_auto,dpr_2.0"
                      )
                    : undefined
                }
                alt={property.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.dataset.fallback === "1") return;
                  el.dataset.fallback = "1";
                  el.src = displayImages[0]?.url || "/placeholder.jpg";
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const tiles: Array<{ kind: "video" } | { kind: "image"; img: { url: string; alt?: string | null }; imageNumber: number }> = [];
                if (parsedVideo) tiles.push({ kind: "video" });
                displayImages.slice(1, 5).forEach((img, idx) => {
                  tiles.push({ kind: "image", img, imageNumber: idx + 2 });
                });

                return tiles.slice(0, 4).map((tile, i) => {
                  const showAllOverlay = tile.kind === "image" && i === 3 && property.images.length > 5;

                  if (tile.kind === "video") {
                    return (
                      <button
                        key="video-tile"
                        type="button"
                        className="relative rounded-lg overflow-hidden cursor-pointer bg-black"
                        onClick={() => {
                          setFullscreenTab("video");
                          setPhotoViewMode("fullscreen");
                        }}
                      >
                        {videoThumbUrl ? (
                          <img
                            src={videoThumbUrl}
                            alt="Vídeo do imóvel"
                            className="absolute inset-0 w-full h-full object-cover opacity-90"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-black" />
                        )}
                        <div className="absolute inset-0 bg-black/25" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                            <Video className="w-6 h-6 text-gray-900" />
                          </div>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={`img-tile-${i}`}
                      className="relative rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => setPhotoViewMode("feed")}
                    >
                      <img
                        src={cloudinaryUrl(tile.img.url, "f_auto,q_auto:eco,w_720,h_540,c_fill,g_auto,dpr_1.0")}
                        srcSet={cloudinarySrcSet(
                          tile.img.url,
                          "f_auto,q_auto:eco,w_720,h_540,c_fill,g_auto,dpr_1.0",
                          "f_auto,q_auto:eco,w_720,h_540,c_fill,g_auto,dpr_2.0"
                        )}
                        alt={`${property.title} ${tile.imageNumber}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (el.dataset.fallback === "1") return;
                          el.dataset.fallback = "1";
                          el.src = tile.img.url;
                        }}
                      />
                      {showAllOverlay && (
                        <button
                          onClick={() => setPhotoViewMode("feed")}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium hover:bg-black/60 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-lg">📷</span>
                            Ver todas as fotos
                          </span>
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {mode === "internal" && variant === "page" && (
            <div className="sm:hidden mt-4">
              <div className="rounded-2xl border border-gray-200 p-4 bg-white shadow-sm">
                <div className="grid grid-cols-1 gap-2">
                  <Link
                    href={`/broker/properties/${property.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-medium"
                  >
                    Leads & negociação
                  </Link>
                  <Link
                    href={`/owner/properties/edit/${property.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-medium"
                  >
                    Editar anúncio
                  </Link>
                  <button
                    type="button"
                    disabled={isCloning}
                    onClick={handleCloneListing}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Clonar anúncio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 px-4 md:px-0">
            {/* Main Content */}
            <div className="lg:col-span-2 divide-y divide-gray-200">
              <div className="pt-0 pb-8">
                {/* Price */}
                <div>
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                    {typeof property.price === "number" && property.price > 0
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(property.price / 100)
                      : "Sob consulta"}
                  </h2>
                </div>

                {/* Title */}
                <div className="mt-2">
                  <h1 className="text-xl md:text-2xl font-semibold text-gray-900 leading-snug">
                    {property.title}
                  </h1>
                </div>

                {/* Location */}
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>
                    {property.neighborhood && `${property.neighborhood}, `}
                    {property.city}, {property.state}
                  </span>
                </div>

                {/* Specs */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {property.bedrooms != null && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                      {property.bedrooms} quartos
                    </span>
                  )}
                  {property.bathrooms != null && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                      {property.bathrooms} banheiros
                    </span>
                  )}
                  {property.areaM2 != null && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                      {property.areaM2} m²
                    </span>
                  )}
                </div>
              </div>

              {/* About the Property */}
              <div className="py-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Sobre o imóvel</h3>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  <p>{showMore ? property.description : truncatedDescription}</p>
                  {property.description.length > 400 && (
                    <button
                      onClick={() => setShowMore(!showMore)}
                      className="text-teal hover:text-teal-dark font-medium mt-3 inline-flex items-center gap-1"
                    >
                      {showMore ? "Ver menos" : "Ver mais"} →
                    </button>
                  )}
                </div>
              </div>

              {/* Property Details Grid */}
              <div className="py-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.type && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo</div>
                    <div className="font-medium text-gray-900">{ptBR.type(property.type)}</div>
                  </div>
                )}
                {property.yearBuilt && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ano de construção</div>
                    <div className="font-medium text-gray-900">{property.yearBuilt}</div>
                  </div>
                )}
                {property.parkingSpots != null && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vagas</div>
                    <div className="font-medium text-gray-900">{property.parkingSpots} {property.parkingSpots === 1 ? 'vaga' : 'vagas'}</div>
                  </div>
                )}
                {property.furnished && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mobília</div>
                    <div className="font-medium text-gray-900">Mobiliado</div>
                  </div>
                )}
                </div>
              </div>

              {/* Features - Sober style with Lucide icons */}
              <div className="py-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Características</h3>
                {(() => {
                  const allFeatures: { icon: React.ReactNode; label: string }[] = [];
                  
                  if (property.parkingSpots != null && property.parkingSpots > 0) allFeatures.push({ icon: <Car className="w-5 h-5 text-gray-600" />, label: "Estacionamento" });
                  if ((property as any).hasElevator) allFeatures.push({ icon: <Building2 className="w-5 h-5 text-gray-600" />, label: "Elevador" });
                  if ((property as any).hasBalcony) allFeatures.push({ icon: <Home className="w-5 h-5 text-gray-600" />, label: "Varanda" });
                  if ((property as any).hasPool) allFeatures.push({ icon: <Waves className="w-5 h-5 text-gray-600" />, label: "Piscina" });
                  if ((property as any).hasGym) allFeatures.push({ icon: <Dumbbell className="w-5 h-5 text-gray-600" />, label: "Academia" });
                  if ((property as any).hasGourmet) allFeatures.push({ icon: <UtensilsCrossed className="w-5 h-5 text-gray-600" />, label: "Espaço Gourmet" });
                  if ((property as any).hasPlayground) allFeatures.push({ icon: <Baby className="w-5 h-5 text-gray-600" />, label: "Playground" });
                  if ((property as any).hasPartyRoom) allFeatures.push({ icon: <PartyPopper className="w-5 h-5 text-gray-600" />, label: "Salão de Festas" });
                  if ((property as any).hasConcierge24h) allFeatures.push({ icon: <ShieldCheck className="w-5 h-5 text-gray-600" />, label: "Portaria 24h" });
                  if ((property as any).comfortAC) allFeatures.push({ icon: <Snowflake className="w-5 h-5 text-gray-600" />, label: "Ar Condicionado" });
                  if ((property as any).comfortHeating) allFeatures.push({ icon: <Flame className="w-5 h-5 text-gray-600" />, label: "Aquecimento" });
                  if ((property as any).comfortSolar) allFeatures.push({ icon: <Sun className="w-5 h-5 text-gray-600" />, label: "Energia Solar" });
                  if ((property as any).secCCTV) allFeatures.push({ icon: <Video className="w-5 h-5 text-gray-600" />, label: "CFTV" });
                  if ((property as any).secElectricFence) allFeatures.push({ icon: <Zap className="w-5 h-5 text-gray-600" />, label: "Cerca Elétrica" });
                  if ((property as any).viewSea) allFeatures.push({ icon: <Waves className="w-5 h-5 text-gray-600" />, label: "Vista para Mar" });
                  if ((property as any).viewCity) allFeatures.push({ icon: <Building2 className="w-5 h-5 text-gray-600" />, label: "Vista para Cidade" });
                  if ((property as any).positionFront) allFeatures.push({ icon: <ArrowUp className="w-5 h-5 text-gray-600" />, label: "Frente" });
                  if ((property as any).positionBack) allFeatures.push({ icon: <ArrowDown className="w-5 h-5 text-gray-600" />, label: "Fundos" });
                  if ((property as any).accRamps) allFeatures.push({ icon: <Accessibility className="w-5 h-5 text-gray-600" />, label: "Rampa de Acesso" });
                  if ((property as any).accWideDoors) allFeatures.push({ icon: <DoorOpen className="w-5 h-5 text-gray-600" />, label: "Portas Largas" });
                  if ((property as any).accAccessibleElevator) allFeatures.push({ icon: <Accessibility className="w-5 h-5 text-gray-600" />, label: "Elevador Acessível" });
                  if ((property as any).comfortLED) allFeatures.push({ icon: <Lightbulb className="w-5 h-5 text-gray-600" />, label: "Iluminação LED" });
                  if ((property as any).comfortWaterReuse) allFeatures.push({ icon: <Droplets className="w-5 h-5 text-gray-600" />, label: "Reuso de Água" });
                  if ((property as any).finishCabinets) allFeatures.push({ icon: <Archive className="w-5 h-5 text-gray-600" />, label: "Armários Planejados" });
                  if ((property as any).finishCounterGranite) allFeatures.push({ icon: <Gem className="w-5 h-5 text-gray-600" />, label: "Bancada em Granito" });
                  if ((property as any).finishCounterQuartz) allFeatures.push({ icon: <Gem className="w-5 h-5 text-gray-600" />, label: "Bancada em Quartzo" });
                  if ((property as any).sunOrientation) allFeatures.push({ icon: <Compass className="w-5 h-5 text-gray-600" />, label: `Sol: ${String((property as any).sunOrientation).toLowerCase() === 'nascente' ? 'Nascente' : 'Poente'}` });
                  if (property.petFriendly || (property as any).petsSmall) allFeatures.push({ icon: <Dog className="w-5 h-5 text-gray-600" />, label: "Aceita Pets Pequenos" });
                  if ((property as any).petsLarge) allFeatures.push({ icon: <Dog className="w-5 h-5 text-gray-600" />, label: "Aceita Pets Grandes" });
                  if (property.furnished) allFeatures.push({ icon: <Home className="w-5 h-5 text-gray-600" />, label: "Mobiliado" });

                  const visibleFeatures = showAllFeatures ? allFeatures : allFeatures.slice(0, 9);
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {visibleFeatures.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            {feature.icon}
                            <span className="text-gray-700">{feature.label}</span>
                          </div>
                        ))}
                      </div>
                      {allFeatures.length > 9 && (
                        <button
                          onClick={() => setShowAllFeatures(!showAllFeatures)}
                          className="mt-4 inline-flex items-center gap-2 text-teal hover:text-teal-dark font-medium"
                        >
                          {showAllFeatures ? 'Ver menos' : `Ver todas ${allFeatures.length} características`}
                          <ChevronDown className={`w-4 h-4 transition-transform ${showAllFeatures ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                      {/* Removidos: botões de categorias (tabs) abaixo das características */}
                    </>
                  );
                })()}
              </div>

              {mode === "public" && (
                <div ref={areaSectionRef} className="py-8">
                  {(() => {
                    const lat = (property as any).latitude;
                    const lng = (property as any).longitude;
                    const hasCoords = typeof lat === 'number' && typeof lng === 'number';

                    const available = poiCategories
                      .filter((c) => Array.isArray(c.items) && (c.items as any[]).length > 0)
                      .map((c) => {
                        const base = ((c.items as any[]) || []).slice();
                        base.sort((a: any, b: any) => {
                          if (hasCoords) {
                            const d1 = (a.lat - lat) * (a.lat - lat) + (a.lng - lng) * (a.lng - lng);
                            const d2 = (b.lat - lat) * (b.lat - lat) + (b.lng - lng) * (b.lng - lng);
                            return d1 - d2;
                          }
                          return String(a.name).localeCompare(String(b.name));
                        });
                        return { ...c, sorted: base };
                      });

                    const totalPois = (available as any[]).reduce((acc: number, c: any) => acc + (((c.items as any[]) || []).length), 0);

                    const selected = (available as any[]).find((c: any) => c.key === activePOITab) || (available as any[])[0];
                    const selectedList = (selected as any)?.sorted || [];

                    const toggle = () => {
                      setPoiOpen((v) => {
                        const next = !v;
                        if (next && !shouldLoadArea) setShouldLoadArea(true);
                        return next;
                      });
                    };

                    return (
                      <>
                        <button
                          type="button"
                          onClick={toggle}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm font-semibold text-gray-900">Explore a Região</span>
                          <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                            <ChevronDown className={`w-4 h-4 transition-transform ${poiOpen ? 'rotate-180' : ''}`} />
                          </span>
                        </button>

                        {poiOpen && (
                          <>
                            {shouldLoadArea && hasCoords && (
                              <div className="mt-4 h-64 md:h-72 rounded-2xl border border-teal/10 overflow-hidden bg-white shadow-sm">
                                <Map
                                  items={[{
                                    id: property.id,
                                    price: property.price,
                                    latitude: (property as any).latitude,
                                    longitude: (property as any).longitude,
                                  }]}
                                  pois={{ mode: 'list' as const, items: mapPoiList as any }}
                                  hideRefitButton
                                  centeredPriceMarkers
                                  simplePin
                                  limitInteraction={{ minZoom: 13, maxZoom: 16, radiusMeters: 2000 }}
                                />
                              </div>
                            )}

                            {poiLoading && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 mb-6">
                                {Array.from({ length: 6 }).map((_v: unknown, i: number) => (
                                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                                    <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
                                    <div className="space-y-2">
                                      <div className="h-3 w-5/6 bg-gray-200 rounded" />
                                      <div className="h-3 w-2/3 bg-gray-200 rounded" />
                                      <div className="h-3 w-3/4 bg-gray-200 rounded" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {!poiLoading && available.length > 0 ? (
                              <div className="mt-4 mb-6">
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                  {(available as any[]).map((c: any) => (
                                    <button
                                      key={`poi-tab-${c.key}`}
                                      type="button"
                                      onClick={() => setActivePOITab(c.key)}
                                      className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                                        c.key === (selected as any).key
                                          ? "border-teal-500 bg-teal-50 text-teal-800"
                                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                      }`}
                                    >
                                      {(() => {
                                        const I = c.Icon as any;
                                        return <I className="w-3.5 h-3.5" />;
                                      })()}
                                      <span>{c.label}</span>
                                      <span className="text-[11px] font-semibold text-gray-500">{((c.items as any[]) || []).length}</span>
                                    </button>
                                  ))}
                                </div>
                                <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                                  {selectedList.slice(0, 8).map((p: any, idx: number) => {
                                    const dist = hasCoords && typeof p.lat === 'number' && typeof p.lng === 'number' ? formatDistance(haversine(lat, lng, p.lat, p.lng)) : null;
                                    const rating = typeof p?.rating === 'number' && Number.isFinite(p.rating) ? p.rating : null;
                                    const userRatingCount = typeof p?.userRatingCount === 'number' && Number.isFinite(p.userRatingCount) ? p.userRatingCount : null;
                                    const openNow = typeof p?.openNow === 'boolean' ? p.openNow : null;
                                    const address = typeof p?.address === 'string' ? p.address : null;
                                    return (
                                      <div key={`poi-${idx}`} className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                                          <div className="text-xs text-gray-500">{(selected as any).label}</div>
                                          {(rating != null || openNow != null || address) ? (
                                            <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                                              {rating != null && (
                                                <span className="inline-flex items-center gap-1">
                                                  <span className="text-yellow-600">★</span>
                                                  <span className="font-semibold text-gray-700">{rating.toFixed(1)}</span>
                                                  {userRatingCount != null ? <span>({userRatingCount})</span> : null}
                                                </span>
                                              )}
                                              {openNow != null ? (
                                                <span className={openNow ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                                                  {openNow ? 'Aberto agora' : 'Fechado agora'}
                                                </span>
                                              ) : null}
                                              {address ? <span className="truncate">{address}</span> : null}
                                            </div>
                                          ) : null}
                                        </div>
                                        {dist && (
                                          <span className="shrink-0 text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                                            {dist}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : !poiLoading ? (
                              <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 mt-4 mb-6 text-center">
                                <p className="text-sm text-gray-600">Nenhum estabelecimento encontrado nos arredores (2 km).</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {poiSource === 'google'
                                    ? 'Os dados são carregados do Google e podem variar.'
                                    : poiSource === 'osm'
                                    ? 'Os dados são carregados do OpenStreetMap e podem variar.'
                                    : 'Não foi possível carregar os estabelecimentos agora. Tente novamente em instantes.'}
                                </p>
                              </div>
                            ) : null}

                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.street}, ${property.city}, ${property.state}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-teal hover:text-teal-dark font-medium mb-8"
                            >
                              Explorar no Google Maps →
                            </a>
                          </>
                        )}
                      </>
                    );
                  })()}

                  <div className="md:hidden mb-8">
                    <PropertyContactCard
                      propertyId={property.id}
                      propertyTitle={property.title}
                      propertyPurpose={property.purpose}
                      ownerRole={property.owner?.role || "USER"}
                      ownerName={property.owner?.name || undefined}
                      ownerImage={property.owner?.image || undefined}
                      ownerPublicProfileEnabled={!!property.owner?.publicProfileEnabled}
                      ownerPublicSlug={property.owner?.publicSlug || null}
                      ownerPublicPhoneOptIn={!!(property.owner as any)?.publicPhoneOptIn}
                      hideOwnerContact={!!(property as any)?.hideOwnerContact}
                    />
                  </div>

                  <div ref={relatedSectionRef}>
                    {/* Imóveis Próximos */}
                    {shouldLoadRelated ? (
                      nearbyProperties.length > 0 ? (
                        <div className="border-t border-teal/10 pt-8 mt-8">
                          <SimilarCarousel properties={nearbyProperties} showHeader title="Imóveis próximos" onOpenOverlay={handleOpenRelated} />
                        </div>
                      ) : (
                        <div className="border-t border-teal/10 pt-8 mt-8 text-center py-4">
                          <p className="text-sm text-gray-500">Buscando imóveis próximos...</p>
                        </div>
                      )
                    ) : (
                      <div className="border-t border-teal/10 pt-8 mt-8 text-center py-4">
                        <p className="text-sm text-gray-500">Carregando sugestões de imóveis...</p>
                      </div>
                    )}

                    {/* Imóveis similares */}
                    {shouldLoadRelated ? (
                      similarProperties.length > 0 ? (
                        <div className="border-t border-teal/10 pt-8 mt-8">
                          <SimilarCarousel properties={similarProperties} showHeader title="Imóveis similares" onOpenOverlay={handleOpenRelated} />
                        </div>
                      ) : (
                        <div className="border-t border-teal/10 pt-8 mt-8 text-center py-4">
                          <p className="text-sm text-gray-500">Buscando imóveis similares...</p>
                        </div>
                      )
                    ) : (
                      <div className="border-t border-teal/10 pt-8 mt-8 text-center py-4">
                        <p className="text-sm text-gray-500">Carregando sugestões de imóveis...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {isPublicLike ? (
                  <>
                    {/* Financing card will appear below the contact form */}

                    {/* Contact Card - Dynamic based on owner type and lead board setting */}
                    <div className={isPreview ? "" : "hidden md:block"}>
                      <PropertyContactCard
                        propertyId={property.id}
                        propertyTitle={property.title}
                        propertyPurpose={property.purpose}
                        disableActions={isPreview}
                        ownerRole={property.owner?.role || "USER"}
                        ownerName={property.owner?.name || undefined}
                        ownerImage={property.owner?.image || undefined}
                        ownerPublicProfileEnabled={!!property.owner?.publicProfileEnabled}
                        ownerPublicSlug={property.owner?.publicSlug || null}
                        ownerPublicPhoneOptIn={!!(property.owner as any)?.publicPhoneOptIn}
                        hideOwnerContact={!!(property as any)?.hideOwnerContact}
                      />
                    </div>

                    {/* Financing Calculator - Only for SALE properties (single card below contact form) */}
                    {property.purpose === 'SALE' && property.price && property.price > 0 && (() => {
                      const priceBRL = property.price / 100;
                      const { calculation } = getLowestFinancing(priceBRL);
                      const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
                      return (
                        <div className="rounded-xl border border-teal/10 p-6 bg-gradient-to-br from-teal/5 to-teal/10 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">💰 Financiamento</h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Entrada (20%)</p>
                              <p className="text-lg font-bold text-gray-900">{fmt(calculation.downPayment)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Parcela estimada (360x)</p>
                              <p className="text-2xl font-bold text-teal">{fmt(calculation.monthlyPayment)}<span className="text-sm text-gray-600 font-normal">/mês</span></p>
                            </div>
                            {!isPreview && (
                              <a href={`/financing/${property.id}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-4 py-2 glass-teal text-white rounded-lg font-medium hover:opacity-90 transition-opacity">Ver opções de bancos →</a>
                            )}
                            <p className="text-xs text-gray-500 text-center">*Simulação aproximada. Consulte seu banco.</p>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : variant === "page" ? (
                  <></>
                ) : (
                  <div className="rounded-xl border border-teal/10 p-6 bg-white shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3">Ferramentas internas</h4>
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/broker/properties/${property.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                      >
                        Leads & negociação
                      </Link>
                      <Link
                        href={`/owner/properties/edit/${property.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                      >
                        Editar anúncio
                      </Link>
                      <button
                        type="button"
                        disabled={isCloning}
                        onClick={handleCloneListing}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Clonar anúncio
                      </button>
                    </div>
                  </div>
                )}

                {mode === "internal" && (property.privateOwnerName || property.privateOwnerPhone || property.privateOwnerEmail || property.privateOwnerAddress || property.privateOwnerPrice || property.privateBrokerFeePercent || property.privateBrokerFeeFixed || property.privateKeyLocation || property.privateNotes) && (
                  <div className="rounded-xl border border-teal/10 p-6 bg-white shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal" />
                      Dados privados
                    </h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      {property.privateOwnerName && <div><span className="text-gray-500">Proprietário:</span> {property.privateOwnerName}</div>}
                      {property.privateOwnerPhone && <div><span className="text-gray-500">Telefone:</span> {property.privateOwnerPhone}</div>}
                      {property.privateOwnerEmail && <div><span className="text-gray-500">E-mail:</span> {property.privateOwnerEmail}</div>}
                      {property.privateOwnerAddress && <div><span className="text-gray-500">Endereço:</span> {property.privateOwnerAddress}</div>}
                      {typeof property.privateOwnerPrice === "number" && <div><span className="text-gray-500">Valor desejado:</span> {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(property.privateOwnerPrice / 100)}</div>}
                      {typeof property.privateBrokerFeePercent === "number" && <div><span className="text-gray-500">Taxa (%):</span> {property.privateBrokerFeePercent}%</div>}
                      {typeof property.privateBrokerFeeFixed === "number" && <div><span className="text-gray-500">Taxa fixa:</span> {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(property.privateBrokerFeeFixed / 100)}</div>}
                      {property.privateKeyLocation && <div><span className="text-gray-500">Chave:</span> {property.privateKeyLocation}</div>}
                      {property.privateNotes && <div className="pt-2 border-t border-gray-100"><span className="text-gray-500">Notas:</span> <span className="block text-gray-700 whitespace-pre-wrap">{property.privateNotes}</span></div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Seções Nearby/Similar já estão acima, após Google Maps */}
        </div>
            </motion.div>
          ) : (
            /* Feed de fotos - Mobile: todas grandes / Desktop: 1+2 layout */
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col h-[calc(100vh-64px)]"
            >
              {/* Header mobile estilo Zillow - apenas no feed */}
              <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => setPhotoViewMode(null)}
                  className="inline-flex items-center gap-2 text-gray-800"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Voltar ao anúncio</span>
                </button>
                {!isPreview && (
                  <div className="flex items-center gap-3">
                    <button onClick={handleFavorite}>
                      <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
                    </button>
                    <button onClick={handleShare}>
                      <Share2 className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Feed de fotos */}
                <div className="flex-1 overflow-y-auto">
                  {/* Mobile: todas as fotos do mesmo tamanho, full width */}
                  <div className="md:hidden">
                    {property.images.map((img: { url: string; alt?: string | null }, i: number) => (
                      <div
                        key={i}
                        className="relative w-full aspect-[4/3] cursor-pointer"
                        onClick={() => { setCurrentImageIndex(i); setPhotoViewMode("fullscreen"); }}
                      >
                        <img
                          src={cloudinaryUrl(img.url, "f_auto,q_auto:good,w_1400,h_1050,c_fill,g_auto,dpr_1.0")}
                          srcSet={cloudinarySrcSet(
                            img.url,
                            "f_auto,q_auto:good,w_1400,h_1050,c_fill,g_auto,dpr_1.0",
                            "f_auto,q_auto:good,w_1400,h_1050,c_fill,g_auto,dpr_2.0"
                          )}
                          alt={`${property.title} ${i + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading={i === 0 ? "eager" : "lazy"}
                          fetchPriority={i === 0 ? "high" : undefined}
                          onError={(e) => {
                            const el = e.currentTarget;
                            if (el.dataset.fallback === "1") return;
                            el.dataset.fallback = "1";
                            el.src = img.url || "/placeholder.jpg";
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Desktop: layout 1 grande + 2 menores */}
                  <div className="hidden md:block px-4 py-4 space-y-3">
                    {(() => {
                      const items: Array<{ kind: "image"; idx: number } | { kind: "video" }> = property.images.map((_img, idx) => ({ kind: "image", idx }));
                      if (parsedVideo) items.splice(1, 0, { kind: "video" });

                      const groups: { main: number; thumbs: number[] }[] = [];
                      const total = items.length;
                      for (let i = 0; i < total; i += 3) {
                        const main = i;
                        const thumbs: number[] = [];
                        if (i + 1 < total) thumbs.push(i + 1);
                        if (i + 2 < total) thumbs.push(i + 2);
                        groups.push({ main, thumbs });
                      }

                      const renderMain = (it: (typeof items)[number], key: string) => {
                        if (it.kind === "video") {
                          return (
                            <button
                              key={key}
                              type="button"
                              className="relative w-full aspect-[16/9] rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity bg-black"
                              onClick={() => {
                                setFullscreenTab("video");
                                setPhotoViewMode("fullscreen");
                              }}
                            >
                              {videoThumbUrl ? (
                                <img src={videoThumbUrl} alt="Vídeo do imóvel" className="absolute inset-0 w-full h-full object-cover opacity-90" loading="lazy" />
                              ) : (
                                <div className="absolute inset-0 w-full h-full bg-black" />
                              )}
                              <div className="absolute inset-0 bg-black/25" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                                  <Video className="w-7 h-7 text-gray-900" />
                                </div>
                              </div>
                            </button>
                          );
                        }

                        const img = property.images[it.idx];
                        return (
                          <div
                            key={key}
                            className="relative w-full aspect-[16/9] rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => {
                              setFullscreenTab("photos");
                              setCurrentImageIndex(it.idx);
                              setPhotoViewMode("fullscreen");
                            }}
                          >
                            <img
                              src={cloudinaryUrl(img?.url, "f_auto,q_auto:good,w_1600,h_900,c_fill,g_auto,dpr_1.0")}
                              srcSet={cloudinarySrcSet(
                                img?.url,
                                "f_auto,q_auto:good,w_1600,h_900,c_fill,g_auto,dpr_1.0",
                                "f_auto,q_auto:good,w_1600,h_900,c_fill,g_auto,dpr_2.0"
                              )}
                              alt={`${property.title} ${it.idx + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              loading={it.idx === 0 ? "eager" : "lazy"}
                              fetchPriority={it.idx === 0 ? "high" : undefined}
                              onError={(e) => {
                                const el = e.currentTarget;
                                if (el.dataset.fallback === "1") return;
                                el.dataset.fallback = "1";
                                el.src = img?.url || "/placeholder.jpg";
                              }}
                            />
                          </div>
                        );
                      };

                      const renderThumb = (it: (typeof items)[number], key: string) => {
                        if (it.kind === "video") {
                          return (
                            <button
                              key={key}
                              type="button"
                              className="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity bg-black"
                              onClick={() => {
                                setFullscreenTab("video");
                                setPhotoViewMode("fullscreen");
                              }}
                            >
                              {videoThumbUrl ? (
                                <img src={videoThumbUrl} alt="Vídeo do imóvel" className="absolute inset-0 w-full h-full object-cover opacity-90" loading="lazy" />
                              ) : (
                                <div className="absolute inset-0 w-full h-full bg-black" />
                              )}
                              <div className="absolute inset-0 bg-black/25" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                  <Video className="w-5 h-5 text-gray-900" />
                                </div>
                              </div>
                            </button>
                          );
                        }

                        const img = property.images[it.idx];
                        return (
                          <div
                            key={key}
                            className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => {
                              setFullscreenTab("photos");
                              setCurrentImageIndex(it.idx);
                              setPhotoViewMode("fullscreen");
                            }}
                          >
                            <img
                              src={cloudinaryUrl(img?.url, "f_auto,q_auto:eco,w_720,h_540,c_fill,g_auto,dpr_1.0")}
                              srcSet={cloudinarySrcSet(
                                img?.url,
                                "f_auto,q_auto:eco,w_720,h_540,c_fill,g_auto,dpr_1.0",
                                "f_auto,q_auto:eco,w_720,h_540,c_fill,g_auto,dpr_2.0"
                              )}
                              alt={`${property.title} ${it.idx + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const el = e.currentTarget;
                                if (el.dataset.fallback === "1") return;
                                el.dataset.fallback = "1";
                                el.src = img?.url || "/placeholder.jpg";
                              }}
                            />
                          </div>
                        );
                      };

                      return groups.map((g, idx) => (
                        <div key={idx} className="space-y-2">
                          {renderMain(items[g.main], `main-${idx}`)}
                          {g.thumbs.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {g.thumbs.map((ti) => (
                                renderThumb(items[ti], `thumb-${idx}-${ti}`)
                              ))}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Card resumo à direita (desktop) */}
                <div className="hidden md:block w-[340px] border-l border-gray-100 bg-white px-5 py-6 space-y-5">
                {/* Preço */}
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Preço</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {typeof property.price === "number" && property.price > 0
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(property.price / 100)
                      : "Sob consulta"}
                  </div>
                </div>

                {/* Specs inline */}
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  {property.bedrooms != null && (
                    <span className="font-semibold">{property.bedrooms} <span className="font-normal text-gray-500">quartos</span></span>
                  )}
                  {property.bathrooms != null && (
                    <span className="font-semibold">{property.bathrooms} <span className="font-normal text-gray-500">banheiros</span></span>
                  )}
                  {property.areaM2 != null && (
                    <span className="font-semibold">{property.areaM2} <span className="font-normal text-gray-500">m²</span></span>
                  )}
                </div>

                {/* Título e endereço */}
                <div>
                  <div className="text-base font-semibold text-gray-900 mb-1">{property.title}</div>
                  <div className="text-sm text-teal-600">
                    {property.street && `${property.street}, `}
                    {property.neighborhood && `${property.neighborhood}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {property.city}, {property.state}
                  </div>
                </div>

                {mode === "public" && (
                  <button
                    type="button"
                    onClick={() => setContactOverlayOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
                  >
                    Entrar em contato
                  </button>
                )}

                {!isPreview && (
                  <>
                    {/* Botões secundários */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleFavorite}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${isFavorite ? "fill-teal-500 text-teal-500" : ""}`} />
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Compartilhar
                      </button>
                    </div>
                  </>
                )}

                {/* Contador de fotos */}
                <div className="text-xs text-teal-600 font-medium">
                  {property.images.length} fotos
                </div>
              </div>

              {/* fecha o container flex do feed (fotos + card) */}
              </div>

              {/* Botão de contato mobile (fixo no bottom) */}
              {mode === "public" && (
                <></>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </div>

      {/* Full-screen Lightbox - Estilo Zillow */}
      {photoViewMode === "fullscreen" && property && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-[#1a1a1a] z-[30000]" />
          <div className="fixed inset-0 z-[30001] flex flex-col select-none">
            {/* Header bar - estilo Zillow */}
            <div className="bg-[#2b2b2b] h-14 flex items-center justify-between px-4 shrink-0 relative">
              <button
                type="button"
                onClick={() => setPhotoViewMode(null)}
                className="inline-flex items-center gap-2 text-white hover:text-white/80 text-sm"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar ao anúncio</span>
              </button>
              
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setFullscreenTab("photos")}
                  className={`text-sm font-semibold ${fullscreenTab === "photos" ? "text-white" : "text-white/70 hover:text-white"}`}
                >
                  Fotos
                  {fullscreenTab === "photos" ? <div className="w-full h-0.5 bg-white/60 mt-1 rounded-full" /> : null}
                </button>
                {parsedVideo ? (
                  <button
                    type="button"
                    onClick={() => setFullscreenTab("video")}
                    className={`text-sm font-semibold ${fullscreenTab === "video" ? "text-white" : "text-white/70 hover:text-white"}`}
                  >
                    Vídeo
                    {fullscreenTab === "video" ? <div className="w-full h-0.5 bg-white/60 mt-1 rounded-full" /> : null}
                  </button>
                ) : null}
              </div>

              {/* Ações à direita */}
              <div className="flex items-center gap-3">
                {mode === "public" && (
                  <button
                    type="button"
                    onClick={() => setContactOverlayOpen(true)}
                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg glass-teal text-white text-sm font-semibold"
                  >
                    Entrar em contato
                  </button>
                )}
                {!isPreview && (
                  <>
                    <button
                      type="button"
                      onClick={handleFavorite}
                      className="inline-flex items-center gap-2 text-white hover:text-white/80"
                    >
                      <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="hidden sm:inline-flex items-center gap-2 text-white hover:text-white/80"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {fullscreenTab === "video" && parsedVideo ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-5xl">
                  <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black aspect-video">
                    <iframe
                      src={parsedVideo.embedUrl}
                      title="Vídeo do imóvel"
                      className="absolute inset-0 w-full h-full"
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                ref={fsContainerRef}
                className="flex-1 relative overflow-hidden"
                style={{ touchAction: 'pan-y' }}
                onTouchStart={(e) => {
                  if (!property || e.touches.length !== 1) return;
                  setFsContainerW(fsContainerRef.current?.clientWidth || window.innerWidth);
                  const t = e.touches[0];
                  const now = performance.now();
                  fsSwipeStartX.current = t.clientX;
                  fsSwipeStartY.current = t.clientY;
                  fsSwipeStartTime.current = now;
                  fsSwipeLastX.current = t.clientX;
                  fsSwipeLastTime.current = now;
                  fsSwipeLock.current = null;
                  setFsIsDragging(true);
                  setFsDragX(0);
                }}
                onTouchMove={(e) => {
                  if (fsSwipeStartX.current == null || fsSwipeStartY.current == null || !property) return;
                  const t = e.touches[0];
                  const currentX = t.clientX;
                  const currentY = t.clientY;
                  const now = performance.now();
                  fsSwipeLastX.current = currentX;
                  fsSwipeLastTime.current = now;

                  const dxTotal = currentX - fsSwipeStartX.current;
                  const dyTotal = currentY - fsSwipeStartY.current;

                  if (!fsSwipeLock.current) {
                    const dx0 = Math.abs(dxTotal);
                    const dy0 = Math.abs(dyTotal);
                    const intentionThreshold = 8;
                    if (dx0 < intentionThreshold && dy0 < intentionThreshold) return;
                    fsSwipeLock.current = dx0 > dy0 ? "horizontal" : "vertical";
                  }

                  if (fsSwipeLock.current === "vertical") return;

                  let dx = dxTotal;
                  const atFirst = currentImageIndex === 0;
                  const atLast = currentImageIndex === property.images.length - 1;
                  if ((atFirst && dx > 0) || (atLast && dx < 0)) {
                    dx = dx * 0.35;
                  }
                  setFsDragX(dx);
                  e.preventDefault();
                }}
                onTouchEnd={() => {
                  const startX = fsSwipeStartX.current;
                  const lastX = fsSwipeLastX.current;
                  const startT = fsSwipeStartTime.current;
                  const lastT = fsSwipeLastTime.current;
                  const lock = fsSwipeLock.current;

                  if (startX != null && lastX != null && lock === "horizontal" && property && property.images.length > 1) {
                    const dx = lastX - startX;
                    const dt = Math.max(1, (lastT ?? performance.now()) - (startT ?? performance.now()));
                    const velocity = dx / dt;
                    const distanceThreshold = Math.max(50, fsContainerW * 0.15);
                    const velocityThreshold = 0.5;
                    const total = property.images.length;

                    if (velocity <= -velocityThreshold || dx <= -distanceThreshold) {
                      setCurrentImageIndex((prev) => Math.min(total - 1, prev + 1));
                    } else if (velocity >= velocityThreshold || dx >= distanceThreshold) {
                      setCurrentImageIndex((prev) => Math.max(0, prev - 1));
                    }
                  }

                  fsSwipeStartX.current = null;
                  fsSwipeStartY.current = null;
                  fsSwipeStartTime.current = null;
                  fsSwipeLastX.current = null;
                  fsSwipeLastTime.current = null;
                  fsSwipeLock.current = null;
                  setFsIsDragging(false);
                  setFsDragX(0);
                }}
              >
                <button
                  aria-label="Anterior"
                  onClick={prevImage}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg text-gray-800 flex items-center justify-center hover:bg-gray-100 z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  aria-label="Próxima"
                  onClick={nextImage}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg text-gray-800 flex items-center justify-center hover:bg-gray-100 z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <motion.div
                  animate={{ x: fsIsDragging ? -currentImageIndex * fsContainerW + fsDragX : -currentImageIndex * fsContainerW }}
                  transition={fsIsDragging ? { type: 'tween', duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                  className="flex h-full items-center"
                  style={{ width: `${property.images.length * 100}%` }}
                >
                  {property.images.map((img: { url: string; alt?: string | null }, i: number) => (
                    <div key={i} className="relative h-full flex items-center justify-center" style={{ width: `${100 / property.images.length}%` }}>
                      <img
                        src={cloudinaryUrl(img.url, "f_auto,q_auto:good,w_1400,c_limit,dpr_1.0")}
                        srcSet={cloudinarySrcSet(
                          img.url,
                          "f_auto,q_auto:good,w_1400,c_limit,dpr_1.0",
                          "f_auto,q_auto:good,w_1400,c_limit,dpr_2.0"
                        )}
                        alt={`${property.title} - foto ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-contain"
                        loading={i === currentImageIndex ? "eager" : "lazy"}
                        fetchPriority={i === currentImageIndex ? "high" : undefined}
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (el.dataset.fallback === "1") return;
                          el.dataset.fallback = "1";
                          el.src = img.url || "/placeholder.jpg";
                        }}
                      />
                    </div>
                  ))}
                </motion.div>

                <div className="absolute top-4 right-4 bg-black/70 text-white text-sm font-medium px-3 py-1.5 rounded-lg z-10">
                  {currentImageIndex + 1} de {property.images.length}
                </div>
              </div>
            )}

            {/* Info caption no rodapé - estilo Zillow */}
            <div className="bg-[#2b2b2b] py-3 px-4 text-center shrink-0">
              <p className="text-white/90 text-sm">
                {property.purpose === "SALE" ? "Venda" : "Aluguel"}: {typeof property.price === "number" && property.price > 0 
                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(property.price / 100)
                  : "Sob consulta"}
                {property.bedrooms != null && ` (${property.bedrooms} quartos`}
                {property.bathrooms != null && `, ${property.bathrooms} banheiros`}
                {property.areaM2 != null && `, ${property.areaM2} m²`}
                {(property.bedrooms != null || property.bathrooms != null || property.areaM2 != null) && ")"}
              </p>
            </div>
          </div>
        </>
      )}
      {/* Grid de miniaturas em overlay */}
      {photoViewMode === "fullscreen" && showThumbGrid && property && (
        <>
          <div className="fixed inset-0 bg-black/80 z-[30010]" onClick={() => setShowThumbGrid(false)} />
          <div className="fixed inset-0 z-[30011] flex items-center justify-center p-4">
            <div className="bg-white/95 rounded-xl max-w-6xl w-full max-h-[80vh] overflow-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-800 font-medium">Escolha uma foto</div>
                <button onClick={() => setShowThumbGrid(false)} className="w-9 h-9 rounded-md border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {parsedVideo ? (
                  <button
                    key="grid-video"
                    onClick={() => {
                      setShowThumbGrid(false);
                      setFullscreenTab("video");
                    }}
                    className={`relative w-full aspect-square rounded-md overflow-hidden ring-2 ${fullscreenTab === 'video' ? 'ring-teal-500' : 'ring-transparent hover:ring-teal-300'} bg-black`}
                  >
                    {videoThumbUrl ? (
                      <img src={videoThumbUrl} alt="Vídeo do imóvel" className="absolute inset-0 w-full h-full object-cover opacity-90" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-black" />
                    )}
                    <div className="absolute inset-0 bg-black/25" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
                        <Video className="w-5 h-5 text-gray-900" />
                      </div>
                    </div>
                  </button>
                ) : null}
                {property.images.map((img: { url: string; alt?: string | null }, i: number) => (
                  <button
                    key={`grid-${i}`}
                    onClick={() => { setFullscreenTab("photos"); setCurrentImageIndex(i); setShowThumbGrid(false); }}
                    className={`relative w-full pt-[66%] rounded-md overflow-hidden ring-2 ${i === currentImageIndex ? 'ring-teal-500' : 'ring-transparent hover:ring-teal-300'}`}
                  >
                    <img
                      src={cloudinaryUrl(img.url, "f_auto,q_auto:eco,w_720,h_480,c_fill,g_auto,dpr_1.0")}
                      srcSet={cloudinarySrcSet(
                        img.url,
                        "f_auto,q_auto:eco,w_720,h_480,c_fill,g_auto,dpr_1.0",
                        "f_auto,q_auto:eco,w_720,h_480,c_fill,g_auto,dpr_2.0"
                      )}
                      alt={`grid ${i + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el.dataset.fallback === "1") return;
                        el.dataset.fallback = "1";
                        el.src = img.url;
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      {/* Overlay dedicado de contato (abre a partir das fotos) */}
      {mode === "public" && contactOverlayOpen && property && (
        <div className="fixed inset-0 z-[32000] bg-black/60 flex items-center justify-center px-4" onClick={() => setContactOverlayOpen(false)}>
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Fechar contato"
              onClick={() => setContactOverlayOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
            <PropertyContactCard
              propertyId={property.id}
              propertyTitle={property.title}
              propertyPurpose={property.purpose}
              ownerRole={property.owner?.role || "USER"}
              ownerName={property.owner?.name || undefined}
              ownerImage={property.owner?.image || undefined}
              ownerPublicProfileEnabled={!!property.owner?.publicProfileEnabled}
              ownerPublicSlug={property.owner?.publicSlug || null}
              ownerPublicPhoneOptIn={!!(property.owner as any)?.publicPhoneOptIn}
              hideOwnerContact={!!(property as any)?.hideOwnerContact}
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
