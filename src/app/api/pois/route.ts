import { NextResponse } from "next/server";

// Minimal REST client for Upstash Redis (optional)
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
    const res = await fetch(`${url}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(JSON.stringify(value))}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function round(n: number, p = 3) {
  return Math.round(n * Math.pow(10, p)) / Math.pow(10, p);
}

function normalizeItems(elements: any[], perCategory: number) {
  const byCategory: Record<string, any[]> = {};
  (elements || []).forEach((el: any) => {
    const cat = el.tags?.amenity || el.tags?.shop || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(el);
  });
  const pickCat = (cat: string) => (byCategory[cat] || []).slice(0, perCategory).map((el: any) => {
    const name = el.tags?.name || el.tags?.brand || "";
    return { name, lat: el.lat, lng: el.lon };
  });
  const schools = pickCat("school").filter(p => p.name && p.name.toLowerCase() !== "local");
  const markets = pickCat("supermarket").filter(p => p.name && p.name.toLowerCase() !== "local");
  const pharmacies = pickCat("pharmacy").filter(p => p.name && p.name.toLowerCase() !== "local");
  const restaurants = pickCat("restaurant").filter(p => p.name && p.name.toLowerCase() !== "local");
  // dedupe por nome em cada categoria
  const dedupe = (arr: any[]) => {
    const seen = new Set<string>();
    return arr.filter(p => (seen.has(p.name) ? false : (seen.add(p.name), true))).map(p => ({
      ...p,
      name: p.name.length > 35 ? p.name.slice(0, 32) + "..." : p.name,
    }));
  };
  return {
    schools: dedupe(schools),
    markets: dedupe(markets),
    pharmacies: dedupe(pharmacies),
    restaurants: dedupe(restaurants),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const radius = Math.max(200, Math.min(2000, Number(searchParams.get("radius") || 1000)));
    const perCategory = Math.max(1, Math.min(6, Number(searchParams.get("perCat") || 3)));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
    }

    const key = `pois:${round(lat, 3)}:${round(lng, 3)}:${radius}:${perCategory}`;

    // Try cache first
    const cached = await redisGet(key);
    if (cached) return NextResponse.json({ ok: true, cached: true, ...cached });

    // Overpass query
    const query = `
      [out:json][timeout:5];
      (
        node(around:${radius},${lat},${lng})[amenity=school];
        node(around:${radius},${lat},${lng})[shop=supermarket];
        node(around:${radius},${lat},${lng})[amenity=pharmacy];
        node(around:${radius},${lat},${lng})[amenity=restaurant];
      );
      out center 20;
    `;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!res.ok) {
      // Fail gracefully
      return NextResponse.json({ ok: false, schools: [], markets: [], pharmacies: [], restaurants: [] }, { status: 200 });
    }

    const data = await res.json();
    const payload = normalizeItems(data.elements || [], perCategory);

    // Cache for 72h (259200s) quando Redis estiver configurado
    await redisSetEx(key, payload, 259200);

    return NextResponse.json({ ok: true, cached: false, ...payload });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), schools: [], markets: [], pharmacies: [], restaurants: [] }, { status: 200 });
  }
}
