import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";

const updateMemberRoleSchema = z.object({
  role: z.enum(["MEMBER", "ASSISTANT"]),
});

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

async function resolveWorkspaceAccess(userId: string | null, role: string | null) {
  if (!userId) {
    return { ok: false as const, response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }

  const workspace = await resolveDeveloperWorkspaceForUser({
    userId: String(userId),
    authRole: role ? String(role) : null,
  });

  if (!workspace.allowed || !workspace.teamId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            workspace.reason === "PROFILE_NOT_FOUND"
              ? "Perfil da incorporadora não encontrado"
              : "Acesso negado",
        },
        { status: getDeveloperWorkspaceErrorStatus(workspace.reason) }
      ),
    };
  }

  if (!workspace.canManageWorkspace) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Você não tem permissão para gerenciar membros neste workspace." }, { status: 403 }),
    };
  }

  return { ok: true as const, workspace };
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const { userId, role } = await getSessionContext();
    const access = await resolveWorkspaceAccess(userId, role);
    if (!access.ok) return access.response;

    const { userId: targetUserId } = await context.params;
    const workspace = access.workspace;

    const body = await req.json().catch(() => null);
    const parsed = updateMemberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const team = await (prisma as any).team.findUnique({
      where: { id: String(workspace.teamId) },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    if (String(team.ownerId) === String(targetUserId)) {
      return NextResponse.json({ error: "Não é possível alterar o papel do dono do workspace. Use a transferência de titularidade." }, { status: 400 });
    }

    const existing = await (prisma as any).teamMember.findFirst({
      where: { teamId: String(workspace.teamId), userId: String(targetUserId) },
      select: { id: true, role: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    }

    const updated = await (prisma as any).teamMember.update({
      where: { id: existing.id },
      data: { role: parsed.data.role === "ASSISTANT" ? "ASSISTANT" : "AGENT" },
      select: { id: true, userId: true, role: true },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: String(updated.id),
        userId: String(updated.userId),
        role: updated.role === "ASSISTANT" ? "ASSISTANT" : "MEMBER",
      },
    });
  } catch (error) {
    console.error("Error updating developer workspace member:", error);
    return NextResponse.json({ error: "Não conseguimos atualizar este membro agora." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const { userId, role } = await getSessionContext();
    const access = await resolveWorkspaceAccess(userId, role);
    if (!access.ok) return access.response;

    const { userId: targetUserId } = await context.params;
    const workspace = access.workspace;

    const team = await (prisma as any).team.findUnique({
      where: { id: String(workspace.teamId) },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    if (String(team.ownerId) === String(targetUserId)) {
      return NextResponse.json({ error: "Não é possível remover o dono do workspace. Transfira a titularidade antes." }, { status: 400 });
    }

    const existing = await (prisma as any).teamMember.findFirst({
      where: { teamId: String(workspace.teamId), userId: String(targetUserId) },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    }

    await (prisma as any).teamMember.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing developer workspace member:", error);
    return NextResponse.json({ error: "Não conseguimos remover este membro agora." }, { status: 500 });
  }
}
