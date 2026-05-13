-- Adiciona controle de arquivamento de leads.
-- Usado pelo CRM (cron diário) para arquivar leads em LOST com >90 dias sem atividade,
-- removendo-os do funil principal sem destruir o histórico.

ALTER TABLE "leads"
  ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Índice composto para o cron de auto-archive (busca por archived=false + pipelineStage=LOST + updatedAt < cutoff)
CREATE INDEX "leads_archived_pipelineStage_updatedAt_idx"
  ON "leads"("archived", "pipelineStage", "updatedAt");
