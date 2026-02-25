import { NextRequest, NextResponse } from "next/server";

type CacheEntry = { v: any; t: number };
const memCache = new Map<string, CacheEntry>();
const MEM_MAX = 500;
const MEM_TTL_MS = 24 * 60 * 60 * 1000;

async function redisGet(key: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

async function redisSetEx(key: string, value: any, ttlSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    const res = await fetch(
      `${url}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(JSON.stringify(value))}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round(n: number, p = 3) {
  return Math.round(n * Math.pow(10, p)) / Math.pow(10, p);
}

function touchMem(key: string, value: CacheEntry) {
  if (memCache.has(key)) memCache.delete(key);
  memCache.set(key, value);
  if (memCache.size > MEM_MAX) {
    const first = memCache.keys().next().value as string | undefined;
    if (first) memCache.delete(first);
  }
}

type PlaceItem = {
  name: string;
  lat: number;
  lng: number;
  placeId: string;
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
  address?: string;
};

function dedupe(items: PlaceItem[]) {
  const seen = new Set<string>();
  const out: PlaceItem[] = [];
  for (const it of items) {
    const k = it.placeId || `${it.name}:${it.lat}:${it.lng}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      ...it,
      name: it.name.length > 35 ? it.name.slice(0, 32) + "..." : it.name,
    });
  }
  return out;
}

function emptyPayload() {
  return {
    schools: [],
    markets: [],
    pharmacies: [],
    restaurants: [],
    hospitals: [],
    malls: [],
    parks: [],
    gyms: [],
    fuel: [],
    bakeries: [],
    banks: [],
  } as Record<string, PlaceItem[]>;
}

async function searchNearby(params: {
  key: string;
  lat: number;
  lng: number;
  radius: number;
  includedTypes: string[];
  maxResultCount: number;
}) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": params.key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.types,places.primaryType,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.shortFormattedAddress",
    },
    body: JSON.stringify({
      includedTypes: params.includedTypes,
      maxResultCount: params.maxResultCount,
      rankPreference: "DISTANCE",
      languageCode: "pt-BR",
      regionCode: "BR",
      locationRestriction: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: params.radius,
        },
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Places error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const places = Array.isArray(data?.places) ? data.places : [];
  return places as any[];
}

function normalizePlaces(raw: any[], perCategory: number) {
  const payload = emptyPayload();

  const toItem = (p: any): PlaceItem | null => {
    const placeId = String(p?.id || "");
    const name = String(p?.displayName?.text || "").trim();
    const lat = Number(p?.location?.latitude);
    const lng = Number(p?.location?.longitude);
    if (!placeId || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const rating = Number(p?.rating);
    const userRatingCount = Number(p?.userRatingCount);
    const openNow = typeof p?.currentOpeningHours?.openNow === "boolean" ? p.currentOpeningHours.openNow : undefined;
    const address = typeof p?.shortFormattedAddress === "string" ? p.shortFormattedAddress : undefined;
    return {
      placeId,
      name,
      lat,
      lng,
      rating: Number.isFinite(rating) ? rating : undefined,
      userRatingCount: Number.isFinite(userRatingCount) ? userRatingCount : undefined,
      openNow,
      address,
    };
  };

  const pushIf = (items: PlaceItem[], p: any) => {
    const it = toItem(p);
    if (!it) return;
    items.push(it);
  };

  for (const p of raw) {
    const types: string[] = Array.isArray(p?.types) ? p.types : [];
    const primaryType: string | undefined = typeof p?.primaryType === "string" ? p.primaryType : undefined;
    const all = new Set<string>([...types, ...(primaryType ? [primaryType] : [])]);

    if (all.has("school")) pushIf(payload.schools, p);
    if (all.has("supermarket")) pushIf(payload.markets, p);
    if (all.has("pharmacy")) pushIf(payload.pharmacies, p);
    if (all.has("restaurant")) pushIf(payload.restaurants, p);
    if (all.has("hospital")) pushIf(payload.hospitals, p);
    if (all.has("shopping_mall")) pushIf(payload.malls, p);
    if (all.has("park")) pushIf(payload.parks, p);
    if (all.has("gym")) pushIf(payload.gyms, p);
    if (all.has("gas_station")) pushIf(payload.fuel, p);
    if (all.has("bakery")) pushIf(payload.bakeries, p);
    if (all.has("bank") || all.has("atm")) pushIf(payload.banks, p);
  }

  for (const k of Object.keys(payload)) {
    payload[k] = dedupe(payload[k]).slice(0, perCategory);
  }

  return payload;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const radius = clamp(Number(searchParams.get("radius") || 2000), 200, 5000);
    const perCat = clamp(Number(searchParams.get("perCat") || 10), 1, 10);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ ok: false, error: "lat/lng required", ...emptyPayload() }, { status: 400 });
    }

    const key =
      (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Missing GOOGLE_PLACES_API_KEY", ...emptyPayload() },
        { status: 500 }
      );
    }

    const cacheKey = `plcnb:v2:${round(lat, 3)}:${round(lng, 3)}:${radius}:${perCat}`;

    const cachedRedis = await redisGet(cacheKey);
    if (cachedRedis) {
      const res = NextResponse.json({ ok: true, cached: true, source: "google_places", ...cachedRedis }, { status: 200 });
      res.headers.set("Cache-Control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
      return res;
    }

    const now = Date.now();
    const cachedMem = memCache.get(cacheKey);
    if (cachedMem && now - cachedMem.t <= MEM_TTL_MS) {
      const res = NextResponse.json({ ok: true, cached: true, source: "google_places", ...cachedMem.v }, { status: 200 });
      res.headers.set("Cache-Control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
      return res;
    }

    const [batch1, batch2] = await Promise.all([
      searchNearby({
        key,
        lat,
        lng,
        radius,
        includedTypes: ["school", "pharmacy", "supermarket", "restaurant"],
        maxResultCount: 20,
      }),
      searchNearby({
        key,
        lat,
        lng,
        radius,
        includedTypes: ["bank", "atm", "gas_station", "bakery", "hospital", "shopping_mall", "park", "gym"],
        maxResultCount: 20,
      }),
    ]);

    const merged = [...batch1, ...batch2];
    const payload = normalizePlaces(merged, perCat);

    touchMem(cacheKey, { v: payload, t: now });
    await redisSetEx(cacheKey, payload, 7 * 24 * 60 * 60);

    const out = NextResponse.json({ ok: true, cached: false, source: "google_places", ...payload }, { status: 200 });
    out.headers.set("Cache-Control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
    return out;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), ...emptyPayload() },
      { status: 502 }
    );
  }
}
