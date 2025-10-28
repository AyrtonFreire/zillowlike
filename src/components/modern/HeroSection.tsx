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
  const [isMdUp, setIsMdUp] = useState(false);

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

  // Track viewport to only render hero top nav on >= md
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const apply = () => setIsMdUp(mql.matches);
    apply();
    mql.addEventListener ? mql.addEventListener('change', apply) : mql.addListener(apply as any);
    return () => {
      mql.removeEventListener ? mql.removeEventListener('change', apply) : mql.removeListener(apply as any);
    };
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
    setIsLoading(true);
    
    // Construir URL com cidade e estado
    const params = new URLSearchParams();
    params.set('city', suggestion.city);
    params.set('state', suggestion.state);
    if (suggestion.neighborhood) {
      params.set('q', suggestion.neighborhood);
    }
    
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="relative min-h-[70vh] sm:min-h-[80vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden pt-28 md:pt-0 pb-8 md:pb-0">
      {/* Top Hero Nav (Zillow-like) */}
      {isMdUp && (
      <div className="absolute top-0 inset-x-0 z-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mt-4 mb-2 rounded-full bg-white/95 backdrop-blur border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-800">
              {/* Left: primary intents */}
              <nav className="flex items-center gap-4">
                {[
                  { id: 'buy', label: 'Comprar' },
                  { id: 'rent', label: 'Alugar' },
                  { id: 'sell', label: 'Vender' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setMode(t.id as any)}
                    className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                      mode === t.id ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
                    }`}
                    aria-pressed={mode === t.id}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>

              {/* Center: brand/logo */}
              <div className="flex items-center gap-2 select-none">
                <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-blue-600 to-purple-600" />
                <span className="font-extrabold tracking-tight text-gray-900 text-base">Zillowlike</span>
              </div>

              {/* Right: context actions per mode */}
              <div className="flex items-center gap-4">
                {(
                  mode === 'buy'
                    ? [
                        { label: 'Financiamento', href: '#financiamento' },
                        { label: 'Encontrar corretor', href: '#corretores' },
                        { label: 'Ajuda', href: '#ajuda' },
                      ]
                    : mode === 'rent'
                    ? [
                        { label: 'Gerenciar aluguel', href: '#aluguel' },
                        { label: 'Anunciar aluguel', href: '/owner/new' },
                        { label: 'Ajuda', href: '#ajuda' },
                      ]
                    : [
                        { label: 'Anunciar imóvel', href: '/owner/new' },
                        { label: 'Avaliar preço', href: '#avaliar-preco' },
                        { label: 'Ajuda', href: '#ajuda' },
                      ]
                ).map((a) => (
                  <a
                    key={a.label}
                    href={a.href}
                    className="px-3 py-1.5 rounded-full font-semibold hover:bg-gray-100"
                  >
                    {a.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000"
          alt="Beautiful home"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
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

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center text-white max-w-5xl mx-auto"
        >
          <motion.h1
            className="text-3xl sm:text-5xl md:text-7xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Encontre seu Lar dos Sonhos
            </span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl md:text-2xl mb-8 md:mb-12 text-blue-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Milhares de imóveis incríveis esperando por você
          </motion.p>

          {/* Search Bar Moderna com Autocomplete */}
          <motion.div
            ref={searchRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="max-w-4xl mx-auto relative"
          >
            <form onSubmit={handleSearch} className="glass rounded-2xl p-2 shadow-2xl">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 flex items-center gap-3 bg-white rounded-xl px-4 py-3 relative">
                  <MapPin className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Cidade, bairro ou região..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    className="flex-1 outline-none text-gray-800 placeholder:text-gray-400 text-base"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setShowSuggestions(false);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 md:px-8 py-3 rounded-xl font-semibold hover:shadow-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Buscar
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

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="hidden md:grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16"
          >
            {[
              { label: "Imóveis", value: "10k+" },
              { label: "Corretores", value: "500+" },
              { label: "Cidades", value: "50+" }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
              >
                <div className="text-4xl font-bold mb-2 text-white">{stat.value}</div>
                <div className="text-white/90 text-sm md:text-base font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
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
