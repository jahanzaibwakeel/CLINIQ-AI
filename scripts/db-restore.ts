import { existsSync } from "fs";
import { spawnSync } from "child_process";

const databaseUrl = process.env.DATABASE_URL;
const backupPath = process.argv[2];

if (!databaseUrl) {
  console.error("DATABASE_URL is required for db:restore");
  process.exit(1);
}

if (!backupPath) {
  console.error("Usage: npm run db:restore -- path/to/backup.dump");
  process.exit(1);
}

if (!existsSync(backupPath)) {
  console.error(`Backup file not found: ${backupPath}`);
  process.exit(1);
}

if (process.env.CONFIRM_RESTORE !== "true") {
  console.error("Restore is destructive. Set CONFIRM_RESTORE=true to continue.");
  process.exit(1);
}

const result = spawnSync("pg_restore", [
  "--clean",
  "--if-exists",
  "--no-owner",
  "--no-privileges",
  "--dbname",
  databaseUrl,
  backupPath
], { stdio: "inherit" });

if (result.status !== 0) {
  console.error("pg_restore failed. Verify PostgreSQL client tools are installed and DATABASE_URL targets the intended database.");
  process.exit(result.status ?? 1);
}

console.log(`Restore completed from: ${backupPath}`);
