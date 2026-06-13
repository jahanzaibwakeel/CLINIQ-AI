import { describe, expect, it } from "vitest";
import { decodeBase64File, sanitizeFileName, scanUploadedBuffer } from "@/lib/storage";

describe("document storage helpers", () => {
  it("sanitizes file names before creating storage keys", () => {
    expect(sanitizeFileName("../lab report!.txt")).toBe("lab_report_.txt");
    expect(sanitizeFileName("")).toBe("document-upload");
  });

  it("decodes browser data URLs", () => {
    const buffer = decodeBase64File("data:text/plain;base64,SGJBMWMgOC40");
    expect(buffer.toString("utf8")).toBe("HbA1c 8.4");
  });

  it("blocks suspicious executable extensions", () => {
    expect(scanUploadedBuffer("report.exe", Buffer.from("x"))).toBe("blocked");
    expect(scanUploadedBuffer("report.txt", Buffer.from("x"))).toBe("clean");
  });
});
