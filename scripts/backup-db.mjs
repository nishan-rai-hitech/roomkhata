// Writes a consistent snapshot of the SQLite database to ~/roomkhata-backups
// (or $BACKUP_DIR) and keeps the newest 14. Run from the project root:
//   node scripts/backup-db.mjs
// VACUUM INTO copies the database safely even while the app is writing to it.
import { PrismaClient } from "@prisma/client";
import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const KEEP = 14;
const dir = process.env.BACKUP_DIR ?? path.join(homedir(), "roomkhata-backups");
mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = path.join(dir, `roomkhata-${stamp}.db`);

const db = new PrismaClient();
try {
  await db.$executeRawUnsafe(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
} finally {
  await db.$disconnect();
}

const backups = readdirSync(dir)
  .filter((name) => /^roomkhata-.*\.db$/.test(name))
  .sort()
  .reverse();
for (const old of backups.slice(KEEP)) unlinkSync(path.join(dir, old));

console.log(
  `${new Date().toISOString()} backup written: ${file} (${statSync(file).size} bytes), keeping ${Math.min(backups.length, KEEP)}`,
);
