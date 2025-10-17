import { NextRequest, NextResponse } from "next/server";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters = {
      city: searchParams.get("city") || undefined,
      state: searchParams.get("state") || undefined,
      propertyType: searchParams.get("type") || undefined,
      minPrice: searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined,
      maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined,
    };

    const leads = await LeadDistributionService.getAvailableLeads(filters);

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error getting mural leads:", error);
    return NextResponse.json(
      { error: "Failed to get leads" },
      { status: 500 }
    );
  }
}
