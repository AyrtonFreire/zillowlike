import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { LeadEventService } from "@/lib/lead-event-service";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

type LeadConversationRecord = {
  id: string;
  realtorId: string | null;
  teamId: string | null;
  clientChatToken: string | null;
  pipelineStage: string | null;
  respondedAt: Date | null;
  conversationState: "ACTIVE" | "ARCHIVED" | "CLOSED";
  conversationArchivedAt: Date | null;
  conversationClosedAt: Date | null;
  conversationLastActivityAt: Date;
  property: { ownerId: string | null } | null;
  team: { ownerId: string | null } | null;
};

type ActorContext = {
  actorId?: string | null;
  actorRole?: string | null;
  reason?: string | null;
};

function buildMetadata(reason?: string | null) {
  return reason ? { reason: String(reason) } : null;
}

export class LeadConversationLifecycleService {
  private static async loadLead(leadId: string): Promise<LeadConversationRecord | null> {
    const lead: any = await (prisma as any).lead.findUnique({
      where: { id: String(leadId) },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        clientChatToken: true,
        pipelineStage: true,
        respondedAt: true,
        conversationState: true,
        conversationArchivedAt: true,
        conversationClosedAt: true,
        conversationLastActivityAt: true,
        property: {
          select: {
            ownerId: true,
          },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    return lead ? (lead as LeadConversationRecord) : null;
  }

  static async ensureClientChatToken(leadId: string, lead?: LeadConversationRecord | null) {
    const current = lead || (await this.loadLead(leadId));
    if (!current) {
      throw new Error("LEAD_NOT_FOUND");
    }
    if (current.clientChatToken) {
      return { token: String(current.clientChatToken), lead: current };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const updated = (await (prisma as any).lead.update({
      where: { id: String(leadId) },
      data: { clientChatToken: token },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        clientChatToken: true,
        pipelineStage: true,
        respondedAt: true,
        conversationState: true,
        conversationArchivedAt: true,
        conversationClosedAt: true,
        conversationLastActivityAt: true,
        property: {
          select: {
            ownerId: true,
          },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    })) as LeadConversationRecord;

    return { token, lead: updated };
  }

  private static async emitStateChanged(lead: LeadConversationRecord) {
    try {
      const pusher = getPusherServer();
      const conversationState = String(lead.conversationState);
      const conversationArchivedAt = lead.conversationArchivedAt ? new Date(lead.conversationArchivedAt).toISOString() : null;
      const conversationClosedAt = lead.conversationClosedAt ? new Date(lead.conversationClosedAt).toISOString() : null;
      const conversationLastActivityAt = lead.conversationLastActivityAt
        ? new Date(lead.conversationLastActivityAt).toISOString()
        : null;
      const payload = {
        leadId: String(lead.id),
        state: conversationState,
        archivedAt: conversationArchivedAt,
        closedAt: conversationClosedAt,
        lastActivityAt: conversationLastActivityAt,
        conversationState,
        conversationArchivedAt,
        conversationClosedAt,
        conversationLastActivityAt,
        ts: new Date().toISOString(),
      };

      try {
        await pusher.trigger(PUSHER_CHANNELS.CHAT(String(lead.id)), PUSHER_EVENTS.LEAD_CHAT_STATE_CHANGED, payload);
      } catch {
      }

      const recipients = new Set<string>();
      if (lead.realtorId) recipients.add(String(lead.realtorId));
      if (lead.property?.ownerId) recipients.add(String(lead.property.ownerId));
      if (lead.team?.ownerId) recipients.add(String(lead.team.ownerId));

      for (const rid of recipients) {
        try {
          await pusher.trigger(PUSHER_CHANNELS.REALTOR(String(rid)), PUSHER_EVENTS.LEAD_CHAT_STATE_CHANGED, payload);
        } catch {
        }
      }

      if (lead.teamId) {
        try {
          await pusher.trigger(PUSHER_CHANNELS.AGENCY(String(lead.teamId)), PUSHER_EVENTS.AGENCY_LEADS_UPDATED, {
            teamId: String(lead.teamId),
            leadId: String(lead.id),
            ts: new Date().toISOString(),
          });
        } catch {
        }
      }
    } catch {
    }
  }

  private static async recalculateAssistants(lead: LeadConversationRecord) {
    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
      }
    }

    if (lead.teamId && lead.team?.ownerId) {
      try {
        await RealtorAssistantService.recalculateForAgencyTeam(String(lead.team.ownerId), String(lead.teamId));
      } catch {
      }
    }
  }

  static async touchActivity(leadId: string, options?: ActorContext & { at?: Date; ensureToken?: boolean }) {
    const current = await this.loadLead(leadId);
    if (!current) {
      throw new Error("LEAD_NOT_FOUND");
    }
    if (current.conversationState === "CLOSED") {
      throw new Error("CONVERSATION_CLOSED");
    }

    const activityAt = options?.at || new Date();
    let nextLead: LeadConversationRecord;

    if (current.conversationState === "ARCHIVED") {
      nextLead = (await (prisma as any).lead.update({
        where: { id: String(leadId) },
        data: {
          conversationState: "ACTIVE",
          conversationArchivedAt: null,
          conversationLastActivityAt: activityAt,
        },
        select: {
          id: true,
          realtorId: true,
          teamId: true,
          clientChatToken: true,
          pipelineStage: true,
          respondedAt: true,
          conversationState: true,
          conversationArchivedAt: true,
          conversationClosedAt: true,
          conversationLastActivityAt: true,
          property: {
            select: {
              ownerId: true,
            },
          },
          team: {
            select: {
              ownerId: true,
            },
          },
        },
      })) as LeadConversationRecord;

      if (options?.ensureToken) {
        const ensured = await this.ensureClientChatToken(String(leadId), nextLead);
        nextLead = ensured.lead;
      }

      await LeadEventService.record({
        leadId: String(leadId),
        type: "CHAT_REOPENED",
        actorId: options?.actorId ?? null,
        actorRole: options?.actorRole ?? null,
        title: "Conversa reaberta",
        metadata: buildMetadata(options?.reason),
      });

      await this.emitStateChanged(nextLead);
      await this.recalculateAssistants(nextLead);
      return nextLead;
    }

    nextLead = (await (prisma as any).lead.update({
      where: { id: String(leadId) },
      data: {
        conversationLastActivityAt: activityAt,
      },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        clientChatToken: true,
        pipelineStage: true,
        respondedAt: true,
        conversationState: true,
        conversationArchivedAt: true,
        conversationClosedAt: true,
        conversationLastActivityAt: true,
        property: {
          select: {
            ownerId: true,
          },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    })) as LeadConversationRecord;

    if (options?.ensureToken && !nextLead.clientChatToken) {
      const ensured = await this.ensureClientChatToken(String(leadId), nextLead);
      nextLead = ensured.lead;
    }

    return nextLead;
  }

  static async archiveConversation(leadId: string, options?: ActorContext & { at?: Date }) {
    const current = await this.loadLead(leadId);
    if (!current) {
      throw new Error("LEAD_NOT_FOUND");
    }
    if (current.conversationState === "CLOSED") {
      return current;
    }
    if (current.conversationState === "ARCHIVED") {
      return current;
    }

    const archivedAt = options?.at || new Date();
    const updated = (await (prisma as any).lead.update({
      where: { id: String(leadId) },
      data: {
        conversationState: "ARCHIVED",
        conversationArchivedAt: archivedAt,
        conversationLastActivityAt: archivedAt,
      },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        clientChatToken: true,
        pipelineStage: true,
        respondedAt: true,
        conversationState: true,
        conversationArchivedAt: true,
        conversationClosedAt: true,
        conversationLastActivityAt: true,
        property: {
          select: {
            ownerId: true,
          },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    })) as LeadConversationRecord;

    await LeadEventService.record({
      leadId: String(leadId),
      type: "CHAT_ARCHIVED",
      actorId: options?.actorId ?? null,
      actorRole: options?.actorRole ?? null,
      title: "Conversa arquivada",
      metadata: buildMetadata(options?.reason),
    });

    await this.emitStateChanged(updated);
    await this.recalculateAssistants(updated);
    return updated;
  }

  static async closeConversation(leadId: string, options?: ActorContext & { at?: Date }) {
    const current = await this.loadLead(leadId);
    if (!current) {
      throw new Error("LEAD_NOT_FOUND");
    }
    if (current.conversationState === "CLOSED") {
      return current;
    }

    const closedAt = options?.at || new Date();
    const updated = (await (prisma as any).lead.update({
      where: { id: String(leadId) },
      data: {
        conversationState: "CLOSED",
        conversationClosedAt: closedAt,
        conversationArchivedAt: null,
        conversationLastActivityAt: closedAt,
      },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        clientChatToken: true,
        pipelineStage: true,
        respondedAt: true,
        conversationState: true,
        conversationArchivedAt: true,
        conversationClosedAt: true,
        conversationLastActivityAt: true,
        property: {
          select: {
            ownerId: true,
          },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    })) as LeadConversationRecord;

    await LeadEventService.record({
      leadId: String(leadId),
      type: "CHAT_CLOSED",
      actorId: options?.actorId ?? null,
      actorRole: options?.actorRole ?? null,
      title: "Conversa encerrada",
      metadata: buildMetadata(options?.reason),
    });

    await this.emitStateChanged(updated);
    await this.recalculateAssistants(updated);
    return updated;
  }

  static async syncProfessionalReplyState(
    leadId: string,
    options?: ActorContext & { previousStage?: string | null; respondedAt?: Date | null }
  ) {
    const touched = await this.touchActivity(leadId, {
      actorId: options?.actorId,
      actorRole: options?.actorRole,
      reason: options?.reason || "PROFESSIONAL_REPLY",
      at: new Date(),
      ensureToken: true,
    });

    const previousStage = String(options?.previousStage || touched.pipelineStage || "").trim();
    const hadRespondedAt = options?.respondedAt || touched.respondedAt;
    const shouldAdvance = !previousStage || previousStage === "NEW";

    if (!shouldAdvance && hadRespondedAt) {
      return {
        lead: touched,
        fromStage: previousStage || null,
        toStage: previousStage || null,
      };
    }

    const updated = (await (prisma as any).lead.update({
      where: { id: String(leadId) },
      data: {
        pipelineStage: shouldAdvance ? "CONTACT" : undefined,
        respondedAt: hadRespondedAt ? undefined : new Date(),
      },
      select: {
        id: true,
        realtorId: true,
        teamId: true,
        clientChatToken: true,
        pipelineStage: true,
        respondedAt: true,
        conversationState: true,
        conversationArchivedAt: true,
        conversationClosedAt: true,
        conversationLastActivityAt: true,
        property: {
          select: {
            ownerId: true,
          },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    })) as LeadConversationRecord;

    return {
      lead: updated,
      fromStage: previousStage || null,
      toStage: shouldAdvance ? "CONTACT" : previousStage || null,
    };
  }
}
