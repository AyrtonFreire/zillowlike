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

const UpdateClientSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z
    .string()
    .trim()
    .email()
    .transform((v) => v.toLowerCase())
    .nullable()
    .optional(),
  phone: z.string().trim().min(6).max(40).nullable().optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const clientId = String(id);

    const client = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        preference: true,
      },
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos carregar o cliente agora." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const clientId = String(id);

    const existing = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: { id: true, email: true, phone: true, phoneNormalized: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const updateData: any = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    if (parsed.data.email !== undefined) {
      const email = parsed.data.email ? String(parsed.data.email) : null;
      if (email) {
        const conflict = await (prisma as any).client.findFirst({
          where: {
            teamId: String(teamId),
            email,
            NOT: { id: clientId },
          },
          select: { id: true },
        });
        if (conflict) {
          return NextResponse.json({ success: false, error: "Já existe um cliente com este e-mail neste time." }, { status: 400 });
        }
      }
      updateData.email = email;
    }

    if (parsed.data.phone !== undefined) {
      const phone = parsed.data.phone ? String(parsed.data.phone) : null;
      const normalized = String(phone || "").trim() ? normalizePhoneE164(String(phone)) : "";
      const phoneNormalized = normalized ? normalized : null;

      if (phoneNormalized) {
        const conflict = await (prisma as any).client.findFirst({
          where: {
            teamId: String(teamId),
            phoneNormalized,
            NOT: { id: clientId },
          },
          select: { id: true },
        });
        if (conflict) {
          return NextResponse.json({ success: false, error: "Já existe um cliente com este telefone neste time." }, { status: 400 });
        }
      }

      updateData.phone = phone;
      updateData.phoneNormalized = phoneNormalized;

      if ((existing.phone || null) !== phone || (existing.phoneNormalized || null) !== phoneNormalized) {
        // no-op, but preserves pattern of re-verification fields if ever added
      }
    }

    const updated = await (prisma as any).client.update({
      where: { id: clientId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        preference: true,
      },
    });

    return NextResponse.json({ success: true, client: updated });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos salvar o cliente agora." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const clientId = String(id);

    const existing = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    await (prisma as any).client.delete({ where: { id: clientId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos excluir o cliente agora." }, { status: 500 });
  }
}
