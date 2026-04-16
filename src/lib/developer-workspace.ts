import { prisma } from "@/lib/prisma";

export type DeveloperWorkspaceRole = "OWNER" | "ASSISTANT" | "MEMBER";
export type DeveloperWorkspaceErrorReason = "NOT_AUTHENTICATED" | "FORBIDDEN" | "TEAM_NOT_FOUND" | "PROFILE_NOT_FOUND";

type DeveloperWorkspaceResolution = {
  allowed: boolean;
  reason?: DeveloperWorkspaceErrorReason;
  isAdmin: boolean;
  userId: string | null;
  authRole: string | null;
  workspaceRole: DeveloperWorkspaceRole | null;
  teamId: string | null;
  teamName: string | null;
  teamOwnerId: string | null;
  developerProfileUserId: string | null;
  canManageWorkspace: boolean;
  canTransferOwner: boolean;
};

function denied(input: {
  userId?: string | null;
  authRole?: string | null;
  isAdmin?: boolean;
  reason: DeveloperWorkspaceErrorReason;
  teamId?: string | null;
  teamName?: string | null;
  teamOwnerId?: string | null;
  developerProfileUserId?: string | null;
}): DeveloperWorkspaceResolution {
  return {
    allowed: false,
    reason: input.reason,
    isAdmin: Boolean(input.isAdmin),
    userId: input.userId ? String(input.userId) : null,
    authRole: input.authRole ? String(input.authRole) : null,
    workspaceRole: null,
    teamId: input.teamId ? String(input.teamId) : null,
    teamName: input.teamName ? String(input.teamName) : null,
    teamOwnerId: input.teamOwnerId ? String(input.teamOwnerId) : null,
    developerProfileUserId: input.developerProfileUserId ? String(input.developerProfileUserId) : null,
    canManageWorkspace: false,
    canTransferOwner: false,
  };
}

function allowed(input: {
  userId: string;
  authRole: string | null;
  workspaceRole: DeveloperWorkspaceRole;
  isAdmin?: boolean;
  teamId: string | null;
  teamName: string | null;
  teamOwnerId: string | null;
  developerProfileUserId: string | null;
}): DeveloperWorkspaceResolution {
  const isAdmin = Boolean(input.isAdmin);
  const canManageWorkspace = isAdmin || input.workspaceRole === "OWNER" || input.workspaceRole === "ASSISTANT";
  return {
    allowed: true,
    isAdmin,
    userId: String(input.userId),
    authRole: input.authRole ? String(input.authRole) : null,
    workspaceRole: input.workspaceRole,
    teamId: input.teamId ? String(input.teamId) : null,
    teamName: input.teamName ? String(input.teamName) : null,
    teamOwnerId: input.teamOwnerId ? String(input.teamOwnerId) : null,
    developerProfileUserId: input.developerProfileUserId ? String(input.developerProfileUserId) : null,
    canManageWorkspace,
    canTransferOwner: isAdmin || input.workspaceRole === "OWNER",
  };
}

export function getDeveloperWorkspaceErrorStatus(reason: DeveloperWorkspaceErrorReason | undefined) {
  if (reason === "NOT_AUTHENTICATED") return 401;
  if (reason === "TEAM_NOT_FOUND" || reason === "PROFILE_NOT_FOUND") return 404;
  return 403;
}

