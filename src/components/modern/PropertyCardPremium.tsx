"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, MapPin, Bed, Bath, Maximize, TrendingUp, Car, Home, ChevronLeft, ChevronRight, Share2, Mail, Link as LinkIcon, X } from "lucide-react";
import Image from "next/image";
import Chip from "@/components/ui/Chip";
import { useState, useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

interface PropertyCardPremiumProps {
  property: {
    id: string;
    title: string;
    price?: number | null;
    images: { url: string }[];
    city: string;
    state: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    isFeatured?: boolean;
    type?: string;
    purpose?: "SALE" | "RENT";
    neighborhood?: string | null;
    parkingSpots?: number | null;
    conditionTags?: string[];
    description?: string;
    media?: { type: 'image' | 'video'; url: string }[];
  };
  onOpenOverlay?: (id: string) => void;
  watermark?: boolean;
}

export default function PropertyCardPremium({ property, onOpenOverlay, watermark }: PropertyCardPremiumProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const shareModalRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchMoved = useRef(false);
  const didSwipe = useRef(false);
  const lastTouchX = useRef<number | null>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareModalRef.current && !shareModalRef.current.contains(event.target as Node)) {
        setShowShareModal(false);
      }
    };

    if (showShareModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareModal]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      setIsFavorite(!isFavorite);
      await fetch('/api/favorites', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId: property.id }) });
    } catch {}
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareModal(!showShareModal);
    try { track({ name: 'filters_open', source: 'mobile' } as any); } catch {}
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/properties/${property.id}`;
    await navigator.clipboard.writeText(url);
    setCopySuccess(true);
    try { track({ name: 'filters_apply', payload: { action: 'copy_link', id: property.id } }); } catch {}
    setTimeout(() => {
      setCopySuccess(false);
      setShowShareModal(false);
    }, 2000);
  };

  const handleGmailShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/properties/${property.id}`;
    const subject = encodeURIComponent(property.title);
    const priceLabel = typeof property.price === 'number' && property.price > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format((property.price as number) / 100)
      : 'Price on Request';
    const body = encodeURIComponent(`Confira este imóvel: ${property.title}\n\nPreço: ${priceLabel}\n\nLocalização: ${property.city}/${property.state}\n\nVeja mais em: ${url}`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
    try { track({ name: 'filters_apply', payload: { action: 'share_gmail', id: property.id } }); } catch {}
  };

  const handleOutlookShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/properties/${property.id}`;
    const subject = encodeURIComponent(property.title);
    const priceLabel = typeof property.price === 'number' && property.price > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format((property.price as number) / 100)
      : 'Price on Request';
    const body = encodeURIComponent(`Confira este imóvel: ${property.title}\n\nPreço: ${priceLabel}\n\nLocalização: ${property.city}/${property.state}\n\nVeja mais em: ${url}`);
    window.open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`, '_blank');
    try { track({ name: 'filters_apply', payload: { action: 'share_outlook', id: property.id } }); } catch {}
  };

  const handleClick = () => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return; // ignore click after swipe
    }
    if (onOpenOverlay) {
      onOpenOverlay(property.id);
    }
  };

  const goNext = () => {
    setCurrentImage((prev) => (prev + 1) % property.images.length);
  };

  const goPrev = () => {
    setCurrentImage((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goNext();
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goPrev();
  };

  // Touch swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchMoved.current = false;
    didSwipe.current = false;
    lastTouchX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current) return;
    const currentTouch = e.touches[0].clientX;
    const diff = touchStartX.current - currentTouch;
    // Threshold menor para melhor responsividade
    if (Math.abs(diff) > 50) {
      e.stopPropagation(); // Prevenir scroll vertical
      didSwipe.current = true;
      if (diff > 0) nextImage(e as any);
      else prevImage(e as any);
      touchStartX.current = null;
    }
  };

  const onTouchEnd = () => {
    if (touchStartX.current == null || lastTouchX.current == null) return;
    const dx = lastTouchX.current - touchStartX.current;
    const threshold = 40;
    if (touchMoved.current) {
      if (dx <= -threshold) {
        goNext();
        didSwipe.current = true;
      } else if (dx >= threshold) {
        goPrev();
        didSwipe.current = true;
      }
    }
    touchStartX.current = null;
    lastTouchX.current = null;
    touchMoved.current = false;
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => {
        try { window.dispatchEvent(new CustomEvent('map-highlight-marker', { detail: { id: property.id } })); } catch {}
      }}
      onMouseLeave={() => {
        try { window.dispatchEvent(new CustomEvent('map-unhighlight-marker')); } catch {}
      }}
      style={{ cursor: 'pointer' }}
      className="h-full"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8 }}
        className="group relative bg-white rounded-2xl shadow-card hover:shadow-cardHover transition-shadow duration-300 cursor-pointer h-full flex flex-col"
        style={{ overflow: showShareModal ? 'visible' : 'hidden' }}
      >
        {/* Badges and Tags - Top Left */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {/* Featured Badge */}
          {property.isFeatured && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
              <TrendingUp className="w-3 h-3" />
              Destaque
            </div>
          )}
          {/* Video Tag */}
          {Array.isArray(property.media) && property.media.some(m=>m.type==='video') && (
            <div className="bg-black/70 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold shadow">
              Video
            </div>
          )}
          
          {/* Condition Tags */}
          {property.conditionTags && property.conditionTags.length > 0 && (
            <div className="flex flex-col items-start gap-1.5">
              {property.conditionTags.slice(0, 1).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleFavorite}
          className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-purple-100/50 transition-colors"
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
            }`}
          />
        </motion.button>

        {/* Image Carousel */}
        <div
          className="relative h-48 overflow-hidden rounded-t-2xl"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'pan-y' }}
        >
          {property.images && property.images.length > 0 ? (
            <>
              <motion.div
                animate={{ x: -currentImage * 100 + "%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex h-full"
              >
                {property.images.map((image, i) => (
                  <div key={i} className="min-w-full h-full relative">
                    <Image
                      src={image.url}
                      alt={property.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                ))}
              </motion.div>

              {/* Watermark (preview only) */}
              {watermark && (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-2">
                  <span className="text-[10px] font-semibold text-white/80 bg-black/30 px-2 py-1 rounded-md">Zillowlike</span>
                </div>
              )}

              {/* Navigation Arrows */}
              {property.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 min-h-[44px] min-w-[44px] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center justify-center"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-800" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 min-h-[44px] min-w-[44px] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center justify-center"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-800" />
                  </button>
                </>
              )}

              {/* Overlay removed: price and location moved to content */}

              {/* Image Dots */}
              {property.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {property.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentImage(i);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        i === currentImage
                          ? "bg-white w-6"
                          : "bg-white/50 hover:bg-white/75 w-2"
                      }`}
                    />
                  ))}
                </div>
              )}

            </>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">Sem imagem</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1 relative">
          {/* Price + Share */}
          <div className="mb-2 mt-0.5 flex items-center justify-between">
            <div className="text-xl font-bold text-gray-900">
              {typeof property.price === 'number' && property.price > 0
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(property.price / 100)
                : 'Price on Request'}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="p-1.5 rounded-md transition-colors hover:bg-gray-50"
              aria-label="Abrir opções de compartilhamento"
            >
              <Share2 className="w-5 h-5 text-purple-600 hover:text-blue-600 transition-colors" />
            </motion.button>
          </div>

          {/* Share Modal */}
          <AnimatePresence>
            {showShareModal && (
              <motion.div
                ref={shareModalRef}
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="absolute top-12 right-3 z-50 bg-white rounded-xl shadow-2xl p-4 min-w-[200px] max-h-[300px] overflow-y-auto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Compartilhar</h3>
                  <button
                    onClick={handleShare}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Copy Link */}
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors text-left"
                  >
                    <LinkIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {copySuccess ? "✓ Link copiado!" : "Copiar link"}
                    </span>
                  </button>

                  {/* Gmail */}
                  <button
                    onClick={handleGmailShare}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-left"
                  >
                    <Mail className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">Gmail</span>
                  </button>

                  {/* Outlook/Hotmail */}
                  <button
                    onClick={handleOutlookShare}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Outlook</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tags row: Tipo + Finalidade (Venda/Aluguel) */}
          <div className="flex items-center gap-2 mb-2">
            {property.type && (
              <Chip icon={<Home className="w-3 h-3 text-gray-600" />}>{property.type === 'HOUSE' ? 'Casa' : property.type === 'APARTMENT' ? 'Apartamento' : property.type === 'CONDO' ? 'Condomínio' : property.type === 'LAND' ? 'Terreno' : property.type === 'COMMERCIAL' ? 'Comercial' : property.type === 'STUDIO' ? 'Studio' : property.type}</Chip>
            )}
            {property.purpose && (
              <Chip>{property.purpose === 'RENT' ? 'Aluguel' : 'Venda'}</Chip>
            )}
          </div>

          {/* Features row: quartos, banheiros, área (readable) */}
          <div className="flex items-center text-gray-700 text-sm mb-2">
            {property.bedrooms != null && (
              <div className="flex items-center gap-1" title="Quartos">
                <Bed className="w-4 h-4 text-gray-600" />
                <span className="font-semibold">{property.bedrooms}</span>
              </div>
            )}
            {property.bedrooms != null && (property.bathrooms != null || property.areaM2 != null) && (
              <span className="mx-2 text-gray-400">•</span>
            )}
            {property.bathrooms != null && (
              <div className="flex items-center gap-1" title="Banheiros">
                <Bath className="w-4 h-4 text-gray-600" />
                <span className="font-semibold">{property.bathrooms}</span>
              </div>
            )}
            {property.bathrooms != null && property.areaM2 != null && (
              <span className="mx-2 text-gray-400">•</span>
            )}
            {property.areaM2 != null && (
              <div className="flex items-center gap-1" title="Área">
                <Maximize className="w-4 h-4 text-gray-600" />
                <span className="font-semibold">{property.areaM2}m²</span>
              </div>
            )}
          </div>

          {/* Location (clean, readable) */}
          <div className="flex items-center gap-1.5 text-gray-700 text-sm mb-1.5">
            <MapPin className="w-4 h-4 text-gray-600" />
            <span>
              {property.neighborhood && `${property.neighborhood}, `}
              {property.city}/{property.state}
            </span>
          </div>
          {/* No description: keep info concise up to the address */}
        </div>
      </motion.div>
    </div>
  );
}
