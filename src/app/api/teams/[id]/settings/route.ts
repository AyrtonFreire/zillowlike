import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const teamSettingsSchema = z.object({
  leadDistributionMode: z.enum(["ROUND_ROBIN", "CAPTURER_FIRST", "MANUAL"]),
  leadReservationMinutes: z.number().int().min(1).max(24 * 60).optional(),
  leadMaxRedistributionAttempts: z.number().int().min(1).max(50).optional(),
});

type TeamLeadDistributionMode = z.infer<typeof teamSettingsSchema>["leadDistributionMode"];

function keyForMode(teamId: string) {
  return `team:${teamId}:leadDistributionMode`;
}

function keyForReservationMinutes(teamId: string) {
  return `team:${teamId}:leadReservationMinutes`;
}

function keyForMaxRedistributionAttempts(teamId: string) {
  return `team:${teamId}:leadMaxRedistributionAttempts`;
}

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

function normalizeMode(value: unknown): TeamLeadDistributionMode {
  const v = String(value || "").trim().toUpperCase();
  return v === "CAPTURER_FIRST" || v === "MANUAL" || v === "ROUND_ROBIN" ? (v as any) : "ROUND_ROBIN";
}

function parsePositiveInt(value: unknown): number | null {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
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

    const [modeRec, reservationRec, attemptsRec] = await Promise.all([
      (prisma as any).systemSetting.findUnique({
        where: { key: keyForMode(teamId) },
        select: { value: true },
      }),
      (prisma as any).systemSetting.findUnique({
        where: { key: keyForReservationMinutes(teamId) },
        select: { value: true },
      }),
      (prisma as any).systemSetting.findUnique({
        where: { key: keyForMaxRedistributionAttempts(teamId) },
        select: { value: true },
      }),
    ]);

    const mode = normalizeMode(modeRec?.value);
    const leadReservationMinutes = parsePositiveInt(reservationRec?.value);
    const leadMaxRedistributionAttempts = parsePositiveInt(attemptsRec?.value);

    return NextResponse.json({
      success: true,
      settings: {
        leadDistributionMode: mode,
        leadReservationMinutes,
        leadMaxRedistributionAttempts,
      },
    });
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

    const ops: Promise<any>[] = [];

    ops.push(
      (prisma as any).systemSetting.upsert({
        where: { key: keyForMode(teamId) },
        create: {
          key: keyForMode(teamId),
          value: parsed.data.leadDistributionMode,
          updatedByUserId: userId,
        },
        update: {
          value: parsed.data.leadDistributionMode,
          updatedByUserId: userId,
        },
        select: { value: true },
      })
    );

    if (typeof parsed.data.leadReservationMinutes === "number") {
      ops.push(
        (prisma as any).systemSetting.upsert({
          where: { key: keyForReservationMinutes(teamId) },
          create: {
            key: keyForReservationMinutes(teamId),
            value: String(parsed.data.leadReservationMinutes),
            updatedByUserId: userId,
          },
          update: {
            value: String(parsed.data.leadReservationMinutes),
            updatedByUserId: userId,
          },
          select: { value: true },
        })
      );
    }

    if (typeof parsed.data.leadMaxRedistributionAttempts === "number") {
      ops.push(
        (prisma as any).systemSetting.upsert({
          where: { key: keyForMaxRedistributionAttempts(teamId) },
          create: {
            key: keyForMaxRedistributionAttempts(teamId),
            value: String(parsed.data.leadMaxRedistributionAttempts),
            updatedByUserId: userId,
          },
          update: {
            value: String(parsed.data.leadMaxRedistributionAttempts),
            updatedByUserId: userId,
          },
          select: { value: true },
        })
      );
    }

    const [modeUpdated, reservationUpdated, attemptsUpdated] = await Promise.all(ops);

    return NextResponse.json({
      success: true,
      settings: {
        leadDistributionMode: String(modeUpdated?.value || parsed.data.leadDistributionMode),
        leadReservationMinutes:
          reservationUpdated?.value != null ? parsePositiveInt(reservationUpdated.value) : null,
        leadMaxRedistributionAttempts:
          attemptsUpdated?.value != null ? parsePositiveInt(attemptsUpdated.value) : null,
      },
    });
  } catch (error) {
    console.error("Error updating team settings:", error);
    return NextResponse.json({ error: "Não conseguimos salvar as configurações deste time." }, { status: 500 });
  }
}
