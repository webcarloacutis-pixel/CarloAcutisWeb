-- Keep admin deletion available, while retaining import tombstones.
-- No Saint or editorial data is deleted by this migration.
ALTER TABLE "CatalogImport" ALTER COLUMN "saintId" DROP NOT NULL;
ALTER TABLE "CatalogImport" DROP CONSTRAINT "CatalogImport_saintId_fkey";
ALTER TABLE "CatalogImport" ADD CONSTRAINT "CatalogImport_saintId_fkey"
FOREIGN KEY ("saintId") REFERENCES "Saint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
