import { prisma } from "@/lib/prisma";
import { getPusherServer, PUSHER_CHANNELS } from "@/lib/pusher-server";

type AssistantAction = {
  type: string;
  [key: string]: any;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMinutes(d: Date, minutes: number) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + minutes);
  return x;
}

function safeDate(value: any): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function impactScoreForItem(item: any, now: Date): number {
  const priority = String(item?.priority || "");
  const base = priority === "HIGH" ? 60 : priority === "MEDIUM" ? 30 : 10;

  const dueAt = safeDate(item?.dueAt);
  const snoozedUntil = safeDate(item?.snoozedUntil);

  // Penaliza itens efetivamente sonegados no futuro, pra não poluir o topo.
  if (String(item?.status) === "SNOOZED" && snoozedUntil && snoozedUntil.getTime() > now.getTime()) {
    return Math.max(0, base - 20);
  }

  let urgency = 0;
  if (dueAt) {
    const deltaMs = dueAt.getTime() - now.getTime();
    if (deltaMs <= 0) urgency += 40;
    else if (deltaMs <= 15 * 60 * 1000) urgency += 30;
    else if (deltaMs <= 60 * 60 * 1000) urgency += 18;
    else if (deltaMs <= 24 * 60 * 60 * 1000) urgency += 8;
  }

  const type = String(item?.type || "");
  let typeWeight = 0;
  if (type === "UNANSWERED_CLIENT_MESSAGE") typeWeight = 30;
  else if (type === "VISIT_TODAY") typeWeight = 25;
  else if (type === "OWNER_APPROVAL_PENDING") typeWeight = 22;
  else if (type === "REMINDER_OVERDUE") typeWeight = 18;
  else if (type === "LEAD_NO_FIRST_CONTACT") typeWeight = 16;
  else if (type === "STALE_LEAD") typeWeight = 10;
  else if (type === "NEW_LEAD") typeWeight = 12;
  else if (type === "WEEKLY_SUMMARY") typeWeight = 0;

  return base + urgency + typeWeight;
}

