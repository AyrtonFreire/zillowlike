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

function computeRegionRelevance(current: any, candidate: any) {
  let score = 0;

  if (normalizeText(current.neighborhood) && normalizeText(current.neighborhood) === normalizeText(candidate.neighborhood)) {
    score += 30;
  }

  if (normalizeText(current.type) && normalizeText(current.type) === normalizeText(candidate.type)) {
    score += 20;
  }

  if (normalizeText(current.purpose) && normalizeText(current.purpose) === normalizeText(candidate.purpose)) {
    score += 10;
  }

  const currentPrice = toNumber(current.price);
  const candidatePrice = toNumber(candidate.price);
  if (currentPrice > 0 && candidatePrice > 0) {
    const diffRatio = Math.abs(candidatePrice - currentPrice) / currentPrice;
    if (diffRatio <= 0.1) score += 20;
    else if (diffRatio <= 0.2) score += 12;
    else if (diffRatio <= 0.35) score += 6;
  }

  if (current.bedrooms != null && candidate.bedrooms != null) {
    const diff = Math.abs(Number(current.bedrooms) - Number(candidate.bedrooms));
    if (diff === 0) score += 10;
    else if (diff === 1) score += 5;
  }

  if (current.bathrooms != null && candidate.bathrooms != null) {
    const diff = Math.abs(Number(current.bathrooms) - Number(candidate.bathrooms));
    if (diff === 0) score += 6;
    else if (diff === 1) score += 3;
  }

  if (current.areaM2 != null && candidate.areaM2 != null) {
    const base = Math.max(Number(current.areaM2), 1);
    const diffRatio = Math.abs(Number(candidate.areaM2) - Number(current.areaM2)) / base;
    if (diffRatio <= 0.15) score += 8;
    else if (diffRatio <= 0.3) score += 4;
  }

  return score;
}

function formatRadiusLabel(radiusKm: number) {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return "aqui por perto";
  if (radiusKm < 1) return `até ${Math.round(radiusKm * 1000)} m`;
  const normalized = Number.isInteger(radiusKm) ? String(radiusKm) : radiusKm.toFixed(1).replace(/\.0$/, "");
  return `até ${normalized.replace(".", ",")} km`;
}

function buildNearbyEmptyMessage(params: {
  mode: "disabled" | "distance" | "region";
  radiusKm: number;
  fallback: string;
}) {
  const { mode, radiusKm, fallback } = params;

  if (mode === "distance") {
    return `No momento, não encontramos outros anúncios ativos com perfil compatível ${formatRadiusLabel(radiusKm)} deste imóvel.`;
  }

  if (mode === "region") {
    return "No momento, não encontramos outros anúncios ativos com perfil compatível no mesmo bairro ou entorno deste imóvel.";
  }

  return fallback;
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

    const currentProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        street: true,
        streetNumber: true,
        neighborhood: true,
        city: true,
        state: true,
        postalCode: true,
        hideExactAddress: true,
        type: true,
        purpose: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        areaM2: true,
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

    const nearbyMode = !location.canShowNearby
      ? "disabled"
      : location.nearbyMode === "distance" && (location.lat == null || location.lng == null)
        ? "disabled"
        : location.nearbyMode;
    const nearbyEmptyMessage = buildNearbyEmptyMessage({
      mode: nearbyMode,
      radiusKm,
      fallback: location.nearbyEmptyMessage,
    });

    if (nearbyMode === "disabled") {
      return NextResponse.json({
        success: true,
        properties: [],
        total: 0,
        meta: jsonSafe({
          mode: nearbyMode,
          title: location.nearbyTitle,
          description: location.nearbyDescription,
          emptyMessage: nearbyEmptyMessage,
          distanceLabels: location.canShowDistanceLabels,
          location,
        }),
      });
    }

    const baseWhere: any = {
      id: { not: propertyId },
      status: "ACTIVE",
      city: currentProperty.city,
      state: currentProperty.state,
    };

    if (currentProperty.type) {
      baseWhere.type = currentProperty.type;
    }
    if (currentProperty.purpose) {
      baseWhere.purpose = currentProperty.purpose;
    }

    if (nearbyMode === "region" && currentProperty.neighborhood) {
      baseWhere.neighborhood = currentProperty.neighborhood;
    }

    const allProperties = await prisma.property.findMany({
      where: baseWhere,
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
      take: nearbyMode === "distance" ? 150 : 60,
    });

    const nearbyProperties = nearbyMode === "distance"
      ? allProperties
          .filter((property) => typeof property.latitude === "number" && typeof property.longitude === "number")
          .map((property) => {
            const distance = calculateDistance(
              location.lat as number,
              location.lng as number,
              property.latitude as number,
              property.longitude as number
            );
            return {
              ...property,
              distance,
              contextLabel: distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`,
            };
          })
          .filter((property) => property.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, limit)
      : allProperties
          .map((property) => ({
            ...property,
            regionScore: computeRegionRelevance(currentProperty, property),
            contextLabel: normalizeText(property.neighborhood) === normalizeText(currentProperty.neighborhood)
              ? "Mesmo bairro"
              : "Na mesma região",
          }))
          .sort((a, b) => b.regionScore - a.regionScore || Number(new Date(b.updatedAt).getTime()) - Number(new Date(a.updatedAt).getTime()))
          .slice(0, limit);

    return NextResponse.json({
      success: true,
      properties: jsonSafe(nearbyProperties),
      total: nearbyProperties.length,
      meta: jsonSafe({
        mode: nearbyMode,
        title: location.nearbyTitle,
        description: location.nearbyDescription,
        emptyMessage: nearbyProperties.length > 0 ? location.nearbyEmptyMessage : nearbyEmptyMessage,
        distanceLabels: location.canShowDistanceLabels,
        location,
      }),
    });
  } catch (error) {
    console.error("Error fetching nearby properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby properties" },
      { status: 500 }
    );
  }
}
