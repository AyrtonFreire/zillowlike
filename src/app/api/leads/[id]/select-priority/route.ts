import { NextRequest, NextResponse } from "next/server";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

/**
 * Seleciona corretor prioritário entre os candidatos
 * Pode ser chamado manualmente ou por um worker
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const priorityRealtor = await LeadDistributionService.selectPriorityRealtor(id);

    return NextResponse.json({
      success: true,
      message: "Corretor prioritário selecionado",
      realtor: priorityRealtor,
    });
  } catch (error: any) {
    console.error("Error selecting priority realtor:", error);
    return NextResponse.json(
      { error: error.message || "Failed to select priority realtor" },
      { status: 400 }
    );
  }
}
