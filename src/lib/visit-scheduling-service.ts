import { prisma } from "@/lib/prisma";
import { logger } from "./logger";
import { LeadEventService } from "./lead-event-service";
import { RealtorAssistantService } from "./realtor-assistant-service";
import { randomBytes } from "crypto";

// Gera um token único para chat do cliente
function generateChatToken(): string {
  return randomBytes(32).toString("hex");
}

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
    const isOwnerRealtor = (property as any).owner?.role === "REALTOR" || (property as any).owner?.role === "AGENCY";
    
    // Se o owner é REALTOR/AGENCY, atribuir automaticamente como corretor responsável
    const effectiveRealtorId = realtorId || (isOwnerRealtor ? (property as any).ownerId : undefined);
    const isDirect = !!effectiveRealtorId;
    
    logger.info("Visit request owner check", { 
      isOwnerRealtor, 
      ownerId: (property as any).ownerId,
      providedRealtorId: realtorId,
      effectiveRealtorId,
      isDirect,
    });

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

    // Gerar token para chat do cliente
    const clientChatToken = generateChatToken();

    // Criar lead (unificando message e clientNotes no campo message)
    // Como já entra com horário marcado, iniciamos o funil em VISIT
    const lead = await (prisma as any).lead.create({
      data: {
        propertyId,
        contactId: contact.id,
        realtorId: effectiveRealtorId, // Atribui ao corretor (auto se owner é REALTOR/AGENCY)
        visitDate,
        visitTime,
        message: clientNotes, // Usando apenas campo message (clientNotes será deprecado)
        status: effectiveRealtorId ? "ACCEPTED" : "PENDING", // Já aceito se tem corretor atribuído
        isDirect,
        candidatesCount: 0,
        teamId: (property as any)?.teamId ?? undefined,
        clientChatToken, // Token para o cliente acessar o chat
        pipelineStage: "VISIT", // Lead já entra na etapa de visita agendada
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

    if (clientNotes && String(clientNotes).trim().length > 0) {
      try {
        await (prisma as any).leadClientMessage.create({
          data: {
            leadId: lead.id,
            fromClient: true,
            content: String(clientNotes),
          },
        });
      } catch {
        // ignore
      }
    }

    if ((lead as any).realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String((lead as any).realtorId));
      } catch {
        // ignore
      }
    }

    await LeadEventService.record({
      leadId: lead.id,
      type: "LEAD_CREATED",
      title: "Lead de visita criado",
      description: clientNotes || null,
      metadata: {
        source: "VISIT_REQUEST",
        propertyId,
        clientEmail,
        visitDate: visitDate.toISOString(),
        visitTime,
        isDirect,
      },
    });

    await LeadEventService.record({
      leadId: lead.id,
      type: "VISIT_REQUESTED",
      metadata: {
        visitDate: visitDate.toISOString(),
        visitTime,
      },
    });

    logger.info("Visit request created successfully", { leadId: lead.id });

    // Enviar email de confirmação para o cliente (async)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zillowlike.vercel.app';
    const chatUrl = `${siteUrl}/chat/${clientChatToken}`;
    
    (async () => {
      try {
        const { sendEmail, getClientConfirmationEmail, getLeadNotificationEmail } = await import("@/lib/email");

        const nowMs = Date.now();
        const wasRecentlyNotified = async (title: string, windowMs: number) => {
          const rec = await (prisma as any).leadEvent.findFirst({
            where: {
              leadId: lead.id,
              type: "INTERNAL_MESSAGE",
              title,
              createdAt: { gte: new Date(nowMs - windowMs) },
            },
            select: { id: true },
          });
          return !!rec?.id;
        };

        // Email para o cliente
        if (clientEmail) {
          const dedupeTitle = `EMAIL:LEAD_CONFIRMATION:${lead.id}:${clientEmail}`;
          const isDuplicate = await wasRecentlyNotified(dedupeTitle, 10 * 60 * 1000);
          if (!isDuplicate) {
          const clientEmailData = getClientConfirmationEmail({
            clientName,
            propertyTitle: lead.property?.title || "Imóvel",
            chatUrl,
            propertyUrl: `${siteUrl}/property/${propertyId}`,
          });
          
          const sent = await sendEmail({
            to: clientEmail,
            ...clientEmailData,
          });
          
          if (sent) {
            await LeadEventService.record({
              leadId: lead.id,
              type: "INTERNAL_MESSAGE",
              title: dedupeTitle,
              description: clientEmailData.subject,
              metadata: {
                channel: "EMAIL",
                to: clientEmail,
                template: "LEAD_CONFIRMATION",
              },
            });
          }

          logger.info("✅ Confirmation email sent to client", { email: clientEmail });
          }
        }

        // Email para o proprietário
        if (lead.property?.ownerId) {
          const owner = await prisma.user.findUnique({
            where: { id: lead.property.ownerId },
            select: { email: true, name: true },
          });

          if (owner?.email) {
            const dedupeTitle = `EMAIL:LEAD_CREATED:${lead.id}:${owner.email}`;
            const isDuplicate = await wasRecentlyNotified(dedupeTitle, 10 * 60 * 1000);
            if (!isDuplicate) {
            const ownerEmailData = getLeadNotificationEmail({
              propertyTitle: lead.property.title,
              userName: clientName,
              userEmail: clientEmail,
              userPhone: clientPhone,
              message: clientNotes || `Solicitação de visita: ${visitDate.toLocaleDateString('pt-BR')} às ${visitTime}`,
              propertyUrl: `${siteUrl}/property/${propertyId}`,
            });
            
            const sent = await sendEmail({
              to: owner.email,
              ...ownerEmailData,
            });
            
            if (sent) {
              await LeadEventService.record({
                leadId: lead.id,
                type: "INTERNAL_MESSAGE",
                title: dedupeTitle,
                description: ownerEmailData.subject,
                metadata: {
                  channel: "EMAIL",
                  to: owner.email,
                  template: "LEAD_CREATED",
                },
              });
            }

            logger.info("✅ Lead notification sent to owner", { email: owner.email });
            }
          }
        }
      } catch (err) {
        logger.error("❌ Error sending emails", { error: err });
      }
    })();

    return { ...lead, clientChatToken, chatUrl };
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
