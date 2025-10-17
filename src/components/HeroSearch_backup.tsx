"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function LastSearchRow() {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);
  const [params, setParams] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lastSearch');
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj?.label) setLabel(obj.label as string);
      if (obj?.params) setParams(obj.params as string);
    } catch {}
  }, []);
  if (!label) return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
      <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3M12 6a9 9 0 100 18 9 9 0 000-18z"/></svg>
      Última busca
      <span className="ml-auto text-gray-500">—</span>
    </div>
  );
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
      <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3M12 6a9 9 0 100 18 9 9 0 000-18z"/></svg>
      Última busca: <span className="font-medium">{label}</span>
      <button
        className="ml-auto text-blue-600 hover:text-blue-800 underline"
        onClick={()=>{ router.push(params ? `/?${params}` : '/'); }}
      >Aplicar</button>
    </div>
  );
}

export default function HeroSearch() {
  const router = useRouter();
  const [openPanel, setOpenPanel] = useState(false);
  const [city, setCity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [type, setType] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const [activeSug, setActiveSug] = useState(0);
  const sugRef = useRef<HTMLDivElement|null>(null);
  const panelRef = useRef<HTMLDivElement|null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exploreView, setExploreView] = useState<'root' | 'areas:petrolina' | 'areas:juazeiro'>('root');
  const [panelTab, setPanelTab] = useState<'buy'|'rent'|'share'|'sold'>('buy');
  const [panelIn, setPanelIn] = useState(false);

  const AREAS: Record<string, string[]> = useMemo(() => ({
    Petrolina: [
      'Centro, Petrolina',
      'Jardim Amazonas, Petrolina',
      'Cohab Massangano, Petrolina',
      'Atrás da Banca, Petrolina',
      'José e Maria, Petrolina',
    ],
    Juazeiro: [
      'Centro, Juazeiro',
      'Santo Antônio, Juazeiro',
      'Piranga, Juazeiro',
      'Dom José Rodrigues, Juazeiro',
      'Alto da Maravilha, Juazeiro',
    ],
  }), []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (openPanel) {
      const id = setTimeout(() => setPanelIn(true), 0);
      return () => clearTimeout(id);
    } else {
      setPanelIn(false);
    }
  }, [openPanel]);

  // simple local catalogue for suggestions
  const CATALOGUE = useMemo(() => [
    "Petrolina", "Juazeiro",
    "Centro (Petrolina)", "Jardim Amazonas (Petrolina)",
    "Centro (Juazeiro)", "Santo Antônio (Juazeiro)",
    "Av. Cardoso de Sá", "Orla Petrolina", "Rua da Beira",
  ], []);

  // debounce suggestions
  useEffect(() => {
    const id = setTimeout(() => {
      const v = q.trim().toLowerCase();
      if (!v) { setSuggestions([]); setOpenSug(false); return; }
      const list = CATALOGUE.filter(s => s.toLowerCase().includes(v)).slice(0, 8);
      setSuggestions(list);
      setOpenSug(list.length > 0);
      setActiveSug(0);
    }, 180);
    return () => clearTimeout(id);
  }, [q, CATALOGUE]);

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
    if (city.trim()) {
      params.set("city", city.trim());
      // map city to UF for better filtering on results
      const uf = city === 'Petrolina' ? 'PE' : city === 'Juazeiro' ? 'BA' : '';
      if (uf) params.set('state', uf);
    }
    if (q.trim() && q.trim().toLowerCase() !== city.trim().toLowerCase()) params.set('q', q.trim());
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (bedrooms) params.set("bedroomsMin", bedrooms);
    if (bathrooms) params.set("bathroomsMin", bathrooms);
    if (areaMin) params.set("areaMin", areaMin);
    if (type) params.set("type", type);
    // keep a simple indicator for rent/buy if needed later
    const url = params.toString() ? `/?${params.toString()}` : "/";
    // persist last search for hero display
    try {
      const label = [city || null, q || null].filter(Boolean).join(' · ');
      localStorage.setItem('lastSearch', JSON.stringify({ label, params: params.toString(), ts: Date.now() }));
    } catch {}
    router.push(url);
  }

  function goToCity(c: string) {
    const params = new URLSearchParams();
    params.set('city', c);
    const uf = c === 'Petrolina' ? 'PE' : c === 'Juazeiro' ? 'BA' : '';
    if (uf) params.set('state', uf);
    const url = `/?${params.toString()}`;
    try {
      localStorage.setItem('lastSearch', JSON.stringify({ label: c, params: params.toString(), ts: Date.now() }));
    } catch {}
    setOpenPanel(false);
    setOpenSug(false);
    router.push(url);
  }

  return (
    <section className="relative h-[60vh] min-h-[500px] max-h-[700px] overflow-hidden">
      {/* Modern Background with Gradient Overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-[20s] ease-out hover:scale-110" 
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop')" 
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-gray-900/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {/* Floating Elements for Visual Interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-success-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 h-full flex items-center">
          <div className="w-full max-w-3xl">
            {/* Hero Text */}
            <div className="mb-8 animate-fade-in">
              <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
                Encontre o 
                <span className="block text-transparent bg-gradient-to-r from-primary-400 to-success-400 bg-clip-text">
                  lar perfeito
                </span>
              </h1>
              <p className="text-white/90 text-lg md:text-xl max-w-2xl leading-relaxed">
                Descubra imóveis únicos em Petrolina e Juazeiro com nossa plataforma moderna e intuitiva.
              </p>
            </div>
            {/* Modern Search Bar */}
            <div className="animate-slide-up">
              <form onSubmit={onSubmit}>
                <div className="relative" ref={sugRef}>
                  <label htmlFor="hero-search" className="sr-only">Buscar por cidade, bairro ou endereço</label>
                  
                  {/* Search Input Container */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-success-500/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
                      <div className="flex items-center">
                        <div className="flex-1 relative">
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12.414a1 1 0 00-.293-.293L9.414 8.414a6 6 0 111.414-1.414l3.707 3.707a1 1 0 00.293.293l4.243 4.243a1 1 0 01-1.414 1.414z" />
                            </svg>
                          </div>
                          <input
                            id="hero-search"
                            value={q}
                            onChange={(e)=>setQ(e.target.value)}
                            onFocus={()=>{ setOpenPanel(true); if (suggestions.length) setOpenSug(true); }}
                            onKeyDown={(e)=>{
                              if (openSug && suggestions.length) {
                                if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSug((i)=> (i+1) % suggestions.length); }
                                if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSug((i)=> (i-1+suggestions.length) % suggestions.length); }
                                if (e.key === 'Enter') { e.preventDefault(); const s = suggestions[activeSug]; if (s) { setQ(s); setOpenSug(false); } }
                                if (e.key === 'Escape') { setOpenSug(false); setOpenPanel(false); }
                              }
                            }}
                            placeholder="Busque por cidade, bairro ou endereço..."
                            className="w-full pl-14 pr-4 py-5 text-base text-gray-900 placeholder-gray-500 bg-transparent focus:outline-none"
                            aria-autocomplete="list"
                            aria-expanded={openSug}
                            aria-controls="hero-suggestions"
                            aria-activedescendant={openSug && suggestions.length ? `hero-option-${activeSug}` : undefined}
                            role="combobox"
                          />
                        </div>
                        
                        {/* Search Button */}
                        <div className="flex items-center gap-3 pr-3">
                          <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="btn btn-ghost text-sm px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                            Filtros
                          </button>
                          
                          <button 
                            type="submit" 
                            className="btn btn-primary px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Buscar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Modern Suggestions Dropdown */}
                  {openSug && suggestions.length > 0 && (
                    <div id="hero-suggestions" role="listbox" className="absolute z-20 mt-3 w-full bg-white/98 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                      {suggestions.map((s, i)=> (
                        <button
                          id={`hero-option-${i}`}
                          key={s}
                          role="option"
                          aria-selected={i===activeSug}
                          className={`w-full text-left px-6 py-4 text-sm font-medium transition-all duration-150 flex items-center gap-3 ${i===activeSug ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
                          onMouseEnter={()=>setActiveSug(i)}
                          onClick={()=>{ setQ(s); setOpenSug(false); }}
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12.414a6 6 0 10-8.485 0l4.243 4.243a1 1 0 001.414 0z" />
                          </svg>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Quick Stats */}
            <div className="mt-8 animate-fade-in">
              <div className="flex flex-wrap items-center gap-6 text-white/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">500+ imóveis ativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">2 cidades cobertas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Atualizado diariamente</span>
                </div>
              </div>
            </div>

            {/* Dropdown de exploração como o anexo */}
            {openPanel && (
              <div ref={panelRef} className={`mt-2 rounded-[12px] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.12)] overflow-hidden transform transition-all duration-200 ease-out origin-top ${panelIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                {!showAdvanced ? (
                  <div className="flex flex-col">
                    {/* Tabs traduzidas (opcionais) */}
                    <div className="px-6 pt-4">
                      <div className="flex items-center gap-7 text-[15px]">
                        {(['buy','rent','share','sold'] as const).map(t => (
                          <button key={t} onClick={()=>setPanelTab(t)} className={`pb-2 font-medium ${panelTab===t ? 'text-blue-700 border-b-2 border-blue-600' : 'text-gray-700 hover:text-gray-900 border-b-2 border-transparent'}`}>
                            {t==='buy'?'Comprar':t==='rent'?'Alugar':t==='share'?'Compartilhar':'Vendidos'}
                            {t==='sold' && <span className="ml-2 text-[11px] text-green-700 bg-green-100 rounded px-1.5 py-0.5 align-middle">NOVO</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lista de exploração sem campo de digitação */}
                    <div className="px-6 mt-2 pb-5">
                      <div className="max-h-[360px] overflow-y-auto rounded-md">
                        {exploreView === 'root' && (
                          <div className="text-[15px]">
                            <div className="mx-auto w-full max-w-2xl px-2 py-6">
                              <div className="text-gray-900 font-semibold mb-4">Explorar por cidade</div>
                              <ul className="divide-y divide-white">
                                {['Petrolina','Juazeiro'].map((c)=>(
                                  <li key={c} className="py-[10px]">
                                    <div className="flex items-center justify-between">
                                      <button type="button" className="text-gray-800 hover:text-blue-700" onClick={()=> goToCity(c)}>{c}</button>
                                      <button type="button" className="text-[#2a6edf] hover:underline" onClick={()=> setExploreView(c==='Petrolina'?'areas:petrolina':'areas:juazeiro')}>Áreas em {c}</button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {exploreView !== 'root' && (
                          <div className="text-[15px]">
                            {/* header subview sem linha */}
                            <div className="mx-auto w-full max-w-2xl px-2 py-6">
                              <button type="button" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-3" onClick={()=> setExploreView('root')}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                                Voltar
                              </button>
                              <div className="text-gray-900 font-semibold">{exploreView === 'areas:petrolina' ? 'Bairros de Petrolina' : 'Bairros de Juazeiro'}</div>
                            </div>
                            <ul className="mx-auto w-full max-w-2xl px-2 pb-6 space-y-2">
                              {(exploreView === 'areas:petrolina' ? AREAS.Petrolina : AREAS.Juazeiro).map((a)=> (
                                <li key={a} className="py-1">
                                  <button type="button" className="text-gray-800 hover:text-blue-700 hover:underline" onClick={()=>{ setQ(a); }}>
                                    {a}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Footer ações */}
                      <div className="mx-auto w-full max-w-2xl flex items-center justify-end gap-3 mt-4 px-2">
                        <button type="button" onClick={()=> setOpenPanel(false)} className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">Fechar</button>
                        <button type="submit" className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow">Buscar</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <LastSearchRow />
                    <label className="block">
                      <div className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 110-6 3 3 0 010 6z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5a7.5 7.5 0 11-15 0c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5z"/></svg>
                        Cidade
                      </div>
                      <select value={city} onChange={(e)=>setCity(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                        <option value="">Todas</option>
                        <option value="Petrolina">Petrolina</option>
                        <option value="Juazeiro">Juazeiro</option>
                      </select>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block">
                        <div className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h12M3 18h6"/></svg>
                          Valor total até
                        </div>
                        <select value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                          <option value="">Escolha o valor</option>
                          <option value="20000000">R$ 200 mil</option>
                          <option value="40000000">R$ 400 mil</option>
                          <option value="60000000">R$ 600 mil</option>
                          <option value="100000000">R$ 1 milhão</option>
                        </select>
                      </label>
                      <label className="block">
                        <div className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7"/></svg>
                          Quartos
                        </div>
                        <select value={bedrooms} onChange={(e)=>setBedrooms(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                          <option value="">Nº de quartos</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                          <option value="4">4+</option>
                        </select>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="block">
                        <div className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z"/></svg>
                          Tipo
                        </div>
                        <select value={type} onChange={(e)=>setType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                          <option value="">Qualquer</option>
                          <option value="HOUSE">Casa</option>
                          <option value="APARTMENT">Apartamento</option>
                          <option value="CONDO">Condomínio</option>
                          <option value="STUDIO">Studio</option>
                          <option value="LAND">Terreno</option>
                          <option value="COMMERCIAL">Comercial</option>
                        </select>
                      </label>
                      <label className="block">
                        <div className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18v-6a3 3 0 016 0v6M5 10h14"/></svg>
                          Banheiros
                        </div>
                        <select value={bathrooms} onChange={(e)=>setBathrooms(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                          <option value="">Nº de banheiros</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                          <option value="4">4+</option>
                        </select>
                      </label>
                      <label className="block">
                        <div className="text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3z"/></svg>
                          Área mínima
                        </div>
                        <select value={areaMin} onChange={(e)=>setAreaMin(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                          <option value="">Qualquer</option>
                          <option value="50">50 m²</option>
                          <option value="80">80 m²</option>
                          <option value="100">100 m²</option>
                          <option value="150">150 m²</option>
                          <option value="200">200 m²</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button type="button" onClick={()=> setShowAdvanced(false)} className="text-gray-600 hover:text-gray-800">Voltar</button>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={()=> setOpenPanel(false)} className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">Fechar</button>
                        <button type="submit" className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow">Buscar</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
