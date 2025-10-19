"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, MapPin, Bed, Bath, Maximize, TrendingUp, Car, Home, ChevronLeft, ChevronRight, Share2, Mail, Link as LinkIcon, X } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

interface PropertyCardPremiumProps {
  property: {
    id: string;
    title: string;
    price: number;
    images: { url: string }[];
    city: string;
    state: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    isFeatured?: boolean;
    type?: string;
    status?: string; // SALE or RENT
    neighborhood?: string | null;
    parkingSpots?: number | null;
    conditionTags?: string[];
  };
  onOpenOverlay?: (id: string) => void;
}

export default function PropertyCardPremium({ property, onOpenOverlay }: PropertyCardPremiumProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const shareModalRef = useRef<HTMLDivElement>(null);

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

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareModal(!showShareModal);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/properties/${property.id}`;
    await navigator.clipboard.writeText(url);
    setCopySuccess(true);
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
    const body = encodeURIComponent(`Confira este imóvel: ${property.title}\n\nPreço: ${new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(property.price)}\n\nLocalização: ${property.city}/${property.state}\n\nVeja mais em: ${url}`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
  };

  const handleOutlookShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/properties/${property.id}`;
    const subject = encodeURIComponent(property.title);
    const body = encodeURIComponent(`Confira este imóvel: ${property.title}\n\nPreço: ${new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(property.price)}\n\nLocalização: ${property.city}/${property.state}\n\nVeja mais em: ${url}`);
    window.open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`, '_blank');
  };

  const handleClick = () => {
    if (onOpenOverlay) {
      onOpenOverlay(property.id);
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer' }} className="h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8 }}
        className="group relative bg-white rounded-2xl shadow-soft hover:shadow-2xl transition-all duration-300 cursor-pointer h-full flex flex-col"
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
          
          {/* Condition Tags */}
          {property.conditionTags && property.conditionTags.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {property.conditionTags.map((tag, index) => (
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
          className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition-all"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
            }`}
          />
        </motion.button>

        {/* Image Carousel */}
        <div className="relative h-48 overflow-hidden rounded-t-2xl">
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
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                ))}
              </motion.div>

              {/* Navigation Arrows */}
              {property.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-800" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-800" />
                  </button>
                </>
              )}

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
          {/* Price and Share Button */}
          <div className="mb-1 flex items-center justify-between">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 0,
              }).format(property.price)}
            </span>

            {/* Share Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2 rounded-full shadow-md hover:shadow-lg transition-all opacity-70 hover:opacity-100"
            >
              <Share2 className="w-4 h-4" />
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

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {property.title}
          </h3>

          {/* Type Badge */}
          {property.type && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full border border-gray-300">
                <Home className="w-3 h-3 text-gray-600" />
                <span className="text-xs font-bold text-gray-700 uppercase">
                  {property.type === 'HOUSE' ? 'Casa' : 
                   property.type === 'APARTMENT' ? 'Apartamento' :
                   property.type === 'CONDO' ? 'Condomínio' :
                   property.type === 'LAND' ? 'Terreno' :
                   property.type === 'COMMERCIAL' ? 'Comercial' :
                   property.type === 'STUDIO' ? 'Studio' : property.type}
                </span>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-600 text-sm mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-xs">
              {property.neighborhood && `${property.neighborhood}, `}
              {property.city}/{property.state}
            </span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-3 text-gray-700 text-xs mb-2">
            {property.bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5" />
                <span className="font-medium">{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5" />
                <span className="font-medium">{property.bathrooms}</span>
              </div>
            )}
            {property.areaM2 && (
              <div className="flex items-center gap-1">
                <Maximize className="w-3.5 h-3.5" />
                <span className="font-medium">{property.areaM2}m²</span>
              </div>
            )}
            {property.parkingSpots && (
              <div className="flex items-center gap-1">
                <Car className="w-3.5 h-3.5" />
                <span className="font-medium">{property.parkingSpots}</span>
              </div>
            )}
          </div>

          {/* Price per m² - Only for SALE properties */}
          {property.areaM2 && property.status === 'SALE' && (
            <div className="text-xs text-gray-500 mt-1">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 0,
              }).format(property.price / property.areaM2)}/m²
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
