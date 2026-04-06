import { prisma } from "@/lib/prisma";

export type AgencyWorkspaceRole = "OWNER" | "ASSISTANT" | "CORRETOR";
export type AssistantScopeContext = "AGENCY" | "REALTOR";
export type AgencyWorkspaceErrorReason = "NOT_AUTHENTICATED" | "FORBIDDEN" | "TEAM_NOT_FOUND" | "PROFILE_NOT_FOUND";

type AgencyWorkspaceResolution = {
  allowed: boolean;
  reason?: AgencyWorkspaceErrorReason;
  isAdmin: boolean;
  userId: string | null;
  authRole: string | null;
  workspaceRole: AgencyWorkspaceRole | null;
  teamId: string | null;
  teamName: string | null;
  teamOwnerId: string | null;
  agencyProfileUserId: string | null;
  canManageWorkspace: boolean;
  canTransferOwner: boolean;
};

type AssistantScopeResolution = {
  allowed: boolean;
  reason?: AgencyWorkspaceErrorReason;
  context: AssistantScopeContext;
  ownerId: string | null;
  teamId: string | null;
  authRole: string | null;
  userId: string | null;
  workspaceRole: AgencyWorkspaceRole | null;
};

function denied(input: {
  userId?: string | null;
  authRole?: string | null;
  isAdmin?: boolean;
  reason: AgencyWorkspaceErrorReason;
  teamId?: string | null;
  teamName?: string | null;
  teamOwnerId?: string | null;
  agencyProfileUserId?: string | null;
}): AgencyWorkspaceResolution {
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
    agencyProfileUserId: input.agencyProfileUserId ? String(input.agencyProfileUserId) : null,
    canManageWorkspace: false,
    canTransferOwner: false,
  };
}

function allowed(input: {
  userId: string;
  authRole: string | null;
  isAdmin?: boolean;
  workspaceRole: Exclude<AgencyWorkspaceRole, "CORRETOR">;
  teamId: string | null;
  teamName: string | null;
  teamOwnerId: string | null;
  agencyProfileUserId: string | null;
}): AgencyWorkspaceResolution {
  const isAdmin = Boolean(input.isAdmin);
  return {
    allowed: true,
    isAdmin,
    userId: String(input.userId),
    authRole: input.authRole ? String(input.authRole) : null,
    workspaceRole: input.workspaceRole,
    teamId: input.teamId ? String(input.teamId) : null,
    teamName: input.teamName ? String(input.teamName) : null,
    teamOwnerId: input.teamOwnerId ? String(input.teamOwnerId) : null,
    agencyProfileUserId: input.agencyProfileUserId ? String(input.agencyProfileUserId) : null,
    canManageWorkspace: true,
    canTransferOwner: isAdmin || input.workspaceRole === "OWNER",
  };
}

export function getAgencyWorkspaceErrorStatus(reason: AgencyWorkspaceErrorReason | undefined) {
  if (reason === "NOT_AUTHENTICATED") return 401;
  if (reason === "TEAM_NOT_FOUND" || reason === "PROFILE_NOT_FOUND") return 404;
  return 403;
}

