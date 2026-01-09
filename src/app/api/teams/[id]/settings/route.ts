import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const teamSettingsSchema = z.object({
  leadDistributionMode: z.enum(["ROUND_ROBIN", "CAPTURER_FIRST", "MANUAL"]),
});

type TeamLeadDistributionMode = z.infer<typeof teamSettingsSchema>["leadDistributionMode"];

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

async function assertCanManageTeam(teamId: string, userId: string, role: string | null) {
  const team = await (prisma as any).team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!team) {
    return { ok: false as const, response: NextResponse.json({ error: "Time não encontrado" }, { status: 404 }) };
  }

  const membership = await (prisma as any).teamMember.findFirst({
    where: { teamId, userId },
    select: { role: true },
  });

  const canManage = role === "ADMIN" || team.ownerId === userId || membership?.role === "OWNER";
  if (!canManage) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Você não tem permissão para gerenciar configurações deste time." },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const };
}

function keyFor(teamId: string) {
  return `team:${teamId}:leadDistributionMode`;
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: teamId } = await context.params;

    const permission = await assertCanManageTeam(teamId, userId, role);
    if (!permission.ok) return permission.response;

    const rec = await (prisma as any).systemSetting.findUnique({
      where: { key: keyFor(teamId) },
      select: { key: true, value: true },
    });

    const value = String(rec?.value || "").trim().toUpperCase();
    const mode: TeamLeadDistributionMode =
      value === "CAPTURER_FIRST" || value === "MANUAL" || value === "ROUND_ROBIN" ? (value as any) : "ROUND_ROBIN";

    return NextResponse.json({ success: true, settings: { leadDistributionMode: mode } });
  } catch (error) {
    console.error("Error fetching team settings:", error);
    return NextResponse.json({ error: "Não conseguimos carregar as configurações deste time." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: teamId } = await context.params;

    const permission = await assertCanManageTeam(teamId, userId, role);
    if (!permission.ok) return permission.response;

    const json = await req.json().catch(() => null);
    const parsed = teamSettingsSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const updated = await (prisma as any).systemSetting.upsert({
      where: { key: keyFor(teamId) },
      create: {
        key: keyFor(teamId),
        value: parsed.data.leadDistributionMode,
        updatedByUserId: userId,
      },
      update: {
        value: parsed.data.leadDistributionMode,
        updatedByUserId: userId,
      },
      select: { key: true, value: true },
    });

    return NextResponse.json({ success: true, settings: { leadDistributionMode: updated.value } });
  } catch (error) {
    console.error("Error updating team settings:", error);
    return NextResponse.json({ error: "Não conseguimos salvar as configurações deste time." }, { status: 500 });
  }
}
