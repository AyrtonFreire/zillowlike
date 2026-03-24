import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSavedSearchParams } from "@/lib/communication-preferences";

function ensureAndArray(where: Prisma.PropertyWhereInput) {
  if (!Array.isArray(where.AND)) {
    where.AND = where.AND ? [where.AND] : [];
  }
  return where.AND;
}

function toCentsFromUnknown(value: unknown) {
  if (value === null || typeof value === "undefined" || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  if (numeric >= 1_000_000) return BigInt(Math.trunc(numeric));
  return BigInt(Math.round(numeric * 100));
}

function toInteger(value: unknown) {
  if (value === null || typeof value === "undefined" || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  return Math.trunc(numeric);
}

export function getSavedSearchAlertSnapshot(rawParams: string | null | undefined) {
  const { filters, queryString } = normalizeSavedSearchParams(rawParams);
  const bedroomsMin = toInteger((filters as any).bedroomsMin ?? (filters as any).minBedrooms);
  const bathroomsMin = Number((filters as any).bathroomsMin ?? (filters as any).minBathrooms);
  const areaMin = toInteger((filters as any).areaMin ?? (filters as any).minArea);

  return {
    filters,
    queryString,
    normalized: {
      city: filters.city,
      state: filters.state,
      type: filters.type,
      purpose: filters.purpose,
      inCondominium: String((filters as any).inCondominium || "").toLowerCase() === "true",
      minPrice: toCentsFromUnknown(filters.minPrice),
      maxPrice: toCentsFromUnknown(filters.maxPrice),
      bedroomsMin,
      bathroomsMin: Number.isFinite(bathroomsMin) && bathroomsMin > 0 ? bathroomsMin : undefined,
      areaMin,
      q: filters.q,
    },
  };
}

export function buildPropertyAlertWhere(rawParams: string | null | undefined, createdAfter?: Date | null) {
  const snapshot = getSavedSearchAlertSnapshot(rawParams);
  const where: Prisma.PropertyWhereInput = {
    status: "ACTIVE",
  };

  if (snapshot.normalized.city) {
    where.city = { equals: snapshot.normalized.city, mode: "insensitive" };
  }

  if (snapshot.normalized.state) {
    where.state = { equals: snapshot.normalized.state, mode: "insensitive" };
  }

  if (snapshot.normalized.type) {
    where.type = snapshot.normalized.type as any;
  }

  if (snapshot.normalized.purpose) {
    const purpose = String(snapshot.normalized.purpose).toUpperCase();
    if (purpose === "SALE") {
      ensureAndArray(where).push({
        OR: [{ purpose: "SALE" as any }, { purpose: null }],
      });
    } else {
      where.purpose = purpose as any;
    }
  }

  if (snapshot.normalized.inCondominium) {
    ensureAndArray(where).push({
      OR: [{ inCondominium: true }, { type: "CONDO" as any }],
    });
  }

  if (snapshot.normalized.minPrice || snapshot.normalized.maxPrice) {
    where.price = {};
    if (snapshot.normalized.minPrice) where.price.gte = snapshot.normalized.minPrice;
    if (snapshot.normalized.maxPrice) where.price.lte = snapshot.normalized.maxPrice;
  }

  if (snapshot.normalized.bedroomsMin) {
    where.bedrooms = { gte: snapshot.normalized.bedroomsMin };
  }

  if (snapshot.normalized.bathroomsMin) {
    where.bathrooms = { gte: snapshot.normalized.bathroomsMin };
  }

  if (snapshot.normalized.areaMin) {
    where.areaM2 = { gte: snapshot.normalized.areaMin };
  }

  if (snapshot.normalized.q) {
    const q = String(snapshot.normalized.q).trim();
    if (q) {
      ensureAndArray(where).push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { neighborhood: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      });
    }
  }

  if (createdAfter) {
    where.createdAt = { gt: createdAfter };
  }

  return { where, snapshot };
}

export async function getPropertyAlertMatches(rawParams: string | null | undefined, createdAfter?: Date | null, take = 6) {
  const { where, snapshot } = buildPropertyAlertWhere(rawParams, createdAfter);
  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      city: true,
      state: true,
      neighborhood: true,
      price: true,
      type: true,
      purpose: true,
      createdAt: true,
      images: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        select: { url: true, alt: true },
      },
    },
  });

  return {
    properties,
    snapshot,
  };
}
