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

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function bayesianAdjustedRating(rating: number | undefined, reviews: number | undefined) {
  const r = typeof rating === "number" && Number.isFinite(rating) ? rating : 0;
  const v = typeof reviews === "number" && Number.isFinite(reviews) ? reviews : 0;
  if (v <= 0 || r <= 0) return 0;
  const prior = 4.3;
  const m = 30;
  return (r * v + prior * m) / (v + m);
}

function placeScore(params: {
  distM: number;
  radiusM: number;
  rating?: number;
  userRatingCount?: number;
}) {
  const distScore = clamp01(1 - params.distM / Math.max(200, params.radiusM));
  const adj = bayesianAdjustedRating(params.rating, params.userRatingCount);
  const ratingScore = adj > 0 ? clamp01((adj - 3.5) / 1.5) : 0;
  const reviews = typeof params.userRatingCount === "number" && Number.isFinite(params.userRatingCount) ? params.userRatingCount : 0;
  const reviewsScore = reviews > 0 ? clamp01(Math.log1p(reviews) / Math.log1p(500)) : 0;
  const confDen = Math.max(1e-9, Math.log1p(50) - Math.log1p(5));
  const confidence = reviews > 0 ? clamp01((Math.log1p(reviews) - Math.log1p(5)) / confDen) : 0;
  const ratingConfident = ratingScore * confidence;
  return 0.55 * ratingConfident + 0.25 * reviewsScore + 0.2 * distScore;
}

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
    const err: any = new Error(`Places error ${res.status}: ${txt.slice(0, 600)}`);
    err.status = res.status;
    err.upstream = txt.slice(0, 2000);
    throw err;
  }

  const data = await res.json();
  const places = Array.isArray(data?.places) ? data.places : [];
  return places as any[];
}

