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

    // Bring expired snoozes back to ACTIVE
    await (prisma as any).realtorAssistantItem.updateMany({
      where: {
        realtorId,
        status: "SNOOZED",
        snoozedUntil: { lte: now },
      },
      data: {
        status: "ACTIVE",
        snoozedUntil: null,
      },
    });

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

    return items;
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
    const created = await (prisma as any).realtorAssistantItem.upsert({
      where: {
        realtorId_dedupeKey: {
          realtorId: params.realtorId,
          dedupeKey: params.dedupeKey,
        },
      },
      create: {
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
        metadata: (params.metadata as any) ?? null,
        dedupeKey: params.dedupeKey,
      },
      update: {
        leadId: params.leadId ?? null,
        priority: params.priority,
        title: params.title,
        message: params.message,
        dueAt: params.dueAt ?? null,
        primaryAction: (params.primaryAction as any) ?? null,
        secondaryAction: (params.secondaryAction as any) ?? null,
        metadata: (params.metadata as any) ?? null,
        // if it was resolved but the problem came back, it should reactivate
        status: "ACTIVE",
        resolvedAt: null,
      },
    });

    return created;
  }

  static async recalculateForRealtor(realtorId: string) {
    const now = new Date();
    const today = startOfDay(now);

    const leads = await prisma.lead.findMany({
      where: {
        realtorId,
        status: { in: ["RESERVED", "ACCEPTED"] as any },
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

    const lastClientChat = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: true },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastClientChatMap = new Map(lastClientChat.map((m) => [m.leadId, m.createdAt]));

    const dedupeKeys = new Set<string>();

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
          primaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          secondaryAction: { type: "OPEN_CHAT", leadId: lead.id },
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
      const lastClientChatAt = lastClientChatMap.get(lead.id) as Date | undefined;

      const lastContactCandidates: Date[] = [];
      if (lastNoteAt) lastContactCandidates.push(lastNoteAt);
      if (lastInternalMsgAt) lastContactCandidates.push(lastInternalMsgAt);
      if (lastProChatAt) lastContactCandidates.push(lastProChatAt);

      const lastContactAt =
        lastContactCandidates.length > 0
          ? new Date(Math.max(...lastContactCandidates.map((x) => x.getTime())))
          : null;

      if (lastClientChatAt) {
        const hasUnread = !lastContactAt ? true : lastClientChatAt > lastContactAt;
        if (hasUnread) {
          const key = `UNANSWERED_CLIENT_MESSAGE:${lead.id}:${lastClientChatAt.toISOString()}`;
          dedupeKeys.add(key);
          await this.upsertFromRule({
            realtorId,
            leadId: lead.id,
            type: "UNANSWERED_CLIENT_MESSAGE",
            priority: "HIGH",
            title: "Cliente aguardando resposta",
            message: `${clientName} enviou uma mensagem e ainda não recebeu retorno.`,
            dueAt: lastClientChatAt,
            dedupeKey: key,
            primaryAction: { type: "OPEN_CHAT", leadId: lead.id },
            secondaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          });
        }
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

      if (lead.status === "ACCEPTED" && (lead.pipelineStage === "CONTACT" || lead.pipelineStage === "VISIT" || lead.pipelineStage === "PROPOSAL" || lead.pipelineStage === "DOCUMENTS")) {
        const noReminder = !lead.nextActionDate;
        if (noReminder) {
          const key = `PIPELINE_HYGIENE:${lead.id}:${lead.pipelineStage}`;
          dedupeKeys.add(key);
          await this.upsertFromRule({
            realtorId,
            leadId: lead.id,
            type: "PIPELINE_HYGIENE",
            priority: "LOW",
            title: "Defina o próximo passo",
            message: `Este lead está em ${lead.pipelineStage} e ainda não tem um lembrete de próximo passo.`,
            dueAt: null,
            dedupeKey: key,
            primaryAction: { type: "SET_REMINDER", leadId: lead.id },
            secondaryAction: { type: "OPEN_LEAD", leadId: lead.id },
          });
        }
      }
    }

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
