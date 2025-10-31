"use client";

import { useEffect, useState } from "react";
import { X, Share2, Heart, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);
  const [similarProperties, setSimilarProperties] = useState<any[]>([]);

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
            fetch(`/api/properties?lat=${data.item.latitude}&lng=${data.item.longitude}&radius=5&limit=8&exclude=${propertyId}`)
              .then(r => r.json())
              .then(d => setNearbyProperties(d.items || []))
              .catch(() => {});
          }
          if (data.item.type) {
            fetch(`/api/properties?type=${data.item.type}&limit=8&exclude=${propertyId}`)
              .then(r => r.json())
              .then(d => setSimilarProperties(d.items || []))
              .catch(() => {});
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [propertyId, open]);

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
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: open ? 0 : "100%" }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full md:w-[85%] lg:w-[75%] xl:w-[70%] bg-white z-50 overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
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
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
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
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-2xl font-display font-normal text-gray-900 mb-4">
                  Sobre o Imóvel
                </h3>
                <div className="text-gray-700 leading-relaxed">
                  <p>{showMore ? property.description : truncatedDescription}</p>
                  {property.description.length > 400 && (
                    <button
                      onClick={() => setShowMore(!showMore)}
                      className="text-blue-600 hover:text-blue-800 font-medium mt-2 inline-flex items-center gap-1"
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

              {/* Features */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-2xl font-display font-normal text-gray-900 mb-4">Características</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.furnished && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🛋️</span>
                      <span className="text-gray-700">Mobiliado</span>
                    </div>
                  )}
                  {property.petFriendly && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🐾</span>
                      <span className="text-gray-700">Aceita Pets</span>
                    </div>
                  )}
                  {property.parkingSpots != null && property.parkingSpots > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🚗</span>
                      <span className="text-gray-700">Estacionamento</span>
                    </div>
                  )}
                  {/* Adicionar mais features conforme disponíveis na API */}
                  {(property as any).hasElevator && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🛗</span>
                      <span className="text-gray-700">Elevador</span>
                    </div>
                  )}
                  {(property as any).hasBalcony && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏡</span>
                      <span className="text-gray-700">Varanda</span>
                    </div>
                  )}
                  {(property as any).hasPool && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏊</span>
                      <span className="text-gray-700">Piscina</span>
                    </div>
                  )}
                  {(property as any).hasGym && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏋️</span>
                      <span className="text-gray-700">Academia</span>
                    </div>
                  )}
                  {(property as any).hasGourmet && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👨‍🍳</span>
                      <span className="text-gray-700">Espaço Gourmet</span>
                    </div>
                  )}
                  {(property as any).hasPlayground && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎠</span>
                      <span className="text-gray-700">Playground</span>
                    </div>
                  )}
                  {(property as any).hasPartyRoom && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎉</span>
                      <span className="text-gray-700">Salão de Festas</span>
                    </div>
                  )}
                  {(property as any).hasConcierge24h && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👨‍💼</span>
                      <span className="text-gray-700">Portaria 24h</span>
                    </div>
                  )}
                  {(property as any).comfortAC && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">❄️</span>
                      <span className="text-gray-700">Ar Condicionado</span>
                    </div>
                  )}
                  {(property as any).comfortHeating && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔥</span>
                      <span className="text-gray-700">Aquecimento</span>
                    </div>
                  )}
                  {(property as any).comfortSolar && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">☀️</span>
                      <span className="text-gray-700">Energia Solar</span>
                    </div>
                  )}
                  {(property as any).secCCTV && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📹</span>
                      <span className="text-gray-700">CFTV</span>
                    </div>
                  )}
                  {(property as any).secElectricFence && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      <span className="text-gray-700">Cerca Elétrica</span>
                    </div>
                  )}
                  {(property as any).viewSea && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌊</span>
                      <span className="text-gray-700">Vista para o Mar</span>
                    </div>
                  )}
                  {(property as any).viewCity && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌆</span>
                      <span className="text-gray-700">Vista para Cidade</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Explore the Area */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-2xl font-display font-normal text-gray-900 mb-4">Explore a Região</h3>
                <div className="text-gray-700 mb-4">
                  {property.street}, {property.city}, {property.state}
                </div>
                
                {/* Mapa com POIs */}
                {(property as any).latitude && (property as any).longitude && (
                  <div className="mb-4 h-[300px] rounded-lg overflow-hidden border border-gray-200">
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
                    />
                  </div>
                )}
                
                {/* Locais próximos */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-lg">🏫</span>
                    <span>Escolas próximas</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-lg">🛒</span>
                    <span>Supermercados</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-lg">💊</span>
                    <span>Farmácias</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-lg">🍽️</span>
                    <span>Restaurantes</span>
                  </div>
                </div>
                
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.street}, ${property.city}, ${property.state}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver no Google Maps →
                </a>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Agent Card */}
                <div className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      Z
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">Zillowlike Imóveis</h4>
                      <p className="text-sm text-gray-600">Parceiro verificado</p>
                    </div>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium mb-2">
                    📞 Mostrar telefone
                  </button>
                  <div className="space-y-3 mt-4">
                    <input
                      type="text"
                      placeholder="Nome"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="E-mail"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>+55</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="Telefone (opcional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <textarea
                      rows={4}
                      placeholder={`Tenho interesse em\n${property.title}`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <Button className="w-full bg-teal-600 hover:bg-teal-700">
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
                <div className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Zillowlike Imóveis</h4>
                      <p className="text-xs text-gray-600">300 imóveis à venda</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Imóveis Próximos */}
          {nearbyProperties.length > 0 && (
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-2xl font-display font-normal text-gray-900 mb-6 px-4 sm:px-6 lg:px-8">Imóveis Próximos</h3>
              <SimilarCarousel properties={nearbyProperties} />
            </div>
          )}
          
          {/* Imóveis Similares */}
          {similarProperties.length > 0 && (
            <div className="border-t border-gray-200 pt-8 pb-8">
              <h3 className="text-2xl font-display font-normal text-gray-900 mb-6 px-4 sm:px-6 lg:px-8">Imóveis Similares</h3>
              <SimilarCarousel properties={similarProperties} />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
