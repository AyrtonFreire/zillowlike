import { NextRequest, NextResponse } from "next/server";
import { OwnerApprovalService } from "@/lib/owner-approval-service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { ownerId, reason } = body;

    // Verificar se é o proprietário (ou usar session.user.id)
    const userId = ownerId || (session.user as any).id;

    const lead = await OwnerApprovalService.rejectVisit(id, userId, reason);

    return NextResponse.json({
      success: true,
      message: "Horário recusado. Vamos reavaliar o atendimento.",
      lead,
    });
  } catch (error: any) {
    console.error("Error rejecting visit:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject visit" },
      { status: 400 }
    );
  }
}
