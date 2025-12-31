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

  const lead = await prisma.lead.findFirst({
    where: {
      userId,
      realtorId,
      rating: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return NextResponse.json({ eligible: Boolean(lead), leadId: lead?.id || null, requiresLogin: false });
}
