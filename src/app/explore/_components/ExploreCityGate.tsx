"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, LocateFixed, ArrowRight, XCircle, Search } from "lucide-react";
import { buildSearchParams } from "@/lib/url";

type Mode = "buy" | "rent";

type LocationSuggestion = {
  label: string;
  city: string;
  state: string;
  neighborhood: string | null;
  count?: number;
};

export default function ExploreCityGate({ mode }: { mode: Mode }) {
  const router = useRouter();

  const purpose = mode === "buy" ? "SALE" : "RENT";

  const [guessLoading, setGuessLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);

  const [inferredCity, setInferredCity] = useState<string>("");
  const [inferredState, setInferredState] = useState<string>("");
  const [inferredSource, setInferredSource] = useState<string>("");

  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [popular, setPopular] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");

  const [showManual, setShowManual] = useState(false);

  const queryRef = useRef<HTMLDivElement | null>(null);
  const manualRef = useRef<HTMLDivElement | null>(null);

  const title = mode === "buy" ? "Comprar" : "Alugar";

  const inferredReady = Boolean(inferredCity && inferredState);
  const inferredHref = useMemo(() => {
    const params = buildSearchParams({
      city: inferredCity || undefined,
      state: inferredState || undefined,
      purpose,
      page: 1,
    });
    return `/?${params}`;
  }, [inferredCity, inferredState, purpose]);

  const manualReady = Boolean(selectedCity && selectedState);
  const manualHref = useMemo(() => {
    const params = buildSearchParams({
      city: selectedCity || undefined,
      state: selectedState || undefined,
      purpose,
      page: 1,
    });
    return `/?${params}`;
  }, [selectedCity, selectedState, purpose]);

  useEffect(() => {
    let cancelled = false;

    const loadGuess = async () => {
      setGuessLoading(true);
      try {
        const r = await fetch("/api/geo/guess", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (d?.success && d?.city && d?.state) {
          setInferredCity(String(d.city));
          setInferredState(String(d.state));
          setInferredSource(String(d.source || "guess"));
        }
      } catch {
      } finally {
        if (!cancelled) setGuessLoading(false);
      }
    };

    const loadPopular = async () => {
      try {
        const r = await fetch("/api/locations", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (d?.success && Array.isArray(d.suggestions)) {
          setPopular(d.suggestions);
        }
      } catch {
      }
    };

    loadGuess();
    loadPopular();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showManual) return;
    const t = window.setTimeout(() => {
      manualRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [showManual]);

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
        const r = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
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

  const useGps = async () => {
    setGpsDenied(false);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsDenied(true);
      return;
    }

    setGpsLoading(true);

    const getPos = () =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 60_000,
        });
      });

    try {
      const pos = await getPos();
      const { latitude, longitude } = pos.coords;
      const r = await fetch(`/api/geo/reverse?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`, {
        cache: "no-store",
      });
      const d = await r.json().catch(() => null);

      if (d?.success && d?.city && d?.state) {
        setInferredCity(String(d.city));
        setInferredState(String(d.state));
        setInferredSource(String(d.source || "gps"));
        setSelectedCity("");
        setSelectedState("");
        setShowManual(false);
      } else {
        setGpsDenied(true);
      }
    } catch {
      setGpsDenied(true);
    } finally {
      setGpsLoading(false);
    }
  };

  const clearManual = () => {
    setSelectedCity("");
    setSelectedState("");
    setQuery("");
    setShowDropdown(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 border border-white/60">
        <MapPin className="w-4 h-4 text-teal-700" />
        <span className="text-xs font-semibold tracking-wide text-slate-700">Localização</span>
      </div>

      <div className="mt-5 rounded-3xl bg-white/85 backdrop-blur border border-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.12)] overflow-hidden">
        <div className="p-6 md:p-7">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Está procurando imóveis para <span className="text-teal-700">{title.toLowerCase()}</span> em{" "}
            <span className="text-slate-900">{inferredReady ? `${inferredCity}/${inferredState}` : "sua cidade"}</span>?
          </h1>

          <div className="mt-3 text-sm text-slate-600">
            {guessLoading
              ? "Carregando sugestão automática..."
              : inferredReady
              ? `Sugestão automática: ${inferredCity}/${inferredState}${inferredSource ? ` (${inferredSource})` : ""}`
              : "Não conseguimos inferir sua cidade agora. Você pode escolher manualmente."}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.push(inferredHref)}
              disabled={!inferredReady}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white font-semibold text-sm hover:opacity-95 transition-opacity disabled:opacity-60"
            >
              Sim, continuar pesquisa
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-sm hover:bg-slate-50"
            >
              Não, quero procurar em outra cidade
            </button>
          </div>
        </div>
      </div>

      {showManual && (
        <div ref={manualRef} className="mt-6 rounded-3xl bg-white/85 backdrop-blur border border-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.12)] overflow-hidden">
          <div className="p-6 md:p-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Search className="w-4 h-4" />
              Escolher outra cidade
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
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
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

            {popular.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cidades populares</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {popular.slice(0, 10).map((c, idx) => (
                    <button
                      key={`${c.city}-${c.state}-${idx}`}
                      type="button"
                      onClick={() => selectSuggestion(c)}
                      className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-sm font-semibold hover:bg-slate-200 transition-colors"
                    >
                      {c.city}/{c.state}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gpsDenied && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <XCircle className="w-5 h-5 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold">Não foi possível obter sua localização.</div>
                  <div className="opacity-90">Você pode permitir o GPS ou escolher a cidade manualmente.</div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push(manualHref)}
                disabled={!manualReady}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white font-semibold text-sm hover:opacity-95 transition-opacity disabled:opacity-60"
              >
                Continuar pesquisa
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={useGps}
                disabled={gpsLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                <LocateFixed className="w-4 h-4" />
                {gpsLoading ? "Obtendo localização..." : "Usar GPS"}
              </button>

              {(selectedCity || selectedState || query) && (
                <button
                  type="button"
                  onClick={clearManual}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-sm hover:bg-slate-50"
                >
                  Limpar
                  <XCircle className="w-4 h-4" />
                </button>
              )}

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-sm hover:bg-slate-50"
              >
                Voltar para a home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
