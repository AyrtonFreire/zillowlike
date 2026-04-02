import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgencyConfigs } from "@/lib/agency-profile";

export type AgencyClientSessionContext = {
  userId: string | null;
  role: string | null;
};

export type AgencyClientAssignee = {
  userId: string | null;
  strategy: "EXPLICIT" | "PRIMARY" | "BALANCED" | "UNASSIGNED";
  name: string | null;
};

export async function getAgencyClientSessionContext(): Promise<AgencyClientSessionContext> {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;

  return {
    userId: userId ? String(userId) : null,
    role: role ? String(role) : null,
  };
}

export async function resolveAgencyClientTeamId(input: {
  userId: string;
  role: string | null;
  teamIdParam: string | null;
}) {
  const { userId, role, teamIdParam } = input;

  let teamId: string | null = teamIdParam ? String(teamIdParam) : null;

  if (!teamId && role === "AGENCY") {
    const profile = await (prisma as any).agencyProfile.findUnique({
      where: { userId: String(userId) },
      select: { teamId: true },
    });
    teamId = profile?.teamId ? String(profile.teamId) : null;
  }

  if (!teamId && role === "ADMIN") {
    const membership = await (prisma as any).teamMember.findFirst({
      where: { userId: String(userId) },
      select: { teamId: true },
      orderBy: { createdAt: "asc" },
    });
    teamId = membership?.teamId ? String(membership.teamId) : null;
  }

  if (!teamId && role === "REALTOR") {
    const membership = await (prisma as any).teamMember.findFirst({
      where: { userId: String(userId) },
      select: { teamId: true },
      orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }],
    });
    teamId = membership?.teamId ? String(membership.teamId) : null;
  }

  return teamId;
}

