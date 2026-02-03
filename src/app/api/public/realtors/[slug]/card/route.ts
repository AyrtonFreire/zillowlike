import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const realtor = await prisma.user.findFirst({
      where: {
        publicSlug: slug,
        role: { in: ["REALTOR", "AGENCY"] },
      },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        publicHeadline: true,
        publicCity: true,
        publicState: true,
        publicSlug: true,
        publicPhoneOptIn: true,
        stats: {
          select: {
            avgRating: true,
            totalRatings: true,
            avgResponseTime: true,
          },
        },
        realtorApplication: {
          select: {
            creci: true,
            creciState: true,
          },
        },
      } as any,
    });

    if (!realtor) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [activeListings, completedDeals] = await Promise.all([
      (prisma as any).property.count({
        where: {
          ownerId: realtor.id,
          status: "ACTIVE",
        },
      }),
      (prisma as any).lead.count({
        where: {
          realtorId: realtor.id,
          pipelineStage: "WON",
        },
      }),
    ]);

    const avgRating = Number((realtor as any)?.stats?.avgRating || 0);
    const totalRatings = Number((realtor as any)?.stats?.totalRatings || 0);
    const avgResponseTimeRaw = (realtor as any)?.stats?.avgResponseTime;
    const avgResponseTime = avgResponseTimeRaw == null ? null : Number(avgResponseTimeRaw);

    const isFastResponder = avgResponseTime != null && avgResponseTime <= 30;
    const isTopProducer = Number(completedDeals || 0) >= 50;

    const res = NextResponse.json({
      id: realtor.id,
      name: realtor.name,
      image: realtor.image,
      role: realtor.role,
      headline: (realtor as any).publicHeadline ?? null,
      city: (realtor as any).publicCity ?? null,
      state: (realtor as any).publicState ?? null,
      publicSlug: (realtor as any).publicSlug ?? null,
      publicPhoneOptIn: Boolean((realtor as any).publicPhoneOptIn),
      stats: {
        avgRating,
        totalRatings,
        avgResponseTime,
        activeListings: Number(activeListings || 0),
        completedDeals: Number(completedDeals || 0),
      },
      badges: {
        isFastResponder,
        isTopProducer,
      },
      creci: (realtor as any)?.realtorApplication?.creci ?? null,
      creciState: (realtor as any)?.realtorApplication?.creciState ?? null,
    });

    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res;
  } catch (e) {
    console.error("/api/public/realtors/[slug]/card GET error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
