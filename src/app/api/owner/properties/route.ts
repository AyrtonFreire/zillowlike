import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

function jsonSafe<T>(data: T): any {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
}

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

    const actorId = (session as any)?.userId || sessionUser?.id;
    let userId = actorId;

    if (impersonateId) {
      if (sessionRole !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      userId = impersonateId;
    }

    const recoveryRes = await requireRecoveryFactor(String(actorId));
    if (recoveryRes) return recoveryRes;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    // Get all properties owned by this user
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
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

    const propertyIds = properties.map((p: any) => p.id);

    if (propertyIds.length === 0) {
      return NextResponse.json({
        success: true,
        properties: [],
        metrics: {
          totalProperties: 0,
          activeProperties: 0,
          pausedProperties: 0,
          draftProperties: 0,
          totalViews: 0,
          totalLeads: 0,
          totalFavorites: 0,
          scheduledVisits: 0,
          completedVisits: 0,
        },
      });
    }

    const start14d = new Date(now);
    start14d.setHours(0, 0, 0, 0);
    start14d.setDate(start14d.getDate() - 13);

    const [platformViews, platformLeads, lastLeadByProperty, viewsByDayRows, leadsByDayRows] = await Promise.all([
      prisma.propertyView.count(),
      prisma.lead.count(),
      prisma.lead.groupBy({
        by: ["propertyId"],
        where: { propertyId: { in: propertyIds } },
        _max: { createdAt: true },
      }),
      prisma.$queryRaw<
        Array<{ propertyId: string; day: string; count: number }>
      >`
        SELECT "propertyId", (DATE("viewedAt"))::text AS day, COUNT(*)::int AS count
        FROM "property_views"
        WHERE "propertyId" = ANY(${propertyIds})
          AND "viewedAt" >= ${start14d}
        GROUP BY 1, 2
      `,
      prisma.$queryRaw<
        Array<{ propertyId: string; day: string; count: number }>
      >`
        SELECT "propertyId", (DATE("createdAt"))::text AS day, COUNT(*)::int AS count
        FROM "leads"
        WHERE "propertyId" = ANY(${propertyIds})
          AND "createdAt" >= ${start14d}
        GROUP BY 1, 2
      `,
    ]);

    const platformAvgConversionRate = platformViews > 0 ? platformLeads / platformViews : 0;

    let benchmarks: any[] = [];
    try {
      benchmarks = await (prisma as any).platformConversionBenchmark.findMany();
    } catch {
      benchmarks = [];
    }

    const benchmarkByBucketId = new Map<string, any>(
      (benchmarks || []).map((b: any) => [String(b.bucketId), b])
    );

    const getBucketIdForAgeDays = (ageDays: number) => {
      const a = Math.max(0, Math.floor(ageDays));
      if (a <= 2) return "0_2";
      if (a <= 6) return "3_6";
      if (a <= 13) return "7_13";
      if (a <= 29) return "14_29";
      if (a <= 59) return "30_59";
      return "60_plus";
    };
    const lastLeadMap = new Map<string, Date | null>(
      (lastLeadByProperty || []).map((row: any) => [row.propertyId, row._max?.createdAt || null])
    );

    const days: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(start14d);
      d.setDate(start14d.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }

    const viewsDayMap = new Map<string, number>();
    for (const r of viewsByDayRows || []) {
      viewsDayMap.set(`${r.propertyId}|${r.day}`, Number(r.count) || 0);
    }
    const leadsDayMap = new Map<string, number>();
    for (const r of leadsByDayRows || []) {
      leadsDayMap.set(`${r.propertyId}|${r.day}`, Number(r.count) || 0);
    }

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
    const formattedProperties = properties.map((p: any) => {
      // Add derived analytics fields (best-effort)
      const analytics = (() => {
        const views = Number(p._count.views) || 0;
        const leads = p._count.leads as number;
        const conversionRate = views > 0 ? leads / views : 0;
        const conversionRatePct = Math.round(conversionRate * 1000) / 10;

        const ageDays = Math.max(
          0,
          Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        );
        const bucketId = getBucketIdForAgeDays(ageDays);
        const bench = benchmarkByBucketId.get(bucketId) || null;
        const cohortAvgConversionRate = bench?.conversionRate ?? null;

        const hasFewPropertyData = ageDays < 7 && views < 30;
        const hasWeakBenchmark =
          !!bench &&
          (!Number.isFinite(bench?.conversionRate) ||
            (Number(bench?.viewsTotal) || 0) < 500 ||
            (Number(bench?.propertiesCount) || 0) < 20 ||
            (Number(bench?.conversionRate) || 0) <= 0);
        const lastLeadAt = lastLeadMap.get(p.id) || null;
        const since = lastLeadAt || p.createdAt;
        const daysSinceLastLead = since
          ? Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        const baseRateForComparison =
          cohortAvgConversionRate && cohortAvgConversionRate > 0
            ? cohortAvgConversionRate
            : platformAvgConversionRate;

        const platformComparisonPct =
          hasFewPropertyData || hasWeakBenchmark
            ? null
            : baseRateForComparison > 0
              ? Math.round((conversionRate / baseRateForComparison) * 100)
              : null;

        const viewsSeries = days.map((day) => viewsDayMap.get(`${p.id}|${day}`) || 0);
        const leadsSeries = days.map((day) => leadsDayMap.get(`${p.id}|${day}`) || 0);

        return {
          conversionRatePct,
          daysSinceLastLead,
          platformComparisonPct,
          platformAvgConversionRatePct: baseRateForComparison
            ? Math.round(baseRateForComparison * 1000) / 10
            : Math.round(platformAvgConversionRate * 1000) / 10,
          platformComparisonBucketId: bucketId,
          platformComparisonBucketMinDays: bench?.bucketMinDays ?? null,
          platformComparisonBucketMaxDays: bench?.bucketMaxDays ?? null,
          platformComparisonSampleProperties: bench?.propertiesCount ?? null,
          platformComparisonSampleViews: bench?.viewsTotal ?? null,
          timeseries14d: {
            days,
            views: viewsSeries,
            leads: leadsSeries,
          },
        };
      })()
      return {
        id: p.id,
        title: p.title,
        price: typeof p.price === "bigint" ? Number(p.price) : p.price,
        status: p.status,
        type: p.type,
        city: p.city,
        state: p.state,
        street: p.street,
        neighborhood: p.neighborhood,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        areaM2: p.areaM2,
        description: p.description,
        image: p.images[0]?.url || null,
        images: p.images?.map((img: any) => ({ url: img.url })) || [],
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
        analytics,
        conversionRatePct: analytics.conversionRatePct,
        daysSinceLastLead: analytics.daysSinceLastLead,
        platformComparisonPct: analytics.platformComparisonPct,
        timeseries14d: analytics.timeseries14d,
      };
    });

    return NextResponse.json({
      success: true,
      properties: jsonSafe(formattedProperties),
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
