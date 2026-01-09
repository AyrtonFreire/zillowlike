import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const createInviteSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.enum(["AGENT", "ASSISTANT"]).optional(),
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

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: teamId } = await context.params;

    const membership = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId },
      select: { role: true },
    });

    const team = await (prisma as any).team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    const canManage = role === "ADMIN" || team.ownerId === userId || membership?.role === "OWNER";

    if (!canManage) {
      return NextResponse.json(
        { error: "Você não tem permissão para ver convites deste time." },
        { status: 403 },
      );
    }

    const rawInvites = await (prisma as any).teamInvite.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        token: true,
        expiresAt: true,
        createdAt: true,
        acceptedAt: true,
        revokedAt: true,
      },
    });

    const invites = (rawInvites as any[]).map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      acceptedAt: invite.acceptedAt,
      revokedAt: invite.revokedAt,
      acceptUrl: invite.token ? getAcceptUrl(String(invite.token)) : null,
    }));

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    console.error("Error listing team invites:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar os convites agora." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role, email: inviterEmail } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: teamId } = await context.params;

    const team = await (prisma as any).team.findUnique({
      where: { id: teamId },
      include: { owner: { select: { id: true, name: true, email: true } } },
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
        { error: "Você não tem permissão para convidar membros neste time." },
        { status: 403 },
      );
    }

    const json = await req.json().catch(() => null);
    const parsed = createInviteSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const invitedEmail = parsed.data.email.trim().toLowerCase();
    const inviteRole = parsed.data.role || "AGENT";

    const invitedUser = await (prisma as any).user.findUnique({
      where: { email: invitedEmail },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!invitedUser) {
      return NextResponse.json(
        { error: "Não encontramos uma conta com este e-mail. Peça para a pessoa criar uma conta primeiro." },
        { status: 400 },
      );
    }

    if (invitedUser.role !== "REALTOR") {
      return NextResponse.json(
        { error: "Este usuário ainda não é corretor. Peça para concluir o cadastro como corretor antes de aceitar o convite." },
        { status: 400 },
      );
    }

    const existingMembership = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId: invitedUser.id },
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
        { error: "Este usuário já faz parte de um time e não pode entrar em outro." },
        { status: 400 },
      );
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const invite = await (prisma as any).teamInvite.upsert({
      where: { teamId_email: { teamId, email: invitedEmail } },
      create: {
        teamId,
        email: invitedEmail,
        role: inviteRole,
        status: "PENDING",
        token,
        invitedByUserId: userId,
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
    const teamName = (team.name || "Time").toString();

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f3f4f6; padding: 24px;">
    <div style="max-width: 640px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #00736E 0%, #021616 100%); color: white; padding: 24px 28px;">
        <div style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.9;">OggaHub</div>
        <h1 style="margin: 8px 0 0; font-size: 20px;">Convite para entrar em um time</h1>
      </div>
      <div style="padding: 22px 28px 26px;">
        <p style="margin: 0 0 12px;">Você recebeu um convite para entrar no time <strong>${teamName}</strong>.</p>
        <p style="margin: 0 0 18px; color: #374151;">Enviado por: <strong>${inviterName}</strong></p>
        <div style="text-align: center; margin: 18px 0 10px;">
          <a href="${acceptUrl}" style="display: inline-block; background: #00736E; color: white; text-decoration: none; padding: 12px 18px; border-radius: 999px; font-weight: 700;">Aceitar convite</a>
        </div>
        <p style="margin: 12px 0 0; font-size: 12px; color: #6b7280;">Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p style="margin: 6px 0 0; font-size: 12px; word-break: break-all;"><a href="${acceptUrl}">${acceptUrl}</a></p>
      </div>
    </div>
  </body>
</html>`;

    const subject = `Convite para o time ${teamName} - OggaHub`;

    const emailSent = await sendEmail({ to: invitedEmail, subject, html });

    return NextResponse.json({
      success: true,
      invite,
      acceptUrl,
      emailSent,
    });
  } catch (error) {
    console.error("Error creating team invite:", error);
    return NextResponse.json(
      { error: "Não conseguimos enviar o convite agora." },
      { status: 500 },
    );
  }
}
