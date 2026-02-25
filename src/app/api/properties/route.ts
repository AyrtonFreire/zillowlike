import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PropertyCreateSchema, PropertyQuerySchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { requireRecoveryFactor } from "@/lib/recovery-factor";
import { parseVideoUrl } from "@/lib/video";
import { createPublicCode } from "@/lib/public-code";

// Simple in-memory rate limiter: allow 5 POSTs per IP per minute (best-effort, free)
const rateMap = new Map<string, number[]>();
function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  // @ts-ignore next may expose ip in some runtimes
  return (req as any).ip || "unknown";
}
function checkRateLimit(req: NextRequest): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 5;
  const arr = rateMap.get(ip) || [];
  const recent = arr.filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateMap.set(ip, recent);
  return true;
}

function jsonSafe<T>(data: T): any {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
}

function toBigIntOrNull(v: any): bigint | null {
  if (v === null || typeof v === "undefined" || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return BigInt(Math.trunc(n));
}

function toBigInt(v: any): bigint {
  const out = toBigIntOrNull(v);
  return out ?? BigInt(0);
}

function toCentsBigInt(v: any): bigint {
  if (v === null || typeof v === "undefined" || v === "") return BigInt(0);
  const n = Number(v);
  if (!Number.isFinite(n)) return BigInt(0);
  return BigInt(Math.round(n * 100));
}

function isPublicCodeCollision(err: any) {
  return (
    err &&
    String(err.code || "") === "P2002" &&
    (Array.isArray(err?.meta?.target)
      ? err.meta.target.includes("publicCode")
      : String(err?.meta?.target || "").includes("publicCode"))
  );
}

function normalizeSearchParamsForCache(searchParams: URLSearchParams) {
  const entries = Array.from(searchParams.entries()).sort((a, b) => {
    const k = a[0].localeCompare(b[0]);
    if (k !== 0) return k;
    return a[1].localeCompare(b[1]);
  });
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.append(k, v);
  return sp.toString();
}

const REMOVED_PROPERTY_TYPES = new Set(["STUDIO", "TOWNHOUSE"]);

// GET /api/properties?city=&state=&minPrice=&maxPrice=&type=&q=&page=&pageSize=&sort=&bedroomsMin=&bathroomsMin=&areaMin=
export async function GET(req: NextRequest) {
  try {
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const cookie = req.headers.get("cookie") || "";
    const hasSessionCookie =
      cookie.includes("next-auth.session-token=") ||
      cookie.includes("__Secure-next-auth.session-token=");
    const session = hasSessionCookie
      ? await getServerSession(authOptions).catch(() => null)
      : null;
    const sessionUser = (session as any)?.user as any;
    const viewerRole = sessionUser?.role as string | undefined;
    const { searchParams } = new URL(req.url);

    const mode = (searchParams.get("mode") || "").toLowerCase();
    const liteParam = (searchParams.get("lite") || "").toLowerCase();
    const onlyTotalParam = (searchParams.get("onlyTotal") || "").toLowerCase();
    const isLite = liteParam === "1" || liteParam === "true";
    const onlyTotal = onlyTotalParam === "1" || onlyTotalParam === "true";

    const parsed = PropertyQuerySchema.safeParse({
      city: searchParams.get("city") ?? undefined,
      state: searchParams.get("state") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      purpose: searchParams.get("purpose") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      agencyId: searchParams.get("agencyId") ?? undefined,
      realtorId: searchParams.get("realtorId") ?? undefined,
      minPrice: searchParams.get("minPrice") ?? undefined,
      maxPrice: searchParams.get("maxPrice") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      bedroomsMin: searchParams.get("bedroomsMin") ?? undefined,
      bathroomsMin: searchParams.get("bathroomsMin") ?? undefined,
      areaMin: searchParams.get("areaMin") ?? undefined,
      minLat: searchParams.get("minLat") ?? undefined,
      maxLat: searchParams.get("maxLat") ?? undefined,
      minLng: searchParams.get("minLng") ?? undefined,
      maxLng: searchParams.get("maxLng") ?? undefined,
      lite: searchParams.get("lite") ?? undefined,
      mode: searchParams.get("mode") ?? undefined,
      onlyTotal: searchParams.get("onlyTotal") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { city, state, type, purpose, q, minPrice, maxPrice, agencyId, realtorId } = parsed.data as any;
    const tag = (searchParams.get("tag") || "").toLowerCase();
    const pageRaw = Number(parsed.data.page ?? 1);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSizeRaw = Number(parsed.data.pageSize ?? 24);
    const maxPageSize = viewerRole === "ADMIN" ? 500 : 60;
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
        ? Math.min(pageSizeRaw, maxPageSize)
        : 24;
    const sortRaw = (searchParams.get("sort") || "recent").toLowerCase();
    const allowedSort = new Set(["recent","price_asc","price_desc","area_desc"]);
    const sort = allowedSort.has(sortRaw) ? sortRaw : "recent";
    const bedroomsMin = Number(searchParams.get("bedroomsMin") || 0);
    const bathroomsMin = Number(searchParams.get("bathroomsMin") || 0);
    const areaMin = Number(searchParams.get("areaMin") || 0);

    const where: any = {};
    // Status filtering
    // - Visitante (não-admin): sempre apenas ACTIVE
    // - Admin: pode filtrar via ?status=ACTIVE|PAUSED|DRAFT ou usar ?status=ANY
    const rawStatusParam = (searchParams.get("status") || "ANY").toUpperCase();
    const allowedStatuses = new Set(["ACTIVE", "PAUSED", "DRAFT"]);
    const statusParam = viewerRole === "ADMIN" ? rawStatusParam : "ACTIVE";
    if (statusParam !== "ANY") {
      const effective = allowedStatuses.has(statusParam) ? statusParam : "ACTIVE";
      where.status = effective;
    }
    if (city) where.city = { equals: city, mode: 'insensitive' as Prisma.QueryMode };
    if (state) where.state = { equals: state, mode: 'insensitive' as Prisma.QueryMode };
    if (agencyId) where.teamId = String(agencyId);
    if (realtorId) where.capturerRealtorId = String(realtorId);
    if (type) {
      const upperType = String(type).toUpperCase();
      if (REMOVED_PROPERTY_TYPES.has(upperType)) {
        return NextResponse.json({ success: true, total: 0, properties: [], page, pageSize }, { status: 200 });
      }
      where.type = type as any;
    }
    if (purpose) where.purpose = purpose as any;
    if (!where.type) {
      where.type = { notIn: Array.from(REMOVED_PROPERTY_TYPES) };
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = toCentsBigInt(minPrice);
      if (maxPrice) where.price.lte = toCentsBigInt(maxPrice);
    }
    if (bedroomsMin) where.bedrooms = { gte: bedroomsMin };
    if (bathroomsMin) where.bathrooms = { gte: bathroomsMin };
    if (areaMin) where.areaM2 = { gte: areaMin };
    
    // Advanced filters
    const parkingSpots = searchParams.get("parkingSpots");
    const yearBuiltMin = searchParams.get("yearBuiltMin");
    const yearBuiltMax = searchParams.get("yearBuiltMax");
    const propertyStatus = searchParams.get("propertyStatus"); // Renamed to avoid conflict with listing status
    const petFriendly = searchParams.get("petFriendly");
    const furnished = searchParams.get("furnished");
    // Lazer / Condomínio
    const hasPool = searchParams.get("hasPool");
    const hasGym = searchParams.get("hasGym");
    const hasElevator = searchParams.get("hasElevator");
    const hasBalcony = searchParams.get("hasBalcony");
    const hasPlayground = searchParams.get("hasPlayground");
    const hasPartyRoom = searchParams.get("hasPartyRoom");
    const hasGourmet = searchParams.get("hasGourmet");
    const hasConcierge24h = searchParams.get("hasConcierge24h");
    // Conforto / Energia
    const comfortAC = searchParams.get("comfortAC");
    const comfortHeating = searchParams.get("comfortHeating");
    const comfortSolar = searchParams.get("comfortSolar");
    const comfortNoiseWindows = searchParams.get("comfortNoiseWindows");
    const comfortLED = searchParams.get("comfortLED");
    const comfortWaterReuse = searchParams.get("comfortWaterReuse");
    // Acessibilidade
    const accRamps = searchParams.get("accRamps");
    const accWideDoors = searchParams.get("accWideDoors");
    const accAccessibleElevator = searchParams.get("accAccessibleElevator");
    const accTactile = searchParams.get("accTactile");
    // Acabamentos
    const finishCabinets = searchParams.get("finishCabinets");
    const finishCounterGranite = searchParams.get("finishCounterGranite");
    const finishCounterQuartz = searchParams.get("finishCounterQuartz");
    // Vista / Posição
    const viewSea = searchParams.get("viewSea");
    const viewCity = searchParams.get("viewCity");
    const positionFront = searchParams.get("positionFront");
    const positionBack = searchParams.get("positionBack");
    // Pets
    const petsSmall = searchParams.get("petsSmall");
    const petsLarge = searchParams.get("petsLarge");
    const condoFeeMax = searchParams.get("condoFeeMax");
    const iptuMax = searchParams.get("iptuMax");
    const keywords = searchParams.get("keywords");
    
    if (parkingSpots) where.parkingSpots = { gte: Number(parkingSpots) };
    if (yearBuiltMin || yearBuiltMax) {
      where.yearBuilt = {};
      if (yearBuiltMin) where.yearBuilt.gte = Number(yearBuiltMin);
      if (yearBuiltMax) where.yearBuilt.lte = Number(yearBuiltMax);
    }
    if (propertyStatus) where.conditionTags = { has: propertyStatus };
    if (petFriendly === "true") where.petFriendly = true;
    if (furnished === "true") where.furnished = true;
    // Lazer / Condomínio
    if (hasPool === "true") where.hasPool = true;
    if (hasGym === "true") where.hasGym = true;
    if (hasElevator === "true") where.hasElevator = true;
    if (hasBalcony === "true") where.hasBalcony = true;
    if (hasPlayground === "true") where.hasPlayground = true;
    if (hasPartyRoom === "true") where.hasPartyRoom = true;
    if (hasGourmet === "true") where.hasGourmet = true;
    if (hasConcierge24h === "true") where.hasConcierge24h = true;
    // Conforto / Energia
    if (comfortAC === "true") where.comfortAC = true;
    if (comfortHeating === "true") where.comfortHeating = true;
    if (comfortSolar === "true") where.comfortSolar = true;
    if (comfortNoiseWindows === "true") where.comfortNoiseWindows = true;
    if (comfortLED === "true") where.comfortLED = true;
    if (comfortWaterReuse === "true") where.comfortWaterReuse = true;
    // Acessibilidade
    if (accRamps === "true") where.accRamps = true;
    if (accWideDoors === "true") where.accWideDoors = true;
    if (accAccessibleElevator === "true") where.accAccessibleElevator = true;
    if (accTactile === "true") where.accTactile = true;
    // Acabamentos
    if (finishCabinets === "true") where.finishCabinets = true;
    if (finishCounterGranite === "true") where.finishCounterGranite = true;
    if (finishCounterQuartz === "true") where.finishCounterQuartz = true;
    // Vista / Posição
    if (viewSea === "true") where.viewSea = true;
    if (viewCity === "true") where.viewCity = true;
    if (positionFront === "true") where.positionFront = true;
    if (positionBack === "true") where.positionBack = true;
    // Pets
    if (petsSmall === "true") where.petsSmall = true;
    if (petsLarge === "true") where.petsLarge = true;
    if (condoFeeMax) where.condoFee = { lte: toBigInt(condoFeeMax) };
    if (iptuMax) {
      // IPTU não existe no schema atual, mas preparado para quando adicionar
      // where.iptu = { lte: Number(iptuMax) };
    }
    
    if (q || keywords) {
      const searchTerm = keywords || q;
      const ors: any[] = [
        { title: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { street: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { neighborhood: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { city: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
      ];
      if (!isLite && mode !== "map") {
        ors.push({ description: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } });
      }

      where.OR = ors;
    }

    // Bounds filtering (viewport)
    const minLatStr = searchParams.get("minLat");
    const maxLatStr = searchParams.get("maxLat");
    const minLngStr = searchParams.get("minLng");
    const maxLngStr = searchParams.get("maxLng");
    const minLat = minLatStr !== null ? Number(minLatStr) : null;
    const maxLat = maxLatStr !== null ? Number(maxLatStr) : null;
    const minLng = minLngStr !== null ? Number(minLngStr) : null;
    const maxLng = maxLngStr !== null ? Number(maxLngStr) : null;
    
    // Only apply bounds filter if all bounds are provided
    if (
      minLat !== null && maxLat !== null && minLng !== null && maxLng !== null &&
      Number.isFinite(minLat) && Number.isFinite(maxLat) && Number.isFinite(minLng) && Number.isFinite(maxLng)
    ) {
      where.latitude = { gte: Math.min(minLat, maxLat), lte: Math.max(minLat, maxLat) };
      where.longitude = { gte: Math.min(minLng, maxLng), lte: Math.max(minLng, maxLng) };
    }

    let orderBy: Prisma.PropertyOrderByWithRelationInput =
      sort === "price_asc"
        ? { price: "asc" }
        : sort === "price_desc"
        ? { price: "desc" }
        : sort === "area_desc"
        ? { areaM2: "desc" }
        : { createdAt: "desc" };

    // Map quick-filter tag into WHERE/ORDER
    if (tag) {
      const now = new Date();
      if (tag === 'new') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 dias
        (where.createdAt as any) = { gte: d };
        orderBy = { createdAt: 'desc' };
      } else if (tag === 'price_drop') {
        // Sem histórico de preço: heurística -> registros atualizados recentemente e com updatedAt > createdAt
        const d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 dias
        (where.AND ||= [] as any[]).push({ updatedAt: { gte: d } }, { updatedAt: { gt: (where as any).createdAt?.gte || new Date(0) } });
        orderBy = { updatedAt: 'desc' };
      } else if (tag === 'pet_friendly') {
        (where.petFriendly as any) = true;
      } else if (tag === 'garage') {
        (where.parkingSpots as any) = { gte: 1 };
      } else if (tag === 'ready_to_move') {
        // Interpretamos como mobiliado (furnished)
        (where.furnished as any) = true;
      }
    }

    const totalPromise = prisma.property.count({ where });

    let items: any[] = [];
    if (!onlyTotal) {
      const select: any =
        mode === "map"
          ? {
              id: true,
              price: true,
              latitude: true,
              longitude: true,
              title: true,
              updatedAt: true,
            }
          : isLite
          ? {
              id: true,
              title: true,
              price: true,
              type: true,
              purpose: true,
              neighborhood: true,
              city: true,
              state: true,
              latitude: true,
              longitude: true,
              bedrooms: true,
              bathrooms: true,
              areaM2: true,
              parkingSpots: true,
              conditionTags: true,
              updatedAt: true,
              images: { select: { id: true, url: true }, orderBy: { sortOrder: "asc" }, take: 6 },
              owner: { select: { id: true, name: true, image: true, publicSlug: true, role: true } },
              team: {
                select: {
                  id: true,
                  name: true,
                  owner: { select: { id: true, name: true, image: true } },
                },
              },
            }
          : {
              id: true,
              title: true,
              description: true,
              price: true,
              type: true,
              purpose: true,
              status: true,
              ownerId: true,
              street: true,
              neighborhood: true,
              city: true,
              state: true,
              postalCode: true,
              latitude: true,
              longitude: true,
              bedrooms: true,
              bathrooms: true,
              areaM2: true,
              suites: true,
              parkingSpots: true,
              floor: true,
              furnished: true,
              petFriendly: true,
              condoFee: true,
              yearBuilt: true,
              conditionTags: true,
              createdAt: true,
              updatedAt: true,
              images: { select: { id: true, url: true, alt: true, sortOrder: true, blurDataURL: true }, orderBy: { sortOrder: 'asc' } },
              hasBalcony: true,
              hasElevator: true,
              hasPool: true,
              hasGym: true,
              hasPlayground: true,
              hasPartyRoom: true,
              hasGourmet: true,
              hasConcierge24h: true,
              accRamps: true,
              accWideDoors: true,
              accAccessibleElevator: true,
              accTactile: true,
              comfortAC: true,
              comfortHeating: true,
              comfortSolar: true,
              comfortNoiseWindows: true,
              comfortLED: true,
              comfortWaterReuse: true,
              finishFloor: true,
              finishCabinets: true,
              finishCounterGranite: true,
              finishCounterQuartz: true,
              viewSea: true,
              viewCity: true,
              positionFront: true,
              positionBack: true,
              sunByRoomNote: true,
              petsSmall: true,
              petsLarge: true,
              condoRules: true,
              sunOrientation: true,
              yearRenovated: true,
              totalFloors: true,
            };

      const itemsPromise = prisma.property.findMany({
        where,
        select,
        orderBy: mode === "map" ? undefined : orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const [total, nextItems] = await Promise.all([totalPromise, itemsPromise]);
      items = nextItems as any[];

      items = jsonSafe(items);

      if (process.env.NODE_ENV !== "production") {
        console.log("api/properties GET", {
          filters: { city, state, type, purpose, q, bedroomsMin, bathroomsMin, areaMin, status: (where as any).status || "ANY" },
          total,
        });
      }

      const body = {
        // compat antigo
        success: true,
        properties: items,
        // compat novo (HomeClient/types/api.ts)
        items,
        total,
        page,
        pageSize,
      };

      // ETag (apenas público/visitante): permite 304 com If-None-Match sem breaking changes
      if (!hasSessionCookie) {
        const ifNoneMatch = req.headers.get("if-none-match") || "";
        const queryKey = normalizeSearchParamsForCache(searchParams);
        const hasher = createHash("sha1");
        hasher.update(queryKey);
        hasher.update("::");
        hasher.update(String(total));
        hasher.update("::");
        hasher.update(String(page));
        hasher.update("::");
        hasher.update(String(pageSize));
        hasher.update("::");

        for (const it of items) {
          const id = String((it as any)?.id ?? "");
          const rawUpdatedAt = (it as any)?.updatedAt;
          const u =
            rawUpdatedAt instanceof Date
              ? rawUpdatedAt.getTime()
              : rawUpdatedAt
              ? new Date(rawUpdatedAt).getTime()
              : 0;
          hasher.update(id);
          hasher.update(":");
          hasher.update(String(u));
          hasher.update("|");
        }

        const hash = hasher.digest("base64url");
        const etag = `W/"${hash}"`;

        const matches = ifNoneMatch
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .some((t) => t === etag);

        if (matches) {
          const notModified = new NextResponse(null, { status: 304 });
          notModified.headers.set("x-request-id", requestId);
          notModified.headers.set("ETag", etag);
          notModified.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return notModified;
        }

        const res = NextResponse.json(body);
        res.headers.set("x-request-id", requestId);
        res.headers.set("ETag", etag);
        res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return res;
      }

      const res = NextResponse.json(body);
      res.headers.set("x-request-id", requestId);
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    }

    const total = await totalPromise;

    if (process.env.NODE_ENV !== "production") {
      console.log("api/properties GET", {
        filters: { city, state, type, purpose, q, bedroomsMin, bathroomsMin, areaMin, status: (where as any).status || "ANY" },
        total,
      });
    }

    const body = {
      // compat antigo
      success: true,
      properties: items,
      // compat novo (HomeClient/types/api.ts)
      items,
      total,
      page,
      pageSize,
    };

    if (!hasSessionCookie) {
      const ifNoneMatch = req.headers.get("if-none-match") || "";
      const queryKey = normalizeSearchParamsForCache(searchParams);
      const hasher = createHash("sha1");
      hasher.update(queryKey);
      hasher.update("::");
      hasher.update(String(total));
      hasher.update("::");
      hasher.update(String(page));
      hasher.update("::");
      hasher.update(String(pageSize));
      hasher.update("::");

      const hash = hasher.digest("base64url");
      const etag = `W/"${hash}"`;

      const matches = ifNoneMatch
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .some((t) => t === etag);

      if (matches) {
        const notModified = new NextResponse(null, { status: 304 });
        notModified.headers.set("x-request-id", requestId);
        notModified.headers.set("ETag", etag);
        notModified.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return notModified;
      }

      const res = NextResponse.json(body);
      res.headers.set("x-request-id", requestId);
      res.headers.set("ETag", etag);
      res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      return res;
    }

    const res = NextResponse.json(body);
    res.headers.set("x-request-id", requestId);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (e: any) {
    console.error("/api/properties GET error:", e?.message || e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/properties
// Body: { title, description, priceBRL, type, address, geo, details, images }
export async function POST(req: NextRequest) {
  try {
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const withRequestId = (res: NextResponse) => {
      res.headers.set("x-request-id", requestId);
      return res;
    };
    // rate limit
    if (!checkRateLimit(req)) {
      return withRequestId(
        NextResponse.json(
          {
            code: "RATE_LIMITED",
            message: "Too many requests",
            error: "Too many requests",
          },
          { status: 429 }
        )
      );
    }
    const session = await getServerSession(authOptions);
    if (!session) {
      console.warn("api/properties POST unauthorized: no session");
      return withRequestId(
        NextResponse.json(
          {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
            error: "Unauthorized",
          },
          { status: 401 }
        )
      );
    }
    const body = await req.json();
    // Defensive validation for images before zod (limit and URL)
    if (Array.isArray(body?.images)) {
      const imgs = body.images as any[];
      if (imgs.length < 1 || imgs.length > 20) {
        return withRequestId(
          NextResponse.json(
            {
              code: "VALIDATION_ERROR",
              message: "Images count must be between 1 and 20",
              error: "Images count must be between 1 and 20",
            },
            { status: 400 }
          )
        );
      }
      const urlOk = (u: any) => typeof u === 'string' && /^https?:\/\//.test(u);
      for (const it of imgs) {
        if (!it?.url || !urlOk(it.url)) {
          return withRequestId(
            NextResponse.json(
              {
                code: "VALIDATION_ERROR",
                message: "Invalid image URL in payload",
                error: "Invalid image URL in payload",
              },
              { status: 400 }
            )
          );
        }
      }
    }
    const parsed = PropertyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return withRequestId(
        NextResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "Invalid body",
            error: "Invalid body",
            issues: parsed.error.issues,
          },
          { status: 400 }
        )
      );
    }

    const rawType = String(parsed.data.type || "").toUpperCase();
    if (REMOVED_PROPERTY_TYPES.has(rawType)) {
      return withRequestId(
        NextResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "Tipo de imóvel não permitido",
            error: "Tipo de imóvel não permitido",
          },
          { status: 400 }
        )
      );
    }

    const { title, metaTitle, metaDescription, description, priceBRL, type, purpose, capturerRealtorId, address, geo, details, images, conditionTags, furnished, petFriendly, privateData, visibility, videoUrl } = parsed.data;

    const parsedVideo = typeof videoUrl === "string" && videoUrl.trim() ? parseVideoUrl(videoUrl) : null;

    let latitude = geo?.lat;
    let longitude = geo?.lng;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      const agg = await prisma.property.aggregate({
        where: {
          status: "ACTIVE",
          city: address.city,
          state: address.state,
        },
        _avg: { latitude: true, longitude: true },
      });
      latitude = agg._avg.latitude ?? -15.793889;
      longitude = agg._avg.longitude ?? -47.882778;
    }

    const price = Math.round(Number(priceBRL) * 100);
    const userId = (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub;
    if (!userId) {
      console.error("api/properties POST: session present but userId missing");
      return withRequestId(
        NextResponse.json(
          {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
            error: "Unauthorized",
          },
          { status: 401 }
        )
      );
    }

    // Require at least one verified recovery/contact channel before allowing property creation
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { role: true, phone: true, phoneVerifiedAt: true, emailVerified: true, recoveryEmailVerifiedAt: true },
    });

    if (!user) {
      console.error("api/properties POST: user not found", userId);
      return withRequestId(
        NextResponse.json(
          {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
            error: "Unauthorized",
          },
          { status: 401 }
        )
      );
    }

    const hasVerifiedPhone = !!(user.phone && user.phone.trim() && user.phoneVerifiedAt);
    const hasVerifiedEmail = !!user.emailVerified;
    const hasVerifiedRecoveryEmail = !!(user as any).recoveryEmailVerifiedAt;
    const backupCodesUnused = await (prisma as any).backupRecoveryCode.count({
      where: { userId, usedAt: null },
    });
    const hasBackupCodes = backupCodesUnused > 0;

    if (!hasVerifiedPhone && !hasVerifiedEmail && !hasVerifiedRecoveryEmail && !hasBackupCodes) {
      return withRequestId(
        NextResponse.json(
          {
            code: "CONTACT_NOT_VERIFIED",
            message:
              "Para publicar um imóvel, configure pelo menos um método de recuperação (telefone verificado, e-mail verificado, e-mail de recuperação verificado ou backup codes) em Meu Perfil.",
            error:
              "Para publicar um imóvel, configure pelo menos um método de recuperação (telefone verificado, e-mail verificado, e-mail de recuperação verificado ou backup codes) em Meu Perfil.",
          },
          { status: 400 }
        )
      );
    }

    // AUTO-PROMOTION: Check if user is USER and has no properties yet
    if (user.role === "USER") {
      const propertyCount = await prisma.property.count({
        where: { ownerId: userId },
      });

      if (propertyCount === 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { role: "OWNER" },
        });
        console.log("✨ Auto-promoted USER → OWNER:", userId);
      }
    }

    // Ensure type is a valid enum fallback
    const validTypes = new Set(["HOUSE","APARTMENT","CONDO","TOWNHOUSE","STUDIO","LAND","RURAL","COMMERCIAL"]);
    const safeType = validTypes.has(type as any) ? type : "HOUSE";

    const createData: any = {
      title,
      metaTitle: metaTitle && metaTitle.trim() ? metaTitle.trim() : null,
      metaDescription: metaDescription && metaDescription.trim() ? metaDescription.trim() : null,
      description,
      price: BigInt(price),
      type: safeType,
      videoUrl: parsedVideo ? parsedVideo.canonicalUrl : null,
      videoProvider: parsedVideo ? parsedVideo.provider : null,
      videoId: parsedVideo ? parsedVideo.id : null,
      ...(purpose ? { purpose } : {}),
      ...(capturerRealtorId ? { capturerRealtorId: String(capturerRealtorId) } : {}),
      ownerId: userId || undefined,
      street: address.street,
      neighborhood: address.neighborhood ?? null,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode ?? null,
      latitude,
      longitude,
      furnished: typeof furnished === 'boolean' ? furnished : null,
      petFriendly: typeof petFriendly === 'boolean' ? petFriendly : null,
      bedrooms: details?.bedrooms ?? null,
      bathrooms: details?.bathrooms ?? null,
      areaM2: details?.areaM2 ?? null,
      builtAreaM2: (details as any)?.builtAreaM2 ?? null,
      lotAreaM2: (details as any)?.lotAreaM2 ?? null,
      privateAreaM2: (details as any)?.privateAreaM2 ?? null,
      usableAreaM2: (details as any)?.usableAreaM2 ?? null,
      suites: (details as any)?.suites ?? null,
      parkingSpots: (details as any)?.parkingSpots ?? null,
      floor: (details as any)?.floor ?? null,
      yearBuilt: (details as any)?.yearBuilt ?? null,
      // Lazer / Condomínio
      hasBalcony: (details as any)?.hasBalcony ?? null,
      hasElevator: (details as any)?.hasElevator ?? null,
      hasPool: (details as any)?.hasPool ?? null,
      hasGym: (details as any)?.hasGym ?? null,
      hasPlayground: (details as any)?.hasPlayground ?? null,
      hasPartyRoom: (details as any)?.hasPartyRoom ?? null,
      hasGourmet: (details as any)?.hasGourmet ?? null,
      hasConcierge24h: (details as any)?.hasConcierge24h ?? null,
      // Acessibilidade
      accRamps: (details as any)?.accRamps ?? null,
      accWideDoors: (details as any)?.accWideDoors ?? null,
      accAccessibleElevator: (details as any)?.accAccessibleElevator ?? null,
      accTactile: (details as any)?.accTactile ?? null,
      // Conforto / Energia
      comfortAC: (details as any)?.comfortAC ?? null,
      comfortHeating: (details as any)?.comfortHeating ?? null,
      comfortSolar: (details as any)?.comfortSolar ?? null,
      comfortNoiseWindows: (details as any)?.comfortNoiseWindows ?? null,
      comfortLED: (details as any)?.comfortLED ?? null,
      comfortWaterReuse: (details as any)?.comfortWaterReuse ?? null,
      // Acabamentos
      finishFloor: (details as any)?.finishFloor ?? null,
      finishCabinets: (details as any)?.finishCabinets ?? null,
      finishCounterGranite: (details as any)?.finishCounterGranite ?? null,
      finishCounterQuartz: (details as any)?.finishCounterQuartz ?? null,
      // Vista / Posição
      viewSea: (details as any)?.viewSea ?? null,
      viewCity: (details as any)?.viewCity ?? null,
      positionFront: (details as any)?.positionFront ?? null,
      positionBack: (details as any)?.positionBack ?? null,
      sunByRoomNote: (details as any)?.sunByRoomNote ?? null,
      // Pets / Políticas
      petsSmall: (details as any)?.petsSmall ?? null,
      petsLarge: (details as any)?.petsLarge ?? null,
      condoRules: (details as any)?.condoRules ?? null,
      // Outros
      sunOrientation: (details as any)?.sunOrientation ?? null,
      yearRenovated: (details as any)?.yearRenovated ?? null,
      totalFloors: (details as any)?.totalFloors ?? null,
      // Dados privados do proprietário
      privateOwnerName: (privateData as any)?.ownerName ?? null,
      privateOwnerPhone: (privateData as any)?.ownerPhone ?? null,
      privateOwnerEmail: (privateData as any)?.ownerEmail ?? null,
      privateOwnerAddress: (privateData as any)?.ownerAddress ?? null,
      privateOwnerPrice: toBigIntOrNull((privateData as any)?.ownerPrice),
      privateBrokerFeePercent: (privateData as any)?.brokerFeePercent ?? null,
      privateBrokerFeeFixed: toBigIntOrNull((privateData as any)?.brokerFeeFixed),
      privateExclusive: (privateData as any)?.exclusive ?? null,
      privateExclusiveUntil: (privateData as any)?.exclusiveUntil ? new Date((privateData as any).exclusiveUntil) : null,
      privateOccupied: (privateData as any)?.occupied ?? null,
      privateOccupantInfo: (privateData as any)?.occupantInfo ?? null,
      privateKeyLocation: (privateData as any)?.keyLocation ?? null,
      privateNotes: (privateData as any)?.notes ?? null,
      // Configurações de visibilidade
      hidePrice: (visibility as any)?.hidePrice ?? null,
      hideExactAddress: (visibility as any)?.hideExactAddress ?? null,
      hideOwnerContact: (visibility as any)?.hideOwnerContact ?? null,
      hideCondoFee: (visibility as any)?.hideCondoFee ?? null,
      hideIPTU: (visibility as any)?.hideIPTU ?? null,
      iptuYearly: toBigIntOrNull((visibility as any)?.iptuYearly),
      conditionTags: Array.isArray(conditionTags) ? conditionTags : undefined,
      images:
        Array.isArray(images) && images.length > 0
          ? {
              create: images
                .filter((img: any) => !!img?.url)
                .map((img: any, idx: number) => ({
                  url: img.url,
                  alt: img.alt ?? null,
                  sortOrder: img.sortOrder ?? idx,
                  blurDataURL: img.blurDataURL ?? null,
                })),
            }
          : undefined,
    };

    // Se o usuário fizer parte de exatamente um time, amarra esse imóvel a esse time automaticamente.
    try {
      const memberships = await (prisma as any).teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      if (Array.isArray(memberships) && memberships.length === 1 && memberships[0]?.teamId) {
        createData.teamId = memberships[0].teamId;
      }
    } catch (err) {
      console.error("api/properties POST: failed to infer teamId", err);
    }

    if (createData?.teamId && createData?.capturerRealtorId) {
      const membership = await (prisma as any).teamMember.findFirst({
        where: {
          teamId: String(createData.teamId),
          userId: String(createData.capturerRealtorId),
        },
        include: {
          user: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      });

      if (!membership?.user?.id || String(membership.user.role || "").toUpperCase() !== "REALTOR") {
        return withRequestId(
          NextResponse.json(
            {
              code: "VALIDATION_ERROR",
              message: "Corretor captador inválido para este time.",
              error: "Corretor captador inválido para este time.",
            },
            { status: 400 }
          )
        );
      }
    }

    if (!createData?.teamId && createData?.capturerRealtorId) {
      return withRequestId(
        NextResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "Não é possível definir corretor captador sem um time vinculado.",
            error: "Não é possível definir corretor captador sem um time vinculado.",
          },
          { status: 400 }
        )
      );
    }
    let created: any = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        createData.publicCode = createPublicCode("P");
        created = await (prisma as any).property.create({ data: createData, include: { images: true } });
        break;
      } catch (err: any) {
        if (isPublicCodeCollision(err) && attempt < 7) continue;
        throw err;
      }
    }
    console.log("api/properties POST created", { id: created.id, ownerId: created.ownerId, city: created.city, state: created.state, status: created.status, requestId });
    const res = NextResponse.json(jsonSafe(created), { status: 201 });
    res.headers.set("x-request-id", requestId);
    return res;
  } catch (err: any) {
    console.error("/api/properties POST error", err?.message || err);
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const res = NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to create property",
        error: "Failed to create property",
      },
      { status: 500 }
    );
    res.headers.set("x-request-id", requestId);
    return res;
  }
}

