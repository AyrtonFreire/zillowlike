import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Número de dias sem atividade antes de arquivar
const ARCHIVE_AFTER_DAYS = 10;

function authorizeCron(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { ok: true };
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ok: true };
}

async function archiveStaleChats() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

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

  const staleLeads = leadsToArchive.filter((lead) => {
    const lastMessage = lead.clientMessages[0];
    if (!lastMessage) return false;
    return new Date(lastMessage.createdAt) < cutoffDate;
  });

  if (staleLeads.length === 0) {
    return {
      cutoffDate,
      archivedLeads: 0,
      deletedMessages: 0,
    };
  }

  const staleLeadIds = staleLeads.map((l) => l.id);

  const result = await prisma.$transaction(async (tx) => {
    const deletedMessages = await tx.leadClientMessage.deleteMany({
      where: {
        leadId: { in: staleLeadIds },
      },
    });

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

  return {
    cutoffDate,
    archivedLeads: result.archivedLeads,
    deletedMessages: result.deletedMessages,
  };
}

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
    const auth = authorizeCron(req);
    if (!auth.ok) return auth.response;

    const result = await archiveStaleChats();

    if (result.archivedLeads === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "Nenhuma conversa para arquivar.",
        archived: 0,
      });
    }

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
    const auth = authorizeCron(req);
    if (!auth.ok) return auth.response;

    const mode = (req.nextUrl.searchParams.get("mode") || "archive").toLowerCase();
    if (mode === "status") {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

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
    }

    const result = await archiveStaleChats();
    return NextResponse.json({
      success: true,
      message:
        result.archivedLeads === 0
          ? "Nenhuma conversa para arquivar."
          : `${result.archivedLeads} conversa(s) arquivada(s).`,
      archived: result.archivedLeads,
      messagesDeleted: result.deletedMessages,
      policy: {
        archiveAfterDays: ARCHIVE_AFTER_DAYS,
        cutoffDate: result.cutoffDate.toISOString(),
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
