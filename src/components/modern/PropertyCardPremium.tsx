"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, MapPin, Bed, Bath, Maximize, TrendingUp, ChevronLeft, ChevronRight, Share2, Mail, Link as LinkIcon, X, Sparkles, Zap, Percent, ArrowUpRight, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { track } from "@/lib/analytics";
import { buildPropertyPath } from "@/lib/slug";

interface PropertyCardPremiumProps {
  property: {
    id: string;
    title: string;
    price?: number | null;
    images: { url: string }[];
    owner?: {
      id: string;
      name?: string | null;
      image?: string | null;
      publicSlug?: string | null;
      role?: string | null;
    } | null;
    team?: {
      id: string;
      name: string;
      owner?: {
        id: string;
        name?: string | null;
        image?: string | null;
      } | null;
    } | null;
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
    videoUrl?: string | null;
    videoId?: string | null;
    createdAt?: string | Date | null;
    viewsCount?: number | null;
    leadsCount?: number | null;
    benchmarkPricePerM2?: number | null;
    benchmarkConversionRate?: number | null;
    benchmarkLeadsTop20Threshold?: number | null;
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
  const [dragOffset, setDragOffset] = useState(0); // resistência para 1 imagem
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const touchMoved = useRef(false);
  const didSwipe = useRef(false);
  const lastTouchX = useRef<number | null>(null);
  const lastTouchTime = useRef<number | null>(null);
  const gestureLocked = useRef<null | 'horizontal' | 'vertical'>(null);

  const createdAtDate = useMemo(() => {
    if (!property.createdAt) return null;
    const d = property.createdAt instanceof Date ? property.createdAt : new Date(property.createdAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [property.createdAt]);

  const ownerRoleLabel = useMemo(() => {
    const r = String((property as any)?.owner?.role || "").toUpperCase();
    if (r === "REALTOR" || r === "AGENCY") return "Corretor";
    if (r === "OWNER") return "Anunciante";
    return "Profissional";
  }, [property]);

  const showAgencyLogo = useMemo(() => {
    const r = String(property.owner?.role || "").toUpperCase();
    return r === "REALTOR" && !!property.team?.id;
  }, [property.owner?.role, property.team?.id]);

  const intelligentBadges = useMemo(() => {
    const badges: Array<{
      key: string;
      label: string;
      className: string;
      Icon: any;
    }> = [];

    if (createdAtDate) {
      const ageDays = Math.floor((Date.now() - createdAtDate.getTime()) / (24 * 60 * 60 * 1000));
      if (ageDays >= 0 && ageDays <= 7) {
        badges.push({
          key: "new",
          label: "Novo",
          className: "bg-teal-600 text-white",
          Icon: Sparkles,
        });
      }
    }

    const leads = typeof property.leadsCount === "number" ? property.leadsCount : null;
    const top20 = typeof property.benchmarkLeadsTop20Threshold === "number" ? property.benchmarkLeadsTop20Threshold : null;
    if (leads != null && top20 != null && top20 > 0 && leads >= top20) {
      badges.push({
        key: "most_sought",
        label: "Mais procurado",
        className: "bg-indigo-600 text-white",
        Icon: TrendingUp,
      });
    }

    const views = typeof property.viewsCount === "number" ? property.viewsCount : null;
    if (views != null && leads != null && views > 0) {
      const conv = leads / views;
      const bench = typeof property.benchmarkConversionRate === "number" ? property.benchmarkConversionRate : null;
      if (bench != null && bench > 0 && conv > bench) {
        badges.push({
          key: "high_conversion",
          label: "Alta conversão",
          className: "bg-emerald-600 text-white",
          Icon: Percent,
        });
      }
    }

    const price = typeof property.price === "number" ? property.price : null;
    const areaM2 = typeof property.areaM2 === "number" ? property.areaM2 : null;
    const benchPricePerM2 = typeof property.benchmarkPricePerM2 === "number" ? property.benchmarkPricePerM2 : null;
    if (price != null && areaM2 != null && areaM2 > 0 && benchPricePerM2 != null && benchPricePerM2 > 0) {
      const pricePerM2 = (price / 100) / areaM2;
      if (pricePerM2 < benchPricePerM2) {
        badges.push({
          key: "deal",
          label: "Preço abaixo da média",
          className: "bg-amber-500 text-white",
          Icon: Zap,
        });
      }
    }

    return badges;
  }, [createdAtDate, property.areaM2, property.benchmarkConversionRate, property.benchmarkLeadsTop20Threshold, property.benchmarkPricePerM2, property.leadsCount, property.price, property.viewsCount]);

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

  const cardImageTransform = "f_auto,q_auto:good,dpr_auto,w_1200,h_720,c_fill,g_auto";

  const MAX_CARD_IMAGES = 5;
  const cardImages = useMemo(() => {
    const imgs = Array.isArray(property.images) ? property.images : [];
    return imgs.slice(0, MAX_CARD_IMAGES);
  }, [property.images]);
  const hasVideo = useMemo(() => {
    if (property.videoUrl || property.videoId) return true;
    return Array.isArray(property.media) && property.media.some((m) => m.type === "video");
  }, [property.media, property.videoId, property.videoUrl]);
  const hasMoreImages = (Array.isArray(property.images) ? property.images.length : 0) > MAX_CARD_IMAGES;
  const totalSlides = cardImages.length + (hasMoreImages ? 1 : 0);

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

  useEffect(() => {
    const updateW = () => {
      setContainerW(containerRef.current ? containerRef.current.clientWidth : 0);
    };
    updateW();
    window.addEventListener('resize', updateW);
    return () => window.removeEventListener('resize', updateW);
  }, []);

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
    const url = `${window.location.origin}${buildPropertyPath(property.id, property.title)}`;
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
    const url = `${window.location.origin}${buildPropertyPath(property.id, property.title)}`;
    const subject = encodeURIComponent(property.title);
    const priceLabel = typeof property.price === 'number' && property.price > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format((property.price as number) / 100)
      : 'Price on Request';
    const body = encodeURIComponent(`Confira este imóvel: ${property.title}\n\nPreço: ${priceLabel}\n\nLocalização: ${property.city}/${property.state}\n\nVeja mais em: ${url}`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
    try { track({ name: 'filters_apply', payload: { action: 'share_gmail', id: property.id } }); } catch {}
  };

  const handleOutlookShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${buildPropertyPath(property.id, property.title)}`;
    const subject = encodeURIComponent(property.title);
    const priceLabel = typeof property.price === 'number' && property.price > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format((property.price as number) / 100)
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
    } else {
      // Fallback: navigate to property detail page
      window.location.href = buildPropertyPath(property.id, property.title);
    }
  };

  useEffect(() => {
    if (currentImage <= totalSlides - 1) return;
    setCurrentImage(Math.max(0, totalSlides - 1));
  }, [currentImage, totalSlides]);

  const goNext = () => {
    setCurrentImage((prev) => Math.min(totalSlides - 1, prev + 1));
  };

  const goPrev = () => {
    setCurrentImage((prev) => Math.max(0, prev - 1));
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
    // Não bloquear imediatamente: esperar decidir direção do gesto
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = performance.now();
    touchMoved.current = false;
    didSwipe.current = false;
    lastTouchX.current = e.touches[0].clientX;
    lastTouchTime.current = touchStartTime.current;
    gestureLocked.current = null;
    setIsDragging(true);
    setDragX(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const currentTouch = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const now = performance.now();
    lastTouchX.current = currentTouch;
    lastTouchTime.current = now;
    touchMoved.current = true;

    const diff = touchStartX.current - currentTouch; // >0: arrastando para esquerda

    // Quando só há 1 imagem: aplicar "resistência" e impedir avanço do card externo
    if (totalSlides <= 1) {
      const elastic = Math.max(-24, Math.min(24, -diff * 0.2));
      setDragOffset(elastic);
      if (gestureLocked.current !== 'vertical') {
        e.stopPropagation();
      }
      return;
    }

    // Tolerância a scroll vertical: decidir bloqueio somente após pequena movimentação
    if (!gestureLocked.current) {
      const dx0 = Math.abs(currentTouch - (touchStartX.current as number));
      const dy0 = Math.abs(currentY - (touchStartY.current as number));
      const intentionThreshold = 8; // px
      if (dx0 < intentionThreshold && dy0 < intentionThreshold) {
        return; // ainda não decidiu
      }
      gestureLocked.current = dx0 > dy0 ? 'horizontal' : 'vertical';
    }

    if (gestureLocked.current === 'vertical') {
      // deixar rolar a página
      return;
    }

    // Para múltiplas imagens: seguir o dedo, com rubber-band nas bordas
    let dx = currentTouch - (touchStartX.current as number);
    const atFirst = currentImage === 0;
    const atLast = currentImage === totalSlides - 1;
    if ((atFirst && dx > 0) || (atLast && dx < 0)) {
      const resistance = 0.35; // rubber-band
      dx = dx * resistance;
    }
    setDragX(dx);
    e.stopPropagation();
  };

  const onTouchEnd = () => {
    // Reset da resistência quando só há 1 imagem
    if (totalSlides <= 1) {
      setDragOffset(0);
    } else if (touchStartX.current != null && lastTouchX.current != null) {
      const dx = lastTouchX.current - touchStartX.current;
      const dt = Math.max(1, (lastTouchTime.current ?? performance.now()) - (touchStartTime.current ?? performance.now()));
      const velocity = dx / dt; // px/ms
      const vThreshold = 0.5; // ~500px/s
      const distanceThreshold = Math.max(50, containerW * 0.15);

      if (touchMoved.current && gestureLocked.current !== 'vertical') {
        // Prioriza velocidade
        if (velocity <= -vThreshold) {
          goNext();
          didSwipe.current = true;
        } else if (velocity >= vThreshold) {
          goPrev();
          didSwipe.current = true;
        } else {
          // fallback para distância
          if (dx <= -distanceThreshold) {
            goNext();
            didSwipe.current = true;
          } else if (dx >= distanceThreshold) {
            goPrev();
            didSwipe.current = true;
          }
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchStartTime.current = null;
    lastTouchX.current = null;
    lastTouchTime.current = null;
    touchMoved.current = false;
    gestureLocked.current = null;
    setIsDragging(false);
    setDragX(0);
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
          {intelligentBadges.map(({ key, label, className, Icon }) => (
            <div
              key={key}
              className={`${className} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </div>
          ))}
        </div>

