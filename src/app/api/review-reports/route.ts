import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateReviewReportSchema = z.object({
  targetType: z.enum(["REALTOR", "OWNER"]),
  ratingId: z.string().min(1),
  reason: z.enum(["SPAM", "OFFENSIVE", "FAKE", "OTHER"]).default("OTHER"),
  description: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub;

  if (!session || !userId) {
    return NextResponse.json({ success: false, error: "Você precisa estar logado para denunciar." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateReviewReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { targetType, ratingId, reason, description } = parsed.data;

  if (targetType === "REALTOR") {
    const rating = await (prisma as any).realtorRating.findUnique({
      where: { id: ratingId },
      select: { id: true },
    });
    if (!rating) {
      return NextResponse.json({ success: false, error: "Avaliação não encontrada" }, { status: 404 });
    }

    try {
      const report = await (prisma as any).reviewReport.create({
        data: {
          realtorRatingId: ratingId,
          reportedByUserId: userId,
          reason,
          description: description?.trim() || null,
        },
      });
      return NextResponse.json({ success: true, report });
    } catch (e: any) {
      // Unique constraint: same user reporting same review
      return NextResponse.json({ success: false, error: "Você já denunciou esta avaliação." }, { status: 400 });
    }
  }

  const rating = await (prisma as any).ownerRating.findUnique({
    where: { id: ratingId },
    select: { id: true },
  });
  if (!rating) {
    return NextResponse.json({ success: false, error: "Avaliação não encontrada" }, { status: 404 });
  }

  try {
    const report = await (prisma as any).reviewReport.create({
      data: {
        ownerRatingId: ratingId,
        reportedByUserId: userId,
        reason,
        description: description?.trim() || null,
      },
    });
    return NextResponse.json({ success: true, report });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: "Você já denunciou esta avaliação." }, { status: 400 });
  }
}
