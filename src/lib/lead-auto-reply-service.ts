import { prisma } from "@/lib/prisma";
import { leadAutoReplyQueue } from "@/lib/queue/queues";
import { LeadEventService } from "@/lib/lead-event-service";
import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server";
import { applyOfflineAutoReplyGuardrails } from "@/lib/ai-guardrails";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WeekSchedule = Record<DayKey, DaySchedule>;

const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  mon: { enabled: true, start: "09:00", end: "18:00" },
  tue: { enabled: true, start: "09:00", end: "18:00" },
  wed: { enabled: true, start: "09:00", end: "18:00" },
  thu: { enabled: true, start: "09:00", end: "18:00" },
  fri: { enabled: true, start: "09:00", end: "18:00" },
  sat: { enabled: false, start: "09:00", end: "13:00" },
  sun: { enabled: false, start: "09:00", end: "13:00" },
};

function safeString(x: any) {
  const s = String(x ?? "").trim();
  return s;
}

function safeTimezone(tz: any) {
  const s = safeString(tz) || "America/Sao_Paulo";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: s }).format(new Date());
    return s;
  } catch {
    return "America/Sao_Paulo";
  }
}

function parseTimeToMinutes(s: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s || "").trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function weekdayToKey(weekday: string): DayKey | null {
  const w = String(weekday || "").toLowerCase();
  if (w.startsWith("mon")) return "mon";
  if (w.startsWith("tue")) return "tue";
  if (w.startsWith("wed")) return "wed";
  if (w.startsWith("thu")) return "thu";
  if (w.startsWith("fri")) return "fri";
  if (w.startsWith("sat")) return "sat";
  if (w.startsWith("sun")) return "sun";
  return null;
}

function getLocalParts(date: Date, timeZone: string): { dayKey: DayKey; minutes: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const weekday = parts.find((p) => p.type === "weekday")?.value || "";
    const hour = parts.find((p) => p.type === "hour")?.value || "";
    const minute = parts.find((p) => p.type === "minute")?.value || "";
    const dayKey = weekdayToKey(weekday);
    const h = parseInt(hour, 10);
    const mm = parseInt(minute, 10);
    if (!dayKey) return null;
    if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
    return { dayKey, minutes: h * 60 + mm };
  } catch {
    return null;
  }
}

export function normalizeWeekSchedule(input: any): WeekSchedule {
  const base: WeekSchedule = JSON.parse(JSON.stringify(DEFAULT_WEEK_SCHEDULE));
  if (!input || typeof input !== "object") return base;

  const keys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  for (const k of keys) {
    const row = (input as any)[k];
    if (!row || typeof row !== "object") continue;
    const enabled = typeof row.enabled === "boolean" ? row.enabled : base[k].enabled;
    const start = safeString(row.start) || base[k].start;
    const end = safeString(row.end) || base[k].end;
    if (parseTimeToMinutes(start) == null || parseTimeToMinutes(end) == null) continue;
    base[k] = { enabled, start, end };
  }

  return base;
}

export function isOutsideBusinessHours(params: { now: Date; timezone: string; schedule: WeekSchedule }) {
  const tz = safeTimezone(params.timezone);
  const local = getLocalParts(params.now, tz);
  if (!local) return true;
  const day = params.schedule[local.dayKey];
  if (!day?.enabled) return true;

  const startMin = parseTimeToMinutes(day.start);
  const endMin = parseTimeToMinutes(day.end);
  if (startMin == null || endMin == null) return true;

  if (startMin === endMin) return true;

  if (startMin < endMin) {
    return !(local.minutes >= startMin && local.minutes < endMin);
  }

  return local.minutes >= endMin && local.minutes < startMin;
}

