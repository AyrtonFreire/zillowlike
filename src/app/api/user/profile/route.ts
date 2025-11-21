import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/profile
 * Get current user profile with stats
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        phone: true,
        phoneVerifiedAt: true,
        _count: {
          select: {
            leads: true,
            realtorLeads: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get property count if owner
    let propertyCount = 0;
    if (user.role === "OWNER") {
      propertyCount = await prisma.property.count({
        where: { ownerId: userId },
      });
    }

    // Get favorites count
    const favoritesCount = await prisma.favorite.count({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        stats: {
          properties: propertyCount,
          favorites: favoritesCount,
          leadsReceived: user._count.leads,
          leadsSent: user._count.realtorLeads,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update user profile
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const body = await req.json();

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    // Only allow updating certain fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.phone !== undefined) {
      updateData.phone = body.phone;
      if (existing && existing.phone !== body.phone) {
        updateData.phoneVerifiedAt = null;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        phone: true,
        phoneVerifiedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
