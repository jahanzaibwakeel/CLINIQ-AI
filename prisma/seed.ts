import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.aiGeneration.deleteMany();
  await prisma.accountToken.deleteMany();
  await prisma.patientPortalToken.deleteMany();
  await prisma.patientPortalRequestComment.deleteMany();
  await prisma.patientPortalRequest.deleteMany();
  await prisma.embedding.deleteMany();
  await prisma.documentChunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.task.deleteMany();
  await prisma.note.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  const clinic = await prisma.clinic.create({
    data: {
      name: "Riverside Family Clinic",
      timezone: "Asia/Karachi"
    }
  });

  const passwordHash = await bcrypt.hash("DemoPassword123!", 12);

  const [doctor, admin, assistant] = await Promise.all([
    prisma.user.create({
      data: {
        clinicId: clinic.id,
        email: "doctor@medipilot.local",
        passwordHash,
        name: "Dr. Aisha Rahman",
        title: "Family Physician",
        role: Role.DOCTOR
      }
    }),
    prisma.user.create({
      data: {
        clinicId: clinic.id,
        email: "admin@medipilot.local",
        passwordHash,
        name: "Nadia Khan",
        title: "Clinic Administrator",
        role: Role.CLINIC_ADMIN
      }
    }),
    prisma.user.create({
      data: {
        clinicId: clinic.id,
        email: "assistant@medipilot.local",
        passwordHash,
        name: "Omar Siddiqui",
        title: "Medical Assistant",
        role: Role.ASSISTANT
      }
    })
  ]);

  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        primaryDoctorId: doctor.id,
        firstName: "Sara",
        lastName: "Malik",
        dateOfBirth: new Date("1982-04-12"),
        sex: "Female",
        phone: "+92 300 000 1101",
        email: "sara.demo@example.com",
        mrn: "DEMO-1001",
        allergies: ["Penicillin"],
        medications: ["Metformin 500 mg BID", "Atorvastatin 20 mg nightly"],
        conditions: ["Type 2 diabetes", "Hyperlipidemia"],
        riskScore: 72
      }
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        primaryDoctorId: doctor.id,
        firstName: "Imran",
        lastName: "Qureshi",
        dateOfBirth: new Date("1968-09-30"),
        sex: "Male",
        phone: "+92 300 000 1102",
        mrn: "DEMO-1002",
        allergies: [],
        medications: ["Amlodipine 5 mg daily"],
        conditions: ["Hypertension"],
        riskScore: 48
      }
    }),
    prisma.patient.create({
      data: {
        clinicId: clinic.id,
        primaryDoctorId: doctor.id,
        firstName: "Mina",
        lastName: "Hassan",
        dateOfBirth: new Date("1994-01-19"),
        sex: "Female",
        phone: "+92 300 000 1103",
        mrn: "DEMO-1003",
        allergies: ["Ibuprofen"],
        medications: ["Salbutamol inhaler PRN"],
        conditions: ["Asthma"],
        riskScore: 35
      }
    })
  ]);

  const sara = patients[0];
  const consult = await prisma.consultation.create({
    data: {
      clinicId: clinic.id,
      patientId: sara.id,
      doctorId: doctor.id,
      reason: "Diabetes follow-up and fatigue",
      rawNotes:
        "Patient reports fatigue for 3 weeks, fasting glucose often 160-190. No chest pain. Mild tingling feet. Missed eye exam. Discussed diet, medication adherence, ordered HbA1c, urine microalbumin, B12. Follow up in 2 weeks.",
      summary:
        "Diabetes follow-up with elevated home glucose and fatigue. Labs ordered and close follow-up planned.",
      startedAt: new Date("2026-06-03T09:30:00.000Z")
    }
  });

  await prisma.note.createMany({
    data: [
      {
        clinicId: clinic.id,
        patientId: sara.id,
        consultationId: consult.id,
        authorId: doctor.id,
        title: "Follow-up note",
        body: "Reviewed glucose log. Patient has missed several evening metformin doses. Counseled on adherence and foot care.",
        tags: ["diabetes", "follow-up"]
      },
      {
        clinicId: clinic.id,
        patientId: patients[1].id,
        authorId: doctor.id,
        title: "Blood pressure review",
        body: "Home readings mostly 135-145 systolic. No dizziness. Continue amlodipine and low-salt plan.",
        tags: ["hypertension"]
      }
    ]
  });

  const document = await prisma.document.create({
    data: {
      clinicId: clinic.id,
      patientId: sara.id,
      uploadedById: assistant.id,
      fileName: "demo-lab-report.txt",
      mimeType: "text/plain",
      storageKey: "seed/demo-lab-report.txt",
      extractedText:
        "HbA1c 8.4%, LDL 142 mg/dL, eGFR 82, urine albumin creatinine ratio 42 mg/g. Flag: microalbuminuria.",
      parsedJson: {
        labs: [
          { name: "HbA1c", value: "8.4", unit: "%", abnormal: true },
          { name: "LDL", value: "142", unit: "mg/dL", abnormal: true },
          { name: "Urine ACR", value: "42", unit: "mg/g", abnormal: true }
        ]
      },
      status: "PROCESSED"
    }
  });

  const chunk = await prisma.documentChunk.create({
    data: {
      documentId: document.id,
      chunkIndex: 0,
      content: "HbA1c 8.4%, LDL 142 mg/dL, eGFR 82, urine albumin creatinine ratio 42 mg/g.",
      metadata: { source: "seed" }
    }
  });

  await prisma.embedding.create({
    data: {
      clinicId: clinic.id,
      patientId: sara.id,
      documentChunkId: chunk.id,
      model: "local-hash-embedding-v1",
      vector: [0.12, 0.34, 0.56, 0.2, 0.91, 0.44, 0.17, 0.73],
      contentPreview: "HbA1c 8.4%, LDL 142 mg/dL, urine albumin creatinine ratio 42 mg/g."
    }
  });

  await prisma.task.createMany({
    data: [
      {
        clinicId: clinic.id,
        patientId: sara.id,
        consultationId: consult.id,
        createdById: doctor.id,
        assigneeId: assistant.id,
        title: "Schedule diabetes follow-up",
        description: "Book review visit after labs are available.",
        dueAt: new Date("2026-06-17T09:00:00.000Z"),
        source: "ai_draft"
      },
      {
        clinicId: clinic.id,
        patientId: patients[1].id,
        createdById: admin.id,
        assigneeId: assistant.id,
        title: "Call patient for BP log",
        description: "Request updated home readings before next appointment.",
        dueAt: new Date("2026-06-10T10:00:00.000Z")
      }
    ]
  });

  await prisma.followUp.create({
    data: {
      clinicId: clinic.id,
      patientId: sara.id,
      consultationId: consult.id,
      ownerId: doctor.id,
      title: "Diabetes lab review",
      instructions: "Review HbA1c, kidney screening, medication adherence, and foot symptoms.",
      scheduledFor: new Date("2026-06-17T09:30:00.000Z")
    }
  });

  await prisma.appointment.createMany({
    data: [
      {
        clinicId: clinic.id,
        patientId: sara.id,
        clinicianId: doctor.id,
        title: "Diabetes lab review",
        reason: "Review HbA1c, urine ACR, medication adherence, and foot symptoms.",
        startsAt: new Date("2026-06-17T09:30:00.000Z"),
        endsAt: new Date("2026-06-17T10:00:00.000Z"),
        location: "Exam room 2",
        notes: "Ask patient to bring glucose log."
      },
      {
        clinicId: clinic.id,
        patientId: patients[1].id,
        clinicianId: doctor.id,
        title: "Blood pressure follow-up",
        reason: "Review home BP log and medication tolerance.",
        startsAt: new Date("2026-06-18T11:00:00.000Z"),
        endsAt: new Date("2026-06-18T11:20:00.000Z"),
        location: "Exam room 1"
      }
    ]
  });

  const portalRequest = await prisma.patientPortalRequest.create({
    data: {
      clinicId: clinic.id,
      patientId: sara.id,
      type: "APPOINTMENT",
      subject: "Need help scheduling lab follow-up",
      message: "I saw the follow-up instructions and would like the clinic to confirm my appointment time.",
      preferredContact: "+92 300 000 1101",
      status: "NEW"
    }
  });

  await prisma.patientPortalRequestComment.create({
    data: {
      clinicId: clinic.id,
      requestId: portalRequest.id,
      patientId: sara.id,
      authorUserId: assistant.id,
      authorType: "STAFF",
      body: "Thanks, Sara. We are checking the schedule and will confirm the lab follow-up time."
    }
  });

  await prisma.aiGeneration.create({
    data: {
      clinicId: clinic.id,
      patientId: sara.id,
      consultationId: consult.id,
      type: "RISK_FLAG_EXPLAINER",
      provider: "seed",
      model: "demo",
      promptVersion: "risk-flag-v1",
      sourceContext: { source: "seed-data", containsPhi: false },
      output: {
        disclaimer: "AI draft, doctor review required.",
        flags: [
          "Elevated HbA1c",
          "Microalbuminuria",
          "Missed eye exam"
        ],
        explanation:
          "These items may require clinician review for diabetes control and complication screening."
      },
      reviewStatus: "DRAFT"
    }
  });

  await prisma.auditLog.create({
    data: {
      clinicId: clinic.id,
      actorId: doctor.id,
      patientId: sara.id,
      consultationId: consult.id,
      action: "AI_GENERATION_CREATED",
      entityType: "AiGeneration",
      entityId: "seed-risk-generation",
      metadata: { seeded: true }
    }
  });

  await prisma.auditLog.create({
    data: {
      clinicId: clinic.id,
      actorId: null,
      patientId: sara.id,
      action: "PATIENT_PORTAL_REQUEST_CREATED",
      entityType: "PatientPortalRequest",
      entityId: portalRequest.id,
      metadata: { seeded: true, type: portalRequest.type }
    }
  });

  console.log("Seeded MediPilot AI demo data.");
  console.log("Login: doctor@medipilot.local / DemoPassword123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
