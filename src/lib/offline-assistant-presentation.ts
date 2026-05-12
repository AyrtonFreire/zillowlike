export type OfflineBadgeKind =
  | "URGENT"
  | "VISIT"
  | "HANDOFF"
  | "HOT"
  | "QUALIFIED"
  | "FAILED"
  | "SKIPPED";

export type OfflineBadgeTone = "rose" | "purple" | "amber" | "teal" | "emerald" | "gray";

export type OfflineBadgeIcon = "flame" | "calendar" | "clock" | "alert" | "sparkles";

export type OfflineBadge = {
  kind: OfflineBadgeKind;
  label: string;
  tone: OfflineBadgeTone;
  icon?: OfflineBadgeIcon;
};

export type OfflineLeadFilter = "ALL" | "URGENT" | "VISIT" | "HANDOFF" | "HOT" | "QUALIFIED" | "FAILED";

export type OfflineLeadBadgeInput = {
  responsePriority?: string | null;
  visitRequested?: boolean | null;
  handoffNeeded?: boolean | null;
  leadTemperature?: string | null;
  qualifiedFlag?: boolean | null;
  counts?: { sent?: number | null; failed?: number | null; skipped?: number | null } | null;
  visitPreferences?: { period?: string | null; days?: string[] | null; time?: string | null } | null;
};

export type OfflineLeadActionSource = {
  policy?: { recommendedAction?: string | null } | null;
  handoff?: { recommendedAction?: string | null } | null;
  qualification?: { recommendedAction?: string | null } | null;
  operationalPlaybook?: { headline?: string | null } | null;
};

function formatVisitPreferencesShort(
  vp: { period?: string | null; days?: string[] | null; time?: string | null } | null | undefined,
): string {
  if (!vp) return "";
  return [
    vp.period ? String(vp.period) : null,
    Array.isArray(vp.days) && vp.days.length ? vp.days.join("/") : null,
    vp.time ? String(vp.time) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function pickPrimaryBadges(input: OfflineLeadBadgeInput, max = 3): OfflineBadge[] {
  const badges: OfflineBadge[] = [];

  const priority = String(input.responsePriority || "").toUpperCase();
  if (priority === "URGENT") {
    badges.push({ kind: "URGENT", label: "Urgente", tone: "rose", icon: "flame" });
  }

  if (input.visitRequested) {
    const vpText = formatVisitPreferencesShort(input.visitPreferences);
    badges.push({
      kind: "VISIT",
      label: vpText ? `Pediu visita · ${vpText}` : "Pediu visita",
      tone: "purple",
      icon: "calendar",
    });
  }

  if (input.handoffNeeded) {
    badges.push({ kind: "HANDOFF", label: "Precisa de você", tone: "amber", icon: "clock" });
  }

  const temp = String(input.leadTemperature || "").toUpperCase();
  if (temp === "HOT") {
    badges.push({ kind: "HOT", label: "Quente", tone: "teal", icon: "flame" });
  }

  if (input.qualifiedFlag) {
    badges.push({ kind: "QUALIFIED", label: "Qualificado", tone: "emerald", icon: "sparkles" });
  }

  const failed = Number(input.counts?.failed || 0);
  if (failed > 0) {
    badges.push({ kind: "FAILED", label: "Falhou", tone: "rose", icon: "alert" });
  }

  const sent = Number(input.counts?.sent || 0);
  const skipped = Number(input.counts?.skipped || 0);
  if (sent === 0 && failed === 0 && skipped > 0 && badges.length === 0) {
    badges.push({ kind: "SKIPPED", label: "Assistente pulou", tone: "gray" });
  }

  return badges.slice(0, max);
}

export function pickHeadlineAction(row: OfflineLeadActionSource): string | null {
  return (
    row.policy?.recommendedAction?.trim() ||
    row.handoff?.recommendedAction?.trim() ||
    row.qualification?.recommendedAction?.trim() ||
    row.operationalPlaybook?.headline?.trim() ||
    null
  );
}

export type OfflineLeadFilterInput = {
  qualification?: { responsePriority?: string | null; score?: number | null; dataCompleteness?: number | null; leadTemperature?: string | null } | null;
  visitRequested?: boolean | null;
  handoffNeeded?: boolean | null;
  counts?: { failed?: number | null } | null;
};

const QUALIFIED_COMPLETENESS_THRESHOLD = 70;

export function leadMatchesFilter(row: OfflineLeadFilterInput, filter: OfflineLeadFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "URGENT") {
    return String(row.qualification?.responsePriority || "").toUpperCase() === "URGENT";
  }
  if (filter === "VISIT") return Boolean(row.visitRequested);
  if (filter === "HANDOFF") return Boolean(row.handoffNeeded);
  if (filter === "HOT") {
    return String(row.qualification?.leadTemperature || "").toUpperCase() === "HOT";
  }
  if (filter === "QUALIFIED") {
    const completeness = Number(row.qualification?.dataCompleteness || 0);
    return completeness >= QUALIFIED_COMPLETENESS_THRESHOLD;
  }
  if (filter === "FAILED") {
    return Number(row.counts?.failed || 0) > 0;
  }
  return true;
}

export type OfflineSummaryCountsInput = {
  items?: Array<OfflineLeadFilterInput> | null;
  overviewSent?: number | null;
};

export function computeTopActionableCounts(input: OfflineSummaryCountsInput) {
  const items = Array.isArray(input.items) ? input.items : [];
  const urgent = items.filter((i) => leadMatchesFilter(i, "URGENT")).length;
  const handoff = items.filter((i) => leadMatchesFilter(i, "HANDOFF")).length;
  const visit = items.filter((i) => leadMatchesFilter(i, "VISIT")).length;
  const needsYou = items.filter(
    (i) => leadMatchesFilter(i, "URGENT") || leadMatchesFilter(i, "HANDOFF"),
  ).length;
  const sent = Number(input.overviewSent || 0);
  return { needsYou, urgent, handoff, visit, sent };
}

export function isLeadActionable(row: OfflineLeadFilterInput): boolean {
  return (
    leadMatchesFilter(row, "URGENT") ||
    leadMatchesFilter(row, "HANDOFF") ||
    leadMatchesFilter(row, "VISIT") ||
    leadMatchesFilter(row, "FAILED")
  );
}

const ACTION_PRIORITY: Record<OfflineLeadFilter, number> = {
  URGENT: 5,
  VISIT: 4,
  HANDOFF: 3,
  FAILED: 2,
  HOT: 1,
  QUALIFIED: 0,
  ALL: -1,
};

export function compareLeadsByActionability(a: OfflineLeadFilterInput, b: OfflineLeadFilterInput): number {
  const filters: OfflineLeadFilter[] = ["URGENT", "VISIT", "HANDOFF", "FAILED", "HOT", "QUALIFIED"];
  const score = (row: OfflineLeadFilterInput) =>
    filters.reduce((acc, f) => acc + (leadMatchesFilter(row, f) ? ACTION_PRIORITY[f] + 1 : 0), 0);
  return score(b) - score(a);
}

export const BADGE_TONE_CLASSES: Record<OfflineBadgeTone, string> = {
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  purple: "border-purple-200 bg-purple-50 text-purple-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  teal: "border-teal-200 bg-teal-50 text-teal-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  gray: "border-gray-200 bg-gray-50 text-gray-700",
};
