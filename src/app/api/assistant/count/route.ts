import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgencyWorkspaceErrorStatus, resolveAssistantScope } from "@/lib/agency-workspace";

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

    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId") || null;
    const scope = await resolveAssistantScope({
      userId: String(userId),
      authRole: role ? String(role) : null,
      requestedContext: url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR"),
      requestedTeamId: url.searchParams.get("teamId") || null,
    });

    if (!scope.allowed || !scope.ownerId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: getAgencyWorkspaceErrorStatus(scope.reason) });
    }

    const now = new Date();

    const baseWhere: any = {
      context: scope.context,
      ownerId: String(scope.ownerId),
      ...(leadId ? { leadId } : {}),
      ...(scope.context === "AGENCY" && scope.teamId ? { teamId: String(scope.teamId) } : {}),
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
        select: { id: true, leadId: true, type: true },
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
      const t = String((row as any)?.type || "").trim();
      if (!id) continue;
      if (!t) continue;
      keys.add(leadId ? `lead:${leadId}` : `item:${id}`);
    }

    const activeCount = keys.size;

    const newestMs = agg?._max?.updatedAt ? new Date(agg._max.updatedAt).getTime() : 0;
    const total = Number(agg?._count?._all || 0);
    const key = `${String(scope.ownerId)}:${scope.context}:${scope.teamId || "-"}:${leadId || "all"}`;
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
