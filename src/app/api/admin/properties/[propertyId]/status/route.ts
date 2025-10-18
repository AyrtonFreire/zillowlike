import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "DRAFT", "SOLD", "RENTED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session as any)?.role;

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { propertyId } = await params;
    const body = await request.json();
    const { status } = updateStatusSchema.parse(body);

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: { status },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    return NextResponse.json({ property: updatedProperty });
  } catch (error) {
    console.error("Error updating property status:", error);
    return NextResponse.json(
      { error: "Failed to update property status" },
      { status: 500 }
    );
  }
}
