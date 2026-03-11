import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QueueService } from "@/lib/queue-service";
import { createRatingSchema, updateRatingSchema } from "@/lib/validations/rating";
import { withErrorHandling, successResponse, errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limiter";
import { prisma } from "@/lib/prisma";

function getSessionUserId(session: any): string | null {
  return (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub || null;
}

// Criar avaliação
export const POST = withRateLimit(
  withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { leadId, realtorId, rating, comment } = createRatingSchema.parse(body);

  const session = await getServerSession(authOptions);
  if (!session) {
    return errorResponse("Unauthorized", 401, null, "UNAUTHORIZED");
  }
  const userId = getSessionUserId(session);
  if (!userId) {
    return errorResponse("Unauthorized", 401, null, "UNAUTHORIZED");
  }

  logger.info("Creating rating", { leadId, realtorId, rating });

  const existingByUser = await (prisma as any).realtorRating.findFirst({
    where: {
      realtorId,
      OR: [{ authorId: userId }, { lead: { userId } }],
    },
    select: {
      id: true,
      leadId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingByUser?.id) {
    return errorResponse(
      "Você já avaliou este corretor. Edite sua avaliação existente.",
      400,
      { ratingId: existingByUser.id },
      "ALREADY_RATED"
    );
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      userId,
      realtorId,
    },
    select: {
      id: true,
      respondedAt: true,
    },
  });

  if (!lead) {
    return errorResponse("Lead not found", 404, null, "LEAD_NOT_FOUND");
  }

  if (!(lead as any)?.respondedAt) {
    return errorResponse(
      "Você poderá avaliar após o corretor responder.",
      400,
      null,
      "AWAITING_RESPONSE"
    );
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const respondedAt = new Date((lead as any).respondedAt);
  if (Number.isFinite(respondedAt.getTime()) && respondedAt > cutoff) {
    const nextEligibleAt = new Date(respondedAt.getTime() + 24 * 60 * 60 * 1000);
    return errorResponse(
      "A avaliação ficará disponível 24h após a resposta do corretor.",
      400,
      { nextEligibleAt: nextEligibleAt.toISOString() },
      "RATING_COOLDOWN"
    );
  }

  // Verifica se já existe avaliação para este lead
  const existing = await prisma.realtorRating.findUnique({
    where: { leadId },
  });

  if (existing) {
    return errorResponse("Lead already rated", 400, null, "ALREADY_RATED");
  }

  // Usa transação para garantir consistência
  const result = await prisma.$transaction(async (tx) => {
    // Cria avaliação
    const newRating = await (tx as any).realtorRating.create({
      data: { leadId, realtorId, authorId: userId, rating, comment },
    });

    // Atualiza estatísticas do corretor
    const stats = await (tx as any).realtorStats.findUnique({ where: { realtorId } });

    if (stats) {
      const newTotalRatings = stats.totalRatings + 1;
      const newAvgRating =
        ((stats.avgRating || 0) * stats.totalRatings + rating) / newTotalRatings;

      await (tx as any).realtorStats.update({
        where: { realtorId },
        data: { avgRating: newAvgRating, totalRatings: newTotalRatings },
      });
    } else {
      await (tx as any).realtorStats.create({
        data: { realtorId, avgRating: rating, totalRatings: 1 },
      });
    }

    return newRating;
  });

  // Adiciona pontos baseado na avaliação
  const pointsMap: Record<number, { points: number; action: string; desc: string }> = {
    5: { points: 15, action: "RATING_5_STARS", desc: "Recebeu avaliação 5 estrelas" },
    4: { points: 10, action: "RATING_4_STARS", desc: "Recebeu avaliação 4 estrelas" },
    3: { points: 5, action: "RATING_3_STARS", desc: "Recebeu avaliação 3 estrelas" },
    2: { points: 0, action: "RATING_2_STARS", desc: "Recebeu avaliação 2 estrelas" },
    1: { points: -5, action: "RATING_1_STAR", desc: "Recebeu avaliação 1 estrela" },
  };

  const scoreUpdate = pointsMap[rating];
  if (scoreUpdate && scoreUpdate.points !== 0) {
    await QueueService.updateScore(realtorId, scoreUpdate.points, scoreUpdate.action, scoreUpdate.desc);
  }

  logger.info("Rating created successfully", { ratingId: result.id, leadId, realtorId });
  return successResponse(result, "Avaliação enviada com sucesso!");
  }),
  "ratings"
);

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ratingId, rating, comment } = updateRatingSchema.parse(body);

    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401, null, "UNAUTHORIZED");
    }
    const userId = getSessionUserId(session);
    if (!userId) {
      return errorResponse("Unauthorized", 401, null, "UNAUTHORIZED");
    }

    const sessionRole = (session as any)?.user?.role || (session as any)?.role || null;
    const isAdmin = sessionRole === "ADMIN";

    const result = await prisma.$transaction(async (tx) => {
      const existing = await (tx as any).realtorRating.findUnique({
        where: { id: ratingId },
        select: { id: true, realtorId: true, rating: true, authorId: true },
      });

      if (!existing) {
        return { ok: false as const, status: 404 as const, payload: errorResponse("Rating not found", 404, null, "NOT_FOUND") };
      }

      if (!isAdmin && existing.authorId !== userId) {
        return { ok: false as const, status: 403 as const, payload: errorResponse("Forbidden", 403, null, "FORBIDDEN") };
      }

      const previousRating = Number(existing.rating);
      const nextRating = Number(rating);

      const updated = await (tx as any).realtorRating.update({
        where: { id: ratingId },
        data: {
          rating: nextRating,
          comment: comment ?? null,
        },
      });

      const agg = await (tx as any).realtorRating.aggregate({
        where: { realtorId: existing.realtorId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      const avgRating = Number(agg?._avg?.rating || 0);
      const totalRatings = Number(agg?._count?._all || 0);

      await (tx as any).realtorStats.upsert({
        where: { realtorId: existing.realtorId },
        create: { realtorId: existing.realtorId, avgRating, totalRatings },
        update: { avgRating, totalRatings },
      });

      const pointsMap: Record<number, number> = {
        5: 15,
        4: 10,
        3: 5,
        2: 0,
        1: -5,
      };
      const prevPoints = pointsMap[previousRating] ?? 0;
      const nextPoints = pointsMap[nextRating] ?? 0;
      const diff = nextPoints - prevPoints;
      if (diff !== 0) {
        await QueueService.updateScore(existing.realtorId, diff, "RATING_EDIT", "Avaliação editada");
      }

      return { ok: true as const, updated };
    });

    if (!(result as any).ok) {
      return (result as any).payload;
    }

    return successResponse((result as any).updated, "Avaliação atualizada com sucesso!");
  } catch (error) {
    logger.error("Error updating rating", { error });
    return NextResponse.json({ error: "Failed to update rating" }, { status: 500 });
  }
}

// Listar avaliações de um corretor
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const realtorId = searchParams.get("realtorId");
    const stars = searchParams.get("stars");
    const hasComment = searchParams.get("hasComment");
    const sort = searchParams.get("sort");
    const takeRaw = searchParams.get("take");
    const cursor = searchParams.get("cursor");
    const includeAll = searchParams.get("includeAll");

    if (!realtorId) {
      return NextResponse.json(
        { error: "realtorId is required" },
        { status: 400 }
      );
    }

    const take = Math.min(50, Math.max(1, Number(takeRaw || 10) || 10));
    const ratingFilter = stars ? Math.max(1, Math.min(5, Number(stars) || 0)) : null;

    const session = await getServerSession(authOptions);
    const sessionUserId = getSessionUserId(session);
    const sessionRole = (session as any)?.user?.role || (session as any)?.role || null;
    const canSeeAll = Boolean(includeAll) && Boolean(sessionUserId) && (sessionRole === "ADMIN" || sessionUserId === realtorId);

    const where: any = { realtorId };
    if (!canSeeAll) where.status = "PUBLISHED";
    if (ratingFilter) where.rating = ratingFilter;
    if (hasComment === "1" || hasComment === "true") {
      where.comment = { not: null };
    }

    const sortKey = (sort || "relevant").toLowerCase();
    const orderBy: any =
      sortKey === "highest"
        ? [{ rating: "desc" }, { createdAt: "desc" }, { id: "desc" }]
        : sortKey === "lowest"
          ? [{ rating: "asc" }, { createdAt: "desc" }, { id: "desc" }]
          : [{ createdAt: "desc" }, { id: "desc" }];

    // Histogram across ALL ratings (unfiltered) to build Google-like distribution
    const histogramRows = await (prisma as any).realtorRating.groupBy({
      by: ["rating"],
      where: canSeeAll ? { realtorId } : { realtorId, status: "PUBLISHED" },
      _count: { rating: true },
    });
    const histogram: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of histogramRows || []) {
      const r = Number((row as any).rating);
      const c = Number((row as any)?._count?.rating || 0);
      if (r >= 1 && r <= 5) histogram[r] = c;
    }

    const ratings = await (prisma as any).realtorRating.findMany({
      where,
      include: {
        author: {
          select: {
            name: true,
            image: true,
          },
        },
        lead: {
          include: {
            property: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy,
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = ratings.length > take;
    const items = hasMore ? ratings.slice(0, take) : ratings;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Calcula estatísticas
    const stats = await (prisma as any).realtorStats.findUnique({
      where: { realtorId },
    });

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
    console.error("Error fetching ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    );
  }
}