        {/* Favorite Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleFavorite}
          className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-teal/5 transition-colors"
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
          className="relative h-56 sm:h-64 overflow-hidden rounded-t-2xl touch-pan-y"
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {cardImages && cardImages.length > 0 ? (
            <>
              <motion.div
                animate={(totalSlides <= 1)
                  ? { x: dragOffset }
                  : { x: isDragging ? -currentImage * containerW + dragX : -currentImage * containerW }
                }
                transition={isDragging ? { type: 'tween', duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                className="flex h-full"
              >
                {cardImages.map((image, i) => (
                  <div key={i} className="min-w-full h-full relative">
                    <Image
                      src={transformCloudinary(image.url, cardImageTransform)}
                      alt={property.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                ))}

                {hasMoreImages && (
                  <div className="min-w-full h-full relative">
                    <Image
                      src={transformCloudinary(
                        (cardImages[cardImages.length - 1]?.url || cardImages[0]?.url) as string,
                        cardImageTransform
                      )}
                      alt={property.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/45" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                      <div className="text-white text-sm font-semibold mb-2">
                        Visualizar o resto no anúncio
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (onOpenOverlay) onOpenOverlay(property.id);
                          else window.location.href = buildPropertyPath(property.id, property.title);
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white text-gray-900 text-sm font-semibold shadow hover:bg-gray-100 transition-colors"
                        aria-label="Abrir anúncio"
                      >
                        Abrir anúncio
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Watermark (preview only) */}
              {watermark && (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-2">
                  <span className="text-[10px] font-semibold text-white/80 bg-black/30 px-2 py-1 rounded-md">OggaHub</span>
                </div>
              )}

