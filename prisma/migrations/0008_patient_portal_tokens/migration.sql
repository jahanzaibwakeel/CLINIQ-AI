CREATE TABLE "PatientPortalToken" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientPortalToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientPortalToken_tokenHash_key" ON "PatientPortalToken"("tokenHash");
CREATE INDEX "PatientPortalToken_clinicId_patientId_expiresAt_idx" ON "PatientPortalToken"("clinicId", "patientId", "expiresAt");

ALTER TABLE "PatientPortalToken" ADD CONSTRAINT "PatientPortalToken_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalToken" ADD CONSTRAINT "PatientPortalToken_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
