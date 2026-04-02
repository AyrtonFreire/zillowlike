import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/sms";
import { createAuditLog } from "@/lib/audit-log";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import {
  assertAgencyClientTeamAccess,
  buildAgencyClientPlaybookSnapshot,
  getAgencyClientSessionContext,
  listAgencyClientAssignableMembers,
  resolveAgencyClientTeamId,
  selectAgencyClientAssignee,
  serializeAgencyClient,
} from "@/lib/agency-clients";

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
  source: z.enum(["MANUAL", "AGENCY_PUBLIC_PROFILE"]).optional(),
  intent: z.enum(["BUY", "RENT", "LIST"]).nullable().optional(),
  pipelineStage: z.enum(["NEW", "CONTACT", "QUALIFYING", "MATCHING", "VISIT", "NURTURE", "WON", "LOST"]).optional(),
  assignedUserId: z.string().trim().min(1).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  nextActionNote: z.string().trim().max(500).nullable().optional(),
  firstContactAt: z.string().datetime().nullable().optional(),
  lastContactAt: z.string().datetime().nullable().optional(),
  lastInboundAt: z.string().datetime().nullable().optional(),
  lastInboundChannel: z.string().trim().max(80).nullable().optional(),
  consentAcceptedAt: z.string().datetime().nullable().optional(),
  consentText: z.string().trim().max(2000).nullable().optional(),
  sourceSlug: z.string().trim().max(160).nullable().optional(),
  playbookSnapshot: z.string().trim().max(12000).nullable().optional(),
});

