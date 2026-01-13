import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PropertyTypeEnum, PurposeEnum } from "@/lib/schemas";

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

const MatchScopeEnum = z.enum(["PORTFOLIO", "MARKET"]);

const UpsertPreferenceSchema = z
  .object({
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(10),
    neighborhoods: z.array(z.string().trim().min(1).max(120)).max(100).optional(),

    purpose: PurposeEnum.nullable().optional(),
    types: z.array(PropertyTypeEnum).max(20).optional(),

    minPrice: z.number().int().nonnegative().nullable().optional(),
    maxPrice: z.number().int().nonnegative().nullable().optional(),
    bedroomsMin: z.number().int().nonnegative().nullable().optional(),
    bathroomsMin: z.number().nonnegative().nullable().optional(),
    areaMin: z.number().int().nonnegative().nullable().optional(),

    flags: z.record(z.string(), z.any()).nullable().optional(),
    scope: MatchScopeEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.minPrice != null && data.maxPrice != null && data.minPrice > data.maxPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["minPrice"], message: "minPrice não pode ser maior que maxPrice" });
    }
  });

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const teamId = await resolveTeamId({ userId, role, teamIdParam: url.searchParams.get("teamId") });

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 });
    }

    const { error: teamError } = await assertTeamAccess({ userId, role, teamId });
    if (teamError) return teamError;

    const clientId = String(ctx.params.id);

    const client = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: {
        id: true,
        name: true,
        preference: true,
      },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      client: { id: String(client.id), name: String(client.name || "") },
      preference: client.preference || null,
    });
  } catch (error) {
    console.error("Error fetching client preference:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos carregar as preferências agora." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const teamId = await resolveTeamId({ userId, role, teamIdParam: url.searchParams.get("teamId") });

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 });
    }

    const { error: teamError } = await assertTeamAccess({ userId, role, teamId });
    if (teamError) return teamError;

    const clientId = String(ctx.params.id);

    const client = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: {
        id: true,
        preference: { select: { id: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = UpsertPreferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const neighborhoods = Array.isArray(parsed.data.neighborhoods)
      ? parsed.data.neighborhoods.map((n) => n.trim()).filter(Boolean)
      : [];

    const types = Array.isArray(parsed.data.types) ? parsed.data.types : [];

    const preference = await (prisma as any).clientPreference.upsert({
      where: { clientId: String(clientId) },
      create: {
        clientId: String(clientId),
        city: parsed.data.city,
        state: parsed.data.state,
        neighborhoods,
        purpose: parsed.data.purpose ?? null,
        types,
        minPrice: parsed.data.minPrice ?? null,
        maxPrice: parsed.data.maxPrice ?? null,
        bedroomsMin: parsed.data.bedroomsMin ?? null,
        bathroomsMin: parsed.data.bathroomsMin ?? null,
        areaMin: parsed.data.areaMin ?? null,
        flags: parsed.data.flags ?? null,
        scope: parsed.data.scope || "PORTFOLIO",
      },
      update: {
        city: parsed.data.city,
        state: parsed.data.state,
        neighborhoods,
        purpose: parsed.data.purpose ?? null,
        types,
        minPrice: parsed.data.minPrice ?? null,
        maxPrice: parsed.data.maxPrice ?? null,
        bedroomsMin: parsed.data.bedroomsMin ?? null,
        bathroomsMin: parsed.data.bathroomsMin ?? null,
        areaMin: parsed.data.areaMin ?? null,
        flags: parsed.data.flags ?? null,
        scope: parsed.data.scope || undefined,
      },
    });

    return NextResponse.json({ success: true, preference });
  } catch (error) {
    console.error("Error saving client preference:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos salvar as preferências agora." }, { status: 500 });
  }
}
