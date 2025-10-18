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

    const confirmedVisits = await OwnerApprovalService.getConfirmedVisits(userId);

    return NextResponse.json(confirmedVisits);
  } catch (error) {
    console.error("Error fetching confirmed visits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
