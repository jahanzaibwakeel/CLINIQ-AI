import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AiGenerationType, PrismaClient, Role } from "@prisma/client";
import { semanticSearch } from "@/lib/ai/semantic-search";
import { hashEmbedding } from "@/lib/ai/providers/fallback";

const prisma = new PrismaClient();

describe.skipIf(process.env.RUN_INTEGRATION_TESTS !== "1")("tenant isolation", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ids = {
    clinics: [] as string[],
    users: [] as string[],
    patients: [] as string[],
    consultations: [] as string[],
    notes: [] as string[],
    documents: [] as string[],
    chunks: [] as string[],
    embeddings: [] as string[],
    aiGenerations: [] as string[],
    tasks: [] as string[]
  };

  beforeAll(async () => {
    const [clinicA, clinicB] = await Promise.all([
      prisma.clinic.create({ data: { name: `Isolation Clinic A ${suffix}`, timezone: "UTC" } }),
      prisma.clinic.create({ data: { name: `Isolation Clinic B ${suffix}`, timezone: "UTC" } })
    ]);
    ids.clinics.push(clinicA.id, clinicB.id);

    const [doctorA, doctorB] = await Promise.all([
      prisma.user.create({
        data: {
          clinicId: clinicA.id,
          email: `doctor-a-${suffix}@example.test`,
          passwordHash: "integration-only",
          name: "Dr Integration A",
          role: Role.DOCTOR
        }
      }),
      prisma.user.create({
        data: {
          clinicId: clinicB.id,
          email: `doctor-b-${suffix}@example.test`,
          passwordHash: "integration-only",
          name: "Dr Integration B",
          role: Role.DOCTOR
        }
      })
    ]);
    ids.users.push(doctorA.id, doctorB.id);

    const [patientA, patientB] = await Promise.all([
      prisma.patient.create({
        data: {
          clinicId: clinicA.id,
          primaryDoctorId: doctorA.id,
          firstName: "Tenant",
          lastName: "Alpha",
          dateOfBirth: new Date("1985-01-01"),
          sex: "female",
          mrn: `ISO-A-${suffix}`,
          allergies: [],
          medications: [],
          conditions: ["hypertension"]
        }
      }),
      prisma.patient.create({
        data: {
          clinicId: clinicB.id,
          primaryDoctorId: doctorB.id,
          firstName: "Tenant",
          lastName: "Beta",
          dateOfBirth: new Date("1979-01-01"),
          sex: "male",
          mrn: `ISO-B-${suffix}`,
          allergies: [],
          medications: [],
          conditions: ["diabetes"]
        }
      })
    ]);
    ids.patients.push(patientA.id, patientB.id);

    const [consultationA, consultationB] = await Promise.all([
      prisma.consultation.create({
        data: {
          clinicId: clinicA.id,
          patientId: patientA.id,
          doctorId: doctorA.id,
          reason: "Isolation check",
          rawNotes: "Clinic A note only",
          startedAt: new Date()
        }
      }),
      prisma.consultation.create({
        data: {
          clinicId: clinicB.id,
          patientId: patientB.id,
          doctorId: doctorB.id,
          reason: "Isolation check",
          rawNotes: "Clinic B note only",
          startedAt: new Date()
        }
      })
    ]);
    ids.consultations.push(consultationA.id, consultationB.id);

    const [noteA, noteB] = await Promise.all([
      prisma.note.create({
        data: {
          clinicId: clinicA.id,
          patientId: patientA.id,
          consultationId: consultationA.id,
          authorId: doctorA.id,
          title: "Alpha plan",
          body: "shared semantic phrase but alpha clinic context",
          tags: ["integration"]
        }
      }),
      prisma.note.create({
        data: {
          clinicId: clinicB.id,
          patientId: patientB.id,
          consultationId: consultationB.id,
          authorId: doctorB.id,
          title: "Beta plan",
          body: "shared semantic phrase but beta clinic context",
          tags: ["integration"]
        }
      })
    ]);
    ids.notes.push(noteA.id, noteB.id);

    const [documentA, documentB] = await Promise.all([
      prisma.document.create({
        data: {
          clinicId: clinicA.id,
          patientId: patientA.id,
          uploadedById: doctorA.id,
          fileName: "alpha-report.txt",
          mimeType: "text/plain",
          storageKey: `integration/${suffix}/alpha-report.txt`,
          extractedText: "shared semantic phrase alpha document"
        }
      }),
      prisma.document.create({
        data: {
          clinicId: clinicB.id,
          patientId: patientB.id,
          uploadedById: doctorB.id,
          fileName: "beta-report.txt",
          mimeType: "text/plain",
          storageKey: `integration/${suffix}/beta-report.txt`,
          extractedText: "shared semantic phrase beta document"
        }
      })
    ]);
    ids.documents.push(documentA.id, documentB.id);

    const [chunkA, chunkB] = await Promise.all([
      prisma.documentChunk.create({
        data: { documentId: documentA.id, chunkIndex: 0, content: "shared semantic phrase alpha document" }
      }),
      prisma.documentChunk.create({
        data: { documentId: documentB.id, chunkIndex: 0, content: "shared semantic phrase beta document" }
      })
    ]);
    ids.chunks.push(chunkA.id, chunkB.id);

    const [embeddingA, embeddingB, aiA, aiB, taskA, taskB] = await Promise.all([
      prisma.embedding.create({
        data: {
          clinicId: clinicA.id,
          patientId: patientA.id,
          noteId: noteA.id,
          documentChunkId: chunkA.id,
          model: "test-hash",
          vector: hashEmbedding("shared semantic phrase alpha document"),
          contentPreview: "alpha clinic private preview"
        }
      }),
      prisma.embedding.create({
        data: {
          clinicId: clinicB.id,
          patientId: patientB.id,
          noteId: noteB.id,
          documentChunkId: chunkB.id,
          model: "test-hash",
          vector: hashEmbedding("shared semantic phrase beta document"),
          contentPreview: "beta clinic private preview"
        }
      }),
      prisma.aiGeneration.create({
        data: {
          clinicId: clinicA.id,
          patientId: patientA.id,
          consultationId: consultationA.id,
          documentId: documentA.id,
          type: AiGenerationType.CONSULTATION_SUMMARY,
          provider: "fallback",
          model: "integration-test",
          promptVersion: "test",
          sourceContext: { source: "integration" },
          output: { disclaimer: "AI draft, doctor review required.", summary: "alpha only" }
        }
      }),
      prisma.aiGeneration.create({
        data: {
          clinicId: clinicB.id,
          patientId: patientB.id,
          consultationId: consultationB.id,
          documentId: documentB.id,
          type: AiGenerationType.CONSULTATION_SUMMARY,
          provider: "fallback",
          model: "integration-test",
          promptVersion: "test",
          sourceContext: { source: "integration" },
          output: { disclaimer: "AI draft, doctor review required.", summary: "beta only" }
        }
      }),
      prisma.task.create({
        data: {
          clinicId: clinicA.id,
          patientId: patientA.id,
          consultationId: consultationA.id,
          createdById: doctorA.id,
          title: "Alpha task"
        }
      }),
      prisma.task.create({
        data: {
          clinicId: clinicB.id,
          patientId: patientB.id,
          consultationId: consultationB.id,
          createdById: doctorB.id,
          title: "Beta task"
        }
      })
    ]);
    ids.embeddings.push(embeddingA.id, embeddingB.id);
    ids.aiGenerations.push(aiA.id, aiB.id);
    ids.tasks.push(taskA.id, taskB.id);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: ids.clinics } } });
    await prisma.aiGeneration.deleteMany({ where: { id: { in: ids.aiGenerations } } });
    await prisma.embedding.deleteMany({ where: { id: { in: ids.embeddings } } });
    await prisma.documentChunk.deleteMany({ where: { id: { in: ids.chunks } } });
    await prisma.document.deleteMany({ where: { id: { in: ids.documents } } });
    await prisma.task.deleteMany({ where: { id: { in: ids.tasks } } });
    await prisma.note.deleteMany({ where: { id: { in: ids.notes } } });
    await prisma.consultation.deleteMany({ where: { id: { in: ids.consultations } } });
    await prisma.patient.deleteMany({ where: { id: { in: ids.patients } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.clinic.deleteMany({ where: { id: { in: ids.clinics } } });
    await prisma.$disconnect();
  });

  it("keeps patient, document, task, AI, and semantic-search records scoped to a clinic", async () => {
    const [clinicA, clinicB] = ids.clinics;
    const [patientA, patientB] = ids.patients;
    const [, documentB] = ids.documents;
    const [, taskB] = ids.tasks;
    const [, aiB] = ids.aiGenerations;

    await expect(prisma.patient.findFirst({ where: { id: patientA, clinicId: clinicA } })).resolves.toBeTruthy();
    await expect(prisma.patient.findFirst({ where: { id: patientB, clinicId: clinicA } })).resolves.toBeNull();
    await expect(prisma.document.findMany({ where: { clinicId: clinicA } })).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: documentB })])
    );
    await expect(prisma.task.findMany({ where: { clinicId: clinicA } })).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: taskB })])
    );
    await expect(prisma.aiGeneration.findMany({ where: { clinicId: clinicA } })).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: aiB })])
    );

    const clinicAResults = await semanticSearch({ clinicId: clinicA, query: "shared semantic phrase", limit: 10 });
    const clinicBResults = await semanticSearch({ clinicId: clinicB, query: "shared semantic phrase", limit: 10 });

    expect(clinicAResults).toEqual(expect.arrayContaining([expect.objectContaining({ patientId: patientA })]));
    expect(clinicAResults).not.toEqual(expect.arrayContaining([expect.objectContaining({ patientId: patientB })]));
    expect(clinicBResults).toEqual(expect.arrayContaining([expect.objectContaining({ patientId: patientB })]));
  });
});
