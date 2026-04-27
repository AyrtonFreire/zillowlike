import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePublicPropertyLocation } from "@/lib/property-location";

function jsonSafe<T>(data: T): any {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function calculateSimilarity(
  current: any,
  candidate: any
): { score: number; breakdown: any } {
  let score = 0;
  const breakdown: any = {};

  if (current.type === candidate.type) {
    score += 28;
    breakdown.type = 28;
  } else {
    breakdown.type = 0;
  }

  const currentPrice = toNumber(current.price);
  const candidatePrice = toNumber(candidate.price);
  const priceDiff = currentPrice > 0 ? Math.abs(currentPrice - candidatePrice) / currentPrice : 1;
  if (currentPrice > 0 && priceDiff <= 0.3) {
    const priceScore = 24 * (1 - priceDiff / 0.3);
    score += priceScore;
    breakdown.price = Math.round(priceScore);
  } else {
    breakdown.price = 0;
  }

  let roomsScore = 0;
  if (current.bedrooms != null && candidate.bedrooms != null) {
    const diff = Math.abs(Number(current.bedrooms) - Number(candidate.bedrooms));
    if (diff === 0) roomsScore += 8;
    else if (diff === 1) roomsScore += 4;
  }
  if (current.bathrooms != null && candidate.bathrooms != null) {
    const diff = Math.abs(Number(current.bathrooms) - Number(candidate.bathrooms));
    if (diff === 0) roomsScore += 8;
    else if (diff === 1) roomsScore += 4;
  }
  score += roomsScore;
  breakdown.rooms = roomsScore;

  let areaScore = 0;
  if (current.areaM2 != null && candidate.areaM2 != null) {
    const base = Math.max(Number(current.areaM2), 1);
    const diffRatio = Math.abs(Number(candidate.areaM2) - Number(current.areaM2)) / base;
    if (diffRatio <= 0.15) areaScore = 12;
    else if (diffRatio <= 0.3) areaScore = 6;
  }
  score += areaScore;
  breakdown.area = areaScore;

  let locationScore = 0;
  if (normalizeText(current.neighborhood) && normalizeText(current.neighborhood) === normalizeText(candidate.neighborhood)) {
    locationScore = 18;
  } else if (current.city === candidate.city && current.state === candidate.state) {
    locationScore = 10;
  } else if (current.state === candidate.state) {
    locationScore = 4;
  }
  score += locationScore;
  breakdown.location = locationScore;

  let purposeScore = 0;
  if (current.purpose && candidate.purpose && current.purpose === candidate.purpose) {
    purposeScore = 8;
  }
  score += purposeScore;
  breakdown.purpose = purposeScore;

  return { score, breakdown };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "8");
    const minScore = parseFloat(searchParams.get("minScore") || "30");

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    const currentProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        type: true,
        purpose: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        areaM2: true,
        neighborhood: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        street: true,
        streetNumber: true,
        postalCode: true,
        hideExactAddress: true,
      },
    });

    if (!currentProperty) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const location = await resolvePublicPropertyLocation({
      id: currentProperty.id,
      latitude: currentProperty.latitude,
      longitude: currentProperty.longitude,
      street: currentProperty.street,
      streetNumber: currentProperty.streetNumber,
      neighborhood: currentProperty.neighborhood,
      city: currentProperty.city,
      state: currentProperty.state,
      postalCode: currentProperty.postalCode,
      hideExactAddress: currentProperty.hideExactAddress,
    });

    const candidatesWhere: any = {
      id: { not: propertyId },
      status: "ACTIVE",
      state: currentProperty.state,
    };

    const candidateHints = [
      currentProperty.city ? { city: currentProperty.city } : null,
      currentProperty.type ? { type: currentProperty.type } : null,
      currentProperty.purpose ? { purpose: currentProperty.purpose } : null,
      currentProperty.neighborhood ? { neighborhood: currentProperty.neighborhood } : null,
    ].filter(Boolean) as any[];

    if (candidateHints.length > 0) {
      candidatesWhere.OR = candidateHints;
    }

    const candidates = await prisma.property.findMany({
      where: candidatesWhere,
      select: {
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
        createdAt: true,
        images: { select: { id: true, url: true }, orderBy: { sortOrder: "asc" }, take: 6 },
        owner: { select: { id: true, name: true, image: true, publicSlug: true, role: true } },
        team: {
          select: {
            id: true,
            name: true,
            owner: { select: { id: true, name: true, image: true } },
          },
        },
      },
      take: 150,
    });

    const similarProperties = candidates
      .map((candidate) => {
        const similarity = calculateSimilarity(currentProperty, candidate);
        return {
          ...candidate,
          similarityScore: similarity.score,
          similarityBreakdown: similarity.breakdown,
          contextLabel:
            normalizeText(currentProperty.neighborhood) && normalizeText(currentProperty.neighborhood) === normalizeText(candidate.neighborhood)
              ? "Mesmo bairro"
              : currentProperty.city === candidate.city
              ? "Mesma cidade"
              : "Mesmo estado",
        };
      })
      .filter((property) => property.similarityScore >= minScore)
      .sort((a, b) => b.similarityScore - a.similarityScore || Number(new Date(b.updatedAt).getTime()) - Number(new Date(a.updatedAt).getTime()))
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      properties: jsonSafe(similarProperties),
      total: similarProperties.length,
      meta: jsonSafe({
        title: location.similarTitle,
        description: location.canShowNearby
          ? "Priorizamos tipologia, faixa de preço, metragem e contexto local do anúncio."
          : "Sem localização precisa, priorizamos tipologia, faixa de preço e cidade do anúncio.",
        emptyMessage: "Ainda não encontramos imóveis com perfil parecido o suficiente para mostrar aqui.",
        location,
      }),
    });
  } catch (error) {
    console.error("Error fetching similar properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch similar properties" },
      { status: 500 }
    );
  }
}
