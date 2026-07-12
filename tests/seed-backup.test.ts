import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  BACKUP_MANIFEST,
  createBackupEnvelope,
  createDatabaseSnapshot,
  openBackupEnvelope,
  restoreDatabaseBackup,
} from "../lib/backup.js";
import {
  assertDestructiveResetAllowed,
  resetDatabase,
} from "../prisma/reset-database.js";
import { bootstrapDatabase } from "../prisma/seed-bootstrap.js";

const TEST_KEY = "test-only-backup-encryption-key-with-32-bytes";

describe("seed and reset safety", () => {
  it("bootstraps with stable upserts and no deletes", async () => {
    const calls: string[] = [];
    const tx = {
      user: { upsert: async () => { calls.push("user"); return { id: "existing-admin" }; } },
      centerSettings: { upsert: async () => calls.push("centerSettings") },
      template: { upsert: async () => calls.push("template") },
    };
    const prisma = {
      $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
    };

    await bootstrapDatabase(prisma as never, { adminPasswordHash: "hash" });
    await bootstrapDatabase(prisma as never, { adminPasswordHash: "hash" });
    assert.deepEqual(calls, ["user", "centerSettings", "template", "template", "user", "centerSettings", "template", "template"]);
  });

  it("rejects destructive reset without both an isolated target and flag", () => {
    assert.throws(() => assertDestructiveResetAllowed({ databaseUrl: "postgres://db.example/prod", confirmation: "RESET_EDU_MANAGER", nodeEnv: "test" }));
    assert.throws(() => assertDestructiveResetAllowed({ databaseUrl: "postgres://localhost/test", confirmation: undefined, nodeEnv: "test" }));
    assert.doesNotThrow(() => assertDestructiveResetAllowed({ databaseUrl: "postgres://localhost/test", confirmation: "RESET_EDU_MANAGER", nodeEnv: "development" }));
  });

  it("performs reset in one transaction", async () => {
    let transactions = 0;
    const tx = Object.fromEntries(BACKUP_MANIFEST.map(({ delegate }) => [delegate, { deleteMany: async () => undefined }]));
    const prisma = { $transaction: async (callback: (client: typeof tx) => unknown) => { transactions += 1; return callback(tx); } };
    await resetDatabase(prisma as never, { databaseUrl: "postgres://localhost/test", confirmation: "RESET_EDU_MANAGER", nodeEnv: "test" });
    assert.equal(transactions, 1);
  });
});

describe("backup and restore", () => {
  it("uses a canonical manifest containing every current Prisma model", () => {
    assert.equal(BACKUP_MANIFEST.length, 24);
    assert.deepEqual(BACKUP_MANIFEST.map((entry) => entry.model), [
      "User", "Parent", "AuthSession", "Teacher", "Class", "Student", "StudentClass", "EnrollmentPeriod", "Attendance", "AttendancePeriod", "Template", "Receipt", "MonthlyFee", "MonthlyFeeLine", "ReceiptLine", "BulkFeePaymentBatch", "BulkFeePaymentItem", "Payment", "ActivityLog", "StudentProgressMonth", "StudentProgressRevision", "StudentProgressSkill", "StudentProgressDailyEntry", "CenterSettings",
    ]);
  });

  it("takes one RepeatableRead snapshot", async () => {
    let options: unknown;
    const tx = Object.fromEntries(BACKUP_MANIFEST.map(({ delegate }) => [delegate, { findMany: async () => [] }]));
    const prisma = { $transaction: async (callback: (client: typeof tx) => unknown, value: unknown) => { options = value; return callback(tx); } };
    await createDatabaseSnapshot(prisma as never);
    assert.deepEqual(options, { isolationLevel: "RepeatableRead" });
  });

  it("encrypts a versioned envelope and detects tampering", () => {
    const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, []]));
    const backup = { format: "edu-manager-backup", version: 2, created_at: new Date().toISOString(), source: "edu-manager-v2", manifest: BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })), counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, 0])), tables };
    const envelope = createBackupEnvelope(backup as never, { key: TEST_KEY, keyId: "test-key" });
    assert.equal(envelope.key_id, "test-key");
    assert.ok(envelope.payload_checksum.startsWith("sha256:"));
    assert.deepEqual(openBackupEnvelope(envelope, { key: TEST_KEY, keyId: "test-key" }).source, "edu-manager-v2");
    assert.throws(() => openBackupEnvelope(envelope, { key: TEST_KEY, keyId: "retired-key" }));
    assert.throws(() => openBackupEnvelope({ ...envelope, ciphertext_checksum: "sha256:bad" }, { key: TEST_KEY }));
  });

  it("requires an isolated restore target and rolls all writes into one transaction", async () => {
    const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, []]));
    tables.users = [{ id: "admin" }];
    const backup = { format: "edu-manager-backup", version: 2, created_at: new Date().toISOString(), source: "edu-manager-v2", manifest: BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })), counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, tables[key].length])), tables };
    let transactions = 0;
    const tx = Object.fromEntries(BACKUP_MANIFEST.map(({ delegate }) => [delegate, { deleteMany: async () => undefined, createMany: async () => undefined }]));
    const prisma = { $transaction: async (callback: (client: typeof tx) => unknown) => { transactions += 1; return callback(tx); } };
    await assert.rejects(() => restoreDatabaseBackup(prisma as never, backup as never, { databaseUrl: "postgres://db.example/prod", confirmation: "RESTORE_EDU_MANAGER", nodeEnv: "production" }));
    await restoreDatabaseBackup(prisma as never, backup as never, { databaseUrl: "postgres://localhost/test", confirmation: "RESTORE_EDU_MANAGER", nodeEnv: "test" });
    assert.equal(transactions, 1);
  });

  it("propagates an insert failure so the transaction owner can roll back", async () => {
    const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, []]));
    tables.users = [{ id: "admin" }];
    const backup = { format: "edu-manager-backup", version: 2, created_at: new Date().toISOString(), source: "edu-manager-v2", manifest: BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })), counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, tables[key].length])), tables };
    const tx = Object.fromEntries(BACKUP_MANIFEST.map(({ delegate }) => [delegate, { deleteMany: async () => undefined, createMany: async () => { throw new Error("insert failed"); } }]));
    const prisma = { $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx) };
    await assert.rejects(() => restoreDatabaseBackup(prisma as never, backup as never, { databaseUrl: "postgres://localhost/test", confirmation: "RESTORE_EDU_MANAGER", nodeEnv: "test" }), /insert failed/);
  });

  it("restricts remote restore fetches to bounded configured backup storage", () => {
    const backupSource = readFileSync("lib/backup.ts", "utf8");
    assert.match(backupSource, /public\.blob\.vercel-storage\.com/);
    assert.match(backupSource, /BACKUP_ALLOWED_HOSTS/);
    assert.match(backupSource, /redirect: "error"/);
    assert.match(backupSource, /AbortSignal\.timeout\(10_000\)/);
    assert.match(backupSource, /BACKUP_TOO_LARGE/);
  });
});
