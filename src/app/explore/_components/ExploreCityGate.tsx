"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowRight, XCircle, Search, Building2, ChevronDown } from "lucide-react";
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
      <section className="relative isolate overflow-hidden bg-[#f4f0e8]">
        <div className="absolute inset-0">
          <Image
            src={content.images[0]}
            alt={content.title}
            fill
            priority
            sizes="100vw"
            className="object-cover scale-110 blur-2xl"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.48),rgba(7,17,31,0.22))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(245,240,232,0.72),transparent_34%)]" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full max-w-5xl rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,248,243,0.93))] p-6 shadow-[0_28px_100px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0a1220] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
              <MapPin className="h-3.5 w-3.5 text-teal-300" />
              Localização e perfil do imóvel
            </div>

            <h1 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-[3rem]">
              Escolha a cidade e refine a busca se quiser
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              O tipo de imóvel é opcional. Se você não selecionar nada, mostramos todas as opções disponíveis para a cidade escolhida.
            </p>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
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
                    className="w-full rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
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
                    className="w-full appearance-none rounded-[24px] border border-slate-200 bg-white px-5 py-4 pr-12 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
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

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                >
                  Limpar seleção
                  <XCircle className="h-4 w-4" />
                </button>
              )}

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
              >
                Voltar para a home
              </Link>
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
