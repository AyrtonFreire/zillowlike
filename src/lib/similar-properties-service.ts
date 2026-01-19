import { prisma } from "@/lib/prisma";

export interface SimilarPropertyItem {
  property: {
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
  };
  matchScore: number;
  matchReasons: string[];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.round(value));
  if (value === null || value === undefined) return BigInt(0);
  try {
    return BigInt(value as any);
  } catch {
    return BigInt(0);
  }
}

interface FindSimilarForLeadOptions {
  limit?: number;
}

export class SimilarPropertiesService {
  static async findForLead(
    leadId: string,
    realtorId: string,
    options?: FindSimilarForLeadOptions
  ): Promise<SimilarPropertyItem[]> {
    if (!leadId || !realtorId) {
      return [];
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
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
          },
        },
      },
    });

    if (!lead || !lead.property) {
      return [];
    }

    const base = lead.property;

    const priceCents = toBigInt((base as any).price);
    const minPrice = priceCents > BigInt(0) ? (priceCents * BigInt(85)) / BigInt(100) : undefined;
    const maxPrice = priceCents > BigInt(0) ? (priceCents * BigInt(120)) / BigInt(100) : undefined;

    const where: any = {
      ownerId: realtorId,
      status: "ACTIVE",
      id: { not: base.id },
      type: base.type,
      city: base.city,
      state: base.state,
    };

    if (base.purpose) {
      where.purpose = base.purpose;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }

    const candidates = await prisma.property.findMany({
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
        images: {
          select: { url: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
      take: options?.limit ?? 50,
    });

    const result: SimilarPropertyItem[] = candidates.map((candidate) => {
      const { score, reasons } = computeSimilarityScore(base as any, candidate as any);
      return {
        property: {
          ...candidate,
          price: toNumber((candidate as any).price),
        },
        matchScore: score,
        matchReasons: reasons,
      };
    });

    result.sort((a, b) => b.matchScore - a.matchScore);

    return result;
  }
}

function computeSimilarityScore(
  base: {
    price: number | bigint;
    neighborhood: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    areaM2: number | null;
  },
  candidate: {
    price: number | bigint;
    neighborhood: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    areaM2: number | null;
  }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (base.neighborhood && candidate.neighborhood) {
    if (base.neighborhood.toLowerCase() === candidate.neighborhood.toLowerCase()) {
      score += 3;
      reasons.push("Mesmo bairro");
    }
  }

  const basePrice = toNumber(base.price);
  const candPrice = toNumber(candidate.price);

  if (basePrice > 0 && candPrice > 0) {
    const diffRatio = Math.abs(candPrice - basePrice) / basePrice;
    if (diffRatio < 0.05) {
      score += 3;
      reasons.push("Preço muito próximo");
    } else if (diffRatio < 0.15) {
      score += 2;
      reasons.push("Preço na mesma faixa");
    } else if (diffRatio < 0.3) {
      score += 1;
    }
  }

  if (base.bedrooms != null && candidate.bedrooms != null) {
    const diff = Math.abs(candidate.bedrooms - base.bedrooms);
    if (diff === 0) {
      score += 2;
      reasons.push("Mesma quantidade de quartos");
    } else if (diff === 1) {
      score += 1;
      reasons.push("Quartos parecidos");
    }
  }

  if (base.bathrooms != null && candidate.bathrooms != null) {
    const diff = Math.abs(Number(candidate.bathrooms) - Number(base.bathrooms));
    if (diff === 0) {
      score += 1;
      reasons.push("Mesma quantidade de banheiros");
    } else if (diff <= 1) {
      score += 0.5;
    }
  }

  if (base.areaM2 != null && candidate.areaM2 != null) {
    const diffRatio = Math.abs(candidate.areaM2 - base.areaM2) / Math.max(base.areaM2, 1);
    if (diffRatio < 0.1) {
      score += 2;
      reasons.push("Área muito parecida");
    } else if (diffRatio < 0.25) {
      score += 1;
    }
  }

  return { score, reasons };
}
