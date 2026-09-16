-- Durable idempotency for existing AI requests; no content or session deletion.
CREATE TABLE "AiRequest" ("id" TEXT NOT NULL, "inputHash" TEXT NOT NULL, "response" TEXT, "model" TEXT, "leaseOwner" TEXT NOT NULL, "leaseUntil" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AiRequest_expiresAt_idx" ON "AiRequest"("expiresAt");
