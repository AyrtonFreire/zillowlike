import { prisma } from "@/lib/prisma";

export type ClientMatchScope = "PORTFOLIO" | "MARKET";

export type ClientPreferenceInput = {
  city: string;
  state: string;
  neighborhoods: string[];
  purpose: "SALE" | "RENT" | null;
  types: string[];
  minPrice: number | null;
  maxPrice: number | null;
  bedroomsMin: number | null;
  bathroomsMin: number | null;
  areaMin: number | null;
  scope: ClientMatchScope;
  updatedAt: Date;
};

export type MatchCandidate = {
  id: string;
  title: string;
  price: number;
  type: string;
  purpose: "SALE" | "RENT" | null;
  status: string;
  city: string;
  state: string;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  images: { url: string }[];
  [key: string]: any;
};

export type ClientMatchItem = {
  property: MatchCandidate;
  score: number;
  reasons: string[];
};

function clampInt(n: number, min: number, max: number) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function normText(v: any) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function includesInsensitive(list: string[], value: string) {
  const n = normText(value);
  return list.some((x) => normText(x) === n);
}

export class ClientMatchService {
  static readonly CACHE_TTL_MS = 1000 * 60 * 60 * 6;

  static computeScore(pref: ClientPreferenceInput, property: MatchCandidate): { score: number; reasons: string[] } {
    const reasons: string[] = [];

    // Weights sum ~ 100
    const W_NEIGHBORHOOD = 22;
    const W_PRICE = 26;
    const W_BEDROOMS = 14;
    const W_BATHROOMS = 10;
    const W_AREA = 12;

    let score = 0;

    const neighborhoods = Array.isArray(pref.neighborhoods) ? pref.neighborhoods.filter(Boolean) : [];
    if (neighborhoods.length > 0 && property.neighborhood) {
      if (includesInsensitive(neighborhoods, property.neighborhood)) {
        score += W_NEIGHBORHOOD;
        reasons.push("No bairro desejado");
      }
    }

    const price = typeof property.price === "number" ? property.price : 0;
    const minPrice = typeof pref.minPrice === "number" ? pref.minPrice : null;
    const maxPrice = typeof pref.maxPrice === "number" ? pref.maxPrice : null;

    if (price > 0 && (minPrice != null || maxPrice != null)) {
      const hardMin = minPrice != null ? minPrice : 0;
      const hardMax = maxPrice != null ? maxPrice : Number.POSITIVE_INFINITY;
      const center = (hardMin + Math.min(hardMax, hardMin + 1_000_000_000_000)) / 2;
      const range = Math.max(hardMax - hardMin, 1);

      if (price >= hardMin && price <= hardMax) {
        score += W_PRICE;
        reasons.push("Preço dentro da faixa");
      } else {
        // Soft tolerance: within 10% outside range gives partial points
        const tolMin = hardMin > 0 ? Math.round(hardMin * 0.9) : 0;
        const tolMax = hardMax !== Number.POSITIVE_INFINITY ? Math.round(hardMax * 1.1) : Number.POSITIVE_INFINITY;
        if (price >= tolMin && price <= tolMax) {
          const dist = Math.abs(price - center);
          const ratio = Math.min(dist / range, 1);
          score += W_PRICE * (1 - 0.6 * ratio);
        }
      }
    } else if (price > 0) {
      // If no price constraints, give a small baseline for having a price.
      score += Math.min(6, W_PRICE * 0.25);
    }

    const bedroomsMin = typeof pref.bedroomsMin === "number" ? pref.bedroomsMin : null;
    if (bedroomsMin != null && bedroomsMin > 0 && property.bedrooms != null) {
      if (property.bedrooms >= bedroomsMin) {
        score += W_BEDROOMS;
        reasons.push(`${property.bedrooms} quarto(s)`);
      } else if (property.bedrooms >= bedroomsMin - 1) {
        score += W_BEDROOMS * 0.55;
      }
    } else {
      score += W_BEDROOMS * 0.2;
    }

    const bathroomsMin = typeof pref.bathroomsMin === "number" ? pref.bathroomsMin : null;
    if (bathroomsMin != null && bathroomsMin > 0 && property.bathrooms != null) {
      if (property.bathrooms >= bathroomsMin) {
        score += W_BATHROOMS;
        reasons.push(`${property.bathrooms} banheiro(s)`);
      } else if (property.bathrooms >= bathroomsMin - 0.5) {
        score += W_BATHROOMS * 0.55;
      }
    } else {
      score += W_BATHROOMS * 0.2;
    }

    const areaMin = typeof pref.areaMin === "number" ? pref.areaMin : null;
    if (areaMin != null && areaMin > 0 && property.areaM2 != null) {
      if (property.areaM2 >= areaMin) {
        score += W_AREA;
        reasons.push(`${property.areaM2} m²`);
      } else if (property.areaM2 >= Math.round(areaMin * 0.9)) {
        score += W_AREA * 0.5;
      }
    } else {
      score += W_AREA * 0.2;
    }

    const finalScore = clampInt(score, 0, 100);
    return { score: finalScore, reasons: reasons.slice(0, 6) };
  }

