import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

export function generateSecret(bytes = 48) {
  if (!Number.isInteger(bytes) || bytes < 24) {
    throw new Error("Secret size must be an integer of at least 24 bytes.");
  }
  return randomBytes(bytes).toString("base64url");
}

export function generateProductionSecrets() {
  return {
    SESSION_SECRET: generateSecret(48),
    POSTGRES_PASSWORD: generateSecret(36),
    METRICS_BEARER_TOKEN: generateSecret(36)
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const secrets = generateProductionSecrets();
  for (const [name, value] of Object.entries(secrets)) {
    console.log(`${name}=${value}`);
  }
}
