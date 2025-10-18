import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        message: "Not authenticated" 
      });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    
    // Fetch user from database
    let dbUser = null;
    if (userId) {
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
        },
      });
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        user: (session as any)?.user,
        userId: (session as any)?.userId,
        role: (session as any)?.role,
        email: (session as any)?.user?.email,
      },
      database: dbUser,
      match: dbUser?.role === (session as any)?.role,
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}
