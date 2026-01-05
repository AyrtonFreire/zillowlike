import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Número de dias sem atividade antes de arquivar
const ARCHIVE_AFTER_DAYS = 10;

/**
 * API para arquivar/limpar conversas antigas.
 * Pode ser chamada por um cron job (ex: Vercel Cron).
 * 
 * O que ela faz:
 * 1. Busca leads com mensagens que não tiveram atividade nos últimos 10 dias
 * 2. Remove as mensagens do chat (LeadClientMessage)
 * 3. Remove o token de chat do lead (clientChatToken = null)
 * 
 * O lead em si NÃO é removido, apenas a conversa é arquivada.
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autorização (pode ser um secret no header)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isProd = process.env.NODE_ENV === "production";
    
    // Se CRON_SECRET estiver configurado, verificar autorização
    if (isProd) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

    // Buscar leads com conversas que não tiveram atividade
    // (última mensagem antes da data de corte)
    const leadsToArchive = await prisma.lead.findMany({
      where: {
        clientChatToken: { not: null },
        clientMessages: {
          some: {},
        },
      },
      include: {
        clientMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    // Filtrar leads cuja última mensagem é anterior à data de corte
    const staleLeads = leadsToArchive.filter((lead) => {
      const lastMessage = lead.clientMessages[0];
      if (!lastMessage) return false;
      return new Date(lastMessage.createdAt) < cutoffDate;
    });

    if (staleLeads.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "Nenhuma conversa para arquivar.",
        archived: 0,
      });
    }

    const staleLeadIds = staleLeads.map((l) => l.id);

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deletar mensagens do chat
      const deletedMessages = await tx.leadClientMessage.deleteMany({
        where: {
          leadId: { in: staleLeadIds },
        },
      });

      // 2. Limpar token de chat dos leads
      const updatedLeads = await tx.lead.updateMany({
        where: {
          id: { in: staleLeadIds },
        },
        data: {
          clientChatToken: null,
        },
      });

      return {
        deletedMessages: deletedMessages.count,
        archivedLeads: updatedLeads.count,
      };
    });

    console.log(`[Archive Chats] Arquivadas ${result.archivedLeads} conversas, ${result.deletedMessages} mensagens deletadas`);

    return NextResponse.json({ 
      success: true, 
      message: `${result.archivedLeads} conversa(s) arquivada(s).`,
      archived: result.archivedLeads,
      messagesDeleted: result.deletedMessages,
    });
  } catch (error) {
    console.error("Error archiving chats:", error);
    return NextResponse.json(
      { error: "Erro ao arquivar conversas." },
      { status: 500 }
    );
  }
}

// GET para verificar status (pode ser útil para monitoramento)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

    // Contar conversas que seriam arquivadas
    const leadsWithChats = await prisma.lead.findMany({
      where: {
        clientChatToken: { not: null },
        clientMessages: {
          some: {},
        },
      },
      include: {
        clientMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const staleCount = leadsWithChats.filter((lead) => {
      const lastMessage = lead.clientMessages[0];
      if (!lastMessage) return false;
      return new Date(lastMessage.createdAt) < cutoffDate;
    }).length;

    return NextResponse.json({
      success: true,
      policy: {
        archiveAfterDays: ARCHIVE_AFTER_DAYS,
        cutoffDate: cutoffDate.toISOString(),
      },
      stats: {
        totalActiveChats: leadsWithChats.length,
        pendingArchive: staleCount,
      },
    });
  } catch (error) {
    console.error("Error getting archive stats:", error);
    return NextResponse.json(
      { error: "Erro ao obter estatísticas." },
      { status: 500 }
    );
  }
}
