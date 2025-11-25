import { prisma } from "@/lib/prisma";
import { logger } from "./logger";

/**
 * Serviço de agendamento de visitas
 */
export class VisitSchedulingService {
  /**
   * Cria um lead com horário de visita agendado
   * Se realtorId for fornecido, cria lead direto (não vai ao mural)
   */
  static async createVisitRequest(params: {
    propertyId: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    visitDate: Date;
    visitTime: string;
    clientNotes?: string;
    realtorId?: string; // Opcional - para visitas diretas agendadas por corretor
  }) {
    const { propertyId, clientName, clientEmail, clientPhone, visitDate, visitTime, clientNotes, realtorId } = params;

    logger.info("Creating visit request", { propertyId, visitDate, visitTime, realtorId, isDirect: !!realtorId });

    // Verifica se o imóvel existe e pega info do proprietário
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        ownerId: true,
        teamId: true,
        owner: {
          select: {
            role: true,
          },
        },
      } as any,
    });

    if (!property) {
      throw new Error("Imóvel não encontrado");
    }

    // REGRA: Imóveis de corretores são sempre diretos
    const isOwnerRealtor = (property as any).owner?.role === "REALTOR";
    const isDirect = !!realtorId || isOwnerRealtor;

    if (isOwnerRealtor && !realtorId) {
      throw new Error("REALTOR_PROPERTY"); // Código especial para frontend identificar
    }

    // Verifica se o horário está disponível
    const isAvailable = await this.isSlotTaken(propertyId, visitDate, visitTime);
    if (isAvailable) {
      throw new Error("Este horário já está ocupado. Por favor, escolha outro.");
    }

    // Criar ou encontrar contato
    let contact = await prisma.contact.findFirst({
      where: { email: clientEmail },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
        },
      });
    }

    // Criar lead
    const lead = await (prisma as any).lead.create({
      data: {
        propertyId,
        contactId: contact.id,
        realtorId, // Se fornecido, já atribui ao corretor
        visitDate,
        visitTime,
        clientNotes,
        message: clientNotes, // Manter compatibilidade
        status: isDirect ? "WAITING_OWNER_APPROVAL" : "PENDING",
        isDirect,
        candidatesCount: 0,
        teamId: (property as any)?.teamId ?? undefined,
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
            ownerId: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contact: true,
      },
    });

    logger.info("Visit request created successfully", { leadId: lead.id });

    return lead;
  }

  /**
   * Lista horários disponíveis de um imóvel em uma data
   */
  static async getAvailableSlots(propertyId: string, date: Date) {
    // Horários padrão disponíveis (7h às 19h, intervalos de 1h)
    const allSlots: string[] = [];
    for (let h = 7; h <= 19; h++) {
      allSlots.push(`${h.toString().padStart(2, '0')}:00`);
    }

    // Buscar leads existentes para essa data
    const existingLeads = await prisma.lead.findMany({
      where: {
        propertyId,
        visitDate: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
        status: {
          in: [
            "PENDING",
            "MATCHING",
            "WAITING_REALTOR_ACCEPT",
            "WAITING_OWNER_APPROVAL",
            "CONFIRMED",
          ],
        },
      },
      select: {
        visitTime: true,
      },
    });

    const takenSlots = existingLeads
      .map((lead: any) => lead.visitTime)
      .filter((time: any): time is string => !!time);

    const availableSlots = allSlots.filter(
      (slot) => !takenSlots.includes(slot)
    );

    return {
      available: availableSlots,
      taken: takenSlots,
    };
  }

  /**
   * Verifica se horário específico já está ocupado
   */
  static async isSlotTaken(
    propertyId: string,
    date: Date,
    time: string
  ): Promise<boolean> {
    const existingLead = await prisma.lead.findFirst({
      where: {
        propertyId,
        visitDate: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
        visitTime: time,
        status: {
          in: [
            "PENDING",
            "MATCHING",
            "WAITING_REALTOR_ACCEPT",
            "WAITING_OWNER_APPROVAL",
            "CONFIRMED",
          ],
        },
      },
    });

    return !!existingLead;
  }

  /**
   * Lista todos os leads (visitas) de um imóvel
   */
  static async getPropertyLeads(propertyId: string) {
    return await prisma.lead.findMany({
      where: {
        propertyId,
        status: {
          notIn: ["CANCELLED", "COMPLETED", "EXPIRED"],
        },
      },
      include: {
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            candidatures: true,
          },
        },
      },
      orderBy: [{ visitDate: "asc" }, { visitTime: "asc" }],
    });
  }

  /**
   * Cancela visita agendada
   */
  static async cancelVisit(leadId: string, reason?: string) {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        message: reason ? `Cancelado: ${reason}` : "Cancelado",
      },
    });

    logger.info("Visit cancelled", { leadId, reason });

    return lead;
  }

  /**
   * Marca visita como realizada
   */
  static async completeVisit(leadId: string) {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    logger.info("Visit completed", { leadId });

    return lead;
  }
}
