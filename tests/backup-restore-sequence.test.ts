import assert from "node:assert/strict";
import { test } from "node:test";
import { BACKUP_MANIFEST, restoreDatabaseBackup } from "../lib/backup.js";

test("restore advances sequence after inserts and bounds the transaction", async () => {
  const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, [] as any[]]));
  tables.centerSettings = [{ id: 500, tenantId: "tenant_default" }];
  const backup = { format: "edu-manager-backup", version: 4, created_at: new Date().toISOString(), source: "edu-manager-v2", manifest: BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })), tables, counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, tables[key].length])) };
  const events: string[] = [];
  const tx = { ...Object.fromEntries(BACKUP_MANIFEST.map(({ delegate }) => [delegate, {
    deleteMany: async () => undefined,
    createMany: async () => { events.push(`insert:${delegate}`); },
  }])), $executeRawUnsafe: async (sql: string) => { events.push(sql); return 0; } };
  let options: unknown;
  await restoreDatabaseBackup({ $transaction: async (fn: any, value: unknown) => { options = value; return fn(tx); } }, backup as any,
    { databaseUrl: "postgres://localhost/sidecar_test", confirmation: "RESTORE_EDU_MANAGER", nodeEnv: "test" });
  assert.deepEqual(options, { maxWait: 10_000, timeout: 120_000 });
  const sequenceIndex = events.findIndex((sql) => sql.includes("ALTER SEQUENCE"));
  assert.ok(sequenceIndex > events.indexOf("insert:centerSettings"));
  assert.match(events[sequenceIndex], /pg_get_serial_sequence/);
  assert.match(events[sequenceIndex], /RESTART WITH/);
  assert.doesNotMatch(events[sequenceIndex], /setval/);
  for (const table of ["student_classes", "activity_logs", "center_settings"]) {
    assert.ok(events.some((sql) => sql.includes(`pg_get_serial_sequence('\"${table}\"'`)), table);
  }
});
