import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory LRU with TTL
// Note: In serverless, memory may be evicted between invocations, but often persists for warm instances.

type CacheEntry = { v: any; t: number };
const MAX_ENTRIES = 500;
const TTL_MS = 20 * 60 * 1000; // 20 minutes default
const cache = new Map<string, CacheEntry>();

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
];
const BACKOFFS = [750, 1500, 3000];

function touch(key: string, value: CacheEntry) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > MAX_ENTRIES) {
    const first = cache.keys().next().value as string | undefined;
    if (first) cache.delete(first);
  }
}

function makeKey(query: string) {
  // Simple hash
  let h = 0;
  for (let i = 0; i < query.length; i++) h = ((h << 5) - h + query.charCodeAt(i)) | 0;
  return 'ovp:' + h;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let lat: number | null = null;
    let lng: number | null = null;
    let radius = 2000;

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      lat = typeof body.lat === 'number' ? body.lat : null;
      lng = typeof body.lng === 'number' ? body.lng : null;
      if (typeof body.radius === 'number') radius = body.radius;
    } else {
      const { searchParams } = new URL(req.url);
      lat = Number(searchParams.get('lat'));
      lng = Number(searchParams.get('lng'));
      radius = Number(searchParams.get('radius') || radius);
      if (Number.isNaN(lat)) lat = null;
      if (Number.isNaN(lng)) lng = null;
    }

    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'lat/lng required' }, { status: 400 });
    }

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

    const cacheKey = makeKey(`${lat}:${lng}:${radius}:${query}`);
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now - cached.t <= TTL_MS) {
      const res = NextResponse.json({ elements: cached.v }, { status: 200 });
      res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=1200, stale-while-revalidate=600');
      return res;
    }

    let lastErr: any = null;
    for (let m = 0; m < MIRRORS.length; m++) {
      const url = MIRRORS[m];
      for (let r = 0; r < BACKOFFS.length; r++) {
        try {
          const res = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: query,
          }, 10000);

          if (!res.ok) {
            lastErr = new Error(`Overpass error ${res.status}`);
            await new Promise(res => setTimeout(res, BACKOFFS[r]));
            continue;
          }
          const data = await res.json();
          const elements = Array.isArray(data?.elements) ? data.elements : [];
          touch(cacheKey, { v: elements, t: now });
          const out = NextResponse.json({ elements }, { status: 200 });
          out.headers.set('Cache-Control', 'public, max-age=300, s-maxage=1200, stale-while-revalidate=600');
          return out;
        } catch (e) {
          lastErr = e;
          await new Promise(res => setTimeout(res, BACKOFFS[r]));
        }
      }
    }

    return NextResponse.json({ error: 'Overpass fetch failed', details: String(lastErr || '') }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: String(e?.message || e) }, { status: 500 });
  }
}

export const GET = POST; // allow GET for convenience
