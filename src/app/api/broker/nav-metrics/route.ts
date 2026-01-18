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

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [agendaToday, queueReserved, assistantOpen, unreadChats] = await Promise.all([
      prisma.lead.count({
        where: {
          realtorId: String(userId),
          visitDate: { gte: startOfDay, lte: endOfDay },
          visitTime: { not: null },
          status: { notIn: ["CANCELLED", "EXPIRED"] },
        },
      }),
      prisma.lead.count({
        where: {
          realtorId: String(userId),
          status: "WAITING_REALTOR_ACCEPT",
          reservedUntil: { gt: now },
        },
      }),
      (prisma as any).assistantItem.count({
        where: {
          context: "REALTOR",
          ownerId: String(userId),
          OR: [{ status: "ACTIVE" }, { status: "SNOOZED", snoozedUntil: { lte: now } }],
        },
      }),
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

    return NextResponse.json({
      success: true,
      metrics: {
        unreadChats: Number(unreadChats || 0),
        agendaToday: Number(agendaToday || 0),
        queueReserved: Number(queueReserved || 0),
        assistantOpen: Number(assistantOpen || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching broker nav metrics:", error);
    return NextResponse.json({ error: "Não conseguimos carregar as métricas agora." }, { status: 500 });
  }
}
