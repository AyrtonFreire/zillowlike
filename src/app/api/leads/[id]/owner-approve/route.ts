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
    const { ownerId } = body;

    // Verificar se é o proprietário (ou usar session.user.id)
    const userId = ownerId || (session.user as any).id;

    const lead = await OwnerApprovalService.approveVisit(id, userId);

    return NextResponse.json({
      success: true,
      message: "Visita confirmada com sucesso!",
      lead,
    });
  } catch (error: any) {
    console.error("Error approving visit:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve visit" },
      { status: 400 }
    );
  }
}
