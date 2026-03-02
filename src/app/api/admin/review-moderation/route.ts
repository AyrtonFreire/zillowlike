import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

async function recomputeRealtorStats(realtorId: string) {
  const agg = await (prisma as any).realtorRating.aggregate({
    where: { realtorId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const totalRatings = Number(agg?._count?._all || 0);
  const avgRating = totalRatings > 0 ? Number(agg?._avg?.rating || 0) : null;

  await (prisma as any).realtorStats.upsert({
    where: { realtorId },
    create: { realtorId, avgRating, totalRatings },
    update: { avgRating, totalRatings },
  });
}

async function recomputeOwnerStats(ownerId: string) {
  const agg = await (prisma as any).ownerRating.aggregate({
    where: { ownerId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const totalRatings = Number(agg?._count?._all || 0);
  const avgRating = totalRatings > 0 ? Number(agg?._avg?.rating || 0) : null;

  await (prisma as any).ownerStats.upsert({
    where: { ownerId },
    create: { ownerId, avgRating, totalRatings },
    update: { avgRating, totalRatings },
  });
}

const Schema = z.object({
  targetType: z.enum(["REALTOR", "OWNER"]),
  ratingId: z.string().min(1),
  status: z.enum(["PUBLISHED", "PENDING", "HIDDEN", "REMOVED"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String((session.user as any).id || ""));
    if (recoveryRes) return recoveryRes;

    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { targetType, ratingId, status } = parsed.data;

    if (targetType === "REALTOR") {
      const rating = await (prisma as any).realtorRating.update({
        where: { id: ratingId },
        data: { status },
        select: { id: true, realtorId: true, status: true },
      });

      if (rating?.realtorId) {
        await recomputeRealtorStats(String(rating.realtorId));
      }
      return NextResponse.json({ success: true, rating });
    }

    const rating = await (prisma as any).ownerRating.update({
      where: { id: ratingId },
      data: { status },
      select: { id: true, ownerId: true, status: true },
    });

    if (rating?.ownerId) {
      await recomputeOwnerStats(String(rating.ownerId));
    }
    return NextResponse.json({ success: true, rating });
  } catch (error) {
    console.error("Error moderating review:", error);
    return NextResponse.json({ success: false, error: "Erro ao moderar avaliação" }, { status: 500 });
  }
}
