import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createBackupEnvelope, createDatabaseSnapshot } from "../lib/backup.js";

const output = resolve(process.argv[2] || `edu-manager-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.v2.json`);
const prisma = new PrismaClient();

createDatabaseSnapshot(prisma)
  .then((backup) => writeFile(output, JSON.stringify(createBackupEnvelope(backup), null, 2), { encoding: "utf8", flag: "wx" }).then(() => console.info(`Encrypted backup written: ${output}`)))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
