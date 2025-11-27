import { prisma } from "@/lib/prisma";
import { QueueService } from "./queue-service";
import { logger } from "./logger";
import { getPusherServer, PUSHER_EVENTS, PUSHER_CHANNELS } from "./pusher-server";
import { LeadEventService } from "./lead-event-service";

/**
 * Serviço de aprovação de visitas pelo proprietário
 */
export class OwnerApprovalService {
  /**
   * Solicita aprovação do proprietário para uma visita
   */
  static async requestApproval(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            ownerId: true,
            street: true,
            city: true,
            state: true,
          },
        },
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        
      },
    });

    if (!lead) {
      throw new Error("Lead não encontrado");
    }

    if (!lead.property.ownerId) {
      throw new Error("Propriedade sem proprietário");
    }

    // Atualizar status do lead
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "WAITING_OWNER_APPROVAL",
      },
    });

    await LeadEventService.record({
      leadId,
      type: "OWNER_APPROVAL_REQUESTED",
      actorId: lead.realtorId || undefined,
      actorRole: lead.realtorId ? "REALTOR" : undefined,
      title: "Aprovação de visita solicitada",
      metadata: {
        visitDate: lead.visitDate,
        visitTime: lead.visitTime,
      },
      fromStatus: lead.status as any,
      toStatus: updated.status as any,
    });

    logger.info("Owner approval requested", {
      leadId,
      ownerId: lead.property.ownerId,
      realtorId: lead.realtorId,
    });

    // Aqui você pode enviar email/notificação ao proprietário
    // Será implementado na fase de emails

    return lead;
  }

  /**
   * Proprietário aprova o horário da visita
   */
  static async approveVisit(leadId: string, ownerId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        property: {
          select: {
            ownerId: true,
            title: true,
          },
        },
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!lead) {
      throw new Error("Lead não encontrado");
    }

    // Verificar se é o proprietário correto
    if (lead.property.ownerId !== ownerId) {
      throw new Error("Você não é o proprietário deste imóvel");
    }

    // Verificar se está aguardando aprovação
    if (lead.status !== "WAITING_OWNER_APPROVAL") {
      throw new Error("Lead não está aguardando aprovação");
    }

    // Aprovar visita
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "CONFIRMED",
        ownerApproved: true,
        ownerApprovedAt: new Date(),
        confirmedAt: new Date(),
      },
    });

    await LeadEventService.record({
      leadId,
      type: "VISIT_CONFIRMED",
      actorId: ownerId,
      actorRole: "OWNER",
      title: "Visita aprovada pelo proprietário",
      fromStatus: lead.status as any,
      toStatus: updatedLead.status as any,
      metadata: {
        visitDate: lead.visitDate,
        visitTime: lead.visitTime,
      },
    });

    logger.info("Visit approved by owner", {
      leadId,
      ownerId,
      realtorId: lead.realtorId,
    });

    // Notificar cliente e corretor via Pusher
    try {
      const pusher = getPusherServer();

      // Notificar corretor
      if (lead.realtorId) {
        await pusher.trigger(
          PUSHER_CHANNELS.REALTOR(lead.realtorId),
          PUSHER_EVENTS.VISIT_CONFIRMED,
          {
            leadId,
            message: "Proprietário aprovou a visita!",
            visitDate: lead.visitDate,
            visitTime: lead.visitTime,
          }
        );
      }
    } catch (error) {
      logger.error("Error sending pusher notification", { error });
    }

    return updatedLead;
  }

  /**
   * Proprietário recusa o horário da visita
   */
  static async rejectVisit(
    leadId: string,
    ownerId: string,
    reason?: string
  ) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        property: {
          select: {
            ownerId: true,
          },
        },
        realtor: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!lead) {
      throw new Error("Lead não encontrado");
    }

    // Verificar se é o proprietário correto
    if (lead.property.ownerId !== ownerId) {
      throw new Error("Você não é o proprietário deste imóvel");
    }

    // Verificar se está aguardando aprovação
    if (lead.status !== "WAITING_OWNER_APPROVAL") {
      throw new Error("Lead não está aguardando aprovação");
    }

    // Recusar visita
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "OWNER_REJECTED",
        ownerApproved: false,
        ownerRejectedAt: new Date(),
        ownerRejectionReason: reason,
      },
    });

    logger.info("Visit rejected by owner", {
      leadId,
      ownerId,
      realtorId: lead.realtorId,
      reason,
    });

    // Realocar corretor para TOP 5 da fila (sem penalidade)
    if (lead.realtorId) {
      await this.reallocateRealtorToTop5(lead.realtorId);
    }

    // Limpar candidaturas e voltar lead ao mural
    await prisma.$transaction([
      // Limpar candidaturas
      prisma.leadCandidature.deleteMany({
        where: { leadId },
      }),
      // Resetar lead
      prisma.lead.update({
        where: { id: leadId },
        data: {
          status: "PENDING",
          realtorId: null,
          candidatesCount: 0,
          reservedUntil: null,
        },
      }),
    ]);

    await LeadEventService.record({
      leadId,
      type: "VISIT_REJECTED",
      actorId: ownerId,
      actorRole: "OWNER",
      title: "Visita recusada pelo proprietário",
      description: reason,
      fromStatus: lead.status as any,
      toStatus: "PENDING",
      metadata: { reason },
    });

    // Notificar corretor via Pusher
    try {
      const pusher = getPusherServer();

      if (lead.realtorId) {
        await pusher.trigger(
          PUSHER_CHANNELS.REALTOR(lead.realtorId),
          PUSHER_EVENTS.VISIT_REJECTED_BY_OWNER,
          {
            leadId,
            message: "Proprietário não pôde aceitar o horário",
            reason,
          }
        );
      }
    } catch (error) {
      logger.error("Error sending pusher notification", { error });
    }

    return updatedLead;
  }

  /**
   * Realoca corretor para TOP 5 da fila após recusa do proprietário
   * (sem penalidade, pois não foi culpa do corretor)
   */
  static async reallocateRealtorToTop5(realtorId: string) {
    const queue = await prisma.realtorQueue.findUnique({
      where: { realtorId },
    });

    if (!queue) {
      logger.warn("Realtor queue not found", { realtorId });
      return;
    }

    // Pegar a 5ª posição atual
    const fifthPosition = await prisma.realtorQueue.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        position: "asc",
      },
      take: 5,
      select: {
        position: true,
      },
    });

    const targetPosition = fifthPosition.length >= 5 
      ? fifthPosition[4].position 
      : 5;

    // Mover corretor para posição 5
    await prisma.realtorQueue.update({
      where: { realtorId },
      data: {
        position: targetPosition,
        lastActivity: new Date(),
      },
    });

    // Reorganizar fila
    await prisma.$executeRaw`
      UPDATE realtor_queue 
      SET position = position + 1 
      WHERE position >= ${targetPosition} AND position < ${queue.position} AND realtor_id != ${realtorId}
    `;

    logger.info("Realtor reallocated to top 5", {
      realtorId,
      newPosition: targetPosition,
    });
  }

  /**
   * Lista visitas pendentes de aprovação do proprietário
   */
  static async getPendingApprovals(ownerId: string) {
    return await prisma.lead.findMany({
      where: {
        property: {
          ownerId,
        },
        status: "WAITING_OWNER_APPROVAL",
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            street: true,
            city: true,
            state: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ visitDate: "asc" }, { visitTime: "asc" }],
    });
  }

  /**
   * Lista visitas confirmadas do proprietário
   */
  static async getConfirmedVisits(ownerId: string) {
    return await prisma.lead.findMany({
      where: {
        property: {
          ownerId,
        },
        status: "CONFIRMED",
        visitDate: {
          gte: new Date(), // Somente visitas futuras
        },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            street: true,
            city: true,
            state: true,
          },
        },
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ visitDate: "asc" }, { visitTime: "asc" }],
    });
  }
}
