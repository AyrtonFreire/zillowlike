import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

const createMemberSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8),
  teamRole: z.enum(["AGENT", "ASSISTANT"]).optional(),
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
    const { userId, role, email: actorEmail } = await getSessionContext();

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

    const membership = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId },
      select: { role: true },
    });

    const canManage = role === "ADMIN" || team.ownerId === userId || membership?.role === "OWNER";
    if (!canManage) {
      return NextResponse.json(
        { error: "Você não tem permissão para gerenciar membros deste time." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const normalizedUsername = parsed.data.username.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const teamRole = parsed.data.teamRole || "AGENT";

    const maxQueue = await (prisma as any).teamMember.aggregate({
      where: { teamId },
      _max: { queuePosition: true },
    });
    const nextQueuePosition = (maxQueue?._max?.queuePosition ?? 0) + 1;

    const result = await (prisma as any).$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.name?.trim() || null,
          username: normalizedUsername,
          email: null,
          emailVerified: null,
          passwordHash,
          mustChangePassword: true,
          role: "REALTOR",
          realtorType: "IMOBILIARIA",
        },
        select: { id: true, name: true, username: true, role: true },
      });

      const member = await tx.teamMember.create({
        data: {
          teamId,
          userId: String(user.id),
          role: teamRole,
          queuePosition: nextQueuePosition,
        },
        select: { id: true, teamId: true, userId: true, role: true, queuePosition: true },
      });

      return { user, member };
    });

    try {
      await createAuditLog({
        level: "SUCCESS",
        action: "TEAM_MEMBER_ACCOUNT_CREATED",
        message: "Criou usuário interno de corretor",
        actorId: userId,
        actorEmail,
        actorRole: role,
        targetType: "User",
        targetId: String(result.user.id),
        metadata: {
          teamId,
          username: normalizedUsername,
          teamRole,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, user: result.user, member: result.member });
  } catch (error: any) {
    console.error("Error creating team member account:", error);

    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Este usuário já existe." }, { status: 400 });
    }

    return NextResponse.json({ error: "Não conseguimos criar este membro agora." }, { status: 500 });
  }
}
