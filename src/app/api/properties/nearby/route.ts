import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Função para calcular distância entre dois pontos (Haversine)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("id");
    const radiusKm = parseFloat(searchParams.get("radius") || "3");
    const limit = parseInt(searchParams.get("limit") || "8");

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
        latitude: true,
        longitude: true,
        type: true,
      },
    });

    if (!currentProperty || !currentProperty.latitude || !currentProperty.longitude) {
      return NextResponse.json(
        { error: "Property not found or missing coordinates" },
        { status: 404 }
      );
    }

    // Buscar todos os imóveis próximos (exceto o atual)
    const allProperties = await prisma.property.findMany({
      where: {
        id: { not: propertyId },
        type: currentProperty.type,
      },
      include: {
        images: {
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Calcular distância e filtrar por raio
    const nearbyProperties = allProperties
      .map((property) => ({
        ...property,
        distance: calculateDistance(
          currentProperty.latitude!,
          currentProperty.longitude!,
          property.latitude!,
          property.longitude!
        ),
      }))
      .filter((property) => property.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      properties: nearbyProperties,
      total: nearbyProperties.length,
    });
  } catch (error) {
    console.error("Error fetching nearby properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby properties" },
      { status: 500 }
    );
  }
}
