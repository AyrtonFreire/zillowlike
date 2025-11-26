import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session as any)?.role;

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { propertyId } = await params;

    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        ownerId: true,
        title: true,
        city: true,
        state: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Imóvel não encontrado" }, { status: 404 });
    }

    await prisma.property.delete({
      where: { id: propertyId },
    });

    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.ADMIN_PROPERTY_DELETE,
        message: "Admin deletou imóvel",
        actorId: (session as any).userId || (session as any).user?.id || null,
        actorEmail: (session as any).user?.email || null,
        actorRole: userRole,
        targetType: "PROPERTY",
        targetId: propertyId,
        metadata: {
          ownerId: existing.ownerId,
          title: existing.title,
          city: existing.city,
          state: existing.state,
        },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { error: "Failed to delete property" },
      { status: 500 }
    );
  }
}
