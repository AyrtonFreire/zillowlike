import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; inviteId: string }> },
) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: teamId, inviteId } = await context.params;

    const team = await (prisma as any).team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    const membership = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId },
      select: { role: true },
    });

    const canManage = role === "ADMIN" || team.ownerId === userId || membership?.role === "OWNER";

    if (!canManage) {
      return NextResponse.json(
        { error: "Você não tem permissão para revogar convites deste time." },
        { status: 403 },
      );
    }

    const invite = await (prisma as any).teamInvite.findUnique({
      where: { id: inviteId },
      select: { id: true, teamId: true, status: true },
    });

    if (!invite || invite.teamId !== teamId) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { error: "Apenas convites pendentes podem ser revogados." },
        { status: 400 },
      );
    }

    const updated = await (prisma as any).teamInvite.update({
      where: { id: inviteId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        revokedAt: true,
      },
    });

    return NextResponse.json({ success: true, invite: updated });
  } catch (error) {
    console.error("Error revoking team invite:", error);
    return NextResponse.json(
      { error: "Não conseguimos revogar este convite agora." },
      { status: 500 },
    );
  }
}
