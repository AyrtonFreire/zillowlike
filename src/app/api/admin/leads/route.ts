import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const role = (session as any).user.role;
    if (role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Fetch all leads with relations
    const leads = await prisma.lead.findMany({
      include: {
        property: {
          select: {
            title: true,
            city: true,
            state: true,
            ownerId: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        realtor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate stats
    const stats = {
      total: leads.length,
      pending: leads.filter((l: any) => l.status === "PENDING").length,
      matching: leads.filter((l: any) => l.status === "MATCHING").length,
      confirmed: leads.filter((l: any) => l.status === "CONFIRMED").length,
      completed: leads.filter((l: any) => l.status === "COMPLETED").length,
      cancelled: leads.filter((l: any) => l.status === "CANCELLED").length,
      expired: leads.filter((l: any) => l.status === "EXPIRED").length,
    };

    return NextResponse.json({
      success: true,
      leads,
      stats,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar leads" },
      { status: 500 }
    );
  }
}
