import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PropertyCreateSchema, PropertyQuerySchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";

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
    const qp = Object.fromEntries(searchParams.entries());
    const parsed = PropertyQuerySchema.safeParse(qp);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { city, state, type, purpose, q, minPrice, maxPrice } = parsed.data as any;
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
    if (type) where.type = type as any;
    if (purpose) where.purpose = purpose as any;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
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
    if (condoFeeMax) where.condoFee = { lte: Number(condoFeeMax) };
    if (iptuMax) {
      // IPTU não existe no schema atual, mas preparado para quando adicionar
      // where.iptu = { lte: Number(iptuMax) };
    }
    
    if (q || keywords) {
      const searchTerm = keywords || q;
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { description: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { street: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { neighborhood: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
        { city: { contains: searchTerm, mode: 'insensitive' as Prisma.QueryMode } },
      ];
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

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        select: {
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
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.property.count({ where }),
    ]);

    if (process.env.NODE_ENV !== "production") {
      console.log("api/properties GET", {
        filters: { city, state, type, purpose, q, bedroomsMin, bathroomsMin, areaMin, status: (where as any).status || "ANY" },
        total,
      });
    }
    const res = NextResponse.json({
      // compat antigo
      success: true,
      properties: items,
      // compat novo (HomeClient/types/api.ts)
      items,
      total,
      page,
      pageSize,
    });
    res.headers.set("x-request-id", requestId);

    // Cache apenas para visitantes (sem cookie). Evita cachear respostas potencialmente diferentes
    // para usuários logados (admin, etc) e reduz invocações repetidas.
    if (!hasSessionCookie) {
      res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    } else {
      res.headers.set("Cache-Control", "private, no-store");
    }
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
    // rate limit
    if (!checkRateLimit(req)) {
      const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
      res.headers.set("x-request-id", requestId);
      return res;
    }
    const session = await getServerSession(authOptions);
    if (!session) {
      console.warn("api/properties POST unauthorized: no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    // Defensive validation for images before zod (limit and URL)
    if (Array.isArray(body?.images)) {
      const imgs = body.images as any[];
      if (imgs.length < 1 || imgs.length > 20) {
        const res = NextResponse.json({ error: "Images count must be between 1 and 20" }, { status: 400 });
        res.headers.set("x-request-id", requestId);
        return res;
      }
      const urlOk = (u: any) => typeof u === 'string' && /^https?:\/\//.test(u);
      for (const it of imgs) {
        if (!it?.url || !urlOk(it.url)) {
          const res = NextResponse.json({ error: "Invalid image URL in payload" }, { status: 400 });
          res.headers.set("x-request-id", requestId);
          return res;
        }
      }
    }
    const parsed = PropertyCreateSchema.safeParse(body);
    if (!parsed.success) {
      const res = NextResponse.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 }
      );
      res.headers.set("x-request-id", requestId);
      return res;
    }

    const { title, description, priceBRL, type, purpose, address, geo, details, images, conditionTags, furnished, petFriendly, privateData, visibility } = parsed.data;

    const price = Math.round(Number(priceBRL) * 100);
    const userId = (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub;
    if (!userId) {
      console.error("api/properties POST: session present but userId missing");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require at least one verified contact channel before allowing property creation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, phone: true, phoneVerifiedAt: true, emailVerified: true },
    });

    if (!user) {
      console.error("api/properties POST: user not found", userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasVerifiedPhone = !!(user.phone && user.phone.trim() && user.phoneVerifiedAt);
    const hasVerifiedEmail = !!user.emailVerified;

    if (!hasVerifiedPhone && !hasVerifiedEmail) {
      const res = NextResponse.json(
        { error: "Para publicar um imóvel, verifique seu telefone ou e-mail em Meu Perfil." },
        { status: 400 }
      );
      res.headers.set("x-request-id", requestId);
      return res;
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
    const validTypes = new Set(["HOUSE","APARTMENT","CONDO","LAND","COMMERCIAL","STUDIO"]);
    const safeType = validTypes.has(type as any) ? type : "HOUSE";

    const createData: any = {
      title,
      description,
      price,
      type: safeType,
      ...(purpose ? { purpose } : {}),
      ownerId: userId || undefined,
      street: address.street,
      neighborhood: address.neighborhood ?? null,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode ?? null,
      latitude: geo.lat,
      longitude: geo.lng,
      furnished: typeof furnished === 'boolean' ? furnished : null,
      petFriendly: typeof petFriendly === 'boolean' ? petFriendly : null,
      bedrooms: details?.bedrooms ?? null,
      bathrooms: details?.bathrooms ?? null,
      areaM2: details?.areaM2 ?? null,
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
      privateOwnerPrice: (privateData as any)?.ownerPrice ?? null,
      privateBrokerFeePercent: (privateData as any)?.brokerFeePercent ?? null,
      privateBrokerFeeFixed: (privateData as any)?.brokerFeeFixed ?? null,
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
      iptuYearly: (visibility as any)?.iptuYearly ?? null,
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
    const created = await prisma.property.create({ data: createData, include: { images: true } });
    console.log("api/properties POST created", { id: created.id, ownerId: created.ownerId, city: created.city, state: created.state, status: created.status, requestId });
    const res = NextResponse.json(created, { status: 201 });
    res.headers.set("x-request-id", requestId);
    return res;
  } catch (err: any) {
    const rid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    console.error("/api/properties POST error", err?.message || err);
    const res = NextResponse.json({ error: "Failed to create property" }, { status: 500 });
    res.headers.set("x-request-id", rid);
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
    // allow limited fields update
    const allowed: any = {};
    const fields = ["title","description","price","type","purpose","conditionTags","street","neighborhood","city","state","postalCode","latitude","longitude","bedrooms","bathrooms","areaM2"];
    for (const k of fields) if (k in data) allowed[k] = data[k];

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
    return NextResponse.json(result);
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
    await prisma.image.deleteMany({ where: { propertyId: id } });
    await prisma.property.delete({ where: { id } });
    console.log("api/properties DELETE", { id, ownerId: existing.ownerId });
    return NextResponse.json({ status: "deleted" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}


