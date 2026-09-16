-- Additive editorial support. Existing content and translations are preserved.
ALTER TABLE "Saint" ADD COLUMN "birthYear" INTEGER,
ADD COLUMN "canonizationYear" INTEGER,
ADD COLUMN "patronOf" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "symbols" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "editorial" JSONB;
CREATE TABLE "CatalogImport" (
 "identityKey" TEXT NOT NULL PRIMARY KEY,
 "saintId" TEXT NOT NULL UNIQUE,
 "importedHash" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL,
 "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CatalogImport_saintId_fkey" FOREIGN KEY ("saintId") REFERENCES "Saint"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
