import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const QuerySchema = z.object({
  teamId: z.string().trim().optional(),
});

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) return { userId: null as string | null, role: null as string | null };
  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;
  return { userId: userId ? String(userId) : null, role: role ? String(role) : null };
}

async function resolveTeamId(input: { userId: string; role: string | null; teamIdParam: string | null }) {
  const { userId, role, teamIdParam } = input;

  let teamId: string | null = teamIdParam ? String(teamIdParam) : null;

  if (!teamId && role === "AGENCY") {
    const profile = await (prisma as any).agencyProfile.findUnique({
      where: { userId: String(userId) },
      select: { teamId: true },
    });
    teamId = profile?.teamId ? String(profile.teamId) : null;
  }

  if (!teamId && (role === "REALTOR" || role === "ADMIN")) {
    const membership = await (prisma as any).teamMember.findFirst({
      where: { userId: String(userId) },
      select: { teamId: true },
      orderBy: { createdAt: "asc" },
    });
    teamId = membership?.teamId ? String(membership.teamId) : null;
  }

  return teamId;
}

async function assertTeamAccess(input: { userId: string; role: string | null; teamId: string }) {
  const { userId, role, teamId } = input;

  const team = await (prisma as any).team.findUnique({
    where: { id: String(teamId) },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true } },
        },
      },
    },
  });

  if (!team) {
    return { team: null, error: NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 }) };
  }

  if (role !== "ADMIN") {
    if (role === "AGENCY") {
      if (String(team.ownerId) !== String(userId)) {
        return {
          team: null,
          error: NextResponse.json({ success: false, error: "Você não tem acesso a este time." }, { status: 403 }),
        };
      }
    } else if (role === "REALTOR") {
      const isMember = (team.members as any[]).some((m) => String(m.userId) === String(userId));
      if (!isMember) {
        return {
          team: null,
          error: NextResponse.json({ success: false, error: "Você não tem acesso a este time." }, { status: 403 }),
        };
      }
    } else {
      return {
        team: null,
        error: NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 }),
      };
    }
  }

  return { team, error: null as NextResponse | null };
}

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({ teamId: url.searchParams.get("teamId") || undefined });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos" }, { status: 400 });
    }

    const teamId = await resolveTeamId({
      userId,
      role,
      teamIdParam: parsed.data.teamId ? String(parsed.data.teamId) : null,
    });

    if (!teamId) {
      return NextResponse.json({ success: true, team: null, threads: [] });
    }

    const { team, error } = await assertTeamAccess({ userId, role, teamId });
    if (error) return error;

    const isRealtor = role === "REALTOR";
    const teamMembers = (team.members as any[]).filter((m) => m?.user?.role === "REALTOR");

    if (isRealtor) {
      const existing: any = await (prisma as any).teamChatThread.findUnique({
        where: { teamId_realtorId: { teamId: String(team.id), realtorId: String(userId) } },
        select: { id: true, ownerId: true },
      });

      if (!existing) {
        await (prisma as any).teamChatThread.create({
          data: {
            teamId: String(team.id),
            ownerId: String(team.ownerId),
            realtorId: String(userId),
          },
        });
      } else if (String(existing.ownerId) !== String(team.ownerId)) {
        await (prisma as any).teamChatThread.update({
          where: { id: String(existing.id) },
          data: { ownerId: String(team.ownerId) },
        });
      }
    } else {
      const realtorIds = teamMembers.map((member) => String(member.userId));

      if (realtorIds.length) {
        const existingThreads: any[] = await (prisma as any).teamChatThread.findMany({
          where: { teamId: String(team.id), realtorId: { in: realtorIds } },
          select: { id: true, realtorId: true, ownerId: true },
        });

        const existingByRealtor = new Map<string, any>();
        for (const thread of existingThreads) {
          existingByRealtor.set(String(thread.realtorId), thread);
        }

        const missing = realtorIds.filter((rid) => !existingByRealtor.has(String(rid)));
        if (missing.length) {
          await (prisma as any).teamChatThread.createMany({
            data: missing.map((rid) => ({
              teamId: String(team.id),
              ownerId: String(team.ownerId),
              realtorId: String(rid),
            })),
            skipDuplicates: true,
          });
        }

        const needsOwnerUpdate = existingThreads.filter((t) => String(t.ownerId) !== String(team.ownerId));
        if (needsOwnerUpdate.length) {
          await Promise.all(
            needsOwnerUpdate.map((t) =>
              (prisma as any).teamChatThread.update({
                where: { id: String(t.id) },
                data: { ownerId: String(team.ownerId) },
              })
            )
          );
        }
      }
    }

    const rawThreads = await (prisma as any).teamChatThread.findMany({
      where: {
        teamId: String(team.id),
        ...(isRealtor ? { realtorId: String(userId) } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        realtor: { select: { id: true, name: true, email: true, image: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const threadIds = rawThreads.map((thread: any) => String(thread.id));
    const receipts = threadIds.length
      ? await (prisma as any).teamChatReadReceipt.findMany({
          where: { userId: String(userId), threadId: { in: threadIds } },
        })
      : [];

    const receiptMap = new Map<string, Date>();
    for (const receipt of receipts || []) {
      if (receipt?.lastReadAt) {
        receiptMap.set(String(receipt.threadId), receipt.lastReadAt as Date);
      }
    }

    const threads = await Promise.all(
      rawThreads.map(async (thread: any) => {
        const lastMessage = thread.messages?.[0]
          ? {
              id: String(thread.messages[0].id),
              content: String(thread.messages[0].content || ""),
              createdAt: thread.messages[0].createdAt ? new Date(thread.messages[0].createdAt).toISOString() : null,
              senderId: String(thread.messages[0].senderId),
              senderRole: String(thread.messages[0].senderRole || ""),
              sender: thread.messages[0].sender
                ? {
                    id: String(thread.messages[0].sender.id),
                    name: thread.messages[0].sender.name || null,
                    role: thread.messages[0].sender.role || null,
                  }
                : null,
            }
          : null;

        const lastReadAt = receiptMap.get(String(thread.id)) || null;
        const unreadWhere: any = {
          threadId: String(thread.id),
          senderId: { not: String(userId) },
        };
        if (lastReadAt) {
          unreadWhere.createdAt = { gt: lastReadAt };
        }

        const unreadCount = await (prisma as any).teamChatMessage.count({ where: unreadWhere });

        return {
          id: String(thread.id),
          teamId: String(thread.teamId),
          owner: thread.owner
            ? {
                id: String(thread.owner.id),
                name: thread.owner.name || null,
                email: thread.owner.email || null,
                image: thread.owner.image || null,
              }
            : null,
          realtor: thread.realtor
            ? {
                id: String(thread.realtor.id),
                name: thread.realtor.name || null,
                email: thread.realtor.email || null,
                image: thread.realtor.image || null,
              }
            : null,
          lastMessage,
          lastMessageAt: lastMessage?.createdAt || null,
          unreadCount: Number(unreadCount || 0),
          updatedAt: thread.updatedAt ? new Date(thread.updatedAt).toISOString() : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      team: { id: String(team.id), name: String(team.name || "Time"), ownerId: String(team.ownerId) },
      threads,
    });
  } catch (error) {
    console.error("Error loading team chat threads:", error);
    return NextResponse.json({ success: false, error: "Não foi possível carregar o chat do time." }, { status: 500 });
  }
}
