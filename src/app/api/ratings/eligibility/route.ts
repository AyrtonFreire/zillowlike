import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ eligible: false, requiresLogin: true });
  }

  const userId = (session as any).user?.id || (session as any).userId || (session as any).user?.sub;
  if (!userId) {
    return NextResponse.json({ eligible: false, requiresLogin: true });
  }

  const search = req.nextUrl.searchParams;
  const realtorId = search.get("realtorId");
  if (!realtorId) {
    return NextResponse.json({ eligible: false, error: "realtorId is required" }, { status: 400 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const eligibleLead = await prisma.lead.findFirst({
    where: {
      userId,
      realtorId,
      rating: null,
      respondedAt: { not: null, lte: cutoff },
    },
    orderBy: { respondedAt: "desc" },
    select: { id: true },
  });

  if (eligibleLead?.id) {
    return NextResponse.json({ eligible: true, leadId: eligibleLead.id, requiresLogin: false, reason: "OK", nextEligibleAt: null });
  }

  const anyLead = await prisma.lead.findFirst({
    where: {
      userId,
      realtorId,
      rating: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!anyLead?.id) {
    return NextResponse.json({ eligible: false, leadId: null, requiresLogin: false, reason: "NO_LEAD", nextEligibleAt: null });
  }

  const lastRespondedLead = await prisma.lead.findFirst({
    where: {
      userId,
      realtorId,
      rating: null,
      respondedAt: { not: null },
    },
    orderBy: { respondedAt: "desc" },
    select: { respondedAt: true },
  });

  if (!lastRespondedLead?.respondedAt) {
    return NextResponse.json({ eligible: false, leadId: null, requiresLogin: false, reason: "AWAITING_RESPONSE", nextEligibleAt: null });
  }

  const nextEligibleAt = new Date(new Date(lastRespondedLead.respondedAt).getTime() + 24 * 60 * 60 * 1000);
  return NextResponse.json({ eligible: false, leadId: null, requiresLogin: false, reason: "COOLDOWN", nextEligibleAt: nextEligibleAt.toISOString() });
}
