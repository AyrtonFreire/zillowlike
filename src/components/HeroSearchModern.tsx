"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Home, MapPin, TrendingUp, Search, X } from "lucide-react";

export default function HeroSearchModern() {
  const router = useRouter();
  const [openPanel, setOpenPanel] = useState(false);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const [activeSug, setActiveSug] = useState(0);
  const sugRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const CATALOGUE = useMemo(() => [
    "Petrolina, PE",
    "Juazeiro, BA",
    "Centro, Petrolina",
    "Jardim Amazonas, Petrolina",
    "Centro, Juazeiro",
    "Santo Antônio, Juazeiro",
  ], []);

  const CITIES = [
    { name: "Petrolina", state: "PE", count: "500+ imóveis" },
    { name: "Juazeiro", state: "BA", count: "300+ imóveis" },
    { name: "Paulo Afonso", state: "BA", count: "150+ imóveis" },
    { name: "Salgueiro", state: "PE", count: "120+ imóveis" },
    { name: "Casa Nova", state: "BA", count: "80+ imóveis" },
  ];

  const NEIGHBORHOODS_PETROLINA = [
    "Centro", "Jardim Amazonas", "Cohab Massangano", "Atrás da Banca", "José e Maria"
  ];

  const NEIGHBORHOODS_JUAZEIRO = [
    "Centro", "Santo Antônio", "Piranga", "Dom José Rodrigues", "Alto da Maravilha"
  ];

  // Debounce suggestions
  useEffect(() => {
    const id = setTimeout(() => {
      const v = q.trim().toLowerCase();
      if (!v) {
        setSuggestions([]);
        setOpenSug(false);
        return;
      }
      const list = CATALOGUE.filter(s => s.toLowerCase().includes(v)).slice(0, 6);
      setSuggestions(list);
      setOpenSug(list.length > 0);
      setActiveSug(0);
    }, 200);
    return () => clearTimeout(id);
  }, [q, CATALOGUE]);

  // Close on click outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      if (sugRef.current && !sugRef.current.contains(e.target)) setOpenSug(false);
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpenPanel(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (q.trim()) {
      // Check if it's a city
      if (q.toLowerCase().includes('petrolina')) {
        params.set('city', 'Petrolina');
        params.set('state', 'PE');
      } else if (q.toLowerCase().includes('juazeiro')) {
        params.set('city', 'Juazeiro');
        params.set('state', 'BA');
      } else {
        params.set('q', q.trim());
      }
    }

    const url = params.toString() ? `/?${params.toString()}` : "/";
    
    try {
      const label = q || 'Busca recente';
      localStorage.setItem('lastSearch', JSON.stringify({ label, params: params.toString(), ts: Date.now() }));
    } catch {}
    
    router.push(url);
  }

  function goToCity(city: string, state: string) {
    const params = new URLSearchParams();
    params.set('city', city);
    params.set('state', state);
    const url = `/?${params.toString()}`;
    
    try {
      localStorage.setItem('lastSearch', JSON.stringify({ label: city, params: params.toString(), ts: Date.now() }));
    } catch {}
    
    setOpenPanel(false);
    router.push(url);
  }


  return (
    <section className="relative h-[65vh] min-h-[550px] max-h-[750px] overflow-hidden">
      {/* Premium Background with Gradient Overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-[25s] ease-out hover:scale-110" 
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop')" 
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-900/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-24 left-12 w-40 h-40 glass-teal/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-24 right-12 w-48 h-48 glass-teal/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 h-full flex items-center">
          <div className="w-full max-w-4xl mx-auto">
            {/* Hero Text */}
            <div className="mb-10 text-center animate-fade-in">
              <h1 className="text-white text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-5 drop-shadow-lg">
                Encontre o 
                <span className="block mt-2 text-transparent bg-gradient-to-r from-blue-400 via-blue-300 to-green-400 bg-clip-text">
                  lar dos seus sonhos
                </span>
              </h1>
              <p className="text-white/95 text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed drop-shadow-md">
                Descubra imóveis únicos em Petrolina e Juazeiro com nossa plataforma moderna
              </p>
            </div>

            {/* Premium Search Card */}
            <div className="animate-slide-up">
              <form onSubmit={onSubmit}>
                {/* Main Search Container */}
                <div className="relative" ref={sugRef}>
                  <div className="relative group">
                    {/* Glow Effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-green-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    
                    {/* Search Box */}
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-white/50 overflow-hidden backdrop-blur-xl">
                      <div className="flex items-center p-2">
                        {/* Search Icon */}
                        <div className="flex items-center justify-center w-14 h-14 text-gray-400">
                          <Search className="w-6 h-6" />
                        </div>

                        {/* Input */}
                        <input
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          onFocus={() => {
                            setOpenPanel(true);
                            if (suggestions.length) setOpenSug(true);
                          }}
                          onKeyDown={(e) => {
                            if (openSug && suggestions.length) {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setActiveSug((i) => (i + 1) % suggestions.length);
                              }
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActiveSug((i) => (i - 1 + suggestions.length) % suggestions.length);
                              }
                              if (e.key === 'Enter' && activeSug >= 0) {
                                e.preventDefault();
                                const s = suggestions[activeSug];
                                if (s) {
                                  setQ(s);
                                  setOpenSug(false);
                                }
                              }
                            }
                            if (e.key === 'Escape') {
                              setOpenSug(false);
                              setOpenPanel(false);
                            }
                          }}
                          placeholder="Busque por cidade, bairro ou endereço..."
                          className="flex-1 px-2 py-4 text-lg text-gray-900 placeholder-gray-500 bg-transparent focus:outline-none"
                          aria-label="Buscar imóveis"
                        />


                        {/* Search Button */}
                        <button 
                          type="submit" 
                          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 ml-2"
                        >
                          <Search className="w-5 h-5" />
                          <span className="hidden sm:inline">Buscar</span>
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Modern Suggestions Dropdown */}
                  {openSug && suggestions.length > 0 && (
                    <div className="absolute z-30 mt-3 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in">
                      {suggestions.map((s, i) => (
                        <button
                          key={s}
                          type="button"
                          className={`w-full text-left px-6 py-4 text-base font-medium transition-all duration-150 flex items-center gap-4 ${
                            i === activeSug 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          onMouseEnter={() => setActiveSug(i)}
                          onClick={() => {
                            setQ(s);
                            setOpenSug(false);
                          }}
                        >
                          <MapPin className="w-5 h-5 text-gray-400" />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </form>

              {/* Quick Stats */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-white/90">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">500+</div>
                    <div className="text-sm text-white/70">Imóveis ativos</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">2</div>
                    <div className="text-sm text-white/70">Cidades cobertas</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">+50</div>
                    <div className="text-sm text-white/70">Novos esta semana</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simplified Explore Panel */}
            {openPanel && (
              <div ref={panelRef} className="mt-4 animate-slide-up">
                <div className="relative">
                  {/* Glow Effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-green-500/20 rounded-2xl blur"></div>
                  
                  {/* Panel Content */}
                  <div className="relative bg-white/98 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Cidades</h3>
                      <button
                        onClick={() => setOpenPanel(false)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        aria-label="Fechar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Simple City Buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {CITIES.map((city) => (
                        <button
                          key={city.name}
                          onClick={() => goToCity(city.name, city.state)}
                          className="group text-left p-4 bg-white border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 group-hover:glass-teal rounded-full flex items-center justify-center transition-all flex-shrink-0">
                              <MapPin className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {city.name}
                              </h4>
                              <p className="text-xs text-gray-500">{city.state}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
