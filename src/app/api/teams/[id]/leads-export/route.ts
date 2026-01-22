import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, LeadStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { captureException } from "@/lib/sentry";
import { logger } from "@/lib/logger";

const CLOSED_STATUSES: Array<LeadStatus | string> = ["COMPLETED", "CANCELLED", "EXPIRED", "OWNER_REJECTED"];

function csvEscape(value: any) {
  const s = value == null ? "" : String(value);
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await context.params;
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const stage = (url.searchParams.get("stage") || "").trim();
    const realtorId = (url.searchParams.get("realtorId") || "").trim();
    const onlyPendingParam = (url.searchParams.get("onlyPendingReply") || "").trim().toLowerCase();
    const onlyPendingReply = onlyPendingParam === "1" || onlyPendingParam === "true" || onlyPendingParam === "yes";

    if (role === "AGENCY") {
      const profile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      const agencyTeamId = profile?.teamId ? String(profile.teamId) : null;
      if (!agencyTeamId || agencyTeamId !== String(id)) {
        return NextResponse.json({ error: "Você só pode exportar leads do seu time." }, { status: 403 });
      }
    }

    const team = await (prisma as any).team.findUnique({
      where: { id: String(id) },
      include: {
        owner: { select: { id: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    if (role !== "ADMIN") {
      const isMember = (team.members as any[]).some((m) => String(m.userId) === String(userId));
      const isOwner = String(team.ownerId) === String(userId);
      if (!isMember && !isOwner) {
        return NextResponse.json({ error: "Você não tem acesso a este time." }, { status: 403 });
      }
    }

    const memberIds = (team.members as any[]).map((m) => String(m.userId));

    const where: any = {
      OR: [{ teamId: String(id) }, { realtorId: { in: memberIds } }],
      ...(stage ? { pipelineStage: stage } : {}),
      ...(realtorId === "unassigned" ? { realtorId: null } : realtorId ? { realtorId } : {}),
    };

    const leads = await (prisma as any).lead.findMany({
      where,
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        createdAt: true,
        realtorId: true,
        contact: { select: { name: true, email: true, phone: true } },
        property: { select: { title: true, city: true, state: true } },
        realtor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const normalizedLeads = (leads || []).filter((l: any) => {
      if (!q) return true;
      const blob = [
        String(l?.id || ""),
        String(l?.contact?.name || ""),
        String(l?.contact?.email || ""),
        String(l?.property?.title || ""),
        String(l?.property?.city || ""),
        String(l?.property?.state || ""),
        String(l?.realtor?.name || ""),
        String(l?.realtor?.email || ""),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });

    const activeLeadIds: string[] = normalizedLeads
      .filter((l: any) => {
        const stageNorm = String(l?.pipelineStage || "NEW");
        const isClosed = CLOSED_STATUSES.includes(l?.status) || stageNorm === "WON" || stageNorm === "LOST";
        return !isClosed;
      })
      .map((l: any) => String(l.id));

    const pendingByLeadId = new Map<string, string>();
    if (activeLeadIds.length) {
      try {
        const leadIdsSql = Prisma.join(activeLeadIds.map((lid: string) => Prisma.sql`${lid}`));
        const rows = (await prisma.$queryRaw(
          Prisma.sql`
            WITH m AS (
              SELECT cm."leadId" AS "leadId", cm."fromClient" AS "fromClient", cm."createdAt" AS "createdAt"
              FROM "lead_client_messages" cm
              WHERE cm."leadId" IN (${leadIdsSql})

              UNION ALL

              SELECT im."leadId" AS "leadId", false AS "fromClient", im."createdAt" AS "createdAt"
              FROM "lead_messages" im
              WHERE im."leadId" IN (${leadIdsSql})
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

        for (const r of rows || []) {
          if (!r?.leadId) continue;
          const ts = r?.lastClientAt ? new Date(r.lastClientAt).toISOString() : null;
          if (!ts) continue;
          pendingByLeadId.set(String(r.leadId), ts);
        }
      } catch (e) {
        console.error("Error computing pending reply map for export:", e);
      }
    }

    const exportedLeads = onlyPendingReply
      ? (normalizedLeads as any[]).filter((l: any) => pendingByLeadId.has(String(l?.id || "")))
      : (normalizedLeads as any[]);

    const headers = [
      "lead_id",
      "client_name",
      "client_email",
      "client_phone",
      "property_title",
      "property_city",
      "property_state",
      "pipeline_stage",
      "status",
      "realtor_name",
      "realtor_email",
      "created_at",
      "pending_reply_at",
    ];

    const lines: string[] = [];
    lines.push(headers.map(csvEscape).join(","));

    for (const l of exportedLeads as any[]) {
      const pendingReplyAt = pendingByLeadId.get(String(l.id)) || "";
      lines.push(
        [
          l.id,
          l.contact?.name || "",
          l.contact?.email || "",
          l.contact?.phone || "",
          l.property?.title || "",
          l.property?.city || "",
          l.property?.state || "",
          l.pipelineStage || "",
          l.status || "",
          l.realtor?.name || "",
          l.realtor?.email || "",
          l.createdAt ? new Date(l.createdAt).toISOString() : "",
          pendingReplyAt,
        ]
          .map(csvEscape)
          .join(",")
      );
    }

    const csv = lines.join("\n");
    const filename = `leads_${String(id)}_${new Date().toISOString().slice(0, 10)}.csv`;

    void createAuditLog({
      level: "INFO",
      action: "AGENCY_CRM_LEADS_EXPORT",
      actorId: String(userId),
      actorEmail: session.user?.email || null,
      actorRole: String(role || ""),
      targetType: "TEAM",
      targetId: String(id),
      metadata: {
        q: q || null,
        stage: stage || null,
        realtorId: realtorId || null,
        onlyPendingReply,
        exported: exportedLeads.length,
      },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    captureException(error, { route: "/api/teams/[id]/leads-export" });
    logger.error("Error exporting team leads", { error });
    return NextResponse.json({ error: "Não conseguimos exportar os leads agora." }, { status: 500 });
  }
}
