import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "REALTOR"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.userId;
    const sessionRole = (session as any)?.role;
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (sessionRole === "ADMIN") {
      return NextResponse.json(
        { error: "Admins cannot change role via this endpoint" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = updateRoleSchema.parse(body);

    const current = await prisma.user.findUnique({
      where: { id: userId as string },
      select: { role: true },
    });

    if (current?.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admins cannot change role via this endpoint" },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: userId as string },
      data: { role },
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}
