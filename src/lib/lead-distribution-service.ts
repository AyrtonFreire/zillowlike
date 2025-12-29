import { PrismaClient } from "@prisma/client";
import { QueueService } from "./queue-service";
import { getPusherServer, PUSHER_EVENTS, PUSHER_CHANNELS } from "./pusher-server";
import { logger } from "./logger";
import { LeadEventService } from "./lead-event-service";
import { RealtorAssistantService } from "./realtor-assistant-service";

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

    try {
      await RealtorAssistantService.recalculateForRealtor(nextRealtor.realtorId);
    } catch {
      // ignore
    }

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
      // Define próximo estágio de funil
      const currentPipelineStage = (lead as any).pipelineStage as string | null | undefined;
      const shouldMoveToContact = !currentPipelineStage || currentPipelineStage === "NEW";

      const updateData: any = {
        status: "ACCEPTED",
        realtorId,
        respondedAt: new Date(),
      };

      // Se ainda estava em "NEW" (ou sem estágio), mover automaticamente para "CONTACT"
      if (shouldMoveToContact) {
        updateData.pipelineStage = "CONTACT";
      }

      // Atualiza lead
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: updateData,
      });

      // Atualiza estatísticas (garante criação se ainda não existir)
      const stats = await tx.realtorStats.upsert({
        where: { realtorId },
        create: {
          realtorId,
          leadsAccepted: 1,
          totalResponseTime: responseTime,
          lastLeadAcceptedAt: new Date(),
        },
        update: {
          leadsAccepted: { increment: 1 },
          totalResponseTime: { increment: responseTime },
          lastLeadAcceptedAt: new Date(),
        },
      });

      const avgResponseTime = Math.round(
        stats.totalResponseTime / Math.max(1, stats.leadsAccepted)
      );

      await tx.realtorStats.update({
        where: { realtorId },
        data: { avgResponseTime },
      });

      await tx.realtorQueue.update({
        where: { realtorId },
        data: { avgResponseTime },
      });

      return updatedLead;
    });

    // Registrar evento de aceitação de lead
    await LeadEventService.record({
      leadId,
      type: "LEAD_ACCEPTED",
      actorId: realtorId,
      actorRole: "REALTOR",
      fromStatus: lead.status as any,
      toStatus: "ACCEPTED",
      fromStage: (lead as any).pipelineStage || null,
      toStage: (result as any)?.pipelineStage || null,
      metadata: {
        responseTimeMinutes: responseTime,
      },
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

    // 🆕 Se lead tem horário de visita, solicita aprovação do proprietário
    if (lead.visitDate && lead.visitTime) {
      const { OwnerApprovalService } = await import("./owner-approval-service");
      await OwnerApprovalService.requestApproval(leadId);
      logger.info("Owner approval requested automatically", { leadId });
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

    try {
      await RealtorAssistantService.recalculateForRealtor(realtorId);
    } catch {
      // ignore
    }

    return result;
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

      // Atualiza estatísticas (garante criação se ainda não existir)
      await tx.realtorStats.upsert({
        where: { realtorId },
        create: {
          realtorId,
          leadsRejected: 1,
        },
        update: {
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

    await LeadEventService.record({
      leadId,
      type: "LEAD_REJECTED",
      actorId: realtorId,
      actorRole: "REALTOR",
      fromStatus: lead.status as any,
      toStatus: "AVAILABLE",
    });

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

    if (lead.status !== "PENDING") {
      throw new Error("Lead não está disponível para candidatura");
    }

    // Pega queue do corretor
    const queue = await prisma.realtorQueue.findUnique({
      where: { realtorId },
    });

    if (!queue) {
      throw new Error("Corretor não está na fila");
    }

    // Verifica se já se candidatou
    const existing = await prisma.leadCandidature.findUnique({
      where: {
        leadId_queueId: {
          leadId,
          queueId: queue.id,
        },
      },
    });

    if (existing) {
      throw new Error("Você já se candidatou a este lead");
    }

    // Cria candidatura com posição na fila
    const candidature = await prisma.leadCandidature.create({
      data: {
        leadId,
        queueId: queue.id,
        queuePosition: queue.position, // 🆕 Salva posição atual
        status: "PENDING",
      },
    });

    // Incrementa contador de candidatos
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        candidatesCount: { increment: 1 },
        status: "MATCHING", // 🆕 Muda para MATCHING quando tem candidatos
      },
    });

    logger.info("Realtor applied to lead", { 
      leadId, 
      realtorId, 
      position: queue.position 
    });

    return candidature;
  }

  /**
   * 🆕 Seleciona corretor prioritário entre os candidatos
   */
  static async selectPriorityRealtor(leadId: string) {
    // Busca candidatos ordenados por posição na fila
    const candidatures = await prisma.leadCandidature.findMany({
      where: {
        leadId,
        status: "PENDING",
      },
      include: {
        queue: {
          include: {
            realtor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        queuePosition: "asc", // Menor posição = prioridade
      },
    });

    if (candidatures.length === 0) {
      throw new Error("Nenhum candidato disponível");
    }

    // Pega o primeiro (menor posição)
    const priority = candidatures[0];

    // Reserva lead para este corretor (10 minutos)
    const reservedUntil = new Date();
    reservedUntil.setMinutes(reservedUntil.getMinutes() + 10);

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "WAITING_REALTOR_ACCEPT",
        realtorId: priority.queue.realtorId,
        reservedUntil,
      },
    });

    logger.info("Priority realtor selected", {
      leadId,
      realtorId: priority.queue.realtorId,
      position: priority.queuePosition,
    });

    return priority.queue.realtor;
  }

  /**
   * 🆕 Move para próximo candidato se atual não aceitar
   */
  static async moveToNextCandidate(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { realtorId: true },
    });

    if (!lead?.realtorId) {
      return null;
    }

    // Marca candidatura atual como expirada
    await prisma.leadCandidature.updateMany({
      where: {
        leadId,
        queue: {
          realtorId: lead.realtorId,
        },
      },
      data: {
        status: "EXPIRED",
        respondedAt: new Date(),
      },
    });

    // Busca próximo candidato
    const nextCandidate = await prisma.leadCandidature.findFirst({
      where: {
        leadId,
        status: "PENDING",
      },
      include: {
        queue: {
          include: {
            realtor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        queuePosition: "asc",
      },
    });

    if (!nextCandidate) {
      // Sem mais candidatos, volta ao mural
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: "PENDING",
          realtorId: null,
          reservedUntil: null,
        },
      });
      return null;
    }

    // Reserva para próximo candidato
    const reservedUntil = new Date();
    reservedUntil.setMinutes(reservedUntil.getMinutes() + 10);

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "WAITING_REALTOR_ACCEPT",
        realtorId: nextCandidate.queue.realtorId,
        reservedUntil,
      },
    });

    logger.info("Moved to next candidate", {
      leadId,
      newRealtorId: nextCandidate.queue.realtorId,
    });

    return nextCandidate.queue.realtor;
  }

  /**
   * Lista leads disponíveis no mural
   * 🆕 Filtro: NÃO mostra imóveis de corretores e leads diretos
   */
  static async getAvailableLeads(filters?: {
    city?: string;
    state?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const where: any = {
      status: {
        in: ["AVAILABLE", "PENDING", "MATCHING"], // 🆕 Adicionado status novo
      },
      isDirect: false, // 🆕 REGRA: Apenas leads não-diretos vão ao mural
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

    // 🆕 Adiciona filtro: Proprietário NÃO é REALTOR
    where.property = where.property || {};
    where.property.owner = {
      role: {
        not: "REALTOR", // 🆕 REGRA: Imóveis de corretores não vão ao mural
      },
    };

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
            email: true,
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
   * Lista leads do corretor (ativos) com indicadores de pendências
   */
  static async getRealtorLeads(realtorId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const leads = await prisma.lead.findMany({
      where: {
        realtorId,
        OR: [
          {
            status: {
              in: ["RESERVED", "ACCEPTED"] as any,
            },
          },
          {
            status: "COMPLETED" as any,
            completedAt: {
              gte: sevenDaysAgo,
            },
          },
        ],
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

    // Buscar dados adicionais para indicadores (notas, mensagens)
    const leadIds = leads.map(l => l.id);

    let readReceipts: any[] = [];
    try {
      readReceipts = await (prisma as any).leadChatReadReceipt.findMany({
        where: {
          userId: realtorId,
          leadId: { in: leadIds },
        },
        select: { leadId: true, lastReadAt: true },
      });
    } catch (err: any) {
      // If the table hasn't been migrated yet in production (P2021), keep the site working.
      if (err?.code === "P2021") {
        readReceipts = [];
      } else {
        throw err;
      }
    }

    const readReceiptMap = new Map<string, Date>(
      (readReceipts || []).map((r: any) => [String(r.leadId), new Date(r.lastReadAt)])
    );
    
    // Buscar última nota de cada lead
    const lastNotes = await prisma.leadNote.findMany({
      where: { leadId: { in: leadIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastNoteMap = new Map(lastNotes.map(n => [n.leadId, n.createdAt]));

    // Buscar última mensagem interna de cada lead (enviada pelo corretor)
    const lastMessages = await prisma.leadMessage.findMany({
      where: { leadId: { in: leadIds }, senderId: realtorId },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastMessageMap = new Map(lastMessages.map(m => [m.leadId, m.createdAt]));

    // Buscar última mensagem de chat enviada por profissional (fromClient = false)
    const lastProChatMessages = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: false },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastProChatMap = new Map(lastProChatMessages.map(m => [m.leadId, m.createdAt]));

    // Buscar última mensagem do cliente de cada lead
    const lastClientMessages = await prisma.leadClientMessage.findMany({
      where: { leadId: { in: leadIds }, fromClient: true },
      orderBy: { createdAt: "desc" },
      distinct: ["leadId"],
      select: { leadId: true, createdAt: true },
    });
    const lastClientMessageMap = new Map(lastClientMessages.map(m => [m.leadId, m.createdAt]));

    // Enriquecer leads com indicadores
    return leads.map((lead) => {
      // Último contato profissional = nota, mensagem interna ou resposta via chat (fromClient=false)
      const lastNoteAt = lastNoteMap.get(lead.id) as Date | undefined;
      const lastMsgAt = lastMessageMap.get(lead.id) as Date | undefined;
      const lastProChatAt = lastProChatMap.get(lead.id) as Date | undefined;

      let lastContactAt: Date | null = null;
      const candidates: Date[] = [];
      if (lastNoteAt) candidates.push(lastNoteAt);
      if (lastMsgAt) candidates.push(lastMsgAt);
      if (lastProChatAt) candidates.push(lastProChatAt);

      if (candidates.length > 0) {
        lastContactAt = new Date(Math.max(...candidates.map(d => d.getTime())));
      } else {
        lastContactAt = null;
      }

      // Verificar se há mensagens do cliente mais recentes do que a última visualização do corretor
      const lastClientMsgAt = lastClientMessageMap.get(lead.id) as Date | undefined;
      let hasUnreadMessages = false;
      if (lastClientMsgAt) {
        const lastReadAt = readReceiptMap.get(String(lead.id));
        if (!lastReadAt) {
          hasUnreadMessages = true;
        } else {
          const lastReadMs = lastReadAt.getTime();
          const lastClientMs = lastClientMsgAt.getTime();
          hasUnreadMessages = !Number.isNaN(lastReadMs) && !Number.isNaN(lastClientMs) && lastClientMs > lastReadMs;
        }
      }

      return {
        ...lead,
        lastContactAt: lastContactAt?.toISOString() || null,
        hasUnreadMessages,
      };
    });
  }

  /**
   * Libera leads reservados que expiraram
   * 🆕 Agora move automaticamente para o próximo candidato
   */
  static async releaseExpiredReservations() {
    const now = new Date();

    const expiredLeads = await prisma.lead.findMany({
      where: {
        status: {
          in: ["RESERVED", "WAITING_REALTOR_ACCEPT"],
        },
        reservedUntil: {
          lt: now,
        },
      },
    });

    for (const lead of expiredLeads) {
      logger.info("Lead reservation expired", { 
        leadId: lead.id, 
        realtorId: lead.realtorId 
      });

      // Penaliza corretor (pequena penalidade para não desencorajar)
      if (lead.realtorId) {
        await QueueService.updateScore(
          lead.realtorId,
          -5, // Reduzido de -8 para -5 (menos pressão)
          "RESERVATION_EXPIRED",
          "Não aceitou lead no tempo"
        );

        await prisma.realtorStats.upsert({
          where: { realtorId: lead.realtorId },
          create: {
            realtorId: lead.realtorId,
            leadsExpired: 1,
          },
          update: {
            leadsExpired: { increment: 1 },
          },
        });
      }

      // 🆕 Tenta mover para próximo candidato automaticamente
      const nextRealtor = await this.moveToNextCandidate(lead.id);

      if (nextRealtor) {
        logger.info("Moved to next candidate automatically", {
          leadId: lead.id,
          newRealtorId: nextRealtor.id,
        });
      } else {
        // Sem mais candidatos, volta ao mural
        logger.info("No more candidates, lead back to mural", {
          leadId: lead.id,
        });
      }
    }

    return expiredLeads.length;
  }

  /**
   * Conclui atendimento de um lead aceito
   */
  static async completeLead(leadId: string, realtorId: string) {
    logger.info("Completing lead", { leadId, realtorId });

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error("Lead não encontrado");
    }

    if (lead.realtorId !== realtorId) {
      throw new Error("Este lead não está atribuído a este corretor");
    }

    if (lead.status !== "ACCEPTED") {
      throw new Error("Apenas leads em atendimento podem ser concluídos");
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          pipelineStage: "WON",
        },
      });

      const hadVisit = !!(lead.visitDate && lead.visitTime);

      const statsUpdate: any = {
        leadsCompleted: { increment: 1 },
      };

      if (hadVisit) {
        statsUpdate.visitsCompleted = { increment: 1 };
      }

      await tx.realtorStats.upsert({
        where: { realtorId },
        create: {
          realtorId,
          leadsCompleted: 1,
          ...(hadVisit ? { visitsCompleted: 1 } : {}),
        },
        update: statsUpdate,
      });

      return updatedLead;
    });

    await QueueService.decrementActiveLeads(realtorId);

    await QueueService.updateScore(
      realtorId,
      3,
      "COMPLETE_LEAD",
      "Concluiu atendimento de lead"
    );

    await LeadEventService.record({
      leadId,
      type: "LEAD_COMPLETED",
      actorId: realtorId,
      actorRole: "REALTOR",
      fromStatus: lead.status as any,
      toStatus: "COMPLETED",
      fromStage: (lead as any).pipelineStage || null,
      toStage: (result as any)?.pipelineStage || null,
      metadata: {
        hadVisit: !!(lead.visitDate && lead.visitTime),
      },
    });

    try {
      const pusher = getPusherServer();
      await pusher.trigger(PUSHER_CHANNELS.REALTOR(realtorId), "assistant-updated", {
        realtorId,
        ts: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    return result;
  }
}
