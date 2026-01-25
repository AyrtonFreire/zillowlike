import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId") || null;
    const context = (url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR"))
      .trim()
      .toUpperCase();
    let teamId = url.searchParams.get("teamId") || null;

    if (!teamId && role === "AGENCY" && context === "AGENCY") {
      const agencyProfile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      teamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
    }

    const now = new Date();

    const baseWhere: any = {
      context: context === "AGENCY" ? "AGENCY" : "REALTOR",
      ownerId: String(userId),
      ...(leadId ? { leadId } : {}),
      ...(context === "AGENCY" && teamId ? { teamId: String(teamId) } : {}),
    };

    const activeWhere: any = {
      ...baseWhere,
      OR: [
        { status: "ACTIVE" },
        { status: "SNOOZED", snoozedUntil: { lte: now } },
      ],
    };

    const [activeItems, agg] = await Promise.all([
      (prisma as any).assistantItem.findMany({
        where: activeWhere,
        select: { id: true, leadId: true },
      }),
      (prisma as any).assistantItem.aggregate({
        where: baseWhere,
        _max: { updatedAt: true },
        _count: { _all: true },
      }),
    ]);

    const keys = new Set<string>();
    for (const row of Array.isArray(activeItems) ? activeItems : []) {
      const id = String((row as any)?.id || "");
      const leadIdValue = (row as any)?.leadId;
      const leadId = leadIdValue ? String(leadIdValue) : "";
      if (!id) continue;
      keys.add(leadId ? `lead:${leadId}` : `item:${id}`);
    }

    const activeCount = keys.size;

    const newestMs = agg?._max?.updatedAt ? new Date(agg._max.updatedAt).getTime() : 0;
    const total = Number(agg?._count?._all || 0);
    const key = `${String(userId)}:${context === "AGENCY" ? "AGENCY" : "REALTOR"}:${teamId || "-"}:${leadId || "all"}`;
    const etag = `W/\"assistant-count:${key}:${newestMs}:${total}:${activeCount}\"`;

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
    }

    const res = NextResponse.json({ success: true, activeCount });
    res.headers.set("ETag", etag);
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    console.error("Error fetching assistant count:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar o Assistente agora." },
      { status: 500 }
    );
  }
}