function normalizePlaces(raw: any[], perCategory: number, origin: { lat: number; lng: number }, radiusM: number) {
  const payload = emptyPayload();

  type RankedItem = PlaceItem & { _score: number; _distM: number; _adj: number; _reviews: number };
  const buckets = emptyPayload() as Record<string, RankedItem[]>;

  const thresholds: Record<string, { minReviews: number; minAdj: number }> = {
    schools: { minReviews: 3, minAdj: 4.0 },
    markets: { minReviews: 10, minAdj: 4.1 },
    pharmacies: { minReviews: 10, minAdj: 4.1 },
    restaurants: { minReviews: 15, minAdj: 4.2 },
    hospitals: { minReviews: 10, minAdj: 4.1 },
    malls: { minReviews: 10, minAdj: 4.1 },
    parks: { minReviews: 5, minAdj: 4.1 },
    gyms: { minReviews: 10, minAdj: 4.2 },
    fuel: { minReviews: 10, minAdj: 4.0 },
    bakeries: { minReviews: 10, minAdj: 4.2 },
    banks: { minReviews: 5, minAdj: 4.0 },
  };

  const policy: Record<string, { allowNoReviewsFill: boolean; minSignalToStopFill: number }> = {
    schools: { allowNoReviewsFill: true, minSignalToStopFill: 2 },
    markets: { allowNoReviewsFill: false, minSignalToStopFill: 4 },
    pharmacies: { allowNoReviewsFill: false, minSignalToStopFill: 4 },
    restaurants: { allowNoReviewsFill: false, minSignalToStopFill: 6 },
    hospitals: { allowNoReviewsFill: false, minSignalToStopFill: 3 },
    malls: { allowNoReviewsFill: false, minSignalToStopFill: 3 },
    parks: { allowNoReviewsFill: true, minSignalToStopFill: 3 },
    gyms: { allowNoReviewsFill: false, minSignalToStopFill: 4 },
    fuel: { allowNoReviewsFill: false, minSignalToStopFill: 3 },
    bakeries: { allowNoReviewsFill: false, minSignalToStopFill: 4 },
    banks: { allowNoReviewsFill: false, minSignalToStopFill: 3 },
  };

  const toItem = (p: any): RankedItem | null => {
    const placeId = String(p?.id || "");
    const name = String(p?.displayName?.text || "").trim();
    const lat = Number(p?.location?.latitude);
    const lng = Number(p?.location?.longitude);
    if (!placeId || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const rating = Number(p?.rating);
    const userRatingCount = Number(p?.userRatingCount);
    const openNow = typeof p?.currentOpeningHours?.openNow === "boolean" ? p.currentOpeningHours.openNow : undefined;
    const address = typeof p?.shortFormattedAddress === "string" ? p.shortFormattedAddress : undefined;
    const reviews = Number.isFinite(userRatingCount) ? userRatingCount : 0;
    const adj = bayesianAdjustedRating(Number.isFinite(rating) ? rating : undefined, reviews);
    const distM = haversineMeters(origin.lat, origin.lng, lat, lng);
    const score = placeScore({ distM, radiusM, rating: Number.isFinite(rating) ? rating : undefined, userRatingCount: reviews });
    return {
      placeId,
      name,
      lat,
      lng,
      rating: Number.isFinite(rating) ? rating : undefined,
      userRatingCount: Number.isFinite(userRatingCount) ? userRatingCount : undefined,
      openNow,
      address,
      _score: score,
      _distM: distM,
      _adj: adj,
      _reviews: reviews,
    };
  };

  const pushIf = (items: RankedItem[], p: any) => {
    const it = toItem(p);
    if (!it) return;
    items.push(it);
  };

  for (const p of raw) {
    const types: string[] = Array.isArray(p?.types) ? p.types : [];
    const primaryType: string | undefined = typeof p?.primaryType === "string" ? p.primaryType : undefined;
    const all = new Set<string>([...types, ...(primaryType ? [primaryType] : [])]);

    if (all.has("school")) pushIf(buckets.schools, p);
    if (all.has("supermarket")) pushIf(buckets.markets, p);
    if (all.has("pharmacy")) pushIf(buckets.pharmacies, p);
    if (all.has("restaurant")) pushIf(buckets.restaurants, p);
    if (all.has("hospital")) pushIf(buckets.hospitals, p);
    if (all.has("shopping_mall")) pushIf(buckets.malls, p);
    if (all.has("park")) pushIf(buckets.parks, p);
    if (all.has("gym")) pushIf(buckets.gyms, p);
    if (all.has("gas_station")) pushIf(buckets.fuel, p);
    if (all.has("bakery")) pushIf(buckets.bakeries, p);
    if (all.has("bank") || all.has("atm")) pushIf(buckets.banks, p);
  }

  const rankBucket = (k: string, items: RankedItem[]) => {
    const t = thresholds[k] || { minReviews: 10, minAdj: 4.1 };
    const p = policy[k] || { allowNoReviewsFill: false, minSignalToStopFill: 4 };
    const sorted = [...items].sort((a, b) => b._score - a._score);
    const preferred = sorted.filter((x) => x._adj >= t.minAdj && x._reviews >= t.minReviews);
    const preferredIds = new Set(preferred.map((x) => x.placeId));
    const fill = sorted.filter((x) => !preferredIds.has(x.placeId));
    const minSignalReviews = Math.max(3, Math.floor(t.minReviews / 2));
    const fillWithSomeSignal = fill.filter((x) => x._reviews >= minSignalReviews && x._adj > 0);
    const fillWithSomeSignalIds = new Set(fillWithSomeSignal.map((x) => x.placeId));
    const fillRemaining = fill.filter((x) => !fillWithSomeSignalIds.has(x.placeId));
    const picked: PlaceItem[] = [];
    for (const it of preferred) {
      picked.push(it);
      if (picked.length >= perCategory) break;
    }
    const minPreferredToStopFill = Math.min(perCategory, Math.max(4, Math.ceil(perCategory * 0.6)));
    if (picked.length >= minPreferredToStopFill) {
      payload[k] = dedupe(picked).slice(0, perCategory);
      return;
    }

    if (picked.length < perCategory) {
      for (const it of fillWithSomeSignal) {
        picked.push(it);
        if (picked.length >= perCategory) break;
      }
    }
    const minSignalToStopFill = Math.min(perCategory, Math.max(1, p.minSignalToStopFill));
    if (picked.length >= minSignalToStopFill && !p.allowNoReviewsFill) {
      payload[k] = dedupe(picked).slice(0, perCategory);
      return;
    }

    if (picked.length < perCategory && p.allowNoReviewsFill) {
      for (const it of fillRemaining) {
        picked.push(it);
        if (picked.length >= perCategory) break;
      }
    }
    payload[k] = dedupe(picked).slice(0, perCategory);
  };

  for (const k of Object.keys(payload)) {
    rankBucket(k, buckets[k] || []);
  }

  return payload;
}

export async function GET(req: NextRequest) {
  let keySource = "";
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const radius = clamp(Number(searchParams.get("radius") || 2000), 200, 5000);
    const perCat = clamp(Number(searchParams.get("perCat") || 10), 1, 10);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ ok: false, error: "lat/lng required", ...emptyPayload() }, { status: 400 });
    }

    const keyRaw = (
      (process.env.GOOGLE_PLACES_API_KEY ? ((keySource = "GOOGLE_PLACES_API_KEY"), process.env.GOOGLE_PLACES_API_KEY) : "") ||
      (process.env.GOOGLE_MAPS_API_KEY ? ((keySource = "GOOGLE_MAPS_API_KEY"), process.env.GOOGLE_MAPS_API_KEY) : "") ||
      (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        ? ((keySource = "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"), process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
        : "") ||
      ""
    );
    const key = keyRaw.trim();
    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Missing GOOGLE_PLACES_API_KEY", keySource, ...emptyPayload() },
        { status: 500 }
      );
    }

    const cacheKey = `plcnb:v6:${round(lat, 3)}:${round(lng, 3)}:${radius}:${perCat}`;

    const cachedRedis = await redisGet(cacheKey);
    if (cachedRedis) {
      const res = NextResponse.json({ ok: true, cached: true, source: "google_places", keySource, ...cachedRedis }, { status: 200 });
      res.headers.set("Cache-Control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
      return res;
    }

    const now = Date.now();
    const cachedMem = memCache.get(cacheKey);
    if (cachedMem && now - cachedMem.t <= MEM_TTL_MS) {
      const res = NextResponse.json({ ok: true, cached: true, source: "google_places", keySource, ...cachedMem.v }, { status: 200 });
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
    const payload = normalizePlaces(merged, perCat, { lat, lng }, radius);

    touchMem(cacheKey, { v: payload, t: now });
    await redisSetEx(cacheKey, payload, 7 * 24 * 60 * 60);

    const out = NextResponse.json({ ok: true, cached: false, source: "google_places", keySource, ...payload }, { status: 200 });
    out.headers.set("Cache-Control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
    return out;
  } catch (e: any) {
    const statusRaw = Number((e as any)?.status);
    const status = Number.isFinite(statusRaw) && statusRaw >= 400 && statusRaw <= 599 ? statusRaw : 502;
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), keySource, ...emptyPayload() },
      { status }
    );
  }
}
