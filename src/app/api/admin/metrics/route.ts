import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Janela dos últimos 30 dias
    const since = new Date();
    since.setDate(since.getDate() - 30);

    // Métricas gerais (contadores simples)
    const [
      totalRealtors,
      activeRealtors,
      totalLeads,
      availableLeads,
      acceptedLeads,
      expiredLeads,
    ] = await Promise.all([
      prisma.realtorQueue.count(),
      prisma.realtorQueue.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "AVAILABLE" } }),
      prisma.lead.count({ where: { status: "ACCEPTED" } }),
      prisma.lead.count({ where: { status: "EXPIRED" } }),
    ]);

    // Médias por agregação
    const [avgResponseTimeAgg, avgRatingAgg] = await Promise.all([
      prisma.realtorQueue.aggregate({
        _avg: { avgResponseTime: true },
        where: { status: "ACTIVE" },
      }),
      prisma.realtorStats.aggregate({ _avg: { avgRating: true } }),
    ]);

    // Top corretores
    const topRealtors = await prisma.realtorQueue.findMany({
      where: { status: "ACTIVE" },
      orderBy: { score: "desc" },
      take: 10,
      include: {
        realtor: { select: { name: true, email: true } },
      },
    });

    // Leads por status (compatível com qualquer DB)
    const statuses = [
      "PENDING",
      "AVAILABLE",
      "RESERVED",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
    ] as const;
    const statusCounts = await Promise.all(
      statuses.map(async (s) => ({
        status: s,
        count: await prisma.lead.count({ where: { status: s as any } }),
      }))
    );

    // Leads por dia (últimos 30 dias) via JS
    const leadsLast30 = await prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const dayMap = new Map<string, number>();
    for (const l of leadsLast30) {
      const d = new Date(l.createdAt);
      const key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }
    const leadsByDay = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));

    // Estatísticas de conversão
    const totalWithResponse = acceptedLeads + expiredLeads;
    const conversionRate = totalWithResponse > 0 
      ? (acceptedLeads / totalWithResponse) * 100 
      : 0;

    // Taxa de resposta
    const responseRate = totalLeads > 0 
      ? ((acceptedLeads + expiredLeads) / totalLeads) * 100 
      : 0;

    const avgResponseTime = Math.round((avgResponseTimeAgg as any)?._avg?.avgResponseTime || 0);
    const avgRating = Number((((avgRatingAgg as any)?._avg?.avgRating || 0) as number).toFixed(2));

    return NextResponse.json({
      overview: {
        totalRealtors,
        activeRealtors,
        totalLeads,
        availableLeads,
        acceptedLeads,
        expiredLeads,
        avgResponseTime,
        avgRating,
        conversionRate: Number(conversionRate.toFixed(2)),
        responseRate: Number(responseRate.toFixed(2)),
      },
      topRealtors: topRealtors.map((r) => ({
        id: r.realtorId,
        name: r.realtor?.name ?? "—",
        email: r.realtor?.email ?? "—",
        score: r.score,
        position: r.position,
        activeLeads: r.activeLeads,
        totalAccepted: r.totalAccepted,
        avgResponseTime: r.avgResponseTime,
      })),
      leadsByStatus: statusCounts,
      leadsByDay,
    });
  } catch (error) {
    console.error("Error fetching admin metrics:", error);
    // Retorna payload seguro para evitar quebra no frontend
    return NextResponse.json(
      {
        overview: {
          totalRealtors: 0,
          activeRealtors: 0,
          totalLeads: 0,
          availableLeads: 0,
          acceptedLeads: 0,
          expiredLeads: 0,
          avgResponseTime: 0,
          avgRating: 0,
          conversionRate: 0,
          responseRate: 0,
        },
        topRealtors: [],
        leadsByStatus: [],
        leadsByDay: [],
        error: "Failed to fetch metrics",
      },
      { status: 200 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