              {hasVideo && (
                <div className="absolute bottom-3 left-3 z-10">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/65 text-white shadow-md">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}

              {/* Navigation Arrows */}
              {totalSlides > 1 && (
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
              {totalSlides > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {Array.from({ length: totalSlides }).map((_, i) => (
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
        <div className="px-3 pt-2 pb-2 flex flex-col flex-1 relative bg-gradient-to-b from-white via-white to-gray-50">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="absolute right-2 top-2 p-1.5 rounded-md transition-colors hover:bg-gray-100"
            aria-label="Abrir opções de compartilhamento"
          >
            <Share2 className="w-4.5 h-4.5 text-teal hover:text-teal-dark transition-colors" />
          </motion.button>

          {/* Title + Price */}
          <div className="mb-1 pr-9">
            <div
              className="text-[13px] sm:text-[14px] font-semibold text-gray-900 leading-snug"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {property.title}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-[16px] font-extrabold text-gray-900">
                {typeof property.price === 'number' && property.price > 0
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(property.price / 100)
                  : 'Price on Request'}
              </div>
            </div>
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
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-teal/5 transition-colors text-left"
                  >
                    <LinkIcon className="w-4 h-4 text-teal" />
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

          {/* Features row: quartos, banheiros, área (readable) */}
          <div className="flex items-center text-gray-700 text-[12px] mb-0.5">
            {property.bedrooms != null && (
              <div className="flex items-center gap-1" title="Quartos">
                <Bed className="w-3.5 h-3.5 text-gray-600" />
                <span className="font-semibold">{property.bedrooms}</span>
              </div>
            )}
            {property.bedrooms != null && (property.bathrooms != null || property.areaM2 != null) && (
              <span className="mx-2 text-gray-400">•</span>
            )}
            {property.bathrooms != null && (
              <div className="flex items-center gap-1" title="Banheiros">
                <Bath className="w-3.5 h-3.5 text-gray-600" />
                <span className="font-semibold">{property.bathrooms}</span>
              </div>
            )}
            {property.bathrooms != null && property.areaM2 != null && (
              <span className="mx-2 text-gray-400">•</span>
            )}
            {property.areaM2 != null && (
              <div className="flex items-center gap-1" title="Área">
                <Maximize className="w-3.5 h-3.5 text-gray-600" />
                <span className="font-semibold">{property.areaM2}m²</span>
              </div>
            )}
          </div>

          {/* Location (clean, readable) */}
          <div className="flex items-center gap-1.5 text-gray-700 text-[12px]">
            <MapPin className="w-3.5 h-3.5 text-gray-600" />
            <span className="truncate">
              {property.neighborhood && `${property.neighborhood}, `}
              {property.city}/{property.state}
            </span>
          </div>

          {/* Footer area (reserved height to keep all cards equal) */}
          <div className="mt-auto pt-2 border-t border-gray-200/60 min-h-[36px] flex items-center">
            {property.owner?.name ? (
              <div className="flex items-center justify-between gap-3 w-full">
                {property.owner?.publicSlug ? (
                  <Link
                    href={`/realtor/${property.owner.publicSlug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="group/realtor flex items-center gap-3 min-w-0 flex-1"
                    aria-label={`Ver perfil de ${property.owner.name}`}
                  >
                    <span className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-white shadow">
                      {property.owner?.image ? (
                        <Image
                          src={property.owner.image}
                          alt={property.owner.name || "Profissional"}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-gray-700">
                          {String(property.owner.name).trim().slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 max-w-[180px] sm:max-w-[220px]">
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="block text-[12.5px] font-bold text-gray-900 leading-tight truncate transition-colors group-hover/realtor:text-teal-700 group-hover/realtor:underline">
                          {property.owner.name}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 flex-none text-gray-400 transition-transform group-hover/realtor:translate-x-0.5 group-hover/realtor:-translate-y-0.5" />
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-white shadow">
                      {property.owner?.image ? (
                        <Image
                          src={property.owner.image}
                          alt={property.owner.name || "Profissional"}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-gray-700">
                          {String(property.owner.name).trim().slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 max-w-[180px] sm:max-w-[220px]">
                      <span className="block text-[12.5px] font-bold text-gray-900 leading-tight truncate">
                        {property.owner.name}
                      </span>
                    </span>
                  </div>
                )}

                {showAgencyLogo ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-20 h-8 rounded-md overflow-hidden bg-white border border-gray-200"
                    title={property.team?.name || ""}
                    aria-label={property.team?.name ? `Imobiliária ${property.team.name}` : "Imobiliária"}
                  >
                    {property.team?.owner?.image ? (
                      <Image
                        src={property.team.owner.image}
                        alt={property.team?.name || "Imobiliária"}
                        fill
                        className="object-contain"
                        sizes="80px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-700 px-2">
                        <span className="truncate">{String(property.team?.name || "")}</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div aria-hidden="true" className="w-full" />
            )}
          </div>
          {/* No description: keep info concise up to the address */}
        </div>
      </motion.div>
    </div>
  );
}
