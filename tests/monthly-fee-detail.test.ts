import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  monthlyFeeLineToBreakdown,
  requirePersistedMonthlyFeeLines,
} from "../server/api/monthly-fees/[id]/index.js";

const endpointSource = readFileSync(
  new URL("../server/api/monthly-fees/[id]/index.ts", import.meta.url),
  "utf8",
);

describe("monthly fee detail persisted line contract", () => {
  it("returns persisted Tuition V3 line values without cadence recalculation", () => {
    const calculationSnapshot = {
      expected_regular_sessions: 9,
      requested_dates: ["2026-06-03", "2026-06-05"],
      sessions_per_week: 99,
    };

    const result = monthlyFeeLineToBreakdown({
      id: "line-1",
      classId: "class-1",
      classNameSnapshot: "Flyer B2",
      teacherNameSnapshot: "Hoang Thi Mai",
      expectedSessions: 9,
      chargedSessions: 8,
      makeUpSessions: 1,
      extraSessions: 0,
      feePerSession: 100_000,
      monthlyTuition: 900_000,
      amount: 800_000,
      billingMode: "monthly_prorated",
      scheduleMode: "class_session_ledger",
      status: "ready",
      receiptId: null,
      paidAt: null,
      allocationConfidence: "ledger_exact",
      contractSessions: 9,
      eligibleSessions: 9,
      deliveredSessions: 8,
      centerCreditSessions: 0,
      studentWaivedSessions: 1,
      calculationVersion: "tuition-v3-session-ledger",
      calculationSnapshot,
    });

    assert.equal(result.fee_per_day, 100_000);
    assert.equal(result.fee_per_session, 100_000);
    assert.equal(result.days_count, 8);
    assert.equal(result.expected_sessions, 9);
    assert.equal(result.amount, 800_000);
    assert.equal(result.schedule_mode, "class_session_ledger");
    assert.equal(result.calculation_version, "tuition-v3-session-ledger");
    assert.deepEqual(result.calculation_snapshot, calculationSnapshot);
  });

  it("fails clearly instead of inventing a cadence denominator when lines are absent", () => {
    assert.throws(
      () => requirePersistedMonthlyFeeLines([], "fee-1"),
      (error: any) => {
        assert.equal(error.code, "MONTHLY_FEE_LINES_MISSING");
        assert.equal(error.status, 409);
        assert.deepEqual(error.details, { monthly_fee_id: "fee-1" });
        return true;
      },
    );
  });

  it("loads persisted lines and contains no attendance or cadence fallback", () => {
    assert.match(endpointSource, /lines:\s*\{/);
    assert.doesNotMatch(endpointSource, /calculateTuitionForClass/);
    assert.doesNotMatch(endpointSource, /attendance\.count/);
    assert.doesNotMatch(endpointSource, /studentClasses/);
    assert.doesNotMatch(endpointSource, /sessionsPerWeek|sessions_per_week/);
  });
});
