import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

const updateMemberRoleSchema = z.object({
  role: z.enum(["AGENT", "ASSISTANT"]),
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

async function assertCanManageTeam(teamId: string, userId: string, role: string | null) {
  const team = await (prisma as any).team.findUnique({
    where: { id: teamId },
    select: { id: true, ownerId: true },
  });

  if (!team) {
    return { ok: false as const, response: NextResponse.json({ error: "Time não encontrado" }, { status: 404 }) };
  }

  const membership = await (prisma as any).teamMember.findFirst({
    where: { teamId, userId },
    select: { role: true },
  });

  const canManage = role === "ADMIN" || team.ownerId === userId || membership?.role === "OWNER";
  if (!canManage) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Você não tem permissão para gerenciar membros deste time." }, { status: 403 }),
    };
  }

  return { ok: true as const, team, membership };
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const { userId, role, email } = await getSessionContext();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await context.params;

    const permission = await assertCanManageTeam(teamId, userId, role);
    if (!permission.ok) return permission.response;

    const body = await req.json().catch(() => null);
    const parsed = updateMemberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const team = permission.team;

    if (String(team.ownerId) === String(targetUserId)) {
      return NextResponse.json({ error: "Não é possível alterar o papel do dono do time. Use a transferência de dono." }, { status: 400 });
    }

    const existing = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId: targetUserId },
      select: { id: true, role: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    }

    const updated = await (prisma as any).teamMember.update({
      where: { id: existing.id },
      data: { role: parsed.data.role },
      select: { id: true, userId: true, role: true },
    });

    try {
      await createAuditLog({
        level: "INFO",
        action: "TEAM_MEMBER_ROLE_UPDATE",
        message: "Atualizou papel de membro do time",
        actorId: userId,
        actorEmail: email,
        actorRole: role,
        targetType: "TEAM_MEMBER",
        targetId: String(updated.id),
        metadata: {
          teamId,
          targetUserId: String(targetUserId),
          fromRole: existing.role,
          toRole: updated.role,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error("Error updating team member role:", error);
    return NextResponse.json({ error: "Não conseguimos atualizar este membro agora." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const { userId, role, email } = await getSessionContext();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await context.params;

    const permission = await assertCanManageTeam(teamId, userId, role);
    if (!permission.ok) return permission.response;

    const team = permission.team;

    if (String(team.ownerId) === String(targetUserId)) {
      return NextResponse.json({ error: "Não é possível remover o dono do time. Transfira a propriedade antes." }, { status: 400 });
    }

    const existing = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId: targetUserId },
      select: { id: true, role: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    }

    await (prisma as any).teamMember.delete({ where: { id: existing.id } });

    try {
      await createAuditLog({
        level: "WARN",
        action: "TEAM_MEMBER_REMOVED",
        message: "Removeu membro do time",
        actorId: userId,
        actorEmail: email,
        actorRole: role,
        targetType: "TEAM_MEMBER",
        targetId: String(existing.id),
        metadata: {
          teamId,
          targetUserId: String(targetUserId),
          removedRole: existing.role,
        },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json({ error: "Não conseguimos remover este membro agora." }, { status: 500 });
  }
}
