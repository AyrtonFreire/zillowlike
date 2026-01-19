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

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function getSystemIntSetting(key: string, fallback: number): Promise<number> {
  try {
    const rec = await (prisma as any).systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    const parsed = Number.parseInt(String(rec?.value ?? ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  } catch {
  }
  return fallback;
}

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

    const period = String(url.searchParams.get("period") || "").trim().toLowerCase();

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

    const now = new Date();
    const since = period === "month" ? startOfMonth(now) : (() => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d;
    })();

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

    const quota = await (async () => {
      if (period !== "month") return null;

      const draftActions = new Set(["ASSISTANT_DRAFT_GENERATED", "ASSISTANT_DRAFT_FALLBACK"]);
      const used = logs
        .filter((log: any) => draftActions.has(String(log?.action || "")))
        .length;

      const defaultLimit = context === "AGENCY" ? 500 : 200;
      const limit = context === "AGENCY" && teamId
        ? await getSystemIntSetting(`team:${String(teamId)}:assistantAiMonthlyLimit`, await getSystemIntSetting("assistantAiMonthlyLimitAgency", defaultLimit))
        : context === "AGENCY"
          ? await getSystemIntSetting("assistantAiMonthlyLimitAgency", defaultLimit)
          : await getSystemIntSetting("assistantAiMonthlyLimitRealtor", defaultLimit);

      const remaining = Math.max(0, Number(limit || 0) - Number(used || 0));
      return {
        period: "month",
        periodStart: startOfMonth(now).toISOString(),
        used,
        limit,
        remaining,
      };
    })();

    return NextResponse.json({
      success: true,
      days,
      actorId,
      context,
      teamId: context === "AGENCY" ? teamId : null,
      total: logs.length,
      newestAt: newestAt ? newestAt.toISOString() : null,
      counts,
      quota,
    });
  } catch (error) {
    console.error("Error fetching assistant metrics:", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar métricas" }, { status: 500 });
  }
}
