import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCorrectionNote,
  buildMonthlyFeeLineRevisionSnapshot,
  calculateStudentMonthlyFee,
  detectMonthlyFeeAnomaly,
  detectReceiptAnomaly,
  hasMaterialMonthlyFeeLineChange,
  isCorrectionNote,
} from "../lib/finance-corrections.js";

describe("finance correction policy", () => {
  it("flags positive receipts with zero chargeable sessions", () => {
    assert.equal(
      detectReceiptAnomaly({ amount: 6000000, daysCount: 0 }),
      "RECEIPT_WITH_ZERO_DAYS"
    );
    assert.equal(detectReceiptAnomaly({ amount: 0, daysCount: 0 }), null);
    assert.equal(detectReceiptAnomaly({ amount: 600000, daysCount: 6 }), null);
  });

  it("flags paid monthly fees with positive amount and zero days", () => {
    assert.equal(
      detectMonthlyFeeAnomaly({
        status: "paid",
        totalAmount: 6000000,
        totalDays: 0,
      }),
      "PAID_WITH_ZERO_DAYS"
    );
    assert.equal(
      detectMonthlyFeeAnomaly({
        status: "ready",
        totalAmount: 6000000,
        totalDays: 0,
      }),
      null
    );
  });

  it("marks correction notes so receipts cannot be restored silently", () => {
    const note = buildCorrectionNote("Old note", {
      originalReceiptId: "receipt-1",
      reason: "operator audit",
    });

    assert.match(note, /Old note/);
    assert.match(note, /\[CORRECTION\] Voided receipt receipt-1/);
    assert.equal(isCorrectionNote(note), true);
    assert.equal(isCorrectionNote("manual delete"), false);
  });

  it("detects material fee-line changes while ignoring timestamps", () => {
    const before = {
      id: "line-1",
      allocationKey: "class:class-1",
      amount: 300_000,
      calculationSnapshot: { ledger: [{ amount: 300_000, date: "2026-06-01" }] },
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    };
    const timestampOnly = {
      ...before,
      updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    };
    const changed = { ...timestampOnly, amount: 600_000 };

    assert.equal(hasMaterialMonthlyFeeLineChange(before, timestampOnly), false);
    assert.equal(hasMaterialMonthlyFeeLineChange(before, changed), true);
    assert.equal(
      buildMonthlyFeeLineRevisionSnapshot(before).updatedAt,
      "2026-06-01T00:00:00.000Z",
    );
  });

  it("recalculates from the class-session ledger without cadence fallbacks", async () => {
    const classData = {
      id: "class-1",
      className: "Flyer B2",
      billingPolicy: "monthly_prorated",
      feePerDay: 900_000,
      teacher: { fullName: "Teacher A" },
    };
    const sessions = [1, 2, 3].map((day) => ({
      id: `session-${day}`,
      classId: "class-1",
      sessionDate: new Date(`2026-06-0${day}T00:00:00.000Z`),
      billingMonth: "2026-06",
      kind: "regular",
      status: "held",
      extraFeeMode: "included",
      replacementForId: null,
    }));
    const attendance = sessions.map((session, index) => ({
      classSessionId: session.id,
      attendanceDate: session.sessionDate,
      status: index < 2 ? "present" : "absent_no_fee",
    }));
    const client = {
      student: {
        findFirst: async () => ({
          id: "student-1",
          fullName: "Student A",
          studentClasses: [],
          enrollmentPeriods: [{
            classId: "class-1",
            class: classData,
            startedAt: new Date("2026-06-01T00:00:00.000Z"),
            endedAt: null,
          }],
        }),
      },
      classSession: { findMany: async () => sessions },
      attendance: { findMany: async () => attendance },
    };

    const result = await calculateStudentMonthlyFee(
      client,
      "student-1",
      "2026-06",
    );

    assert.equal(result.totalDays, 2);
    assert.equal(result.totalAmount, 600_000);
    assert.equal(result.breakdown[0].expected_sessions, 3);
    assert.equal(result.breakdown[0].calculation_version, "tuition-v3-session-ledger");
  });

  it("rejects a monthly package without an explicit month plan", async () => {
    const client = {
      student: {
        findFirst: async () => ({
          id: "student-1",
          studentClasses: [{
            classId: "class-1",
            enrollmentDate: new Date("2026-06-01T00:00:00.000Z"),
            class: {
              id: "class-1",
              className: "Flyer B2",
              billingPolicy: "monthly_prorated",
              feePerDay: 900_000,
            },
          }],
          enrollmentPeriods: [],
        }),
      },
      classSession: { findMany: async () => [] },
      attendance: { findMany: async () => [] },
    };

    await assert.rejects(
      calculateStudentMonthlyFee(client, "student-1", "2026-06"),
      (error: any) => error?.code === "MISSING_MONTH_PLAN" && error?.status === 409,
    );
  });
});
