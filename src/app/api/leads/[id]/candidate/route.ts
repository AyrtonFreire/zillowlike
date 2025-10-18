import { NextRequest, NextResponse } from "next/server";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { realtorId } = body;

    if (!realtorId) {
      return NextResponse.json(
        { error: "realtorId is required" },
        { status: 400 }
      );
    }

    const candidature = await LeadDistributionService.candidateToLead(
      id,
      realtorId
    );

    return NextResponse.json({
      success: true,
      candidature,
      message: "Candidatura enviada com sucesso!",
    });
  } catch (error: any) {
    console.error("Error candidating to lead:", error);
    return NextResponse.json(
      { error: error.message || "Failed to candidate" },
      { status: 400 }
    );
  }
}
