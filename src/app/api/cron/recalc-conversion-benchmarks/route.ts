import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type BucketDef = {
  bucketId: string;
  minDays: number;
  maxDays: number | null;
};

const BUCKETS: BucketDef[] = [
  { bucketId: "0_2", minDays: 0, maxDays: 2 },
  { bucketId: "3_6", minDays: 3, maxDays: 6 },
  { bucketId: "7_13", minDays: 7, maxDays: 13 },
  { bucketId: "14_29", minDays: 14, maxDays: 29 },
  { bucketId: "30_59", minDays: 30, maxDays: 59 },
  { bucketId: "60_plus", minDays: 60, maxDays: null },
];

function getBucketForAge(ageDays: number): BucketDef {
  for (const b of BUCKETS) {
    if (ageDays < b.minDays) continue;
    if (b.maxDays === null) return b;
    if (ageDays <= b.maxDays) return b;
  }
  return BUCKETS[BUCKETS.length - 1];
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const rows = await prisma.$queryRaw<
      Array<{
        bucketId: string;
        propertiesCount: number;
        viewsTotal: number;
        leadsTotal: number;
      }>
    >`
      WITH props AS (
        SELECT
          p.id,
          (CURRENT_DATE - DATE(p."createdAt"))::int AS "ageDays"
        FROM "properties" p
      ),
      bucketed AS (
        SELECT
          id,
          CASE
            WHEN "ageDays" <= 2 THEN '0_2'
            WHEN "ageDays" <= 6 THEN '3_6'
            WHEN "ageDays" <= 13 THEN '7_13'
            WHEN "ageDays" <= 29 THEN '14_29'
            WHEN "ageDays" <= 59 THEN '30_59'
            ELSE '60_plus'
          END AS "bucketId"
        FROM props
      ),
      views_per_prop AS (
        SELECT "propertyId", COUNT(*)::int AS views
        FROM "property_views"
        GROUP BY 1
      ),
      leads_per_prop AS (
        SELECT "propertyId", COUNT(*)::int AS leads
        FROM "leads"
        GROUP BY 1
      )
      SELECT
        b."bucketId" AS "bucketId",
        COUNT(*)::int AS "propertiesCount",
        COALESCE(SUM(v.views), 0)::int AS "viewsTotal",
        COALESCE(SUM(l.leads), 0)::int AS "leadsTotal"
      FROM bucketed b
      LEFT JOIN views_per_prop v ON v."propertyId" = b.id
      LEFT JOIN leads_per_prop l ON l."propertyId" = b.id
      GROUP BY 1
    `;

    const byBucketId = new Map<string, { propertiesCount: number; viewsTotal: number; leadsTotal: number }>();
    for (const r of rows || []) {
      byBucketId.set(String(r.bucketId), {
        propertiesCount: Number(r.propertiesCount) || 0,
        viewsTotal: Number(r.viewsTotal) || 0,
        leadsTotal: Number(r.leadsTotal) || 0,
      });
    }

    const upserted: any[] = [];

    for (const b of BUCKETS) {
      const agg = byBucketId.get(b.bucketId) || { propertiesCount: 0, viewsTotal: 0, leadsTotal: 0 };
      const conversionRate = agg.viewsTotal > 0 ? agg.leadsTotal / agg.viewsTotal : 0;

      const item = await (prisma as any).platformConversionBenchmark.upsert({
        where: { bucketId: b.bucketId },
        create: {
          bucketId: b.bucketId,
          bucketMinDays: b.minDays,
          bucketMaxDays: b.maxDays,
          propertiesCount: agg.propertiesCount,
          viewsTotal: agg.viewsTotal,
          leadsTotal: agg.leadsTotal,
          conversionRate,
          calculatedAt: now,
        },
        update: {
          bucketMinDays: b.minDays,
          bucketMaxDays: b.maxDays,
          propertiesCount: agg.propertiesCount,
          viewsTotal: agg.viewsTotal,
          leadsTotal: agg.leadsTotal,
          conversionRate,
          calculatedAt: now,
        },
      });

      upserted.push(item);
    }

    return NextResponse.json({
      success: true,
      calculatedAt: now.toISOString(),
      buckets: upserted.map((u) => ({
        bucketId: u.bucketId,
        bucketMinDays: u.bucketMinDays,
        bucketMaxDays: u.bucketMaxDays,
        propertiesCount: u.propertiesCount,
        viewsTotal: u.viewsTotal,
        leadsTotal: u.leadsTotal,
        conversionRate: u.conversionRate,
      })),
    });
  } catch (error) {
    console.error("[CRON] Error recalculating conversion benchmarks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
