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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });

    // Get property count for each user manually
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const propertyCount = await prisma.property.count({
          where: { ownerId: user.id },
        });
        return {
          ...user,
          createdAt: new Date().toISOString(), // Placeholder since User doesn't have createdAt
          _count: {
            ...user._count,
            properties: propertyCount,
          },
        };
      })
    );

    return NextResponse.json({ users: usersWithCounts });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
