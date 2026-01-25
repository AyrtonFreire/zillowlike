import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session: any = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const userId = String(session.userId || session.user?.id || "");
  const role = String(session.role || session.user?.role || "");

  const url = new URL(req.url);
  const teamIdParam = (url.searchParams.get("teamId") || "").trim();

  let teamId: string | null = teamIdParam || null;

  if (!teamId && role === "AGENCY") {
    const profile = await (prisma as any).agencyProfile.findUnique({
      where: { userId },
      select: { teamId: true },
    });
    teamId = profile?.teamId ? String(profile.teamId) : null;
  }

  let account: any = null;
  if (teamId) {
    account = await (prisma as any).olxAccount.findUnique({
      where: { teamId: String(teamId) },
      select: {
        id: true,
        teamId: true,
        userId: true,
        scopes: true,
        leadConfigId: true,
        chatWebhookEnabled: true,
        notificationConfigId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } else {
    account = await (prisma as any).olxAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        teamId: true,
        userId: true,
        scopes: true,
        leadConfigId: true,
        chatWebhookEnabled: true,
        notificationConfigId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  return NextResponse.json({ success: true, account });
}
