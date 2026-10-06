import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSetting } from "../lib/settings-resolver.js";

const rows = [
  { id: "default", tenantId: "tenant-a", key: "finance.bulk_actions_max", value: 80, effectiveMonth: null, revision: 1 },
  { id: "jan", tenantId: "tenant-a", key: "academic.score_blend", value: { skill: 0.65, attendance: 0.2, consistency: 0.15 }, effectiveMonth: "2026-01", revision: 2 },
  { id: "jun", tenantId: "tenant-a", key: "academic.score_blend", value: { skill: 0.7, attendance: 0.2, consistency: 0.1 }, effectiveMonth: "2026-06", revision: 3 },
  { id: "other", tenantId: "tenant-b", key: "academic.score_blend", value: { skill: 0.5, attendance: 0.3, consistency: 0.2 }, effectiveMonth: "2025-01", revision: 99 },
] as const;

describe("effective-dated Admin Console settings resolver", () => {
  it("uses the registry default with explicit provenance when no override exists", () => {
    const result = resolveSetting({ tenantId: "tenant-a", key: "flags.parent_portal_enabled", rows });
    assert.equal(result.value, true);
    assert.equal(result.provenance, "registry_default");
    assert.equal(result.revision, null);
  });

  it("resolves a tenant default for a non-effective setting", () => {
    const result = resolveSetting({ tenantId: "tenant-a", key: "finance.bulk_actions_max", rows });
    assert.equal(result.value, 80);
    assert.equal(result.provenance, "tenant_default");
    assert.equal(result.revision, 1);
  });

  it("selects the latest eligible effective month without leaking another tenant", () => {
    const before = resolveSetting({ tenantId: "tenant-a", key: "academic.score_blend", effectiveMonth: "2026-05", rows });
    const after = resolveSetting({ tenantId: "tenant-a", key: "academic.score_blend", effectiveMonth: "2026-07", rows });
    assert.deepEqual(before.value, { skill: 0.65, attendance: 0.2, consistency: 0.15 });
    assert.equal(before.sourceId, "jan");
    assert.deepEqual(after.value, { skill: 0.7, attendance: 0.2, consistency: 0.1 });
    assert.equal(after.sourceId, "jun");
  });

  it("requires YYYY-MM for settings that affect financial or academic history", () => {
    assert.throws(
      () => resolveSetting({ tenantId: "tenant-a", key: "academic.score_blend", rows }),
      /requires effectiveMonth/,
    );
    assert.throws(
      () => resolveSetting({ tenantId: "tenant-a", key: "academic.score_blend", effectiveMonth: "06-2026", rows }),
      /YYYY-MM/,
    );
  });

  it("fails closed when a stored value no longer satisfies its registry schema", () => {
    assert.throws(
      () => resolveSetting({
        tenantId: "tenant-a",
        key: "finance.bulk_actions_max",
        rows: [{ id: "bad", tenantId: "tenant-a", key: "finance.bulk_actions_max", value: 0, effectiveMonth: null, revision: 1 }],
      }),
    );
  });
});
