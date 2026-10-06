import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canonicalizeBulkFeePayment } from "../lib/monthly-fee-lines.js";

function payload(count: number) {
  return {
    line_ids: Array.from({ length: count }, (_, index) => `line-${index}`),
    month: "2026-08",
    payment_method: "cash",
  };
}

test("bulk fee canonicalization keeps the legacy default and accepts a tenant cap", () => {
  assert.doesNotThrow(() => canonicalizeBulkFeePayment(payload(3), 3));
  assert.throws(() => canonicalizeBulkFeePayment(payload(4), 3), /at most 3/);
  assert.throws(() => canonicalizeBulkFeePayment(payload(501)), /at most 500/);
});

test("bulk endpoints resolve tenant settings while keeping request safety caps", () => {
  const pay = readFileSync("server/api/monthly-fees/bulk-pay.ts", "utf8");
  const actions = readFileSync("server/api/bulk-actions/index.ts", "utf8");
  const validation = readFileSync("lib/validation.ts", "utf8");

  assert.match(pay, /finance\.bulk_pay_max_lines/);
  assert.match(pay, /canonicalizeBulkFeePayment\(validated,\s*maxLines\)/);
  assert.match(actions, /finance\.bulk_actions_max/);
  assert.match(actions, /ids\.length > maxRecords/);
  assert.match(validation, /line_ids supports at most 500 values/);
  assert.doesNotMatch(validation, /bulk actions are limited to 100 records/);
});
