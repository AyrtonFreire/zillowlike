import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * EMERGENCY ENDPOINT - Force role update from database
 * Use this to immediately update your session role without logout/login
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !(session as any)?.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session as any).userId;
    
    // Fetch current role from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Role fetched from database. Please reload the page.",
      currentRole: user.role,
      user: {
        email: user.email,
        name: user.name,
      },
      instructions: [
        "1. Close this tab",
        "2. Open a new incognito/private window",
        "3. Login again",
        "4. Your role should now be correct",
      ],
    });
  } catch (error) {
    console.error("Error forcing role update:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}
