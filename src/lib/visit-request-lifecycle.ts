type VisitRequestPreferences = {
  period?: string | null;
  days?: string[] | null;
  time?: string | null;
};

export type VisitRequestKind =
  | "INITIAL"
  | "PREFERENCES_UPDATED"
  | "RESCHEDULE"
  | "CANCEL_REQUEST"
  | "FOLLOW_UP"
  | "DIRECT_SCHEDULED";

export type VisitRequestEventMeta = {
  clientMessageId: string | null;
  source: string | null;
  promptVersion: string | null;
  requestKind: VisitRequestKind;
  requestVersion: number;
  requestText: string | null;
  requestPreview: string | null;
  requestedAt: string | null;
  explicitVisitDate: string | null;
  explicitVisitTime: string | null;
  preferences: VisitRequestPreferences | null;
};

function safeString(value: any) {
  return String(value ?? "").trim();
}

function safeDate(value: any): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeTextForMatch(input: string) {
  const raw = String(input || "").toLowerCase();
  try {
    return raw.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  } catch {
    return raw;
  }
}

function includesAny(text: string, patterns: Array<string | RegExp>) {
  for (const pattern of patterns) {
    if (typeof pattern === "string") {
      if (text.includes(pattern)) return true;
      continue;
    }
    if (pattern.test(text)) return true;
  }
  return false;
}

