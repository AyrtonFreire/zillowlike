import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRecoveryFactor } from "@/lib/recovery-factor";
import { QueueService } from "@/lib/queue-service";

export async function GET(_request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    if (!["REALTOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    const stats = await QueueService.getQueueStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error getting broker queue stats:", error);
    return NextResponse.json({ error: "Failed to get queue stats" }, { status: 500 });
  }
}
