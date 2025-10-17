-- CreateIndex
CREATE INDEX "leads_status_createdAt_idx" ON "leads"("status", "createdAt");

-- CreateIndex
CREATE INDEX "leads_realtorId_status_idx" ON "leads"("realtorId", "status");

-- CreateIndex
CREATE INDEX "leads_status_reservedUntil_idx" ON "leads"("status", "reservedUntil");

-- CreateIndex
CREATE INDEX "realtor_queue_status_position_idx" ON "realtor_queue"("status", "position");

-- CreateIndex
CREATE INDEX "realtor_queue_status_score_idx" ON "realtor_queue"("status", "score");

-- CreateIndex
CREATE INDEX "realtor_queue_status_activeLeads_idx" ON "realtor_queue"("status", "activeLeads");

-- CreateIndex
CREATE INDEX "score_history_queueId_createdAt_idx" ON "score_history"("queueId", "createdAt");
