"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, TrendingUp, Home, Users, X, ChevronDown, DollarSign, Bed } from "lucide-react";
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
  const [purpose, setPurpose] = useState<'SALE' | 'RENT'>('SALE');
  const [propertyType, setPropertyType] = useState<string>('');
  const [priceRange, setPriceRange] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [showPropertyTypeDropdown, setShowPropertyTypeDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [showBedroomsDropdown, setShowBedroomsDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const propertyTypeRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const bedroomsRef = useRef<HTMLDivElement>(null);

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
            let items = (data.suggestions?.slice(0, 5) || []) as LocationSuggestion[];

            // Reordenar para colocar a última cidade buscada em primeiro lugar
            try {
              if (typeof window !== 'undefined') {
                const lastCity = localStorage.getItem('lastCity');
                const lastState = localStorage.getItem('lastState');
                if (lastCity && lastState) {
                  items = [...items].sort((a, b) => {
                    const aIsLast = a.city === lastCity && a.state === lastState;
                    const bIsLast = b.city === lastCity && b.state === lastState;
                    if (aIsLast === bIsLast) return 0;
                    return aIsLast ? -1 : 1;
                  });
                }
              }
            } catch {}

            setSuggestions(items);
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

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (propertyTypeRef.current && !propertyTypeRef.current.contains(event.target as Node)) {
        setShowPropertyTypeDropdown(false);
      }
      if (priceRef.current && !priceRef.current.contains(event.target as Node)) {
        setShowPriceDropdown(false);
      }
      if (bedroomsRef.current && !bedroomsRef.current.contains(event.target as Node)) {
        setShowBedroomsDropdown(false);
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
        // Persistir última cidade buscada para priorizar nas sugestões populares
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('lastCity', city);
            localStorage.setItem('lastState', state);
          }
        } catch {}
        if (parts.length === 3) {
          params.set('q', parts[0]); // Bairro como query geral
        }
      } else {
        // Busca geral
        params.set('q', searchQuery);
      }
      
      // Add property type if selected
      if (propertyType) {
        const typeMap: Record<string, string> = {
          'Casa': 'HOUSE',
          'Apartamento': 'APARTMENT',
          'Condomínio': 'CONDO',
          'Terreno': 'LAND',
          'Comercial': 'COMMERCIAL',
          'Rural': 'RURAL',
          '': ''
        };
        const mapped = typeMap[propertyType] || '';
        if (mapped) params.set('type', mapped);
      }
      
      // Add price range if selected
      if (priceRange) {
        params.set('minPrice', priceRange);
      }
      
      // Add bedrooms if selected
      if (bedrooms) {
        params.set('bedroomsMin', bedrooms);
      }

      params.set('purpose', purpose);
      
      router.push(`/?${params.toString()}`);
    }
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.label);
    setShowSuggestions(false);

    if (typeof window !== 'undefined' && suggestion.city && suggestion.state) {
      try {
        localStorage.setItem('lastCity', suggestion.city);
        localStorage.setItem('lastState', suggestion.state);
      } catch {}
    }
  };

  return (
    <div className="relative min-h-[360px] sm:min-h-[55vh] md:min-h-[55vh] lg:min-h-[55vh] flex items-center justify-center overflow-visible pt-16 md:pt-0 pb-4 md:pb-0">
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-[100]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center text-white max-w-3xl mx-auto"
        >
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-normal mb-6 px-2 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Explore os Melhores Imóveis da Região (Em Construção)
          </motion.h1>

          {/* Search Bar - estilo mais simples/high-end tipo JamesEdition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-3xl mx-auto relative"
          >
            <form onSubmit={handleSearch} className="bg-transparent">
              {/* Desktop: apenas barra de localização + Buscar */}
              <div className="hidden sm:block">
                <div className="flex flex-row items-stretch gap-0 rounded-full bg-white/95 backdrop-blur shadow-2xl border border-white/30 overflow-hidden">
                  {/* Campo Localização */}
                  <div ref={searchRef} className="flex-1 flex items-center gap-3 px-6 py-3 bg-transparent">
                    <MapPin className="text-gray-400 flex-shrink-0 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Cidade, região, bairro"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      className="flex-1 outline-none text-gray-800 placeholder:text-gray-500 text-sm bg-transparent"
                    />
                  </div>

                  <div className="flex items-center px-2">
                    <div className="flex items-center rounded-full bg-gray-100 p-1">
                      <button
                        type="button"
                        onClick={() => setPurpose('SALE')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          purpose === 'SALE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Comprar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurpose('RENT')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          purpose === 'RENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Alugar
                      </button>
                    </div>
                  </div>

                  {/* Botão Buscar */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="glass-teal text-white px-6 sm:px-8 text-sm font-semibold flex items-center justify-center whitespace-nowrap disabled:opacity-60"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        <span>Buscar</span>
                      </span>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Mobile: barra otimizada com botão de busca */}
              <div className="sm:hidden">
                <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl border border-white/30 overflow-hidden">
                  <div ref={searchRef} className="flex items-center gap-3 px-4 py-3">
                    <MapPin className="text-teal-600 flex-shrink-0 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar cidade ou bairro..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      className="flex-1 outline-none text-gray-800 placeholder:text-gray-400 text-sm bg-transparent min-w-0"
                    />

                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setShowSuggestions(false);
                        }}
                        className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Limpar busca"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center justify-center w-9 h-9 rounded-lg glass-teal disabled:opacity-60"
                      aria-label="Buscar"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>

                  <div className="px-4 pb-3">
                    <div className="flex items-center rounded-full bg-gray-100 p-1 w-fit">
                      <button
                        type="button"
                        onClick={() => setPurpose('SALE')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          purpose === 'SALE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Comprar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurpose('RENT')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          purpose === 'RENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Alugar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Autocomplete Dropdown - Layout horizontal compacto - FORA do form para "derramar" */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[9999]"
                >
                  {/* Header mobile indicando que há sugestões */}
                  <div className="sm:hidden flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {searchQuery ? 'Resultados' : 'Sugestões'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                      aria-label="Fechar sugestões"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[50vh] sm:max-h-[280px]">
                  {isFetchingSuggestions ? (
                    <div className="px-4 py-8 text-center text-gray-400">
                      <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : suggestions.length === 0 && searchQuery.length > 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400">
                      Nenhuma cidade encontrada
                    </div>
                  ) : (
                    <div className="p-4">
                      {searchQuery.length === 0 && (
                        <div className="px-2 pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Buscas Populares
                        </div>
                      )}
                      
                      {/* Agrupar por cidade */}
                      {(() => {
                        const grouped = suggestions.reduce((acc, s) => {
                          const key = `${s.city}, ${s.state}`;
                          if (!acc[key]) {
                            acc[key] = { city: s.city, state: s.state, neighborhoods: [], totalCount: 0, cityCount: null as number | null };
                          }
                          if (!s.neighborhood) {
                            acc[key].cityCount = Number(s.count || 0);
                          } else {
                            acc[key].neighborhoods.push({ name: s.neighborhood, count: s.count });
                          }
                          const sumNeighborhoods = acc[key].neighborhoods.reduce((sum, n) => sum + Number(n.count || 0), 0);
                          acc[key].totalCount = acc[key].cityCount != null ? acc[key].cityCount : sumNeighborhoods;
                          return acc;
                        }, {} as Record<string, { city: string; state: string; neighborhoods: { name: string; count: number }[]; totalCount: number; cityCount: number | null }>);
                        
                        return Object.entries(grouped).map(([key, data], cityIndex) => (
                          <div key={key} className="mb-4 last:mb-0">
                            {/* Cidade */}
                            <motion.button
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: cityIndex * 0.05 }}
                              onClick={() => handleSuggestionClick({ city: data.city, state: data.state, label: `${data.city}, ${data.state}`, count: data.totalCount, neighborhood: null })}
                              className="w-full group flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-50 to-blue-50 hover:from-teal-100 hover:to-blue-100 rounded-xl transition-all border border-teal-100"
                            >
                              <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                                <div className="text-left">
                                  <div className="font-bold text-gray-900 text-sm">{data.city}</div>
                                  <div className="text-xs text-gray-600">{data.state}</div>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-teal-700 bg-white px-3 py-1 rounded-full">
                                {data.totalCount}
                              </span>
                            </motion.button>
                            
                            {/* Bairros */}
                            {data.neighborhoods.length > 0 && (
                              <div className="mt-2 pl-4 space-y-1">
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                                  Bairros
                                </div>
                                {data.neighborhoods.map((n, nIndex) => (
                                  <motion.button
                                    key={nIndex}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: (cityIndex * 0.05) + (nIndex * 0.02) }}
                                    onClick={() => handleSuggestionClick({ city: data.city, state: data.state, label: `${n.name}, ${data.city}, ${data.state}`, count: n.count, neighborhood: n.name })}
                                    className="w-full group flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg transition-all text-left"
                                  >
                                    <span className="text-sm text-gray-700 group-hover:text-teal-700 font-medium">
                                      {n.name}
                                    </span>
                                    <span className="text-xs text-gray-400 group-hover:text-teal-600">
                                      {n.count}
                                    </span>
                                  </motion.button>
                                ))}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.p
            className="text-[10px] sm:text-xs md:text-sm tracking-wider mt-4 text-white/90 px-3 font-medium uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Explore milhares de casas, mansões e imóveis de luxo em todo o Brasil em uma simples busca
          </motion.p>

          {/* Remover stats - JamesEdition não tem */}
        </motion.div>
      </div>

      
    </div>
  );
}
