import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRecoveryFactor } from "@/lib/recovery-factor";
import { parseVideoUrl } from "@/lib/video";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/owner/properties/[id]
 * Get single property details for editing
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = (session as any)?.user as any;
    const userId = (session as any)?.userId || sessionUser?.id;
    const role = sessionUser?.role as string | undefined;
    const { id } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = role === "ADMIN";

    const property = isAdmin
      ? await prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        _count: {
          select: {
            favorites: true,
            leads: true,
            views: true,
          },
        },
      },
    })
      : await prisma.property.findFirst({
      where: { id, ownerId: userId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        _count: {
          select: {
            favorites: true,
            leads: true,
            views: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    return NextResponse.json({ success: true, property: jsonSafe(property) });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/owner/properties/[id]
 * Update property
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = (session as any)?.user as any;
    const userId = (session as any)?.userId || sessionUser?.id;
    const role = sessionUser?.role as string | undefined;
    const { id } = await context.params;
    const body = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = role === "ADMIN";

    // Verify ownership first
    const existing = isAdmin
      ? await prisma.property.findUnique({
          where: { id },
          select: { ownerId: true },
        })
      : await prisma.property.findFirst({
          where: { id, ownerId: userId },
          select: { ownerId: true },
        });

    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    // Update allowed fields
    const updateData: any = {};
    const allowedFields = [
      "title",
      "description",
      "price",
      "type",
      "status",
      "purpose",
      "capturerRealtorId",
      "videoUrl",
      "street",
      "streetNumber",
      "addressComplement",
      "neighborhood",
      "city",
      "state",
      "postalCode",
      "latitude",
      "longitude",
      "bedrooms",
      "bathrooms",
      "areaM2",
      "builtAreaM2",
      "lotAreaM2",
      "privateAreaM2",
      "usableAreaM2",
      "suites",
      "parkingSpots",
      "floor",
      "furnished",
      "petFriendly",
      "condoFee",
      "yearBuilt",
      "totalFloors",
      "yearRenovated",
      // Amenidades / condomínio
      "hasBalcony",
      "hasElevator",
      "hasPool",
      "hasGym",
      "hasPlayground",
      "hasPartyRoom",
      "hasGourmet",
      "hasConcierge24h",
      // Acessibilidade
      "accRamps",
      "accWideDoors",
      "accAccessibleElevator",
      "accTactile",
      // Conforto / energia
      "comfortAC",
      "comfortHeating",
      "comfortSolar",
      "comfortNoiseWindows",
      "comfortLED",
      "comfortWaterReuse",
      // Acabamentos
      "finishFloor",
      "finishCabinets",
      "finishCounterGranite",
      "finishCounterQuartz",
      // Vista / posição
      "viewSea",
      "viewCity",
      "positionFront",
      "positionBack",
      "sunByRoomNote",
      // Pets / políticas
      "petsSmall",
      "petsLarge",
      "condoRules",
      // Outros
      "sunOrientation",
      "conditionTags",
      // Dados privados do proprietário
      "privateOwnerName",
      "privateOwnerPhone",
      "privateOwnerEmail",
      "privateOwnerAddress",
      "privateOwnerPrice",
      "privateBrokerFeePercent",
      "privateBrokerFeeFixed",
      "privateExclusive",
      "privateExclusiveUntil",
      "privateOccupied",
      "privateOccupantInfo",
      "privateKeyLocation",
      "privateNotes",
      // Configurações de visibilidade
      "hidePrice",
      "hideExactAddress",
      "hideOwnerContact",
      "hideCondoFee",
      "hideIPTU",
      "iptuYearly",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if ("capturerRealtorId" in updateData) {
      const raw = updateData.capturerRealtorId;
      const normalized = raw === "" || raw === null || typeof raw === "undefined" ? null : String(raw);
      updateData.capturerRealtorId = normalized;

      if (normalized) {
        const prop = await prisma.property.findUnique({
          where: { id },
          select: { teamId: true },
        });

        const teamId = (prop as any)?.teamId ? String((prop as any).teamId) : null;
        if (!teamId) {
          return NextResponse.json({ error: "Este imóvel não está vinculado a um time." }, { status: 400 });
        }

        const membership = await (prisma as any).teamMember.findFirst({
          where: {
            teamId,
            userId: String(normalized),
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
          return NextResponse.json({ error: "Corretor captador inválido para este time." }, { status: 400 });
        }
      }
    }

    if ("videoUrl" in updateData) {
      const raw = typeof updateData.videoUrl === "string" ? updateData.videoUrl.trim() : "";
      if (!raw) {
        updateData.videoUrl = null;
        updateData.videoProvider = null;
        updateData.videoId = null;
      } else {
        const parsed = parseVideoUrl(raw);
        if (!parsed) {
          return NextResponse.json({ error: "Invalid video url" }, { status: 400 });
        }
        updateData.videoUrl = parsed.canonicalUrl;
        updateData.videoProvider = parsed.provider;
        updateData.videoId = parsed.id;
      }
    }

    // Monetary fields are stored in cents as BigInt
    if ("price" in updateData) updateData.price = toBigIntOrNull(updateData.price);
    if ("condoFee" in updateData) updateData.condoFee = toBigIntOrNull(updateData.condoFee);
    if ("privateOwnerPrice" in updateData) updateData.privateOwnerPrice = toBigIntOrNull(updateData.privateOwnerPrice);
    if ("privateBrokerFeeFixed" in updateData) updateData.privateBrokerFeeFixed = toBigIntOrNull(updateData.privateBrokerFeeFixed);
    if ("iptuYearly" in updateData) updateData.iptuYearly = toBigIntOrNull(updateData.iptuYearly);

    const updated = await prisma.property.update({
      where: { id },
      data: updateData,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    // Handle images if provided
    if (Array.isArray(body.images)) {
      // Delete existing images
      await prisma.image.deleteMany({ where: { propertyId: id } });
      
      // Create new images
      if (body.images.length > 0) {
        await prisma.image.createMany({
          data: body.images.map((img: any, idx: number) => ({
            propertyId: id,
            url: img.url,
            alt: img.alt || null,
            sortOrder: img.sortOrder ?? idx,
          })),
        });
      }
    }

    // Fetch complete updated property
    const result = await prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        _count: {
          select: {
            favorites: true,
            leads: true,
            views: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, property: jsonSafe(result) });
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { error: "Failed to update property" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/owner/properties/[id]
 * Delete property (soft delete by setting status to DELETED)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = (session as any)?.user as any;
    const userId = (session as any)?.userId || sessionUser?.id;
    const role = sessionUser?.role as string | undefined;
    const { id } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = role === "ADMIN";

    // Verify ownership
    const existing = isAdmin
      ? await prisma.property.findUnique({
          where: { id },
          select: { ownerId: true },
        })
      : await prisma.property.findFirst({
          where: { id, ownerId: userId },
          select: { ownerId: true },
        });

    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    // Soft delete - just set status to DELETED or actually delete?
    // For now, hard delete. Can change to soft delete if needed.
    await prisma.image.deleteMany({ where: { propertyId: id } });
    await prisma.property.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Property deleted" });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { error: "Failed to delete property" },
      { status: 500 }
    );
  }
}
