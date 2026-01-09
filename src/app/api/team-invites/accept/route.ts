import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const acceptInviteSchema = z.object({
  token: z.string().min(1, "token é obrigatório"),
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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const tokenFromQuery = req.nextUrl.searchParams.get("token");
    const json = await req.json().catch(() => null);

    const tokenCandidate = tokenFromQuery || json?.token;

    const parsed = acceptInviteSchema.safeParse({ token: tokenCandidate });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const token = parsed.data.token;

    const invite = await (prisma as any).teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json({ error: "Este convite não está mais disponível." }, { status: 400 });
    }

    const now = new Date();
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < now.getTime()) {
      await (prisma as any).teamInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Este convite expirou." }, { status: 400 });
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 400 });
    }

    if (user.role !== "REALTOR") {
      return NextResponse.json(
        { error: "Você precisa ser corretor para aceitar este convite." },
        { status: 400 },
      );
    }

    if (!user.email || String(invite.email).toLowerCase() !== String(user.email).toLowerCase()) {
      return NextResponse.json(
        { error: "Este convite foi enviado para outro e-mail." },
        { status: 403 },
      );
    }

    const existingMembership = await (prisma as any).teamMember.findFirst({
      where: { userId },
      select: { id: true, teamId: true },
    });

    if (existingMembership && String(existingMembership.teamId) !== String(invite.teamId)) {
      return NextResponse.json(
        { error: "Você já faz parte de um time e não pode entrar em outro." },
        { status: 400 },
      );
    }

    if (existingMembership && String(existingMembership.teamId) === String(invite.teamId)) {
      const updatedInvite = await (prisma as any).teamInvite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
          acceptedByUserId: userId,
        },
        select: { id: true, status: true },
      });

      return NextResponse.json({
        success: true,
        teamId: invite.teamId,
        teamName: invite.team?.name || null,
        invite: updatedInvite,
        alreadyMember: true,
      });
    }

    const maxQueue = await (prisma as any).teamMember.aggregate({
      where: { teamId: invite.teamId },
      _max: { queuePosition: true },
    });

    const nextQueuePosition = (maxQueue?._max?.queuePosition ?? 0) + 1;

    const result = await (prisma as any).$transaction(async (tx: any) => {
      const member = await tx.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId,
          role: invite.role,
          queuePosition: nextQueuePosition,
        },
        select: { id: true, teamId: true, userId: true, role: true, queuePosition: true },
      });

      const updatedInvite = await tx.teamInvite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
          acceptedByUserId: userId,
        },
        select: { id: true, status: true, acceptedAt: true },
      });

      return { member, invite: updatedInvite };
    });

    return NextResponse.json({
      success: true,
      teamId: invite.teamId,
      teamName: invite.team?.name || null,
      member: result.member,
      invite: result.invite,
    });
  } catch (error: any) {
    console.error("Error accepting team invite:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Este convite já foi utilizado." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Não conseguimos aceitar este convite agora." },
      { status: 500 },
    );
  }
}
