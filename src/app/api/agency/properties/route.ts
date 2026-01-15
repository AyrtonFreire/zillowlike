import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) return { userId: null as string | null, role: null as string | null };
  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;
  return { userId: userId ? String(userId) : null, role: role ? String(role) : null };
}

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const teamIdParam = url.searchParams.get("teamId");

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
      return NextResponse.json({ success: true, team: null, properties: [] });
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

    const properties = await prisma.property.findMany({
      where: { teamId: String(teamId) },
      include: {
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: {
            favorites: true,
            leads: true,
            views: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const now = new Date();
    const start14d = new Date(now);
    start14d.setHours(0, 0, 0, 0);
    start14d.setDate(start14d.getDate() - 13);

    const propertyIds = (properties as any[]).map((p) => String(p.id)).filter(Boolean);
    let views14dByProperty = new Map<string, number>();
    let leads14dByProperty = new Map<string, number>();

    if (propertyIds.length > 0) {
      try {
        const viewsRows = (await prisma.$queryRaw(
          Prisma.sql`
            SELECT "propertyId", COUNT(*)::int AS "count"
            FROM "property_views"
            WHERE "propertyId" = ANY(${propertyIds})
              AND "viewedAt" >= ${start14d}
            GROUP BY 1
          `
        )) as any[];

        const leadsRows = (await prisma.$queryRaw(
          Prisma.sql`
            SELECT "propertyId", COUNT(*)::int AS "count"
            FROM "leads"
            WHERE "propertyId" = ANY(${propertyIds})
              AND "createdAt" >= ${start14d}
            GROUP BY 1
          `
        )) as any[];

        views14dByProperty = new Map<string, number>(
          (viewsRows || []).map((r: any) => [String(r.propertyId), Number(r.count) || 0])
        );
        leads14dByProperty = new Map<string, number>(
          (leadsRows || []).map((r: any) => [String(r.propertyId), Number(r.count) || 0])
        );
      } catch {
        views14dByProperty = new Map<string, number>();
        leads14dByProperty = new Map<string, number>();
      }
    }

    const formatted = (properties as any[]).map((p) => {
      const id = String(p.id);
      const views14d = views14dByProperty.get(id) || 0;
      const leads14d = leads14dByProperty.get(id) || 0;
      const conversion14dPct = views14d > 0 ? Math.round(((leads14d / views14d) * 100) * 10) / 10 : null;
      return {
      id: String(p.id),
      title: String(p.title || "Imóvel"),
      price: Number(p.price || 0),
      status: String(p.status || "ACTIVE"),
      type: String(p.type || ""),
      city: String(p.city || ""),
      state: String(p.state || ""),
      street: String(p.street || ""),
      neighborhood: p.neighborhood ?? null,
      bedrooms: p.bedrooms ?? null,
      bathrooms: p.bathrooms ?? null,
      areaM2: p.areaM2 ?? null,
      image: p.images?.[0]?.url || null,
      views: Number(p._count?.views || 0),
      leads: Number(p._count?.leads || 0),
      favorites: Number(p._count?.favorites || 0),
      views14d,
      leads14d,
      conversion14dPct,
    };
    });

    return NextResponse.json({
      success: true,
      team: { id: String(team.id), name: String(team.name || "Time") },
      properties: formatted,
    });
  } catch (error) {
    console.error("Error fetching agency properties:", error);
    return NextResponse.json(
      { success: false, error: "Não conseguimos carregar os imóveis agora." },
      { status: 500 }
    );
  }
}
