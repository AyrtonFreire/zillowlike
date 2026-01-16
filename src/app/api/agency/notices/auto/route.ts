import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, LeadPipelineStage, LeadStatus } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { createAuditLog } from "@/lib/audit-log";
import { createHash } from "crypto";

export const runtime = "nodejs";

const CLOSED_STATUSES: LeadStatus[] = ["COMPLETED", "CANCELLED", "EXPIRED", "OWNER_REJECTED"];
const CLOSED_STAGES: LeadPipelineStage[] = ["WON", "LOST"];

const PostSchema = z
  .object({
    teamId: z.string().trim().min(1).optional(),
    limit: z.number().int().positive().max(200).optional(),
  })
  .strict();

function normalizeStage(pipelineStage: LeadPipelineStage | null, status: LeadStatus): LeadPipelineStage {
  if (pipelineStage) return pipelineStage;
  if (status === "ACCEPTED") return "CONTACT";
  if (status === "CONFIRMED") return "VISIT";
  if (status === "COMPLETED") return "WON";
  if (status === "CANCELLED" || status === "EXPIRED" || status === "OWNER_REJECTED") return "LOST";
  return "NEW";
}

function hashLeadIds(leadIds: string[]) {
  const sorted = [...leadIds].map(String).filter(Boolean).sort();
  const raw = sorted.join(",");
  const h = createHash("sha1").update(raw).digest("hex");
  return h.slice(0, 12);
}

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) {
    return { userId: null, role: null, email: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;
  const email = session.user?.email ? String(session.user.email) : null;

  return { userId: userId ? String(userId) : null, role: role ? String(role) : null, email };
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role, email } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = PostSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const limit = parsed.data.limit ?? 25;

    let teamId = parsed.data.teamId ? String(parsed.data.teamId) : null;
    if (!teamId && role === "AGENCY") {
      const agencyProfile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      teamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
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
      return NextResponse.json({ error: "Não foi possível identificar o time da agência." }, { status: 400 });
    }

    const team = await (prisma as any).team.findUnique({
      where: { id: String(teamId) },
      include: {
        owner: { select: { id: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    if (role !== "ADMIN") {
      const isMember = Array.isArray(team.members) && (team.members as any[]).some((m) => String(m.userId) === String(userId));
      const isOwner = String(team.ownerId) === String(userId);
      if (!isMember && !isOwner) {
        return NextResponse.json({ error: "Você não tem acesso a este time." }, { status: 403 });
      }
    }

    const members = Array.isArray(team.members) ? (team.members as any[]) : [];
    const memberIds = members.map((m) => String(m.userId));

    const baseWhere: Prisma.LeadWhereInput = {
      OR: [{ teamId: String(teamId) }, { realtorId: { in: memberIds } }],
    };

    const leads = await prisma.lead.findMany({
      where: baseWhere,
      select: {
        id: true,
        status: true,
        pipelineStage: true,
        createdAt: true,
        updatedAt: true,
        realtorId: true,
        contact: { select: { name: true, phone: true } },
        property: { select: { title: true } },
        realtor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3000,
    });

    const now = new Date();
    const activeLeadIds = new Set<string>();

    for (const lead of leads) {
      const stage = normalizeStage((lead.pipelineStage as LeadPipelineStage | null) ?? null, lead.status as LeadStatus);
      const isActive = !CLOSED_STATUSES.includes(lead.status as LeadStatus) && !CLOSED_STAGES.includes(stage);
      if (isActive) {
        activeLeadIds.add(String(lead.id));
      }
    }

    const activeLeadIdsList = Array.from(activeLeadIds);
    if (activeLeadIdsList.length === 0) {
      return NextResponse.json({ success: true, result: { created: 0, updated: 0, targetRealtors: 0, pendingLeads: 0 } });
    }

    const leadIdsSql = Prisma.join(activeLeadIdsList.map((id) => Prisma.sql`${id}`));

    const cte = Prisma.sql`
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
    `;

    const leadRows = (await prisma.$queryRaw(
      Prisma.sql`${cte}
        SELECT "leadId", "createdAt" AS "lastClientAt"
        FROM last_msg
        WHERE "fromClient" = true
        ORDER BY "createdAt" DESC
        LIMIT ${limit};
      `
    )) as any[];

    const pendingReplyLeadIds = (leadRows || []).map((r: any) => String(r.leadId)).filter(Boolean);
    const pendingIdSet = new Set(pendingReplyLeadIds);

    const pendingLeads = leads
      .filter((l) => pendingIdSet.has(String(l.id)))
      .map((l) => ({
        id: String(l.id),
        realtorId: l.realtor?.id ? String(l.realtor.id) : l.realtorId ? String(l.realtorId) : null,
        realtorName: l.realtor?.name ? String(l.realtor.name) : null,
        realtorEmail: l.realtor?.email ? String(l.realtor.email) : null,
        contactName: l.contact?.name ? String(l.contact.name) : null,
        contactPhone: l.contact?.phone ? String(l.contact.phone) : null,
        propertyTitle: l.property?.title ? String(l.property.title) : null,
      }))
      .filter((x) => !!x.realtorId) as Array<{
      id: string;
      realtorId: string;
      realtorName: string | null;
      realtorEmail: string | null;
      contactName: string | null;
      contactPhone: string | null;
      propertyTitle: string | null;
    }>;

    const byRealtor = new Map<string, typeof pendingLeads>();
    for (const l of pendingLeads) {
      const arr = byRealtor.get(String(l.realtorId)) || [];
      arr.push(l);
      byRealtor.set(String(l.realtorId), arr);
    }

    let created = 0;
    let updated = 0;

    for (const [realtorId, list] of byRealtor.entries()) {
      const leadIds = Array.from(new Set(list.map((x) => String(x.id)))).filter(Boolean);
      if (leadIds.length === 0) continue;

      const leadHash = hashLeadIds(leadIds);
      const dedupeKey = `AGENCY_NOTICE:SLA_PENDING_REPLY:${String(teamId)}:${String(realtorId)}:${leadHash}`;

      const title = `Leads aguardando resposta (${leadIds.length})`;
      const message =
        `Você tem ${leadIds.length} lead${leadIds.length === 1 ? "" : "s"} com última mensagem do cliente sem retorno. ` +
        `Abra este aviso para ver a lista e priorize o atendimento.`;

      const fingerprint = JSON.stringify({ title, message, leadIds: [...leadIds].sort() });

      const existing = await (prisma as any).assistantItem.findFirst({
        where: {
          context: "REALTOR",
          ownerId: String(realtorId),
          dedupeKey,
        },
        select: {
          id: true,
          status: true,
          snoozedUntil: true,
          metadata: true,
        },
      });

      const prevFingerprint = (existing as any)?.metadata?._fingerprint;
      const isNewTrigger = prevFingerprint !== fingerprint;

      const snoozedUntil = existing?.snoozedUntil ? new Date(existing.snoozedUntil) : null;
      const isSnoozedInFuture = !!(
        snoozedUntil && !Number.isNaN(snoozedUntil.getTime()) && snoozedUntil.getTime() > now.getTime()
      );

      const shouldKeepSnoozed = existing?.status === "SNOOZED" && isSnoozedInFuture && !isNewTrigger;
      const shouldKeepClosed =
        (existing?.status === "RESOLVED" || existing?.status === "DISMISSED") && !isNewTrigger;

      const statusUpdate: any = {};
      if (!existing) {
        statusUpdate.status = "ACTIVE";
        statusUpdate.resolvedAt = null;
        statusUpdate.dismissedAt = null;
        statusUpdate.snoozedUntil = null;
      } else if (!shouldKeepSnoozed && !shouldKeepClosed) {
        statusUpdate.status = "ACTIVE";
        statusUpdate.resolvedAt = null;
        statusUpdate.dismissedAt = null;
        statusUpdate.snoozedUntil = null;
      }

      const nextMetadata: any = {
        kind: "AGENCY_NOTICE",
        trigger: "SLA_PENDING_REPLY",
        teamId: String(teamId),
        leadIds,
        leads: list.map((l) => ({
          id: String(l.id),
          contactName: l.contactName,
          contactPhone: l.contactPhone,
          propertyTitle: l.propertyTitle,
        })),
        createdByUserId: String(userId),
        createdByRole: String(role || ""),
        _fingerprint: fingerprint,
      };

      const item = !existing
        ? await (prisma as any).assistantItem.create({
            data: {
              context: "REALTOR",
              ownerId: String(realtorId),
              teamId: String(teamId),
              leadId: String(leadIds[0]),
              type: "AGENCY_NOTICE",
              priority: "HIGH",
              status: "ACTIVE",
              source: "EVENT",
              title,
              message,
              dueAt: null,
              snoozedUntil: null,
              resolvedAt: null,
              dismissedAt: null,
              primaryAction: { type: "OPEN_LEAD", leadId: String(leadIds[0]) },
              secondaryAction: { type: "OPEN_CHAT", leadId: String(leadIds[0]) },
              metadata: nextMetadata,
              dedupeKey,
            },
          })
        : await (prisma as any).assistantItem.update({
            where: { id: String(existing.id) },
            data: {
              ...statusUpdate,
              teamId: String(teamId),
              leadId: String(leadIds[0]),
              type: "AGENCY_NOTICE",
              priority: "HIGH",
              title,
              message,
              primaryAction: { type: "OPEN_LEAD", leadId: String(leadIds[0]) },
              secondaryAction: { type: "OPEN_CHAT", leadId: String(leadIds[0]) },
              metadata: nextMetadata,
            },
          });

      if (!existing) created += 1;
      else updated += 1;

      await RealtorAssistantService.emitItemUpdated(String(realtorId), item, { context: "REALTOR" });
    }

    void createAuditLog({
      level: "INFO",
      action: "AGENCY_NOTICE_AUTO_RUN",
      message: "Agency auto notices generated",
      actorId: String(userId),
      actorEmail: email || undefined,
      actorRole: String(role || ""),
      targetType: "Team",
      targetId: String(teamId),
      metadata: {
        teamId: String(teamId),
        created,
        updated,
        pendingLeads: pendingLeads.length,
      },
    });

    return NextResponse.json({
      success: true,
      result: {
        created,
        updated,
        targetRealtors: byRealtor.size,
        pendingLeads: pendingLeads.length,
      },
    });
  } catch (error) {
    console.error("/api/agency/notices/auto error", error);
    return NextResponse.json({ error: "Não conseguimos gerar avisos automaticamente agora." }, { status: 500 });
  }
}
