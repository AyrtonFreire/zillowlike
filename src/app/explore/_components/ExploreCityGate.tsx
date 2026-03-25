"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowRight, XCircle, Search, Building2, ChevronDown, Sparkles } from "lucide-react";
import { ACTIVE_PROPERTY_TYPE_OPTIONS } from "@/lib/i18n/property";

type Mode = "buy" | "rent";
type ExploreCityGateVariant = "default" | "immersive";

type LocationSuggestion = {
  label: string;
  city: string;
  state: string;
  neighborhood: string | null;
  count?: number;
};

const PROPERTY_TYPE_OPTIONS = [{ value: "", label: "Todos os tipos" }, ...ACTIVE_PROPERTY_TYPE_OPTIONS];

const MODE_CONTENT: Record<
  Mode,
  {
    badge: string;
    title: string;
    description: string;
    cta: string;
    popularLabel: string;
    highlights: string[];
    images: string[];
  }
> = {
  buy: {
    badge: "Compra guiada",
    title: "Encontre imóveis marcantes na cidade certa",
    description:
      "Uma experiência mais elegante para começar sua busca: escolha a cidade, refine pelo tipo se quiser e abra os resultados já no contexto ideal.",
    cta: "Ver imóveis à venda",
    popularLabel: "Cidades em destaque para compra",
    highlights: ["Casas exclusivas", "Apartamentos icônicos", "Tipo opcional"],
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  rent: {
    badge: "Locação premium",
    title: "Descubra aluguel com apresentação mais sofisticada",
    description:
      "Escolha sua cidade primeiro, adicione um tipo de imóvel se fizer sentido e entre em uma busca mais objetiva, moderna e agradável de usar.",
    cta: "Ver imóveis para alugar",
    popularLabel: "Cidades em alta para locação",
    highlights: ["Studios e apartamentos", "Casas prontas para morar", "Busca objetiva"],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

export default function ExploreCityGate({ mode, variant = "default" }: { mode: Mode; variant?: ExploreCityGateVariant }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const content = MODE_CONTENT[mode];

  const purpose = mode === "buy" ? "SALE" : "RENT";

  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [popular, setPopular] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>(() => {
    const initialType = String(searchParams?.get("type") || "");
    return PROPERTY_TYPE_OPTIONS.some((option) => option.value === initialType) ? initialType : "";
  });

  const queryRef = useRef<HTMLDivElement | null>(null);

  const passthroughParams = useMemo(() => {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    sp.delete("city");
    sp.delete("state");
    sp.delete("purpose");
    sp.delete("type");
    sp.delete("page");
    return sp;
  }, [searchParams]);

  const manualReady = Boolean(selectedCity && selectedState);
  const manualHref = useMemo(() => {
    const base = new URLSearchParams(passthroughParams);
    base.set("purpose", purpose);
    if (selectedCity) base.set("city", selectedCity);
    if (selectedState) base.set("state", selectedState);
    if (selectedType) base.set("type", selectedType);
    base.set("page", "1");
    return `/?${base.toString()}`;
  }, [selectedCity, selectedState, selectedType, passthroughParams, purpose]);

  useEffect(() => {
    let cancelled = false;

    const loadPopular = async () => {
      try {
        const r = await fetch("/api/locations");
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (d?.success && Array.isArray(d.suggestions)) {
          setPopular(d.suggestions);
        }
      } catch {
      }
    };
    loadPopular();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (!queryRef.current?.contains(t)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", onDoc as EventListener, true);
    document.addEventListener("touchstart", onDoc as EventListener, true);
    return () => {
      document.removeEventListener("mousedown", onDoc as EventListener, true);
      document.removeEventListener("touchstart", onDoc as EventListener, true);
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`);
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (d?.success && Array.isArray(d.suggestions)) {
          setSuggestions(d.suggestions);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  const selectSuggestion = (s: LocationSuggestion) => {
    setSelectedCity(s.city);
    setSelectedState(s.state);
    setQuery(s.label);
    setShowDropdown(false);
  };

  const clearManual = () => {
    setSelectedCity("");
    setSelectedState("");
    setSelectedType("");
    setQuery("");
    setShowDropdown(false);
  };

  if (variant === "immersive") {
    return (
      <section className="relative overflow-hidden bg-[#f4f0e8] pb-16">
        <div className="absolute inset-x-0 top-0 h-[44rem] bg-[#0a1220]" />
        <div className="absolute inset-x-0 top-0 h-[44rem] bg-[radial-gradient(circle_at_top_left,rgba(34,197,166,0.22),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="max-w-2xl pt-10 sm:pt-16 lg:pt-20">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/82">{content.badge}</span>
              </div>
              <h1 className="mt-6 max-w-xl text-4xl font-display leading-tight text-white sm:text-5xl lg:text-[3.6rem]">
                {content.title}
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/72 sm:text-base">
                {content.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {content.highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-medium text-white/86 backdrop-blur-xl"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-4 pb-10">
              <div className="relative row-span-2 min-h-[420px] overflow-hidden rounded-[32px] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <Image
                  src={content.images[0]}
                  alt={content.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 28vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/68 via-transparent to-transparent" />
              </div>
              <div className="relative min-h-[200px] overflow-hidden rounded-[28px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <Image
                  src={content.images[1]}
                  alt={content.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 18vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/52 via-transparent to-transparent" />
              </div>
              <div className="relative min-h-[200px] overflow-hidden rounded-[28px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <Image
                  src={content.images[2]}
                  alt={content.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 18vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/52 via-transparent to-transparent" />
              </div>
            </div>
          </div>

          <div className="relative mt-10 pb-16 lg:-mt-2 lg:pb-20">
            <div className="absolute inset-0 rounded-[36px] bg-white/12 blur-3xl" />
            <div className="relative overflow-visible rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,248,243,0.92))] shadow-[0_26px_90px_rgba(15,23,42,0.24)] backdrop-blur-xl">
              <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:p-10">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#0a1220] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    <MapPin className="h-3.5 w-3.5 text-teal-300" />
                    Localização e perfil do imóvel
                  </div>
                  <div className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                    Escolha a cidade e refine a busca se quiser
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    O tipo de imóvel é opcional. Se você não selecionar nada, mostramos todas as opções disponíveis para a cidade escolhida.
                  </p>

                  <div className="mt-7 grid gap-5 lg:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <Search className="h-4 w-4" />
                        Cidade
                      </div>
                      <div ref={queryRef} className="relative mt-3">
                        <input
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedCity("");
                            setSelectedState("");
                          }}
                          onFocus={() => {
                            if (suggestions.length > 0) setShowDropdown(true);
                          }}
                          placeholder="Digite uma cidade (ex.: Petrolina)"
                          className="w-full rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />

                        {showDropdown && suggestions.length > 0 && (
                          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.15)]">
                            {suggestions.slice(0, 10).map((s, idx) => (
                              <button
                                key={`${s.city}-${s.state}-${idx}`}
                                type="button"
                                onClick={() => selectSuggestion(s)}
                                className="w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50"
                              >
                                <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                                <div className="text-xs text-slate-500">
                                  {s.city}, {s.state}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <Building2 className="h-4 w-4" />
                        Tipo de imóvel
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] tracking-[0.12em] text-slate-500">Opcional</span>
                      </div>
                      <div className="relative mt-3">
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="w-full appearance-none rounded-[24px] border border-slate-200 bg-white px-5 py-4 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        >
                          {PROPERTY_TYPE_OPTIONS.map((option) => (
                            <option key={option.value || "all-property-types"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {popular.length > 0 && (
                    <div className="mt-7">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{content.popularLabel}</div>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {popular.slice(0, 8).map((c, idx) => (
                          <button
                            key={`${c.city}-${c.state}-${idx}`}
                            type="button"
                            onClick={() => selectSuggestion(c)}
                            className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                          >
                            {c.city}/{c.state}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[30px] bg-[#0a1220] p-6 text-white shadow-[0_24px_70px_rgba(10,18,32,0.24)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Busca preparada</div>
                  <div className="mt-3 text-2xl font-semibold leading-tight">
                    {mode === "buy" ? "Monte sua busca de compra" : "Monte sua busca de locação"}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    {selectedCity && selectedState
                      ? `Você vai abrir resultados para ${selectedCity}/${selectedState}${selectedType ? ` com foco em ${PROPERTY_TYPE_OPTIONS.find((option) => option.value === selectedType)?.label?.toLowerCase()}` : ""}.`
                      : "Selecione uma cidade e, se desejar, um tipo de imóvel. O restante continua exatamente como já funciona hoje."}
                  </p>

                  <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Cidade</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">{selectedCity && selectedState ? `${selectedCity}/${selectedState}` : "Escolha uma cidade"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Tipo</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">{PROPERTY_TYPE_OPTIONS.find((option) => option.value === selectedType)?.label || "Todos os tipos"}</div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(manualHref)}
                      disabled={!manualReady}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-teal px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
                    >
                      {content.cta}
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    {(selectedCity || selectedState || query || selectedType) && (
                      <button
                        type="button"
                        onClick={clearManual}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
                      >
                        Limpar seleção
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}

                    <Link
                      href="/"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-transparent px-5 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/6"
                    >
                      Voltar para a home
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 backdrop-blur">
          <MapPin className="h-4 w-4 text-teal-700" />
          <span className="text-xs font-semibold tracking-wide text-slate-700">Localização</span>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="p-6 md:p-7">
            <div className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">
              Qual cidade deseja procurar
            </div>

            <div className="mt-3 grid gap-5 md:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Search className="h-4 w-4" />
                  Escolher cidade
                </div>

                <div ref={queryRef} className="relative mt-4">
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedCity("");
                      setSelectedState("");
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowDropdown(true);
                    }}
                    placeholder="Digite uma cidade (ex.: Petrolina)"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />

                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {suggestions.slice(0, 10).map((s, idx) => (
                        <button
                          key={`${s.city}-${s.state}-${idx}`}
                          type="button"
                          onClick={() => selectSuggestion(s)}
                          className="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 last:border-b-0"
                        >
                          <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                          <div className="text-xs text-slate-500">
                            {s.city}, {s.state}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Building2 className="h-4 w-4" />
                  Tipo de imóvel
                </div>
                <div className="relative mt-4">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-11 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {PROPERTY_TYPE_OPTIONS.map((option) => (
                      <option key={option.value || "all-property-types-default"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {popular.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cidades populares</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {popular.slice(0, 10).map((c, idx) => (
                    <button
                      key={`${c.city}-${c.state}-${idx}`}
                      type="button"
                      onClick={() => selectSuggestion(c)}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"
                    >
                      {c.city}/{c.state}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push(manualHref)}
                disabled={!manualReady}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                Continuar pesquisa
                <ArrowRight className="h-4 w-4" />
              </button>

              {(selectedCity || selectedState || query || selectedType) && (
                <button
                  type="button"
                  onClick={clearManual}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Limpar
                  <XCircle className="h-4 w-4" />
                </button>
              )}

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Voltar para a home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
