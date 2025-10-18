import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/owner/analytics
 * Returns analytics for owner's properties
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "7d";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "all":
        startDate = new Date(0); // Unix epoch
        break;
    }

    // Get properties with stats
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      include: {
        _count: {
          select: {
            views: {
              where: {
                viewedAt: { gte: startDate },
              },
            },
            favorites: true,
            leads: true,
          },
        },
      },
    });

    // Calculate previous period for trends
    const periodDays = period === "all" ? 30 : parseInt(period);
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);

    // Format analytics
    const analytics = await Promise.all(
      properties.map(async (property) => {
        const totalViews = property._count.views;
        const favorites = property._count.favorites;
        const leads = property._count.leads;

        // Get previous period views for trend
        const prevViews = await prisma.propertyView.count({
          where: {
            propertyId: property.id,
            viewedAt: {
              gte: prevStartDate,
              lt: startDate,
            },
          },
        });

        const prevLeads = await prisma.lead.count({
          where: {
            propertyId: property.id,
            createdAt: {
              gte: prevStartDate,
              lt: startDate,
            },
          },
        });

        // Calculate trends
        const viewsChange = prevViews > 0 ? ((totalViews - prevViews) / prevViews) * 100 : 0;
        const leadsChange = prevLeads > 0 ? ((leads - prevLeads) / prevLeads) * 100 : 0;

        // Simulated metrics (in production, track these from real data)
        const uniqueVisitors = Math.floor(totalViews * 0.75); // Estimate
        const conversionRate = totalViews > 0 ? (leads / totalViews) * 100 : 0;
        const avgTimeOnPage = 120 + Math.floor(Math.random() * 180); // 2-5 min
        const bounceRate = 30 + Math.floor(Math.random() * 40); // 30-70%

        // Simulated traffic sources
        const traffic = {
          direct: 40 + Math.floor(Math.random() * 20),
          search: 30 + Math.floor(Math.random() * 20),
          social: 15 + Math.floor(Math.random() * 15),
          referral: 10 + Math.floor(Math.random() * 10),
        };

        // Simulated device breakdown
        const devices = {
          mobile: 60 + Math.floor(Math.random() * 20),
          desktop: 30 + Math.floor(Math.random() * 10),
          tablet: 5 + Math.floor(Math.random() * 10),
        };

        return {
          id: property.id,
          title: property.title,
          metrics: {
            totalViews,
            uniqueVisitors,
            favorites,
            leads,
            conversionRate,
            avgTimeOnPage,
            bounceRate,
          },
          traffic,
          devices,
          trend: {
            viewsChange,
            leadsChange,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      properties: analytics,
      period,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
