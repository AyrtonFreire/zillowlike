"use client";

import { motion } from "framer-motion";
import {
  HeroSection,
  PropertyCardPremium,
  ModernNavbar,
  FilterDrawer,
  ThemeToggle,
  PropertyListSkeleton
} from "@/components/modern";
import { useState } from "react";

// Mock data para demonstração
const mockProperties = [
  {
    id: "1",
    title: "Apartamento Moderno em São Paulo",
    price: 850000,
    images: [
      { url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800" },
      { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800" }
    ],
    city: "São Paulo",
    state: "SP",
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 120,
    isFeatured: true
  },
  {
    id: "2",
    title: "Casa com Piscina no Rio de Janeiro",
    price: 1200000,
    images: [
      { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800" }
    ],
    city: "Rio de Janeiro",
    state: "RJ",
    bedrooms: 4,
    bathrooms: 3,
    areaM2: 250,
    isFeatured: false
  },
  {
    id: "3",
    title: "Cobertura Luxuosa em Belo Horizonte",
    price: 950000,
    images: [
      { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800" }
    ],
    city: "Belo Horizonte",
    state: "MG",
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 180,
    isFeatured: true
  }
];

export default function ShowcasePage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <ModernNavbar forceLight />

      {/* Hero Section */}
      <HeroSection />

      {/* Properties Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 gradient-text">
              Imóveis em Destaque
            </h2>
            <p className="text-xl text-gray-600">
              Confira os melhores imóveis disponíveis agora
            </p>
          </motion.div>

          {loading ? (
            <PropertyListSkeleton count={3} />
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-8"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
            >
              {mockProperties.map((property) => (
                <motion.div
                  key={property.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <PropertyCardPremium property={property} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">
              Por que escolher a <span className="gradient-text">ZillowLike</span>?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🏠",
                title: "Milhares de Imóveis",
                description: "Acesso a uma ampla variedade de propriedades em todo o Brasil"
              },
              {
                icon: "🚀",
                title: "Busca Inteligente",
                description: "Encontre o imóvel perfeito com nossos filtros avançados"
              },
              {
                icon: "💎",
                title: "Experiência Premium",
                description: "Interface moderna e intuitiva para uma navegação perfeita"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-2xl shadow-soft hover:shadow-xl transition-all"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Theme Toggle (fixed position) */}
      <div className="fixed bottom-8 left-8 z-40">
        <ThemeToggle />
      </div>

      {/* Filter Drawer */}
      <FilterDrawer />
    </div>
  );
}
