import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assertAggregatePaymentAllowed } from "../server/api/monthly-fees/[id]/pay.js";
import { assertAggregateReceiptAllowed } from "../server/api/receipts/index.js";
import { generateMonthlyFees } from "../lib/monthly-fee-generator.js";
import { feeToDto } from "../server/api/parent-portal/me.js";
import { classLineToDto } from "../server/api/reports/student-fees.js";
import {
  assertManualFeePeriodsLocked,
  buildEnrollmentMap,
} from "../server/api/monthly-fees/calculate.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("strict class-line ledger", () => {
  it("merges period history and legacy enrollment per class", () => {
    const map = buildEnrollmentMap({
      enrollmentPeriods: [{
        classId: "english",
        class: { className: "English" },
        startedAt: new Date("2026-07-01"),
        endedAt: null,
      }],
      studentClasses: [
        { classId: "english", class: { className: "English legacy" }, enrollmentDate: new Date("2026-06-01") },
        { classId: "math", class: { className: "Math" }, enrollmentDate: new Date("2026-07-01") },
      ],
    });

    assert.deepEqual([...map.keys()].sort(), ["english", "math"]);
    assert.equal(map.get("english").periods.length, 1, "period history remains authoritative for its class");
    assert.equal(map.get("math").periods.length, 1, "legacy fallback fills only the class with no period history");
  });

  it("requires every manual fee class line to have a locked period and frozen month plan", () => {
    assert.doesNotThrow(() => assertManualFeePeriodsLocked([
      {
        classId: "math",
        className: "Math",
        attendancePeriodStatus: "locked",
        classMonthPlanState: "frozen",
      },
      {
        classId: "english",
        className: "English",
        attendancePeriodStatus: "locked",
        classMonthPlanState: "frozen",
      },
    ], "2026-07"));

    let feeWritten = false;
    assert.throws(
      () => {
        assertManualFeePeriodsLocked([
          {
            classId: "math",
            className: "Math",
            attendancePeriodStatus: "open",
            classMonthPlanState: "frozen",
          },
          {
            classId: "english",
            className: "English",
            attendancePeriodStatus: "locked",
            classMonthPlanState: "open",
          },
          {
            classId: "science",
            className: "Science",
            attendancePeriodStatus: null,
            classMonthPlanState: null,
          },
        ], "2026-07");
        feeWritten = true;
      },
      (error: any) => {
        assert.equal(error.code, "FEE_PERIOD_NOT_LOCKED");
        assert.equal(error.status, 409);
        assert.deepEqual(error.details, {
          month: "2026-07",
          required: {
            attendance_period_status: "locked",
            class_month_plan_state: "frozen",
          },
          classes: [
            {
              class_id: "math",
              class_name: "Math",
              attendance_period_status: "open",
              class_month_plan_state: "frozen",
            },
            {
              class_id: "english",
              class_name: "English",
              attendance_period_status: "locked",
              class_month_plan_state: "open",
            },
            {
              class_id: "science",
              class_name: "Science",
              attendance_period_status: null,
              class_month_plan_state: null,
            },
          ],
        });
        return true;
      },
    );
    assert.equal(feeWritten, false);
  });

  it("locks the student-month before authoritative manual fee calculation", () => {
    const endpoint = source("server/api/monthly-fees/calculate.ts");
    const transaction = endpoint.indexOf("runSerializableTransaction(prisma");
    const advisoryLock = endpoint.indexOf("await acquireAttendanceFeeAdvisoryLocks(");
    const studentRead = endpoint.indexOf("await tx.student.findFirst");
    const periodRead = endpoint.indexOf("tx.attendancePeriod.findMany");
    const monthPlanRead = endpoint.indexOf("tx.classMonthPlan.findMany");
    const sessionRead = endpoint.indexOf("tx.classSession.findMany");
    const feeRead = endpoint.indexOf("await tx.monthlyFee.findUnique");
    const readinessGuard = endpoint.lastIndexOf("assertManualFeePeriodsLocked(");
    const feeCreate = endpoint.indexOf("tx.monthlyFee.create");
    const feeUpdate = endpoint.indexOf("tx.monthlyFee.updateMany");

    assert.match(endpoint, /import \{ acquireAttendanceFeeAdvisoryLocks \} from "\.\.\/\.\.\/\.\.\/lib\/attendance-lock-transaction\.js"/);
    assert.ok(transaction >= 0);
    assert.ok(advisoryLock > transaction);
    assert.ok(studentRead > advisoryLock);
    assert.ok(periodRead > advisoryLock);
    assert.ok(monthPlanRead > advisoryLock);
    assert.ok(readinessGuard > periodRead);
    assert.ok(readinessGuard > monthPlanRead);
    assert.ok(sessionRead > readinessGuard);
    assert.ok(feeRead > readinessGuard);
    assert.ok(feeCreate > readinessGuard);
    assert.ok(feeUpdate > readinessGuard);
    assert.match(endpoint, /isolationLevel:\s*"Serializable"/);
  });

  it("rejects aggregate collection paths when a class line exists", () => {
    for (const guard of [assertAggregatePaymentAllowed, assertAggregateReceiptAllowed]) {
      assert.throws(
        () => guard({ lines: [{ id: "line-1" }] }),
        (error: any) => error.code === "CLASS_LINE_PAYMENT_REQUIRED" && error.status === 409
      );
      assert.doesNotThrow(() => guard({ lines: [] }));
    }
    assert.doesNotThrow(() => assertAggregateReceiptAllowed(null));
    assert.match(source("server/api/monthly-fees/[id]/pay.ts"), /lines:\s*\{/);
    assert.match(source("server/api/receipts/index.ts"), /lines:\s*\{/);
  });

  it("creates the aggregate and all class lines inside one transaction", async () => {
    const calls: string[] = [];
    const student = {
      id: "student-1",
      fullName: "Student One",
      deletedAt: null,
      monthlyFees: [],
      enrollmentPeriods: [],
      studentClasses: [
        { classId: "math", enrollmentDate: new Date("2026-07-01"), class: { className: "Math", feePerDay: 500000, billingPolicy: "monthly_prorated", sessionsPerWeek: 2, teacher: { fullName: "Teacher M" } } },
        { classId: "english", enrollmentDate: new Date("2026-07-01"), class: { className: "English", feePerDay: 400000, billingPolicy: "monthly_prorated", sessionsPerWeek: 1, teacher: { fullName: "Teacher E" } } },
      ],
    };
    const sessions = [
      { id: "math-1", classId: "math", sessionDate: new Date("2026-07-01"), billingMonth: "2026-07", kind: "regular", status: "held" },
      { id: "math-2", classId: "math", sessionDate: new Date("2026-07-03"), billingMonth: "2026-07", kind: "regular", status: "held" },
      { id: "english-1", classId: "english", sessionDate: new Date("2026-07-02"), billingMonth: "2026-07", kind: "regular", status: "held" },
    ];
    const attendance = [
      { studentId: "student-1", classId: "math", classSessionId: "math-1", attendanceDate: new Date("2026-07-01"), status: "present" },
      { studentId: "student-1", classId: "math", classSessionId: "math-2", attendanceDate: new Date("2026-07-03"), status: "present" },
      { studentId: "student-1", classId: "english", classSessionId: "english-1", attendanceDate: new Date("2026-07-02"), status: "present" },
    ];
    const tx: any = {
      $queryRaw: async () => [],
      student: { findUnique: async () => student },
      classSession: { findMany: async () => sessions },
      attendance: { findMany: async () => attendance },
      attendancePeriod: { findMany: async () => [
        { classId: "math", status: "locked" },
        { classId: "english", status: "locked" },
      ] },
      classMonthPlan: { findMany: async () => [
        { classId: "math", state: "frozen" },
        { classId: "english", state: "frozen" },
      ] },
      monthlyFee: {
        findUnique: async () => null,
        create: async ({ data }: any) => {
          calls.push("fee.create");
          return { id: "fee-1", ...data };
        },
      },
      monthlyFeeLine: {
        findUnique: async () => null,
        create: async ({ data }: any) => {
          calls.push(`line.create:${data.classId}`);
          return { id: `line-${data.classId}`, ...data };
        },
        deleteMany: async () => {
          calls.push("line.deleteMany");
          return { count: 0 };
        },
      },
    };
    const prisma: any = {
      student: {
        findMany: async () => [student],
      },
      $transaction: async (work: any) => {
        calls.push("transaction.begin");
        const result = await work(tx);
        calls.push("transaction.commit");
        return result;
      },
    };

    const result = await generateMonthlyFees(prisma, { month: "2026-07", dryRun: false });

    assert.deepEqual(calls, [
      "transaction.begin",
      "fee.create",
      "line.create:math",
      "line.create:english",
      "line.deleteMany",
      "transaction.commit",
    ]);
    assert.equal(result.items[0].action, "created");
    assert.equal(result.items[0].total_days, 3);
  });

  it("updates an existing unpaid class line in the aggregate transaction", async () => {
    const updates: any[] = [];
    const existingFee = { id: "fee-1", studentId: "student-1", month: "2026-07", status: "ready", totalDays: 1, totalAmount: 50000 };
    const student = {
      id: "student-1",
      fullName: "Student One",
      deletedAt: null,
      monthlyFees: [existingFee],
      enrollmentPeriods: [],
      studentClasses: [{ classId: "math", enrollmentDate: new Date("2026-07-01"), class: { className: "Math", feePerDay: 500000, billingPolicy: "monthly_prorated", sessionsPerWeek: 2, teacher: null } }],
    };
    const sessions = [
      { id: "math-1", classId: "math", sessionDate: new Date("2026-07-01"), billingMonth: "2026-07", kind: "regular", status: "held" },
      { id: "math-2", classId: "math", sessionDate: new Date("2026-07-03"), billingMonth: "2026-07", kind: "regular", status: "held" },
      { id: "math-3", classId: "math", sessionDate: new Date("2026-07-05"), billingMonth: "2026-07", kind: "regular", status: "held" },
    ];
    const attendance = [
      { studentId: "student-1", classId: "math", classSessionId: "math-1", attendanceDate: new Date("2026-07-01"), status: "present" },
      { studentId: "student-1", classId: "math", classSessionId: "math-2", attendanceDate: new Date("2026-07-03"), status: "present" },
      { studentId: "student-1", classId: "math", classSessionId: "math-3", attendanceDate: new Date("2026-07-05"), status: "present" },
    ];
    const tx: any = {
      $queryRaw: async () => [],
      student: { findUnique: async () => student },
      classSession: { findMany: async () => sessions },
      attendance: { findMany: async () => attendance },
      attendancePeriod: { findMany: async () => [{ classId: "math", status: "locked" }] },
      classMonthPlan: { findMany: async () => [{ classId: "math", state: "frozen" }] },
      monthlyFee: {
        findUnique: async () => existingFee,
        updateMany: async () => ({ count: 1 }),
        findUniqueOrThrow: async () => existingFee,
      },
      monthlyFeeLine: {
        findUnique: async () => ({ id: "line-math", status: "ready", receiptId: null, paidAt: null }),
        update: async ({ data }: any) => {
          updates.push(data);
          return { id: "line-math", ...data };
        },
        deleteMany: async () => ({ count: 0 }),
      },
    };
    const prisma: any = {
      student: { findMany: async () => [student] },
      $transaction: async (work: any) => work(tx),
    };

    const result = await generateMonthlyFees(prisma, { month: "2026-07", dryRun: false });

    assert.equal(result.items[0].action, "updated");
    assert.equal(updates.length, 1);
    assert.equal(updates[0].classId, "math");
    assert.equal(updates[0].chargedSessions, 3);
    assert.equal(updates[0].status, "ready");
  });

  it("exposes independent per-class payment status in parent and report DTOs", () => {
    const lines = [
      { id: "line-paid", classId: "math", classNameSnapshot: "Math", chargedSessions: 2, expectedSessions: 8, feePerSession: 50000, amount: 100000, status: "paid", receiptId: "receipt-1", paidAt: new Date("2026-07-10") },
      { id: "line-ready", classId: "english", classNameSnapshot: "English", chargedSessions: 1, expectedSessions: 4, feePerSession: 100000, amount: 100000, status: "ready", receiptId: null, paidAt: null },
    ];
    const parentFee = feeToDto({ id: "fee-1", studentId: "student-1", month: "2026-07", totalDays: 3, totalAmount: 200000, status: "ready", receiptId: null, paidAt: null, lines });

    assert.deepEqual(parentFee.lines.map((line: any) => line.status), ["paid", "ready"]);
    assert.equal(classLineToDto(lines[0]).paid_amount, 100000);
    assert.equal(classLineToDto(lines[0]).outstanding_amount, 0);
    assert.equal(classLineToDto(lines[1]).paid_amount, 0);
    assert.equal(classLineToDto(lines[1]).outstanding_amount, 100000);
  });
});
