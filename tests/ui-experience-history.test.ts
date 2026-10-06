import assert from "node:assert/strict";
import test from "node:test";
import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import { handler as history } from "../server/api/admin/settings/[key]/revisions.js";
import { handler as rollback } from "../server/api/admin/settings/[key]/rollback.js";

function request(method: string, key: string, view = true) {
  const db = {
    tenant: { findUnique: async () => ({ configVersion: 1 }) },
    rolePermission: { findMany: async () => [
      { permissionKey: "console.access", allowed: true },
      { permissionKey: "console.experience.view", allowed: view },
      { permissionKey: "console.experience.edit", allowed: false },
      { permissionKey: "console.organization.view", allowed: false },
      { permissionKey: "console.finance.edit", allowed: false },
    ] },
    settingValue: { findMany: async () => [] },
    $transaction: async () => { throw new Error("Read-only user must never reach rollback writes"); },
  };
  return { ...createTestRequest({ method, query: { key }, body: { revision_id: "revision-a" } }),
    user: { id: "reader", role: "admin", tenantId: "tenant-a" }, db } as any;
}

for (const key of ["organization.ui_copy.vi", "organization.ui_theme"]) {
  test(`view-only user reads ${key} history but cannot rollback`, async () => {
    const req = request("GET", key);
    const read = createTestResponse();
    await history(req, read.res);
    assert.equal(read.state.statusCode, 200);
    assert.deepEqual((read.state.body as any).data.revisions, []);
    req.method = "POST";
    const write = createTestResponse();
    await rollback(req, write.res);
    assert.equal(write.state.statusCode, 403);
    assert.equal((write.state.body as any).error.details.permission_key, "console.experience.edit");
  });
  test(`history for ${key} requires experience view`, async () => {
    const res = createTestResponse();
    await history(request("GET", key, false), res.res);
    assert.equal(res.state.statusCode, 403);
  });
}
test("experience view does not grant other settings history", async () => {
  for (const key of ["organization.business_timezone", "finance.bulk_actions_max"]) {
    const res = createTestResponse();
    await history(request("GET", key), res.res);
    assert.equal(res.state.statusCode, 403);
  }
});
