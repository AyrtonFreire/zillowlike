import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (id) {
      const item = await prisma.property.findUnique({
        where: { id },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });
      if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ item });
    }
    const qp = Object.fromEntries(searchParams.entries());
    const parsed = PropertyQuerySchema.safeParse(qp);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { city, state, type, q, minPrice, maxPrice } = parsed.data as any;
    const pageRaw = Number(parsed.data.page ?? 1);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSizeRaw = Number(parsed.data.pageSize ?? 24);
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(pageSizeRaw, 500) : 24;
    const sortRaw = (searchParams.get("sort") || "recent").toLowerCase();
    const allowedSort = new Set(["recent","price_asc","price_desc","area_desc"]);
    const sort = allowedSort.has(sortRaw) ? sortRaw : "recent";
    const bedroomsMin = Number(searchParams.get("bedroomsMin") || 0);
    const bathroomsMin = Number(searchParams.get("bathroomsMin") || 0);
    const areaMin = Number(searchParams.get("areaMin") || 0);

    const where: any = {};
    if (city) where.city = { equals: city, mode: 'insensitive' as Prisma.QueryMode };
    if (state) where.state = { equals: state, mode: 'insensitive' as Prisma.QueryMode };
    if (type) where.type = type as any;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (bedroomsMin) where.bedrooms = { gte: bedroomsMin };
    if (bathroomsMin) where.bathrooms = { gte: bathroomsMin };
    if (areaMin) where.areaM2 = { gte: areaMin };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
        { description: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
        { street: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
        { neighborhood: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
        { city: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
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

    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      sort === "price_asc"
        ? { price: "asc" }
        : sort === "price_desc"
        ? { price: "desc" }
        : sort === "area_desc"
        ? { areaM2: "desc" }
        : { createdAt: "desc" };

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: { images: { orderBy: { sortOrder: "asc" } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({ 
      success: true,
      properties: items, 
      total, 
      page, 
      pageSize 
    });
  } catch (e: any) {
    console.error("/api/properties GET error:", e?.message || e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/properties
// Body: { title, description, priceBRL, type, address, geo, details, images }
export async function POST(req: NextRequest) {
  try {
    // rate limit
    if (!checkRateLimit(req)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const session = await getServerSession();
    if (!session && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = PropertyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, description, priceBRL, type, address, geo, details, images } = parsed.data;

    const price = Math.round(Number(priceBRL) * 100);
    const userId = (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub;

    // AUTO-PROMOTION: Check if user is USER and has no properties yet
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // If user is USER, check if this is their first property → promote to OWNER
      if (user && user.role === "USER") {
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
    }

    const created = await prisma.property.create({
      data: {
        title,
        description,
        price,
        type,
        ownerId: userId || undefined,
        street: address.street,
        neighborhood: address.neighborhood ?? null,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode ?? null,
        latitude: geo.lat,
        longitude: geo.lng,
        bedrooms: details?.bedrooms ?? null,
        bathrooms: details?.bathrooms ?? null,
        areaM2: details?.areaM2 ?? null,
        images:
          Array.isArray(images) && images.length > 0
            ? {
                create: images
                  .filter((img: any) => !!img?.url)
                  .map((img: any, idx: number) => ({
                    url: img.url,
                    alt: img.alt ?? null,
                    sortOrder: img.sortOrder ?? idx,
                  })),
              }
            : undefined,
      },
      include: { images: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}

// PATCH /api/properties  body: { id, data: Partial<Property> }
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
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
    const fields = ["title","description","price","type","street","neighborhood","city","state","postalCode","latitude","longitude","bedrooms","bathrooms","areaM2"];
    for (const k of fields) if (k in data) allowed[k] = data[k];

    // Update property core fields first
    const updated = await prisma.property.update({ where: { id }, data: allowed });

    // Optionally replace images when provided
    if (Array.isArray(data.images)) {
      await prisma.image.deleteMany({ where: { propertyId: id } });
      const toCreate = data.images
        .filter((img: any) => !!img?.url)
        .map((img: any, idx: number) => ({
          url: img.url,
          alt: img.alt ?? null,
          sortOrder: img.sortOrder ?? idx,
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
    const session = await getServerSession();
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
    return NextResponse.json({ status: "deleted" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}