export class RealtorAssistantService {
  static async emitUpdated(realtorId: string) {
    try {
      const pusher = getPusherServer();
      await pusher.trigger(PUSHER_CHANNELS.REALTOR(realtorId), "assistant-updated", {
        realtorId,
        ts: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }

  static async list(realtorId: string, options?: { leadId?: string | null }) {
    const now = new Date();

    const where: any = {
      realtorId,
      status: { in: ["ACTIVE", "SNOOZED"] },
    };

    if (options?.leadId) {
      where.leadId = options.leadId;
    }

    const items = await (prisma as any).realtorAssistantItem.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    const normalized = (items || []).map((item: any) => {
      if (item?.status === "SNOOZED" && item?.snoozedUntil) {
        const until = new Date(item.snoozedUntil);
        if (!Number.isNaN(until.getTime()) && until.getTime() <= now.getTime()) {
          return { ...item, status: "ACTIVE", snoozedUntil: null };
        }
      }
      return item;
    });

    const leadIds = Array.from(
      new Set(
        normalized
          .map((i: any) => (i?.leadId ? String(i.leadId) : null))
          .filter(Boolean)
      )
    ) as string[];

    const leadRows = leadIds.length
      ? await prisma.lead.findMany({
          where: { id: { in: leadIds }, realtorId },
          select: {
            id: true,
            status: true,
            pipelineStage: true,
            contact: { select: { name: true } },
            property: { select: { title: true } },
          },
        })
      : [];

    const leadMap = new Map<string, any>(
      (leadRows || []).map((l: any) => [
        String(l.id),
        {
          id: String(l.id),
          status: l.status || null,
          pipelineStage: l.pipelineStage || null,
          clientName: l?.contact?.name || null,
          propertyTitle: l?.property?.title || null,
        },
      ])
    );

    const enriched = normalized.map((item: any) => {
      const impactScore = impactScoreForItem(item, now);
      const lead = item?.leadId ? leadMap.get(String(item.leadId)) || null : null;
      return { ...item, impactScore, lead };
    });

    enriched.sort((a: any, b: any) => {
      const sa = typeof a.impactScore === "number" ? a.impactScore : 0;
      const sb = typeof b.impactScore === "number" ? b.impactScore : 0;
      if (sb !== sa) return sb - sa;

      const da = safeDate(a?.dueAt);
      const db = safeDate(b?.dueAt);
      const ta = da ? da.getTime() : Number.POSITIVE_INFINITY;
      const tb = db ? db.getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;

      const ca = safeDate(a?.createdAt);
      const cb = safeDate(b?.createdAt);
      return (cb?.getTime() || 0) - (ca?.getTime() || 0);
    });

    return enriched;
  }

  static async resolve(realtorId: string, itemId: string) {
    const existing = await (prisma as any).realtorAssistantItem.findFirst({
      where: { id: itemId, realtorId },
      select: { id: true },
    });
    if (!existing) throw new Error("FORBIDDEN");

    const updated = await (prisma as any).realtorAssistantItem.update({
      where: { id: itemId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        snoozedUntil: null,
      },
    });

    await this.emitUpdated(realtorId);
    return updated;
  }

  static async dismiss(realtorId: string, itemId: string) {
    const existing = await (prisma as any).realtorAssistantItem.findFirst({
      where: { id: itemId, realtorId },
      select: { id: true },
    });
    if (!existing) throw new Error("FORBIDDEN");

    const updated = await (prisma as any).realtorAssistantItem.update({
      where: { id: itemId },
      data: {
        status: "DISMISSED",
        dismissedAt: new Date(),
        snoozedUntil: null,
      },
    });

    await this.emitUpdated(realtorId);
    return updated;
  }

  static async snooze(realtorId: string, itemId: string, minutes: number) {
    const until = new Date();
    until.setMinutes(until.getMinutes() + Math.max(5, Math.min(7 * 24 * 60, minutes)));

    const existing = await (prisma as any).realtorAssistantItem.findFirst({
      where: { id: itemId, realtorId },
      select: { id: true },
    });
    if (!existing) throw new Error("FORBIDDEN");

    const updated = await (prisma as any).realtorAssistantItem.update({
      where: { id: itemId },
      data: {
        status: "SNOOZED",
        snoozedUntil: until,
      },
    });

    await this.emitUpdated(realtorId);
    return updated;
  }

  static async upsertFromRule(params: {
    realtorId: string;
    leadId?: string | null;
    type: any;
    priority: any;
    title: string;
    message: string;
    dueAt?: Date | null;
    dedupeKey: string;
    primaryAction?: AssistantAction | null;
    secondaryAction?: AssistantAction | null;
    metadata?: Record<string, any> | null;
  }) {
    const now = new Date();

    const fingerprint = JSON.stringify({
      type: params.type,
      dueAt: params.dueAt ? params.dueAt.toISOString() : null,
      title: params.title,
      message: params.message,
      primaryAction: (params.primaryAction as any) ?? null,
      secondaryAction: (params.secondaryAction as any) ?? null,
      metadata: (params.metadata as any) ?? null,
    });

    const nextMetadata: any = {
      ...((params.metadata as any) ?? null),
      _fingerprint: fingerprint,
    };

    const existing = await (prisma as any).realtorAssistantItem.findUnique({
      where: {
        realtorId_dedupeKey: {
          realtorId: params.realtorId,
          dedupeKey: params.dedupeKey,
        },
      },
      select: {
        id: true,
        status: true,
        snoozedUntil: true,
        metadata: true,
      },
    });

    if (!existing) {
      return await (prisma as any).realtorAssistantItem.create({
        data: {
          realtorId: params.realtorId,
          leadId: params.leadId ?? null,
          type: params.type,
          priority: params.priority,
          status: "ACTIVE",
          source: "RULE",
          title: params.title,
          message: params.message,
          dueAt: params.dueAt ?? null,
          primaryAction: (params.primaryAction as any) ?? null,
          secondaryAction: (params.secondaryAction as any) ?? null,
          metadata: nextMetadata,
          dedupeKey: params.dedupeKey,
        },
      });
    }

    const prevFingerprint = (existing as any)?.metadata?._fingerprint;
    const isNewTrigger = prevFingerprint !== fingerprint;

    const snoozedUntil = existing.snoozedUntil ? new Date(existing.snoozedUntil) : null;
    const isSnoozedInFuture = !!(snoozedUntil && !Number.isNaN(snoozedUntil.getTime()) && snoozedUntil.getTime() > now.getTime());

    const shouldKeepSnoozed = existing.status === "SNOOZED" && isSnoozedInFuture && !isNewTrigger;
    const shouldKeepClosed = (existing.status === "RESOLVED" || existing.status === "DISMISSED") && !isNewTrigger;

    const statusUpdate: any = {};
    if (!shouldKeepSnoozed && !shouldKeepClosed) {
      statusUpdate.status = "ACTIVE";
      statusUpdate.resolvedAt = null;
      statusUpdate.dismissedAt = null;
      statusUpdate.snoozedUntil = null;
    }

    const updated = await (prisma as any).realtorAssistantItem.update({
      where: { id: existing.id },
      data: {
        leadId: params.leadId ?? null,
        type: params.type,
        priority: params.priority,
        title: params.title,
        message: params.message,
        dueAt: params.dueAt ?? null,
        primaryAction: (params.primaryAction as any) ?? null,
        secondaryAction: (params.secondaryAction as any) ?? null,
        metadata: nextMetadata,
        ...statusUpdate,
      },
    });

    return updated;
  }

  static async recalculateForRealtor(realtorId: string) {
    const now = new Date();
    const today = startOfDay(now);
    const recentClientThreshold = addDays(now, -14);

    const leads = await prisma.lead.findMany({
      where: {
        realtorId,
        OR: [
          {
            status: {
              in: [
                "RESERVED",
                "ACCEPTED",
                "WAITING_REALTOR_ACCEPT",
                "WAITING_OWNER_APPROVAL",
                "CONFIRMED",
              ] as any,
            },
          },
          {
            clientMessages: {
              some: {
                fromClient: true,
                createdAt: { gte: recentClientThreshold },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        pipelineStage: true,
        nextActionDate: true,
        nextActionNote: true,
        visitDate: true,
        visitTime: true,
        ownerApproved: true,
        property: {
          select: {
            title: true,
          },
        },
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    const leadIds = leads.map((l) => l.id);

    const leadCreatedEvents = await (prisma as any).leadEvent.findMany({
      where: {
        leadId: { in: leadIds },
        type: "LEAD_CREATED",
      },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, metadata: true },
    });
    const leadSourceMap = new Map<string, any>(
      (leadCreatedEvents || []).map((e: any) => [e.leadId, e.metadata || null])
    );

    const lastNotes = await prisma.leadNote.findMany({
      where: { leadId: { in: leadIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastNoteMap = new Map(lastNotes.map((n) => [n.leadId, n.createdAt]));

    const lastInternalMessages = await prisma.leadMessage.findMany({
      where: { leadId: { in: leadIds }, senderId: realtorId },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastInternalMsgMap = new Map(lastInternalMessages.map((m) => [m.leadId, m.createdAt]));

    const lastProChat = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: false },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastProChatMap = new Map(lastProChat.map((m) => [m.leadId, m.createdAt]));

    const firstClientMessages = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: true },
      orderBy: { createdAt: "asc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true, content: true },
    });
    const firstClientMsgMap = new Map(
      (firstClientMessages || []).map((m: any) => [m.leadId, { createdAt: m.createdAt, content: m.content }])
    );

    const lastClientMessages = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: true },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true, content: true },
    });
    const lastClientMsgMap = new Map(
      (lastClientMessages || []).map((m: any) => [m.leadId, { createdAt: m.createdAt, content: m.content }])
    );

    const recentClientMessages = await prisma.leadClientMessage.findMany({
      where: {
        leadId: { in: leadIds },
        fromClient: true,
        createdAt: { gte: addDays(now, -14) },
      },
      orderBy: { createdAt: "asc" },
      select: { leadId: true, createdAt: true, content: true },
    });

    const dedupeKeys = new Set<string>();

    const SLA_MINUTES_BY_CHANNEL: Record<string, number> = {
      CHAT: 15,
      FORM: 30,
      WHATSAPP: 60,
    };

    const channelLabel: Record<string, string> = {
      CHAT: "Chat",
      FORM: "Formulário",
      WHATSAPP: "WhatsApp",
    };

    for (const lead of leads) {
      const propertyTitle = lead.property?.title || "Imóvel";
      const clientName = lead.contact?.name || "Cliente";

      if (lead.status === "RESERVED") {
        const key = `NEW_LEAD:${lead.id}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          realtorId,
          leadId: lead.id,
          type: "NEW_LEAD",
          priority: "HIGH",
          title: "Novo lead aguardando sua decisão",
          message: `${clientName} pediu informações sobre ${propertyTitle}.`,
          dueAt: null,
          dedupeKey: key,
          primaryAction: { type: "OPEN_CHAT", leadId: lead.id },
          secondaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          metadata: { status: lead.status },
        });
      }

      if (lead.nextActionDate) {
        const d = new Date(lead.nextActionDate);
        if (!Number.isNaN(d.getTime())) {
          if (d < today) {
            const key = `REMINDER_OVERDUE:${lead.id}:${startOfDay(d).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              realtorId,
              leadId: lead.id,
              type: "REMINDER_OVERDUE",
              priority: "HIGH",
              title: "Lembrete vencido",
              message: lead.nextActionNote
                ? `Próximo passo: ${lead.nextActionNote}`
                : `Você tinha um próximo passo marcado para ${clientName}.`,
              dueAt: d,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "SET_REMINDER", leadId: lead.id },
            });
          } else if (isSameDay(d, today)) {
            const key = `REMINDER_TODAY:${lead.id}:${startOfDay(d).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              realtorId,
              leadId: lead.id,
              type: "REMINDER_TODAY",
              priority: "MEDIUM",
              title: "Lembrete para hoje",
              message: lead.nextActionNote
                ? `Próximo passo: ${lead.nextActionNote}`
                : `Você marcou um próximo passo para hoje com ${clientName}.`,
              dueAt: d,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "SET_REMINDER", leadId: lead.id },
            });
          }
        }
      }

      if (lead.visitDate) {
        const vd = new Date(lead.visitDate);
        if (!Number.isNaN(vd.getTime())) {
          if (isSameDay(vd, today)) {
            const key = `VISIT_TODAY:${lead.id}:${startOfDay(vd).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              realtorId,
              leadId: lead.id,
              type: "VISIT_TODAY",
              priority: "HIGH",
              title: "Visita hoje",
              message: `Visita marcada para hoje${lead.visitTime ? ` às ${lead.visitTime}` : ""}.`,
              dueAt: vd,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "OPEN_CHAT", leadId: lead.id },
            });
          } else if (isSameDay(vd, addDays(today, 1))) {
            const key = `VISIT_TOMORROW:${lead.id}:${startOfDay(vd).toISOString().slice(0, 10)}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              realtorId,
              leadId: lead.id,
              type: "VISIT_TOMORROW",
              priority: "MEDIUM",
              title: "Visita amanhã",
              message: `Visita marcada para amanhã${lead.visitTime ? ` às ${lead.visitTime}` : ""}.`,
              dueAt: vd,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "OPEN_CHAT", leadId: lead.id },
            });
          }

          if (lead.visitTime && lead.ownerApproved === null) {
            const key = `OWNER_APPROVAL_PENDING:${lead.id}`;
            dedupeKeys.add(key);
            await this.upsertFromRule({
              realtorId,
              leadId: lead.id,
              type: "OWNER_APPROVAL_PENDING",
              priority: "HIGH",
              title: "Aguardando aprovação do proprietário",
              message: `A visita está pendente de aprovação do proprietário.`,
              dueAt: vd,
              dedupeKey: key,
              primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
              secondaryAction: { type: "OPEN_CHAT", leadId: lead.id },
            });
          }
        }
      }

      const lastNoteAt = lastNoteMap.get(lead.id) as Date | undefined;
      const lastInternalMsgAt = lastInternalMsgMap.get(lead.id) as Date | undefined;
      const lastProChatAt = lastProChatMap.get(lead.id) as Date | undefined;

      const lastContactCandidates: Date[] = [];
      if (lastNoteAt) lastContactCandidates.push(lastNoteAt);
      if (lastInternalMsgAt) lastContactCandidates.push(lastInternalMsgAt);
      if (lastProChatAt) lastContactCandidates.push(lastProChatAt);

      const lastContactAt =
        lastContactCandidates.length > 0
          ? new Date(Math.max(...lastContactCandidates.map((x) => x.getTime())))
          : null;

      const sourceMeta = leadSourceMap.get(lead.id) as any;
      const leadSource = (sourceMeta as any)?.source || null;

      const firstClient = firstClientMsgMap.get(lead.id) as any;
      const lastClient = lastClientMsgMap.get(lead.id) as any;

      const hasClientMessage = !!firstClient?.createdAt;

      const isFormLead = leadSource === "CONTACT_FORM" || leadSource === "VISIT_REQUEST";

      const isFirstClientForm =
        !!isFormLead &&
        !!firstClient?.createdAt &&
        !Number.isNaN(new Date(firstClient.createdAt).getTime());

      const channelsToCheck: Array<"FORM" | "CHAT"> = [];
      if (isFirstClientForm) channelsToCheck.push("FORM");
      channelsToCheck.push("CHAT");

      for (const channel of channelsToCheck) {
        // Se ainda não houve qualquer contato do corretor/owner e já existe mensagem do cliente,
        // queremos garantir que o aviso de "não respondida" apareça imediatamente.

        const lastReplyAt = channel === "CHAT" ? lastProChatAt || null : lastContactAt;

        const clientMessagesForLead = (recentClientMessages || []).filter((m: any) => m.leadId === lead.id);

        const clientMsgsInChannel = clientMessagesForLead.filter((m: any) => {
          if (channel === "FORM") {
            return isFirstClientForm && firstClient?.createdAt && new Date(m.createdAt).getTime() === new Date(firstClient.createdAt).getTime();
          }
          // CHAT
          if (isFirstClientForm && firstClient?.createdAt) {
            return new Date(m.createdAt).getTime() !== new Date(firstClient.createdAt).getTime();
          }
          return true;
        });

        const lastClientInChannel =
          channel === "FORM"
            ? firstClient
            : (() => {
                if (!lastClient?.createdAt) return null;
                if (isFirstClientForm && firstClient?.createdAt) {
                  const sameAsFirst =
                    new Date(lastClient.createdAt).getTime() === new Date(firstClient.createdAt).getTime();
                  if (sameAsFirst) return null;
                }
                return lastClient;
              })();

        if (!lastClientInChannel?.createdAt) continue;
        const lastClientAt = new Date(lastClientInChannel.createdAt);
        if (Number.isNaN(lastClientAt.getTime())) continue;

        const hasUnread = !lastReplyAt ? true : lastClientAt > lastReplyAt;
        if (!hasUnread) continue;

        const unreadMsgs = clientMsgsInChannel.filter((m: any) => {
          const d = new Date(m.createdAt);
          if (Number.isNaN(d.getTime())) return false;
          return !lastReplyAt ? true : d > lastReplyAt;
        });

        const unreadCount = unreadMsgs.length || 1;
        const firstUnreadAt = unreadMsgs.length > 0 ? new Date(unreadMsgs[0].createdAt) : lastClientAt;

        const slaMinutes = SLA_MINUTES_BY_CHANNEL[channel] ?? 30;
        const dueAt = addMinutes(firstUnreadAt, slaMinutes);

        const msToDue = dueAt.getTime() - now.getTime();
        const isOverdue = msToDue <= 0;

        const priority: "LOW" | "MEDIUM" | "HIGH" = isOverdue || msToDue <= 5 * 60 * 1000 ? "HIGH" : "MEDIUM";

        const lastPreview = String(lastClientInChannel.content || "").trim().slice(0, 140);
        const countText = unreadCount === 1 ? "uma mensagem" : `${unreadCount} mensagens`;
        const title = `Cliente aguardando resposta (${channelLabel[channel] || channel})`;
        const message = lastPreview
          ? `${clientName} enviou ${countText} e ainda não recebeu retorno. Última: “${lastPreview}”`
          : `${clientName} enviou ${countText} e ainda não recebeu retorno.`;

        const key = `UNANSWERED_CLIENT_MESSAGE:${lead.id}:${channel}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          realtorId,
          leadId: lead.id,
          type: "UNANSWERED_CLIENT_MESSAGE",
          priority,
          title,
          message,
          dueAt,
          dedupeKey: key,
          primaryAction: { type: "OPEN_CHAT", leadId: lead.id },
          secondaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          metadata: {
            channel,
            unreadCount,
            lastClientAt: lastClientAt.toISOString(),
            firstUnreadAt: firstUnreadAt.toISOString(),
            slaMinutes,
            leadSource,
          },
        });
      }

      const firstContactThreshold = new Date(lead.createdAt);
      firstContactThreshold.setHours(firstContactThreshold.getHours() + 2);
      const hasAnyContact = !!lastContactAt;
      if (!hasAnyContact && now > firstContactThreshold && lead.status === "ACCEPTED") {
        const key = `LEAD_NO_FIRST_CONTACT:${lead.id}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          realtorId,
          leadId: lead.id,
          type: "LEAD_NO_FIRST_CONTACT",
          priority: "HIGH",
          title: "Falta registrar o primeiro contato",
          message: `Você assumiu este lead, mas ainda não registrou o primeiro contato.`,
          dueAt: firstContactThreshold,
          dedupeKey: key,
          primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          secondaryAction: { type: "OPEN_CHAT", leadId: lead.id },
        });
      }

      const staleThreshold = addDays(now, -3);
      if (lead.status === "ACCEPTED" && lastContactAt && lastContactAt < staleThreshold) {
        const key = `STALE_LEAD:${lead.id}:${startOfDay(lastContactAt).toISOString().slice(0, 10)}`;
        dedupeKeys.add(key);
        await this.upsertFromRule({
          realtorId,
          leadId: lead.id,
          type: "STALE_LEAD",
          priority: "MEDIUM",
          title: "Lead parado há alguns dias",
          message: `Sem registro de contato recente com ${clientName}.`,
          dueAt: lastContactAt,
          dedupeKey: key,
          primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          secondaryAction: { type: "SET_REMINDER", leadId: lead.id },
        });
      }
    }

    const weekStart = (() => {
      const d = startOfDay(now);
      const day = d.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diffToMonday);
      return d;
    })();

    const weekKey = `WEEKLY_SUMMARY:${weekStart.toISOString().slice(0, 10)}`;
    dedupeKeys.add(weekKey);

    const weeklyDueAt = new Date(weekStart);
    weeklyDueAt.setHours(9, 0, 0, 0);

    await this.upsertFromRule({
      realtorId,
      leadId: null,
      type: "WEEKLY_SUMMARY",
      priority: "LOW",
      title: "Resumo da semana",
      message: "Quando tiver 3 minutos, revise o que merece atenção e defina os próximos passos.",
      dueAt: weeklyDueAt,
      dedupeKey: weekKey,
      primaryAction: null,
      secondaryAction: null,
      metadata: {
        weekStart: weekStart.toISOString(),
      },
    });

    // Auto-resolve items from RULE that are no longer applicable
    await (prisma as any).realtorAssistantItem.updateMany({
      where: {
        realtorId,
        source: "RULE",
        status: { in: ["ACTIVE", "SNOOZED"] },
        dedupeKey: { notIn: Array.from(dedupeKeys) },
      },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        snoozedUntil: null,
      },
    });

    await this.emitUpdated(realtorId);

    return { count: dedupeKeys.size };
  }
}
