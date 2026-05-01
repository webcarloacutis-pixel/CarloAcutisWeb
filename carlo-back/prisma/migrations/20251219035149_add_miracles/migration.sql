-- CreateTable
CREATE TABLE "Miracle" (
    "id" TEXT NOT NULL,
    "saintId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "date" TEXT,
    "location" TEXT,
    "witnesses" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Miracle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Miracle_saintId_idx" ON "Miracle"("saintId");

-- AddForeignKey
ALTER TABLE "Miracle" ADD CONSTRAINT "Miracle_saintId_fkey" FOREIGN KEY ("saintId") REFERENCES "Saint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
