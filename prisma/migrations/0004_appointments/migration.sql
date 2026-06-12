CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "clinicianId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reason" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "location" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Appointment_clinicId_startsAt_status_idx" ON "Appointment"("clinicId", "startsAt", "status");
CREATE INDEX "Appointment_clinicId_patientId_idx" ON "Appointment"("clinicId", "patientId");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
