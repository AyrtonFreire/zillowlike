import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  leadId: z.string().min(1),
});

function canAccessLead(role: string | null, userId: string, lead: any) {
  if (role === "ADMIN") return true;
  if (lead.realtorId && lead.realtorId === userId) return true;
  if (lead.userId && lead.userId === userId) return true;
  if (lead.property?.ownerId && lead.property.ownerId === userId) return true;
  if (lead.team && lead.team.ownerId === userId) return true;
  return false;
}

export async function POST(req: NextRequest) {
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

    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const leadId = parsed.data.leadId;

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        realtorId: true,
        userId: true,
        property: { select: { ownerId: true } },
        team: { select: { ownerId: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    if (!canAccessLead(role, String(userId), lead)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    const receipt = await (prisma as any).leadChatReadReceipt.upsert({
      where: {
        leadId_userId: {
          leadId,
          userId: String(userId),
        },
      },
      create: {
        leadId,
        userId: String(userId),
        lastReadAt: now,
      },
      update: {
        lastReadAt: now,
      },
    });

    return NextResponse.json({ success: true, receipt: { leadId: receipt.leadId, lastReadAt: receipt.lastReadAt } });
  } catch (error) {
    console.error("Error marking chat as read:", error);
    return NextResponse.json({ error: "Não foi possível marcar como lido." }, { status: 500 });
  }
}
