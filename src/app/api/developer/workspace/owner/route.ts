import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";

const transferOwnerSchema = z.object({
  newOwnerId: z.string().min(1, "newOwnerId é obrigatório"),
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

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const workspace = await resolveDeveloperWorkspaceForUser({
      userId: String(userId),
      authRole: role ? String(role) : null,
    });

    if (!workspace.allowed || !workspace.teamId) {
      return NextResponse.json(
        {
          error:
            workspace.reason === "PROFILE_NOT_FOUND"
              ? "Perfil da incorporadora não encontrado"
              : "Acesso negado",
        },
        { status: getDeveloperWorkspaceErrorStatus(workspace.reason) }
      );
    }

    if (!workspace.canTransferOwner) {
      return NextResponse.json({ error: "Você não tem permissão para transferir a titularidade deste workspace." }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = transferOwnerSchema.safeParse(json);
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

    const newOwnerId = String(parsed.data.newOwnerId);

    if (String(newOwnerId) === String(team.ownerId)) {
      return NextResponse.json({ success: true });
    }

    const newOwnerMembership = await (prisma as any).teamMember.findFirst({
      where: { teamId: String(workspace.teamId), userId: newOwnerId },
      select: { id: true, role: true, userId: true },
    });

    if (!newOwnerMembership) {
      return NextResponse.json({ error: "O novo dono precisa ser membro do workspace." }, { status: 400 });
    }

    if (String(newOwnerMembership.role) === "ASSISTANT") {
      return NextResponse.json({ error: "Assistentes não podem receber a titularidade do workspace." }, { status: 400 });
    }

    const oldOwnerId = String(team.ownerId);

    await (prisma as any).$transaction(async (tx: any) => {
      await tx.team.update({
        where: { id: String(workspace.teamId) },
        data: { ownerId: newOwnerId },
      });

      await tx.teamMember.updateMany({
        where: { teamId: String(workspace.teamId), userId: oldOwnerId, role: "OWNER" },
        data: { role: "AGENT" },
      });

      await tx.teamMember.update({
        where: { id: newOwnerMembership.id },
        data: { role: "OWNER" },
      });
    });

    return NextResponse.json({ success: true, teamId: String(workspace.teamId), oldOwnerId, newOwnerId });
  } catch (error) {
    console.error("Error transferring developer workspace owner:", error);
    return NextResponse.json({ error: "Não conseguimos transferir a titularidade agora." }, { status: 500 });
  }
}
