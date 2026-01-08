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
    const city = searchParams.get("city") || "";
    const state = searchParams.get("state") || "";
    const suggest = searchParams.get("suggest") === "1";
    const q = (searchParams.get("q") || "").trim();
    const takeParam = Number(searchParams.get("take") || "60");
    const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 120) : 60;
    const startDate = getStartDate(period);

    if (suggest) {
      if (q.length < 3) {
        return NextResponse.json({
          success: true,
          q,
          suggestions: { realtors: [], cities: [] },
        });
      }

      const [realtors, cities] = await Promise.all([
        prisma.user.findMany({
          where: {
            role: { in: ["REALTOR", "AGENCY"] },
            OR: [
              { name: { startsWith: q, mode: "insensitive" } },
              { email: { startsWith: q, mode: "insensitive" } },
              { publicCity: { startsWith: q, mode: "insensitive" } },
              { publicState: { startsWith: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            publicCity: true,
            publicState: true,
          },
          take: 8,
          orderBy: [{ name: "asc" }],
        }),
        prisma.property.groupBy({
          by: ["city", "state"],
          where: {
            city: { startsWith: q, mode: "insensitive" },
          },
          _count: { _all: true },
          orderBy: [{ city: "asc" }, { state: "asc" }],
          take: 20,
        }),
      ]);

      const citiesSorted = [...cities]
        .sort((a: any, b: any) => ((b?._count?._all ?? 0) as number) - ((a?._count?._all ?? 0) as number))
        .slice(0, 8);

      return NextResponse.json({
        success: true,
        q,
        suggestions: {
          realtors,
          cities: citiesSorted.map((c: any) => ({ city: c.city, state: c.state, count: c?._count?._all ?? 0 })),
        },
      });
    }

    const propertyWhere: any = {};
    if (realtorId) propertyWhere.ownerId = realtorId;
    if (city) propertyWhere.city = city;
    if (state) propertyWhere.state = state;

    const hasFilter = Boolean(realtorId || city || state);

    const [totalRealtors, totalProperties, totalViews, totalLeads, totalFavorites] = await Promise.all([
      realtorId
        ? 1
        : prisma.user.count({ where: { role: { in: ["REALTOR", "AGENCY"] } } }),
      prisma.property.count({ where: propertyWhere }),
      prisma.propertyView.count({
        where: {
          viewedAt: { gte: startDate },
          ...(hasFilter ? { property: propertyWhere } : {}),
        },
      }),
      prisma.lead.count({
        where: {
          createdAt: { gte: startDate },
          ...(hasFilter ? { property: propertyWhere } : {}),
        },
      }),
      prisma.favorite.count({
        where: {
          createdAt: { gte: startDate },
          ...(hasFilter ? { property: propertyWhere } : {}),
        },
      }),
    ]);

    const overallConversionRatePct = totalViews > 0 ? Math.round((totalLeads / totalViews) * 1000) / 10 : 0;

    let properties: any[] = [];
    if (hasFilter) {
      properties = await prisma.property.findMany({
        where: propertyWhere,
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
        take,
      });
    }

    const formattedProperties = properties.map((p) => {
      const views = (p as any)._count?.views ?? 0;
      const leads = (p as any)._count?.leads ?? 0;
      const favorites = (p as any)._count?.favorites ?? 0;
      const conversionRatePct = views > 0 ? Math.round((leads / views) * 1000) / 10 : 0;

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

    return NextResponse.json({
      success: true,
      period,
      realtorId: realtorId || null,
      city: city || null,
      state: state || null,
      startDate,
      totals: {
        realtors: totalRealtors,
        properties: totalProperties,
        views: totalViews,
        leads: totalLeads,
        favorites: totalFavorites,
        conversionRatePct: overallConversionRatePct,
      },
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
