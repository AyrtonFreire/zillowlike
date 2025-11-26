import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.user && !session?.userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = session.role || session.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await context.params;
    const realtorId = id;

    // Dados básicos do corretor
    const realtor = await prisma.user.findUnique({
      where: { id: realtorId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        publicSlug: true,
        publicHeadline: true,
        publicCity: true,
        publicState: true,
        phone: true,
        realtorCreci: true,
        realtorCreciState: true,
        realtorType: true,
      },
    });

    if (!realtor) {
      return NextResponse.json({ success: false, error: "Corretor não encontrado" }, { status: 404 });
    }

    // Fila e estatísticas principais
    const [queue, stats] = await Promise.all([
      prisma.realtorQueue.findUnique({
        where: { realtorId },
        include: {
          scoreHistory: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
      prisma.realtorStats.findUnique({
        where: { realtorId },
      }),
    ]);

    // Últimos leads atendidos por este corretor
    const leads = await prisma.lead.findMany({
      where: { realtorId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            price: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        rating: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Denúncias relacionadas a este corretor (diretas ou via leads atendidos)
    const reports = await (prisma as any).report.findMany({
      where: {
        OR: [
          { targetUserId: realtorId },
          {
            lead: {
              realtorId,
            },
          },
        ],
      },
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true, role: true, publicSlug: true },
        },
        property: {
          select: { id: true, title: true, city: true, state: true },
        },
        lead: {
          select: {
            id: true,
            status: true,
            property: {
              select: { id: true, title: true, city: true, state: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      realtor,
      queue,
      stats,
      leads,
      reports,
    });
  } catch (error) {
    console.error("Error fetching admin realtor overview:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar dados do corretor" },
      { status: 500 },
    );
  }
}
