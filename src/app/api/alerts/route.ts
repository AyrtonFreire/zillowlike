import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AlertSchema = z.object({
  name: z.string().min(1).max(100),
  city: z.string().optional(),
  state: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  propertyType: z.string().optional(),
  minBedrooms: z.number().optional(),
  minBathrooms: z.number().optional(),
  minArea: z.number().optional(),
  frequency: z.enum(["INSTANT", "DAILY", "WEEKLY"]).default("DAILY"),
});

/**
 * GET /api/alerts
 * Get user's saved alerts
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;

    const alerts = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts
 * Create new alert
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const body = await req.json();
    
    const parsed = AlertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const alert = await prisma.savedSearch.create({
      data: {
        userId,
        label: parsed.data.name,
        params: JSON.stringify({
          city: parsed.data.city,
          state: parsed.data.state,
          minPrice: parsed.data.minPrice,
          maxPrice: parsed.data.maxPrice,
          type: parsed.data.propertyType,
          minBedrooms: parsed.data.minBedrooms,
          minBathrooms: parsed.data.minBathrooms,
          minArea: parsed.data.minArea,
          frequency: parsed.data.frequency,
        }),
      },
    });

    return NextResponse.json({ success: true, alert }, { status: 201 });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts/[id]
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Verify ownership
    const alert = await prisma.savedSearch.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    if (alert.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.savedSearch.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
