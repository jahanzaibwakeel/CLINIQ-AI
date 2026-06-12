ALTER TABLE "AiGeneration" ADD COLUMN "latencyMs" INTEGER;
ALTER TABLE "AiGeneration" ADD COLUMN "cacheHit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AiGeneration" ADD COLUMN "tokenEstimate" INTEGER;
ALTER TABLE "AiGeneration" ADD COLUMN "requestId" TEXT;

CREATE INDEX "AiGeneration_clinicId_requestId_idx" ON "AiGeneration"("clinicId", "requestId");
