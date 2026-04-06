import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { prisma } from "@/lib/prisma";
import { LeadEventService } from "@/lib/lead-event-service";
import { createAuditLog } from "@/lib/audit-log";
import { getAgencyWorkspaceErrorStatus, resolveAssistantScope } from "@/lib/agency-workspace";

const PatchSchema = z
  .object({
    action: z.enum(["resolve", "dismiss", "snooze"]),
    minutes: z.number().int().positive().optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;
    const actorEmail = (session as any)?.user?.email ? String((session as any).user.email) : null;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const url = new URL(req.url);
    const scope = await resolveAssistantScope({
      userId: String(userId),
      authRole: role ? String(role) : null,
      requestedContext: url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR"),
      requestedTeamId: url.searchParams.get("teamId") || null,
    });

    if (!scope.allowed || !scope.ownerId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: getAgencyWorkspaceErrorStatus(scope.reason) });
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const previous: any = await (prisma as any).assistantItem.findFirst({
      where: {
        id: String(id),
        context: scope.context,
        ownerId: String(scope.ownerId),
        ...(scope.context === "AGENCY" && scope.teamId ? { teamId: String(scope.teamId) } : {}),
      },
      select: {
        id: true,
        leadId: true,
        type: true,
        status: true,
        priority: true,
        metadata: true,
      },
    });

    if (!previous) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    let item;
    if (parsed.data.action === "resolve") {
      item = await RealtorAssistantService.resolve(String(scope.ownerId), id, {
        context: scope.context,
        teamId: scope.context === "AGENCY" ? scope.teamId || undefined : undefined,
      });

      void createAuditLog({
        level: "SUCCESS",
        action: "ASSISTANT_ITEM_RESOLVED",
        message: "Assistant item resolved",
        actorId: String(userId),
        actorEmail,
        actorRole: String(role || ""),
        targetType: "AssistantItem",
        targetId: String(previous.id),
        metadata: {
          context: scope.context,
          teamId: scope.context === "AGENCY" ? String(scope.teamId || "") || null : null,
          leadId: previous.leadId ? String(previous.leadId) : null,
          itemType: String(previous.type || ""),
          previousStatus: String(previous.status || ""),
          previousPriority: String(previous.priority || ""),
        },
      });

      try {
        const meta = (previous as any)?.metadata || null;
        const leadId = (previous as any)?.leadId ? String((previous as any).leadId) : "";
        const source = String((meta as any)?.source || "").toUpperCase();

        if (scope.context !== "AGENCY" && source === "WHATSAPP" && leadId) {
          const lead: any = await (prisma as any).lead.findFirst({
            where: {
              id: leadId,
              realtorId: String(userId),
            },
            select: {
              id: true,
              pipelineStage: true,
              respondedAt: true,
            },
          });

          if (lead) {
            const fromStage = lead.pipelineStage ? String(lead.pipelineStage) : null;
            if (!fromStage || fromStage === "NEW") {
              await (prisma as any).lead.update({
                where: { id: leadId },
                data: {
                  pipelineStage: "CONTACT",
                  respondedAt: lead.respondedAt ? undefined : new Date(),
                },
                select: { id: true },
              });

              await LeadEventService.record({
                leadId,
                type: "STAGE_CHANGED",
                actorId: String(userId),
                actorRole: String(role || "REALTOR"),
                title: "Contato iniciado",
                fromStage,
                toStage: "CONTACT",
                metadata: {
                  source: "WHATSAPP",
                  viaAssistant: true,
                },
              });
            } else if (!lead.respondedAt) {
              await (prisma as any).lead.update({
                where: { id: leadId },
                data: { respondedAt: new Date() },
                select: { id: true },
              });
            }
          }
        }
      } catch {
      }
    } else if (parsed.data.action === "dismiss") {
      item = await RealtorAssistantService.dismiss(String(scope.ownerId), id, {
        context: scope.context,
        teamId: scope.context === "AGENCY" ? scope.teamId || undefined : undefined,
      });

      void createAuditLog({
        level: "INFO",
        action: "ASSISTANT_ITEM_DISMISSED",
        message: "Assistant item dismissed",
        actorId: String(userId),
        actorEmail,
        actorRole: String(role || ""),
        targetType: "AssistantItem",
        targetId: String(previous.id),
        metadata: {
          context: scope.context,
          teamId: scope.context === "AGENCY" ? String(scope.teamId || "") || null : null,
          leadId: previous.leadId ? String(previous.leadId) : null,
          itemType: String(previous.type || ""),
          previousStatus: String(previous.status || ""),
          previousPriority: String(previous.priority || ""),
        },
      });
    } else {
      const minutes = parsed.data.minutes ?? 60;
      item = await RealtorAssistantService.snooze(String(scope.ownerId), id, minutes, {
        context: scope.context,
        teamId: scope.context === "AGENCY" ? scope.teamId || undefined : undefined,
      });

      void createAuditLog({
        level: "INFO",
        action: "ASSISTANT_ITEM_SNOOZED",
        message: "Assistant item snoozed",
        actorId: String(userId),
        actorEmail,
        actorRole: String(role || ""),
        targetType: "AssistantItem",
        targetId: String(previous.id),
        metadata: {
          context: scope.context,
          teamId: scope.context === "AGENCY" ? String(scope.teamId || "") || null : null,
          leadId: previous.leadId ? String(previous.leadId) : null,
          itemType: String(previous.type || ""),
          previousStatus: String(previous.status || ""),
          previousPriority: String(previous.priority || ""),
          minutes,
        },
      });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    console.error("Error updating assistant item:", error);
    return NextResponse.json(
      { error: "Não conseguimos atualizar este item agora." },
      { status: 500 }
    );
  }
}
