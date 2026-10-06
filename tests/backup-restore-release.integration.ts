import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { BACKUP_MANIFEST, createDatabaseSnapshot, createBackupEnvelope, openBackupEnvelope, normalizeBackup, restoreDatabaseBackup } from "../lib/backup.js";

const container = "edu-release-recovery-20261006";
const database = `edu_restore_sidecar_test_${randomBytes(6).toString("hex")}`;
const key = "synthetic-sidecar-test-key-with-at-least-32-characters";
describe("isolated PG17 release recovery v3/v4", { skip: process.env.RUN_RELEASE_RECOVERY_TESTS !== "1" }, () => {
  let db: PrismaClient;
  let databaseUrl: string;
  let source: any;
  let fallback = false;
  let failAfterRestore = false;
  const role = `${database}_operator`;
  const restore = (backup: any) => restoreDatabaseBackup(fallback ? {
    $transaction: (callback: any, options: any) => db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`);
      const result = await callback(tx);
      if (failAfterRestore) throw new Error("synthetic post-restore failure");
      return result;
    }, options),
  } : db, backup, { databaseUrl, confirmation: "RESTORE_EDU_MANAGER", nodeEnv: "test" });
  before(async () => {
    const metadata = JSON.parse(execFileSync("docker", ["inspect", container], { encoding: "utf8" }))[0];
    assert.match(metadata.Config.Image, /^postgres:17(?:$|\.)/);
    const env = Object.fromEntries(metadata.Config.Env.map((item: string) => { const i = item.indexOf("="); return [item.slice(0, i), item.slice(i + 1)]; }));
    assert.equal(env.POSTGRES_USER, "release");
    assert.ok(env.POSTGRES_PASSWORD);
    const binding = metadata.NetworkSettings.Ports["5432/tcp"]?.[0];
    assert.ok(binding?.HostPort);
    assert.match(database, /^edu_restore_sidecar_test_[a-f0-9]{12}$/);
    execFileSync("docker", ["exec", "-i", container, "psql", "-U", "release", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: `CREATE DATABASE "${database}" OWNER release;`, stdio: ["pipe", "pipe", "pipe"] });
    databaseUrl = `postgresql://release:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:${binding.HostPort}/${database}`;
    const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl }, encoding: "utf8", timeout: 60_000,
    });
    assert.equal(migration.status, 0, "Dedicated test database migration failed (output withheld)");
    db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    console.info(`Dedicated synthetic recovery database: ${database}`);
    const tenantId = "tenant_default";
    await db.user.create({ data: { id: "sidecar-user", tenantId, username: "sidecar", passwordHash: "synthetic-test-only", fullName: "Synthetic Admin", role: "admin" } });
    await db.centerSettings.create({ data: { id: 500, tenantId, centerName: "Synthetic Center" } });
    await db.parent.create({ data: { id: "sidecar-parent", tenantId, fullName: "Synthetic Parent", phone: "0900000001", relationship: "father" } });
    await db.student.create({ data: { id: "sidecar-student", tenantId, parentId: "sidecar-parent", fullName: "Synthetic Student", gender: "male", dateOfBirth: new Date("2014-01-01"), enrollmentDate: new Date("2026-01-01") } });
    await db.class.create({ data: { id: "sidecar-class", tenantId, className: "Synthetic Class", sessionsPerWeek: 2, startTime: "18:00", endTime: "19:00", feePerDay: 100000 } });
    await db.classMonthPlan.create({ data: { id: "sidecar-plan", tenantId, classId: "sidecar-class", billingMonth: "2026-10" } });
    await db.classMonthPlanRevision.create({ data: { id: "sidecar-plan-revision", tenantId, planId: "sidecar-plan", revision: 1, state: "open", eventType: "create", snapshot: { synthetic: true }, actorId: "sidecar-user" } });
    await db.monthlyFee.create({ data: { id: "sidecar-fee", tenantId, studentId: "sidecar-student", month: "2026-10", totalAmount: 100000 } });
    await db.monthlyFeeLine.create({ data: { id: "sidecar-line", tenantId, monthlyFeeId: "sidecar-fee", studentId: "sidecar-student", allocationKey: "sidecar", month: "2026-10", amount: 100000 } });
    await db.monthlyFeeLineRevision.create({ data: { id: "sidecar-line-revision", tenantId, monthlyFeeLineId: "sidecar-line", revisionNumber: 1, runId: "sidecar", eventType: "calculated", afterSnapshot: { amount: 100000 }, actorId: "sidecar-user" } });
    await db.settingValue.create({ data: { id: "sidecar-setting", tenantId, key: "sidecar.test", value: { synthetic: true }, updatedById: "sidecar-user" } });
    await db.settingRevision.create({ data: { id: "sidecar-setting-revision", tenantId, settingValueId: "sidecar-setting", revision: 1, newValue: { synthetic: true }, changedById: "sidecar-user" } });
    source = await createDatabaseSnapshot(db);
  });
  after(async () => { await db?.$disconnect(); });

  async function assertHistoryTriggers() {
    const triggers = await db.$queryRawUnsafe<any[]>(`SELECT c.relname, t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE NOT t.tgisinternal AND c.relname IN ('class_month_plan_revisions','monthly_fee_line_revisions','setting_revisions')`);
    assert.equal(triggers.length, 3);
    assert.ok(triggers.every((row) => row.tgenabled === "O"));
    assert.equal((await db.$queryRawUnsafe<any[]>("SHOW session_replication_role"))[0].session_replication_role, "origin");
    for (const [table, field] of [["class_month_plan_revisions", "reason"], ["monthly_fee_line_revisions", "reason"], ["setting_revisions", "change_note"]]) {
      const rows = await db.$queryRawUnsafe<any[]>(`SELECT COUNT(*) AS count FROM "${table}"`);
      if (Number(rows[0].count) === 0) continue;
      await assert.rejects(db.$executeRawUnsafe(`UPDATE "${table}" SET "${field}"='forbidden'`), /immutable|append-only/);
      await assert.rejects(db.$executeRawUnsafe(`DELETE FROM "${table}"`), /immutable|append-only/);
    }
  }
  for (const [version, useFallback] of [[4, false], [3, true], [4, true]] as const) {
    it(`encrypted v${version} restore (${useFallback ? "USER trigger fallback" : "replica mode"}) preserves rows and advances next ID`, async () => {
      if (useFallback && !fallback) {
        await db.$executeRawUnsafe(`CREATE ROLE "${role}" NOLOGIN NOSUPERUSER`);
        await db.$executeRawUnsafe(`GRANT USAGE, CREATE ON SCHEMA public TO "${role}"`);
        await db.$executeRawUnsafe(`GRANT ALL ON ALL TABLES IN SCHEMA public TO "${role}"`);
        await db.$executeRawUnsafe(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "${role}"`);
        for (const table of ["class_month_plan_revisions", "monthly_fee_line_revisions", "setting_revisions", "center_settings"]) {
          await db.$executeRawUnsafe(`ALTER TABLE "${table}" OWNER TO "${role}"`);
        }
        fallback = true;
      }
      const legacyModels = new Set(["Tenant", "RolePermission", "SettingValue", "SettingRevision", "IntegrationConfig"]);
      const manifest = version === 4 ? source.manifest : source.manifest.filter((r: any) => !legacyModels.has(r.model));
      const tables = Object.fromEntries(manifest.map(({ key }: any) => [key, source.tables[key].map((row: any) => {
        if (version === 4) return row;
        const { tenantId: _tenant, isPlatformOwner: _owner, ...legacy } = row; return legacy;
      })]));
      const payload = { ...source, version, manifest, tables, counts: Object.fromEntries(manifest.map(({ key }: any) => [key, tables[key].length])) };
      const encrypted = createBackupEnvelope(payload, { key, keyId: "synthetic-sidecar" });
      const normalized = openBackupEnvelope(encrypted, { key, keyId: "synthetic-sidecar" });
      await restore(normalized);
      const actual = await createDatabaseSnapshot(db);
      const canonical = (rows: any[]) => JSON.parse(JSON.stringify(rows)).sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));
      for (const { key } of BACKUP_MANIFEST) {
        if (version === 3 && key === "users") {
          assert.deepEqual(canonical(actual.tables.users), canonical(normalized.tables.users.map((row: any) => ({ isPlatformOwner: false, ...row }))));
        } else assert.deepEqual(canonical(actual.tables[key]), canonical(normalized.tables[key]), key);
      }
      await assertHistoryTriggers();
      await db.tenant.create({ data: { id: `next-${version}`, slug: `next-${version}`, name: "Next Synthetic Center" } });
      const next = await db.centerSettings.create({ data: { tenantId: `next-${version}` } });
      assert.equal(next.id, 501);
    });
  }
  it("failed restore rolls back rows and leaves immutable triggers enabled", async () => {
    const before = await createDatabaseSnapshot(db);
    const broken = structuredClone(normalizeBackup(before));
    broken.tables.centerSettings.push({ ...broken.tables.centerSettings[0] });
    broken.counts.centerSettings++;
    await assert.rejects(restore(broken));
    const after = await createDatabaseSnapshot(db);
    assert.deepEqual(after.tables, before.tables);
    await assertHistoryTriggers();
  });
  it("post-sequence failure rolls back sequence restart and all rows", async () => {
    const before = await createDatabaseSnapshot(db);
    const sequenceBefore = await db.$queryRawUnsafe<any[]>('SELECT last_value, is_called FROM "center_settings_id_seq"');
    failAfterRestore = true;
    try { await assert.rejects(restore(source), /synthetic post-restore failure/); }
    finally { failAfterRestore = false; }
    assert.deepEqual((await createDatabaseSnapshot(db)).tables, before.tables);
    assert.deepEqual(await db.$queryRawUnsafe('SELECT last_value, is_called FROM "center_settings_id_seq"'), sequenceBefore);
    await assertHistoryTriggers();
    await db.tenant.create({ data: { id: "after-rollback", slug: "after-rollback", name: "Synthetic" } });
    assert.equal((await db.centerSettings.create({ data: { tenantId: "after-rollback" } })).id, 502);
  });
  it("empty restore restarts the sequence at one", async () => {
    const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, []]));
    await restore({ ...source, tables, counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, 0])) });
    await assertHistoryTriggers();
    await db.tenant.create({ data: { id: "empty-target", slug: "empty-target", name: "Synthetic" } });
    assert.equal((await db.centerSettings.create({ data: { tenantId: "empty-target" } })).id, 1);
  });
});
