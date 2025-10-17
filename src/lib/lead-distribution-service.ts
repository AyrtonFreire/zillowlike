import { PrismaClient } from "@prisma/client";
import { QueueService } from "./queue-service";
import { getPusherServer, PUSHER_EVENTS, PUSHER_CHANNELS } from "./pusher-server";
import { logger } from "./logger";

const prisma = new PrismaClient();

// Tempo de reserva em minutos
const RESERVATION_TIME_MINUTES = 10;

/**
 * Serviço de distribuição de leads
 */
export class LeadDistributionService {
  /**
   * Distribui novo lead para o próximo corretor da fila
   */
  static async distributeNewLead(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { property: true },
    });

    if (!lead) {
      throw new Error("Lead não encontrado");
    }

    // Pega próximo corretor da fila
    const nextRealtor = await QueueService.getNextRealtor();

    if (!nextRealtor) {
      // Nenhum corretor disponível, marca como AVAILABLE no mural
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: "AVAILABLE",
        },
      });
      return null;
    }

    // Reserva lead para o corretor
    const reservedUntil = new Date();
    reservedUntil.setMinutes(reservedUntil.getMinutes() + RESERVATION_TIME_MINUTES);

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "RESERVED",
        realtorId: nextRealtor.realtorId,
        reservedUntil,
      },
    });

    return nextRealtor;
  }

  /**
   * Aceita lead (corretor prioritário ou candidato)
   */
  static async acceptLead(leadId: string, realtorId: string) {
    logger.info("Accepting lead", { leadId, realtorId });

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error("Lead não encontrado");
    }

    // Verifica se o lead está disponível
    if (lead.status === "ACCEPTED") {
      throw new Error("Lead já foi aceito por outro corretor");
    }

    // Calcula tempo de resposta
    let referenceStart = lead.createdAt;
    if (lead.reservedUntil) {
      const reservedAt = new Date(lead.reservedUntil.getTime() - RESERVATION_TIME_MINUTES * 60000);
      referenceStart = reservedAt;
    }
    const responseTime = Math.floor((Date.now() - referenceStart.getTime()) / 60000);

    // Usa transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // Atualiza lead
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: "ACCEPTED",
          realtorId,
          respondedAt: new Date(),
        },
      });

      // Atualiza estatísticas
      await tx.realtorStats.update({
        where: { realtorId },
        data: {
          leadsAccepted: { increment: 1 },
          totalResponseTime: { increment: responseTime },
          lastLeadAcceptedAt: new Date(),
        },
      });

      // Calcula nova média de tempo de resposta
      const stats = await tx.realtorStats.findUnique({
        where: { realtorId },
      });

      if (stats) {
        const avgResponseTime = Math.round(
          stats.totalResponseTime / stats.leadsAccepted
        );

        await tx.realtorStats.update({
          where: { realtorId },
          data: { avgResponseTime },
        });

        await tx.realtorQueue.update({
          where: { realtorId },
          data: { avgResponseTime },
        });
      }

      return updatedLead;
    });

    // Atualiza fila (fora da transação pois usa raw SQL)
    await QueueService.incrementActiveLeads(realtorId);
    await QueueService.moveToEnd(realtorId);

    // Adiciona pontos se resposta rápida (< 5 min)
    let pointsEarned = 0;
    if (responseTime < 5) {
      pointsEarned = 5;
      await QueueService.updateScore(
        realtorId,
        5,
        "ACCEPT_LEAD_FAST",
        "Aceitou lead em menos de 5 minutos"
      );
      logger.info("Fast response bonus awarded", { leadId, realtorId, responseTime });
    }

    // Envia notificação via Pusher
    try {
      const pusher = getPusherServer();
      const property = await prisma.property.findUnique({
        where: { id: lead.propertyId },
        select: { title: true },
      });

      await pusher.trigger(
        PUSHER_CHANNELS.REALTOR(realtorId),
        PUSHER_EVENTS.LEAD_ACCEPTED,
        {
          leadId,
          propertyTitle: property?.title || "Imóvel",
          pointsEarned,
          responseTime,
        }
      );

      // Notifica mural que lead foi aceito
      await pusher.trigger(
        PUSHER_CHANNELS.MURAL,
        PUSHER_EVENTS.LEAD_ACCEPTED,
        {
          leadId,
          realtorId,
        }
      );
    } catch (error) {
      console.error("Error sending pusher notification:", error);
    }

    return lead;
  }

  /**
   * Rejeita lead
   */
  static async rejectLead(leadId: string, realtorId: string) {
    logger.info("Rejecting lead", { leadId, realtorId });

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error("Lead não encontrado");
    }

    // Usa transação para garantir consistência
    await prisma.$transaction(async (tx) => {
      // Atualiza lead para disponível no mural
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: "AVAILABLE",
          realtorId: null,
          reservedUntil: null,
        },
      });

      // Atualiza estatísticas
      await tx.realtorStats.update({
        where: { realtorId },
        data: {
          leadsRejected: { increment: 1 },
        },
      });
    });

    // Atualiza fila (fora da transação)
    await QueueService.incrementRejected(realtorId);

    // Remove pontos
    await QueueService.updateScore(
      realtorId,
      -5,
      "REJECT_LEAD",
      "Recusou lead"
    );

    logger.info("Lead rejected successfully", { leadId, realtorId });
    return lead;
  }

  /**
   * Candidata-se a um lead do mural
   */
  static async candidateToLead(leadId: string, realtorId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error("Lead não encontrado");
    }

    if (lead.status !== "AVAILABLE") {
      throw new Error("Lead não está disponível para candidatura");
    }

    // Verifica se já se candidatou
    const existing = await prisma.leadCandidature.findUnique({
      where: {
        leadId_queueId: {
          leadId,
          queueId: realtorId,
        },
      },
    });

    if (existing) {
      throw new Error("Você já se candidatou a este lead");
    }

    // Pega queue do corretor
    const queue = await prisma.realtorQueue.findUnique({
      where: { realtorId },
    });

    if (!queue) {
      throw new Error("Corretor não está na fila");
    }

    // Cria candidatura
    const candidature = await prisma.leadCandidature.create({
      data: {
        leadId,
        queueId: queue.id,
        status: "PENDING",
      },
    });

    return candidature;
  }

  /**
   * Lista leads disponíveis no mural
   */
  static async getAvailableLeads(filters?: {
    city?: string;
    state?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const where: any = {
      status: "AVAILABLE",
    };

    if (filters) {
      if (filters.city || filters.state || filters.propertyType) {
        where.property = {};
        if (filters.city) where.property.city = filters.city;
        if (filters.state) where.property.state = filters.state;
        if (filters.propertyType) where.property.type = filters.propertyType;
      }

      if (filters.minPrice || filters.maxPrice) {
        where.property = where.property || {};
        where.property.price = {};
        if (filters.minPrice) where.property.price.gte = filters.minPrice;
        if (filters.maxPrice) where.property.price.lte = filters.maxPrice;
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            type: true,
            city: true,
            state: true,
            neighborhood: true,
            bedrooms: true,
            bathrooms: true,
            areaM2: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            candidatures: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return leads;
  }

  /**
   * Lista leads do corretor (ativos)
   */
  static async getRealtorLeads(realtorId: string) {
    return await prisma.lead.findMany({
      where: {
        realtorId,
        status: {
          in: ["RESERVED", "ACCEPTED"],
        },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            type: true,
            city: true,
            state: true,
            neighborhood: true,
            street: true,
            bedrooms: true,
            bathrooms: true,
            areaM2: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
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
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Libera leads reservados que expiraram
   */
  static async releaseExpiredReservations() {
    const now = new Date();

    const expiredLeads = await prisma.lead.findMany({
      where: {
        status: "RESERVED",
        reservedUntil: {
          lt: now,
        },
      },
    });

    for (const lead of expiredLeads) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "AVAILABLE",
          realtorId: null,
          reservedUntil: null,
        },
      });

      // Penaliza corretor
      if (lead.realtorId) {
        await QueueService.updateScore(
          lead.realtorId,
          -8,
          "RESERVATION_EXPIRED",
          "Deixou reserva expirar"
        );

        await prisma.realtorStats.update({
          where: { realtorId: lead.realtorId },
          data: {
            leadsExpired: { increment: 1 },
          },
        });
      }
    }

    return expiredLeads.length;
  }
}
