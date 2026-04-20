import { NextRequest, NextResponse } from "next/server";
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
    return { userId: null as string | null, role: null as string | null };
  }

  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;

  return { userId, role };
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

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

    const { id } = await context.params;

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id: String(id) },
      select: {
        id: true,
        property: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!lead?.property?.teamId || String(lead.property.teamId) !== String(workspace.teamId)) {
      return NextResponse.json({ error: "Lead não encontrado neste workspace." }, { status: 404 });
    }

    const events = await (prisma as any).leadEvent.findMany({
      where: { leadId: String(id) },
      orderBy: { createdAt: "desc" },
    });

    const newestMs = (events?.[0]?.createdAt ? new Date(events[0].createdAt).getTime() : 0) || 0;
    const count = Array.isArray(events) ? events.length : 0;
    const etag = `W/"developer-lead-events:${String(id)}:${newestMs}:${count}"`;
    const ifNoneMatch = req.headers.get("if-none-match") || "";
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
    }

    const actorIds = Array.from(
      new Set(
        (events || [])
          .map((event: any) => (event?.actorId ? String(event.actorId) : ""))
          .filter(Boolean)
      )
    );

    const actorMap = new Map<string, { name: string | null; email: string | null }>();
    if (actorIds.length) {
      const users = await (prisma as any).user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      });
      for (const user of users || []) {
        actorMap.set(String(user.id), {
          name: user?.name ? String(user.name) : null,
          email: user?.email ? String(user.email) : null,
        });
      }
    }

    const enriched = (events || []).map((event: any) => {
      const actorId = event?.actorId ? String(event.actorId) : "";
      const actor = actorId ? actorMap.get(actorId) || null : null;
      const metadata = event?.metadata && typeof event.metadata === "object" ? event.metadata : null;
      return {
        ...event,
        metadata: {
          ...(metadata || {}),
          actorName: actor?.name || null,
          actorEmail: actor?.email || null,
        },
      };
    });

    const res = NextResponse.json({ events: enriched });
    res.headers.set("ETag", etag);
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    console.error("Error fetching developer lead events:", error);
    return NextResponse.json({ error: "Não conseguimos carregar o histórico deste lead." }, { status: 500 });
  }
}
