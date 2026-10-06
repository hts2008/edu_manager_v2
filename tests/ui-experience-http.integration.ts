import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { bindTuitionProgressTestTarget, resolveTuitionProgressTestTarget } from "../lib/tuition-progress-test-target.js";
import { assertDatabaseTarget, cleanupBusinessFixtures, expectJson, fixtureIds, httpRequest,
  loginFixture, seedBusinessFixtures, startBusinessHttp } from "./helpers/tuition-progress-http.js";

const target = resolveTuitionProgressTestTarget(process.env);
if (target) bindTuitionProgressTestTarget(process.env, target);
const keys = ["organization.ui_copy.vi", "organization.ui_theme"];

test("UI experience real HTTP/PostgreSQL tenant, permission and transaction contracts", {
  skip: target ? false : "Isolated TEST_DATABASE_URL absent", timeout: 120_000,
}, async t => {
  assert.ok(target);
  process.env.TENANCY_MODE = "enforced";
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.url } } });
  const { prisma: routerDb } = await import("../lib/prisma.js");
  const { setAuthConfigForTests } = await import("../lib/auth-config.js");
  const ids = fixtureIds();
  const tenantId = ids.tenants[0];
  let http: Awaited<ReturnType<typeof startBusinessHttp>> | undefined;
  let seeded = false;
  try {
    await assertDatabaseTarget(db, target);
    await assertDatabaseTarget(routerDb, target);
    setAuthConfigForTests({ secret: randomUUID() + randomUUID(), issuer: "ui-http-test",
      audience: "ui-http-test", algorithm: "HS256" });
    const password = randomUUID();
    await seedBusinessFixtures(db, ids, password);
    seeded = true;
    http = await startBusinessHttp();
    const admin = await loginFixture(http.base, db, ids, 0, password);
    const viewer = await loginFixture(http.base, db, ids, 1, password);
    const request = (path: string, token = admin, method = "GET", body?: unknown) =>
      httpRequest(http!.base, path, token, method, body);
    const snapshot = () => db.$transaction(async tx => ({
      version: (await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } })).configVersion,
      values: await tx.settingValue.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
      revisions: await tx.settingRevision.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
      audit: await tx.activityLog.findMany({ where: { tenantId, entityType: "setting_value" }, orderBy: { id: "asc" } }),
    }));
    const payload = (version: number) => ({ copy: { "common.save": "Save now" },
      theme: { preset: "berry", radius: "soft", depth: "flat" }, expected_config_version: version });
    const override = async (permissionKey: string, allowed: boolean) => {
      await db.rolePermission.upsert({ where: { tenantId_role_permissionKey: {
        tenantId, role: "receptionist", permissionKey,
      } }, create: { tenantId, role: "receptionist", permissionKey, allowed, updatedById: ids.users[0] },
      update: { allowed } });
      await db.tenant.update({ where: { id: tenantId }, data: { configVersion: { increment: 1 } } });
    };

    await t.test("authenticated safe GET and strict rejected PUT leave database unchanged", async () => {
      assert.equal((await httpRequest(http!.base, "ui-experience")).status, 401);
      const response = await request("ui-experience", viewer);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const { data } = await expectJson(response);
      assert.deepEqual(Object.keys(data).sort(), ["config_version", "copy", "theme"]);
      assert.deepEqual(data.copy, {});
      const before = await snapshot();
      await expectJson(await request("ui-experience", viewer, "PUT", payload(before.version)), [403]);
      for (const body of [
        { ...payload(before.version), copy: { "status.paid": "Fake" } },
        { ...payload(before.version), copy: { unknown: "Unknown" } },
        { ...payload(before.version), copy: { "common.save": "<script>" } },
        { ...payload(before.version), copy: { "progress.student_heading": "Missing placeholder" } },
        { ...payload(before.version), theme: { ...payload(before.version).theme, css: "url(x)" } },
        { ...payload(before.version), tenantId: ids.tenants[1] },
        { ...payload(before.version), expected_config_version: undefined },
      ]) await expectJson(await request("ui-experience", admin, "PUT", body), [400]);
      assert.deepEqual(await snapshot(), before);
    });

    await t.test("real nested transaction adapter atomically publishes both settings and rejects stale CAS", async () => {
      const before = await snapshot();
      const { data } = await expectJson(await request("ui-experience", admin, "PUT", payload(before.version)));
      assert.equal(data.config_version, before.version + 2);
      assert.deepEqual(data.copy, payload(before.version).copy);
      assert.deepEqual(data.theme, payload(before.version).theme);
      const after = await snapshot();
      assert.equal(after.values.length, 2);
      assert.equal(after.revisions.length, 2);
      assert.equal(after.audit.length, 2);
      for (const row of after.values) {
        assert.ok(keys.includes(row.key));
        const revision = after.revisions.find(value => value.settingValueId === row.id)!;
        assert.equal(revision.changedById, ids.users[0]);
        assert.deepEqual(revision.newValue, row.value);
        assert.equal(revision.revision, row.revision);
        const audit = after.audit.find(value => value.entityId === row.id)!;
        assert.equal(audit.userId, ids.users[0]);
        assert.equal(JSON.parse(audit.action).type, "setting.update");
      }
      const stale = await expectJson(await request("ui-experience", admin, "PUT", payload(before.version)), [409]);
      assert.equal(stale.error.code, "SETTING_CONFIG_CONFLICT");
      assert.deepEqual(await snapshot(), after);
      assert.deepEqual((await expectJson(await request("ui-experience", viewer))).data, data);
      const rosterQuery = new URLSearchParams({ class_id: ids.classId, month: "2026-06", entry_date: "2026-06-01" });
      for (let round = 0; round < 3; round++) {
        assert.deepEqual((await expectJson(await request("ui-experience"))).data, data);
        const roster = await expectJson(await request(`student-progress/roster?${rosterQuery}`));
        assert.equal(roster.data.total, 1, "Publish cannot poison subsequent unrelated tenant transactions");
      }
      assert.equal(await db.settingValue.count({ where: { tenantId: ids.tenants[1] } }), 0);
    });

    await t.test("second-write database failure rolls back first setting, CAS, revisions and audit", async () => {
      const before = await snapshot();
      // Oversized revision is a real PostgreSQL integer failure after the copy write succeeds.
      await db.settingValue.updateMany({ where: { tenantId, key: keys[1] }, data: { revision: 2147483647 } });
      const failing = await snapshot();
      await expectJson(await request("ui-experience", admin, "PUT", payload(failing.version)), [500]);
      assert.deepEqual(await snapshot(), failing);
      await db.$executeRaw`UPDATE setting_values SET revision = ${before.values.find(row => row.key === keys[1])!.revision},
        updated_at = ${before.values.find(row => row.key === keys[1])!.updatedAt}
        WHERE tenant_id = ${tenantId} AND key = ${keys[1]}`;
      assert.deepEqual(await snapshot(), before);
    });

    await t.test("concurrent publishers have one winner and one 409 with exactly two revisions", async () => {
      const before = await snapshot();
      const responses = await Promise.all([request("ui-experience", admin, "PUT", payload(before.version)),
        request("ui-experience", admin, "PUT", { ...payload(before.version), copy: { "common.save": "Other save" } })]);
      assert.deepEqual(responses.map(row => row.status).sort(), [200, 409]);
      const after = await snapshot();
      assert.equal(after.version, before.version + 2);
      assert.equal(after.revisions.length, before.revisions.length + 2);
      assert.equal(after.audit.length, before.audit.length + 2);
    });

    await t.test("history is view-only for exactly two UI keys; rollback still requires edit", async context => {
      const constraints = await db.$queryRaw<Array<{ definition: string }>>`
        SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
        WHERE conrelid = 'role_permissions'::regclass AND conname = 'role_permissions_permission_key_check'`;
      if (constraints.some(row => !row.definition.includes("console.experience.view") ||
        !row.definition.includes("console.experience.edit"))) {
        context.skip("Existing PG permission CHECK excludes experience keys; schema changes forbidden");
        return;
      }
      await override("console.access", true);
      await override("console.experience.view", true);
      await override("console.experience.edit", false);
      const before = await snapshot();
      for (const key of keys) {
        const { data } = await expectJson(await request(`admin/settings/${key}/revisions`, viewer));
        assert.equal(data.total, 2);
        assert.ok(data.revisions.every((row: any) => row.tenantId === tenantId));
        await expectJson(await request(`admin/settings/${key}/rollback`, viewer, "POST", {
          revision_id: data.revisions[0].id,
        }), [403]);
      }
      await expectJson(await request("admin/settings/finance.extra_session_policy/revisions", viewer), [403]);
      await expectJson(await request("ui-experience", viewer, "PUT", payload(before.version)), [403]);
      assert.deepEqual(await snapshot(), before);
      await override("console.experience.view", false);
      await expectJson(await request(`admin/settings/${keys[0]}/revisions`, viewer), [403]);
    });

    await t.test("foreign tenant settings and revisions never appear; stored corruption falls back safely", async () => {
      await db.settingValue.create({ data: { tenantId: ids.tenants[1], key: keys[0],
        value: { "common.save": "Foreign tenant" }, revision: 1, updatedById: ids.users[0] } });
      const foreign = await db.settingValue.findFirstOrThrow({ where: { tenantId: ids.tenants[1], key: keys[0] } });
      const revision = await db.settingRevision.create({ data: { tenantId: ids.tenants[1],
        settingValueId: foreign.id, revision: 1, newValue: foreign.value!, changedById: ids.users[0] } });
      await expectJson(await request(`admin/settings/${keys[0]}/rollback`, admin, "POST", {
        revision_id: revision.id,
      }), [404]);
      const history = await expectJson(await request(`admin/settings/${keys[0]}/revisions?tenant_id=${ids.tenants[1]}`));
      assert.ok(history.data.revisions.every((row: any) => row.tenantId === tenantId));
      const beforeRollback = await snapshot();
      await expectJson(await request(`admin/settings/${keys[0]}/rollback`, admin, "POST", {
        revision_id: history.data.revisions[0].id,
      }));
      const afterRollback = await snapshot();
      assert.equal(afterRollback.version, beforeRollback.version + 1);
      assert.equal(afterRollback.revisions.length, beforeRollback.revisions.length + 1);
      assert.equal(afterRollback.audit.length, beforeRollback.audit.length + 1);
      for (const previous of beforeRollback.revisions)
        assert.deepEqual(afterRollback.revisions.find(row => row.id === previous.id), previous);
      await db.settingValue.updateMany({ where: { tenantId, key: keys[0] },
        data: { value: { "status.paid": "Corrupt protected label" } } });
      await db.tenant.update({ where: { id: tenantId }, data: { configVersion: { increment: 1 } } });
      const { data } = await expectJson(await request(`ui-experience?tenant_id=${ids.tenants[1]}`, viewer));
      assert.deepEqual(data.copy, {});
      assert.equal(data.theme.preset, "berry");
      const immutable = await db.settingRevision.findMany({ where: { tenantId }, orderBy: { id: "asc" } });
      await assert.rejects(db.settingRevision.update({ where: { id: immutable[0].id }, data: { changeNote: "overwrite" } }));
      await assert.rejects(db.settingRevision.delete({ where: { id: immutable[0].id } }));
      assert.deepEqual(await db.settingRevision.findMany({ where: { tenantId }, orderBy: { id: "asc" } }), immutable);
      const auditGuards = await db.$queryRaw<Array<{ definition: string }>>`
        SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger
        WHERE tgrelid = 'activity_logs'::regclass AND NOT tgisinternal`;
      t.diagnostic(`ActivityLog custom triggers: ${auditGuards.length}; immutable revision proof does not certify immutable audit logs`);
    });
  } finally {
    await http?.close();
    if (seeded) await cleanupBusinessFixtures(db, target, ids);
    await db.$disconnect();
    await routerDb.$disconnect();
  }
});