function clipText(value: string | null | undefined, max = 140) {
  const text = safeString(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1)).trim()}…` : text;
}

export function normalizeVisitRequestPreferences(input: any): VisitRequestPreferences | null {
  const raw = input && typeof input === "object" ? input : null;
  if (!raw) return null;

  const period = safeString((raw as any)?.period) || null;
  const time = safeString((raw as any)?.time) || null;
  const days: string[] = Array.isArray((raw as any)?.days)
    ? Array.from(new Set((raw as any).days.map((item: any) => safeString(item)).filter(Boolean))) as string[]
    : [];

  if (!period && !time && days.length === 0) return null;

  return {
    period,
    time,
    days: days.length > 0 ? days : null,
  };
}

export function hasVisitRequestPreferences(input: any) {
  const prefs = normalizeVisitRequestPreferences(input);
  return Boolean(prefs?.period || prefs?.time || (prefs?.days && prefs.days.length));
}

function formatVisitDateLabel(dateValue: any) {
  const date = safeDate(dateValue);
  if (!date) return "";
  try {
    return date
      .toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      })
      .replace(/\./g, "")
      .replace(/,/g, "")
      .trim();
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatVisitRequestPreferencesText(input: any, opts?: { separator?: string }) {
  const prefs = normalizeVisitRequestPreferences(input);
  if (!prefs) return "";
  const separator = opts?.separator || " | ";
  return [prefs.period || "", prefs.time || "", prefs.days?.length ? prefs.days.join(", ") : ""]
    .filter(Boolean)
    .join(separator);
}

export function formatVisitRequestScheduleText(params: { explicitVisitDate?: any; explicitVisitTime?: any }) {
  const dateLabel = formatVisitDateLabel(params.explicitVisitDate);
  const timeLabel = safeString(params.explicitVisitTime);
  if (!dateLabel && !timeLabel) return "";
  if (dateLabel && timeLabel) return `${dateLabel} às ${timeLabel}`;
  return dateLabel || timeLabel;
}

export function detectVisitRequestKind(params: {
  hasPreviousRequest: boolean;
  messageText?: string | null;
  preferences?: any;
  explicitVisitDate?: any;
  explicitVisitTime?: any;
}) : VisitRequestKind {
  const message = normalizeTextForMatch(safeString(params.messageText));
  const hasExplicitSlot = Boolean(safeDate(params.explicitVisitDate) || safeString(params.explicitVisitTime));
  const hasPreferences = hasVisitRequestPreferences(params.preferences);

  if (includesAny(message, [
    "cancelar visita",
    "cancelar a visita",
    "desmarcar visita",
    "desmarcar a visita",
    "nao quero mais visitar",
    "não quero mais visitar",
    "cancelar horario",
    "cancelar horário",
  ])) {
    return "CANCEL_REQUEST";
  }

  if (includesAny(message, [
    "remarcar",
    "reagendar",
    "mudar horario",
    "mudar horário",
    "trocar horario",
    "trocar horário",
    "outro horario",
    "outro horário",
    "outra hora",
    "outro dia",
    "adiar visita",
    "antecipar visita",
  ])) {
    return "RESCHEDULE";
  }

  if (!params.hasPreviousRequest && hasExplicitSlot) {
    return "DIRECT_SCHEDULED";
  }

  if (!params.hasPreviousRequest) {
    return "INITIAL";
  }

  if (hasPreferences || hasExplicitSlot) {
    return "PREFERENCES_UPDATED";
  }

  return "FOLLOW_UP";
}

export function shouldPersistVisitRequestEvent(params: {
  hasPreviousRequest: boolean;
  messageText?: string | null;
  preferences?: any;
  explicitVisitDate?: any;
  explicitVisitTime?: any;
}) {
  const kind = detectVisitRequestKind(params);
  if (!params.hasPreviousRequest) return true;
  if (hasVisitRequestPreferences(params.preferences)) return true;
  if (safeDate(params.explicitVisitDate) || safeString(params.explicitVisitTime)) return true;
  return kind === "RESCHEDULE" || kind === "CANCEL_REQUEST";
}

export function readVisitRequestEventMeta(meta: any): VisitRequestEventMeta {
  const prefs = normalizeVisitRequestPreferences((meta as any)?.preferences || (meta as any)?.prefs || null);
  const explicitVisitDate = safeDate((meta as any)?.explicitVisitDate || (meta as any)?.visitDate);
  const explicitVisitTime = safeString((meta as any)?.explicitVisitTime || (meta as any)?.visitTime) || null;
  const requestKindRaw = safeString((meta as any)?.requestKind).toUpperCase();
  const requestKind = (
    requestKindRaw === "INITIAL" ||
    requestKindRaw === "PREFERENCES_UPDATED" ||
    requestKindRaw === "RESCHEDULE" ||
    requestKindRaw === "CANCEL_REQUEST" ||
    requestKindRaw === "FOLLOW_UP" ||
    requestKindRaw === "DIRECT_SCHEDULED"
      ? requestKindRaw
      : explicitVisitDate || explicitVisitTime
        ? "DIRECT_SCHEDULED"
        : "INITIAL"
  ) as VisitRequestKind;

  const requestText = safeString((meta as any)?.requestText) || null;
  const requestPreview = clipText(safeString((meta as any)?.requestPreview) || requestText || null) || null;
  const requestVersionRaw = Number((meta as any)?.requestVersion);
  const requestVersion = Number.isFinite(requestVersionRaw) && requestVersionRaw > 0 ? Math.floor(requestVersionRaw) : 1;
  const requestedAt = safeDate((meta as any)?.requestedAt);

  return {
    clientMessageId: safeString((meta as any)?.clientMessageId) || null,
    source: safeString((meta as any)?.source) || null,
    promptVersion: safeString((meta as any)?.promptVersion) || null,
    requestKind,
    requestVersion,
    requestText,
    requestPreview,
    requestedAt: requestedAt ? requestedAt.toISOString() : null,
    explicitVisitDate: explicitVisitDate ? explicitVisitDate.toISOString() : null,
    explicitVisitTime,
    preferences: prefs,
  };
}

export function evaluateVisitRequestState(params: {
  requestedAt?: any;
  confirmedAt?: any;
  rejectedAt?: any;
  leadVisitDate?: any;
  ownerApproved?: boolean | null;
}) {
  const requestedAt = safeDate(params.requestedAt);
  const confirmedAt = safeDate(params.confirmedAt);
  const rejectedAt = safeDate(params.rejectedAt);
  const leadVisitDate = safeDate(params.leadVisitDate);
  const ownerApproved = typeof params.ownerApproved === "boolean" ? params.ownerApproved : params.ownerApproved ?? null;

  const isConfirmedAfterRequest = Boolean(
    requestedAt && confirmedAt && confirmedAt.getTime() > requestedAt.getTime() && (!rejectedAt || confirmedAt.getTime() >= rejectedAt.getTime())
  );
  const isRejectedAfterRequest = Boolean(
    requestedAt && rejectedAt && rejectedAt.getTime() > requestedAt.getTime() && (!confirmedAt || rejectedAt.getTime() > confirmedAt.getTime())
  );
  const hasScheduledVisitOnLead = Boolean(leadVisitDate && ownerApproved !== false && !isRejectedAfterRequest);
  const isPending = Boolean(requestedAt && !isConfirmedAfterRequest && (!hasScheduledVisitOnLead || isRejectedAfterRequest));

  return {
    requestedAt,
    confirmedAt,
    rejectedAt,
    leadVisitDate,
    ownerApproved,
    isConfirmedAfterRequest,
    isRejectedAfterRequest,
    hasScheduledVisitOnLead,
    isPending,
  };
}

function buildDefaultVisitRequestText(params: { requestKind: VisitRequestKind; explicitVisitDate?: any; explicitVisitTime?: any }) {
  const scheduleText = formatVisitRequestScheduleText(params);
  if (!scheduleText) return "";
  if (params.requestKind === "RESCHEDULE") return `Cliente pediu para remarcar a visita para ${scheduleText}.`;
  if (params.requestKind === "CANCEL_REQUEST") return `Cliente pediu para cancelar a visita marcada para ${scheduleText}.`;
  return `Cliente pediu visita para ${scheduleText}.`;
}

export function buildVisitRequestEventMetadata(params: {
  previousMetadata?: any;
  clientMessageId?: string | null;
  messageText?: string | null;
  preferences?: any;
  source?: string | null;
  promptVersion?: string | null;
  createdAt?: any;
  explicitVisitDate?: any;
  explicitVisitTime?: any;
  requestKind?: VisitRequestKind | null;
}) {
  const previous = readVisitRequestEventMeta(params.previousMetadata || null);
  const hasPreviousRequest = Boolean(previous.requestVersion || previous.requestText || previous.clientMessageId || previous.requestedAt);
  const requestKind = params.requestKind || detectVisitRequestKind({
    hasPreviousRequest,
    messageText: params.messageText,
    preferences: params.preferences,
    explicitVisitDate: params.explicitVisitDate,
    explicitVisitTime: params.explicitVisitTime,
  });
  const requestText = safeString(params.messageText) || buildDefaultVisitRequestText({
    requestKind,
    explicitVisitDate: params.explicitVisitDate,
    explicitVisitTime: params.explicitVisitTime,
  }) || null;
  const requestedAt = safeDate(params.createdAt);
  const explicitVisitDate = safeDate(params.explicitVisitDate);
  const explicitVisitTime = safeString(params.explicitVisitTime) || null;

  return {
    clientMessageId: safeString(params.clientMessageId) || null,
    source: safeString(params.source) || previous.source || null,
    promptVersion: safeString(params.promptVersion) || previous.promptVersion || null,
    preferences: normalizeVisitRequestPreferences(params.preferences),
    requestKind,
    requestVersion: hasPreviousRequest ? previous.requestVersion + 1 : 1,
    requestText,
    requestPreview: clipText(requestText || null) || null,
    requestedAt: requestedAt ? requestedAt.toISOString() : null,
    explicitVisitDate: explicitVisitDate ? explicitVisitDate.toISOString() : null,
    explicitVisitTime,
  };
}

export function getVisitRequestTitle(params: { kind?: VisitRequestKind | null; rejectedByOwner?: boolean }) {
  if (params.rejectedByOwner) return "Remarcação de visita";
  if (params.kind === "RESCHEDULE") return "Remarcação de visita";
  if (params.kind === "CANCEL_REQUEST") return "Pedido sobre visita";
  if (params.kind === "PREFERENCES_UPDATED" || params.kind === "FOLLOW_UP") return "Atualização de visita";
  return "Solicitação de visita";
}

export function buildVisitRequestCardCopy(params: {
  metadata?: any;
  fallbackRequestText?: string | null;
  rejectedByOwner?: boolean;
  rejectionReason?: string | null;
}) {
  const meta = readVisitRequestEventMeta(params.metadata || null);
  const title = getVisitRequestTitle({ kind: meta.requestKind, rejectedByOwner: params.rejectedByOwner });
  const prefsText = formatVisitRequestPreferencesText(meta.preferences);
  const scheduleText = formatVisitRequestScheduleText({
    explicitVisitDate: meta.explicitVisitDate,
    explicitVisitTime: meta.explicitVisitTime,
  });
  const requestText = clipText(meta.requestText || params.fallbackRequestText || null) || "";

  const segments: string[] = [];
  if (params.rejectedByOwner) {
    segments.push("O horário anterior da visita foi recusado.");
    if (safeString(params.rejectionReason)) {
      segments.push(`Motivo: ${safeString(params.rejectionReason)}.`);
    }
    segments.push("Alinhe uma nova opção com o cliente.");
  } else if (meta.requestKind === "RESCHEDULE") {
    segments.push("Cliente pediu para remarcar a visita.");
  } else if (meta.requestKind === "CANCEL_REQUEST") {
    segments.push("Cliente pediu para cancelar ou revisar a visita.");
  } else if (meta.requestKind === "PREFERENCES_UPDATED" || meta.requestKind === "FOLLOW_UP") {
    segments.push("Cliente atualizou a solicitação de visita.");
  } else {
    segments.push("Solicitação de visita.");
  }

  if (prefsText) {
    segments.push(`Preferências: ${prefsText}.`);
  } else if (scheduleText) {
    segments.push(`Janela solicitada: ${scheduleText}.`);
  }

  if (requestText) {
    segments.push(`Pedido: “${requestText}”`);
  }

  if (meta.requestVersion > 1) {
    segments.push(`Atualização #${meta.requestVersion}.`);
  }

  return {
    title,
    message: segments.join(" ").replace(/\s+/g, " ").trim(),
    meta,
  };
}
