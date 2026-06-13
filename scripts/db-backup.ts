import { createHash } from "crypto";
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required for db:backup");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const url = databaseUrl;
  if (!url) throw new Error("DATABASE_URL is required for db:backup");
  const backupDir = process.env.BACKUP_DIR ?? "backups";
  mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  const backupPath = join(backupDir, `medipilot-ai-${timestamp}.dump`);

  const result = spawnSync("pg_dump", [
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--file",
    backupPath,
    url
  ], { stdio: "inherit" });

  if (result.status !== 0) {
    console.error("pg_dump failed. Verify PostgreSQL client tools are installed and DATABASE_URL is reachable.");
    process.exit(result.status ?? 1);
  }

  const checksum = await sha256File(backupPath);
  writeFileSync(`${backupPath}.sha256`, `${checksum}  ${backupPath}\n`);

  console.log(`Backup written: ${backupPath}`);
  console.log(`Checksum: ${checksum}`);
}

function sha256File(path: string) {
  if (!existsSync(path)) throw new Error(`Backup file missing: ${path}`);
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}
