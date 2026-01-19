import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonSafe<T>(data: T): any {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
}

// Função para calcular similaridade entre dois imóveis
function calculateSimilarity(
  current: any,
  candidate: any
): { score: number; breakdown: any } {
  let score = 0;
  const breakdown: any = {};

  // Tipo (40%)
  if (current.type === candidate.type) {
    score += 40;
    breakdown.type = 40;
  } else {
    breakdown.type = 0;
  }

  // Preço (30%) - ±15%
  const priceDiff = Math.abs(current.price - candidate.price) / current.price;
  if (priceDiff <= 0.15) {
    const priceScore = 30 * (1 - priceDiff / 0.15);
    score += priceScore;
    breakdown.price = Math.round(priceScore);
  } else {
    breakdown.price = 0;
  }

  // Quartos/Banheiros (20%)
  const bedroomMatch = current.bedrooms === candidate.bedrooms;
  const bathroomMatch = current.bathrooms === candidate.bathrooms;
  if (bedroomMatch && bathroomMatch) {
    score += 20;
    breakdown.rooms = 20;
  } else if (bedroomMatch || bathroomMatch) {
    score += 10;
    breakdown.rooms = 10;
  } else {
    breakdown.rooms = 0;
  }

  // Localização (10%)
  if (current.city === candidate.city) {
    score += 10;
    breakdown.location = 10;
  } else if (current.state === candidate.state) {
    score += 5;
    breakdown.location = 5;
  } else {
    breakdown.location = 0;
  }

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

    // Buscar imóvel atual
    const currentProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        type: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        city: true,
        state: true,
      },
    });

    if (!currentProperty) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Buscar candidatos (exceto o atual)
    const candidates = await prisma.property.findMany({
      where: {
        id: { not: propertyId },
        status: "ACTIVE",
      },
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
    });

    // Calcular similaridade para cada candidato
    const similarProperties = candidates
      .map((candidate) => {
        const similarity = calculateSimilarity(currentProperty, candidate);
        return {
          ...candidate,
          similarityScore: similarity.score,
          similarityBreakdown: similarity.breakdown,
        };
      })
      .filter((property) => property.similarityScore >= minScore)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      properties: jsonSafe(similarProperties),
      total: similarProperties.length,
    });
  } catch (error) {
    console.error("Error fetching similar properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch similar properties" },
      { status: 500 }
    );
  }
}
