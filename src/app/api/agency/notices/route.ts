import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { createAuditLog } from "@/lib/audit-log";
import { createHash } from "crypto";

export const runtime = "nodejs";

const PostSchema = z
  .object({
    teamId: z.string().trim().min(1).optional(),
    realtorId: z.string().trim().min(1),
    leadIds: z.array(z.string().trim().min(1)).min(1).max(50),
    title: z.string().trim().min(3).max(140).optional(),
    message: z.string().trim().min(1).max(1200).optional(),
  })
  .strict();

function hashLeadIds(leadIds: string[]) {
  const sorted = [...leadIds].map(String).filter(Boolean).sort();
  const raw = sorted.join(",");
  const h = createHash("sha1").update(raw).digest("hex");
  return h.slice(0, 12);
}

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user && !session?.userId) return { userId: null, role: null, email: null };

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;
  const email = session.user?.email ? String(session.user.email) : null;
  return {
    userId: userId ? String(userId) : null,
    role: role ? String(role) : null,
    email,
  };
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

    const body = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    let teamId = parsed.data.teamId ? String(parsed.data.teamId) : null;
    if (!teamId && role === "AGENCY") {
      const agencyProfile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      teamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
    }

    if (!teamId) {
      return NextResponse.json({ error: "Não foi possível identificar o time da agência." }, { status: 400 });
    }

    const realtorId = String(parsed.data.realtorId);
    const leadIds = Array.from(new Set(parsed.data.leadIds.map(String))).filter(Boolean);

    const team = await (prisma as any).team.findUnique({
      where: { id: String(teamId) },
      select: {
        id: true,
        ownerId: true,
        members: { select: { userId: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    const actorIsMember =
      String(team.ownerId) === String(userId) ||
      (Array.isArray(team.members) && (team.members as any[]).some((m) => String(m.userId) === String(userId)));

    if (role !== "ADMIN" && !actorIsMember) {
      return NextResponse.json({ error: "Você não tem acesso a este time." }, { status: 403 });
    }

    const realtorIsMember =
      String(team.ownerId) === realtorId ||
      (Array.isArray(team.members) && (team.members as any[]).some((m) => String(m.userId) === realtorId));

    if (!realtorIsMember) {
      return NextResponse.json({ error: "O corretor informado não pertence a este time." }, { status: 400 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        teamId: String(teamId),
      },
      select: {
        id: true,
        realtorId: true,
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
        property: {
          select: {
            title: true,
          },
        },
      },
    });

    const foundIds = new Set((leads || []).map((l) => String(l.id)));
    const missing = leadIds.filter((id) => !foundIds.has(String(id)));
    if (missing.length > 0) {
      return NextResponse.json({ error: "Um ou mais leads não pertencem a este time." }, { status: 400 });
    }

    const wrongOwner = (leads || []).filter((l) => String(l.realtorId || "") !== String(realtorId));
    if (wrongOwner.length > 0) {
      return NextResponse.json({ error: "Um ou mais leads não estão atribuídos a este corretor." }, { status: 400 });
    }

    const title = String(parsed.data.title || "Aviso da agência").trim();
    const message = String(parsed.data.message || "").trim();
    const leadHash = hashLeadIds(leadIds);
    const dedupeKey = `AGENCY_NOTICE:${String(teamId)}:${String(realtorId)}:${leadHash}`;

    const now = new Date();
    const fingerprint = JSON.stringify({
      title,
      message,
      leadIds: [...leadIds].sort(),
    });

    const existing = await (prisma as any).assistantItem.findUnique({
      where: {
        context_ownerId_dedupeKey: {
          context: "REALTOR",
          ownerId: String(realtorId),
          dedupeKey,
        },
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
      teamId: String(teamId),
      leadIds,
      leads: (leads || []).map((l) => ({
        id: String(l.id),
        contactName: l.contact?.name ? String(l.contact.name) : null,
        contactPhone: l.contact?.phone ? String(l.contact.phone) : null,
        propertyTitle: l.property?.title ? String(l.property.title) : null,
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

    await RealtorAssistantService.emitItemUpdated(String(realtorId), item, { context: "REALTOR" });

    void createAuditLog({
      level: "INFO",
      action: "AGENCY_NOTICE_CREATED",
      message: "Agency notice created",
      actorId: String(userId),
      actorEmail: email || undefined,
      actorRole: String(role || ""),
      targetType: "AssistantItem",
      targetId: String(item.id),
      metadata: {
        teamId: String(teamId),
        realtorId: String(realtorId),
        leadIds,
        dedupeKey,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("/api/agency/notices error", error);
    return NextResponse.json({ error: "Não conseguimos criar este aviso agora." }, { status: 500 });
  }
}
