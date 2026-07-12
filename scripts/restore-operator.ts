import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { openBackupEnvelope, restoreDatabaseBackup } from "../lib/backup.js";

const input = process.argv[2];
if (!input) throw new Error("Usage: npx tsx scripts/restore-operator.ts <backup.v2.json>");
const prisma = new PrismaClient();

readFile(resolve(input), "utf8")
  .then((raw) => openBackupEnvelope(JSON.parse(raw)))
  .then((backup) => restoreDatabaseBackup(prisma, backup, { databaseUrl: process.env.DATABASE_URL, confirmation: process.env.RESTORE_CONFIRMATION, nodeEnv: process.env.NODE_ENV }))
  .then((result) => console.info("Restore completed", result))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
