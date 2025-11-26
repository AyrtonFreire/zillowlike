import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role || "USER";

    // Check if user has any properties
    const propertyCount = await prisma.property.count({
      where: { ownerId: userId },
    });

    // Check if user has pending realtor application
    const realtorApplication = await prisma.realtorApplication.findUnique({
      where: { userId },
      select: { status: true },
    });

    return NextResponse.json({
      authenticated: true,
      role,
      hasProperties: propertyCount > 0,
      propertyCount,
      realtorApplication: realtorApplication?.status || null,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json(
      { error: "Erro ao verificar status" },
      { status: 500 }
    );
  }
}
