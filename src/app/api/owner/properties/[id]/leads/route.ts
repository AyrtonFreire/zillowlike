import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/owner/properties/[id]/leads
 * Get leads for a specific property
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const { id } = await context.params;

    // Verify ownership of the property
    const property = await (prisma as any).property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch leads for this property
    const leads: any[] = await (prisma as any).lead.findMany({
      where: { propertyId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        publicCode: true,
        message: true,
        status: true,
        pipelineStage: true,
        visitDate: true,
        visitTime: true,
        createdAt: true,
        updatedAt: true,
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Map leads to include contact info at top level
    const mappedLeads = leads.map((lead: any) => ({
      id: lead.id,
      publicCode: lead.publicCode ?? null,
      name: lead.contact?.name || lead.user?.name || "Sem nome",
      email: lead.contact?.email || lead.user?.email || "",
      phone: lead.contact?.phone || null,
      message: lead.message,
      status: lead.status,
      pipelineStage: lead.pipelineStage,
      visitDate: lead.visitDate,
      visitTime: lead.visitTime,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    }));

    return NextResponse.json({ success: true, leads: mappedLeads });
  } catch (error) {
    console.error("Error fetching property leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
