import { prisma } from "@/lib/prisma";
import { logger } from "./logger";
import { getPusherServer, PUSHER_EVENTS, PUSHER_CHANNELS } from "./pusher-server";
import { LeadEventService } from "./lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

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

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }

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

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }

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

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }

    await LeadEventService.record({
      leadId,
      type: "VISIT_REJECTED",
      actorId: ownerId,
      actorRole: "OWNER",
      title: "Visita recusada pelo proprietário",
      description: reason,
      fromStatus: lead.status as any,
      toStatus: updatedLead.status as any,
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
