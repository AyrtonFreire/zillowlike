import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
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

const assignLeadSchema = z.object({
  realtorId: z.string().min(1, "realtorId é obrigatório"),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const json = await req.json().catch(() => null);
    const parsed = assignLeadSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const newRealtorId = parsed.data.realtorId;

    const lead = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        property: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const previousRealtorId = lead.realtorId as string | null;
    const effectiveTeamId = (lead as any).teamId || (lead.property as any)?.teamId || null;

    if (!effectiveTeamId) {
      if (role !== "ADMIN") {
        return NextResponse.json({ error: "Este lead não está associado a nenhum time." }, { status: 400 });
      }

      const updatedLead = await (prisma as any).lead.update({
        where: { id },
        data: {
          realtorId: newRealtorId,
        },
        include: {
          realtor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await (prisma as any).leadAssignmentLog.create({
        data: {
          leadId: id,
          fromRealtorId: previousRealtorId,
          toRealtorId: newRealtorId,
          changedByUserId: userId,
          teamId: effectiveTeamId,
        },
      });

      return NextResponse.json({ success: true, lead: updatedLead });
    }

    const team = await (prisma as any).team.findUnique({
      where: { id: effectiveTeamId },
      include: {
        owner: {
          select: { id: true },
        },
        members: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Time associado a este lead não foi encontrado." }, { status: 400 });
    }

    const members = (team.members as any[]) || [];
    const isMember = members.some((m) => m.userId === userId);
    const isOwner = team.ownerId === userId;

    if (!isMember && !isOwner && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não tem permissão para reatribuir leads deste time." },
        { status: 403 },
      );
    }

    const targetMembership = members.find((m) => m.userId === newRealtorId);

    if (!targetMembership) {
      return NextResponse.json(
        { error: "O corretor escolhido não faz parte deste time." },
        { status: 400 },
      );
    }

    if (targetMembership.role === "ASSISTANT") {
      return NextResponse.json(
        { error: "Assistentes não podem ser responsáveis por leads." },
        { status: 400 },
      );
    }

    const updated = await (prisma as any).lead.update({
      where: { id },
      data: {
        realtorId: newRealtorId,
        teamId: effectiveTeamId,
      },
      include: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await (prisma as any).leadAssignmentLog.create({
      data: {
        leadId: id,
        fromRealtorId: previousRealtorId,
        toRealtorId: newRealtorId,
        changedByUserId: userId,
        teamId: effectiveTeamId,
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    console.error("Error assigning lead:", error);
    return NextResponse.json(
      { error: "Não conseguimos reatribuir este lead agora." },
      { status: 500 },
    );
  }
}
