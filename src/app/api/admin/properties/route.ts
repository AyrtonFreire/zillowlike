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

    const properties = await prisma.property.findMany({
      include: {
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch owner data for each property
    const propertiesWithOwners = await Promise.all(
      properties.map(async (property) => {
        const owner = property.ownerId
          ? await prisma.user.findUnique({
              where: { id: property.ownerId },
              select: { name: true, email: true },
            })
          : null;
        return { ...property, owner };
      })
    );

    return NextResponse.json({ properties: propertiesWithOwners });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
