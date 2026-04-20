import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";

const PIPELINE_STAGE_FLOW = ["NEW", "CONTACT", "VISIT", "PROPOSAL", "DOCUMENTS", "WON", "LOST"] as const;
type PipelineStage = (typeof PIPELINE_STAGE_FLOW)[number];

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

function getCanonicalStage(stage?: string | null): PipelineStage {
  const normalized = String(stage || "NEW").toUpperCase();
  if (PIPELINE_STAGE_FLOW.includes(normalized as PipelineStage)) {
    return normalized as PipelineStage;
  }
  return "NEW";
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

    const [profile, team, projects, leads] = await Promise.all([
      (prisma as any).developerProfile.findUnique({
        where: { userId: String(workspace.developerProfileUserId) },
        select: {
          id: true,
          legalName: true,
          brandName: true,
          businessType: true,
        },
      }),
      (prisma as any).team.findUnique({
        where: { id: String(workspace.teamId) },
        select: {
          id: true,
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
      (prisma as any).developmentProject.findMany({
        where: { teamId: String(workspace.teamId) },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          city: true,
          state: true,
          units: {
            select: { status: true },
          },
          _count: {
            select: { leads: true },
          },
        },
      }),
      (prisma as any).lead.findMany({
        where: {
          property: {
            teamId: String(workspace.teamId),
          },
          developmentProjectId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          publicCode: true,
          status: true,
          pipelineStage: true,
          createdAt: true,
          developmentProject: {
            select: { id: true, name: true },
          },
          developmentUnit: {
            select: { id: true, reference: true, title: true },
          },
          property: {
            select: {
              id: true,
              title: true,
              price: true,
              city: true,
              state: true,
            },
          },
          contact: {
            select: {
              name: true,
              email: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { createdAt: true, senderId: true },
          },
          chatReadReceipts: {
            where: { userId: String(userId) },
            select: { lastReadAt: true },
          },
        },
      }),
    ]);

    if (!profile || !team) {
      return NextResponse.json({ error: "Perfil da incorporadora não encontrado" }, { status: 404 });
    }

    const stageSummary = PIPELINE_STAGE_FLOW.map((stage) => ({ stage, count: 0 }));
    let unreadCount = 0;
    let firstContactCount = 0;
    let negotiationCount = 0;
    let closedCount = 0;

    const serializedLeads = (Array.isArray(leads) ? leads : []).map((lead: any) => {
      const latestMessage = Array.isArray(lead.messages) ? lead.messages[0] : null;
      const latestMessageAt = latestMessage?.createdAt ? new Date(latestMessage.createdAt) : null;
      const lastReadAt = Array.isArray(lead.chatReadReceipts) ? lead.chatReadReceipts[0]?.lastReadAt : null;
      const readAt = lastReadAt ? new Date(lastReadAt) : null;
      const hasUnread =
        !!latestMessageAt &&
        (!readAt || latestMessageAt.getTime() > readAt.getTime()) &&
        String(latestMessage?.senderId || "") !== String(userId);

      const stage = getCanonicalStage(lead.pipelineStage);
      const stageIndex = PIPELINE_STAGE_FLOW.indexOf(stage);
      if (stageIndex >= 0) {
        stageSummary[stageIndex].count += 1;
      }

      if (hasUnread) unreadCount += 1;
      if (stage === "NEW" || stage === "CONTACT") firstContactCount += 1;
      if (stage === "VISIT" || stage === "PROPOSAL" || stage === "DOCUMENTS") negotiationCount += 1;
      if (stage === "WON" || stage === "LOST") closedCount += 1;

      return {
        id: String(lead.id),
        publicCode: lead.publicCode ? String(lead.publicCode) : null,
        pipelineStage: stage,
        status: String(lead.status || ""),
        createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
        hasUnreadMessages: hasUnread,
        developmentProject: lead.developmentProject
          ? {
              id: String(lead.developmentProject.id),
              name: String(lead.developmentProject.name || ""),
            }
          : null,
        developmentUnit: lead.developmentUnit
          ? {
              id: String(lead.developmentUnit.id),
              reference: String(lead.developmentUnit.reference || ""),
              title: lead.developmentUnit.title ? String(lead.developmentUnit.title) : null,
            }
          : null,
        property: lead.property
          ? {
              id: String(lead.property.id),
              title: String(lead.property.title || ""),
              price: typeof lead.property.price === "number" ? lead.property.price : Number(lead.property.price || 0),
              city: String(lead.property.city || ""),
              state: String(lead.property.state || ""),
            }
          : null,
        contact: lead.contact
          ? {
              name: lead.contact.name ? String(lead.contact.name) : null,
              email: lead.contact.email ? String(lead.contact.email) : null,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: String(profile.id),
        displayName: String(profile.brandName || profile.legalName || "Incorporadora"),
        legalName: String(profile.legalName || ""),
        businessType: profile.businessType ? String(profile.businessType) : null,
      },
      workspace: {
        teamId: String(workspace.teamId),
        teamName: workspace.teamName ? String(workspace.teamName) : null,
        viewerWorkspaceRole: workspace.workspaceRole,
        canManageWorkspace: Boolean(workspace.canManageWorkspace),
        canTransferOwner: Boolean(workspace.canTransferOwner),
        membersCount: Number(team._count?.members || 0),
        invitesCount: Number(team._count?.invites || 0),
        developmentProjectsCount: Number(team._count?.developmentProjects || 0),
        leadsCount: Number(team._count?.leads || 0),
      },
      metrics: {
        totalLeads: serializedLeads.length,
        unreadLeads: unreadCount,
        firstContactLeads: firstContactCount,
        negotiationLeads: negotiationCount,
        closedLeads: closedCount,
        projectsCount: Number(team._count?.developmentProjects || 0),
      },
      stageSummary,
      topProjects: Array.isArray(projects)
        ? projects.map((project: any) => ({
            id: String(project.id),
            name: String(project.name || ""),
            status: String(project.status || "DRAFT"),
            city: project.city ? String(project.city) : null,
            state: project.state ? String(project.state) : null,
            unitsCount: Array.isArray(project.units) ? project.units.length : 0,
            leadsCount: Number(project._count?.leads || 0),
            availableUnits: Array.isArray(project.units)
              ? project.units.filter((unit: any) => String(unit.status || "").toUpperCase() === "AVAILABLE").length
              : 0,
          }))
        : [],
      recentLeads: serializedLeads.slice(0, 5),
    });
  } catch (error) {
    console.error("Error fetching developer dashboard:", error);
    return NextResponse.json({ error: "Não conseguimos carregar o painel executivo agora." }, { status: 500 });
  }
}
