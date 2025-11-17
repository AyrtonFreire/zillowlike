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
      
      // Add purpose
      params.set('purpose', purpose);
      
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
      
      // Add property type if selected
      if (propertyType) {
        const typeMap: Record<string, string> = {
          'Casa': 'HOUSE',
          'Apartamento': 'APARTMENT',
          'Condomínio': 'CONDO',
          'Terreno': 'LAND',
          'Comercial': 'COMMERCIAL',
          'Rural': 'LAND',
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
      
      router.push(`/?${params.toString()}`);
    }
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.label);
    setShowSuggestions(false);
    // Mobile: iniciar busca imediatamente; Desktop: somente preencher
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
    if (!isMobile) return;
    const params = new URLSearchParams();
    if (suggestion.city && suggestion.state) {
      params.set('city', suggestion.city);
      params.set('state', suggestion.state);
    } else {
      params.set('q', suggestion.label);
    }
    params.set('purpose', purpose);
    // Persist last searched location from suggestion
    if (typeof window !== 'undefined' && suggestion.city && suggestion.state) {
      try {
        localStorage.setItem('lastCity', suggestion.city);
        localStorage.setItem('lastState', suggestion.state);
      } catch {}
    }
    // Persist last searched location if present
    if (typeof window !== 'undefined' && params.get('city') && params.get('state')) {
      try {
        localStorage.setItem('lastCity', params.get('city') as string);
        localStorage.setItem('lastState', params.get('state') as string);
      } catch {}
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="relative min-h-[450px] sm:min-h-[60vh] md:min-h-[65vh] flex items-center justify-center overflow-visible pt-20 md:pt-0 pb-6 md:pb-0">
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-[100]">
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

          {/* Search Bar - Melhorado para mobile com dropdowns funcionais */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-4xl mx-auto relative"
          >
            <form onSubmit={handleSearch} className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl">
              {/* Desktop: Full form */}
              <div className="hidden sm:block p-4">
                {/* Purpose Toggle - Comprar/Alugar - Centralizado e mais visível */}
                <div className="flex gap-6 mb-2.5 justify-center border-b border-gray-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setPurpose('SALE')}
                    className={`px-4 pb-2 text-base font-bold transition-all ${
                      purpose === 'SALE'
                        ? 'text-teal-700 border-b-3 border-teal-600 scale-105'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Comprar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurpose('RENT')}
                    className={`px-4 pb-2 text-base font-bold transition-all ${
                      purpose === 'RENT'
                        ? 'text-teal-700 border-b-3 border-teal-600 scale-105'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Alugar
                  </button>
                </div>

                <div className="flex flex-row items-center gap-1">
                  {/* Campo Localização */}
                  <div ref={searchRef} className="flex-1 flex items-center gap-3 px-6 py-2.5 bg-transparent rounded-full w-full">
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
                <div className="hidden sm:block h-7 w-px bg-gray-300"></div>
                
                {/* Campo Tipo de Imóvel com Dropdown */}
                <div ref={propertyTypeRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPropertyTypeDropdown(!showPropertyTypeDropdown)}
                    className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 rounded-2xl sm:rounded-full w-full sm:w-auto border border-gray-200 sm:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <Home className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {propertyType ? propertyType : 'Tipo de imóvel'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPropertyTypeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showPropertyTypeDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="p-2">
                          {['', 'Casa', 'Apartamento', 'Condomínio', 'Terreno', 'Comercial', 'Rural'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                setPropertyType(type);
                                setShowPropertyTypeDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-sm text-gray-700"
                            >
                              {type || 'Todos os tipos'}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Separador */}
                <div className="hidden sm:block h-8 w-px bg-gray-300"></div>
                
                {/* Campo Preço com Dropdown */}
                <div ref={priceRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPriceDropdown(!showPriceDropdown)}
                    className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 rounded-2xl sm:rounded-full w-full sm:w-auto border border-gray-200 sm:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {priceRange ? `R$ ${parseInt(priceRange).toLocaleString('pt-BR')}+` : 'Qualquer preço'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPriceDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showPriceDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="p-2">
                          {['', '100000', '300000', '500000', '1000000', '2000000', '5000000'].map((price) => (
                            <button
                              key={price}
                              type="button"
                              onClick={() => {
                                setPriceRange(price);
                                setShowPriceDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-sm text-gray-700"
                            >
                              {price ? `R$ ${parseInt(price).toLocaleString('pt-BR')}+` : 'Qualquer preço'}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Separador */}
                <div className="hidden sm:block h-8 w-px bg-gray-300"></div>
                
                {/* Campo Quartos com Dropdown */}
                <div ref={bedroomsRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBedroomsDropdown(!showBedroomsDropdown)}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl sm:rounded-full w-full sm:w-auto border border-gray-200 sm:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <Bed className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {bedrooms ? `${bedrooms}+ quartos` : 'Qualquer quarto'}
                    </span>
                  </button>
                  
                  <AnimatePresence>
                    {showBedroomsDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="p-2">
                          {['', '1', '2', '3', '4', '5'].map((bed) => (
                            <button
                              key={bed}
                              type="button"
                              onClick={() => {
                                setBedrooms(bed);
                                setShowBedroomsDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-sm text-gray-700"
                            >
                              {bed ? `${bed}+ quartos` : 'Qualquer quarto'}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Botão Search (apenas ícone para reduzir poluição visual) */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  aria-label="Buscar"
                  disabled={isLoading}
                  className="glass-teal text-white w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 shadow-lg"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
              </div>

              {/* Mobile: Minimal search bar (no outer pill) */}
              <div className="sm:hidden px-4 py-3">
                <div ref={searchRef} className="flex items-center gap-2">
                  <MapPin className="text-gray-400 flex-shrink-0 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="City, Region, Country"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    className="flex-1 outline-none text-gray-700 placeholder:text-gray-400 text-sm bg-transparent py-2"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setShowSuggestions(false);
                      }}
                      className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
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
                  className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto z-[9999] max-h-[60vh] sm:max-h-[280px]"
                >
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
                            acc[key] = { city: s.city, state: s.state, neighborhoods: [], totalCount: 0 };
                          }
                          if (s.neighborhood) {
                            acc[key].neighborhoods.push({ name: s.neighborhood, count: s.count });
                          }
                          acc[key].totalCount += s.count;
                          return acc;
                        }, {} as Record<string, { city: string; state: string; neighborhoods: { name: string; count: number }[]; totalCount: number }>);
                        
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Remover stats - JamesEdition não tem */}
        </motion.div>
      </div>

      
    </div>
  );
}
