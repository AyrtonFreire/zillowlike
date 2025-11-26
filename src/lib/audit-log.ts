import { prisma } from "@/lib/prisma";

type AuditLogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS";

export const AUDIT_LOG_ACTIONS = {
  ADMIN_LEAD_STATUS_FORCE: "ADMIN_LEAD_STATUS_FORCE",
  ADMIN_LEAD_MURAL_VISIBILITY: "ADMIN_LEAD_MURAL_VISIBILITY",
  ADMIN_SETTING_UPDATE: "ADMIN_SETTING_UPDATE",
  ADMIN_REALTOR_SCORE_ADJUST: "ADMIN_REALTOR_SCORE_ADJUST",
  ADMIN_QUEUE_STATUS_CHANGE: "ADMIN_QUEUE_STATUS_CHANGE",
  ADMIN_QUEUE_MOVE: "ADMIN_QUEUE_MOVE",
  ADMIN_PROPERTY_DELETE: "ADMIN_PROPERTY_DELETE",
  ADMIN_PROPERTY_CREATE: "ADMIN_PROPERTY_CREATE",
  ADMIN_PROPERTY_UPDATE: "ADMIN_PROPERTY_UPDATE",
  ADMIN_USER_DELETE: "ADMIN_USER_DELETE",
  ADMIN_USER_BAN: "ADMIN_USER_BAN",
  ADMIN_USER_UNBAN: "ADMIN_USER_UNBAN",
  ADMIN_USER_ROLE_CHANGE: "ADMIN_USER_ROLE_CHANGE",
  ADMIN_REALTOR_APPLICATION_DECISION: "ADMIN_REALTOR_APPLICATION_DECISION",
  ADMIN_REALTOR_PARTNER_UPDATE: "ADMIN_REALTOR_PARTNER_UPDATE",
  REALTOR_APPLICATION_SUBMITTED: "REALTOR_APPLICATION_SUBMITTED",
} as const;

export type AuditLogAction = (typeof AUDIT_LOG_ACTIONS)[keyof typeof AUDIT_LOG_ACTIONS];

interface AuditLogInput {
  level?: AuditLogLevel;
  action: AuditLogAction | string;
  message?: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: any;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const prismaAny = prisma as any;
    await prismaAny.auditLog.create({
      data: {
        level: input.level ?? "INFO",
        action: input.action,
        message: input.message ?? null,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        actorRole: input.actorRole ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: input.metadata ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
