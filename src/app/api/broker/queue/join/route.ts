import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRecoveryFactor } from "@/lib/recovery-factor";
import { QueueService } from "@/lib/queue-service";

export async function POST(_request: NextRequest) {
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

    const queue = await QueueService.joinQueue(String(userId));
    return NextResponse.json(queue, { status: 201 });
  } catch (error) {
    console.error("Error joining broker queue:", error);
    return NextResponse.json({ error: "Failed to join queue" }, { status: 500 });
  }
}
