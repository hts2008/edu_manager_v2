import assert from "node:assert/strict";
import test from "node:test";
import { updateSetting } from "../lib/settings.js";

test("stale preview version fails before any setting/revision/audit mutation", async () => {
  const calls: string[] = [];
  const tx = { tenant: { updateMany: async ({ where }: any) => {
    assert.deepEqual(where, { id: "tenant", configVersion: 4 }); return { count: 0 };
  } }, settingValue: { findFirst: async () => { calls.push("read"); }, create: async () => { calls.push("write"); } } };
  await assert.rejects(updateSetting({ $transaction: async (work: any) => work(tx) }, {
    tenantId: "tenant", actorId: "actor", key: "finance.extra_session_policy", value: "derive_monthly",
    effectiveFromMonth: "2026-11", expectedConfigVersion: 4,
  } as any), (error: any) => error.code === "SETTING_CONFIG_CONFLICT" && error.status === 409);
  assert.deepEqual(calls, []);
});

test("invalid preview versions fail before transaction entry", async () => {
  for (const expectedConfigVersion of [-1, 1.5, "4", null, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(updateSetting({ $transaction: async () => { throw new Error("unexpected transaction"); } }, {
      tenantId: "tenant", actorId: "actor", key: "finance.extra_session_policy", value: "derive_monthly",
      effectiveFromMonth: "2026-11", expectedConfigVersion,
    } as any), (error: any) => error.code === "INVALID_CONFIG_VERSION");
  }
});

test("version zero is valid and claimed exactly once in the same transaction", async () => {
  const calls: string[] = [];
  const tx = { tenant: { updateMany: async ({ where }: any) => {
    assert.equal(where.configVersion, 0); calls.push("claim"); return { count: 1 };
  } }, settingValue: { findFirst: async () => null, create: async ({ data }: any) => {
    calls.push("value"); return { id: "setting", ...data };
  } }, settingRevision: { create: async () => { calls.push("revision"); } },
  activityLog: { create: async () => { calls.push("audit"); } } };
  const result = await updateSetting({ $transaction: async (work: any) => work(tx) }, {
    tenantId: "tenant", actorId: "actor", key: "finance.extra_session_policy", value: "derive_monthly",
    effectiveFromMonth: "2026-11", expectedConfigVersion: 0,
  });
  assert.equal(result.revision, 1);
  assert.deepEqual(calls, ["claim", "value", "revision", "audit"]);
});
