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


