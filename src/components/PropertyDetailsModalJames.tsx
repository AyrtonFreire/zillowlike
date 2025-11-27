"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { X, Share2, Heart, MapPin, ChevronLeft, ChevronRight, Car, Home, Wind, Waves, Building2, Dumbbell, UtensilsCrossed, Baby, PartyPopper, ShieldCheck, Snowflake, Flame, Sun, Video, Zap, Eye, ArrowUp, ArrowDown, Accessibility, DoorOpen, Lightbulb, Droplets, Archive, Gem, Compass, Dog, ChevronDown, School, Pill, ShoppingCart, Landmark, Fuel, Trees, Hospital, Stethoscope, Building } from "lucide-react";
import Image from "next/image";
import Button from "./ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { getLowestFinancing } from "@/lib/financing";
import { normalizePOIs } from "@/lib/overpass";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const SimilarCarousel = dynamic(() => import("@/components/SimilarCarousel"), { ssr: false });
const PropertyContactCard = dynamic(() => import("@/components/PropertyContactCard"), { ssr: false });

type PropertyDetailsModalProps = {
  propertyId: string | null;
  open: boolean;
  onClose: () => void;
};

type PropertyDetails = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  purpose?: 'SALE' | 'RENT';
  street: string;
  neighborhood: string | null;
  city: string;
  state: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  parkingSpots: number | null;
  yearBuilt: number | null;
  furnished: boolean;
  petFriendly: boolean;
  images: { url: string }[];
  allowRealtorBoard?: boolean;
  owner?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: "USER" | "OWNER" | "REALTOR" | "AGENCY" | "ADMIN";
    phone: string | null;
    publicProfileEnabled?: boolean | null;
    publicSlug?: string | null;
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
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [thumbsPerPage, setThumbsPerPage] = useState(9);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [photoViewMode, setPhotoViewMode] = useState<"feed" | "fullscreen" | null>(null);
  const [showThumbGrid, setShowThumbGrid] = useState(false);
  // Zoom/Pan state for lightbox
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ down: boolean; x: number; y: number }>({ down: false, x: 0, y: 0 });
  const pinchRef = useRef<{ active: boolean; startDist: number; startZoom: number; cx: number; cy: number }>({ active: false, startDist: 0, startZoom: 1, cx: 0, cy: 0 });
  const [showMore, setShowMore] = useState(false);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [similarProperties, setSimilarProperties] = useState<any[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<{ schools: any[]; markets: any[]; pharmacies: any[]; restaurants: any[]; hospitals: any[]; malls: any[]; parks: any[]; gyms: any[]; fuel: any[]; bakeries: any[]; banks: any[] }>({ schools: [], markets: [], pharmacies: [], restaurants: [], hospitals: [], malls: [], parks: [], gyms: [], fuel: [], bakeries: [], banks: [] });
  const [activePOITab, setActivePOITab] = useState<'schools' | 'markets' | 'pharmacies' | 'restaurants' | 'hospitals' | 'clinics' | 'parks' | 'gyms' | 'fuel' | 'bakeries' | 'banks'>('schools');
  const [poiLoading, setPoiLoading] = useState(false);
  // Lightbox touch resistance state
  const lbStartX = useRef<number | null>(null);
  const lbLastX = useRef<number | null>(null);
  const lbMoved = useRef(false);
  const [lbDragOffset, setLbDragOffset] = useState(0);
  // Mobile inline gallery swipe state (outside lightbox)
  const mobSwipeStartX = useRef<number | null>(null);
  const mobSwipeDeltaX = useRef(0);

  const poiCategories = useMemo(() => ([
    { key: 'schools', label: 'Escolas', Icon: School, items: nearbyPlaces.schools },
    { key: 'pharmacies', label: 'Farmácias', Icon: Pill, items: nearbyPlaces.pharmacies },
    { key: 'markets', label: 'Supermercados', Icon: ShoppingCart, items: nearbyPlaces.markets },
    { key: 'restaurants', label: 'Restaurantes', Icon: UtensilsCrossed, items: nearbyPlaces.restaurants },
    { key: 'banks', label: 'Bancos', Icon: Landmark, items: nearbyPlaces.banks },
    { key: 'fuel', label: 'Postos', Icon: Fuel, items: nearbyPlaces.fuel },
    { key: 'bakeries', label: 'Padarias', Icon: ShoppingCart, items: nearbyPlaces.bakeries },
    { key: 'hospitals', label: 'Hospitais', Icon: Hospital, items: nearbyPlaces.hospitals },
    { key: 'malls', label: 'Shopping Centers', Icon: Building, items: nearbyPlaces.malls },
  ]), [nearbyPlaces]);

  const [poiPage, setPoiPage] = useState(0);
  const [contactOverlayOpen, setContactOverlayOpen] = useState(false);

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

  // Fetch property data
  useEffect(() => {
    if (!open || !propertyId) return;

    setLoading(true);
    setError(null);
    fetch(`/api/properties?id=${propertyId}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Property modal load failed (HTTP)", { status: res.status, statusText: res.statusText, body: text });
          throw new Error("http-error");
        }
        return res.json();
      })
      .then(data => {
        if (data.item) {
          setProperty(data.item);
          // Buscar imóveis próximos e similares usando endpoints dedicados
          if (data.item.id) {
            console.log('[PropertyModal] Buscando nearby properties (endpoint /api/properties/nearby)...', { id: data.item.id });
            fetch(`/api/properties/nearby?id=${data.item.id}&radius=3&limit=8`)
              .then(r => r.json())
              .then(d => {
                const arr = d?.properties || d?.items || [];
                console.log('[PropertyModal] Nearby properties encontrados:', Array.isArray(arr) ? arr.length : 0);
                setNearbyProperties(arr);
              })
              .catch((err) => {
                console.error('[PropertyModal] Erro ao buscar nearby properties:', err);
              });
          }
          if (data.item.id) {
            console.log('[PropertyModal] Buscando similar properties (endpoint /api/properties/similar)...', { id: data.item.id });
            fetch(`/api/properties/similar?id=${data.item.id}&limit=8`)
              .then(r => r.json())
              .then(d => {
                const arr = d?.properties || d?.items || [];
                console.log('[PropertyModal] Similar properties encontrados:', Array.isArray(arr) ? arr.length : 0);
                setSimilarProperties(arr);
              })
              .catch((err) => {
                console.error('[PropertyModal] Erro ao buscar similar properties:', err);
              });
          }
        } else {
          console.error('[PropertyModal] Nenhum item retornado pela API de propriedades.', data);
          setProperty(null);
          setError('Não encontramos os detalhes deste imóvel agora. Se quiser, volte à lista e tente abrir novamente em instantes.');
        }
      })
      .catch((err) => {
        console.error('[PropertyModal] Erro ao carregar detalhes do imóvel:', err);
        setProperty(null);
        setError('Não conseguimos carregar os detalhes deste imóvel agora. Se quiser, volte à lista e tente novamente em instantes.');
      })
      .finally(() => setLoading(false));
  }, [propertyId, open]);

  // Load nearby places (Overpass API) com mirrors/retries/cache
  useEffect(() => {
    const lat = (property as any)?.latitude;
    const lng = (property as any)?.longitude;
    if (!open || !lat || !lng) return;
    let ignore = false;
    (async () => {
      try {
        setPoiLoading(true);
        const res = await fetch(`/api/overpass?lat=${lat}&lng=${lng}&radius=2000`, { method: 'GET' });
        if (!res.ok) throw new Error(`overpass proxy ${res.status}`);
        const { elements } = await res.json();
        const data = normalizePOIs(elements || []);
        if (!ignore) setNearbyPlaces(data as any);
      } catch (err) {
        console.warn('POIs load failed (silent):', err);
        if (!ignore) setNearbyPlaces({ schools: [], markets: [], pharmacies: [], restaurants: [], hospitals: [], malls: [], parks: [], gyms: [], fuel: [], bakeries: [], banks: [] });
      } finally {
        if (!ignore) setPoiLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [open, property]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setProperty(null);
      setCurrentImageIndex(0);
      setShowAllPhotos(false);
      setPhotoViewMode(null);
      setShowMore(false);
      setError(null);
      setLoading(false);
      setContactOverlayOpen(false);
    }
  }, [open]);

  // Close on ESC (respeitando overlay de fotos/contato)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showAllPhotos) {
        setShowAllPhotos(false);
        setPhotoViewMode(null);
        setContactOverlayOpen(false);
        setShowThumbGrid(false);
        return;
      }
      if (contactOverlayOpen) {
        setContactOverlayOpen(false);
        return;
      }
      onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose, showAllPhotos, contactOverlayOpen]);

  // Keyboard navigation only when gallery overlay is open
  useEffect(() => {
    if (!showAllPhotos || !open) return;
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
  }, [showAllPhotos, open, property]);

  // Prefetch próximas imagens (usa window.Image para não conflitar com Next/Image)
  useEffect(() => {
    if (!showAllPhotos || !property || !open) return;
    const total = property.images.length;
    const urls = [1, 2, 3]
      .map((d) => property.images[(currentImageIndex + d) % total]?.url)
      .filter(Boolean) as string[];
    urls.forEach((src) => { try { const img = new (window as any).Image(); img.src = src; } catch {} });
  }, [showAllPhotos, property, currentImageIndex, open]);

  // Reset zoom/pan whenever foto muda ou lightbox fecha
  useEffect(() => { 
    if (!open) return;
    setZoom(1); 
    setOffset({ x: 0, y: 0 }); 
  }, [currentImageIndex, showAllPhotos, open]);

  // Definir quantidade de miniaturas por página (responsivo)
  useEffect(() => {
    if (!open) return;
    const calc = () => {
      const w = window.innerWidth;
      const n = w < 480 ? 5 : w < 768 ? 7 : w < 1280 ? 9 : 11;
      setThumbsPerPage(n);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [open]);

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
    const url = `${window.location.origin}/property/${propertyId}`;
    if (navigator.share) {
      await navigator.share({ title: property?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleFavorite = async () => {
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

  if (!open) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[12000] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[12000] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Não foi possível abrir este imóvel</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
            >
              Fechar
            </button>
          </div>
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
      {open && <div className="fixed inset-0 bg-black/50 z-[12000]" onClick={onClose} />}
      <div className="fixed inset-0 z-[12001] flex items-start justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="pointer-events-auto w-full md:w-[92vw] lg:w-[85vw] xl:w-[75vw] max-w-[1400px] h-full bg-white md:rounded-2xl shadow-2xl overflow-y-auto"
        >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-teal/10">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Voltar à busca</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
              <button
                onClick={handleFavorite}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-teal-500 text-teal-500" : ""}`} />
                <span className="hidden sm:inline">Salvar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Mobile: single large image with indicators and swipe */}
          <div className="md:hidden relative rounded-xl overflow-hidden h-[380px]">
            <div
              className="absolute inset-0"
              onClick={() => { setShowAllPhotos(true); setPhotoViewMode("feed"); }}
              onTouchStart={(e) => { mobSwipeStartX.current = e.touches[0].clientX; mobSwipeDeltaX.current = 0; }}
              onTouchMove={(e) => { if (mobSwipeStartX.current == null) return; const dx = e.touches[0].clientX - mobSwipeStartX.current; mobSwipeDeltaX.current = dx; }}
              onTouchEnd={() => {
                const threshold = 40;
                const total = property.images.length;
                const dx = mobSwipeDeltaX.current || 0;
                mobSwipeStartX.current = null; mobSwipeDeltaX.current = 0;
                if (Math.abs(dx) > threshold) {
                  if (dx < 0) {
                    setCurrentImageIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
                  } else {
                    setCurrentImageIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
                  }
                }
              }}
            >
              <Image
                src={transformCloudinary(property.images[currentImageIndex]?.url || "/placeholder.jpg", "f_auto,q_auto:good,dpr_auto,w_1920,h_1080,c_fill,g_auto")}
                alt={`${property.title} ${currentImageIndex + 1}`}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
            {/* Hints: open all, count, arrows, dots */}
            <button
              onClick={() => { setShowAllPhotos(true); setPhotoViewMode("feed"); }}
              className="absolute top-3 right-3 z-10 px-3 py-1.5 text-xs font-medium rounded-full bg-white/90 text-gray-900 shadow"
            >
              Ver todas as fotos ({property.images.length})
            </button>
            <div className="absolute bottom-3 inset-x-3 flex flex-col items-center gap-2">
              <div className="px-3 py-1.5 text-[11px] font-medium rounded-full bg-black/55 text-white">
                Foto {currentImageIndex + 1} de {property.images.length} — deslize
              </div>
              <div className="flex items-center gap-1.5">
                {property.images.slice(0, 8).map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
                ))}
              </div>
            </div>
            {/* Subtle chevrons as hints (tap advances) */}
            <button aria-label="Anterior" onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center">
              ‹
            </button>
            <button aria-label="Próximo" onClick={() => setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center">
              ›
            </button>
          </div>

          {/* Desktop: mosaic */}
          <div className="hidden md:grid grid-cols-2 gap-2 h-[500px]">
            <div className="relative rounded-lg overflow-hidden col-span-1 cursor-pointer" onClick={() => { setShowAllPhotos(true); setPhotoViewMode("feed"); }}>
              <Image
                src={displayImages[0]?.url ? transformCloudinary(displayImages[0].url, "f_auto,q_auto:good,dpr_auto,w_1920,h_1080,c_fill,g_auto") : "/placeholder.jpg"}
                alt={property.title}
                fill
                className="object-cover"
                sizes="50vw"
                priority
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {displayImages.slice(1, 5).map((img, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden cursor-pointer" onClick={() => { setShowAllPhotos(true); setPhotoViewMode("feed"); }}>
                  <Image
                    src={transformCloudinary(img.url, "f_auto,q_auto:good,dpr_auto,w_800,h_600,c_fill,g_auto")}
                    alt={`${property.title} ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />
                  {i === 3 && property.images.length > 5 && (
                    <button
                      onClick={() => { setShowAllPhotos(true); setPhotoViewMode("feed"); }}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium hover:bg-black/60 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">📷</span>
                        Ver todas as fotos
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Price */}
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {typeof property.price === "number" && property.price > 0
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(property.price / 100)
                    : "Price on Request"}
                </h2>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-normal text-gray-900 leading-tight">
                  {property.title}
                </h1>
              </div>

              {/* Specs inline */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {property.bedrooms != null && <span>{property.bedrooms} Quartos</span>}
                {property.bathrooms != null && <span>· {property.bathrooms} Banheiros</span>}
                {property.areaM2 != null && <span>· {property.areaM2} m²</span>}
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>
                  {property.neighborhood && `${property.neighborhood}, `}
                  {property.city}, {property.state}
                </span>
              </div>

              {/* About the Property */}
              <div className="pt-4 border-t border-teal/10">
                <h3 className="text-2xl font-display font-normal text-gray-900 mb-4">
                  Sobre o Imóvel
                </h3>
                <div className="text-gray-700 leading-relaxed">
                  <p>{showMore ? property.description : truncatedDescription}</p>
                  {property.description.length > 400 && (
                    <button
                      onClick={() => setShowMore(!showMore)}
                      className="text-teal hover:text-teal-dark font-medium mt-2 inline-flex items-center gap-1"
                    >
                      {showMore ? "Ver menos" : "Ver mais"} →
                    </button>
                  )}
                </div>
              </div>

              {/* Property Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {property.type && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo</div>
                    <div className="font-medium text-gray-900">{property.type}</div>
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

              {/* Features - Sober style with Lucide icons */}
              <div className="pt-4 border-t border-teal/10">
                <h3 className="text-2xl font-display font-normal text-gray-900 mb-4">Características</h3>
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

              {/* Explore the Area */}
              <div className="pt-4 border-t border-teal/10">
                <h3 className="text-2xl font-display font-normal text-gray-900 mb-4">Explore a Região</h3>
                
                {/* Mapa com POIs */}
                {(property as any).latitude && (property as any).longitude && (
                  <div className="mb-4 h-[300px] rounded-lg overflow-hidden border border-teal/10">
                    <Map
                      items={[{
                        id: property.id,
                        price: property.price,
                        latitude: (property as any).latitude,
                        longitude: (property as any).longitude
                      }]}
                      pois={{
                        mode: 'auto' as const,
                        center: [(property as any).latitude, (property as any).longitude],
                        radius: 1000
                      }}
                      hideRefitButton
                      simplePin
                      limitInteraction={{ minZoom: 13, maxZoom: 16, radiusMeters: 2000 }}
                    />
                  </div>
                )}
                
                {/* Skeleton de POIs */}
                {poiLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {Array.from({length: 6}).map((_,i)=> (
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

                {/* Locais próximos - Minimal items grid like 'Características' */}
                {(nearbyPlaces.schools.length > 0 || nearbyPlaces.markets.length > 0 || nearbyPlaces.pharmacies.length > 0 || nearbyPlaces.restaurants.length > 0 || nearbyPlaces.hospitals.length > 0 || nearbyPlaces.parks.length > 0 || nearbyPlaces.gyms.length > 0 || nearbyPlaces.fuel.length > 0 || nearbyPlaces.bakeries.length > 0 || nearbyPlaces.banks.length > 0 || nearbyPlaces.malls.length > 0) ? (
                  <div className="mb-6">
                    {(() => {
                      const available = poiCategories.filter(c => (c.items as any[]) && (c.items as any[]).length>0);
                      const chunks: typeof available[] = [] as any;
                      for (let i=0; i<available.length; i+=3) chunks.push(available.slice(i, i+3));
                      const total = chunks.length || 1;
                      const page = Math.min(poiPage, total-1);
                      const current = chunks[page] || [];
                      return (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm text-gray-500">Categorias {page+1}/{total}</div>
                            <div className="hidden sm:flex items-center gap-2">
                              <button aria-label="Anterior" onClick={()=>setPoiPage(Math.max(0, page-1))} className="w-8 h-8 rounded-full border bg-white hover:bg-gray-50 shadow flex items-center justify-center">‹</button>
                              <button aria-label="Próximo" onClick={()=>setPoiPage(Math.min(total-1, page+1))} className="w-8 h-8 rounded-full border bg-white hover:bg-gray-50 shadow flex items-center justify-center">›</button>
                            </div>
                          </div>
                          {/* Mobile arrows - below grid */}
                          <div className="sm:hidden flex items-center justify-center gap-3 mb-2">
                            <button aria-label="Anterior" onClick={()=>setPoiPage(Math.max(0, page-1))} className="w-9 h-9 rounded-full border bg-white/95 shadow flex items-center justify-center">‹</button>
                            <button aria-label="Próximo" onClick={()=>setPoiPage(Math.min(total-1, page+1))} className="w-9 h-9 rounded-full border bg-white/95 shadow flex items-center justify-center">›</button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {current.map(({ key, label, Icon, items }) => {
                              const lat = (property as any).latitude;
                              const lng = (property as any).longitude;
                              const hasCoords = typeof lat === 'number' && typeof lng === 'number';
                              const base = ((items as any[]) || []).slice();
                              base.sort((a: any, b: any) => {
                                if (hasCoords) {
                                  const d1 = (a.lat - lat) * (a.lat - lat) + (a.lng - lng) * (a.lng - lng);
                                  const d2 = (b.lat - lat) * (b.lat - lat) + (b.lng - lng) * (b.lng - lng);
                                  return d1 - d2;
                                }
                                return String(a.name).localeCompare(String(b.name));
                              });
                              const list = base.slice(0, 4);
                              if (list.length === 0) return null;
                              return (
                                <div key={`col-${key}`}>
                                  <div className="flex items-center gap-3 mb-2">
                                    {(() => { const I = Icon as any; return <I className="w-5 h-5 text-gray-700" />; })()}
                                    <span className="text-gray-900 font-medium">{label as string}</span>
                                  </div>
                                  <ul className="text-sm text-gray-600 space-y-1 ml-1">
                                    {list.map((p, i) => {
                                      const hasItemCoords = hasCoords && typeof (p as any).lat === 'number' && typeof (p as any).lng === 'number';
                                      const dist = hasItemCoords ? formatDistance(haversine(lat, lng, (p as any).lat, (p as any).lng)) : null;
                                      return (
                                        <li key={`${key}-${i}`} className="flex items-start gap-2">
                                          <span className="text-teal/60 mt-0.5">•</span>
                                          <span className="flex-1 leading-relaxed">
                                            {(p as any).name}
                                            {dist && <span className="text-gray-500 ml-1">• {dist}</span>}
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 mb-6 text-center">
                    <p className="text-sm text-gray-600">Nenhum estabelecimento encontrado nos arredores (2 km).</p>
                    <p className="text-xs text-gray-500 mt-1">Os dados são carregados do OpenStreetMap e podem variar.</p>
                  </div>
                )}
                
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.street}, ${property.city}, ${property.state}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-teal hover:text-teal-dark font-medium mb-8"
                >
                  Ver no Google Maps →
                </a>

                {/* Imóveis Próximos */}
                {nearbyProperties.length > 0 ? (
                  <div className="border-t border-teal/10 pt-8 mt-8">
                    <SimilarCarousel properties={nearbyProperties} showHeader title="Imóveis próximos" />
                  </div>
                ) : (
                  <div className="border-t border-teal/10 pt-8 mt-8 text-center py-4">
                    <p className="text-sm text-gray-500">Buscando imóveis próximos...</p>
                  </div>
                )}

                {/* Imóveis similares */}
                {similarProperties.length > 0 ? (
                  <div className="border-t border-teal/10 pt-8 mt-8">
                    <SimilarCarousel properties={similarProperties} showHeader title="Imóveis similares" />
                  </div>
                ) : (
                  <div className="border-t border-teal/10 pt-8 mt-8 text-center py-4">
                    <p className="text-sm text-gray-500">Buscando imóveis similares...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Financing card will appear below the contact form */}

                {/* Contact Card - Dynamic based on owner type and lead board setting */}
                <PropertyContactCard
                  propertyId={property.id}
                  propertyTitle={property.title}
                  propertyPurpose={property.purpose}
                  ownerRole={property.owner?.role || "USER"}
                  ownerName={property.owner?.name || undefined}
                  ownerImage={property.owner?.image || undefined}
                  ownerPhone={property.owner?.phone || undefined}
                  ownerPublicProfileEnabled={!!property.owner?.publicProfileEnabled}
                  ownerPublicSlug={property.owner?.publicSlug || null}
                  allowRealtorBoard={property.allowRealtorBoard || false}
                />

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
                        <a href={`/financing/${property.id}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-4 py-2 glass-teal text-white rounded-lg font-medium hover:opacity-90 transition-opacity">Ver opções de bancos →</a>
                        <p className="text-xs text-gray-500 text-center">*Simulação aproximada. Consulte seu banco.</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          
          {/* Seções Nearby/Similar já estão acima, após Google Maps */}
        </div>
        </motion.div>
      {/* Lightbox de fotos em modo feed (1 grande + 2 menores) */}
      {showAllPhotos && photoViewMode === "feed" && property && (
        <div className="fixed inset-0 z-[13000] bg-black/80 flex items-center justify-center" onClick={() => { setShowAllPhotos(false); setPhotoViewMode(null); }}>
          <div
            className="relative w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Fotos do imvel</span>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => { setShowAllPhotos(false); setPhotoViewMode(null); }}
                className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {(() => {
                  const groups: { main: number; thumbs: number[] }[] = [];
                  const total = property.images.length;
                  for (let i = 0; i < total; i += 3) {
                    const main = i;
                    const thumbs: number[] = [];
                    if (i + 1 < total) thumbs.push(i + 1);
                    if (i + 2 < total) thumbs.push(i + 2);
                    groups.push({ main, thumbs });
                  }
                  return groups.map((g, idx) => (
                    <div key={idx} className="space-y-2">
                      <div
                        className="relative w-full aspect-[16/9] rounded-xl overflow-hidden cursor-pointer"
                        onClick={() => { setCurrentImageIndex(g.main); setPhotoViewMode("fullscreen"); }}
                      >
                        <Image
                          src={transformCloudinary(property.images[g.main]?.url || "/placeholder.jpg", "f_auto,q_auto:good,dpr_auto,w_1920,h_1080,c_fill,g_auto")}
                          alt={`${property.title} ${g.main + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 60vw"
                        />
                      </div>
                      {g.thumbs.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {g.thumbs.map((ti) => (
                            <div
                              key={ti}
                              className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer"
                              onClick={() => { setCurrentImageIndex(ti); setPhotoViewMode("fullscreen"); }}
                            >
                              <Image
                                src={transformCloudinary(property.images[ti]?.url || "/placeholder.jpg", "f_auto,q_auto:good,dpr_auto,w_1200,h_900,c_fill,g_auto")}
                                alt={`${property.title} ${ti + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 50vw, 30vw"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
              <div className="hidden md:block w-[320px] border-l border-gray-100 bg-gray-50 px-4 py-5 space-y-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Preo</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {typeof property.price === "number" && property.price > 0
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(property.price / 100)
                      : "Sob consulta"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">{property.title}</div>
                  <div className="text-xs text-gray-600">
                    {property.neighborhood && `${property.neighborhood}, `}
                    {property.city}, {property.state}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContactOverlayOpen(true)}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                >
                  Entrar em contato
                </button>
                <button
                  type="button"
                  onClick={handleFavorite}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-teal-500 text-teal-500" : "text-gray-700"}`} />
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </button>
                <div className="text-xs text-gray-500">
                  {currentImageIndex + 1} de {property.images.length} fotos
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Full-screen Lightbox (no header, thumbnails below) */}
      {photoViewMode === "fullscreen" && property && (
        <>
          {/* Backdrop above any header */}
          <div className="fixed inset-0 bg-black/95 z-[30000]" onClick={() => { setPhotoViewMode("feed"); }} />
          <div className="fixed inset-0 z-[30001] flex flex-col items-center justify-center select-none">
            {/* Top bar with actions */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPhotoViewMode("feed")}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar às fotos</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setContactOverlayOpen(true)}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow"
                >
                  <span>Entrar em contato</span>
                </button>
                <button
                  type="button"
                  onClick={handleFavorite}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-teal-400 text-teal-400" : "text-white"}`} />
                  <span className="hidden sm:inline">Salvar</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Compartilhar</span>
                </button>
              </div>
            </div>

            {/* Main image */}
            <div
              className="relative w-[92vw] max-w-6xl aspect-[16/9] bg-black/40 rounded-lg overflow-hidden touch-pan-y"
              onWheel={(e) => {
                // Desktop zoom com scroll
                e.preventDefault();
                const delta = -e.deltaY;
                const factor = delta > 0 ? 1.08 : 0.92;
                setZoom((z) => Math.max(1, Math.min(4, z * factor)));
              }}
              onMouseDown={(e) => {
                if (zoom <= 1) return;
                panRef.current = { down: true, x: e.clientX, y: e.clientY };
              }}
              onMouseMove={(e) => {
                if (!panRef.current.down || zoom <= 1) return;
                const dx = e.clientX - panRef.current.x;
                const dy = e.clientY - panRef.current.y;
                panRef.current.x = e.clientX; panRef.current.y = e.clientY;
                setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
              }}
              onMouseUp={() => { panRef.current.down = false; }}
              onMouseLeave={() => { panRef.current.down = false; }}
              onTouchStart={(e) => {
                if (e.touches.length === 2) {
                  const [t1, t2] = [e.touches[0], e.touches[1]];
                  const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY;
                  const dist = Math.hypot(dx, dy);
                  pinchRef.current = { active: true, startDist: dist, startZoom: zoom, cx: (t1.clientX + t2.clientX) / 2, cy: (t1.clientY + t2.clientY) / 2 };
                } else if (e.touches.length === 1 && zoom > 1) {
                  panRef.current = { down: true, x: e.touches[0].clientX, y: e.touches[0].clientY };
                } else if (e.touches.length === 1 && zoom === 1) {
                  // iniciar swipe para trocar foto
                  lbStartX.current = e.touches[0].clientX;
                  lbLastX.current = e.touches[0].clientX;
                  lbMoved.current = false;
                }
              }}
              onTouchMove={(e) => {
                if (pinchRef.current.active && e.touches.length === 2) {
                  const [t1, t2] = [e.touches[0], e.touches[1]];
                  const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY;
                  const dist = Math.hypot(dx, dy);
                  const ratio = dist / Math.max(1, pinchRef.current.startDist);
                  setZoom(() => Math.max(1, Math.min(4, pinchRef.current.startZoom * ratio)));
                  e.preventDefault();
                } else if (panRef.current.down && e.touches.length === 1 && zoom > 1) {
                  const t = e.touches[0];
                  const dx = t.clientX - panRef.current.x; const dy = t.clientY - panRef.current.y;
                  panRef.current.x = t.clientX; panRef.current.y = t.clientY;
                  setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
                  e.preventDefault();
                } else if (e.touches.length === 1 && zoom === 1 && lbStartX.current != null) {
                  const x = e.touches[0].clientX;
                  lbLastX.current = x;
                  lbMoved.current = true;
                }
              }}
              onTouchEnd={() => {
                if (zoom === 1 && lbStartX.current != null && lbLastX.current != null && lbMoved.current) {
                  const dx = lbLastX.current - lbStartX.current;
                  const threshold = 60;
                  if (dx <= -threshold) nextImage();
                  else if (dx >= threshold) prevImage();
                }
                lbStartX.current = null; lbLastX.current = null; lbMoved.current = false;
                pinchRef.current.active = false; panRef.current.down = false;
              }}
            >
              <div className="absolute inset-0" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: 'center center' }}>
                <Image
                  src={property!.images[currentImageIndex]?.url || "/placeholder.jpg"}
                  alt={`${property!.title} - foto ${currentImageIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1536px) 92vw, 1200px"
                  priority
                />
              </div>
              {/* Prev/Next */}
              <button
                aria-label="Anterior"
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                aria-label="Próxima"
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              {/* Indicators and grid trigger */}
              <div className="absolute top-3 left-3 text-white/90 text-sm bg-black/40 rounded-md px-2 py-1">
                {currentImageIndex + 1} / {property!.images.length}
              </div>
              <button
                aria-label="Abrir grade de miniaturas"
                onClick={(e) => { e.stopPropagation(); setShowThumbGrid(true); }}
                className="absolute top-3 right-3 w-9 h-9 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                …
              </button>
            </div>

            {/* Thumbnails carousel (previews of upcoming photos) */}
            <div className="mt-4 w-[92vw] max-w-6xl">
              {(() => {
                const total = property!.images.length;
                // Responsive thumbnails per page
                // update on mount and resize
                // note: hook-safe inline effect below
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        aria-label="Anterior"
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((currentImageIndex - 1 + total) % total); }}
                        className="hidden sm:flex w-9 h-9 rounded-full border border-white/20 text-white/90 hover:bg-white/10 items-center justify-center"
                      >
                        ‹
                      </button>
                      <div className="flex items-center gap-2 mx-auto">
                        {Array.from({ length: Math.min(thumbsPerPage, total) }).map((_, idx) => {
                          const i = (currentImageIndex + idx) % total; // upcoming sequence
                          const img = property!.images[i];
                          const isActive = i === currentImageIndex;
                          return (
                            <button
                              key={`thumb-${i}`}
                              onClick={() => setCurrentImageIndex(i)}
                              className={`relative w-24 h-16 rounded-md overflow-hidden ring-2 transition-all ${isActive ? 'ring-white' : 'ring-transparent hover:ring-white/60'}`}
                            >
                              <Image
                                src={img.url}
                                alt={`thumb ${i + 1}`}
                                fill
                                className="object-cover"
                                sizes="96px"
                              />
                            </button>
                          );
                        })}
                      </div>
                      <button
                        aria-label="Próximo"
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((currentImageIndex + 1) % total); }}
                        className="hidden sm:flex w-9 h-9 rounded-full border border-white/20 text-white/90 hover:bg-white/10 items-center justify-center"
                      >
                        ›
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}
      {/* Grid de miniaturas em overlay */}
      {showAllPhotos && showThumbGrid && property && (
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
                {property.images.map((img, i) => (
                  <button
                    key={`grid-${i}`}
                    onClick={() => { setCurrentImageIndex(i); setShowThumbGrid(false); }}
                    className={`relative w-full pt-[66%] rounded-md overflow-hidden ring-2 ${i === currentImageIndex ? 'ring-teal-500' : 'ring-transparent hover:ring-teal-300'}`}
                  >
                    <Image src={img.url} alt={`grid ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      {/* Overlay dedicado de contato (abre a partir das fotos) */}
      {contactOverlayOpen && property && (
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
              ownerPhone={property.owner?.phone || undefined}
              ownerPublicProfileEnabled={!!property.owner?.publicProfileEnabled}
              ownerPublicSlug={property.owner?.publicSlug || null}
              allowRealtorBoard={property.allowRealtorBoard || false}
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
