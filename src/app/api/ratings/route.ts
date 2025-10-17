import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { QueueService } from "@/lib/queue-service";
import { createRatingSchema } from "@/lib/validations/rating";
import { withErrorHandling, successResponse, errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limiter";

const prisma = new PrismaClient();

// Criar avaliação
export const POST = withRateLimit(
  withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { leadId, realtorId, rating, comment } = createRatingSchema.parse(body);

  logger.info("Creating rating", { leadId, realtorId, rating });

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
    const newRating = await tx.realtorRating.create({
      data: { leadId, realtorId, rating, comment },
    });

    // Atualiza estatísticas do corretor
    const stats = await tx.realtorStats.findUnique({ where: { realtorId } });

    if (stats) {
      const newTotalRatings = stats.totalRatings + 1;
      const newAvgRating =
        ((stats.avgRating || 0) * stats.totalRatings + rating) / newTotalRatings;

      await tx.realtorStats.update({
        where: { realtorId },
        data: { avgRating: newAvgRating, totalRatings: newTotalRatings },
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

// Listar avaliações de um corretor
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const realtorId = searchParams.get("realtorId");

    if (!realtorId) {
      return NextResponse.json(
        { error: "realtorId is required" },
        { status: 400 }
      );
    }

    const ratings = await prisma.realtorRating.findMany({
      where: { realtorId },
      include: {
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
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    // Calcula estatísticas
    const stats = await prisma.realtorStats.findUnique({
      where: { realtorId },
    });

    return NextResponse.json({
      ratings,
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
