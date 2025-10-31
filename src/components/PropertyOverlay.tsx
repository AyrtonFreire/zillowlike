"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { ApiProperty } from "@/types/api";
import FinancingButton from "@/components/FinancingButton";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

type Props = {
  item: ApiProperty | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onOpenGallery: (index?: number) => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
};

export default function PropertyOverlay({ item, open, loading, onClose, onOpenGallery, favorites = [], onToggleFavorite }: Props) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'detalhes'|'caracteristicas'|'mapa'|'financiamento'>('detalhes');
  const [contactOpen, setContactOpen] = useState(false);
  const [tourDate, setTourDate] = useState<string>("");
  const [tourTime, setTourTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  // Focus trap basic: focus first actionable on open
  useEffect(() => {
    if (open && panelRef.current) {
      const first = panelRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }
  }, [open]);

  // Close on ESC (defensive; page also listens)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Inject fadeIn keyframes for subtle animations
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('overlay-fadein-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'overlay-fadein-keyframes';
    style.innerHTML = `@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(style);
  }, []);

  const isFav = item ? favorites.includes(item.id) : false;

  const gallery = useMemo(() => item?.images || [], [item]);

  const addressLine = useMemo(() => {
    if (!item) return "";
    const parts = [item.street, item.neighborhood, `${item.city}/${item.state}`].filter(Boolean);
    return parts.join(", ");
  }, [item]);

  function typeLabel(v?: string) {
    if (!v) return "";
    if (v === "HOUSE") return "Casa";
    if (v === "APARTMENT") return "Apartamento";
    if (v === "CONDO") return "Condomínio";
    if (v === "STUDIO") return "Studio";
    if (v === "LAND") return "Terreno";
    if (v === "COMMERCIAL") return "Comercial";
    return v;
  }

  // Do not render overlay at all when closed to avoid blocking clicks on the page
  if (!open) return null;

  return (
    <div className="hidden lg:block fixed inset-0 z-[3000]">
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="overlay-title"
        className={`absolute inset-y-4 left-1/2 -translate-x-1/2 w-[min(1400px,96vw)] bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col transition-all duration-300 ${open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}
      >
        {/* Modern Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="btn btn-ghost px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar à busca
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Share Button */}
            <button 
              aria-label="Compartilhar" 
              className="btn btn-secondary px-4 py-2 text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Compartilhar
            </button>
            
            {/* Favorite Button */}
            {item && (
              <button
                aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                onClick={() => onToggleFavorite?.(item.id)}
                className={`btn text-sm font-medium px-4 py-2 transition-all ${
                  isFav 
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                    : 'btn-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 000-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isFav ? 'Salvo' : 'Salvar'}
              </button>
            )}
            
            {/* Close Button */}
            <button 
              aria-label="Fechar" 
              onClick={onClose} 
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-16 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Carregando detalhes...</p>
            </div>
          ) : !item ? (
            <div className="p-16 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-600 font-medium text-lg">Imóvel não encontrado</p>
              <p className="text-gray-500 text-sm mt-1">Este imóvel pode ter sido removido ou não existe</p>
            </div>
          ) : (
            <div className="p-8 grid grid-cols-1 xl:grid-cols-12 gap-10">
              {/* Left: main content */}
              <div className="xl:col-span-8">
                {/* Modern Gallery */}
                <div className="grid grid-cols-12 gap-4 mb-8">
                  <div className="col-span-12">
                    {gallery?.[0]?.url ? (
                      <div className="relative group rounded-3xl overflow-hidden shadow-xl border border-gray-200/60">
                        <Image 
                          src={gallery[0].url} 
                          alt={item.title} 
                          width={1600} 
                          height={900} 
                          loading="lazy" 
                          className="w-full h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"/>
                        
                        {/* Gallery Controls */}
                        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {gallery.length > 1 && (
                              <span className="px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                                1 / {gallery.length}
                              </span>
                            )}
                          </div>
                          
                          {gallery.length > 1 && (
                            <button
                              className="btn btn-secondary px-4 py-2 text-sm font-medium bg-white/95 hover:bg-white shadow-lg backdrop-blur-sm"
                              onClick={() => onOpenGallery(0)}
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Ver todas as fotos
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-[400px] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 rounded-3xl border border-gray-200/60 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="font-medium">Sem fotos disponíveis</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Mosaic 2x2 thumbnails; last shows +N */}
                  {gallery.slice(1,5).map((img, i) => {
                    const idx = i + 1;
                    const isLast = i === 3 && gallery.length > 5;
                    const remaining = Math.max(0, gallery.length - 5);
                    return (
                      <button key={img.id || i} className="col-span-3 group relative" onClick={() => onOpenGallery(idx)}>
                        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                          <Image src={img.url} alt={item.title} width={800} height={600} loading="lazy" className="w-full h-28 object-cover transition-transform duration-500 group-hover:scale-[1.03]"/>
                        </div>
                        {isLast && remaining > 0 && (
                          <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center rounded-xl text-sm font-semibold">+{remaining} fotos</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Modern Property Header */}
                <div className="mb-8">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="badge badge-success">Ativo</span>
                        {typeLabel(item.type) && (
                          <span className="badge badge-neutral">{typeLabel(item.type)}</span>
                        )}
                      </div>
                      
                      <h2 id="overlay-title" className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-3">
                        R$ {(item.price/100).toLocaleString('pt-BR')}
                      </h2>
                      
                      <div className="flex items-center gap-2 text-gray-600 mb-4">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12.414a6 6 0 10-8.485 0l4.243 4.243a1 1 0 001.414 0z" />
                        </svg>
                        <span className="text-base font-medium" title={addressLine}>{addressLine}</span>
                      </div>
                      
                      <div className="mb-4">
                        <FinancingButton 
                          propertyId={item.id} 
                          propertyValue={item.price}
                          className="btn btn-primary px-6 py-3 text-base font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                      {/* Badges de status */}
                      <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Ativo</span>
                      {typeLabel(item.type) && (
                        <span className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200">{typeLabel(item.type)}</span>
                      )}
                      {item.areaM2 && (
                        <span className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200">{item.areaM2} m²</span>
                      )}
                    </div>
                  </div>
                    {/* Property Features */}
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      {item.areaM2 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          <span className="font-semibold text-gray-900">{item.areaM2}</span>
                          <span className="text-gray-600">m²</span>
                        </div>
                      )}
                      
                      {item.bedrooms != null && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M5 10v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
                          </svg>
                          <span className="font-semibold text-gray-900">{item.bedrooms}</span>
                          <span className="text-gray-600">{item.bedrooms === 1 ? 'quarto' : 'quartos'}</span>
                        </div>
                      )}
                      
                      {item.bathrooms != null && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                          </svg>
                          <span className="font-semibold text-gray-900">{Number(item.bathrooms)}</span>
                          <span className="text-gray-600">{Number(item.bathrooms) === 1 ? 'banheiro' : 'banheiros'}</span>
                        </div>
                      )}
                    </div>
                  {/* Counters */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8"/></svg>
                      22 dias
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S3.732 16.057 2.458 12z"/></svg>
                      7k views
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>
                      394 saves
                    </span>
                  </div>
                </div>

                {/* What's special */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">Destaques</h3>
                  </div>
                  <p className={`text-gray-700 text-sm leading-relaxed ${showMore ? '' : 'line-clamp-4'}`}>
                    {item.description || 'Sem descrição disponível.'}
                  </p>
                  <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium" onClick={() => setShowMore(v => !v)}>
                    {showMore ? 'Mostrar menos' : 'Mostrar mais'}
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* Chips exemplos */}
                    {typeLabel(item.type) && <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">{typeLabel(item.type)}</span>}
                    {item.areaM2 && <span className="px-2 py-1 rounded-full text-xs bg-green-50 text-green-700 border border-green-200 shadow-sm">{item.areaM2} m²</span>}
                  </div>
                </div>

                {/* Mini-mapa */}
                {(item.latitude && item.longitude) && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Localização</h3>
                    <div className="h-64 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                      <Map
                        items={[{ id: item.id, latitude: item.latitude, longitude: item.longitude, price: item.price } as any]}
                        centerZoom={{ center: [item.latitude as number, item.longitude as number], zoom: 15 }}
                        autoFit={false}
                        hideRefitButton
                      />
                    </div>
                  </div>
                )}

                {/* Facts & features */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">Características</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <div className="font-semibold text-gray-900 mb-3">Interior</div>
                      <div className="divide-y divide-gray-100">
                        {item.bedrooms != null && (
                          <div className="py-2 flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-gray-600"><svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h18M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7" strokeLinecap="round" strokeLinejoin="round"/></svg>Quartos</span>
                            <span className="font-medium text-gray-900">{item.bedrooms}</span>
                          </div>
                        )}
                        {item.bathrooms != null && (
                          <div className="py-2 flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-gray-600"><svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18v-6a3 3 0 016 0v6M5 10h14" strokeLinecap="round" strokeLinejoin="round"/></svg>Banheiros</span>
                            <span className="font-medium text-gray-900">{Number(item.bathrooms)}</span>
                          </div>
                        )}
                        {item.areaM2 != null && (
                          <div className="py-2 flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-gray-600"><svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h18v18H3z" strokeLinecap="round" strokeLinejoin="round"/></svg>Área interna</span>
                            <span className="font-medium text-gray-900">{item.areaM2} m²</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <div className="font-semibold text-gray-900 mb-3">Propriedade</div>
                      <div className="divide-y divide-gray-100">
                        <div className="py-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 text-gray-600"><svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16v12H4z" strokeLinecap="round" strokeLinejoin="round"/></svg>Tipo</span>
                          <span className="font-medium text-gray-900">{typeLabel(item.type) || '—'}</span>
                        </div>
                        <div className="py-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 text-gray-600"><svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v8m-4-4h8" strokeLinecap="round" strokeLinejoin="round"/></svg>Preço</span>
                          <span className="font-medium text-gray-900">R$ {(item.price/100).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: CTA panel */}
              <div className="xl:col-span-4">
                <div className="sticky top-4 space-y-4">
                  <div className="rounded-2xl border border-gray-200 p-5 shadow-md">
                    <div className="text-lg font-semibold text-gray-900 mb-3">Agendar visita</div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <input type="date" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" value={tourDate} onChange={(e)=>setTourDate(e.target.value)} />
                      <input type="time" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" value={tourTime} onChange={(e)=>setTourTime(e.target.value)} />
                    </div>
                    <button className="w-full glass-teal text-white px-4 py-3 rounded-xl font-semibold shadow-sm">Solicitar tour</button>
                    <button className="mt-2 w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-3 rounded-xl font-semibold" onClick={()=>setContactOpen(true)}>Falar com agente</button>
                  </div>
                  <div className="rounded-2xl border border-gray-200 p-5 text-sm text-gray-600 shadow-sm">
                    <div className="mb-2 font-medium text-gray-800">Acompanhamento</div>
                    <div className="flex items-center gap-6">
                      <div><b>—</b> dias</div>
                      <div><b>—</b> views</div>
                      <div><b>—</b> saves</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Contact modal */}
        {contactOpen && (
          <div className="fixed inset-0 z-[3500]">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setContactOpen(false)} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white w-[min(520px,92vw)] rounded-2xl shadow-2xl p-5 animate-[fadeIn_.2s_ease]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Contato com agente</h3>
                <button aria-label="Fechar" className="text-gray-500 hover:text-gray-700" onClick={()=>setContactOpen(false)}>✕</button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Seu nome" className="px-3 py-2 rounded-lg border border-gray-300" />
                <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Telefone" className="px-3 py-2 rounded-lg border border-gray-300" />
                <textarea value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Mensagem" className="px-3 py-2 rounded-lg border border-gray-300 min-h-[90px]" />
                <button className="mt-1 w-full glass-teal text-white px-4 py-3 rounded-xl font-semibold">Enviar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
