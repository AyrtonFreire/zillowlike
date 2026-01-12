import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    const { id } = await context.params;

    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        city: true,
        state: true,
        status: true,
        bedrooms: true,
        bathrooms: true,
        areaM2: true,
        price: true,
        type: true,
        ownerId: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Imóvel não encontrado" }, { status: 404 });
    }

    // Para simplificar neste primeiro momento, apenas o proprietário
    // (que aqui também é o corretor) pode ver o resumo de leads deste imóvel.
    if (property.ownerId !== userId && role !== "ADMIN") {
      return NextResponse.json({ error: "Você não tem acesso aos leads deste imóvel." }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    const leads = await prisma.lead.findMany({
      where: {
        propertyId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        contact: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    const leadIds = leads.map((lead) => lead.id);

    // Resumo de conversas por lead (última mensagem interna ou do cliente)
    const lastMessageByLead = new Map<
      string,
      {
        createdAt: Date;
        content: string;
        fromClient: boolean;
      }
    >();

    if (leadIds.length > 0) {
      const [internalMessages, clientMessages] = await Promise.all([
        (prisma as any).leadMessage.findMany({
          where: {
            leadId: { in: leadIds },
          },
          orderBy: { createdAt: "desc" },
        }),
        (prisma as any).leadClientMessage.findMany({
          where: {
            leadId: { in: leadIds },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      for (const msg of internalMessages) {
        const leadId = msg.leadId as string;
        if (!leadId) continue;
        const current = lastMessageByLead.get(leadId);
        const createdAt: Date = msg.createdAt;
        if (!current || createdAt > current.createdAt) {
          lastMessageByLead.set(leadId, {
            createdAt,
            content: msg.content as string,
            fromClient: false,
          });
        }
      }

      for (const msg of clientMessages) {
        const leadId = msg.leadId as string;
        if (!leadId) continue;
        const current = lastMessageByLead.get(leadId);
        const createdAt: Date = msg.createdAt;
        if (!current || createdAt > current.createdAt) {
          lastMessageByLead.set(leadId, {
            createdAt,
            content: msg.content as string,
            fromClient: !!msg.fromClient,
          });
        }
      }
    }

    const formattedLeads = leads.map((lead) => {
      const l: any = lead;
      const last = lastMessageByLead.get(lead.id);

      return {
        id: lead.id,
        status: lead.status,
        pipelineStage: l.pipelineStage,
        lostReason: l.lostReason,
        createdAt: lead.createdAt,
        visitDate: lead.visitDate,
        visitTime: lead.visitTime,
        completedAt: lead.completedAt,
        nextActionDate: l.nextActionDate,
        nextActionNote: l.nextActionNote,
        contact: lead.contact
          ? {
              name: lead.contact.name,
              phone: lead.contact.phone,
            }
          : null,
        lastMessageAt: last?.createdAt ?? null,
        lastMessagePreview: last?.content ?? null,
        lastMessageFromClient: last?.fromClient ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      property,
      leads: formattedLeads,
    });
  } catch (error) {
    console.error("Error fetching property leads for broker:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar os leads deste imóvel agora." },
      { status: 500 }
    );
  }
}
