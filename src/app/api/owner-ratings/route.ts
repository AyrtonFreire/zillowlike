import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function getSessionUserId(session: any): string | null {
  return (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub || null;
}

function isLeadEligibleForRating(lead: any): boolean {
  return Boolean(lead?.pipelineStage === "WON" || lead?.completedAt || lead?.respondedAt);
}

const CreateOwnerRatingSchema = z.object({
  leadId: z.string().min(1),
  ownerId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const userId = getSessionUserId(session);
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = CreateOwnerRatingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { leadId, ownerId, rating, comment } = parsed.data;

  // Ensure lead belongs to current user and matches owner (property owner)
  const lead = await (prisma as any).lead.findFirst({
    where: {
      id: leadId,
      userId,
      property: { ownerId },
    },
    select: {
      id: true,
      pipelineStage: true,
      completedAt: true,
      respondedAt: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
  }
  if (!isLeadEligibleForRating(lead)) {
    return NextResponse.json({ success: false, error: "Lead not eligible" }, { status: 400 });
  }

  const existing = await (prisma as any).ownerRating.findUnique({ where: { leadId } });
  if (existing) {
    return NextResponse.json({ success: false, error: "Lead already rated" }, { status: 400 });
  }

  const result = await (prisma as any).$transaction(async (tx: any) => {
    const newRating = await tx.ownerRating.create({
      data: { leadId, ownerId, authorId: userId, rating, comment },
    });

    const stats = await tx.ownerStats.findUnique({ where: { ownerId } });
    if (stats) {
      const newTotal = stats.totalRatings + 1;
      const newAvg = (((stats.avgRating || 0) * stats.totalRatings) + rating) / newTotal;
      await tx.ownerStats.update({ where: { ownerId }, data: { avgRating: newAvg, totalRatings: newTotal } });
    } else {
      await tx.ownerStats.create({ data: { ownerId, avgRating: rating, totalRatings: 1 } });
    }

    return newRating;
  });

  return NextResponse.json({ success: true, rating: result });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get("ownerId");
    const stars = searchParams.get("stars");
    const hasComment = searchParams.get("hasComment");
    const takeRaw = searchParams.get("take");
    const cursor = searchParams.get("cursor");
    const includeAll = searchParams.get("includeAll");

    if (!ownerId) {
      return NextResponse.json({ success: false, error: "ownerId is required" }, { status: 400 });
    }

    const take = Math.min(50, Math.max(1, Number(takeRaw || 10) || 10));
    const ratingFilter = stars ? Math.max(1, Math.min(5, Number(stars) || 0)) : null;

    const session = await getServerSession(authOptions);
    const sessionUserId = getSessionUserId(session);
    const sessionRole = (session as any)?.user?.role || (session as any)?.role || null;
    const canSeeAll = Boolean(includeAll) && Boolean(sessionUserId) && (sessionRole === "ADMIN" || sessionUserId === ownerId);

    const where: any = { ownerId };
    if (!canSeeAll) where.status = "PUBLISHED";
    if (ratingFilter) where.rating = ratingFilter;
    if (hasComment === "1" || hasComment === "true") where.comment = { not: null };

    const histogramRows = await (prisma as any).ownerRating.groupBy({
      by: ["rating"],
      where: canSeeAll ? { ownerId } : { ownerId, status: "PUBLISHED" },
      _count: { rating: true },
    });

    const histogram: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of histogramRows || []) {
      const r = Number((row as any).rating);
      const c = Number((row as any)?._count?.rating || 0);
      if (r >= 1 && r <= 5) histogram[r] = c;
    }

    const ratings = await (prisma as any).ownerRating.findMany({
      where,
      include: {
        author: { select: { name: true, image: true } },
        lead: { include: { property: { select: { title: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = ratings.length > take;
    const items = hasMore ? ratings.slice(0, take) : ratings;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const stats = await (prisma as any).ownerStats.findUnique({ where: { ownerId } });

    return NextResponse.json({
      ratings: items,
      nextCursor,
      histogram,
      stats: {
        avgRating: stats?.avgRating || 0,
        totalRatings: stats?.totalRatings || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching owner ratings:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch ratings" }, { status: 500 });
  }
}
