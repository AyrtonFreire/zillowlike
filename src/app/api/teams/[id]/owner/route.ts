import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

const transferOwnerSchema = z.object({
  newOwnerId: z.string().min(1, "newOwnerId é obrigatório"),
});

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null, email: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;
  const email = session.user?.email || null;

  return { userId, role, email };
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role, email } = await getSessionContext();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: teamId } = await context.params;

    const team = await (prisma as any).team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    const myMembership = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId },
      select: { role: true },
    });

    const canManage = role === "ADMIN" || team.ownerId === userId || myMembership?.role === "OWNER";
    if (!canManage) {
      return NextResponse.json({ error: "Você não tem permissão para transferir a titularidade deste time." }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = transferOwnerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const newOwnerId = String(parsed.data.newOwnerId);

    if (String(newOwnerId) === String(team.ownerId)) {
      return NextResponse.json({ success: true });
    }

    const newOwnerMembership = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId: newOwnerId },
      select: { id: true, role: true, userId: true },
    });

    if (!newOwnerMembership) {
      return NextResponse.json({ error: "O novo dono precisa ser membro do time." }, { status: 400 });
    }

    if (newOwnerMembership.role === "ASSISTANT") {
      return NextResponse.json({ error: "Assistentes não podem ser donos do time." }, { status: 400 });
    }

    const oldOwnerId = String(team.ownerId);

    const updated = await (prisma as any).$transaction(async (tx: any) => {
      await tx.team.update({
        where: { id: teamId },
        data: { ownerId: newOwnerId },
        select: { id: true },
      });

      await tx.teamMember.updateMany({
        where: { teamId, userId: oldOwnerId, role: "OWNER" },
        data: { role: "AGENT" },
      });

      await tx.teamMember.update({
        where: { id: newOwnerMembership.id },
        data: { role: "OWNER" },
        select: { id: true },
      });

      return { teamId, oldOwnerId, newOwnerId };
    });

    try {
      await createAuditLog({
        level: "WARN",
        action: "TEAM_OWNER_TRANSFER",
        message: "Transferiu dono do time",
        actorId: userId,
        actorEmail: email,
        actorRole: role,
        targetType: "TEAM",
        targetId: teamId,
        metadata: {
          fromOwnerId: oldOwnerId,
          toOwnerId: newOwnerId,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    console.error("Error transferring team owner:", error);
    return NextResponse.json({ error: "Não conseguimos transferir o dono agora." }, { status: 500 });
  }
}
