import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

export async function GET(_request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json(
        { error: "Usuário não encontrado na sessão" },
        { status: 400 }
      );
    }

    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não tem permissão para ver estes leads." },
        { status: 403 }
      );
    }

    const leads = await LeadDistributionService.getRealtorLeads(String(userId));

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error getting realtor leads:", error);
    return NextResponse.json(
      { error: "Failed to get leads" },
      { status: 500 }
    );
  }
}