export async function assertAgencyClientTeamAccess(input: {
  userId: string;
  role: string | null;
  teamId: string;
}) {
  const { userId, role, teamId } = input;

  const team = await (prisma as any).team.findUnique({
    where: { id: String(teamId) },
    include: {
      owner: { select: { id: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              role: true,
              name: true,
              email: true,
              username: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    return { team: null, error: { status: 404, body: { success: false, error: "Time não encontrado" } } };
  }

  if (role !== "ADMIN") {
    const isMember = (team.members as any[]).some((m) => String(m.userId) === String(userId));
    const isOwner = String(team.ownerId) === String(userId);
    if (!isMember && !isOwner) {
      return {
        team: null,
        error: { status: 403, body: { success: false, error: "Você não tem acesso a este time." } },
      };
    }
  }

  return { team, error: null as { status: number; body: any } | null };
}

export function buildAgencyClientUrl(clientId: string) {
  return `/agency/clients/${encodeURIComponent(String(clientId))}`;
}

export function getAgencyClientIntentLabel(intent: string | null | undefined) {
  const value = String(intent || "").trim().toUpperCase();
  if (value === "BUY") return "compra";
  if (value === "RENT") return "locação";
  if (value === "LIST") return "captação";
  return "atendimento";
}

export function getAgencyClientStageLabel(stage: string | null | undefined) {
  const value = String(stage || "").trim().toUpperCase();
  if (value === "NEW") return "Novo";
  if (value === "CONTACT") return "Contato";
  if (value === "QUALIFYING") return "Qualificação";
  if (value === "MATCHING") return "Matching";
  if (value === "VISIT") return "Visita";
  if (value === "NURTURE") return "Nutrição";
  if (value === "WON") return "Ganho";
  if (value === "LOST") return "Perdido";
  return "Novo";
}

export function getAgencyClientRoutingStrategyLabel(strategy: string | null | undefined) {
  const value = String(strategy || "").trim().toUpperCase();
  if (value === "EXPLICIT") return "Roteamento explícito por intenção";
  if (value === "PRIMARY") return "Responsável principal da agência";
  if (value === "BALANCED") return "Distribuição balanceada";
  if (value === "UNASSIGNED") return "Sem responsável definido";
  return "Definição manual";
}

export async function buildAgencyClientPlaybookSnapshot(input: {
  teamId: string;
  intent?: string | null;
  assigneeName?: string | null;
  strategy?: string | null;
}) {
  const { leadConfig } = await getAgencyConfigs(String(input.teamId));
  const intent = String(input.intent || "").trim().toUpperCase();

  const basePlaybook =
    intent === "BUY"
      ? String(leadConfig.playbookBuy || "").trim()
      : intent === "RENT"
        ? String(leadConfig.playbookRent || "").trim()
        : intent === "LIST"
          ? String(leadConfig.playbookList || "").trim()
          : "";

  const lines = [basePlaybook || `Conduzir atendimento de ${getAgencyClientIntentLabel(intent)} com próximo passo claro e registro no CRM.`];

  const assigneeName = String(input.assigneeName || "").trim();
  const strategyLabel = getAgencyClientRoutingStrategyLabel(input.strategy);

  lines.push(`Intenção operacional: ${getAgencyClientIntentLabel(intent)}.`);
  lines.push(`Estratégia de roteamento: ${strategyLabel}.`);

  if (assigneeName) {
    lines.push(`Responsável atual: ${assigneeName}.`);
  }

  lines.push("Próximos passos esperados: registrar primeiro contato, manter próxima ação atualizada e fechar loop de resposta do cliente.");

  return lines.filter(Boolean).join("\n\n");
}

export function getAgencyClientSlaSnapshot(client: any) {
  const now = Date.now();
  const firstContactDueAt = client?.createdAt ? new Date(client.createdAt).getTime() + 30 * 60 * 1000 : null;
  const nextActionAt = client?.nextActionAt ? new Date(client.nextActionAt).getTime() : null;
  const lastInboundAt = client?.lastInboundAt ? new Date(client.lastInboundAt).getTime() : null;
  const lastContactAt = client?.lastContactAt ? new Date(client.lastContactAt).getTime() : null;
  const pendingReply = !!(lastInboundAt && (!lastContactAt || lastInboundAt > lastContactAt));
  const missingFirstContact = !client?.firstContactAt && !!firstContactDueAt && firstContactDueAt <= now;
  const nextActionOverdue = !!(nextActionAt && nextActionAt <= now);
  const needsOwner = !client?.assignedUserId;

  let level: "NORMAL" | "ATTENTION" | "CRITICAL" = "NORMAL";
  if (needsOwner || missingFirstContact || pendingReply) level = "CRITICAL";
  else if (nextActionOverdue) level = "ATTENTION";

  return {
    level,
    pendingReply,
    missingFirstContact,
    nextActionOverdue,
    needsOwner,
    firstContactDueAt: firstContactDueAt ? new Date(firstContactDueAt).toISOString() : null,
  };
}

export async function listAgencyClientAssignableMembers(teamId: string) {
  const rows = await (prisma as any).teamMember.findMany({
    where: {
      teamId: String(teamId),
      role: { in: ["OWNER", "AGENT"] },
      user: { role: "REALTOR" },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }],
  });

  return Array.isArray(rows) ? rows : [];
}

export async function selectAgencyClientAssignee(input: {
  teamId: string;
  intent?: string | null;
}) : Promise<AgencyClientAssignee> {
  const { teamId } = input;
  const intent = String(input.intent || "").trim().toUpperCase();
  const { profileConfig, leadConfig } = await getAgencyConfigs(String(teamId));
  const candidates = await listAgencyClientAssignableMembers(String(teamId));

  const candidateMap = new Map<string, any>();
  for (const member of candidates) {
    if (!member?.userId) continue;
    candidateMap.set(String(member.userId), member);
  }

  const explicitTarget =
    intent === "BUY"
      ? leadConfig.routing?.buyRealtorId
      : intent === "RENT"
        ? leadConfig.routing?.rentRealtorId
        : intent === "LIST"
          ? leadConfig.routing?.listRealtorId
          : null;

  if (explicitTarget && candidateMap.has(String(explicitTarget))) {
    const member = candidateMap.get(String(explicitTarget));
    return {
      userId: String(explicitTarget),
      strategy: "EXPLICIT",
      name: member?.user?.name ? String(member.user.name) : null,
    };
  }

  if (profileConfig.primaryAgentUserId && candidateMap.has(String(profileConfig.primaryAgentUserId))) {
    const member = candidateMap.get(String(profileConfig.primaryAgentUserId));
    return {
      userId: String(profileConfig.primaryAgentUserId),
      strategy: "PRIMARY",
      name: member?.user?.name ? String(member.user.name) : null,
    };
  }

  if (candidates.length === 0) {
    return { userId: null, strategy: "UNASSIGNED", name: null };
  }

  const activeCounts = await (prisma as any).client.groupBy({
    by: ["assignedUserId"],
    where: {
      teamId: String(teamId),
      status: "ACTIVE",
      pipelineStage: { notIn: ["WON", "LOST"] },
      assignedUserId: { in: candidates.map((m: any) => String(m.userId)) },
    },
    _count: { _all: true },
  });

  const countMap = new Map<string, number>();
  for (const row of activeCounts || []) {
    if (!row?.assignedUserId) continue;
    countMap.set(String(row.assignedUserId), Number(row?._count?._all || 0));
  }

  const picked = [...candidates].sort((a: any, b: any) => {
    const countA = Number(countMap.get(String(a.userId)) || 0);
    const countB = Number(countMap.get(String(b.userId)) || 0);
    if (countA !== countB) return countA - countB;
    const posA = Number(a.queuePosition || 0);
    const posB = Number(b.queuePosition || 0);
    if (posA !== posB) return posA - posB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  })[0];

  return {
    userId: picked?.userId ? String(picked.userId) : null,
    strategy: picked?.userId ? "BALANCED" : "UNASSIGNED",
    name: picked?.user?.name ? String(picked.user.name) : null,
  };
}

export function serializeAgencyClient(client: any) {
  const sla = getAgencyClientSlaSnapshot(client);
  return {
    id: String(client.id),
    name: String(client.name || ""),
    email: client.email ? String(client.email) : null,
    phone: client.phone ? String(client.phone) : null,
    status: String(client.status || "ACTIVE"),
    source: String(client.source || "MANUAL"),
    intent: client.intent ? String(client.intent) : null,
    pipelineStage: String(client.pipelineStage || "NEW"),
    notes: client.notes ? String(client.notes) : null,
    assignedAt: client.assignedAt ? new Date(client.assignedAt).toISOString() : null,
    firstContactAt: client.firstContactAt ? new Date(client.firstContactAt).toISOString() : null,
    lastContactAt: client.lastContactAt ? new Date(client.lastContactAt).toISOString() : null,
    lastInboundAt: client.lastInboundAt ? new Date(client.lastInboundAt).toISOString() : null,
    lastInboundChannel: client.lastInboundChannel ? String(client.lastInboundChannel) : null,
    nextActionAt: client.nextActionAt ? new Date(client.nextActionAt).toISOString() : null,
    nextActionNote: client.nextActionNote ? String(client.nextActionNote) : null,
    consentAcceptedAt: client.consentAcceptedAt ? new Date(client.consentAcceptedAt).toISOString() : null,
    consentText: client.consentText ? String(client.consentText) : null,
    sourceSlug: client.sourceSlug ? String(client.sourceSlug) : null,
    playbookSnapshot: client.playbookSnapshot ? String(client.playbookSnapshot) : null,
    createdAt: client.createdAt ? new Date(client.createdAt).toISOString() : null,
    updatedAt: client.updatedAt ? new Date(client.updatedAt).toISOString() : null,
    assignedTo: client.assignedTo
      ? {
          id: String(client.assignedTo.id),
          name: client.assignedTo.name ? String(client.assignedTo.name) : null,
          email: client.assignedTo.email ? String(client.assignedTo.email) : null,
        }
      : null,
    preference: client.preference
      ? {
          city: String(client.preference.city || ""),
          state: String(client.preference.state || ""),
          neighborhoods: Array.isArray(client.preference.neighborhoods)
            ? client.preference.neighborhoods.map((item: unknown) => String(item))
            : [],
          purpose: client.preference.purpose ? String(client.preference.purpose) : null,
          types: Array.isArray(client.preference.types)
            ? client.preference.types.map((item: unknown) => String(item))
            : [],
          minPrice:
            typeof client.preference.minPrice === "number"
              ? Number(client.preference.minPrice)
              : client.preference.minPrice != null
                ? Number(client.preference.minPrice)
                : null,
          maxPrice:
            typeof client.preference.maxPrice === "number"
              ? Number(client.preference.maxPrice)
              : client.preference.maxPrice != null
                ? Number(client.preference.maxPrice)
                : null,
          bedroomsMin:
            typeof client.preference.bedroomsMin === "number"
              ? Number(client.preference.bedroomsMin)
              : client.preference.bedroomsMin != null
                ? Number(client.preference.bedroomsMin)
                : null,
          bathroomsMin:
            typeof client.preference.bathroomsMin === "number"
              ? Number(client.preference.bathroomsMin)
              : client.preference.bathroomsMin != null
                ? Number(client.preference.bathroomsMin)
                : null,
          areaMin:
            typeof client.preference.areaMin === "number"
              ? Number(client.preference.areaMin)
              : client.preference.areaMin != null
                ? Number(client.preference.areaMin)
                : null,
          flags: client.preference.flags ?? null,
          scope: String(client.preference.scope || "PORTFOLIO"),
          createdAt: client.preference.createdAt ? new Date(client.preference.createdAt).toISOString() : null,
          updatedAt: client.preference.updatedAt ? new Date(client.preference.updatedAt).toISOString() : null,
        }
      : null,
    sla,
  };
}
