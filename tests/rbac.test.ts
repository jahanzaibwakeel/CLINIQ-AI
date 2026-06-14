import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assistantAiScopeDescription, canGenerateAiForRole } from "@/lib/security/rbac";

describe("role-based AI permissions", () => {
  it("limits assistants to operational AI drafting modules", () => {
    expect(canGenerateAiForRole(Role.ASSISTANT, "TASK_EXTRACTION")).toBe(true);
    expect(canGenerateAiForRole(Role.ASSISTANT, "FOLLOW_UP_INSTRUCTIONS")).toBe(true);
    expect(canGenerateAiForRole(Role.ASSISTANT, "RISK_FLAG_EXPLAINER")).toBe(false);
    expect(canGenerateAiForRole(Role.ASSISTANT, "VISIT_SUMMARY")).toBe(false);
    expect(assistantAiScopeDescription()).toContain("operational");
  });

  it("allows doctors and clinic admins to use clinical AI modules", () => {
    expect(canGenerateAiForRole(Role.DOCTOR, "SOAP_NOTE")).toBe(true);
    expect(canGenerateAiForRole(Role.CLINIC_ADMIN, "RISK_FLAG_EXPLAINER")).toBe(true);
  });
});
