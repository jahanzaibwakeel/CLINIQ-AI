CREATE TABLE "PatientPortalRequest" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "preferredContact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPortalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientPortalRequest_clinicId_status_createdAt_idx" ON "PatientPortalRequest"("clinicId", "status", "createdAt");
CREATE INDEX "PatientPortalRequest_clinicId_patientId_createdAt_idx" ON "PatientPortalRequest"("clinicId", "patientId", "createdAt");

ALTER TABLE "PatientPortalRequest" ADD CONSTRAINT "PatientPortalRequest_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalRequest" ADD CONSTRAINT "PatientPortalRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
