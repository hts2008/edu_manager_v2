import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("dashboard API exposes the frontend operations-console contract", () => {
  const code = source("server/api/reports/dashboard.ts");

  assert.match(code, /export default requireAuth\(handler\)/);
  assert.match(code, /unpaid_students/);
  assert.match(code, /today_attendance/);
  assert.match(code, /attention_items/);
  assert.match(code, /quick_metrics/);
  assert.match(code, /recent_transactions/);
});

test("attendance write APIs reject edits against locked periods", () => {
  const single = source("server/api/attendance/index.ts");
  const bulk = source("server/api/attendance/bulk.ts");
  const guard = source("lib/attendance-lock.ts");

  assert.match(guard, /ATTENDANCE_PERIOD_LOCKED/);
  assert.match(single, /assertAttendanceDatesEditable/);
  assert.match(bulk, /assertAttendanceDatesEditable/);
  assert.match(bulk, /"holiday"/);
});

test("money APIs protect fee ledger linkage", () => {
  const pay = source("server/api/monthly-fees/[id]/pay.ts");
  const receipts = source("server/api/receipts/index.ts");

  assert.match(pay, /FEE_PAYMENT_CONFLICT/);
  assert.match(pay, /updateMany/);
  assert.match(pay, /receiptId: null/);
  assert.match(receipts, /monthly_fee_id/);
  assert.match(receipts, /MONTHLY_FEE_LINK_CONFLICT/);
});

test("core serverless handlers use DB-backed requireAuth instead of token-only auth", () => {
  const files = [
    "server/api/auth/me.ts",
    "server/api/students/index.ts",
    "server/api/parents/index.ts",
    "server/api/classes/index.ts",
    "server/api/teachers/index.ts",
    "server/api/attendance/index.ts",
    "server/api/attendance/bulk.ts",
    "server/api/attendance/month.ts",
    "server/api/attendance-periods/index.ts",
    "server/api/attendance-periods/[id]/index.ts",
    "server/api/reports/dashboard.ts",
  ];

  for (const file of files) {
    const code = source(file);
    assert.match(code, /export default requireAuth\(handler\)/, file);
    assert.doesNotMatch(code, /verifyAuth\(/, file);
  }
});
