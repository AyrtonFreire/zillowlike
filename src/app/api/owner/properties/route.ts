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

    const impersonateId = req.nextUrl.searchParams.get("userId");
    const sessionUser = (session as any)?.user as any;
    const sessionRole = sessionUser?.role;

    let userId = (session as any)?.userId || sessionUser?.id;

    if (impersonateId) {
      if (sessionRole !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      userId = impersonateId;
    }

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

    // Aggregate visit stats per property
    const now = new Date();

    const [scheduledVisits, completedVisits, pendingApprovals] = await Promise.all([
      prisma.lead.groupBy({
        by: ["propertyId"],
        where: {
          property: { ownerId: userId },
          status: "CONFIRMED",
          visitDate: {
            gte: now,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.lead.groupBy({
        by: ["propertyId"],
        where: {
          property: { ownerId: userId },
          status: "COMPLETED",
        },
        _count: {
          _all: true,
        },
      }),
      prisma.lead.groupBy({
        by: ["propertyId"],
        where: {
          property: { ownerId: userId },
          status: "WAITING_OWNER_APPROVAL",
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const scheduledByProperty: Record<string, number> = {};
    const completedByProperty: Record<string, number> = {};
    const pendingByProperty: Record<string, number> = {};

    let totalScheduledVisits = 0;
    let totalCompletedVisits = 0;

    for (const item of scheduledVisits) {
      scheduledByProperty[item.propertyId] = item._count._all;
      totalScheduledVisits += item._count._all;
    }

    for (const item of completedVisits) {
      completedByProperty[item.propertyId] = item._count._all;
      totalCompletedVisits += item._count._all;
    }

    for (const item of pendingApprovals) {
      pendingByProperty[item.propertyId] = item._count._all;
    }

    // Calculate metrics
    const metrics = {
      totalProperties: properties.length,
      activeProperties: properties.filter((p: any) => p.status === "ACTIVE").length,
      pausedProperties: properties.filter((p: any) => p.status === "PAUSED").length,
      draftProperties: properties.filter((p: any) => p.status === "DRAFT").length,
      totalViews: properties.reduce((sum: number, p: any) => sum + p._count.views, 0),
      totalLeads: properties.reduce((sum: number, p: any) => sum + p._count.leads, 0),
      totalFavorites: properties.reduce((sum: number, p: any) => sum + p._count.favorites, 0),
      scheduledVisits: totalScheduledVisits,
      completedVisits: totalCompletedVisits,
    };

    // Format properties for frontend
    const formattedProperties = properties.map((p: any) => ({
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
      // Flatten commonly used counters for dashboards
      views: p._count.views,
      leads: p._count.leads,
      favorites: p._count.favorites,
      scheduledVisits: scheduledByProperty[p.id] || 0,
      completedVisits: completedByProperty[p.id] || 0,
      pendingApprovals: pendingByProperty[p.id] || 0,
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
