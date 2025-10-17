import { NextRequest, NextResponse } from "next/server";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const realtorId = searchParams.get("realtorId");

    if (!realtorId) {
      return NextResponse.json(
        { error: "realtorId is required" },
        { status: 400 }
      );
    }

    const leads = await LeadDistributionService.getRealtorLeads(realtorId);

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error getting realtor leads:", error);
    return NextResponse.json(
      { error: "Failed to get leads" },
      { status: 500 }
    );
  }
}
