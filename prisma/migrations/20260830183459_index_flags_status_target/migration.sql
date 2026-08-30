-- CreateIndex
CREATE INDEX "flags_status_targetType_targetId_idx" ON "flags"("status", "targetType", "targetId");
