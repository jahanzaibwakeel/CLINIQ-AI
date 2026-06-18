CREATE TABLE "PatientPortalRequestComment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorType" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientPortalRequestComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientPortalRequestComment_clinicId_requestId_createdAt_idx" ON "PatientPortalRequestComment"("clinicId", "requestId", "createdAt");
CREATE INDEX "PatientPortalRequestComment_clinicId_patientId_createdAt_idx" ON "PatientPortalRequestComment"("clinicId", "patientId", "createdAt");

ALTER TABLE "PatientPortalRequestComment" ADD CONSTRAINT "PatientPortalRequestComment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalRequestComment" ADD CONSTRAINT "PatientPortalRequestComment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PatientPortalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalRequestComment" ADD CONSTRAINT "PatientPortalRequestComment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalRequestComment" ADD CONSTRAINT "PatientPortalRequestComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
