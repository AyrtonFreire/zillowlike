import { NextRequest, NextResponse } from "next/server";
import { VisitSchedulingService } from "@/lib/visit-scheduling-service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId");
    const dateStr = searchParams.get("date");

    if (!propertyId || !dateStr) {
      return NextResponse.json(
        { error: "propertyId and date are required" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const slots = await VisitSchedulingService.getAvailableSlots(
      propertyId,
      date
    );

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Error getting available slots:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
