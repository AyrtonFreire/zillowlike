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
    const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get active properties count
    const activeProperties = await prisma.property.count({
      where: {
        ownerId: userId,
        status: "ACTIVE",
      },
    });

    // Get total properties
    const totalProperties = await prisma.property.count({
      where: {
        ownerId: userId,
      },
    });

    // Get leads received (last 7 days)
    const leadsLast7Days = await prisma.lead.count({
      where: {
        realtorId: userId,
        createdAt: {
          gte: last7Days,
        },
      },
    });

    // Get leads from previous 7 days for comparison
    const leadsPrevious7Days = await prisma.lead.count({
      where: {
        realtorId: userId,
        createdAt: {
          gte: last14Days,
          lt: last7Days,
        },
      },
    });

    // Get average response time (in minutes) for leads responded in the last 7 days window
    const leads = await prisma.lead.findMany({
      where: {
        realtorId: userId,
        createdAt: {
          gte: last7Days,
        },
        status: {
          in: ["ACCEPTED", "REJECTED"],
        },
        respondedAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        respondedAt: true,
      },
    });

    const prevLeads = await prisma.lead.findMany({
      where: {
        realtorId: userId,
        createdAt: {
          gte: last14Days,
          lt: last7Days,
        },
        status: {
          in: ["ACCEPTED", "REJECTED"],
        },
        respondedAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        respondedAt: true,
      },
    });

    let avgResponseTime = 0;
    if (leads.length > 0) {
      const totalMinutes = leads.reduce((sum, lead) => {
        if (lead.respondedAt) {
          const diff = lead.respondedAt.getTime() - lead.createdAt.getTime();
          return sum + diff / 60000; // Convert to minutes
        }
        return sum;
      }, 0);
      avgResponseTime = Math.round(totalMinutes / leads.length);
    }

    let avgResponseTimePrevious = 0;
    if (prevLeads.length > 0) {
      const totalMinutes = prevLeads.reduce((sum, lead) => {
        if (lead.respondedAt) {
          const diff = lead.respondedAt.getTime() - lead.createdAt.getTime();
          return sum + diff / 60000;
        }
        return sum;
      }, 0);
      avgResponseTimePrevious = Math.round(totalMinutes / prevLeads.length);
    }

    const avgResponseTimeTrend =
      avgResponseTimePrevious > 0
        ? ((avgResponseTimePrevious - avgResponseTime) / avgResponseTimePrevious) * 100
        : 0;

    // Leads atualmente em atendimento (reservados ou aceitos)
    const activeLeads = await prisma.lead.count({
      where: {
        realtorId: userId,
        status: {
          in: ["RESERVED", "ACCEPTED"],
        },
      },
    });

    // Leads com lembrete marcado (próximas ações)
    const leadsWithReminders = await prisma.lead.count({
      where: {
        realtorId: userId,
        nextActionDate: {
          not: null,
        },
      },
    });

    // Get recent properties
    const recentProperties = await prisma.property.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
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

    // Get recent leads
    const recentLeads = await prisma.lead.findMany({
      where: {
        realtorId: userId,
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
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    // Calculate lead trend
    const leadTrend =
      leadsPrevious7Days > 0
        ? ((leadsLast7Days - leadsPrevious7Days) / leadsPrevious7Days) * 100
        : leadsLast7Days > 0
        ? 100
        : 0;

    return NextResponse.json({
      metrics: {
        activeProperties,
        totalProperties,
        leadsLast7Days,
        leadTrend: {
          value: Math.round(leadTrend),
          isPositive: leadTrend >= 0,
        },
        avgResponseTime,
        avgResponseTimeTrend: {
          value: Math.round(avgResponseTimeTrend),
          isPositive: avgResponseTimeTrend >= 0,
        },
        activeLeads,
        leadsWithReminders,
      },
      recentProperties: recentProperties.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        status: p.status,
        image: p.images[0]?.url || "/placeholder.jpg",
        views: p._count.views,
        leads: p._count.leads,
      })),
      recentLeads: recentLeads.map((l) => ({
        id: l.id,
        propertyTitle: l.property.title,
        contactName: l.contact?.name || "N/A",
        contactPhone: l.contact?.phone || "N/A",
        status: l.status,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching realtor metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