const CLIENT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  source: true,
  intent: true,
  pipelineStage: true,
  notes: true,
  assignedAt: true,
  firstContactAt: true,
  lastContactAt: true,
  lastInboundAt: true,
  lastInboundChannel: true,
  nextActionAt: true,
  nextActionNote: true,
  consentAcceptedAt: true,
  consentText: true,
  sourceSlug: true,
  playbookSnapshot: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  preference: {
    select: {
      city: true,
      state: true,
      neighborhoods: true,
      purpose: true,
      types: true,
      minPrice: true,
      maxPrice: true,
      bedroomsMin: true,
      bathroomsMin: true,
      areaMin: true,
      flags: true,
      scope: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await getAgencyClientSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN" && role !== "REALTOR") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const teamId = await resolveAgencyClientTeamId({ userId, role, teamIdParam: url.searchParams.get("teamId") });

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 });
    }

    const { error: teamError } = await assertAgencyClientTeamAccess({ userId, role, teamId });
    if (teamError) return NextResponse.json(teamError.body, { status: teamError.status });

    const { id } = await params;
    const clientId = String(id);

    const client = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: CLIENT_SELECT,
    });

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });
    }

    const assignableMembers = await listAgencyClientAssignableMembers(String(teamId));

    return NextResponse.json({
      success: true,
      client: serializeAgencyClient(client),
      assignableMembers: (Array.isArray(assignableMembers) ? assignableMembers : []).map((member: any) => ({
        userId: String(member.userId),
        name: member.user?.name ? String(member.user.name) : null,
        email: member.user?.email ? String(member.user.email) : null,
        queuePosition: Number(member.queuePosition || 0),
      })),
    });
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
    const { userId, role } = await getAgencyClientSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN" && role !== "REALTOR") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const teamId = await resolveAgencyClientTeamId({ userId, role, teamIdParam: url.searchParams.get("teamId") });

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 });
    }

    const { team, error: teamError } = await assertAgencyClientTeamAccess({ userId, role, teamId });
    if (teamError) return NextResponse.json(teamError.body, { status: teamError.status });

    const { id } = await params;
    const clientId = String(id);

    const assignableMembers = await listAgencyClientAssignableMembers(String(teamId));
    const assignableSet = new Set(assignableMembers.map((member: any) => String(member.userId)));
    const assignableByUserId = new Map(assignableMembers.map((member: any) => [String(member.userId), member]));

    const existing = await (prisma as any).client.findFirst({
      where: { id: clientId, teamId: String(teamId) },
      select: { id: true, email: true, phone: true, phoneNormalized: true, assignedUserId: true, intent: true, playbookSnapshot: true },
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
    if (parsed.data.source !== undefined) updateData.source = parsed.data.source;
    if (parsed.data.intent !== undefined) updateData.intent = parsed.data.intent;
    if (parsed.data.pipelineStage !== undefined) updateData.pipelineStage = parsed.data.pipelineStage;
    if (parsed.data.nextActionAt !== undefined) updateData.nextActionAt = parsed.data.nextActionAt ? new Date(parsed.data.nextActionAt) : null;
    if (parsed.data.nextActionNote !== undefined) updateData.nextActionNote = parsed.data.nextActionNote;
    if (parsed.data.firstContactAt !== undefined) updateData.firstContactAt = parsed.data.firstContactAt ? new Date(parsed.data.firstContactAt) : null;
    if (parsed.data.lastContactAt !== undefined) updateData.lastContactAt = parsed.data.lastContactAt ? new Date(parsed.data.lastContactAt) : null;
    if (parsed.data.lastInboundAt !== undefined) updateData.lastInboundAt = parsed.data.lastInboundAt ? new Date(parsed.data.lastInboundAt) : null;
    if (parsed.data.lastInboundChannel !== undefined) updateData.lastInboundChannel = parsed.data.lastInboundChannel;
    if (parsed.data.consentAcceptedAt !== undefined) updateData.consentAcceptedAt = parsed.data.consentAcceptedAt ? new Date(parsed.data.consentAcceptedAt) : null;
    if (parsed.data.consentText !== undefined) updateData.consentText = parsed.data.consentText;
    if (parsed.data.sourceSlug !== undefined) updateData.sourceSlug = parsed.data.sourceSlug;
    if (parsed.data.playbookSnapshot !== undefined) updateData.playbookSnapshot = parsed.data.playbookSnapshot;

    let effectiveAssignedUserId = existing.assignedUserId ? String(existing.assignedUserId) : null;
    let routingStrategy: "EXPLICIT" | "PRIMARY" | "BALANCED" | "UNASSIGNED" | "MANUAL" = effectiveAssignedUserId ? "EXPLICIT" : "UNASSIGNED";
    let assigneeName: string | null = effectiveAssignedUserId
      ? (() => {
          const member = assignableByUserId.get(String(effectiveAssignedUserId));
          return member?.user?.name ? String(member.user.name) : member?.user?.email ? String(member.user.email) : null;
        })()
      : null;

    if (parsed.data.assignedUserId !== undefined) {
      const nextAssignedUserId = parsed.data.assignedUserId ? String(parsed.data.assignedUserId) : null;
      if (nextAssignedUserId && !assignableSet.has(nextAssignedUserId)) {
        return NextResponse.json({ success: false, error: "Responsável inválido para este time." }, { status: 400 });
      }
      updateData.assignedUserId = nextAssignedUserId;
      effectiveAssignedUserId = nextAssignedUserId;
      routingStrategy = nextAssignedUserId ? "EXPLICIT" : "UNASSIGNED";
      assigneeName = nextAssignedUserId
        ? (() => {
            const member = assignableByUserId.get(String(nextAssignedUserId));
            return member?.user?.name ? String(member.user.name) : member?.user?.email ? String(member.user.email) : null;
          })()
        : null;
      if (nextAssignedUserId && nextAssignedUserId !== String(existing.assignedUserId || "")) {
        updateData.assignedAt = new Date();
      }
      if (!nextAssignedUserId) {
        updateData.assignedAt = null;
      }
    } else if (parsed.data.intent !== undefined && !effectiveAssignedUserId) {
      const suggested = await selectAgencyClientAssignee({ teamId: String(teamId), intent: parsed.data.intent ?? null });
      effectiveAssignedUserId = suggested.userId ? String(suggested.userId) : null;
      assigneeName = suggested.name ? String(suggested.name) : null;
      routingStrategy = suggested.userId ? suggested.strategy : "UNASSIGNED";
      updateData.assignedUserId = effectiveAssignedUserId;
      updateData.assignedAt = effectiveAssignedUserId ? new Date() : null;
    }

    const effectiveIntent = parsed.data.intent !== undefined ? parsed.data.intent ?? null : existing.intent ? String(existing.intent) : null;
    const shouldRefreshPlaybook =
      parsed.data.playbookSnapshot === undefined &&
      (parsed.data.intent !== undefined || parsed.data.assignedUserId !== undefined || !existing.playbookSnapshot);

    if (shouldRefreshPlaybook) {
      updateData.playbookSnapshot = await buildAgencyClientPlaybookSnapshot({
        teamId: String(teamId),
        intent: effectiveIntent,
        assigneeName,
        strategy: routingStrategy,
      });
    }

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
      select: CLIENT_SELECT,
    });

    await createAuditLog({
      action: "AGENCY_CLIENT_UPDATED",
      level: "INFO",
      actorId: String(userId),
      actorRole: role,
      targetType: "Client",
      targetId: String(updated.id),
      metadata: {
        teamId: String(teamId),
        updatedFields: Object.keys(updateData),
      },
    });

    void RealtorAssistantService.recalculateForAgencyTeam(String((team as any).ownerId), String(teamId));

    return NextResponse.json({
      success: true,
      client: serializeAgencyClient(updated),
      assignableMembers: (Array.isArray(assignableMembers) ? assignableMembers : []).map((member: any) => ({
        userId: String(member.userId),
        name: member.user?.name ? String(member.user.name) : null,
        email: member.user?.email ? String(member.user.email) : null,
        queuePosition: Number(member.queuePosition || 0),
      })),
    });
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
    const { userId, role } = await getAgencyClientSessionContext();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const teamId = await resolveAgencyClientTeamId({ userId, role, teamIdParam: url.searchParams.get("teamId") });

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Time não encontrado" }, { status: 404 });
    }

    const { team, error: teamError } = await assertAgencyClientTeamAccess({ userId, role, teamId });
    if (teamError) return NextResponse.json(teamError.body, { status: teamError.status });

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

    await createAuditLog({
      action: "AGENCY_CLIENT_DELETED",
      level: "WARN",
      actorId: String(userId),
      actorRole: role,
      targetType: "Client",
      targetId: clientId,
      metadata: { teamId: String(teamId) },
    });

    void RealtorAssistantService.recalculateForAgencyTeam(String((team as any).ownerId), String(teamId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos excluir o cliente agora." }, { status: 500 });
  }
}
