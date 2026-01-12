import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadAutoReplyService } from "@/lib/lead-auto-reply-service";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (user.role !== "REALTOR" && user.role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const settings = await LeadAutoReplyService.getSettings(user.id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Erro ao buscar configurações de auto-reply:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (user.role !== "REALTOR" && user.role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String(user.id));
    if (recoveryRes) return recoveryRes;

    const body = await req.json().catch(() => ({}));

    const enabled = Boolean((body as any)?.enabled);
    const timezone = String((body as any)?.timezone || "America/Sao_Paulo");
    const weekSchedule = (body as any)?.weekSchedule;
    const cooldownMinutes = Number((body as any)?.cooldownMinutes ?? 3);
    const maxRepliesPerLeadPer24h = Number((body as any)?.maxRepliesPerLeadPer24h ?? 6);

    const updated = await LeadAutoReplyService.upsertSettings({
      realtorId: user.id,
      enabled,
      timezone,
      weekSchedule,
      cooldownMinutes,
      maxRepliesPerLeadPer24h,
    } as any);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar configurações de auto-reply:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
