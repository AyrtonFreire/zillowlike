import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";
import { getTeamInviteEmail, sendEmail } from "@/lib/email";

const createInviteSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.enum(["MEMBER", "ASSISTANT"]).optional(),
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

function getAcceptUrl(token: string) {
  const path = `/team-invites/accept?token=${encodeURIComponent(token)}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  if (!baseUrl) return path;
  return `${String(baseUrl).replace(/\/$/, "")}${path}`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role, email: inviterEmail } = await getSessionContext();

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

    if (!workspace.canManageWorkspace) {
      return NextResponse.json({ error: "Você não tem permissão para convidar membros neste workspace." }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = createInviteSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const team = await (prisma as any).team.findUnique({
      where: { id: String(workspace.teamId) },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!team) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    const invitedEmail = parsed.data.email.trim().toLowerCase();
    const inviteRole = parsed.data.role === "ASSISTANT" ? "ASSISTANT" : "AGENT";

    const invitedUser = await (prisma as any).user.findUnique({
      where: { email: invitedEmail },
      select: { id: true, email: true, role: true },
    });

    if (!invitedUser) {
      return NextResponse.json(
        { error: "Não encontramos uma conta com este e-mail. Peça para a pessoa criar uma conta primeiro." },
        { status: 400 }
      );
    }

    if (invitedUser.role !== "REALTOR") {
      return NextResponse.json(
        { error: "Este usuário precisa ter conta de corretor para aceitar o convite do workspace." },
        { status: 400 }
      );
    }

    const existingMembership = await (prisma as any).teamMember.findFirst({
      where: { teamId: String(workspace.teamId), userId: invitedUser.id },
      select: { id: true },
    });

    if (existingMembership) {
      return NextResponse.json({ success: true, alreadyMember: true });
    }

    const membershipCount = await (prisma as any).teamMember.count({
      where: { userId: invitedUser.id },
    });

    if (membershipCount > 0) {
      return NextResponse.json(
        { error: "Este usuário já faz parte de outro time e não pode entrar em outro workspace agora." },
        { status: 400 }
      );
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const invite = await (prisma as any).teamInvite.upsert({
      where: { teamId_email: { teamId: String(workspace.teamId), email: invitedEmail } },
      create: {
        teamId: String(workspace.teamId),
        email: invitedEmail,
        role: inviteRole,
        status: "PENDING",
        token,
        invitedByUserId: String(userId),
        expiresAt,
      },
      update: {
        status: "PENDING",
        token,
        expiresAt,
        revokedAt: null,
        role: inviteRole,
      },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const acceptUrl = getAcceptUrl(token);
    const inviterName = (team.owner?.name || inviterEmail || "OggaHub").toString();
    const teamName = (team.name || "Workspace").toString();
    const { subject, html } = getTeamInviteEmail({ inviterName, teamName, acceptUrl });
    const emailSent = await sendEmail({ to: invitedEmail, subject, html });

    return NextResponse.json({
      success: true,
      invite: {
        id: String(invite.id),
        email: String(invite.email || ""),
        role: invite.role === "ASSISTANT" ? "ASSISTANT" : "MEMBER",
        status: String(invite.status || "PENDING"),
        expiresAt: invite.expiresAt instanceof Date ? invite.expiresAt.toISOString() : invite.expiresAt,
        createdAt: invite.createdAt instanceof Date ? invite.createdAt.toISOString() : invite.createdAt,
      },
      acceptUrl,
      emailSent,
    });
  } catch (error) {
    console.error("Error creating developer workspace invite:", error);
    return NextResponse.json({ error: "Não conseguimos enviar o convite agora." }, { status: 500 });
  }
}
