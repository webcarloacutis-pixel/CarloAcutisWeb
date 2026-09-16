-- Additive repair: recovered schema had no migration for user/chat tables.
-- Apply only through migrate deploy after a backup. No demo seed or row deletion.
CREATE TABLE "User" (
 "id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "name" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "Conversation" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Conversation_userId_updatedAt_idx" ON "Conversation"("userId","updatedAt");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "Message" (
 "id" TEXT NOT NULL, "conversationId" TEXT NOT NULL, "role" TEXT NOT NULL, "content" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Message_role_check" CHECK ("role" IN ('user','assistant'))
);
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message"("conversationId","createdAt","id");
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Saint" ADD COLUMN "deathYear" INTEGER, ADD COLUMN "birthCountryCode" TEXT, ADD COLUMN "birthContinent" TEXT, ADD COLUMN "birthPlace" TEXT, ADD COLUMN "birthLat" DOUBLE PRECISION, ADD COLUMN "birthLng" DOUBLE PRECISION, ADD COLUMN "birthPrecision" TEXT, ADD COLUMN "birthSources" JSONB;
ALTER TABLE "Saint" ADD CONSTRAINT "Saint_deathYear_check" CHECK ("deathYear" IS NULL OR "deathYear" > 0);
ALTER TABLE "Saint" ADD CONSTRAINT "Saint_birthLatitude_check" CHECK ("birthLat" IS NULL OR "birthLat" BETWEEN -90 AND 90);
ALTER TABLE "Saint" ADD CONSTRAINT "Saint_birthLongitude_check" CHECK ("birthLng" IS NULL OR "birthLng" BETWEEN -180 AND 180);
ALTER TABLE "Saint" ADD CONSTRAINT "Saint_birthCoordinatePair_check" CHECK (("birthLat" IS NULL) = ("birthLng" IS NULL));
CREATE INDEX "Saint_birthContinent_birthCountryCode_idx" ON "Saint"("birthContinent","birthCountryCode");
CREATE INDEX "Saint_deathYear_idx" ON "Saint"("deathYear");
CREATE INDEX "Prayer_approved_id_idx" ON "Prayer"("approved","id");
CREATE TABLE "ApiQuota" ("key" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ApiQuota_pkey" PRIMARY KEY ("key"));
CREATE INDEX "ApiQuota_expiresAt_idx" ON "ApiQuota"("expiresAt");
CREATE TABLE "AiLease" ("id" TEXT NOT NULL, "owner" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AiLease_pkey" PRIMARY KEY ("id"));
CREATE TABLE "TranslationCache" ("id" TEXT NOT NULL, "translated" TEXT NOT NULL, "model" TEXT NOT NULL, "targetLang" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "TranslationCache_pkey" PRIMARY KEY ("id"));
CREATE INDEX "TranslationCache_expiresAt_idx" ON "TranslationCache"("expiresAt");
CREATE TABLE "PopularityEstimate" ("id" TEXT NOT NULL, "contentType" TEXT NOT NULL, "contentId" TEXT NOT NULL, "score" INTEGER, "generatedAt" TIMESTAMP(3), "model" TEXT, "methodologyVersion" TEXT, "inputHash" TEXT, "leaseUntil" TIMESTAMP(3), "leaseOwner" TEXT, CONSTRAINT "PopularityEstimate_pkey" PRIMARY KEY ("id"), CONSTRAINT "PopularityEstimate_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100));
CREATE UNIQUE INDEX "PopularityEstimate_contentType_contentId_key" ON "PopularityEstimate"("contentType","contentId");

CREATE TABLE "AuthSession" ("id" TEXT NOT NULL, "userId" TEXT, "kind" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"), CONSTRAINT "AuthSession_kind_check" CHECK ("kind" IN ('user','admin')));
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