// PATCH /api/properties  body: { id, data: Partial<Property> }
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session as any).user?.id || (session as any).userId || (session as any).user?.sub;
    const body = await req.json();
    const { id, data } = body || {};
    if (!id || !data) return NextResponse.json({ error: "id and data required" }, { status: 400 });
    const existing = await prisma.property.findUnique({ where: { id }, select: { ownerId: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.ownerId && existing.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    // allow limited fields update
    const allowed: any = {};
    const fields = ["title","description","price","type","purpose","conditionTags","street","neighborhood","city","state","postalCode","latitude","longitude","bedrooms","bathrooms","areaM2","videoUrl"];
    for (const k of fields) if (k in data) allowed[k] = data[k];

    if ("videoUrl" in allowed) {
      const raw = typeof allowed.videoUrl === "string" ? allowed.videoUrl.trim() : "";
      if (!raw) {
        allowed.videoUrl = null;
        allowed.videoProvider = null;
        allowed.videoId = null;
      } else {
        const parsed = parseVideoUrl(raw);
        if (!parsed) {
          return NextResponse.json({ error: "Invalid video url" }, { status: 400 });
        }
        allowed.videoUrl = parsed.canonicalUrl;
        allowed.videoProvider = parsed.provider;
        allowed.videoId = parsed.id;
      }
    }

    if ("price" in allowed) {
      allowed.price = BigInt(Math.trunc(Number(allowed.price)));
    }

    // Update property core fields first
    const updated = await prisma.property.update({ where: { id }, data: allowed });
    console.log("api/properties PATCH updated", { id, ownerId: existing.ownerId, fields: Object.keys(allowed) });

    // Optionally replace images when provided
    if (Array.isArray(data.images)) {
      await prisma.image.deleteMany({ where: { propertyId: id } });
      const toCreate = data.images
        .filter((img: any) => !!img?.url)
        .map((img: any, idx: number) => ({
          url: img.url,
          alt: img.alt ?? null,
          sortOrder: img.sortOrder ?? idx,
          blurDataURL: img.blurDataURL ?? null,
          propertyId: id,
        }));
      if (toCreate.length > 0) {
        await prisma.image.createMany({ data: toCreate });
      }
    }

    // Return property with images
    const result = await prisma.property.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: 'asc' } } } });
    return NextResponse.json(jsonSafe(result));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/properties  body: { id }
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session as any).user?.id || (session as any).userId || (session as any).user?.sub;
    const body = await req.json();
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const existing = await prisma.property.findUnique({ where: { id }, select: { ownerId: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.ownerId && existing.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    await prisma.image.deleteMany({ where: { propertyId: id } });
    await prisma.property.delete({ where: { id } });
    console.log("api/properties DELETE", { id, ownerId: existing.ownerId });
    return NextResponse.json({ status: "deleted" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}


