"use client";

import { useEffect, useState } from "react";
import { X, Share2, Heart, MapPin, ChevronLeft, ChevronRight, Car, Home, Wind, Waves, Building2, Dumbbell, UtensilsCrossed, Baby, PartyPopper, ShieldCheck, Snowflake, Flame, Sun, Video, Zap, Eye, ArrowUp, ArrowDown, Accessibility, DoorOpen, Lightbulb, Droplets, Archive, Gem, Compass, Dog, ChevronDown } from "lucide-react";
import Image from "next/image";
import Button from "./ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const SimilarCarousel = dynamic(() => import("@/components/SimilarCarousel"), { ssr: false });

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
  const [nearbyPlaces, setNearbyPlaces] = useState<{ schools: any[]; markets: any[]; pharmacies: any[]; restaurants: any[] }>({ schools: [], markets: [], pharmacies: [], restaurants: [] });
  const [activePOITab, setActivePOITab] = useState<'schools' | 'markets' | 'pharmacies' | 'restaurants'>('schools');

  // Fetch property data
  useEffect(() => {
    if (!open || !propertyId) return;

    setLoading(true);
    fetch(`/api/properties?id=${propertyId}`)
      .then(res => res.json())
      .then(data => {
        if (data.item) {
          setProperty(data.item);
          // Buscar imóveis próximos e similares
          if (data.item.latitude && data.item.longitude) {
            console.log('[PropertyModal] Buscando nearby properties...', { lat: data.item.latitude, lng: data.item.longitude });
            fetch(`/api/properties?lat=${data.item.latitude}&lng=${data.item.longitude}&radius=5&limit=8&exclude=${propertyId}`)
              .then(r => r.json())
              .then(d => {
                console.log('[PropertyModal] Nearby properties encontrados:', d.items?.length || 0);
                setNearbyProperties(d.items || []);
              })
              .catch((err) => {
                console.error('[PropertyModal] Erro ao buscar nearby properties:', err);
              });
          }
          if (data.item.type) {
            console.log('[PropertyModal] Buscando similar properties...', { type: data.item.type });
            fetch(`/api/properties?type=${data.item.type}&limit=8&exclude=${propertyId}`)
              .then(r => r.json())
              .then(d => {
                console.log('[PropertyModal] Similar properties encontrados:', d.items?.length || 0);
                setSimilarProperties(d.items || []);
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

  // Load nearby places (free Overpass API) - otimizado
  useEffect(() => {
    const lat = (property as any)?.latitude;
    const lng = (property as any)?.longitude;
    if (!open || !lat || !lng) return;
    let ignore = false;
    (async () => {
      try {
        const radius = 2000; // 2km - mostrar os mais próximos
        const query = `
          [out:json][timeout:5];
          (
            node(around:${radius},${lat},${lng})[amenity=school];
            node(around:${radius},${lat},${lng})[shop=supermarket];
            node(around:${radius},${lat},${lng})[amenity=pharmacy];
            node(around:${radius},${lat},${lng})[amenity=restaurant];
          );
          out center 20;
        `;
        const res = await fetch('https://overpass-api.de/api/interpreter', { 
          method: 'POST', 
          body: query, 
          headers: { 'Content-Type': 'text/plain' },
          signal: AbortSignal.timeout(8000) // timeout 8s
        });
        if (!res.ok) { 
          console.warn('POIs unavailable'); 
          if (!ignore) setNearbyPlaces({ schools: [], markets: [], pharmacies: [], restaurants: [] });
          return; 
        }
        const data = await res.json();
        const elements: any[] = data.elements || [];
        
        // Filtrar e normalizar: limitar a 3 por categoria, remover "Local" e vazios
        const pick = (filter: (el: any)=>boolean) => {
          const filtered = elements.filter(filter);
          const mapped = filtered.map(el => {
            const name = el.tags?.name || el.tags?.brand || '';
            return { name, lat: el.lat, lng: el.lon };
          });
          // Remover vazios e "Local"
          const cleaned = mapped.filter(p => p.name && p.name.toLowerCase() !== 'local');
          // Dedupe por nome
          const seen = new Set<string>();
          const unique = cleaned.filter(p => {
            if (seen.has(p.name)) return false;
            seen.add(p.name);
            return true;
          });
          // Truncar nomes longos
          return unique.slice(0, 3).map(p => ({
            ...p,
            name: p.name.length > 35 ? p.name.slice(0, 32) + '...' : p.name
          }));
        };
        
        const schools = pick(el => el.tags?.amenity === 'school');
        const markets = pick(el => el.tags?.shop === 'supermarket');
        const pharmacies = pick(el => el.tags?.amenity === 'pharmacy');
        const restaurants = pick(el => el.tags?.amenity === 'restaurant');
        if (!ignore) setNearbyPlaces({ schools, markets, pharmacies, restaurants });
      } catch (err) {
        console.warn('POIs load failed (silent):', err);
        if (!ignore) setNearbyPlaces({ schools: [], markets: [], pharmacies: [], restaurants: [] });
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
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
      {open && <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />}
      <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
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
            <div className="relative rounded-lg overflow-hidden col-span-1">
              <Image
                src={displayImages[0]?.url || "/placeholder.jpg"}
                alt={property.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
            {/* 4 smaller images */}
            <div className="hidden md:grid grid-cols-2 gap-2">
              {displayImages.slice(1, 5).map((img, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden">
                  <Image
                    src={img.url}
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
                    </>
                  );
                })()}
              </div>

              {/* Explore the Area */}
              <div className="pt-4 border-t border-teal/10">
                <h3 className="text-2xl font-display font-normal text-gray-900 mb-2">Explore a Região</h3>
                <p className="text-sm text-gray-600 mb-4">Alguns pontos de interesse perto do imóvel</p>
                <div className="text-gray-700 mb-4">
                  {property.street}, {property.city}, {property.state}
                </div>
                
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
                    />
                  </div>
                )}
                
                {/* Locais próximos - Tabs mobile, Grid desktop */}
                {(nearbyPlaces.schools.length > 0 || nearbyPlaces.markets.length > 0 || nearbyPlaces.pharmacies.length > 0 || nearbyPlaces.restaurants.length > 0) ? (
                  <div className="mb-6">
                    {/* Tabs Mobile */}
                    <div className="flex sm:hidden gap-2 mb-4 overflow-x-auto pb-2">
                      {nearbyPlaces.schools.length > 0 && (
                        <button
                          onClick={() => setActivePOITab('schools')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                            activePOITab === 'schools'
                              ? 'glass-teal text-white'
                              : 'bg-stone-100 text-gray-700 hover:bg-stone-200'
                          }`}
                        >
                          <span>🏫</span>
                          <span>Escolas</span>
                        </button>
                      )}
                      {nearbyPlaces.markets.length > 0 && (
                        <button
                          onClick={() => setActivePOITab('markets')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                            activePOITab === 'markets'
                              ? 'glass-teal text-white'
                              : 'bg-stone-100 text-gray-700 hover:bg-stone-200'
                          }`}
                        >
                          <span>🛒</span>
                          <span>Mercados</span>
                        </button>
                      )}
                      {nearbyPlaces.pharmacies.length > 0 && (
                        <button
                          onClick={() => setActivePOITab('pharmacies')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                            activePOITab === 'pharmacies'
                              ? 'glass-teal text-white'
                              : 'bg-stone-100 text-gray-700 hover:bg-stone-200'
                          }`}
                        >
                          <span>💊</span>
                          <span>Farmácias</span>
                        </button>
                      )}
                      {nearbyPlaces.restaurants.length > 0 && (
                        <button
                          onClick={() => setActivePOITab('restaurants')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                            activePOITab === 'restaurants'
                              ? 'glass-teal text-white'
                              : 'bg-stone-100 text-gray-700 hover:bg-stone-200'
                          }`}
                        >
                          <span>🍽️</span>
                          <span>Restaurantes</span>
                        </button>
                      )}
                    </div>

                    {/* Content Mobile - Single active tab */}
                    <div className="sm:hidden">
                      {activePOITab === 'schools' && nearbyPlaces.schools.length > 0 && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                          <ul className="text-sm text-gray-700 space-y-2">
                            {nearbyPlaces.schools.map((p,i)=>(
                              <li key={`s-${i}`} className="flex items-start gap-2">
                                <span className="text-teal mt-0.5">•</span>
                                <span className="flex-1">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activePOITab === 'markets' && nearbyPlaces.markets.length > 0 && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                          <ul className="text-sm text-gray-700 space-y-2">
                            {nearbyPlaces.markets.map((p,i)=>(
                              <li key={`m-${i}`} className="flex items-start gap-2">
                                <span className="text-teal mt-0.5">•</span>
                                <span className="flex-1">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activePOITab === 'pharmacies' && nearbyPlaces.pharmacies.length > 0 && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                          <ul className="text-sm text-gray-700 space-y-2">
                            {nearbyPlaces.pharmacies.map((p,i)=>(
                              <li key={`p-${i}`} className="flex items-start gap-2">
                                <span className="text-teal mt-0.5">•</span>
                                <span className="flex-1">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activePOITab === 'restaurants' && nearbyPlaces.restaurants.length > 0 && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                          <ul className="text-sm text-gray-700 space-y-2">
                            {nearbyPlaces.restaurants.map((p,i)=>(
                              <li key={`r-${i}`} className="flex items-start gap-2">
                                <span className="text-teal mt-0.5">•</span>
                                <span className="flex-1">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Grid Desktop - Show all */}
                    <div className="hidden sm:grid grid-cols-2 gap-3">
                      {nearbyPlaces.schools.length > 0 && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                            <span className="text-xl">🏫</span>
                            <span className="text-sm">Escolas</span>
                          </div>
                          <ul className="text-sm text-gray-700 space-y-1.5">
                            {nearbyPlaces.schools.map((p,i)=>(
                              <li key={`s-${i}`} className="flex items-start gap-2">
                                <span className="text-teal mt-0.5">•</span>
                                <span className="flex-1">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {nearbyPlaces.markets.length > 0 && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                            <span className="text-xl">🛒</span>
                            <span className="text-sm">Supermercados</span>
                          </div>
                          <ul className="text-sm text-gray-700 space-y-1.5">
                            {nearbyPlaces.markets.map((p,i)=>(
                              <li key={`m-${i}`} className="flex items-start gap-2">
                                <span className="text-teal mt-0.5">•</span>
                                <span className="flex-1">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {nearbyPlaces.pharmacies.length > 0 && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                            <span className="text-xl">💊</span>
                            <span className="text-sm">Farmácias</span>
                          </div>
                          <ul className="text-sm text-gray-700 space-y-1.5">
                            {nearbyPlaces.pharmacies.map((p,i)=>(
                              <li key={`p-${i}`} className="flex items-start gap-2">
                                <span className="text-teal mt-0.5">•</span>
                                <span className="flex-1">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {nearbyPlaces.restaurants.length > 0 && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                            <span className="text-xl">🍽️</span>
                            <span className="text-sm">Restaurantes</span>
                          </div>
                          <ul className="text-sm text-gray-700 space-y-1.5">
                            {nearbyPlaces.restaurants.map((p,i)=>(
                              <li key={`r-${i}`} className="flex items-start gap-2">
                                <span className="text-teal mt-0.5">•</span>
                                <span className="flex-1">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
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

                {/* Nearby homes - Imóveis Próximos */}
                {nearbyProperties.length > 0 ? (
                  <div className="border-t border-teal/10 pt-8 mt-8">
                    <h3 className="text-2xl font-display font-normal text-gray-900 mb-6">Nearby homes</h3>
                    <SimilarCarousel properties={nearbyProperties} />
                  </div>
                ) : (
                  <div className="border-t border-teal/10 pt-8 mt-8 text-center py-4">
                    <p className="text-sm text-gray-500">Buscando imóveis próximos...</p>
                  </div>
                )}

                {/* Similar homes - Imóveis Similares */}
                {similarProperties.length > 0 ? (
                  <div className="border-t border-teal/10 pt-8 mt-8">
                    <h3 className="text-2xl font-display font-normal text-gray-900 mb-6">Similar homes</h3>
                    <SimilarCarousel properties={similarProperties} />
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
                {/* Financing Calculator - Only for SALE properties */}
                {property.purpose === 'SALE' && property.price && property.price > 0 && (
                  <div className="rounded-xl border border-teal/10 p-6 bg-gradient-to-br from-teal/5 to-teal/10 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      💰 Financiamento
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Entrada (20%)</p>
                        <p className="text-lg font-bold text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format((property.price * 0.2) / 100)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Parcela estimada (360x)</p>
                        <p className="text-2xl font-bold text-teal">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(((property.price * 0.8) / 100) / 360)}
                          <span className="text-sm text-gray-600 font-normal">/mês</span>
                        </p>
                      </div>
                      <a
                        href={`/financing/${property.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center px-4 py-2 glass-teal text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                      >
                        Ver opções de bancos →
                      </a>
                      <p className="text-xs text-gray-500 text-center">
                        *Simulação aproximada. Consulte seu banco.
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Form */}
                <div className="rounded-xl border border-teal/10 p-6 bg-white shadow-sm">
                  {/* Financing Card - Clickable - Only for SALE */}
                  {property.purpose === 'SALE' && property.price && property.price > 0 && (
                    <a
                      href={`/financing/${property.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mb-4 rounded-xl border-2 border-teal/20 p-4 bg-gradient-to-br from-teal/5 to-blue/5 hover:from-teal/10 hover:to-blue/10 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">💰 Financiamento</span>
                        <span className="text-teal group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                      <div className="text-2xl font-bold text-teal mb-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(((property.price * 0.8) / 100) / 360)}
                        <span className="text-sm text-gray-600 font-normal">/mês</span>
                      </div>
                      <p className="text-xs text-gray-500">Parcelas em até 360x</p>
                    </a>
                  )}
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="E-mail"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent"
                    />
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent">
                      <option>+55</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="Telefone (opcional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent"
                    />
                    <textarea
                      rows={4}
                      placeholder={`Tenho interesse em\n${property.title}`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent resize-none"
                    />
                    <Button className="w-full glass-teal">
                      Entrar em Contato
                    </Button>
                    <div className="space-y-2 text-xs text-gray-600">
                      <label className="flex items-start gap-2">
                        <input type="checkbox" className="mt-0.5" />
                        <span>Notificar-me por e-mail sobre imóveis similares</span>
                      </label>
                      <label className="flex items-start gap-2">
                        <input type="checkbox" className="mt-0.5" />
                        <span>Concordo com os Termos de Uso e Política de Privacidade</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Agent Listings */}
                <div className="rounded-xl border border-teal/10 p-6 bg-white shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-light to-teal" />
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Zillowlike Imóveis</h4>
                      <p className="text-xs text-gray-600">300 imóveis à venda</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Seções Nearby/Similar já estão acima, após Google Maps */}
        </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
