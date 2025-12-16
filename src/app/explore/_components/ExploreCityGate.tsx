"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowRight, XCircle, Search, LocateFixed } from "lucide-react";

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
  const searchParams = useSearchParams();

  const savedLocationRef = useRef(false);

  const purpose = mode === "buy" ? "SALE" : "RENT";

  const [inferredCity, setInferredCity] = useState<string>("");
  const [inferredState, setInferredState] = useState<string>("");

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string>("");

  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [popular, setPopular] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");

  const queryRef = useRef<HTMLDivElement | null>(null);

  const title = mode === "buy" ? "Comprar" : "Alugar";

  const persistLocation = (city: string, state: string) => {
    try {
      if (!city || !state) return;
      localStorage.setItem(
        "explore:lastLocation",
        JSON.stringify({ city: String(city), state: String(state), t: Date.now() })
      );
    } catch {
    }
  };

  const requestPreciseLocation = async () => {
    setGeoError("");

    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError("Seu navegador não suporta localização.");
      return;
    }

    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 60_000,
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const r = await fetch(`/api/geo/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
        { cache: "no-store" }
      );
      const d = await r.json().catch(() => null);
      if (d?.success && d?.city && d?.state) {
        setInferredCity(String(d.city));
        setInferredState(String(d.state));
        savedLocationRef.current = true;
        persistLocation(String(d.city), String(d.state));
      } else {
        setGeoError("Não consegui identificar sua cidade automaticamente.");
      }
    } catch (e: any) {
      const code = typeof e?.code === "number" ? e.code : null;
      if (code === 1) setGeoError("Permissão de localização negada.");
      else if (code === 2) setGeoError("Não foi possível obter sua localização.");
      else if (code === 3) setGeoError("Tempo esgotado ao obter sua localização.");
      else setGeoError("Erro ao obter sua localização.");
    } finally {
      setGeoLoading(false);
    }
  };

  const propertyLabel = useMemo(() => {
    const t = (searchParams?.get("type") || "").toUpperCase();
    if (!t) return "imóveis";
    const map: Record<string, string> = {
      HOUSE: "casas",
      APARTMENT: "apartamentos",
      CONDO: "condomínios",
      LAND: "terrenos",
      COMMERCIAL: "imóveis comerciais",
      STUDIO: "studios",
    };
    return map[t] || "imóveis";
  }, [searchParams]);

  const passthroughParams = useMemo(() => {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    sp.delete("city");
    sp.delete("state");
    sp.delete("purpose");
    sp.delete("page");
    return sp;
  }, [searchParams]);

  const inferredReady = Boolean(inferredCity && inferredState);
  const inferredHref = useMemo(() => {
    const base = new URLSearchParams(passthroughParams);
    base.set("purpose", purpose);
    if (inferredCity) base.set("city", inferredCity);
    if (inferredState) base.set("state", inferredState);
    base.set("page", "1");
    return `/?${base.toString()}`;
  }, [inferredCity, inferredState, passthroughParams, purpose]);

  const manualReady = Boolean(selectedCity && selectedState);
  const manualHref = useMemo(() => {
    const base = new URLSearchParams(passthroughParams);
    base.set("purpose", purpose);
    if (selectedCity) base.set("city", selectedCity);
    if (selectedState) base.set("state", selectedState);
    base.set("page", "1");
    return `/?${base.toString()}`;
  }, [selectedCity, selectedState, passthroughParams, purpose]);

  useEffect(() => {
    let cancelled = false;

    try {
      const raw = localStorage.getItem("explore:lastLocation");
      if (raw) {
        const parsed = JSON.parse(raw);
        const city = typeof parsed?.city === "string" ? parsed.city.trim() : "";
        const state = typeof parsed?.state === "string" ? parsed.state.trim() : "";
        if (city && state) {
          setInferredCity(city);
          setInferredState(state);
          savedLocationRef.current = true;
        }
      }
    } catch {
    }

    const loadGuess = async () => {
      try {
        const r = await fetch("/api/geo/guess", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (savedLocationRef.current) return;
        if (d?.success && d?.city && d?.state) {
          const rawCity = String(d.city);
          let decodedCity = rawCity;
          try {
            decodedCity = decodeURIComponent(rawCity.replace(/\+/g, " "));
          } catch {
            decodedCity = rawCity;
          }
          setInferredCity(decodedCity);
          setInferredState(String(d.state));
        }
      } catch {
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

  const clearManual = () => {
    setSelectedCity("");
    setSelectedState("");
    setQuery("");
    setShowDropdown(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-10 lg:pt-96 lg:pb-96">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 border border-white/60">
        <MapPin className="w-4 h-4 text-teal-700" />
        <span className="text-xs font-semibold tracking-wide text-slate-700">Localização</span>
      </div>

      <div className="mt-5 rounded-3xl bg-white/85 backdrop-blur border border-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.12)] overflow-hidden">
        <div className="p-6 md:p-7">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Está procurando {propertyLabel} para <span className="text-teal-700">{title.toLowerCase()}</span> em{" "}
            <span className="text-slate-900">{inferredReady ? `${inferredCity}/${inferredState}` : "sua cidade"}</span>?
          </h1>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                if (inferredReady) persistLocation(inferredCity, inferredState);
                router.push(inferredHref);
              }}
              disabled={!inferredReady}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white font-semibold text-sm hover:opacity-95 transition-opacity disabled:opacity-60"
            >
              Sim, continuar pesquisa
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={requestPreciseLocation}
              disabled={geoLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {geoLoading ? "Localizando..." : "Usar minha localização"}
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>

          {geoError && <div className="mt-3 text-sm text-rose-700">{geoError}</div>}
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-white/85 backdrop-blur border border-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.12)] overflow-hidden">
        <div className="p-6 md:p-7">
          <div className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
            Está procurando em outra localidade?
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Search className="w-4 h-4" />
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

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                if (manualReady) persistLocation(selectedCity, selectedState);
                router.push(manualHref);
              }}
              disabled={!manualReady}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white font-semibold text-sm hover:opacity-95 transition-opacity disabled:opacity-60"
            >
              Continuar pesquisa
              <ArrowRight className="w-4 h-4" />
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
    </div>
  );
}
