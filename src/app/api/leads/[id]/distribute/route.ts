import { NextRequest, NextResponse } from "next/server";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    if (!leadId) {
      return NextResponse.json({ error: "Missing lead id" }, { status: 400 });
    }

    const result = await LeadDistributionService.distributeNewLead(leadId);

    return NextResponse.json({
      success: true,
      leadId,
      distributedTo: result?.realtorId ?? null,
      status: result ? "RESERVED" : "AVAILABLE",
      message: result
        ? "Lead reservado para o próximo corretor da fila"
        : "Nenhum corretor disponível. Lead marcado como AVAILABLE no mural",
    });
  } catch (error: any) {
    console.error("Error distributing lead:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to distribute lead" },
      { status: 500 }
    );
  }
}
