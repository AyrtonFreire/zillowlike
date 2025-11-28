import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const { id } = await context.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Verify ownership
    if (property.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, property });
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

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const { id } = await context.params;
    const body = await req.json();

    // Verify ownership first
    const existing = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (existing.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update allowed fields
    const updateData: any = {};
    const allowedFields = [
      "title",
      "description",
      "price",
      "type",
      "status",
      "street",
      "neighborhood",
      "city",
      "state",
      "postalCode",
      "latitude",
      "longitude",
      "bedrooms",
      "bathrooms",
      "areaM2",
      "suites",
      "parkingSpots",
      "floor",
      "furnished",
      "petFriendly",
      "condoFee",
      "yearBuilt",
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
      "hideCondoFee",
      "hideIPTU",
      "iptuYearly",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

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
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ success: true, property: result });
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

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const { id } = await context.params;

    // Verify ownership
    const existing = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (existing.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
