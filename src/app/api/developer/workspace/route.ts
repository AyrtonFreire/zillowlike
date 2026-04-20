import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

function mapWorkspaceRole(role?: string | null) {
  const normalized = String(role || "").toUpperCase();
  if (normalized === "OWNER") return "OWNER";
  if (normalized === "ASSISTANT") return "ASSISTANT";
  return "MEMBER";
}

function mapTeamRole(role?: string | null) {
  const normalized = String(role || "").toUpperCase();
  if (normalized === "ASSISTANT") return "ASSISTANT";
  if (normalized === "OWNER") return "OWNER";
  return "MEMBER";
}

export async function GET() {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const workspace = await resolveDeveloperWorkspaceForUser({
      userId: String(userId),
      authRole: role ? String(role) : null,
    });

    if (!workspace.allowed || !workspace.teamId || !workspace.developerProfileUserId) {
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

    const [developerProfile, team, invites] = await Promise.all([
      (prisma as any).developerProfile.findUnique({
        where: { userId: String(workspace.developerProfileUserId) },
        select: {
          id: true,
          legalName: true,
          brandName: true,
          cnpj: true,
          phone: true,
          website: true,
          businessType: true,
          description: true,
          logoUrl: true,
        },
      }),
      (prisma as any).team.findUnique({
        where: { id: String(workspace.teamId) },
        select: {
          id: true,
          name: true,
          ownerId: true,
          members: {
            orderBy: [{ role: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              role: true,
              queuePosition: true,
              createdAt: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
              invites: true,
              developmentProjects: true,
              leads: true,
            },
          },
        },
      }),
      (prisma as any).teamInvite.findMany({
        where: { teamId: String(workspace.teamId) },
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
      }),
    ]);

    if (!developerProfile || !team) {
      return NextResponse.json({ error: "Workspace da incorporadora não encontrado" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";

    return NextResponse.json({
      success: true,
      profile: {
        id: String(developerProfile.id),
        displayName: String(developerProfile.brandName || developerProfile.legalName || "Incorporadora"),
        legalName: String(developerProfile.legalName || ""),
        brandName: developerProfile.brandName ? String(developerProfile.brandName) : null,
        cnpj: String(developerProfile.cnpj || ""),
        phone: developerProfile.phone ? String(developerProfile.phone) : null,
        website: developerProfile.website ? String(developerProfile.website) : null,
        businessType: developerProfile.businessType ? String(developerProfile.businessType) : null,
        description: developerProfile.description ? String(developerProfile.description) : null,
        logoUrl: developerProfile.logoUrl ? String(developerProfile.logoUrl) : null,
      },
      workspace: {
        teamId: String(team.id),
        teamName: team.name ? String(team.name) : null,
        teamOwnerId: team.ownerId ? String(team.ownerId) : null,
        viewerUserId: String(workspace.userId || userId),
        viewerWorkspaceRole: mapWorkspaceRole(workspace.workspaceRole),
        canManageWorkspace: Boolean(workspace.canManageWorkspace),
        canTransferOwner: Boolean(workspace.canTransferOwner),
        membersCount: Number(team._count?.members || 0),
        invitesCount: Number(team._count?.invites || 0),
        developmentProjectsCount: Number(team._count?.developmentProjects || 0),
        leadsCount: Number(team._count?.leads || 0),
      },
      members: Array.isArray(team.members)
        ? team.members.map((member: any) => ({
            id: String(member.id),
            userId: String(member.userId || member.user?.id || ""),
            role: mapTeamRole(member.role),
            queuePosition: typeof member.queuePosition === "number" ? member.queuePosition : null,
            createdAt: member.createdAt instanceof Date ? member.createdAt.toISOString() : member.createdAt,
            isOwner: String(team.ownerId || "") === String(member.userId || member.user?.id || ""),
            user: member.user
              ? {
                  id: String(member.user.id),
                  name: member.user.name ? String(member.user.name) : null,
                  email: member.user.email ? String(member.user.email) : null,
                  username: member.user.username ? String(member.user.username) : null,
                  role: member.user.role ? String(member.user.role) : null,
                }
              : null,
          }))
        : [],
      invites: Array.isArray(invites)
        ? invites.map((invite: any) => ({
            id: String(invite.id),
            email: String(invite.email || ""),
            role: mapTeamRole(invite.role),
            status: String(invite.status || "PENDING"),
            expiresAt: invite.expiresAt instanceof Date ? invite.expiresAt.toISOString() : invite.expiresAt,
            createdAt: invite.createdAt instanceof Date ? invite.createdAt.toISOString() : invite.createdAt,
            acceptedAt: invite.acceptedAt instanceof Date ? invite.acceptedAt.toISOString() : invite.acceptedAt,
            revokedAt: invite.revokedAt instanceof Date ? invite.revokedAt.toISOString() : invite.revokedAt,
            acceptUrl: invite.token
              ? baseUrl
                ? `${String(baseUrl).replace(/\/$/, "")}/team-invites/accept?token=${encodeURIComponent(String(invite.token))}`
                : `/team-invites/accept?token=${encodeURIComponent(String(invite.token))}`
              : null,
          }))
        : [],
    });
  } catch (error) {
    console.error("Error fetching developer workspace:", error);
    return NextResponse.json({ error: "Não conseguimos carregar este workspace agora." }, { status: 500 });
  }
}
