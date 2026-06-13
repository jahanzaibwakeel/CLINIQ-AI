ALTER TABLE "Document" ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "Document" ADD COLUMN "fileSizeBytes" INTEGER;
ALTER TABLE "Document" ADD COLUMN "checksumSha256" TEXT;
ALTER TABLE "Document" ADD COLUMN "virusScanStatus" TEXT NOT NULL DEFAULT 'not_scanned';
