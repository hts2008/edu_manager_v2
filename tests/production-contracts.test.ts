import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("dashboard API exposes the frontend operations-console contract", () => {
  const code = source("server/api/reports/dashboard.ts");

  assert.match(code, /export default requireAuth\(handler\)/);
  assert.match(code, /unpaidFeesCount/);
  assert.match(code, /unpaidFeesAggregate/);
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
  const bulkPay = source("server/api/monthly-fees/bulk-pay.ts");
  const confirm = source("server/api/monthly-fees/[id]/confirm.ts");
  const cancel = source("server/api/monthly-fees/[id]/cancel.ts");
  const calculate = source("server/api/monthly-fees/calculate.ts");
  const receipts = source("server/api/receipts/index.ts");
  const receiptCorrect = source("server/api/receipts/[id]/correct.ts");
  const recycleBin = source("lib/recycle-bin.ts");

  assert.match(pay, /FEE_PAYMENT_CONFLICT/);
  assert.match(pay, /ZERO_DAY_POSITIVE_RECEIPT/);
  assert.match(pay, /updateMany/);
  assert.match(pay, /receiptId: null/);
  assert.match(bulkPay, /ZERO_DAY_POSITIVE_RECEIPT/);
  assert.match(bulkPay, /NO_CHARGEABLE_AMOUNT/);
  assert.match(bulkPay, /receipt_ids/);
  assert.match(bulkPay, /line_ids/);
  assert.doesNotMatch(bulkPay, /student_ids|fee_ids|resolveLineIdsForTarget/);
  assert.match(bulkPay, /Idempotency-Key/);
  assert.doesNotMatch(bulkPay, /monthlyFeeLineId:\s*null/);
  assert.match(confirm, /updateMany/);
  assert.match(confirm, /MONTHLY_FEE_STATE_CONFLICT/);
  assert.match(cancel, /updateMany/);
  assert.match(cancel, /MONTHLY_FEE_STATE_CONFLICT/);
  assert.match(calculate, /FEE_ALREADY_PAID/);
  assert.match(calculate, /updateMany/);
  assert.match(receipts, /monthly_fee_id/);
  assert.match(receipts, /MONTHLY_FEE_LINK_CONFLICT/);
  assert.match(receipts, /ZERO_DAY_POSITIVE_RECEIPT/);
  assert.match(receiptCorrect, /CORRECTION_REASON_REQUIRED/);
  assert.match(receiptCorrect, /RECEIPT_NOT_ANOMALOUS/);
  assert.match(receiptCorrect, /CORRECT_RECEIPT/);
  assert.match(recycleBin, /CORRECTED_RECEIPT_CANNOT_BE_RESTORED/);
});

test("monthly-fees bulk-pay route is resolved before dynamic id route", () => {
  const router = source("api/router.ts");

  assert.match(router, /monthlyFeesBulkPay/);
  assert.ok(
    router.indexOf('exact(parts, ["monthly-fees", "bulk-pay"]') <
      router.indexOf('resource === "monthly-fees" && parts.length === 2'),
    "bulk-pay must be declared before /monthly-fees/:id"
  );
});

test("receipt correction route is resolved before dynamic id route", () => {
  const router = source("api/router.ts");

  assert.match(router, /receiptCorrect/);
  assert.ok(
    router.indexOf('action === "correct"') >
      router.indexOf('action === "pdf"'),
    "receipt correction should be declared alongside static receipt actions"
  );
  assert.ok(
    router.indexOf('action === "correct"') <
      router.indexOf('resource === "payments"'),
    "receipt correction must resolve before the next resource block"
  );
});

test("attendance lock refreshes only the locked class line and recomputes the aggregate", () => {
  const endpoint = source("server/api/attendance-periods/[id]/index.ts");
  const helper = source("lib/attendance-lock-transaction.ts");

  assert.match(endpoint, /runSerializableTransaction/);
  assert.doesNotMatch(endpoint, /prisma\.\$transaction/);
  assert.match(endpoint, /lockAttendancePeriodAndSyncFees/);
  assert.match(helper, /calculateStudentMonthlyTuition/);
  assert.match(helper, /targetClassId: input\.classId/);
  assert.match(helper, /classId: input\.classId/);
  assert.doesNotMatch(helper, /classId: \{ in: classIds \}/);
  assert.match(helper, /nextMonthStart/);
  assert.match(helper, /lt: nextMonthStart/);
  assert.match(helper, /ATTENDANCE_PERIOD_STATE_CONFLICT/);
  assert.match(helper, /pg_advisory_xact_lock/);
  assert.match(helper, /monthlyFee\.createMany/);
  assert.match(helper, /monthlyFeeLine\.createMany/);
});

test("student fee report flags paid receipt anomalies even without monthly fee rows", () => {
  const code = source("server/api/reports/student-fees.ts");

  assert.match(code, /RECEIPT_WITH_ZERO_DAYS/);
  assert.match(code, /detectReceiptAnomaly/);
  assert.match(code, /anomaly_detail/);
});

test("BI report is admin-only and exposed by the production router", () => {
  const report = source("server/api/reports/bi.ts");
  const router = source("api/router.ts");

  assert.match(report, /export default requireAuth\(handler,\s*\["admin"\]\)/);
  assert.doesNotMatch(report, /enrollmentWhere\.classId/);
  assert.match(report, /filterReportRows\(cube\.students,\s*query\)/);
  assert.match(report, /evidenceByEnrollment/);
  assert.match(router, /reportsBi/);
  assert.match(router, /exact\(parts, \["reports", "bi"\], routes\.reportsBi\)/);
});

test("workbench never downgrades confirmed legacy fees during read-only listing", () => {
  const code = source("server/api/monthly-fees/workbench.ts");

  assert.doesNotMatch(code, /syncMonthlyFeeLines/);
  assert.doesNotMatch(code, /refreshMonthlyFeeAggregateFromLines/);
  assert.match(code, /legacyFeeClassRows/);
  assert.match(code, /legacy_needs_recalculation/);
  assert.match(code, /LEGACY_AGGREGATE_FEE/);
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
