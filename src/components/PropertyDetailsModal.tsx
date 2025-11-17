"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { X, Heart, Share2, MapPin, Bed, Bath, Maximize2, Car, Calendar, Phone, MessageCircle, ChevronLeft, ChevronRight, Home, Sparkles, Check, School, Pill, ShoppingCart, UtensilsCrossed, Landmark, Fuel, Dumbbell, Trees, Hospital, Stethoscope } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getLowestFinancing } from "@/lib/financing";
import PropertyGrid from "./PropertyGrid";
import type { ApiProperty } from "@/types/api";

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
  neighborhood: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  suites?: number;
  parkingSpots?: number;
  furnished?: boolean;
  petFriendly?: boolean;
  condoFee?: number;
  yearBuilt?: number;
  images: { url: string }[];
};

type LightboxImageContainerProps = {
  count: number;
  onNext: () => void;
  onPrev: () => void;
  children: React.ReactNode;
};

const LightboxImageContainer = ({ count, onNext, onPrev, children }: LightboxImageContainerProps) => {
  const startX = useRef<number | null>(null);
  const lastX = useRef<number | null>(null);
  const moved = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    startX.current = e.touches[0].clientX;
    lastX.current = e.touches[0].clientX;
    moved.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const x = e.touches[0].clientX;
    lastX.current = x;
    moved.current = true;
    const diff = x - startX.current; // >0: arrasta para direita
    if (count <= 1) {
      // resistência elástica quando há 1 imagem
      const elastic = Math.max(-28, Math.min(28, diff * 0.25));
      setDragOffset(elastic);
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (count <= 1) {
      setDragOffset(0);
    } else if (startX.current != null && lastX.current != null && moved.current) {
      const dx = lastX.current - startX.current;
      const threshold = 60;
      if (dx <= -threshold) {
        e.stopPropagation();
        onNext();
      } else if (dx >= threshold) {
        e.stopPropagation();
        onPrev();
      }
    }
    startX.current = null;
    lastX.current = null;
    moved.current = false;
  };

  return (
    <div
      className="relative w-full h-full max-w-6xl max-h-[80vh] mx-auto"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0" style={{ transform: `translateX(${dragOffset}px)` }}>
        {children}
      </div>
    </div>
  );
};