  static async getOrRefreshMatches(input: {
    clientId: string;
    teamId: string;
    limit: number;
    forceRefresh?: boolean;
  }): Promise<{ items: ClientMatchItem[]; scope: ClientMatchScope; refreshed: boolean }> {
    const { clientId, teamId } = input;
    const limit = Math.max(1, Math.min(100, Math.round(input.limit || 24)));
    const forceRefresh = input.forceRefresh === true;

    const db = prisma as any;
    const client = await db.client.findFirst({
      where: { id: clientId, teamId },
      include: { preference: true },
    });

    if (!client) {
      throw new Error("Client not found");
    }

    if (!client.preference) {
      return { items: [], scope: "PORTFOLIO", refreshed: false };
    }

    const pref: ClientPreferenceInput = {
      city: client.preference.city,
      state: client.preference.state,
      neighborhoods: client.preference.neighborhoods || [],
      purpose: client.preference.purpose,
      types: client.preference.types || [],
      minPrice: client.preference.minPrice,
      maxPrice: client.preference.maxPrice,
      bedroomsMin: client.preference.bedroomsMin,
      bathroomsMin: client.preference.bathroomsMin,
      areaMin: client.preference.areaMin,
      scope: client.preference.scope,
      updatedAt: client.preference.updatedAt,
    };

    const scope: ClientMatchScope = pref.scope;

    if (!forceRefresh) {
      const cached = await db.clientPropertyMatch.findMany({
        where: {
          clientId,
          scope,
          preferenceUpdatedAt: pref.updatedAt,
          computedAt: { gte: new Date(Date.now() - ClientMatchService.CACHE_TTL_MS) },
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              price: true,
              type: true,
              purpose: true,
              status: true,
              city: true,
              state: true,
              neighborhood: true,
              bedrooms: true,
              bathrooms: true,
              areaM2: true,
              images: {
                select: { url: true },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
        },
        orderBy: [{ score: "desc" }],
        take: limit,
      });

      if (cached.length > 0) {
        return {
          scope,
          refreshed: false,
          items: cached.map((m: any) => ({ property: m.property, score: m.score, reasons: m.reasons || [] })),
        };
      }
    }

    const candidates = await ClientMatchService.findCandidates({
      teamId,
      scope,
      pref,
      limit,
    });

    const ranked = ClientMatchService.rank(pref, candidates, limit);
    const computedAt = new Date();
    const topIds = ranked.map((x) => x.property.id);

    await db.$transaction(async (tx: any) => {
      if (topIds.length === 0) {
        await tx.clientPropertyMatch.deleteMany({ where: { clientId, scope } });
        return;
      }

      await tx.clientPropertyMatch.deleteMany({
        where: {
          clientId,
          scope,
          OR: [{ preferenceUpdatedAt: { not: pref.updatedAt } }, { propertyId: { notIn: topIds } }],
        },
      });

      for (const item of ranked) {
        await tx.clientPropertyMatch.upsert({
          where: {
            clientId_propertyId_scope: {
              clientId,
              propertyId: item.property.id,
              scope,
            },
          },
          create: {
            clientId,
            propertyId: item.property.id,
            scope,
            score: item.score,
            reasons: item.reasons,
            computedAt,
            preferenceUpdatedAt: pref.updatedAt,
          },
          update: {
            score: item.score,
            reasons: item.reasons,
            computedAt,
            preferenceUpdatedAt: pref.updatedAt,
          },
        });
      }
    });

    return { items: ranked, scope, refreshed: true };
  }

  static async findCandidates(input: {
    teamId: string;
    scope: ClientMatchScope;
    pref: ClientPreferenceInput;
    limit: number;
  }): Promise<MatchCandidate[]> {
    const { teamId, scope, pref, limit } = input;

    const where: any = {
      status: "ACTIVE",
    };

    if (scope === "PORTFOLIO") {
      where.teamId = String(teamId);
    } else {
      where.city = { equals: pref.city, mode: "insensitive" };
      where.state = { equals: pref.state, mode: "insensitive" };
    }

    if (pref.purpose) {
      where.purpose = pref.purpose;
    }

    if (Array.isArray(pref.types) && pref.types.length > 0) {
      where.type = { in: pref.types as any };
    }

    if (pref.minPrice != null || pref.maxPrice != null) {
      where.price = {};
      if (pref.minPrice != null) where.price.gte = Math.round(pref.minPrice * 0.9);
      if (pref.maxPrice != null) where.price.lte = Math.round(pref.maxPrice * 1.1);
    }

    // Candidate limit: fetch more than final limit for scoring.
    const candidateTake = Math.max(Math.min(limit * 10, 800), Math.min(limit * 4, 200));

    return prisma.property.findMany({
      where,
      select: {
        id: true,
        title: true,
        price: true,
        type: true,
        purpose: true,
        status: true,
        city: true,
        state: true,
        neighborhood: true,
        bedrooms: true,
        bathrooms: true,
        areaM2: true,
        furnished: true,
        petFriendly: true,
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
        petsSmall: true,
        petsLarge: true,
        sunOrientation: true,
        images: {
          select: { url: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: candidateTake,
    }) as any;
  }

  static rank(pref: ClientPreferenceInput, candidates: MatchCandidate[], limit: number): ClientMatchItem[] {
    const items = candidates
      .map((p) => {
        const { score, reasons } = ClientMatchService.computeScore(pref, p);
        return { property: p, score, reasons };
      })
      .sort((a, b) => b.score - a.score);

    return items.slice(0, Math.max(1, limit));
  }
}