async function callOpenAiText(params: { apiKey: string; systemPrompt: string; userPrompt: string }) {
  const model = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 260,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const json = (await res.json().catch(() => null)) as any;
    const content = safeString(json?.choices?.[0]?.message?.content);
    if (!content) return null;

    return { model, content };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class LeadAutoReplyService {
  static defaultWeekSchedule(): WeekSchedule {
    return JSON.parse(JSON.stringify(DEFAULT_WEEK_SCHEDULE));
  }

  static async getSettings(realtorId: string) {
    let row: any = null;
    try {
      row = await (prisma as any).realtorAutoReplySettings.findUnique({ where: { realtorId } });
    } catch (error: any) {
      if (error?.code === "P2021") {
        return {
          realtorId,
          enabled: false,
          timezone: "America/Sao_Paulo",
          weekSchedule: this.defaultWeekSchedule(),
          cooldownMinutes: 3,
          maxRepliesPerLeadPer24h: 6,
        };
      }
      throw error;
    }
    if (!row) {
      return {
        realtorId,
        enabled: false,
        timezone: "America/Sao_Paulo",
        weekSchedule: this.defaultWeekSchedule(),
        cooldownMinutes: 3,
        maxRepliesPerLeadPer24h: 6,
      };
    }

    return {
      realtorId,
      enabled: Boolean(row.enabled),
      timezone: safeTimezone(row.timezone),
      weekSchedule: normalizeWeekSchedule(row.weekSchedule),
      cooldownMinutes: typeof row.cooldownMinutes === "number" ? row.cooldownMinutes : 3,
      maxRepliesPerLeadPer24h: typeof row.maxRepliesPerLeadPer24h === "number" ? row.maxRepliesPerLeadPer24h : 6,
    };
  }

  static async upsertSettings(params: {
    realtorId: string;
    enabled: boolean;
    timezone: string;
    weekSchedule: WeekSchedule;
    cooldownMinutes: number;
    maxRepliesPerLeadPer24h: number;
  }) {
    const data = {
      realtorId: params.realtorId,
      enabled: Boolean(params.enabled),
      timezone: safeTimezone(params.timezone),
      weekSchedule: normalizeWeekSchedule(params.weekSchedule),
      cooldownMinutes: Math.max(1, Math.min(60, Math.floor(params.cooldownMinutes || 3))),
      maxRepliesPerLeadPer24h: Math.max(1, Math.min(30, Math.floor(params.maxRepliesPerLeadPer24h || 6))),
    };

    const res = await (prisma as any).realtorAutoReplySettings.upsert({
      where: { realtorId: params.realtorId },
      create: data,
      update: {
        enabled: data.enabled,
        timezone: data.timezone,
        weekSchedule: data.weekSchedule,
        cooldownMinutes: data.cooldownMinutes,
        maxRepliesPerLeadPer24h: data.maxRepliesPerLeadPer24h,
      },
    });

    return {
      realtorId: res.realtorId,
      enabled: Boolean(res.enabled),
      timezone: safeTimezone(res.timezone),
      weekSchedule: normalizeWeekSchedule(res.weekSchedule),
      cooldownMinutes: typeof res.cooldownMinutes === "number" ? res.cooldownMinutes : 3,
      maxRepliesPerLeadPer24h: typeof res.maxRepliesPerLeadPer24h === "number" ? res.maxRepliesPerLeadPer24h : 6,
    };
  }

  static async enqueueForClientMessage(params: { leadId: string; clientMessageId: string }) {
    const lead = await prisma.lead.findUnique({
      where: { id: params.leadId },
      select: { id: true, realtorId: true },
    });

    if (!lead?.realtorId) return { enqueued: false as const, reason: "NO_REALTOR" as const };

    const settings = await this.getSettings(lead.realtorId);
    if (!settings.enabled) return { enqueued: false as const, reason: "DISABLED" as const };

    const outside = isOutsideBusinessHours({
      now: new Date(),
      timezone: settings.timezone,
      schedule: settings.weekSchedule,
    });

    if (!outside) return { enqueued: false as const, reason: "WITHIN_BUSINESS_HOURS" as const };

    const jobRow = await (prisma as any).leadAutoReplyJob
      .create({
        data: {
          leadId: params.leadId,
          clientMessageId: params.clientMessageId,
        },
        select: { id: true, leadId: true, clientMessageId: true, status: true },
      })
      .catch(() => null);

    if (!jobRow) return { enqueued: false as const, reason: "DUPLICATE" as const };

    if (leadAutoReplyQueue) {
      await leadAutoReplyQueue
        .add(
          "lead-auto-reply",
          { clientMessageId: params.clientMessageId },
          {
            jobId: `lead-auto-reply:${params.clientMessageId}`,
            delay: 1500,
          }
        )
        .catch(() => null);
    }

    return { enqueued: true as const };
  }

  static async processByClientMessageId(clientMessageId: string) {
    const job = await (prisma as any).leadAutoReplyJob.findUnique({
      where: { clientMessageId },
    });

    if (!job) return { ok: false as const, status: "SKIPPED" as const, reason: "JOB_NOT_FOUND" };
    if (job.status !== "PENDING") return { ok: true as const, status: job.status as any };

    const locked = await (prisma as any).leadAutoReplyJob.updateMany({
      where: { clientMessageId, status: "PENDING" },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });

    if (!locked?.count) return { ok: true as const, status: "SKIPPED" as const, reason: "ALREADY_TAKEN" };

    const now = new Date();

    try {
      const msg = await prisma.leadClientMessage.findUnique({
        where: { id: clientMessageId },
        select: { id: true, leadId: true, fromClient: true, content: true, createdAt: true },
      });

      if (!msg || !msg.fromClient) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "NOT_A_CLIENT_MESSAGE", processedAt: now },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "NOT_A_CLIENT_MESSAGE" };
      }

      const lead = await prisma.lead.findUnique({
        where: { id: msg.leadId },
        select: {
          id: true,
          realtorId: true,
          contact: { select: { name: true } },
          property: {
            select: {
              title: true,
              city: true,
              state: true,
              neighborhood: true,
              price: true,
              hidePrice: true,
              type: true,
              purpose: true,
              bedrooms: true,
              bathrooms: true,
              areaM2: true,
            },
          },
        },
      });

      if (!lead?.realtorId) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "NO_REALTOR", processedAt: now },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "NO_REALTOR" };
      }

      const settings = await this.getSettings(lead.realtorId);
      if (!settings.enabled) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "DISABLED", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "DISABLED", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "DISABLED",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "DISABLED" };
      }

      const outside = isOutsideBusinessHours({ now, timezone: settings.timezone, schedule: settings.weekSchedule });
      if (!outside) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "WITHIN_BUSINESS_HOURS", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "WITHIN_BUSINESS_HOURS", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "WITHIN_BUSINESS_HOURS",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "WITHIN_BUSINESS_HOURS" };
      }

      const lastOverall = await prisma.leadClientMessage.findFirst({
        where: { leadId: lead.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, fromClient: true },
      });

      if (!lastOverall || lastOverall.id !== clientMessageId) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "NOT_LATEST_MESSAGE", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "NOT_LATEST_MESSAGE", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "NOT_LATEST_MESSAGE",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "NOT_LATEST_MESSAGE" };
      }

      const humanAfter = await (prisma as any).leadClientMessage.findFirst({
        where: { leadId: lead.id, fromClient: false, createdAt: { gt: msg.createdAt }, source: "HUMAN" as any },
        select: { id: true },
      });

      if (humanAfter?.id) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "HUMAN_ALREADY_REPLIED", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "HUMAN_ALREADY_REPLIED", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "HUMAN_ALREADY_REPLIED",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "HUMAN_ALREADY_REPLIED" };
      }

      const lastAi = await (prisma as any).leadClientMessage.findFirst({
        where: { leadId: lead.id, fromClient: false, source: "AUTO_REPLY_AI" as any },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      if (lastAi?.createdAt) {
        const cooldownMs = settings.cooldownMinutes * 60_000;
        if (now.getTime() - new Date(lastAi.createdAt).getTime() < cooldownMs) {
          await (prisma as any).leadAutoReplyJob.update({
            where: { clientMessageId },
            data: { status: "SKIPPED", skipReason: "COOLDOWN", processedAt: now },
          });
          await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "COOLDOWN", clientMessageId });
          await (prisma as any).leadAutoReplyLog.create({
            data: {
              leadId: lead.id,
              realtorId: lead.realtorId,
              clientMessageId,
              decision: "SKIPPED",
              reason: "COOLDOWN",
            },
          });
          return { ok: true as const, status: "SKIPPED" as const, reason: "COOLDOWN" };
        }
      }

      const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const aiCount = await (prisma as any).leadClientMessage.count({
        where: { leadId: lead.id, fromClient: false, source: "AUTO_REPLY_AI" as any, createdAt: { gte: since24h } },
      });

      if (aiCount >= settings.maxRepliesPerLeadPer24h) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "RATE_LIMIT", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "RATE_LIMIT", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "RATE_LIMIT",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "RATE_LIMIT" };
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "SKIPPED", skipReason: "OPENAI_API_KEY_MISSING", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_SKIPPED", { reason: "OPENAI_API_KEY_MISSING", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "SKIPPED",
            reason: "OPENAI_API_KEY_MISSING",
          },
        });
        return { ok: true as const, status: "SKIPPED" as const, reason: "OPENAI_API_KEY_MISSING" };
      }

      const recent = await prisma.leadClientMessage.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { fromClient: true, content: true, createdAt: true },
      });

      const history = recent
        .slice()
        .reverse()
        .map((m) => `${m.fromClient ? "Cliente" : "Corretor"}: ${safeString(m.content)}`)
        .filter(Boolean)
        .join("\n");

      const clientName = safeString(lead.contact?.name) || "";
      const propertyTitle = safeString(lead.property?.title) || "";
      const city = safeString(lead.property?.city) || "";
      const state = safeString(lead.property?.state) || "";
      const neighborhood = safeString(lead.property?.neighborhood) || "";
      const type = safeString(lead.property?.type) || "";
      const purpose = safeString(lead.property?.purpose) || "";
      const bedrooms = typeof lead.property?.bedrooms === "number" ? String(lead.property.bedrooms) : "";
      const bathrooms = typeof lead.property?.bathrooms === "number" ? String(lead.property.bathrooms) : "";
      const areaM2 = typeof lead.property?.areaM2 === "number" ? String(lead.property.areaM2) : "";

      const price =
        lead.property?.hidePrice || typeof lead.property?.price !== "number"
          ? "Consulte"
          : `R$ ${(lead.property.price / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

      const systemPrompt =
        "Você é um assistente de atendimento do chat do site (pt-BR) para corretores de imóveis no Brasil.\n" +
        "Você está respondendo enquanto o corretor está offline (fora do horário comercial configurado).\n" +
        "Objetivo: manter o cliente engajado, esclarecer dúvidas básicas do imóvel usando SOMENTE os dados fornecidos e fazer 1 pergunta curta para qualificar.\n" +
        "Regras: não invente informações, não use links/telefone, não agende visitas, não sugira horários, não prometa retorno em X minutos.\n" +
        "Responda de forma curta, humana e direta (máximo ~5 linhas).";

      const lines: string[] = [];
      if (clientName) lines.push(`Nome do cliente: ${clientName}`);
      if (propertyTitle) lines.push(`Imóvel: ${propertyTitle}`);
      if (city || state) lines.push(`Local: ${[neighborhood, city, state].filter(Boolean).join(" - ")}`);
      if (type) lines.push(`Tipo: ${type}`);
      if (purpose) lines.push(`Finalidade: ${purpose}`);
      lines.push(`Preço: ${price}`);
      if (bedrooms) lines.push(`Quartos: ${bedrooms}`);
      if (bathrooms) lines.push(`Banheiros: ${bathrooms}`);
      if (areaM2) lines.push(`Área: ${areaM2} m²`);

      const userPrompt =
        lines.join("\n") +
        "\n\nHistórico recente do chat:\n" +
        (history || "(sem histórico)") +
        "\n\nAgora escreva a resposta para o cliente.";

      const ai = await callOpenAiText({ apiKey, systemPrompt, userPrompt });
      const draft = ai
        ? applyOfflineAutoReplyGuardrails({
            draft: ai.content,
            clientName,
            propertyTitle,
          })
        : "";

      if (!draft) {
        await (prisma as any).leadAutoReplyJob.update({
          where: { clientMessageId },
          data: { status: "FAILED", lastError: "EMPTY_AI_OUTPUT", processedAt: now },
        });
        await this.safeEvent(lead.id, "AUTO_REPLY_FAILED", { reason: "EMPTY_AI_OUTPUT", clientMessageId });
        await (prisma as any).leadAutoReplyLog.create({
          data: {
            leadId: lead.id,
            realtorId: lead.realtorId,
            clientMessageId,
            decision: "FAILED",
            reason: "EMPTY_AI_OUTPUT",
            model: ai?.model || null,
            promptVersion: "v1",
          },
        });
        return { ok: false as const, status: "FAILED" as const, reason: "EMPTY_AI_OUTPUT" };
      }

      const assistantMessage = await (prisma as any).leadClientMessage.create({
        data: {
          leadId: lead.id,
          fromClient: false,
          content: draft,
          source: "AUTO_REPLY_AI" as any,
        },
        select: { id: true, content: true, createdAt: true },
      });

      await (prisma as any).leadAutoReplyJob.update({
        where: { clientMessageId },
        data: { status: "SENT", processedAt: now },
      });

      await (prisma as any).leadAutoReplyLog.create({
        data: {
          leadId: lead.id,
          realtorId: lead.realtorId,
          clientMessageId,
          assistantMessageId: assistantMessage.id,
          decision: "SENT",
          reason: null,
          model: ai?.model || null,
          promptVersion: "v1",
        },
      });

      await this.safeEvent(lead.id, "AUTO_REPLY_SENT", {
        clientMessageId,
        assistantMessageId: assistantMessage.id,
        model: ai?.model || null,
      });

      try {
        const pusher = getPusherServer();
        await pusher.trigger(PUSHER_CHANNELS.CHAT(lead.id), PUSHER_EVENTS.NEW_CHAT_MESSAGE, {
          id: assistantMessage.id,
          leadId: lead.id,
          fromClient: false,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
        });
      } catch {}

      return { ok: true as const, status: "SENT" as const };
    } catch (error: any) {
      const now2 = new Date();
      const err = safeString(error?.message || error);
      await (prisma as any).leadAutoReplyJob
        .update({
          where: { clientMessageId },
          data: { status: "FAILED", lastError: err.slice(0, 500) || "ERROR", processedAt: now2 },
        })
        .catch(() => null);

      await this.safeEvent(job.leadId, "AUTO_REPLY_FAILED", { reason: "ERROR", clientMessageId });

      try {
        const lead = await prisma.lead.findUnique({ where: { id: job.leadId }, select: { realtorId: true } });
        if (lead?.realtorId) {
          await (prisma as any).leadAutoReplyLog.create({
            data: {
              leadId: job.leadId,
              realtorId: lead.realtorId,
              clientMessageId,
              decision: "FAILED",
              reason: "ERROR",
              model: null,
              promptVersion: "v1",
            },
          });
        }
      } catch {
      }

      return { ok: false as const, status: "FAILED" as const, reason: "ERROR" };
    }
  }

  private static async safeEvent(leadId: string, type: any, metadata: Record<string, any>) {
    try {
      await LeadEventService.record({
        leadId,
        type,
        title: String(type),
        metadata,
      });
    } catch {}
  }
}
