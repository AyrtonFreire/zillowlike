import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientMatchService } from "@/lib/client-match-service";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) return { userId: null as string | null, role: null as string | null };
  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;
  return { userId: userId ? String(userId) : null, role: role ? String(role) : null };
}

function getBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  return String(base || "").replace(/\/$/, "");
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

  if (!teamId && role === "ADMIN") {
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
      owner: { select: { id: true } },
      members: true,
    },
  });

  if (!team) {
    return { team: null, error: NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 }) };
  }

  if (role !== "ADMIN") {
    const isMember = (team.members as any[]).some((m) => String(m.userId) === String(userId));
    const isOwner = String(team.ownerId) === String(userId);
    if (!isMember && !isOwner) {
      return {
        team: null,
        error: NextResponse.json({ success: false, error: "Você não tem acesso a este time." }, { status: 403 }),
      };
    }
  }

  return { team, error: null as NextResponse | null };
}

const CreateSchema = z.object({
  propertyIds: z.array(z.string().trim().min(1)).max(50).optional(),
  title: z.string().trim().min(1).max(160).nullable().optional(),
  message: z.string().trim().min(1).max(2000).nullable().optional(),
  expiresInDays: z.number().int().positive().max(60).nullable().optional(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const { id: clientIdRaw } = await context.params;
    const clientId = String(clientIdRaw);

    const url = new URL(req.url);
    const teamId = await resolveTeamId({ userId, role, teamIdParam: url.searchParams.get("teamId") });

    if (!teamId) {
      return NextResponse.json({ success: true, team: null, lists: [] });
    }

    const { team, error } = await assertTeamAccess({ userId, role, teamId });
    if (error) return error;

    const client = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const rows = await (prisma as any).clientRecommendationList.findMany({
      where: { teamId: String(teamId), clientId: String(clientId) },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        token: true,
        title: true,
        message: true,
        propertyIds: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const baseUrl = getBaseUrl();

    const lists = (rows as any[]).map((r) => {
      const token = String(r.token);
      const shareUrl = baseUrl ? `${baseUrl}/explore-client/${token}` : `/explore-client/${token}`;
      const propertyIds = Array.isArray(r.propertyIds) ? r.propertyIds : [];
      return {
        id: String(r.id),
        token,
        shareUrl,
        title: r.title ? String(r.title) : null,
        message: r.message ? String(r.message) : null,
        propertyCount: propertyIds.length,
        expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      };
    });

    return NextResponse.json({
      success: true,
      team: { id: String((team as any).id), name: String((team as any).name || "Time") },
      lists,
    });
  } catch (error) {
    console.error("Error listing client recommendation lists:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos carregar as listas agora." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const { id: clientIdRaw } = await context.params;
    const clientId = String(clientIdRaw);

    const url = new URL(req.url);
    const teamId = await resolveTeamId({ userId, role, teamIdParam: url.searchParams.get("teamId") });

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 });
    }

    const { team, error } = await assertTeamAccess({ userId, role, teamId });
    if (error) return error;

    const client = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    let propertyIds = Array.isArray(parsed.data.propertyIds)
      ? parsed.data.propertyIds.filter((v) => typeof v === "string" && v.trim().length > 0)
      : [];

    if (propertyIds.length === 0) {
      const matchResult = await ClientMatchService.getOrRefreshMatches({
        clientId,
        teamId: String(teamId),
        limit: 20,
        forceRefresh: false,
      });
      propertyIds = matchResult.items.map((it) => it.property.id);
    }

    const ordered: string[] = [];
    for (const pid of propertyIds) {
      const id = String(pid);
      if (id && !ordered.includes(id)) ordered.push(id);
    }

    if (ordered.length === 0) {
      return NextResponse.json({ success: false, error: "Não há imóveis para recomendar ainda." }, { status: 400 });
    }

    if (ordered.length > 50) {
      return NextResponse.json({ success: false, error: "A lista não pode ter mais do que 50 imóveis." }, { status: 400 });
    }

    const properties = await prisma.property.findMany({
      where: {
        id: { in: ordered },
        status: "ACTIVE" as any,
      },
      select: { id: true },
    });

    if (properties.length !== ordered.length) {
      return NextResponse.json(
        { success: false, error: "Alguns imóveis informados não existem mais ou não estão ativos." },
        { status: 400 }
      );
    }

    const rawDays = typeof parsed.data.expiresInDays === "number" ? parsed.data.expiresInDays : 14;
    const expiresInDays = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(Math.round(rawDays), 60) : 14;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const token = randomBytes(32).toString("hex");

    const title = parsed.data.title && parsed.data.title.trim().length > 0 ? parsed.data.title.trim().slice(0, 160) : null;
    const message = parsed.data.message && parsed.data.message.trim().length > 0 ? parsed.data.message.trim().slice(0, 2000) : null;

    const list = await (prisma as any).clientRecommendationList.create({
      data: {
        clientId: String(clientId),
        teamId: String(teamId),
        createdByUserId: String(userId),
        token,
        title,
        message,
        propertyIds: ordered,
        filters: null,
        expiresAt,
      },
      select: {
        token: true,
        expiresAt: true,
      },
    });

    const baseUrl = getBaseUrl();
    const shareUrl = baseUrl ? `${baseUrl}/explore-client/${list.token}` : `/explore-client/${list.token}`;

    return NextResponse.json({
      success: true,
      team: { id: String((team as any).id), name: String((team as any).name || "Time") },
      shareUrl,
      token: list.token,
      expiresAt: list.expiresAt,
      propertyCount: ordered.length,
    });
  } catch (error) {
    console.error("Error creating client recommendation list:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos gerar o link agora." }, { status: 500 });
  }
}
