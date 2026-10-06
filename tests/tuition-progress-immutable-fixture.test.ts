import assert from "node:assert/strict";
import test from "node:test";
import { cleanupBusinessFixtures, fixtureIds } from "./helpers/tuition-progress-http.js";

test("append-only fixture audit history is retained without deletion or trigger bypass", async () => {
  const ids = fixtureIds();
  const target = { database: "tpr_test_fixture", schema: "tpr_test_fixture", url: "unused" };
  let deleted = false;
  const db = { $queryRaw: async () => [{ database: target.database, schema: target.schema }],
    tenant: { findMany: async () => ids.tenants.map(id => ({ id, name: "TPR HTTP fixture" })) },
    settingRevision: { findMany: async () => [{ id: "immutable", tenantId: ids.tenants[0], revision: 1 }] },
    $transaction: async () => { deleted = true; throw new Error("must not delete"); } };
  await cleanupBusinessFixtures(db as any, target, ids);
  assert.equal(deleted, false);
});
