"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, TrendingUp, Home, Users, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface LocationSuggestion {
  label: string;
  city: string;
  state: string;
  neighborhood: string | null;
  count: number;
}

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<'buy' | 'rent' | 'sell'>('buy');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  // Background slideshow (Petrolina & Juazeiro)
  const slides = [
    { city: "Petrolina, PE", url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2000&auto=format&fit=crop" },
    { city: "Petrolina, PE", url: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=2000&auto=format&fit=crop" },
    { city: "Juazeiro, BA", url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2000&auto=format&fit=crop" },
    { city: "Juazeiro, BA", url: "https://images.unsplash.com/photo-1502003148287-a82ef80a6abc?q=80&w=2000&auto=format&fit=crop" },
  ];
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // Buscar sugestões da API quando o usuário digita
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length > 0) {
        setIsFetchingSuggestions(true);
        try {
          const response = await fetch(`/api/locations?q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          if (data.success) {
            setSuggestions(data.suggestions || []);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsFetchingSuggestions(false);
        }
      } else {
        // Buscar sugestões populares (sem filtro)
        setIsFetchingSuggestions(true);
        try {
          const response = await fetch('/api/locations');
          const data = await response.json();
          if (data.success) {
            setSuggestions(data.suggestions?.slice(0, 5) || []);
          }
        } catch (error) {
          console.error('Error fetching popular suggestions:', error);
        } finally {
          setIsFetchingSuggestions(false);
        }
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsLoading(true);
      // Parse cidade e estado do query
      const parts = searchQuery.split(',').map(p => p.trim());
      let params = new URLSearchParams();
      
      if (parts.length >= 2) {
        // Formato: "Cidade, Estado" ou "Bairro, Cidade, Estado"
        const state = parts[parts.length - 1];
        const city = parts[parts.length - 2];
        params.set('city', city);
        params.set('state', state);
        if (parts.length === 3) {
          params.set('q', parts[0]); // Bairro como query geral
        }
      } else {
        // Busca geral
        params.set('q', searchQuery);
      }
      
      router.push(`/?${params.toString()}`);
    }
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.label);
    setShowSuggestions(false);
    // Apenas preenche o campo, não submete automaticamente
  };

  return (
    <div className="relative min-h-[55vh] sm:min-h-[60vh] md:min-h-[65vh] flex items-center justify-center overflow-hidden pt-28 md:pt-0 pb-8 md:pb-0">
      {/* Top Hero Nav removed to avoid conflict with ModernNavbar */}
      {/* Slideshow Background with Overlay */}
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: slideIndex === i ? 1 : 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
            aria-hidden={slideIndex !== i}
          >
            <Image
              src={s.url}
              alt={s.city}
              fill
              className="object-cover"
              priority={i === 0}
            />
          </motion.div>
        ))}
        {/* Dark overlay for better text readability - sempre visível */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        {/* Optional city label */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/80 text-xs sm:text-sm px-3 py-1.5 rounded-full bg-black/30 backdrop-blur">
          {slides[slideIndex].city}
        </div>
      </div>

      {/* Subtle animated elements */}
      <motion.div
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="hidden md:block absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="hidden md:block absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center text-white max-w-5xl mx-auto"
        >
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-normal mb-4 px-2 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Explore os Melhores Imóveis do Brasil
          </motion.h1>

          <motion.p
            className="text-xs sm:text-sm md:text-base tracking-wider mb-8 md:mb-10 text-white/90 px-3 font-medium uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Explore milhares de casas, mansões e imóveis de luxo em todo o Brasil em uma simples busca
          </motion.p>

          {/* Search Bar JamesEdition Style - Horizontal 3 campos */}
          <motion.div
            ref={searchRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-4xl mx-auto relative"
          >
            <form onSubmit={handleSearch} className="bg-white/95 backdrop-blur rounded-full p-1.5 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-center gap-1.5">
                {/* Campo Localização */}
                <div className="flex-1 flex items-center gap-3 px-6 py-3 bg-transparent rounded-full w-full">
                  <MapPin className="text-gray-400 flex-shrink-0 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Cidade, Região ou País"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    className="flex-1 outline-none text-gray-800 placeholder:text-gray-500 text-sm bg-transparent"
                  />
                </div>
                
                {/* Separador */}
                <div className="hidden sm:block h-8 w-px bg-gray-300"></div>
                
                {/* Campo Preço */}
                <div className="flex items-center gap-2 px-6 py-3 rounded-full w-full sm:w-auto">
                  <span className="text-sm text-gray-500">Qualquer preço</span>
                </div>
                
                {/* Separador */}
                <div className="hidden sm:block h-8 w-px bg-gray-300"></div>
                
                {/* Campo Quartos */}
                <div className="flex items-center gap-2 px-6 py-3 rounded-full w-full sm:w-auto">
                  <span className="text-sm text-gray-500">Qualquer quarto</span>
                </div>
                
                {/* Botão Search */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-full font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span className="hidden sm:inline">Buscar</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                >
                  <div className="p-2">
                    {searchQuery.length === 0 && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Buscas Populares
                      </div>
                    )}
                    {isFetchingSuggestions ? (
                      <div className="px-4 py-8 text-center text-gray-400">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    ) : suggestions.length === 0 && searchQuery.length > 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400">
                        Nenhuma cidade encontrada
                      </div>
                    ) : (
                      suggestions.map((suggestion, index) => (
                        <div key={index}>
                          {/* Cabeçalhos: primeira linha = Cidade; resto = Bairros */}
                          {index === 0 && (
                            <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Cidade</div>
                          )}
                          {index === 1 && suggestions[0] && suggestions[0].neighborhood === null && (
                            <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Bairros</div>
                          )}

                          <motion.button
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-blue-50 rounded-xl transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                              <span className="text-gray-700 group-hover:text-blue-600 font-medium">
                                {suggestion.label}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-blue-600">
                              {suggestion.count} {suggestion.count === 1 ? 'imóvel' : 'imóveis'}
                            </span>
                          </motion.button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Remover stats - JamesEdition não tem */}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </div>
  );
}
