import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("../scripts/reconcile-tuition-v3.ts", import.meta.url), "utf8");

describe("Tuition V3 reconciliation safety", () => {
  it("is month-scoped and dry-run unless apply is explicit", () => {
    assert.match(source, /--month=YYYY-MM is required/);
    assert.match(source, /process\.argv\.includes\("--apply"\)/);
    assert.match(source, /mode: apply \? "apply" : "dry-run"/);
  });
  it("never selects confirmed, paid, or receipt-linked fee lines", () => {
    assert.match(source, /status: \{ in: \["pending", "ready"\] \}/);
    assert.match(source, /receiptId: null/);
    assert.match(source, /paidAt: null/);
    assert.match(source, /receiptLines: \{ none: \{\} \}/);
  });
  it("requires a reason and writes an immutable revision per applied line", () => {
    assert.match(source, /--apply requires --reason/);
    assert.match(source, /monthlyFeeLineRevision\.create/);
    assert.match(source, /beforeSnapshot/);
    assert.match(source, /afterSnapshot/);
    assert.match(source, /refreshMonthlyFeeAggregateFromLines/);
  });
  it("detects source drift and same-amount ledger changes", () => {
    assert.match(source, /sourceFingerprint/);
    assert.match(source, /Tuition source changed during reconcile/);
    assert.match(source, /calculationFields\(line\) !== calculationFields\(after\)/);
  });
});
