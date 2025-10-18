import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OwnerApprovalService } from "@/lib/owner-approval-service";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const pendingLeads = await OwnerApprovalService.getPendingApprovals(userId);

    return NextResponse.json(pendingLeads);
  } catch (error) {
    console.error("Error fetching pending leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
