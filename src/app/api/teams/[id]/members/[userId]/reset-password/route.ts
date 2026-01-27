import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

const resetPasswordSchema = z.object({
  password: z.string().min(8),
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { userId: actorId, role: actorRole, email: actorEmail } = await getSessionContext();

    if (!actorId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await context.params;

    const team = await (prisma as any).team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    const membership = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId: actorId },
      select: { role: true },
    });

    const canManage = actorRole === "ADMIN" || team.ownerId === actorId || membership?.role === "OWNER";
    if (!canManage) {
      return NextResponse.json(
        { error: "Você não tem permissão para gerenciar membros deste time." },
        { status: 403 },
      );
    }

    const targetMembership = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId: targetUserId },
      select: { id: true },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const updated = await (prisma as any).user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        authVersion: { increment: 1 },
      },
      select: { id: true, email: true, username: true },
    });

    try {
      await createAuditLog({
        level: "WARN",
        action: "TEAM_MEMBER_PASSWORD_RESET",
        message: "Resetou senha de membro do time",
        actorId: actorId,
        actorEmail,
        actorRole,
        targetType: "User",
        targetId: String(updated.id),
        metadata: {
          teamId,
          targetUserId: String(updated.id),
          username: (updated as any)?.username ?? null,
        },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting member password:", error);
    return NextResponse.json({ error: "Não conseguimos resetar a senha agora." }, { status: 500 });
  }
}
