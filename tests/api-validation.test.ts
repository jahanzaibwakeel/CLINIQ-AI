import { describe, expect, it } from "vitest";
import { aiGenerateSchema, aiReviewSchema, appointmentCreateSchema, consultationCreateSchema, patientCreateSchema, patientExportSchema, patientPortalCommentSchema, patientPortalLookupSchema, patientPortalMagicLinkRequestSchema, patientPortalRequestSchema, patientPortalRequestUpdateSchema, passwordResetSchema, staffInviteSchema, staffUpdateSchema } from "@/lib/validation";

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
      type: "PORTAL_REPLY_DRAFT",
      input: "Order lab follow up and call patient",
      patientId: "patient-id"
    });
    expect(parsed.type).toBe("PORTAL_REPLY_DRAFT");
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

  it("validates patient portal lookup, requests, and status changes", () => {
    expect(patientPortalLookupSchema.parse({ mrn: "DEMO-1001", dateOfBirth: "1982-04-12" }).mrn).toBe("DEMO-1001");
    expect(patientPortalMagicLinkRequestSchema.parse({
      mrn: "DEMO-1001",
      dateOfBirth: "1982-04-12",
      email: "sara.demo@example.com"
    }).email).toBe("sara.demo@example.com");
    expect(patientPortalRequestSchema.parse({
      patientId: "patient-id",
      mrn: "DEMO-1001",
      dateOfBirth: "1982-04-12",
      type: "APPOINTMENT",
      subject: "Schedule follow-up",
      message: "Please help me schedule the requested follow-up appointment.",
      preferredContact: ""
    }).type).toBe("APPOINTMENT");
    expect(patientPortalRequestSchema.parse({
      patientId: "patient-id",
      type: "DOCUMENT",
      subject: "Question about report",
      message: "Please confirm whether the uploaded report has been reviewed."
    }).type).toBe("DOCUMENT");
    expect(patientPortalRequestUpdateSchema.parse({ status: "IN_REVIEW" }).status).toBe("IN_REVIEW");
    expect(patientPortalCommentSchema.parse({ body: "Thanks, I can make that time." }).body).toContain("Thanks");
    expect(() => patientPortalCommentSchema.parse({ body: "" })).toThrow();
    expect(() => patientPortalLookupSchema.parse({ mrn: "DEMO-1001", dateOfBirth: "04/12/1982" })).toThrow();
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

  it("validates staff invitations and strong account passwords", () => {
    expect(staffInviteSchema.parse({
      email: "new.doctor@example.com",
      name: "Dr. New Doctor",
      role: "DOCTOR",
      title: "Physician"
    }).role).toBe("DOCTOR");

    expect(passwordResetSchema.parse({
      token: "abcdefghijklmnopqrstuvwxyz",
      password: "NewPassword1234"
    }).password).toBe("NewPassword1234");

    expect(() => passwordResetSchema.parse({
      token: "abcdefghijklmnopqrstuvwxyz",
      password: "weakpass"
    })).toThrow();
  });
});
