import { describe, expect, it } from "vitest";
import { aiGenerateSchema, aiReviewSchema, appointmentCreateSchema, consultationCreateSchema, patientCreateSchema, patientExportSchema, staffUpdateSchema } from "@/lib/validation";

describe("API validation schemas", () => {
  it("accepts a valid patient payload", () => {
    const parsed = patientCreateSchema.parse({
      firstName: "Demo",
      lastName: "Patient",
      dateOfBirth: "1990-01-01",
      sex: "Female",
      mrn: "DEMO-2000",
      allergies: [],
      medications: [],
      conditions: []
    });
    expect(parsed.mrn).toBe("DEMO-2000");
  });

  it("rejects short consultation notes", () => {
    expect(() =>
      consultationCreateSchema.parse({ patientId: "p1", reason: "x", rawNotes: "no" })
    ).toThrow();
  });

  it("allows supported AI generation modules", () => {
    const parsed = aiGenerateSchema.parse({
      type: "TASK_EXTRACTION",
      input: "Order lab follow up and call patient",
      patientId: "patient-id"
    });
    expect(parsed.type).toBe("TASK_EXTRACTION");
  });

  it("defaults AI review apply-to-record to false", () => {
    const parsed = aiReviewSchema.parse({
      reviewStatus: "REVIEWED",
      reviewerNote: "Edited wording before approval."
    });
    expect(parsed.applyToRecord).toBe(false);
  });

  it("rejects appointments ending before they start", () => {
    expect(() =>
      appointmentCreateSchema.parse({
        patientId: "p1",
        title: "Visit",
        startsAt: "2026-06-12T11:00:00.000Z",
        endsAt: "2026-06-12T10:00:00.000Z"
      })
    ).toThrow();
  });

  it("requires an export reason for patient chart downloads", () => {
    const parsed = patientExportSchema.parse({ reason: "Care coordination review", redacted: "true" });
    expect(parsed.reason).toContain("Care");
    expect(() => patientExportSchema.parse({ reason: "demo", redacted: "true" })).toThrow();
  });

  it("requires at least one staff update action", () => {
    expect(staffUpdateSchema.parse({ resetLockout: true }).resetLockout).toBe(true);
    expect(() => staffUpdateSchema.parse({})).toThrow();
  });
});
