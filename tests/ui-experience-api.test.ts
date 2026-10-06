import assert from "node:assert/strict";
import test from "node:test";
import { handler, publishExperience, readExperience } from "../server/api/ui-experience.js";
import { handler as historyHandler } from "../server/api/admin/settings/[key]/revisions.js";
import { handler as rollbackHandler } from "../server/api/admin/settings/[key]/rollback.js";
import { createTestResponse } from "../lib/request-response-adapter.js";

function database(failSecond = false) {
  let state: any = { version: 4, rows: [], revisions: [], logs: [] };
  const client = (current: any) => ({
    tenant: {
      findUnique: async () => ({ configVersion: current.version }),
      updateMany: async ({ where }: any) => {
        if (where.configVersion !== current.version) return { count: 0 };
        current.version++; return { count: 1 };
      },
    },
    settingValue: {
      findMany: async ({ where }: any) => current.rows.filter((row: any) => row.tenantId === where.tenantId),
      findFirst: async ({ where }: any) => current.rows.find((row: any) => row.key === where.key && row.tenantId === where.tenantId),
      create: async ({ data }: any) => {
        if (failSecond && data.key === "organization.ui_theme") throw new Error("write failed");
        const row = { id: String(current.rows.length), ...data }; current.rows.push(row); return row;
      },
    },
    settingRevision: { create: async ({ data }: any) => current.revisions.push(data) },
    activityLog: { create: async ({ data }: any) => current.logs.push(data) },
  });
  const db: any = {
    ...client(state),
    $transaction: async (run: any, options: any) => {
      assert.equal(options.isolationLevel, "Serializable");
      const draft = structuredClone(state);
      const result = await run(client(draft));
      state = draft; Object.assign(db, client(state)); return result;
    },
  };
  return { db, state: () => state };
}
const payload = { copy: { "common.save": "Lưu ngay" }, theme: { preset: "mint", radius: "soft", depth: "clay" }, expected_config_version: 4 };
test("publishes two settings and their revisions atomically with CAS", async () => {
  const h = database();
  const result = await publishExperience(h.db, "tenant-a", "actor", payload);
  assert.equal(result.config_version, 6);
  assert.equal(result.copy["common.save"], "Lưu ngay");
  assert.equal(h.state().rows.length, 2);
  assert.equal(h.state().revisions.length, 2);
  assert.equal(h.state().logs.length, 2);
});
test("stale version and second-write failures commit nothing", async () => {
  for (const failure of [false, true]) {
    const h = database(failure);
    await assert.rejects(publishExperience(h.db, "tenant-a", "actor", { ...payload, expected_config_version: failure ? 4 : 3 }));
    assert.equal(h.state().version, 4);
    assert.equal(h.state().rows.length, 0);
  }
});
test("rejects unsafe/protected copy and missing version before any write", async () => {
  for (const body of [{ ...payload, copy: { "status.paid": "fake" } }, { ...payload, copy: { "common.save": "<script>" } }, { ...payload, expected_config_version: undefined }]) {
    const h = database();
    await assert.rejects(publishExperience(h.db, "tenant-a", "actor", body));
    assert.equal(h.state().version, 4);
  }
});
test("read exposes only safe experience and tenant version", async () => {
  const h = database();
  const result = await readExperience(h.db, "tenant-a");
  assert.equal(result.config_version, 4);
  assert.equal("status.paid" in result.copy, false);
  assert.equal(result.theme.preset, "mint");
  assert.equal("settings" in result, false);
});
test("GET falls back for corrupt stored values and isolates tenant overrides", async () => {
  const h = database();
  h.state().rows.push({ id: "bad", tenantId: "tenant-a", key: "organization.ui_copy.vi", value: { "status.paid": "fake" }, revision: 1 },
    { id: "other", tenantId: "tenant-b", key: "organization.ui_theme", value: { preset: "berry", radius: "soft", depth: "flat" }, revision: 1 });
  const result = await readExperience(h.db, "tenant-a");
  assert.deepEqual(result.copy, {});
  assert.equal(result.theme.preset, "mint");
});
test("handler denies unauthorized publish and missing tenant before writes", async () => {
  const h = database();
  h.db.rolePermission = { findMany: async () => [{ permissionKey: "console.experience.edit", allowed: false }] };
  for (const tenantId of ["tenant-a", null]) {
    const res: any = { code: 0, body: null, setHeader() {}, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
    await handler({ method: "PUT", body: payload, db: h.db, user: { id: "actor", role: "admin", tenantId } } as any, res);
    assert.equal(res.code, 403);
    assert.equal(h.state().version, 4);
    assert.equal(h.state().rows.length, 0);
  }
});

test("experience view grants history for only the two UI keys, never publishing or rollback", async () => {
  for (const key of ["organization.ui_copy.vi", "organization.ui_theme", "finance.extra_session_policy"]) {
    const h = database();
    h.db.rolePermission = { findMany: async () => [
      { permissionKey: "console.experience.view", allowed: true },
      { permissionKey: "console.experience.edit", allowed: false },
    ] };
    const req: any = { method: "GET", query: { key }, db: h.db,
      user: { id: "actor", role: "receptionist", tenantId: "tenant-a" } };
    const history = createTestResponse();
    await historyHandler(req, history.res);
    assert.equal(history.state.statusCode, key === "finance.extra_session_policy" ? 403 : 200);
    const rollback = createTestResponse();
    await rollbackHandler({ ...req, method: "POST", body: { revision_id: "revision" } }, rollback.res);
    assert.equal(rollback.state.statusCode, 403);
    const publish = createTestResponse();
    await handler({ ...req, method: "PUT", body: payload }, publish.res);
    assert.equal(publish.state.statusCode, 403);
    assert.equal(h.state().version, 4);
  }
});

test("history denies an experience editor whose view permission is explicitly disabled", async () => {
  const h = database();
  h.db.rolePermission = { findMany: async () => [
    { permissionKey: "console.experience.view", allowed: false },
    { permissionKey: "console.experience.edit", allowed: true },
  ] };
  const response = createTestResponse();
  await historyHandler({ method: "GET", query: { key: "organization.ui_theme" }, db: h.db,
    user: { id: "actor", role: "admin", tenantId: "tenant-a" } } as any, response.res);
  assert.equal(response.state.statusCode, 403);
});
