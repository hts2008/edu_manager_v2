import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  BACKUP_MANIFEST,
  BACKUP_VERSION,
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
  it("preserves existing bootstrap identities and defaults without writes", async () => {
    const calls: string[] = [];
    const tx = {
      tenant: { findUnique: async () => ({ id: "tenant_default", slug: "default", status: "active" }) },
      user: {
        findFirst: async () => ({ id: "bootstrap-admin" }),
        create: async () => { calls.push("user.create"); return { id: "bootstrap-admin" }; },
        update: async () => { calls.push("user.update"); return { id: "bootstrap-admin" }; },
      },
      centerSettings: {
        findFirst: async () => ({ id: 1 }),
        create: async () => calls.push("centerSettings.create"),
        update: async () => calls.push("centerSettings.update"),
      },
      template: { findMany: async () => [{ id: "existing-default" }], create: async () => calls.push("template") },
    };
    const prisma = {
      $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
    };

    const adminPasswordHash = "$2b$12$" + "a".repeat(53);
    await bootstrapDatabase(prisma as never, { adminPasswordHash });
    await bootstrapDatabase(prisma as never, { adminPasswordHash });
    assert.deepEqual(calls, []);
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
    assert.equal(BACKUP_MANIFEST.length, 33);
    assert.deepEqual(BACKUP_MANIFEST.map((entry) => entry.model), [
      "Tenant", "User", "RolePermission", "SettingValue", "SettingRevision", "IntegrationConfig", "Parent", "AuthSession", "Teacher", "Class", "Student", "StudentClass", "EnrollmentPeriod", "ClassSession", "ClassMonthPlan", "ClassMonthPlanRevision", "Attendance", "AttendancePeriod", "Template", "Receipt", "MonthlyFee", "MonthlyFeeLine", "MonthlyFeeLineRevision", "ReceiptLine", "BulkFeePaymentBatch", "BulkFeePaymentItem", "Payment", "ActivityLog", "StudentProgressMonth", "StudentProgressRevision", "StudentProgressSkill", "StudentProgressDailyEntry", "CenterSettings",
    ]);
  });

  it("takes one RepeatableRead snapshot", async () => {
    let options: unknown;
    const tx = Object.fromEntries(BACKUP_MANIFEST.map(({ delegate }) => [delegate, { findMany: async () => [] }]));
    const prisma = { $transaction: async (callback: (client: typeof tx) => unknown, value: unknown) => { options = value; return callback(tx); } };
    const snapshot = await createDatabaseSnapshot(prisma as never);
    assert.deepEqual(options, {
      isolationLevel: "RepeatableRead",
      maxWait: 10_000,
      timeout: 60_000,
    });
    assert.equal(snapshot.version, 4);
  });

  it("encrypts a versioned envelope and detects tampering", () => {
    const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, []]));
    const backup = { format: "edu-manager-backup", version: BACKUP_VERSION, created_at: new Date().toISOString(), source: "edu-manager-v2", manifest: BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })), counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, 0])), tables };
    const envelope = createBackupEnvelope(backup as never, { key: TEST_KEY, keyId: "test-key" });
    assert.equal(envelope.key_id, "test-key");
    assert.ok(envelope.payload_checksum.startsWith("sha256:"));
    assert.deepEqual(openBackupEnvelope(envelope, { key: TEST_KEY, keyId: "test-key" }).source, "edu-manager-v2");
    assert.throws(() => openBackupEnvelope(envelope, { key: TEST_KEY, keyId: "retired-key" }));
    assert.throws(() => openBackupEnvelope({ ...envelope, ciphertext_checksum: "sha256:bad" }, { key: TEST_KEY }));
  });

  it("rejects pre-V3 backups as unsupported", () => {
    const legacyManifest = BACKUP_MANIFEST.filter((entry) => ![
      "ClassSession",
      "ClassMonthPlan",
      "ClassMonthPlanRevision",
      "MonthlyFeeLineRevision",
    ].includes(entry.model));
    const tables = Object.fromEntries(legacyManifest.map(({ key }) => [key, []]));
    const backup = {
      format: "edu-manager-backup",
      version: 2,
      created_at: new Date().toISOString(),
      source: "edu-manager-v2",
      manifest: legacyManifest.map(({ model, key }) => ({ model, key })),
      counts: Object.fromEntries(legacyManifest.map(({ key }) => [key, 0])),
      tables,
    };
    const envelope = createBackupEnvelope(backup as never, { key: TEST_KEY, keyId: "test-key" });
    assert.throws(
      () => openBackupEnvelope(envelope, { key: TEST_KEY, keyId: "test-key" }),
      /Backup version 2 is not supported/,
    );
  });

  it("rejects a complete manifest carried under an obsolete backup version", () => {
    const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, []]));
    const backup = {
      format: "edu-manager-backup",
      version: 2,
      created_at: new Date().toISOString(),
      source: "edu-manager-v2",
      manifest: BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })),
      counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, 0])),
      tables,
    };
    const envelope = createBackupEnvelope(backup as never, { key: TEST_KEY, keyId: "test-key" });
    assert.throws(
      () => openBackupEnvelope(envelope, { key: TEST_KEY, keyId: "test-key" }),
      /Backup version 2 is not supported/,
    );
  });

  it("requires an isolated restore target and rolls all writes into one transaction", async () => {
    const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, []]));
    tables.users = [{ id: "admin" }];
    const backup = { format: "edu-manager-backup", version: BACKUP_VERSION, created_at: new Date().toISOString(), source: "edu-manager-v2", manifest: BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })), counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, tables[key].length])), tables };
    let transactions = 0;
    const tx = Object.fromEntries(BACKUP_MANIFEST.map(({ delegate }) => [delegate, { deleteMany: async () => undefined, createMany: async () => undefined }]));
    const prisma = { $transaction: async (callback: (client: typeof tx) => unknown) => { transactions += 1; return callback(tx); } };
    await assert.rejects(() => restoreDatabaseBackup(prisma as never, backup as never, { databaseUrl: "postgres://db.example/prod", confirmation: "RESTORE_EDU_MANAGER", nodeEnv: "production" }));
    await assert.rejects(() => restoreDatabaseBackup(prisma as never, backup as never, { databaseUrl: "postgres://db.example/prod", confirmation: "RESTORE_EDU_MANAGER", nodeEnv: "test" }), /test-named databases/);
    await restoreDatabaseBackup(prisma as never, backup as never, { databaseUrl: "postgres://db.example/audit_restore_test", confirmation: "RESTORE_EDU_MANAGER", nodeEnv: "test" });
    await restoreDatabaseBackup(prisma as never, backup as never, { databaseUrl: "postgres://localhost/test", confirmation: "RESTORE_EDU_MANAGER", nodeEnv: "test" });
    assert.equal(transactions, 2);
  });

  it("propagates an insert failure so the transaction owner can roll back", async () => {
    const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, []]));
    tables.users = [{ id: "admin" }];
    const backup = { format: "edu-manager-backup", version: BACKUP_VERSION, created_at: new Date().toISOString(), source: "edu-manager-v2", manifest: BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })), counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, tables[key].length])), tables };
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
