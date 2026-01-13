import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/sms";

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

const ListQuerySchema = z.object({
  teamId: z.string().trim().min(1).optional(),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ANY"]).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  pageSize: z.string().regex(/^\d+$/).optional(),
});

const CreateClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .string()
    .trim()
    .email()
    .transform((v) => v.toLowerCase())
    .nullable()
    .optional(),
  phone: z.string().trim().min(6).max(40).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

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
    const parsed = ListQuerySchema.safeParse({
      teamId: url.searchParams.get("teamId") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      status: (url.searchParams.get("status") || "ANY").toUpperCase(),
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const teamId = await resolveTeamId({ userId, role, teamIdParam: parsed.data.teamId || null });

    if (!teamId) {
      return NextResponse.json({ success: true, team: null, clients: [], page: 1, pageSize: 24, total: 0 });
    }

    const { team, error } = await assertTeamAccess({ userId, role, teamId });
    if (error) return error;

    const pageRaw = Number(parsed.data.page || 1);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSizeRaw = Number(parsed.data.pageSize || 24);
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(pageSizeRaw, 100) : 24;

    const where: any = { teamId: String(teamId) };

    const status = String(parsed.data.status || "ANY");
    if (status !== "ANY") where.status = status;

    const q = parsed.data.q ? String(parsed.data.q).trim() : "";
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await (prisma as any).$transaction([
      (prisma as any).client.count({ where }),
      (prisma as any).client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          preference: {
            select: {
              city: true,
              state: true,
              scope: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

    const clients = (rows as any[]).map((c) => ({
      id: String(c.id),
      name: String(c.name || ""),
      email: c.email ? String(c.email) : null,
      phone: c.phone ? String(c.phone) : null,
      status: String(c.status || "ACTIVE"),
      notes: c.notes ? String(c.notes) : null,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
      updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : null,
      preference: c.preference
        ? {
            city: String(c.preference.city || ""),
            state: String(c.preference.state || ""),
            scope: String(c.preference.scope || "PORTFOLIO"),
            updatedAt: c.preference.updatedAt ? new Date(c.preference.updatedAt).toISOString() : null,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      team: { id: String((team as any).id), name: String((team as any).name || "Time") },
      clients,
      page,
      pageSize,
      total: Number(total || 0),
    });
  } catch (error) {
    console.error("Error listing clients:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos carregar os clientes agora." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => null);
    const parsed = CreateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const email = parsed.data.email !== undefined ? parsed.data.email : null;
    const phone = parsed.data.phone !== undefined ? parsed.data.phone : null;

    const normalized = String(phone || "").trim() ? normalizePhoneE164(String(phone)) : "";
    const phoneNormalized = normalized ? normalized : null;

    if (email) {
      const conflict = await (prisma as any).client.findFirst({
        where: { teamId: String(teamId), email: String(email) },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json({ success: false, error: "Já existe um cliente com este e-mail neste time." }, { status: 400 });
      }
    }

    if (phoneNormalized) {
      const conflict = await (prisma as any).client.findFirst({
        where: { teamId: String(teamId), phoneNormalized },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json({ success: false, error: "Já existe um cliente com este telefone neste time." }, { status: 400 });
      }
    }

    const created = await (prisma as any).client.create({
      data: {
        teamId: String(teamId),
        createdByUserId: String(userId),
        name: parsed.data.name,
        email,
        phone,
        phoneNormalized,
        notes: parsed.data.notes ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      client: {
        id: String(created.id),
        name: String(created.name || ""),
        email: created.email ? String(created.email) : null,
        phone: created.phone ? String(created.phone) : null,
        status: String(created.status || "ACTIVE"),
        notes: created.notes ? String(created.notes) : null,
        createdAt: created.createdAt ? new Date(created.createdAt).toISOString() : null,
        updatedAt: created.updatedAt ? new Date(created.updatedAt).toISOString() : null,
      },
    });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos criar o cliente agora." }, { status: 500 });
  }
}
