import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const ARCHIVE_AFTER_DAYS = 90;

/**
 * Marca como archived=true todos os leads em pipelineStage=LOST que não tiveram
 * atividade (updatedAt) nos últimos 90 dias. Idempotente e seguro pra rodar
 * dentro de outro cron (ex: /api/cron/expire-leads).
 *
 * Retorna o número de leads arquivados nesta execução.
 */
export async function archiveStaleLostLeads(): Promise<number> {
  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * DAY_MS);
  try {
    const result = await (prisma as any).lead.updateMany({
      where: {
        archived: false,
        pipelineStage: "LOST" as any,
        updatedAt: { lt: cutoff },
      },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    });
    const count = Number(result?.count || 0);
    if (count > 0) {
      logger.info("CRM auto-archive: leads arquivados", { count, cutoff: cutoff.toISOString() });
    }
    return count;
  } catch (error) {
    logger.error("CRM auto-archive: falha ao arquivar leads", { error });
    return 0;
  }
}
