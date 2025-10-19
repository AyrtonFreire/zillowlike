"use client";

import { motion } from "framer-motion";
import { Heart, MapPin, Bed, Bath, Maximize, TrendingUp } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

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
  };
}

export default function PropertyCardPremium({ property }: PropertyCardPremiumProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    // TODO: Implementar lógica de favoritar
  };

  return (
    <Link href={`/property/${property.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8 }}
        className="group relative bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-2xl transition-all duration-300 cursor-pointer"
      >
        {/* Badge Featured */}
        {property.isFeatured && (
          <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Destaque
          </div>
        )}

        {/* Favorite Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleFavorite}
          className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition-all"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
            }`}
          />
        </motion.button>

        {/* Image Carousel */}
        <div className="relative h-64 overflow-hidden">
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

              {/* Image Dots */}
              {property.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {property.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentImage(i);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentImage
                          ? "bg-white w-6"
                          : "bg-white/50 hover:bg-white/75"
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
        <div className="p-6">
          {/* Price */}
          <div className="mb-3">
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 0,
              }).format(property.price)}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {property.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm truncate">
              {property.city}, {property.state}
            </span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-gray-700">
            {property.bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">{property.bathrooms}</span>
              </div>
            )}
            {property.areaM2 && (
              <div className="flex items-center gap-1">
                <Maximize className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">{property.areaM2}m²</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 text-center"
          >
            Ver Detalhes
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}
