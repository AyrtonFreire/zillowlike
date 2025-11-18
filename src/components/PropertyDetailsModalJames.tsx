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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
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
    fetch(`/api/properties?id=${propertyId}`)
      .then(res => res.json())
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
        }
      })
      .catch(console.error)
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
      setShowMore(false);
    }
  }, [open]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[12000] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
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

        {/* Gallery Mosaic */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[400px] md:h-[500px]">
            {/* Main large image */}
            <div className="relative rounded-lg overflow-hidden col-span-1 cursor-pointer">
              <Image
                src={displayImages[0]?.url ? transformCloudinary(displayImages[0].url, "f_auto,q_auto:good,dpr_auto,w_1920,h_1080,c_fill,g_auto") : "/placeholder.jpg"}
                alt={property.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                onClick={() => setShowAllPhotos(true)}
              />
            </div>
            {/* 4 smaller images */}
            <div className="hidden md:grid grid-cols-2 gap-2">
              {displayImages.slice(1, 5).map((img, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden cursor-pointer" onClick={() => setShowAllPhotos(true)}>
                  <Image
                    src={transformCloudinary(img.url, "f_auto,q_auto:good,dpr_auto,w_800,h_600,c_fill,g_auto")}
                    alt={`${property.title} ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />
                  {i === 3 && property.images.length > 5 && (
                    <button
                      onClick={() => setShowAllPhotos(true)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium hover:bg-black/60 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">📷</span>
                        Show all photos
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
      {/* Lightbox de fotos */}
      {showAllPhotos && (
        <div className="fixed inset-0 z-[13000] bg-black/90 flex items-center justify-center" onClick={() => setShowAllPhotos(false)}>
          <button
            type="button"
            aria-label="Fechar"
            onClick={(e) => { e.stopPropagation(); setShowAllPhotos(false); }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 w-10 h-10 rounded-full border border-white/20 text-white/90 hover:text-white hover:bg-white/10 flex items-center justify-center z-[13010] pointer-events-auto"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Anterior"
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute left-4 md:left-8 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-900 flex items-center justify-center z-[13010] pointer-events-auto"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute right-4 md:right-8 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-900 flex items-center justify-center z-[13010] pointer-events-auto"
          >
            ›
          </button>
          <div
            className="relative w-[92vw] md:w-[80vw] lg:w-[70vw] aspect-[16/10]"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              e.stopPropagation();
              lbStartX.current = e.touches[0].clientX;
              lbLastX.current = e.touches[0].clientX;
              lbMoved.current = false;
            }}
            onTouchMove={(e) => {
              if (lbStartX.current == null) return;
              const x = e.touches[0].clientX;
              lbLastX.current = x;
              lbMoved.current = true;
              const diff = x - lbStartX.current;
              if (!property?.images || property.images.length <= 1) {
                const elastic = Math.max(-28, Math.min(28, diff * 0.25));
                setLbDragOffset(elastic);
                e.stopPropagation();
                e.preventDefault();
              }
            }}
            onTouchEnd={(e) => {
              const count = property?.images?.length || 0;
              if (count <= 1) {
                setLbDragOffset(0);
              } else if (lbStartX.current != null && lbLastX.current != null && lbMoved.current) {
                const dx = lbLastX.current - lbStartX.current;
                const threshold = 60;
                if (dx <= -threshold) { e.stopPropagation(); nextImage(); }
                else if (dx >= threshold) { e.stopPropagation(); prevImage(); }
              }
              lbStartX.current = null;
              lbLastX.current = null;
              lbMoved.current = false;
            }}
          >
            <div className="absolute inset-0" style={{ transform: `translateX(${lbDragOffset}px)` }}>
            <Image
              src={transformCloudinary(property.images[currentImageIndex]?.url || "/placeholder.jpg", "f_auto,q_auto:good,dpr_auto,w_1920,h_1080,c_fill,g_center")}
              alt={`${property.title} ${currentImageIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
            />
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Full-screen Lightbox (no header, thumbnails below) */}
      {showAllPhotos && property && (
        <>
          {/* Backdrop above any header */}
          <div className="fixed inset-0 bg-black/95 z-[30000]" onClick={() => setShowAllPhotos(false)} />
          <div className="fixed inset-0 z-[30001] flex flex-col items-center justify-center select-none">
            {/* Close button */}
            <button
              aria-label="Fechar galeria"
              onClick={() => setShowAllPhotos(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main image */}
            <div className="relative w-[92vw] max-w-6xl aspect-[16/9] bg-black/40 rounded-lg overflow-hidden">
              <Image
                src={property!.images[currentImageIndex]?.url || "/placeholder.jpg"}
                alt={`${property!.title} - foto ${currentImageIndex + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 1536px) 92vw, 1200px"
                priority
              />
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
            </div>

            {/* Thumbnails strip */}
            <div className="mt-4 w-[92vw] max-w-6xl overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 pb-1">
                {property!.images.map((img, i) => (
                  <button
                    key={`thumb-${i}`}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`relative shrink-0 w-24 h-16 rounded-md overflow-hidden ring-2 transition-all ${i === currentImageIndex ? 'ring-white' : 'ring-transparent hover:ring-white/60'}`}
                  >
                    <Image
                      src={img.url}
                      alt={`thumb ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
