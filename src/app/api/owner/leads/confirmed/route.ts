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

    const impersonateId = req.nextUrl.searchParams.get("userId");
    const sessionUser = session.user as any;
    const sessionRole = sessionUser?.role;

    let userId = sessionUser.id as string;

    if (impersonateId) {
      if (sessionRole !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      userId = impersonateId;
    }

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
