import { describe, expect, it } from "vitest";
import { buildDocumentIntelligence } from "@/lib/documents/intelligence";

describe("document intelligence", () => {
  it("prefers reviewed parsed JSON over AI draft findings", () => {
    const intelligence = buildDocumentIntelligence({
      parsedJson: {
        abnormalValues: [{ name: "HbA1c", value: "8.4", unit: "%", status: "high" }]
      },
      aiGenerations: [
        {
          type: "DOCUMENT_PARSE",
          output: {
            extracted: {
              abnormalValues: [{ name: "Glucose", value: "180", unit: "mg/dL", status: "high" }]
            }
          }
        }
      ]
    });

    expect(intelligence.confidence).toBe("reviewed");
    expect(intelligence.findings[0]?.label).toBe("Hb A1c");
    expect(intelligence.abnormalCount).toBe(1);
  });

  it("uses AI draft extracted values before text scan", () => {
    const intelligence = buildDocumentIntelligence({
      extractedText: "HbA1c 7.9%",
      aiGenerations: [
        {
          type: "DOCUMENT_PARSE",
          output: {
            summary: "Report has a missed follow-up.",
            extracted: {
              followUpNeeds: ["Schedule lab review"]
            }
          }
        }
      ]
    });

    expect(intelligence.confidence).toBe("ai_draft");
    expect(intelligence.summary).toContain("Report has");
    expect(intelligence.followUpCount).toBe(1);
  });

  it("falls back to text scanning for common lab values", () => {
    const intelligence = buildDocumentIntelligence({
      extractedText: "Glucose 190 mg/dL and B12 210 pg/mL noted in report."
    });

    expect(intelligence.confidence).toBe("text_scan");
    expect(intelligence.findings.map((finding) => finding.label)).toContain("Glucose");
    expect(intelligence.findings.map((finding) => finding.label)).toContain("B12");
  });
});
