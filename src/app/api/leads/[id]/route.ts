import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { createAuditLog } from "@/lib/audit-log";
import { captureException } from "@/lib/sentry";
import { logger } from "@/lib/logger";

const jsonSafe = <T,>(value: T): T | number =>
  typeof value === "bigint" ? Number(value) : value;

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await context.params;

    const lead = await (prisma as any).lead.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            type: true,
            city: true,
            state: true,
            neighborhood: true,
            street: true,
            bedrooms: true,
            bathrooms: true,
            areaM2: true,
            builtAreaM2: true,
            usableAreaM2: true,
            lotAreaM2: true,
            privateAreaM2: true,
            suites: true,
            parkingSpots: true,
            floor: true,
            furnished: true,
            petFriendly: true,
            condoFee: true,
            purpose: true,
            teamId: true,
            ownerId: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        // Dados básicos do corretor responsável (se houver)
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        // Dados básicos do usuário/cliente vinculado (se cadastrado)
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const statusUpper = String((lead as any)?.status || "").toUpperCase();
    const stageUpper = String((lead as any)?.pipelineStage || "").toUpperCase();
    const isClosed =
      stageUpper === "WON" ||
      stageUpper === "LOST" ||
      statusUpper === "COMPLETED" ||
      statusUpper === "CANCELLED" ||
      statusUpper === "EXPIRED" ||
      statusUpper === "OWNER_REJECTED";

    let pendingReplyAt: string | null = null;
    if (!isClosed) {
      try {
        const rows = (await prisma.$queryRaw(
          Prisma.sql`
            WITH m AS (
              SELECT cm."leadId" AS "leadId", cm."fromClient" AS "fromClient", cm."createdAt" AS "createdAt"
              FROM "lead_client_messages" cm
              WHERE cm."leadId" = ${id}

              UNION ALL

              SELECT im."leadId" AS "leadId", false AS "fromClient", im."createdAt" AS "createdAt"
              FROM "lead_messages" im
              WHERE im."leadId" = ${id}
            ),
            last_msg AS (
              SELECT DISTINCT ON (m."leadId")
                m."leadId" AS "leadId",
                m."fromClient" AS "fromClient",
                m."createdAt" AS "createdAt"
              FROM m
              ORDER BY m."leadId", m."createdAt" DESC
            )
            SELECT "leadId", "createdAt" AS "lastClientAt"
            FROM last_msg
            WHERE "fromClient" = true;
          `
        )) as any[];

        const ts = rows?.[0]?.lastClientAt ? new Date(rows[0].lastClientAt).toISOString() : null;
        pendingReplyAt = ts && ts.length ? ts : null;
      } catch {
        pendingReplyAt = null;
      }
    }

    let agencyTeamId: string | null = null;
    if (role === "AGENCY") {
      const profile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      agencyTeamId = profile?.teamId ? String(profile.teamId) : null;

      if (!agencyTeamId) {
        return NextResponse.json({ error: "Perfil de agência sem time associado." }, { status: 403 });
      }
    }

    let isTeamOwner = false;
    const teamId = (lead as any).teamId || (lead.property as any)?.teamId || null;

    if (teamId) {
      const team = await (prisma as any).team.findUnique({
        where: { id: teamId },
        select: { ownerId: true },
      });

      if (team && team.ownerId === userId) {
        isTeamOwner = true;
      }
    }

    if (role === "AGENCY") {
      const effectiveTeamId = teamId ? String(teamId) : null;
      const sameTeam = !!effectiveTeamId && !!agencyTeamId && effectiveTeamId === String(agencyTeamId);

      let realtorIsTeamMember = false;
      const realtorId = (lead as any)?.realtorId ? String((lead as any).realtorId) : "";
      if (!sameTeam && realtorId) {
        const membership = await (prisma as any).teamMember.findFirst({
          where: {
            teamId: String(agencyTeamId),
            userId: realtorId,
          },
          select: { id: true },
        });
        realtorIsTeamMember = !!membership?.id;
      }

      if (!sameTeam && !realtorIsTeamMember) {
        return NextResponse.json({ error: "Você só pode visualizar leads do seu time." }, { status: 403 });
      }
    } else if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
      return NextResponse.json(
        {
          error:
            "Você só pode visualizar leads que está atendendo ou que pertencem a times dos quais você é responsável.",
        },
        { status: 403 }
      );
    }

    const normalized = {
      ...lead,
      pendingReplyAt,
      property: lead.property
        ? {
            ...lead.property,
            price: jsonSafe(lead.property.price),
            condoFee: jsonSafe((lead.property as any).condoFee),
          }
        : lead.property,
    };

    void createAuditLog({
      level: "INFO",
      action: "LEAD_VIEW",
      actorId: String(userId),
      actorEmail: session.user?.email || null,
      actorRole: String(role || ""),
      targetType: "LEAD",
      targetId: String(id),
      metadata: {
        teamId: teamId ? String(teamId) : null,
      },
    });

    return NextResponse.json({ success: true, lead: normalized });
  } catch (error) {
    captureException(error, { route: "/api/leads/[id]" });
    logger.error("Error fetching lead by id", { error });
    return NextResponse.json(
      { error: "Não conseguimos carregar este lead agora." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Exclusão permanente de lead está desabilitada. Use 'Encerrar lead' para fechar no funil (sem apagar histórico).",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        property: { select: { teamId: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    let isTeamOwner = false;
    const teamId = lead.teamId || lead.property?.teamId || null;
    if (teamId) {
      const team = await (prisma as any).team.findUnique({
        where: { id: teamId },
        select: { ownerId: true },
      });
      isTeamOwner = !!team && team.ownerId === userId;
    }

    if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
      return NextResponse.json(
        {
          error:
            "Você só pode excluir leads que está atendendo ou que pertencem a times dos quais você é responsável.",
        },
        { status: 403 }
      );
    }

    await (prisma as any).lead.delete({ where: { id }, select: { id: true } });

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Não conseguimos excluir este lead agora." },
      { status: 500 }
    );
  }
}
