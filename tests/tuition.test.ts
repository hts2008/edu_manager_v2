import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateTuitionForClass,
  calculateStudentMonthlyTuition,
  countCalendarRowsInMonth,
  countScheduleDaysInMonth,
  normalizeScheduleDays,
} from "../lib/tuition.js";

describe("tuition calculation", () => {
  it("uses calendar rows instead of average 4.33 weeks for sessions-per-week billing", () => {
    assert.equal(countCalendarRowsInMonth("2026-05"), 6);
    assert.equal(countCalendarRowsInMonth("2026-06"), 5);

    const may = calculateTuitionForClass(
      { feePerDay: 500000, sessionsPerWeek: 2 },
      "2026-05",
      12
    );
    assert.equal(may.billingMode, "monthly_package");
    assert.equal(may.expectedSessions, 12);
    assert.equal(may.feePerSession, 41667);
    assert.equal(may.totalAmount, 500000);

    const june = calculateTuitionForClass(
      { feePerDay: 500000, sessionsPerWeek: 2 },
      "2026-06",
      2
    );
    assert.equal(june.expectedSessions, 10);
    assert.equal(june.feePerSession, 50000);
    assert.equal(june.totalAmount, 100000);
  });

  it("maps Vietnamese weekday values to real calendar weekdays", () => {
    const mondayWednesday = normalizeScheduleDays([2, 4]);
    assert.deepEqual(mondayWednesday, [1, 3]);
    assert.equal(countScheduleDaysInMonth("2026-06", mondayWednesday), 9);
  });

  it("keeps unscheduled legacy classes as per-session billing", () => {
    const result = calculateTuitionForClass({ feePerDay: 500000 }, "2026-06", 2);
    assert.equal(result.billingMode, "per_session_legacy");
    assert.equal(result.expectedSessions, 2);
    assert.equal(result.feePerSession, 500000);
    assert.equal(result.totalAmount, 1000000);
  });

  it("never produces a non-zero amount for zero charged sessions", () => {
    const result = calculateTuitionForClass(
      { feePerDay: 500000, sessionsPerWeek: 2 },
      "2026-05",
      0
    );
    assert.equal(result.expectedSessions, 12);
    assert.equal(result.chargedSessions, 0);
    assert.equal(result.totalAmount, 0);
  });

  it("aggregates multi-class tuition into one student-month total", () => {
    const result = calculateStudentMonthlyTuition(
      [
        {
          classId: "english",
          feePerDay: 500000,
          sessionsPerWeek: 2,
          chargedSessions: 12,
        },
        {
          classId: "math",
          feePerDay: 800000,
          sessionsPerWeek: 1,
          chargedSessions: 6,
        },
      ],
      "2026-05"
    );

    assert.equal(result.totalDays, 18);
    assert.equal(result.totalAmount, 1300000);
    assert.deepEqual(result.classes.map((item) => item.classId), ["english", "math"]);
  });
});
