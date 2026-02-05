import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    if (!["REALTOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    const now = new Date();

    const [assistantOpen, unreadChats] = await Promise.all([
      (async () => {
        const items = await (prisma as any).assistantItem.findMany({
          where: {
            context: "REALTOR",
            ownerId: String(userId),
            OR: [{ status: "ACTIVE" }, { status: "SNOOZED", snoozedUntil: { lte: now } }],
          },
          select: {
            id: true,
            leadId: true,
          },
        });

        const keys = new Set<string>();
        for (const row of Array.isArray(items) ? items : []) {
          const id = String((row as any)?.id || "");
          const leadIdValue = (row as any)?.leadId;
          const leadId = leadIdValue ? String(leadIdValue) : "";
          if (!id) continue;
          keys.add(leadId ? `lead:${leadId}` : `item:${id}`);
        }
        return keys.size;
      })(),
      (async () => {
        const leadIdsRes = await (prisma as any).leadClientMessage.findMany({
          where: {
            lead: {
              AND: [
                {
                  OR: [{ realtorId: String(userId) }, { property: { ownerId: String(userId) } }],
                },
                { status: { not: "COMPLETED" } },
              ],
            },
          },
          distinct: ["leadId"],
          select: { leadId: true },
        });

        const leadIds = (leadIdsRes || []).map((l: any) => String(l.leadId));
        if (!leadIds.length) return 0;

        let readReceipts: any[] = [];
        try {
          readReceipts = await (prisma as any).leadChatReadReceipt.findMany({
            where: { userId: String(userId), leadId: { in: leadIds } },
            select: { leadId: true, lastReadAt: true },
          });
        } catch (err: any) {
          if (err?.code === "P2021") {
            readReceipts = [];
          } else {
            throw err;
          }
        }

        const readMap = new Map<string, Date>(
          (readReceipts || []).map((r: any) => [String(r.leadId), new Date(r.lastReadAt)])
        );

        const groups = await (prisma as any).leadClientMessage.groupBy({
          by: ["leadId"],
          where: {
            leadId: { in: leadIds },
            fromClient: true,
          },
          _max: { createdAt: true },
        });

        let unread = 0;
        for (const g of groups || []) {
          const leadId = String(g.leadId);
          const lastClientAt = g?._max?.createdAt ? new Date(g._max.createdAt) : null;
          if (!lastClientAt) continue;
          const lastReadAt = readMap.get(leadId) || null;
          if (!lastReadAt || lastClientAt.getTime() > lastReadAt.getTime()) unread += 1;
        }

        return unread;
      })(),
    ]);

    const ua = req.headers.get("user-agent") || "";
    const uaLower = ua.toLowerCase();
    const isLikelyBot =
      uaLower.includes("bot") ||
      uaLower.includes("spider") ||
      uaLower.includes("crawler") ||
      uaLower.includes("slack") ||
      uaLower.includes("whatsapp") ||
      uaLower.includes("telegram") ||
      uaLower.includes("facebookexternalhit") ||
      uaLower.includes("discord") ||
      uaLower.includes("headless") ||
      uaLower.includes("lighthouse");

    const response = NextResponse.json({
      success: true,
      metrics: {
        unreadChats: Number(unreadChats || 0),
        assistantOpen: Number(assistantOpen || 0),
      },
    });

    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=60");

    response.headers.set("x-zlw-ua-bot", isLikelyBot ? "1" : "0");
    response.headers.set("x-zlw-ua", ua.slice(0, 200));

    return response;
  } catch (error) {
    console.error("Error fetching broker nav metrics:", error);
    return NextResponse.json({ error: "Não conseguimos carregar as métricas agora." }, { status: 500 });
  }
}
