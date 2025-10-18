import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/owner/properties
 * Returns all properties owned by the current user with stats
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    // Get all properties owned by this user
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1, // Just the first image
        },
        _count: {
          select: {
            favorites: true,
            leads: true,
            views: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate metrics
    const metrics = {
      totalProperties: properties.length,
      activeProperties: properties.filter(p => p.status === "ACTIVE").length,
      pausedProperties: properties.filter(p => p.status === "PAUSED").length,
      draftProperties: properties.filter(p => p.status === "DRAFT").length,
      totalViews: properties.reduce((sum, p) => sum + p._count.views, 0),
      totalLeads: properties.reduce((sum, p) => sum + p._count.leads, 0),
      totalFavorites: properties.reduce((sum, p) => sum + p._count.favorites, 0),
    };

    // Format properties for frontend
    const formattedProperties = properties.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      status: p.status,
      type: p.type,
      city: p.city,
      state: p.state,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      areaM2: p.areaM2,
      image: p.images[0]?.url || null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      stats: {
        views: p._count.views,
        leads: p._count.leads,
        favorites: p._count.favorites,
      },
    }));

    return NextResponse.json({
      success: true,
      properties: formattedProperties,
      metrics,
    });
  } catch (error) {
    console.error("Error fetching owner properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
