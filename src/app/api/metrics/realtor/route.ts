import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const jsonSafe = <T,>(value: T): T | number =>
  typeof value === "bigint" ? Number(value) : value;

function computeResponseMinutes(params: {
  createdAt: Date;
  respondedAt: Date;
}) {
  const diffMs = params.respondedAt.getTime() - params.createdAt.getTime();
  const minutes = diffMs / 60000;
  if (!Number.isFinite(minutes)) return 0;
  if (minutes <= 0) return 0;
  // Evita cair em 0min quando existe resposta rápida (< 1 min)
  return Math.ceil(minutes);
}

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
        respondedAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        respondedAt: true,
      },
    });

    const avgResponseTime =
      leads.length > 0
        ? Math.round(
            leads.reduce((sum, lead) => {
              if (!lead.respondedAt) return sum;
              return (
                sum +
                computeResponseMinutes({
                  createdAt: lead.createdAt,
                  respondedAt: lead.respondedAt,
                })
              );
            }, 0) / leads.length
          )
        : null;

    const avgResponseTimePrevious =
      prevLeads.length > 0
        ? Math.round(
            prevLeads.reduce((sum, lead) => {
              if (!lead.respondedAt) return sum;
              return (
                sum +
                computeResponseMinutes({
                  createdAt: lead.createdAt,
                  respondedAt: lead.respondedAt,
                })
              );
            }, 0) / prevLeads.length
          )
        : null;

    const avgResponseTimeTrend =
      avgResponseTimePrevious && avgResponseTimePrevious > 0 && typeof avgResponseTime === "number"
        ? ((avgResponseTimePrevious - avgResponseTime) / avgResponseTimePrevious) * 100
        : 0;

    // Leads atualmente em atendimento
    const activeLeads = await prisma.lead.count({
      where: {
        realtorId: userId,
        pipelineStage: { notIn: ["WON", "LOST"] },
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
        price: jsonSafe(p.price),
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
