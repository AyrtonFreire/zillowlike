import { NextRequest, NextResponse } from "next/server";
import { VisitSchedulingService } from "@/lib/visit-scheduling-service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    const leads = await VisitSchedulingService.getPropertyLeads(propertyId);

    return NextResponse.json({
      propertyId,
      leads,
      total: leads.length,
    });
  } catch (error) {
    console.error("Error fetching property leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
