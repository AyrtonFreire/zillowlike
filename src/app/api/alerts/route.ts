import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { buildSearchParams } from "@/lib/url";
import { getSavedSearchFrequency, normalizeSavedSearchParams } from "@/lib/communication-preferences";

const AlertSchema = z.object({
  name: z.string().min(1).max(100),
  city: z.string().optional(),
  state: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  propertyType: z.string().optional(),
  inCondominium: z.boolean().optional(),
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

    const alerts = await (prisma as any).savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const mappedAlerts = (alerts as any[]).map((a: any) => {
      const { filters, queryString } = normalizeSavedSearchParams(a.params);

      return {
        id: a.id,
        name: a.label,
        filters,
        params: queryString,
        frequency: getSavedSearchFrequency(a.frequency, a.params),
        alertsEnabled: a.alertsEnabled,
        lastAlertSentAt: a.lastAlertSentAt,
        createdAt: a.createdAt,
      };
    });

    return NextResponse.json({ success: true, alerts: mappedAlerts });
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

    const normalizedType = String(parsed.data.propertyType || "").toUpperCase();
    const inCondominium = Boolean(parsed.data.inCondominium) || normalizedType === "CONDO";
    const type = normalizedType && normalizedType !== "CONDO" ? parsed.data.propertyType : undefined;
    const params = buildSearchParams({
      city: parsed.data.city,
      state: parsed.data.state,
      minPrice: typeof parsed.data.minPrice === "number" ? String(Math.round(parsed.data.minPrice)) : undefined,
      maxPrice: typeof parsed.data.maxPrice === "number" ? String(Math.round(parsed.data.maxPrice)) : undefined,
      type,
      inCondominium: inCondominium ? "true" : undefined,
      bedroomsMin: typeof parsed.data.minBedrooms === "number" ? String(parsed.data.minBedrooms) : undefined,
      bathroomsMin: typeof parsed.data.minBathrooms === "number" ? String(parsed.data.minBathrooms) : undefined,
      areaMin: typeof parsed.data.minArea === "number" ? String(parsed.data.minArea) : undefined,
    });

    const alert = await (prisma as any).savedSearch.create({
      data: {
        userId,
        label: parsed.data.name,
        params,
        frequency: parsed.data.frequency,
        alertsEnabled: true,
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
