import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getStartDate(period: string) {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case "7d":
      start.setDate(now.getDate() - 7);
      return start;
    case "30d":
      start.setDate(now.getDate() - 30);
      return start;
    case "90d":
      start.setDate(now.getDate() - 90);
      return start;
    case "all":
      return new Date(0);
    default:
      start.setDate(now.getDate() - 30);
      return start;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const role = session?.role || session?.user?.role;

    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";
    const realtorId = searchParams.get("realtorId") || "";
    const startDate = getStartDate(period);

    const realtors = await prisma.user.findMany({
      where: { role: { in: ["REALTOR", "AGENCY"] } },
      select: {
        id: true,
        name: true,
        email: true,
        publicSlug: true,
        publicCity: true,
        publicState: true,
      },
      orderBy: [{ name: "asc" }],
    });

    const properties = await prisma.property.findMany({
      where: {
        ownerId: realtorId ? realtorId : { in: realtors.map((r) => r.id) },
      },
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        purpose: true,
        city: true,
        state: true,
        neighborhood: true,
        createdAt: true,
        ownerId: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        images: {
          select: { url: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        _count: {
          select: {
            views: { where: { viewedAt: { gte: startDate } } },
            leads: { where: { createdAt: { gte: startDate } } },
            favorites: { where: { createdAt: { gte: startDate } } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const byRealtor = new Map<
      string,
      {
        realtorId: string;
        properties: number;
        views: number;
        leads: number;
        favorites: number;
      }
    >();

    let totalViews = 0;
    let totalLeads = 0;
    let totalFavorites = 0;

    const formattedProperties = properties.map((p) => {
      const views = (p as any)._count?.views ?? 0;
      const leads = (p as any)._count?.leads ?? 0;
      const favorites = (p as any)._count?.favorites ?? 0;
      const conversionRatePct = views > 0 ? Math.round((leads / views) * 1000) / 10 : 0;

      totalViews += views;
      totalLeads += leads;
      totalFavorites += favorites;

      const ownerId = p.ownerId || "";
      if (ownerId) {
        const prev = byRealtor.get(ownerId) || {
          realtorId: ownerId,
          properties: 0,
          views: 0,
          leads: 0,
          favorites: 0,
        };
        prev.properties += 1;
        prev.views += views;
        prev.leads += leads;
        prev.favorites += favorites;
        byRealtor.set(ownerId, prev);
      }

      return {
        id: p.id,
        title: p.title,
        price: p.price,
        status: p.status,
        purpose: p.purpose,
        city: p.city,
        state: p.state,
        neighborhood: p.neighborhood,
        createdAt: p.createdAt,
        owner: p.owner,
        image: p.images?.[0]?.url || null,
        stats: {
          views,
          leads,
          favorites,
          conversionRatePct,
        },
      };
    });

    const realtorStats = realtors.map((r) => {
      const row = byRealtor.get(r.id) || {
        realtorId: r.id,
        properties: 0,
        views: 0,
        leads: 0,
        favorites: 0,
      };
      const conversionRatePct = row.views > 0 ? Math.round((row.leads / row.views) * 1000) / 10 : 0;
      return {
        ...r,
        stats: {
          properties: row.properties,
          views: row.views,
          leads: row.leads,
          favorites: row.favorites,
          conversionRatePct,
        },
      };
    });

    const overallConversionRatePct = totalViews > 0 ? Math.round((totalLeads / totalViews) * 1000) / 10 : 0;

    return NextResponse.json({
      success: true,
      period,
      realtorId: realtorId || null,
      startDate,
      totals: {
        properties: formattedProperties.length,
        views: totalViews,
        leads: totalLeads,
        favorites: totalFavorites,
        conversionRatePct: overallConversionRatePct,
      },
      realtors: realtorStats,
      properties: formattedProperties,
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