async function loadDeveloperProfileByTeamId(teamId: string) {
  return await (prisma as any).developerProfile.findFirst({
    where: { teamId: String(teamId) },
    select: {
      userId: true,
      legalName: true,
      brandName: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });
}

export async function resolveDeveloperWorkspaceForTeam(input: {
  userId: string | null | undefined;
  authRole: string | null | undefined;
  teamId: string | null | undefined;
}): Promise<DeveloperWorkspaceResolution> {
  const userId = input.userId ? String(input.userId) : null;
  const authRole = input.authRole ? String(input.authRole) : null;
  const teamId = input.teamId ? String(input.teamId) : null;

  if (!userId) {
    return denied({ userId, authRole, reason: "NOT_AUTHENTICATED", teamId });
  }

  if (!teamId) {
    return denied({ userId, authRole, reason: "TEAM_NOT_FOUND", teamId: null });
  }

  const team = await (prisma as any).team.findUnique({
    where: { id: String(teamId) },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  if (!team) {
    return denied({ userId, authRole, reason: "TEAM_NOT_FOUND", teamId });
  }

  const developerProfile = await loadDeveloperProfileByTeamId(String(team.id));
  if (!developerProfile?.userId) {
    return denied({
      userId,
      authRole,
      reason: "PROFILE_NOT_FOUND",
      teamId: String(team.id),
      teamName: team.name ? String(team.name) : null,
      teamOwnerId: team.ownerId ? String(team.ownerId) : null,
    });
  }

  const developerProfileUserId = String(developerProfile.userId);

  if (authRole === "ADMIN") {
    return allowed({
      userId,
      authRole,
      isAdmin: true,
      workspaceRole: "OWNER",
      teamId: String(team.id),
      teamName: team.name ? String(team.name) : null,
      teamOwnerId: team.ownerId ? String(team.ownerId) : null,
      developerProfileUserId,
    });
  }

  if (authRole === "DEVELOPER" && developerProfileUserId === String(userId)) {
    return allowed({
      userId,
      authRole,
      workspaceRole: "OWNER",
      teamId: String(team.id),
      teamName: team.name ? String(team.name) : null,
      teamOwnerId: team.ownerId ? String(team.ownerId) : null,
      developerProfileUserId,
    });
  }

  if (String(team.ownerId || "") === String(userId)) {
    return allowed({
      userId,
      authRole,
      workspaceRole: "OWNER",
      teamId: String(team.id),
      teamName: team.name ? String(team.name) : null,
      teamOwnerId: team.ownerId ? String(team.ownerId) : null,
      developerProfileUserId,
    });
  }

  const membership = await (prisma as any).teamMember.findFirst({
    where: { teamId: String(team.id), userId: String(userId) },
    select: { role: true },
  });

  if (membership?.role === "OWNER") {
    return allowed({
      userId,
      authRole,
      workspaceRole: "OWNER",
      teamId: String(team.id),
      teamName: team.name ? String(team.name) : null,
      teamOwnerId: team.ownerId ? String(team.ownerId) : null,
      developerProfileUserId,
    });
  }

  if (membership?.role === "ASSISTANT") {
    return allowed({
      userId,
      authRole,
      workspaceRole: "ASSISTANT",
      teamId: String(team.id),
      teamName: team.name ? String(team.name) : null,
      teamOwnerId: team.ownerId ? String(team.ownerId) : null,
      developerProfileUserId,
    });
  }

  if (membership?.role === "AGENT") {
    return allowed({
      userId,
      authRole,
      workspaceRole: "MEMBER",
      teamId: String(team.id),
      teamName: team.name ? String(team.name) : null,
      teamOwnerId: team.ownerId ? String(team.ownerId) : null,
      developerProfileUserId,
    });
  }

  return denied({
    userId,
    authRole,
    reason: "FORBIDDEN",
    teamId: String(team.id),
    teamName: team.name ? String(team.name) : null,
    teamOwnerId: team.ownerId ? String(team.ownerId) : null,
    developerProfileUserId,
  });
}

export async function resolveDeveloperWorkspaceForUser(input: {
  userId: string | null | undefined;
  authRole: string | null | undefined;
}): Promise<DeveloperWorkspaceResolution> {
  const userId = input.userId ? String(input.userId) : null;
  const authRole = input.authRole ? String(input.authRole) : null;

  if (!userId) {
    return denied({ userId, authRole, reason: "NOT_AUTHENTICATED" });
  }

  if (authRole === "DEVELOPER") {
    const profile = await (prisma as any).developerProfile.findUnique({
      where: { userId: String(userId) },
      select: {
        userId: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!profile) {
      return denied({ userId, authRole, reason: "PROFILE_NOT_FOUND" });
    }

    return allowed({
      userId,
      authRole,
      workspaceRole: "OWNER",
      teamId: profile.teamId ? String(profile.teamId) : null,
      teamName: profile.team?.name ? String(profile.team.name) : null,
      teamOwnerId: profile.team?.ownerId ? String(profile.team.ownerId) : null,
      developerProfileUserId: profile.userId ? String(profile.userId) : null,
    });
  }

  const ownerTeam = await (prisma as any).team.findFirst({
    where: { ownerId: String(userId), developerProfile: { isNot: null } },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  if (ownerTeam) {
    const profile = await loadDeveloperProfileByTeamId(String(ownerTeam.id));
    return allowed({
      userId,
      authRole,
      isAdmin: authRole === "ADMIN",
      workspaceRole: "OWNER",
      teamId: String(ownerTeam.id),
      teamName: ownerTeam.name ? String(ownerTeam.name) : null,
      teamOwnerId: ownerTeam.ownerId ? String(ownerTeam.ownerId) : null,
      developerProfileUserId: profile?.userId ? String(profile.userId) : String(ownerTeam.ownerId || "") || null,
    });
  }

  const membership = await (prisma as any).teamMember.findFirst({
    where: {
      userId: String(userId),
      role: { in: ["OWNER", "ASSISTANT", "AGENT"] },
      team: { developerProfile: { isNot: null } },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership?.team?.id) {
    return denied({ userId, authRole, reason: "FORBIDDEN", isAdmin: authRole === "ADMIN" });
  }

  const profile = await loadDeveloperProfileByTeamId(String(membership.team.id));

  return allowed({
    userId,
    authRole,
    isAdmin: authRole === "ADMIN",
    workspaceRole: membership.role === "OWNER" ? "OWNER" : membership.role === "ASSISTANT" ? "ASSISTANT" : "MEMBER",
    teamId: String(membership.team.id),
    teamName: membership.team.name ? String(membership.team.name) : null,
    teamOwnerId: membership.team.ownerId ? String(membership.team.ownerId) : null,
    developerProfileUserId: profile?.userId ? String(profile.userId) : String(membership.team.ownerId || "") || null,
  });
}
