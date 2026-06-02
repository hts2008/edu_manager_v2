import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateTuitionForClass,
  calculateStudentMonthlyTuition,
  countCalendarRowsInMonth,
  countMonthBoundedWeeklySessions,
  countScheduleDaysInMonth,
  resolveAttendanceSessionPolicy,
  normalizeScheduleDays,
} from "../lib/tuition.js";

describe("tuition calculation", () => {
  it("bounds sessions-per-week billing to default class days inside the month", () => {
    assert.equal(countCalendarRowsInMonth("2026-05"), 6);
    assert.equal(countCalendarRowsInMonth("2026-06"), 5);
    assert.equal(countMonthBoundedWeeklySessions("2026-05", 2), 10);
    assert.equal(countMonthBoundedWeeklySessions("2026-05", 3), 14);

    const may = calculateTuitionForClass(
      { feePerDay: 500000, sessionsPerWeek: 2 },
      "2026-05",
      10
    );
    assert.equal(may.billingMode, "monthly_package");
    assert.equal(may.scheduleStrategy, "sessions_per_week");
    assert.equal(may.expectedSessions, 10);
    assert.equal(may.feePerSession, 50000);
    assert.equal(may.totalAmount, 500000);

    const mayThreeSessionsPerWeek = calculateTuitionForClass(
      { feePerDay: 700000, sessionsPerWeek: 3 },
      "2026-05",
      14
    );
    assert.equal(mayThreeSessionsPerWeek.expectedSessions, 14);
    assert.equal(mayThreeSessionsPerWeek.totalAmount, 700000);

    const june = calculateTuitionForClass(
      { feePerDay: 500000, sessionsPerWeek: 2 },
      "2026-06",
      2
    );
    assert.equal(june.expectedSessions, 10);
    assert.equal(june.feePerSession, 50000);
    assert.equal(june.totalAmount, 100000);
  });

  it("prorates monthly tuition by charged sessions over month-bounded expected sessions", () => {
    const result = calculateTuitionForClass(
      { feePerDay: 1000000, sessionsPerWeek: 2 },
      "2026-05",
      3
    );

    assert.equal(result.expectedSessions, 10);
    assert.equal(result.chargedSessions, 3);
    assert.equal(result.totalAmount, 300000);
  });

  it("flags extra sessions when charged sessions exceed expected sessions", () => {
    const result = calculateTuitionForClass(
      { feePerDay: 500000, sessionsPerWeek: 2 },
      "2026-05",
      12
    ) as ReturnType<typeof calculateTuitionForClass> & { extraSessions?: boolean };

    assert.equal(result.expectedSessions, 10);
    assert.equal(result.chargedSessions, 12);
    assert.equal(result.totalAmount, 600000);
    assert.equal(result.extraSessions, true);
  });

  it("maps Vietnamese weekday values to real calendar weekdays", () => {
    const mondayWednesday = normalizeScheduleDays([2, 4]);
    assert.deepEqual(mondayWednesday, [1, 3]);
    assert.equal(countScheduleDaysInMonth("2026-06", mondayWednesday), 9);
  });

  it("marks off-schedule fixed-weekday attendance as make-up", () => {
    const scheduled = resolveAttendanceSessionPolicy(
      { scheduleDays: [2, 4] },
      "2026-06-01"
    );
    assert.equal(scheduled.isMakeUp, false);
    assert.equal(scheduled.offSchedule, false);
    assert.equal(scheduled.makeUpReason, null);

    const offSchedule = resolveAttendanceSessionPolicy(
      { scheduleDays: [2, 4] },
      "2026-06-02"
    );
    assert.equal(offSchedule.isMakeUp, true);
    assert.equal(offSchedule.offSchedule, true);
    assert.equal(offSchedule.makeUpReason, "Hoc bu ngoai lich");

    const explicit = resolveAttendanceSessionPolicy(
      { sessionsPerWeek: 2 },
      "2026-06-02",
      { isMakeUp: true, makeUpReason: "Student requested make-up" }
    );
    assert.equal(explicit.isMakeUp, true);
    assert.equal(explicit.offSchedule, false);
    assert.equal(explicit.makeUpReason, "Student requested make-up");
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
    assert.equal(result.expectedSessions, 10);
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
    assert.equal(result.totalAmount, 1560000);
    assert.deepEqual(result.classes.map((item) => item.classId), ["english", "math"]);
  });
});
