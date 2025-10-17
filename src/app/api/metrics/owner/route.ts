import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get date ranges
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get active properties count
    const activeProperties = await prisma.property.count({
      where: {
        ownerId: userId,
        status: "ACTIVE",
      },
    });

    // Get total views
    const totalViews = await prisma.propertyView.count({
      where: {
        property: {
          ownerId: userId,
        },
      },
    });

    // Get views last 7 days
    const viewsLast7Days = await prisma.propertyView.count({
      where: {
        property: {
          ownerId: userId,
        },
        viewedAt: {
          gte: last7Days,
        },
      },
    });

    // Get contacts generated (leads)
    const contactsGenerated = await prisma.lead.count({
      where: {
        property: {
          ownerId: userId,
        },
      },
    });

    // Get contacts last 7 days
    const contactsLast7Days = await prisma.lead.count({
      where: {
        property: {
          ownerId: userId,
        },
        createdAt: {
          gte: last7Days,
        },
      },
    });

    // Get my properties with stats
    const myProperties = await prisma.property.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        images: {
          take: 1,
          orderBy: {
            sortOrder: "asc",
          },
        },
        _count: {
          select: {
            views: true,
            leads: true,
          },
        },
      },
    });

    // Get views by property for chart
    const viewsByProperty = await prisma.property.findMany({
      where: {
        ownerId: userId,
        status: "ACTIVE",
      },
      take: 5,
      orderBy: {
        views: {
          _count: "desc",
        },
      },
      select: {
        title: true,
        _count: {
          select: {
            views: true,
          },
        },
      },
    });

    // Get recent leads/contacts
    const recentContacts = await prisma.lead.findMany({
      where: {
        property: {
          ownerId: userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        property: {
          select: {
            title: true,
          },
        },
        realtor: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate view trend
    const viewsPrevious7Days = await prisma.propertyView.count({
      where: {
        property: {
          ownerId: userId,
        },
        viewedAt: {
          gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
          lt: last7Days,
        },
      },
    });

    const viewTrend =
      viewsPrevious7Days > 0
        ? ((viewsLast7Days - viewsPrevious7Days) / viewsPrevious7Days) * 100
        : viewsLast7Days > 0
        ? 100
        : 0;

    return NextResponse.json({
      metrics: {
        activeProperties,
        totalViews,
        viewsLast7Days,
        viewTrend: {
          value: Math.round(viewTrend),
          isPositive: viewTrend >= 0,
        },
        contactsGenerated,
        contactsLast7Days,
      },
      myProperties: myProperties.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        status: p.status,
        image: p.images[0]?.url || "/placeholder.jpg",
        views: p._count.views,
        leads: p._count.leads,
      })),
      viewsByProperty: viewsByProperty.map((p) => ({
        name: p.title.length > 20 ? p.title.substring(0, 20) + "..." : p.title,
        views: p._count.views,
      })),
      recentContacts: recentContacts.map((l) => ({
        id: l.id,
        propertyTitle: l.property.title,
        realtorName: l.realtor?.name || "Interessado",
        status: l.status,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching owner metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
