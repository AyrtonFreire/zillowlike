import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const { id } = ctx.params;
    const clientId = String(id);

    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const refreshRaw = url.searchParams.get("refresh");
    const teamIdParam = url.searchParams.get("teamId");

    const limit = Math.max(1, Math.min(100, Number.parseInt(String(limitRaw || "24"), 10) || 24));
    const forceRefresh = refreshRaw === "1" || refreshRaw === "true";

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

    if (!teamId) {
      return NextResponse.json({ success: true, team: null, client: null, scope: null, refreshed: false, matches: [] });
    }

    const team = await (prisma as any).team.findUnique({
      where: { id: String(teamId) },
      include: {
        owner: { select: { id: true } },
        members: true,
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 });
    }

    if (role !== "ADMIN") {
      const isMember = (team.members as any[]).some((m) => String(m.userId) === String(userId));
      const isOwner = String(team.ownerId) === String(userId);
      if (!isMember && !isOwner) {
        return NextResponse.json({ success: false, error: "Você não tem acesso a este time." }, { status: 403 });
      }
    }

    const client = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: {
        id: true,
        name: true,
        status: true,
        phone: true,
        email: true,
        preference: {
          select: {
            city: true,
            state: true,
            neighborhoods: true,
            purpose: true,
            types: true,
            minPrice: true,
            maxPrice: true,
            bedroomsMin: true,
            bathroomsMin: true,
            areaMin: true,
            scope: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const result = await ClientMatchService.getOrRefreshMatches({
      clientId,
      teamId: String(teamId),
      limit,
      forceRefresh,
    });

    const matches = result.items.map((m) => ({
      property: {
        id: String(m.property.id),
        title: String(m.property.title || "Imóvel"),
        price: Number(m.property.price || 0),
        type: String(m.property.type || ""),
        purpose: m.property.purpose ?? null,
        status: String(m.property.status || "ACTIVE"),
        city: String(m.property.city || ""),
        state: String(m.property.state || ""),
        neighborhood: m.property.neighborhood ?? null,
        bedrooms: m.property.bedrooms ?? null,
        bathrooms: m.property.bathrooms ?? null,
        areaM2: m.property.areaM2 ?? null,
        image: m.property.images?.[0]?.url || null,
      },
      score: Number(m.score || 0),
      reasons: Array.isArray(m.reasons) ? m.reasons : [],
    }));

    return NextResponse.json({
      success: true,
      team: { id: String(team.id), name: String(team.name || "Time") },
      client,
      scope: result.scope,
      refreshed: result.refreshed,
      matches,
    });
  } catch (error) {
    console.error("Error fetching client matches:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos carregar os matches agora." }, { status: 500 });
  }
}