async function loadAgencyProfileByTeamId(teamId: string) {
  return await (prisma as any).agencyProfile.findFirst({
    where: { teamId: String(teamId) },
    select: {
      userId: true,
      name: true,
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

export async function resolveAgencyWorkspaceForTeam(input: {
  userId: string | null | undefined;
  authRole: string | null | undefined;
  teamId: string | null | undefined;
}): Promise<AgencyWorkspaceResolution> {
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

  const agencyProfile = await loadAgencyProfileByTeamId(String(team.id));
  const agencyProfileUserId = agencyProfile?.userId ? String(agencyProfile.userId) : String(team.ownerId || "");

  if (authRole === "ADMIN") {
    return allowed({
      userId,
      authRole,
      isAdmin: true,
      workspaceRole: "OWNER",
      teamId: String(team.id),
      teamName: team.name ? String(team.name) : null,
      teamOwnerId: team.ownerId ? String(team.ownerId) : null,
      agencyProfileUserId: agencyProfileUserId || null,
    });
  }

  if (authRole === "AGENCY") {
    if (agencyProfile?.userId && String(agencyProfile.userId) === String(userId)) {
      return allowed({
        userId,
        authRole,
        workspaceRole: "OWNER",
        teamId: String(team.id),
        teamName: team.name ? String(team.name) : null,
        teamOwnerId: team.ownerId ? String(team.ownerId) : null,
        agencyProfileUserId: agencyProfileUserId || null,
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
        agencyProfileUserId: agencyProfileUserId || null,
      });
    }
  }

  if (String(team.ownerId || "") === String(userId)) {
    return allowed({
      userId,
      authRole,
      workspaceRole: "OWNER",
      teamId: String(team.id),
      teamName: team.name ? String(team.name) : null,
      teamOwnerId: team.ownerId ? String(team.ownerId) : null,
      agencyProfileUserId: agencyProfileUserId || null,
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
      agencyProfileUserId: agencyProfileUserId || null,
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
      agencyProfileUserId: agencyProfileUserId || null,
    });
  }

  return denied({
    userId,
    authRole,
    reason: agencyProfile ? "FORBIDDEN" : "PROFILE_NOT_FOUND",
    teamId: String(team.id),
    teamName: team.name ? String(team.name) : null,
    teamOwnerId: team.ownerId ? String(team.ownerId) : null,
    agencyProfileUserId: agencyProfileUserId || null,
  });
}

export async function resolveAgencyWorkspaceForUser(input: {
  userId: string | null | undefined;
  authRole: string | null | undefined;
}): Promise<AgencyWorkspaceResolution> {
  const userId = input.userId ? String(input.userId) : null;
  const authRole = input.authRole ? String(input.authRole) : null;

  if (!userId) {
    return denied({ userId, authRole, reason: "NOT_AUTHENTICATED" });
  }

  if (authRole === "AGENCY") {
    const profile = await (prisma as any).agencyProfile.findUnique({
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
      agencyProfileUserId: profile.userId ? String(profile.userId) : null,
    });
  }

  const ownerTeam = await (prisma as any).team.findFirst({
    where: { ownerId: String(userId) },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  if (ownerTeam) {
    const profile = await loadAgencyProfileByTeamId(String(ownerTeam.id));
    return allowed({
      userId,
      authRole,
      isAdmin: authRole === "ADMIN",
      workspaceRole: "OWNER",
      teamId: String(ownerTeam.id),
      teamName: ownerTeam.name ? String(ownerTeam.name) : null,
      teamOwnerId: ownerTeam.ownerId ? String(ownerTeam.ownerId) : null,
      agencyProfileUserId: profile?.userId ? String(profile.userId) : String(ownerTeam.ownerId || "") || null,
    });
  }

  const membership = await (prisma as any).teamMember.findFirst({
    where: {
      userId: String(userId),
      role: { in: ["OWNER", "ASSISTANT"] },
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
    return denied({ userId, authRole, reason: "FORBIDDEN" });
  }

  const profile = await loadAgencyProfileByTeamId(String(membership.team.id));

  return allowed({
    userId,
    authRole,
    isAdmin: authRole === "ADMIN",
    workspaceRole: membership.role === "ASSISTANT" ? "ASSISTANT" : "OWNER",
    teamId: String(membership.team.id),
    teamName: membership.team.name ? String(membership.team.name) : null,
    teamOwnerId: membership.team.ownerId ? String(membership.team.ownerId) : null,
    agencyProfileUserId: profile?.userId ? String(profile.userId) : String(membership.team.ownerId || "") || null,
  });
}

export async function resolveAssistantScope(input: {
  userId: string | null | undefined;
  authRole: string | null | undefined;
  requestedContext?: string | null | undefined;
  requestedTeamId?: string | null | undefined;
}): Promise<AssistantScopeResolution> {
  const userId = input.userId ? String(input.userId) : null;
  const authRole = input.authRole ? String(input.authRole) : null;
  const requestedContext = String(input.requestedContext || "").trim().toUpperCase();
  const requestedTeamId = input.requestedTeamId ? String(input.requestedTeamId) : null;

  if (!userId) {
    return {
      allowed: false,
      reason: "NOT_AUTHENTICATED",
      context: "REALTOR",
      ownerId: null,
      teamId: null,
      authRole,
      userId,
      workspaceRole: null,
    };
  }

  if (authRole !== "ADMIN" && authRole !== "REALTOR" && authRole !== "AGENCY") {
    return {
      allowed: false,
      reason: "FORBIDDEN",
      context: "REALTOR",
      ownerId: null,
      teamId: null,
      authRole,
      userId,
      workspaceRole: null,
    };
  }

  const context: AssistantScopeContext = requestedContext === "AGENCY" || (requestedContext !== "REALTOR" && authRole === "AGENCY")
    ? "AGENCY"
    : "REALTOR";

  if (context === "REALTOR") {
    if (authRole === "AGENCY") {
      return {
        allowed: false,
        reason: "FORBIDDEN",
        context,
        ownerId: null,
        teamId: null,
        authRole,
        userId,
        workspaceRole: null,
      };
    }

    return {
      allowed: true,
      context,
      ownerId: userId,
      teamId: null,
      authRole,
      userId,
      workspaceRole: null,
    };
  }

  const workspace = requestedTeamId
    ? await resolveAgencyWorkspaceForTeam({ userId, authRole, teamId: requestedTeamId })
    : await resolveAgencyWorkspaceForUser({ userId, authRole });

  if (!workspace.allowed || !workspace.agencyProfileUserId || !workspace.teamId) {
    return {
      allowed: false,
      reason: workspace.reason || "FORBIDDEN",
      context,
      ownerId: null,
      teamId: workspace.teamId || null,
      authRole,
      userId,
      workspaceRole: workspace.workspaceRole,
    };
  }

  return {
    allowed: true,
    context,
    ownerId: String(workspace.agencyProfileUserId),
    teamId: String(workspace.teamId),
    authRole,
    userId,
    workspaceRole: workspace.workspaceRole,
  };
}
