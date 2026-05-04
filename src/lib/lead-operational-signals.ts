import { PIPELINE_STAGE_META, type CanonicalPipelineStage } from "@/lib/lead-pipeline";

export type LeadOperationalLike = {
  createdAt?: string | Date | null;
  respondedAt?: string | Date | null;
  completedAt?: string | Date | null;
  nextActionDate?: string | Date | null;
  lastContactAt?: string | Date | null;
  lastMessageAt?: string | Date | null;
  stageEnteredAt?: string | Date | null;
  pipelineStage?: CanonicalPipelineStage | string | null;
  hasUnreadMessages?: boolean;
  visitDate?: string | Date | null;
};

export function asDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getLeadStageEnteredAt(lead: LeadOperationalLike) {
  return asDate(lead.stageEnteredAt) || asDate(lead.respondedAt) || asDate(lead.createdAt);
}

export function getLeadStageAgeDays(lead: LeadOperationalLike, now = new Date()) {
  const stageEnteredAt = getLeadStageEnteredAt(lead);
  if (!stageEnteredAt) return 0;
  return Math.max(0, Math.floor((now.getTime() - stageEnteredAt.getTime()) / (24 * 60 * 60 * 1000)));
}

export function getLeadLastActivityAt(lead: LeadOperationalLike) {
  return asDate(lead.lastMessageAt) || asDate(lead.lastContactAt) || asDate(lead.createdAt);
}

export function getLeadNextActionState(lead: LeadOperationalLike, now = new Date()) {
  const nextActionAt = asDate(lead.nextActionDate);
  if (!nextActionAt) {
    return { hasAction: false, overdue: false, today: false, nextActionAt: null };
  }
  const today =
    nextActionAt.getFullYear() === now.getFullYear() &&
    nextActionAt.getMonth() === now.getMonth() &&
    nextActionAt.getDate() === now.getDate();
  const overdue = nextActionAt.getTime() < now.getTime() && !today;
  return { hasAction: true, overdue, today, nextActionAt };
}

export function isLeadStale(lead: LeadOperationalLike, hours = 48, now = new Date()) {
  const lastContactAt = asDate(lead.lastContactAt) || asDate(lead.lastMessageAt);
  if (!lastContactAt) return true;
  return now.getTime() - lastContactAt.getTime() >= hours * 60 * 60 * 1000;
}

export function getLeadTemperature(lead: LeadOperationalLike, now = new Date()) {
  const nextAction = getLeadNextActionState(lead, now);
  const visitAt = asDate(lead.visitDate);
  const recentActivityAt = getLeadLastActivityAt(lead);
  const recentHours = recentActivityAt ? (now.getTime() - recentActivityAt.getTime()) / (60 * 60 * 1000) : Number.POSITIVE_INFINITY;
  const stage = String(lead.pipelineStage || "").toUpperCase();

  if (lead.hasUnreadMessages || nextAction.overdue) return "hot" as const;
  if ((visitAt && visitAt.getTime() >= now.getTime()) || stage === "PROPOSAL" || recentHours <= 24) return "warm" as const;
  return "cool" as const;
}

export function getStageHealth(params: {
  stage: CanonicalPipelineStage;
  count: number;
  overdueCount: number;
  agingCount: number;
}) {
  const meta = PIPELINE_STAGE_META[params.stage];
  const limit = meta.wipLimit;
  if (!limit) {
    return { tone: "neutral" as const, label: "Sem limite" };
  }
  if (params.count > limit || params.overdueCount >= Math.max(2, Math.ceil(limit / 3))) {
    return { tone: "critical" as const, label: "Gargalo" };
  }
  if (params.count >= Math.ceil(limit * 0.8) || params.agingCount > 0) {
    return { tone: "warning" as const, label: "Atenção" };
  }
  return { tone: "healthy" as const, label: "Saudável" };
}
