import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { env } from "@/lib/env";

const suspiciousExtensions = new Set([".exe", ".dll", ".bat", ".cmd", ".ps1", ".js", ".vbs", ".scr"]);

export type StoredFile = {
  storageKey: string;
  storageProvider: "local";
  fileSizeBytes: number;
  checksumSha256: string;
  virusScanStatus: "clean" | "blocked" | "not_scanned";
};

export function sanitizeFileName(fileName: string) {
  const base = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "document-upload";
}

export function decodeBase64File(fileBase64: string) {
  const payload = fileBase64.includes(",") ? fileBase64.split(",").pop() ?? "" : fileBase64;
  return Buffer.from(payload, "base64");
}

export function scanUploadedBuffer(fileName: string, buffer: Buffer): StoredFile["virusScanStatus"] {
  if (suspiciousExtensions.has(path.extname(fileName).toLowerCase())) return "blocked";
  if (buffer.length === 0) return "blocked";
  return "clean";
}

export async function saveDocumentFile(input: {
  clinicId: string;
  fileName: string;
  fileBase64?: string;
  extractedText: string;
}): Promise<StoredFile> {
  const safeName = sanitizeFileName(input.fileName);
  const buffer = input.fileBase64 ? decodeBase64File(input.fileBase64) : Buffer.from(input.extractedText, "utf8");
  const scanStatus = scanUploadedBuffer(safeName, buffer);
  if (scanStatus === "blocked") {
    throw new Error("Uploaded file was blocked by the local safety scanner.");
  }

  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
  const storageKey = `${input.clinicId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
  const root = path.resolve(env.DOCUMENT_STORAGE_DIR);
  const absolutePath = path.join(root, storageKey);

  if (!absolutePath.startsWith(root)) {
    throw new Error("Resolved upload path escaped storage root.");
  }

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    storageKey,
    storageProvider: "local",
    fileSizeBytes: buffer.length,
    checksumSha256,
    virusScanStatus: scanStatus
  };
}
