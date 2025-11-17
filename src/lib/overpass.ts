// Utilities for robust Overpass API fetching with mirrors, retries, timeout and local cache

export type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
];

const DEFAULT_TIMEOUT = 10000; // 10s
const DEFAULT_BACKOFFS = [750, 1500, 3000];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_VERSION = 'v2';

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function makeCacheKey(lat: number, lng: number, radius: number, queryHash: string) {
  const latKey = lat.toFixed(3);
  const lngKey = lng.toFixed(3);
  return `poi:${CACHE_VERSION}:${latKey}:${lngKey}:${radius}:${queryHash}`;
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

export async function fetchOverpassPOIs({
  lat,
  lng,
  radius = 2000,
  timeoutMs = DEFAULT_TIMEOUT,
}: {
  lat: number;
  lng: number;
  radius?: number;
  timeoutMs?: number;
}): Promise<OverpassElement[]> {
  const query = `
    [out:json][timeout:25];
    (
      nwr(around:${radius},${lat},${lng})[amenity=school];
      nwr(around:${radius},${lat},${lng})[shop=supermarket];
      nwr(around:${radius},${lat},${lng})[amenity=pharmacy];
      nwr(around:${radius},${lat},${lng})[amenity=restaurant];
      nwr(around:${radius},${lat},${lng})[amenity=hospital];
      nwr(around:${radius},${lat},${lng})[amenity=clinic];
      nwr(around:${radius},${lat},${lng})[leisure=park];
      nwr(around:${radius},${lat},${lng})[leisure=fitness_centre];
      nwr(around:${radius},${lat},${lng})[amenity=fitness_centre];
      nwr(around:${radius},${lat},${lng})[amenity=fuel];
      nwr(around:${radius},${lat},${lng})[shop=bakery];
      nwr(around:${radius},${lat},${lng})[amenity=bank];
      nwr(around:${radius},${lat},${lng})[amenity=atm];
      nwr(around:${radius},${lat},${lng})[shop=mall];
      nwr(around:${radius},${lat},${lng})[amenity=marketplace];
    );
    out center 30;
  `;

  const qHash = hashString(query);
  const cacheKey = makeCacheKey(lat, lng, radius, qHash);

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Date.now() - parsed.t <= CACHE_TTL_MS) {
        return parsed.v as OverpassElement[];
      }
    }
  } catch {}

  // rotate mirrors with retries and backoff
  let lastErr: any = null;
  for (let m = 0; m < MIRRORS.length; m++) {
    const url = MIRRORS[m];
    for (let r = 0; r < DEFAULT_BACKOFFS.length; r++) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: query,
          signal: controller.signal,
        });
        clearTimeout(tid);

        if (!res.ok) {
          lastErr = new Error(`Overpass error ${res.status}`);
          await sleep(DEFAULT_BACKOFFS[r]);
          continue;
        }
        const data = await res.json();
        const elements: OverpassElement[] = data?.elements || [];
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), v: elements }));
        } catch {}
        return elements;
      } catch (e) {
        lastErr = e;
        await sleep(DEFAULT_BACKOFFS[r]);
      }
    }
  }

  // All attempts failed
  throw lastErr || new Error('Overpass fetch failed');
}

export function normalizePOIs(elements: OverpassElement[]) {
  const mapItem = (el: OverpassElement) => {
    const name = el.tags?.name || el.tags?.brand || '';
    const lat = typeof el.lat === 'number' ? el.lat : el.center?.lat;
    const lng = typeof el.lon === 'number' ? el.lon : el.center?.lon;
    return { name, lat, lng };
  };

  const clean = (arr: any[]) => {
    const filtered = arr
      .map(mapItem)
      .filter((p) => p.name && p.name.toLowerCase() !== 'local' && typeof p.lat === 'number' && typeof p.lng === 'number');
    const seen = new Set<string>();
    return filtered.filter((p) => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  };

  const pick = (predicate: (el: OverpassElement) => boolean) => clean(elements.filter(predicate)).slice(0, 10).map((p) => ({
    ...p,
    name: p.name.length > 35 ? p.name.slice(0, 32) + '...' : p.name,
  }));

  return {
    schools: pick((el) => el.tags?.amenity === 'school'),
    markets: pick((el) => el.tags?.shop === 'supermarket'),
    pharmacies: pick((el) => el.tags?.amenity === 'pharmacy'),
    restaurants: pick((el) => el.tags?.amenity === 'restaurant'),
    hospitals: pick((el) => el.tags?.amenity === 'hospital'),
    clinics: pick((el) => el.tags?.amenity === 'clinic'),
    parks: pick((el) => el.tags?.leisure === 'park'),
    gyms: pick((el) => el.tags?.leisure === 'fitness_centre' || el.tags?.amenity === 'fitness_centre'),
    fuel: pick((el) => el.tags?.amenity === 'fuel'),
    bakeries: pick((el) => el.tags?.shop === 'bakery'),
    banks: pick((el) => el.tags?.amenity === 'bank' || el.tags?.amenity === 'atm'),
    malls: pick((el) => el.tags?.shop === 'mall' || el.tags?.amenity === 'marketplace'),
  } as const;
}
