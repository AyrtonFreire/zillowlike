export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

// Free geocoding using Nominatim (OpenStreetMap). Simple in-memory cache (5 min)
const cache = new Map<string, { t: number; v: GeocodeResult }>();

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const key = query.trim().toLowerCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.t < 5 * 60_000) return hit.v;

  if (typeof window !== "undefined") {
    const url = new URL("/api/geocode", window.location.origin);
    url.searchParams.set("q", query);
    const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as any;
    const result = (data?.result || null) as GeocodeResult | null;
    if (result) cache.set(key, { t: now, v: result });
    return result;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "zillowlike/1.0 (personal non-commercial)",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as any[];
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  const result: GeocodeResult = {
    lat: Number(first.lat),
    lng: Number(first.lon),
    displayName: first.display_name as string,
  };
  cache.set(key, { t: now, v: result });
  return result;
}

// Structured geocoding using explicit parts with robust fallbacks
export async function geocodeAddressParts(opts: {
  street?: string;
  number?: string | number;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string; // default Brazil
}): Promise<GeocodeResult | null> {
  const {
    street = "",
    number = "",
    neighborhood = "",
    city = "",
    state = "",
    postalCode = "",
    country = "Brazil",
  } = opts || {};

  if (typeof window !== "undefined") {
    const url = new URL("/api/geocode", window.location.origin);
    if (street) url.searchParams.set("street", street);
    if (number != null && String(number).trim()) url.searchParams.set("number", String(number));
    if (neighborhood) url.searchParams.set("neighborhood", neighborhood);
    if (city) url.searchParams.set("city", city);
    if (state) url.searchParams.set("state", state);
    if (postalCode) url.searchParams.set("postalCode", postalCode);
    if (country) url.searchParams.set("country", country);
    const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as any;
    return (data?.result || null) as GeocodeResult | null;
  }

  // 1) Structured query with parts
  const url = new URL("https://nominatim.openstreetmap.org/search");
  const streetLine = [street, number].filter(Boolean).join(" ");
  if (streetLine) url.searchParams.set("street", streetLine);
  if (city) url.searchParams.set("city", city);
  if (state) url.searchParams.set("state", state);
  if (postalCode) url.searchParams.set("postalcode", postalCode);
  if (country) url.searchParams.set("country", country);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const res1 = await fetch(url.toString(), {
    headers: {
      "User-Agent": "zillowlike/1.0 (personal non-commercial)",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    method: "GET",
    cache: "no-store",
  });
  if (res1.ok) {
    const data = (await res1.json()) as any[];
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      return {
        lat: Number(first.lat),
        lng: Number(first.lon),
        displayName: first.display_name as string,
      };
    }
  }

  // 2) Freeform attempts with permutations
  const candidates: string[] = [];
  const base = [street && number ? `${street}, ${number}` : street, neighborhood, city, state, postalCode]
    .filter(Boolean)
    .join(", ");
  if (base) candidates.push(base);
  // without neighborhood
  candidates.push([street && number ? `${street}, ${number}` : street, city, state, postalCode].filter(Boolean).join(", "));
  // postalCode + city/state only
  if (postalCode) candidates.push([postalCode, city, state].filter(Boolean).join(", "));
  // street + number + city only
  candidates.push([street && number ? `${street}, ${number}` : street, city].filter(Boolean).join(", "));

  for (const q of candidates) {
    if (!q) continue;
    const r = await geocodeAddress(q);
    if (r) return r;
  }
  return null;
}


