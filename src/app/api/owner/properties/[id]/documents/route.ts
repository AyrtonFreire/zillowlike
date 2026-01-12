import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/owner/properties/[id]/documents
 * Get documents for a specific property
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const { id } = await context.params;

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    // Verify ownership of the property
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch documents for this property
    const documents = await prisma.propertyDocument.findMany({
      where: { propertyId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error("Error fetching property documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/owner/properties/[id]/documents
 * Add a new document to a property
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const { id } = await context.params;
    const body = await req.json();

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    // Verify ownership of the property
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate required fields
    const { name, fileName, url, mimeType, sizeBytes, category, isPublic } = body;
    
    if (!name || !fileName || !url) {
      return NextResponse.json(
        { error: "name, fileName and url are required" },
        { status: 400 }
      );
    }

    // Valid categories
    const validCategories = ["DEED", "IPTU", "CONDO", "CONTRACT", "FLOOR_PLAN", "INSPECTION", "PHOTO_360", "OTHER"];
    const safeCategory = validCategories.includes(category) ? category : "OTHER";

    // Create document
    const document = await prisma.propertyDocument.create({
      data: {
        propertyId: id,
        name,
        fileName,
        url,
        mimeType: mimeType || null,
        sizeBytes: sizeBytes ? parseInt(sizeBytes) : null,
        category: safeCategory,
        isPublic: typeof isPublic === "boolean" ? isPublic : false,
        uploadedBy: userId,
      },
    });

    return NextResponse.json({ success: true, document }, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/owner/properties/[id]/documents
 * Delete a document (pass documentId in body)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const { id } = await context.params;
    const body = await req.json();
    const { documentId } = body;

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    // Verify ownership of the property
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify document belongs to this property
    const document = await prisma.propertyDocument.findUnique({
      where: { id: documentId },
      select: { propertyId: true },
    });

    if (!document || document.propertyId !== id) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete document
    await prisma.propertyDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/owner/properties/[id]/documents
 * Update a document (pass documentId and fields in body)
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
    const { documentId, ...updateFields } = body;

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    // Verify ownership of the property
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify document belongs to this property
    const document = await prisma.propertyDocument.findUnique({
      where: { id: documentId },
      select: { propertyId: true },
    });

    if (!document || document.propertyId !== id) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Filter allowed fields
    const allowedFields = ["name", "category", "isPublic"];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in updateFields) {
        updateData[field] = updateFields[field];
      }
    }

    // Update document
    const updated = await prisma.propertyDocument.update({
      where: { id: documentId },
      data: updateData,
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}