export default function PropertyDetailsModal({ propertyId, open, onClose }: PropertyDetailsModalProps) {
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showFullscreenGallery, setShowFullscreenGallery] = useState(false);
  const [nearbyProperties, setNearbyProperties] = useState<ApiProperty[]>([]);
  const [similarProperties, setSimilarProperties] = useState<ApiProperty[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<{ schools: any[]; markets: any[]; pharmacies: any[]; restaurants: any[]; hospitals: any[]; clinics: any[]; parks: any[]; gyms: any[]; fuel: any[]; bakeries: any[]; banks: any[] }>({ schools: [], markets: [], pharmacies: [], restaurants: [], hospitals: [], clinics: [], parks: [], gyms: [], fuel: [], bakeries: [], banks: [] });
  const [poiLoading, setPoiLoading] = useState(false);

  const poiCategories = useMemo(() => ([
    { key: 'schools', label: 'Escolas', Icon: School, items: nearbyPlaces.schools, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'pharmacies', label: 'Farmácias', Icon: Pill, items: nearbyPlaces.pharmacies, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'markets', label: 'Supermercados', Icon: ShoppingCart, items: nearbyPlaces.markets, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'restaurants', label: 'Restaurantes', Icon: UtensilsCrossed, items: nearbyPlaces.restaurants, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'banks', label: 'Bancos', Icon: Landmark, items: nearbyPlaces.banks, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'fuel', label: 'Postos', Icon: Fuel, items: nearbyPlaces.fuel, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'gyms', label: 'Academias', Icon: Dumbbell, items: nearbyPlaces.gyms, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'parks', label: 'Parques', Icon: Trees, items: nearbyPlaces.parks, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'bakeries', label: 'Padarias', Icon: ShoppingCart, items: nearbyPlaces.bakeries, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'hospitals', label: 'Hospitais', Icon: Hospital, items: nearbyPlaces.hospitals, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
    { key: 'clinics', label: 'Clínicas', Icon: Stethoscope, items: nearbyPlaces.clinics, color: 'from-gray-200 to-gray-300', iconBg: 'bg-gray-50', iconColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
  ]), [nearbyPlaces]);

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

  // Fetch com AbortController para cancelar requisições anteriores
  useEffect(() => {
    if (!open || !propertyId) {
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    
    fetch(`/api/properties?id=${propertyId}`, { signal: abortController.signal })
      .then(res => res.json())
      .then(data => {
        if (data.item && !abortController.signal.aborted) {
          setProperty(data.item);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [propertyId, open]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setCurrentImageIndex(0);
      setNearbyProperties([]);
      setSimilarProperties([]);
    }
  }, [open]);

  // Carregar imóveis próximos e parecidos
  useEffect(() => {
    if (!propertyId || !open) return;

    // Carregar imóveis próximos
    fetch(`/api/properties/nearby?id=${propertyId}&limit=8`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.properties) {
          setNearbyProperties(data.properties);
        }
      })
      .catch(console.error);

    // Carregar imóveis parecidos
    fetch(`/api/properties/similar?id=${propertyId}&limit=8`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.properties) {
          setSimilarProperties(data.properties);
        }
      })
      .catch(console.error);

    // Carregar favoritos do usuário
    fetch('/api/favorites')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.favorites) {
          setFavorites(data.favorites);
        }
      })
      .catch(console.error);
  }, [propertyId, open]);

  // Memoizar handlers para evitar re-renders
  const handlePrevImage = useCallback(() => {
    if (!property) return;
    setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
  }, [property]);

  const handleNextImage = useCallback(() => {
    if (!property) return;
    setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
  }, [property]);

  // Toggle favorito
  const handleFavoriteToggle = useCallback(async (id: string) => {
    try {
      const method = favorites.includes(id) ? 'DELETE' : 'POST';
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id })
      });

      if (res.ok) {
        setFavorites(prev => 
          method === 'POST' 
            ? [...prev, id]
            : prev.filter(fid => fid !== id)
        );
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [favorites]);

  const handleToggleFavorite = useCallback(() => {
    setIsFavorite(prev => !prev);
  }, []);

  // Memoizar formatação de preço
  const formattedPrice = useMemo(() => {
    if (!property) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(property.price / 100);
  }, [property]);

  // Memoizar cálculo de financiamento usando taxas reais dos bancos
  const financing = useMemo(() => {
    if (!property) return null;
    const propertyValue = property.price / 100; // Valor em reais
    return getLowestFinancing(propertyValue);
  }, [property]);

  const monthlyPayment = financing?.calculation.monthlyPayment || 0;
  const bankName = financing?.bank.name || "Caixa Econômica Federal";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[12001] overflow-hidden">
      {/* Backdrop Escuro Sólido */}
      <div 
        className="absolute inset-0 bg-black/80 transition-opacity duration-300 z-[12000]"
        onClick={onClose}
      />

      {/* Modal Container - Mais Estreito */}
      <div className="absolute inset-0 overflow-y-auto z-[12001]" onClick={onClose}>
        <div className="min-h-full flex items-start justify-center p-0 md:p-8 md:py-12">
          <div 
            className="relative w-full max-w-6xl bg-white md:rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Estilo Zillow - Barra Superior */}
            <div className="absolute top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-4 md:px-6 py-3">
                {/* Lado Esquerdo - Voltar + Logo */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={onClose}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                    aria-label="Voltar"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm font-medium">Voltar</span>
                  </button>
                  
                  {/* Logo/Brand */}
                  <div className="hidden md:flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Home className="w-5 h-5 text-blue-600" />
                      <span className="text-lg font-bold text-gray-900">Zillowlike</span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito - Ações */}
                <div className="flex items-center gap-2">
                  {/* Salvar */}
                  <button
                    onClick={handleToggleFavorite}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all ${
                      isFavorite
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                    title={isFavorite ? "Remover dos favoritos" : "Salvar imóvel"}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline text-sm font-medium">
                      {isFavorite ? 'Salvo' : 'Salvar'}
                    </span>
                  </button>
                  
                  {/* Compartilhar */}
                  <button 
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                    title="Compartilhar imóvel"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">Compartilhar</span>
                  </button>
                  
                  {/* Menu Mais Opções */}
                  <button 
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                    title="Mais opções"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                    <span className="hidden lg:inline text-sm font-medium">Mais</span>
                  </button>
                  
                  {/* Fechar (X) */}
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all md:hidden"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="animate-pulse pt-[57px]">
                {/* Skeleton da Imagem */}
                <div className="aspect-[16/9] max-h-[600px] bg-gray-200"></div>
                <div className="flex gap-2 px-6 py-4 bg-white border-t border-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-20 h-14 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
                {/* Skeleton do Conteúdo */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-6 md:px-8 mt-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="grid grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
                      ))}
                    </div>
                  </div>
                  <div className="lg:col-span-1">
                    <div className="h-64 bg-gray-200 rounded-3xl"></div>
                  </div>
                </div>
              </div>
            ) : property ? (
              <div className="pb-8 pt-[57px]">
                {/* Image Gallery - Estilo Zillow com Grid */}
                <div className="relative bg-white">
                  {/* Grid Layout: Principal + Miniaturas */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 md:h-[450px]">
                    
                    {/* Imagem Principal com Carrossel - Ocupa 3 colunas */}
                    <div 
                      className="md:col-span-3 relative h-[300px] md:h-[450px] rounded-xl overflow-hidden group bg-gray-100"
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                    >
                      {/* Imagem Principal */}
                      <div 
                        className="relative w-full h-full cursor-pointer"
                        onClick={() => setShowFullscreenGallery(true)}
                      >
                        {property.images[currentImageIndex] && (
                          <Image
                            src={transformCloudinary(property.images[currentImageIndex].url, "f_auto,q_auto:good,dpr_auto,w_1920,h_1080,c_fill,g_auto")}
                            alt={`${property.title} - ${currentImageIndex + 1}`}
                            fill
                            className="object-cover transition-opacity duration-300"
                            priority={currentImageIndex === 0}
                            quality={90}
                            sizes="(max-width: 768px) 100vw, 75vw"
                          />
                        )}
                      </div>

                      {/* Setas de Navegação - Aparecem no Hover */}
                      {property.images.length > 1 && isHovering && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevImage();
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full shadow-lg transition-all hover:scale-110 z-20"
                            aria-label="Imagem anterior"
                          >
                            <ChevronLeft className="w-5 h-5 text-gray-800" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextImage();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full shadow-lg transition-all hover:scale-110 z-20"
                            aria-label="Próxima imagem"
                          >
                            <ChevronRight className="w-5 h-5 text-gray-800" />
                          </button>
                        </>
                      )}
                      
                      {/* Contador de Fotos - Canto Inferior Direito */}
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/95 backdrop-blur-md text-gray-800 rounded-lg text-sm font-semibold shadow-lg flex items-center gap-2 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {currentImageIndex + 1} / {property.images.length}
                      </div>
                    </div>

                    {/* Grid de Miniaturas - 1 coluna à direita */}
                    <div className="hidden md:grid grid-rows-2 gap-2">
                      {/* Segunda Foto */}
                      {property.images[1] && (
                        <div className="relative rounded-xl overflow-hidden group cursor-pointer bg-gray-100">
                          <Image
                            src={transformCloudinary(property.images[1].url, "f_auto,q_auto:good,dpr_auto,w_800,h_600,c_fill,g_auto")}
                            alt={`${property.title} - 2`}
                            fill
                            className="object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-500"
                            quality={75}
                            sizes="25vw"
                            onClick={() => setCurrentImageIndex(1)}
                          />
                        </div>
                      )}

                      {/* Terceira Foto ou Overlay "Ver todas" */}
                      {property.images[2] && (
                        <div 
                          className="relative rounded-xl overflow-hidden group cursor-pointer bg-gray-100"
                          onClick={() => setCurrentImageIndex(3)}
                        >
                          <Image
                            src={transformCloudinary(property.images[2].url, "f_auto,q_auto:good,dpr_auto,w_800,h_600,c_fill,g_auto")}
                            alt={`${property.title} - 3`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            quality={75}
                            sizes="25vw"
                          />
                          
                          {/* Overlay "Ver todas as fotos" se houver mais de 3 */}
                          {property.images.length > 3 && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white group-hover:bg-black/70 transition-colors pointer-events-none">
                              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-semibold">+{property.images.length - 3} fotos</span>
                              <span className="text-xs mt-1 opacity-90">Ver todas</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thumbnails Horizontais - Abaixo do Grid */}
                  <div className="px-4 py-3 border-t border-gray-200">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {property.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all ${
                            idx === currentImageIndex
                              ? 'ring-2 ring-blue-500 scale-105 shadow-md'
                              : 'opacity-60 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          <Image
                            src={transformCloudinary(img.url, "f_auto,q_auto:eco,dpr_auto,w_320,h_180,c_fill,g_auto")}
                            alt={`${property.title} - ${idx + 1}`}
                            fill
                            className="object-cover"
                            quality={50}
                            sizes="64px"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modal de Carrossel Completo (fullscreen) */}
                  {(() => {
                    // Handlers para swipe no lightbox com resistência em 1 imagem
                    // Mantidos fora do JSX condicional para garantir ordem de hooks
                    return null;
                  })()}
                  {showFullscreenGallery && (
                    <div className="fixed inset-0 z-[13000] bg-black/95 flex items-center justify-center" onClick={() => setShowFullscreenGallery(false)}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowFullscreenGallery(false); }}
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all"
                        aria-label="Fechar"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>

                      {/* Touch state/handlers */}
                      {/* Hooks */}
                      {/* eslint-disable react-hooks/rules-of-hooks */}
                      {(() => {
                        // simple inline state for touch handling
                        // These refs/states are recreated each render, sufficient for gesture handling
                        // If needed later, promote to top-level hooks
                        return null;
                      })()}

                      {/* Handlers */}
                      {/* We'll attach handlers directly below via inline functions and state held with useRef/useState at top of file */}

                      {/* Imagem Grande */}
                      <LightboxImageContainer
                        count={property.images.length}
                        onPrev={handlePrevImage}
                        onNext={handleNextImage}
                      >
                        {property.images[currentImageIndex] && (
                          <Image
                            src={transformCloudinary(property.images[currentImageIndex].url, "f_auto,q_auto:good,dpr_auto,w_1920,h_1080,c_fit,g_auto")}
                            alt={`${property.title} - ${currentImageIndex + 1}`}
                            fill
                            className="object-contain"
                            quality={95}
                            sizes="100vw"
                          />
                        )}
                      </LightboxImageContainer>

                      {/* Setas de Navegação */}
                      {property.images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                            className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all hover:scale-110"
                            aria-label="Imagem anterior"
                          >
                            <ChevronLeft className="w-6 h-6 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                            className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all hover:scale-110"
                            aria-label="Próxima imagem"
                          >
                            <ChevronRight className="w-6 h-6 text-white" />
                          </button>
                        </>
                      )}

                      {/* Contador */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-full text-sm font-medium">
                        {currentImageIndex + 1} / {property.images.length}
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-6 md:px-8 mt-8">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Title and Price */}
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                            {property.title}
                          </h1>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-5 h-5" />
                            <span className="text-lg">
                              {property.street}, {property.neighborhood} - {property.city}/{property.state}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-baseline gap-3">
                        <span className="text-4xl md:text-5xl font-bold text-gray-900">
                          {formattedPrice}
                        </span>
                        {property.condoFee && (
                          <span className="text-lg text-gray-600">
                            + R$ {(property.condoFee / 100).toLocaleString('pt-BR')}/mês condomínio
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats - Elegant Neutral */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {property.bedrooms && (
                        <div className="p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
                          <Bed className="w-5 h-5 text-gray-600 mb-3" />
                          <div className="text-3xl font-bold text-gray-900 mb-1">{property.bedrooms}</div>
                          <div className="text-sm font-medium text-gray-600">Quartos</div>
                        </div>
                      )}
                      
                      {property.bathrooms && (
                        <div className="p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
                          <Bath className="w-5 h-5 text-gray-600 mb-3" />
                          <div className="text-3xl font-bold text-gray-900 mb-1">{property.bathrooms}</div>
                          <div className="text-sm font-medium text-gray-600">Banheiros</div>
                        </div>
                      )}
                      
                      {property.areaM2 && (
                        <div className="p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
                          <Maximize2 className="w-5 h-5 text-gray-600 mb-3" />
                          <div className="text-3xl font-bold text-gray-900 mb-1">{property.areaM2}</div>
                          <div className="text-sm font-medium text-gray-600">m²</div>
                        </div>
                      )}
                      
                      {property.parkingSpots && (
                        <div className="p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
                          <Car className="w-5 h-5 text-gray-600 mb-3" />
                          <div className="text-3xl font-bold text-gray-900 mb-1">{property.parkingSpots}</div>
                          <div className="text-sm font-medium text-gray-600">Vagas</div>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="p-8 bg-gray-50 rounded-xl border border-gray-200">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Sobre este imóvel</h2>
                      <p className="text-gray-700 leading-relaxed text-lg">
                        {property.description}
                      </p>
                    </div>

                    {/* Features */}
                    <div className="p-8 bg-white rounded-xl border border-gray-200">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">Características</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {property.suites && (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                            <Home className="w-5 h-5 text-gray-600" />
                            <span className="text-gray-900 font-medium">{property.suites} Suítes</span>
                          </div>
                        )}
                        {property.furnished !== undefined && (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                            <Home className="w-5 h-5 text-gray-600" />
                            <span className="text-gray-900 font-medium">{property.furnished ? 'Mobiliado' : 'Não mobiliado'}</span>
                          </div>
                        )}
                        {property.petFriendly !== undefined && (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                            <Home className="w-5 h-5 text-gray-600" />
                            <span className="text-gray-900 font-medium">{property.petFriendly ? 'Aceita pets' : 'Não aceita pets'}</span>
                          </div>
                        )}
                        {property.yearBuilt && (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                            <Calendar className="w-5 h-5 text-gray-600" />
                            <span className="text-gray-900 font-medium">Construído em {property.yearBuilt}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Localização</h2>
                      <div className="aspect-video bg-gray-200 rounded-xl overflow-hidden">
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          loading="lazy"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude-0.01},${property.latitude-0.01},${property.longitude+0.01},${property.latitude+0.01}&layer=mapnik&marker=${property.latitude},${property.longitude}`}
                        />
                      </div>
                      {/* Skeleton de POIs */}
                      {poiLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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

                      {(nearbyPlaces.schools.length>0||nearbyPlaces.markets.length>0||nearbyPlaces.pharmacies.length>0||nearbyPlaces.restaurants.length>0||nearbyPlaces.hospitals.length>0||nearbyPlaces.clinics.length>0||nearbyPlaces.parks.length>0||nearbyPlaces.gyms.length>0||nearbyPlaces.fuel.length>0||nearbyPlaces.bakeries.length>0||nearbyPlaces.banks.length>0) && (
                        <div className="mt-6">
                          <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore a Região</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {poiCategories.map(({ key, label, Icon, items }) => {
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
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sidebar - Contact Card Leve e Elegante */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-4">
                      {/* Main CTA Card - Branco com Sombra Suave */}
                      <div className="p-7 bg-white rounded-3xl border border-gray-200/60 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-5 h-5 text-blue-600" />
                          <h3 className="text-xl font-semibold text-gray-900">Interessado?</h3>
                        </div>
                        <p className="text-gray-600 mb-6 text-sm">Entre em contato e agende uma visita</p>
                        
                        <div className="space-y-2.5">
                          <button className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 glass-teal text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md">
                            <Calendar className="w-4 h-4" />
                            Agendar Visita
                          </button>
                          
                          <button className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-medium transition-all">
                            <Phone className="w-4 h-4" />
                            Ligar Agora
                          </button>
                          
                          <button className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-medium transition-all">
                            <MessageCircle className="w-4 h-4" />
                            Enviar Mensagem
                          </button>
                        </div>
                      </div>

                      {/* Financiamento Card */}
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-3xl border border-blue-100">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Home className="w-4 h-4 text-blue-600" />
                          Financiamento
                        </h4>
                        <p className="text-sm text-gray-600 mb-1">
                          Parcelas a partir de
                        </p>
                        <p className="text-2xl font-bold text-blue-600 mb-1">
                          R$ {Math.round(monthlyPayment).toLocaleString('pt-BR')}/mês
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                          {bankName} • Taxa de {financing?.bank.interestRate}% a.a.
                        </p>
                        <Link 
                          href={`/financing/${property.id}`}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline"
                        >
                          Simular financiamento
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>

                      {/* Info Card - Minimalista */}
                      <div className="p-6 bg-white rounded-3xl border border-gray-200/60 shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-4 text-sm">Informações</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Tipo</span>
                            <span className="font-medium text-gray-800">{property.type}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Código</span>
                            <span className="font-medium text-gray-800">#{property.id.slice(0, 8)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Status</span>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                              <Check className="w-3 h-3" />
                              Ativo
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seções de Recomendações */}
                  <div className="pb-8 -mx-6 md:-mx-8 lg:col-span-3">
                    {/* Imóveis Próximos */}
                    {nearbyProperties.length > 0 && (
                      <PropertyGrid
                        title="Imóveis próximos"
                        icon={<MapPin className="w-6 h-6" />}
                        properties={nearbyProperties}
                        onPropertyClick={(id: string) => {
                          // Recarregar modal com novo imóvel
                          setProperty(null);
                          setLoading(true);
                          window.history.pushState({}, '', `?property=${id}`);
                          window.location.reload();
                        }}
                        onFavoriteToggle={handleFavoriteToggle}
                        favorites={favorites}
                      />
                    )}

                    {/* Imóveis Parecidos */}
                    {similarProperties.length > 0 && (
                      <PropertyGrid
                        title="Imóveis parecidos"
                        icon={<Sparkles className="w-6 h-6" />}
                        properties={similarProperties}
                        onPropertyClick={(id: string) => {
                          // Recarregar modal com novo imóvel
                          setProperty(null);
                          setLoading(true);
                          window.history.pushState({}, '', `?property=${id}`);
                          window.location.reload();
                        }}
                        onFavoriteToggle={handleFavoriteToggle}
                        favorites={favorites}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <p className="text-gray-500">Imóvel não encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
