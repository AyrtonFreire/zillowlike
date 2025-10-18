import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session as any)?.role;

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Users stats
    const [totalUsers, realtors, owners] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "REALTOR" } }),
      prisma.user.count({ where: { role: "OWNER" } }),
    ]);

    // User model doesn't have createdAt, so we can't calculate growth
    const newUsersThisMonth = 0;
    const userGrowth = 0;

    // Properties stats
    const [totalProperties, activeProperties, draftProperties, soldProperties] =
      await Promise.all([
        prisma.property.count(),
        prisma.property.count({ where: { status: "ACTIVE" } }),
        prisma.property.count({ where: { status: "DRAFT" } }),
        prisma.property.count({ where: { status: "SOLD" } }),
      ]);

    const avgPriceResult = await prisma.property.aggregate({
      _avg: { price: true },
    });

    // Leads stats
    const [totalLeads, openLeads, acceptedLeads, rejectedLeads] =
      await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({ where: { status: "PENDING" } }),
        prisma.lead.count({ where: { status: "ACCEPTED" } }),
        prisma.lead.count({ where: { status: "REJECTED" } }),
      ]);

    const conversionRate =
      totalLeads > 0 ? Math.round((acceptedLeads / totalLeads) * 100) : 0;

    // Revenue stats (sum of all property prices)
    const totalRevenue = await prisma.property.aggregate({
      _sum: { price: true },
    });

    const stats = {
      users: {
        total: totalUsers,
        realtors,
        owners,
        newThisMonth: newUsersThisMonth,
        growth: userGrowth,
      },
      properties: {
        total: totalProperties,
        active: activeProperties,
        pending: draftProperties,
        sold: soldProperties,
        avgPrice: avgPriceResult._avg.price || 0,
      },
      leads: {
        total: totalLeads,
        open: openLeads,
        accepted: acceptedLeads,
        rejected: rejectedLeads,
        conversionRate,
      },
      revenue: {
        total: totalRevenue._sum.price || 0,
        thisMonth: 0, // TODO: Calculate based on properties added this month
        growth: 0,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
