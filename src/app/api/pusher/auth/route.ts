import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAgencyWorkspaceForTeam } from "@/lib/agency-workspace";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channel = params.get("channel_name");

    if (!socketId || !channel) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    const session: any = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id || null;
    const role = session.role || session.user?.role || null;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = role === "ADMIN";

    if (channel.startsWith("private-realtor-")) {
      const channelRealtorId = channel.replace("private-realtor-", "");
      if (!isAdmin && channelRealtorId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (channel.startsWith("private-agency-")) {
      const channelTeamId = channel.replace("private-agency-", "");

      if (!isAdmin) {
        const workspace = await resolveAgencyWorkspaceForTeam({
          userId: String(userId),
          authRole: role ? String(role) : null,
          teamId: String(channelTeamId),
        });
        if (!workspace.allowed) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    } else if (channel.startsWith("private-team-chat-")) {
      const threadId = channel.replace("private-team-chat-", "");

      const thread: any = await (prisma as any).teamChatThread.findUnique({
        where: { id: String(threadId) },
        select: { id: true, ownerId: true, realtorId: true, teamId: true },
      });

      if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }

      let canAccessThread =
        isAdmin ||
        String(thread.ownerId) === String(userId) ||
        String(thread.realtorId) === String(userId);

      if (!canAccessThread && thread.teamId) {
        const workspace = await resolveAgencyWorkspaceForTeam({
          userId: String(userId),
          authRole: role ? String(role) : null,
          teamId: String(thread.teamId),
        });
        canAccessThread = workspace.allowed;
      }

      if (!canAccessThread) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (channel.startsWith("private-lead-") || channel.startsWith("presence-chat-")) {
      const leadId = channel.startsWith("private-lead-")
        ? channel.replace("private-lead-", "")
        : channel.replace("presence-chat-", "");

      const lead: any = await (prisma as any).lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          realtorId: true,
          userId: true,
          property: { select: { ownerId: true } },
          team: { select: { id: true, ownerId: true } },
        },
      });

      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      let canAccessLead =
        isAdmin ||
        (lead.realtorId && lead.realtorId === userId) ||
        (lead.userId && lead.userId === userId) ||
        (lead.property?.ownerId && lead.property.ownerId === userId) ||
        (lead.team?.ownerId && lead.team.ownerId === userId);

      if (!canAccessLead && lead.team?.id) {
        const workspace = await resolveAgencyWorkspaceForTeam({
          userId: String(userId),
          authRole: role ? String(role) : null,
          teamId: String(lead.team.id),
        });
        canAccessLead = workspace.allowed;
      }

      if (!canAccessLead) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Deny any other private/presence channels by default
      if (channel.startsWith("private-") || channel.startsWith("presence-")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const pusher = getPusherServer();

    const auth = channel.startsWith("presence-")
      ? pusher.authorizeChannel(socketId, channel, {
          user_id: userId,
          user_info: {
            name: session?.user?.name || null,
            role: role || null,
          },
        } as any)
      : pusher.authorizeChannel(socketId, channel);

    return NextResponse.json(auth);
  } catch (error) {
    console.error("Error authenticating pusher:", error);
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    );
  }
}
