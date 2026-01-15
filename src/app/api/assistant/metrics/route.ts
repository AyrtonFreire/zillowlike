import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ACTIONS = [
  "ASSISTANT_DRAFT_GENERATED",
  "ASSISTANT_DRAFT_FALLBACK",
  "ASSISTANT_DRAFT_COPIED",
  "ASSISTANT_DRAFT_SENT",
  "ASSISTANT_DRAFT_EDITED",
  "ASSISTANT_ITEM_RESOLVED",
  "ASSISTANT_ITEM_DISMISSED",
  "ASSISTANT_ITEM_SNOOZED",
] as const;

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const daysParam = parseInt(url.searchParams.get("days") || "7", 10);
    const allowedDays = [1, 7, 30, 90];
    const days = allowedDays.includes(daysParam) ? daysParam : 7;

    const contextParam = (url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR")).trim().toUpperCase();
    const context = contextParam === "AGENCY" ? "AGENCY" : "REALTOR";

    let teamId: string | null = url.searchParams.get("teamId") || null;
    if (!teamId && role === "AGENCY" && context === "AGENCY") {
      const agencyProfile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      teamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const actorIdParam = url.searchParams.get("actorId");
    const actorId = role === "ADMIN" && actorIdParam ? String(actorIdParam) : String(userId);

    const leadId = url.searchParams.get("leadId");
    const itemId = url.searchParams.get("itemId");

    const prismaAny = prisma as any;

    const whereBase: any = {
      createdAt: { gte: since },
      action: { in: ACTIONS as any },
      actorId,
      targetType: "AssistantItem",
      ...(itemId ? { targetId: String(itemId) } : {}),
    };

    const rawLogs = await prismaAny.auditLog.findMany({
      where: whereBase,
      select: {
        action: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const logs = (Array.isArray(rawLogs) ? rawLogs : []).filter((log: any) => {
      const meta = log?.metadata && typeof log.metadata === "object" ? (log.metadata as any) : null;
      const metaContext = meta?.context ? String(meta.context).toUpperCase() : "";
      if (context === "AGENCY") {
        if (metaContext !== "AGENCY") return false;
        if (teamId) {
          const metaTeamId = meta?.teamId ? String(meta.teamId) : "";
          if (metaTeamId !== String(teamId)) return false;
        }
      } else {
        if (metaContext !== "REALTOR") return false;
      }

      if (leadId) {
        const metaLeadId = meta?.leadId ? String(meta.leadId) : "";
        if (metaLeadId !== String(leadId)) return false;
      }

      return true;
    });

    const counts: Record<string, number> = {};
    let newestAt: Date | null = null;
    for (const log of logs) {
      const action = String((log as any)?.action || "");
      counts[action] = Number(counts[action] || 0) + 1;
      const createdAt = (log as any)?.createdAt ? new Date((log as any).createdAt) : null;
      if (createdAt && !Number.isNaN(createdAt.getTime())) {
        if (!newestAt || createdAt.getTime() > newestAt.getTime()) newestAt = createdAt;
      }
    }

    return NextResponse.json({
      success: true,
      days,
      actorId,
      context,
      teamId: context === "AGENCY" ? teamId : null,
      total: logs.length,
      newestAt: newestAt ? newestAt.toISOString() : null,
      counts,
    });
  } catch (error) {
    console.error("Error fetching assistant metrics:", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar métricas" }, { status: 500 });
  }
}
