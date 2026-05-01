-- CreateTable
CREATE TABLE "SaintTranslation" (
    "id" TEXT NOT NULL,
    "saintId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "name" TEXT,
    "title" TEXT,
    "biography" TEXT,

    CONSTRAINT "SaintTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiracleTranslation" (
    "id" TEXT NOT NULL,
    "miracleId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "title" TEXT,
    "type" TEXT,
    "date" TEXT,
    "location" TEXT,
    "witnesses" TEXT,
    "details" TEXT,

    CONSTRAINT "MiracleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerTranslation" (
    "id" TEXT NOT NULL,
    "prayerId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "category" TEXT,
    "saintName" TEXT,
    "occasion" TEXT,

    CONSTRAINT "PrayerTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaintTranslation_lang_idx" ON "SaintTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "SaintTranslation_saintId_lang_key" ON "SaintTranslation"("saintId", "lang");

-- CreateIndex
CREATE INDEX "MiracleTranslation_lang_idx" ON "MiracleTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "MiracleTranslation_miracleId_lang_key" ON "MiracleTranslation"("miracleId", "lang");

-- CreateIndex
CREATE INDEX "PrayerTranslation_lang_idx" ON "PrayerTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerTranslation_prayerId_lang_key" ON "PrayerTranslation"("prayerId", "lang");

-- AddForeignKey
ALTER TABLE "SaintTranslation" ADD CONSTRAINT "SaintTranslation_saintId_fkey" FOREIGN KEY ("saintId") REFERENCES "Saint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiracleTranslation" ADD CONSTRAINT "MiracleTranslation_miracleId_fkey" FOREIGN KEY ("miracleId") REFERENCES "Miracle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerTranslation" ADD CONSTRAINT "PrayerTranslation_prayerId_fkey" FOREIGN KEY ("prayerId") REFERENCES "Prayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
