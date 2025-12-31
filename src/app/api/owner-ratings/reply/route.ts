import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ReplySchema = z.object({
  ratingId: z.string().min(1),
  replyText: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub;
  const role = (session as any)?.user?.role || (session as any)?.role;

  if (!session || !userId) {
    return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { ratingId, replyText } = parsed.data;

  const rating = await (prisma as any).ownerRating.findUnique({
    where: { id: ratingId },
    select: { id: true, ownerId: true },
  });

  if (!rating) {
    return NextResponse.json({ success: false, error: "Avaliação não encontrada" }, { status: 404 });
  }

  const isOwner = rating.ownerId === userId;
  const isAdmin = role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  const updated = await (prisma as any).ownerRating.update({
    where: { id: ratingId },
    data: {
      replyText,
      repliedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, rating: updated });
}
