import { prisma } from "@/lib/prisma";
import { logger } from "./logger";

export type LeadEventTypeString =
  | "LEAD_CREATED"
  | "LEAD_ACCEPTED"
  | "LEAD_REJECTED"
  | "LEAD_COMPLETED"
  | "LEAD_LOST"
  | "STAGE_CHANGED"
  | "NOTE_ADDED"
  | "INTERNAL_MESSAGE"
  | "CLIENT_MESSAGE"
  | "REMINDER_SET"
  | "REMINDER_CLEARED"
  | "VISIT_REQUESTED"
  | "VISIT_CONFIRMED"
  | "VISIT_REJECTED"
  | "OWNER_APPROVAL_REQUESTED"
  | "SIMILAR_LIST_SHARED"
  | "SIMILAR_PROPERTY_INTEREST"
  | "AUTO_REPLY_SENT"
  | "AUTO_REPLY_SKIPPED"
  | "AUTO_REPLY_FAILED";

interface RecordLeadEventParams {
  leadId: string;
  type: LeadEventTypeString;
  actorId?: string | null;
  actorRole?: string | null;
  title?: string | null;
  description?: string | null;
  fromStage?: string | null;
  toStage?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Serviço centralizado para registrar eventos de linha do tempo de leads.
 *
 * Importante: falhas ao registrar eventos NUNCA devem quebrar o fluxo principal.
 */
export class LeadEventService {
  static async record(params: RecordLeadEventParams) {
    try {
      const {
        leadId,
        type,
        actorId,
        actorRole,
        title,
        description,
        fromStage,
        toStage,
        fromStatus,
        toStatus,
        metadata,
      } = params;

      return await (prisma as any).leadEvent.create({
        data: {
          leadId,
          type: type as any,
          actorId: actorId ?? null,
          actorRole: (actorRole as any) ?? null,
          title: title ?? null,
          description: description ?? null,
          fromStage: (fromStage as any) ?? null,
          toStage: (toStage as any) ?? null,
          fromStatus: (fromStatus as any) ?? null,
          toStatus: (toStatus as any) ?? null,
          metadata: metadata ?? null,
        },
      });
    } catch (error) {
      // Loga o erro mas não interrompe o fluxo principal
      try {
        logger.error("Error recording lead event", { error, params });
      } catch {
        // Se o logger falhar por algum motivo, ignorar silenciosamente
      }
      return null;
    }
  }
}
