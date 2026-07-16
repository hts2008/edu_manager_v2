import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import {
  calculateTuitionForClass,
  calculateStudentMonthlyTuition,
  countCalendarRowsInMonth,
  countMonthBoundedWeeklySessions,
  countScheduleDaysInMonth,
  listScheduleDatesInMonth,
  resolveAttendanceSessionPolicy,
  normalizeScheduleDays,
} from "../lib/tuition.js";

function mockResponse() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    headers: new Map<string, unknown>(),
    setHeader(name: string, value: unknown) {
      this.headers.set(name, value);
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    end(payload?: unknown) {
      this.body = payload;
      return this;
    },
  };
  return response;
}

describe("tuition calculation", () => {
  it("enumerates fixed weekdays for every month shape without leaving the billing month", () => {
    const cases = new Map<string, { month: string; days: number; startsOn: number }>();
    for (let year = 2000; year <= 2400 && cases.size < 28; year += 1) {
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
        const startsOn = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
        const key = `${days}:${startsOn}`;
        if ([28, 29, 30, 31].includes(days) && !cases.has(key)) {
          cases.set(key, {
            month: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
            days,
            startsOn,
          });
        }
      }
    }

    assert.equal(cases.size, 28, "all month lengths and starting weekdays need a case");
    for (const { month, days, startsOn } of cases.values()) {
      const weekdays = [startsOn, (startsOn + 3) % 7];
      const expectedDates = Array.from({ length: days }, (_, index) => {
        const date = new Date(`${month}-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`);
        return weekdays.includes(date.getUTCDay()) ? date.toISOString().slice(0, 10) : null;
      }).filter((date): date is string => date !== null);
      const dates = listScheduleDatesInMonth(month, weekdays);

      assert.deepEqual(dates, expectedDates, `${month} starts on ${startsOn}`);
      assert.ok(dates.every((date) => date.startsWith(`${month}-`)));
      assert.ok(dates.every((date) => weekdays.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay())));
    }
  });

  it("handles leap February and a December-to-January boundary using actual weekdays", () => {
    assert.deepEqual(listScheduleDatesInMonth("2024-02", [4]), [
      "2024-02-01",
      "2024-02-08",
      "2024-02-15",
      "2024-02-22",
      "2024-02-29",
    ]);
    assert.deepEqual(listScheduleDatesInMonth("2026-12", [4]), [
      "2026-12-03",
      "2026-12-10",
      "2026-12-17",
      "2026-12-24",
      "2026-12-31",
    ]);
    assert.deepEqual(listScheduleDatesInMonth("2027-01", [4]), [
      "2027-01-07",
      "2027-01-14",
      "2027-01-21",
      "2027-01-28",
    ]);
  });

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

  it("keeps textual weekday labels in the final JavaScript weekday convention", () => {
    assert.deepEqual(normalizeScheduleDays(["T2", "T4"]), [1, 3]);
    assert.deepEqual(normalizeScheduleDays(["monday", "wednesday"]), [1, 3]);
    assert.deepEqual(normalizeScheduleDays(["CN", "T7"]), [0, 6]);
  });

  it("bounds expected sessions to the student's enrollment period inside the month", () => {
    const partialStart = calculateTuitionForClass(
      {
        feePerDay: 900000,
        scheduleDays: ["T2", "T4"],
        enrollmentStart: new Date("2026-07-15T00:00:00.000Z"),
      },
      "2026-07",
      5,
    );
    const partialEnd = calculateTuitionForClass(
      {
        feePerDay: 900000,
        scheduleDays: ["T2", "T4"],
        enrollmentStart: new Date("2026-07-15T00:00:00.000Z"),
        enrollmentEnd: new Date("2026-07-22T00:00:00.000Z"),
      },
      "2026-07",
      2,
    );

    assert.equal(partialStart.expectedSessions, 5);
    assert.equal(partialStart.totalAmount, 900000);
    assert.equal(partialEnd.expectedSessions, 2);
    assert.equal(partialEnd.totalAmount, 900000);
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

  it("returns one Fee Workbench collectable row per class for a multi-class student", async () => {
    const { default: workbenchHandler } = await import(
      "../server/api/monthly-fees/workbench.js"
    );
    const mockedPrisma = prisma as any;
    const originalUserFindUnique = mockedPrisma.user.findUnique;
    const originalAuthSessionFindFirst = mockedPrisma.authSession?.findFirst;
    const originalStudentFindMany = mockedPrisma.student.findMany;
    const originalMonthlyFeeFindMany = mockedPrisma.monthlyFee.findMany;
    const timestamp = new Date("2026-05-31T00:00:00.000Z");
    const student = {
      id: "student-1",
      fullName: "Nguyen Van A",
      phone: "0900000000",
      email: null,
      status: "active",
      parentId: "parent-1",
      parent: { id: "parent-1", fullName: "Parent A", phone: "0911111111" },
      studentClasses: [
        {
          classId: "english",
          status: "active",
          class: { id: "english", className: "English A1" },
        },
        {
          classId: "math",
          status: "active",
          class: { id: "math", className: "Math B1" },
        },
      ],
    };

    try {
      mockedPrisma.user.findUnique = async () => ({
        id: "admin-1",
        username: "admin",
        fullName: "Admin",
        email: null,
        phone: null,
        role: "admin",
        status: "active",
        lastLogin: null,
        tokenVersion: 0,
      });
      mockedPrisma.authSession.findFirst = async () => ({ id: "session-1" });
      mockedPrisma.student.findMany = async () => [student];
      mockedPrisma.monthlyFee.findMany = async () => [
        {
          id: "fee-1",
          studentId: student.id,
          month: "2026-05",
          totalDays: 15,
          totalAmount: 1300000,
          status: "ready",
          receiptId: null,
          paidAt: null,
          notes: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          receipt: null,
          lines: [
            {
              id: "line-english",
              monthlyFeeId: "fee-1",
              studentId: student.id,
              classId: "english",
              allocationKey: "class:english",
              month: "2026-05",
              classNameSnapshot: "English A1",
              teacherNameSnapshot: "Teacher E",
              chargedSessions: 10,
              expectedSessions: 10,
              makeUpSessions: 0,
              extraSessions: 0,
              feePerSession: 50000,
              monthlyTuition: 500000,
              amount: 500000,
              billingMode: "monthly_package",
              scheduleMode: "sessions_per_week",
              status: "ready",
              receiptId: null,
              paidAt: null,
              allocationConfidence: "calculated",
              notes: null,
              createdAt: timestamp,
              updatedAt: timestamp,
              receipt: null,
              class: {
                className: "English A1",
                teacher: { fullName: "Teacher E" },
              },
            },
            {
              id: "line-math",
              monthlyFeeId: "fee-1",
              studentId: student.id,
              classId: "math",
              allocationKey: "class:math",
              month: "2026-05",
              classNameSnapshot: "Math B1",
              teacherNameSnapshot: "Teacher M",
              chargedSessions: 5,
              expectedSessions: 5,
              makeUpSessions: 0,
              extraSessions: 0,
              feePerSession: 160000,
              monthlyTuition: 800000,
              amount: 800000,
              billingMode: "monthly_package",
              scheduleMode: "sessions_per_week",
              status: "ready",
              receiptId: null,
              paidAt: null,
              allocationConfidence: "calculated",
              notes: null,
              createdAt: timestamp,
              updatedAt: timestamp,
              receipt: null,
              class: {
                className: "Math B1",
                teacher: { fullName: "Teacher M" },
              },
            },
          ],
        },
      ];

      const token = jwt.sign(
        { typ: "user", ver: 0, username: "admin", role: "admin" },
        process.env.JWT_SECRET!,
        {
          algorithm: "HS256",
          issuer: process.env.JWT_ISSUER || "edu-manager-v2",
          audience: process.env.JWT_AUDIENCE || "edu-manager-v2-api",
          subject: "admin-1",
          jwtid: "session-1",
          expiresIn: "5m",
        }
      );
      const response = mockResponse();
      await workbenchHandler(
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
          query: { month: "2026-05" },
        } as any,
        response
      );

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.success, true);
      const rows = response.body.data.rows;
      assert.equal(rows.length, 2);
      assert.deepEqual(
        rows.map((row: any) => row.row_id),
        ["line-english", "line-math"]
      );
      assert.deepEqual(
        rows.map((row: any) => row.fee_id),
        ["fee-1", "fee-1"]
      );
      assert.deepEqual(
        rows.map((row: any) => row.class_ids),
        [["english"], ["math"]]
      );
      assert.deepEqual(
        rows.map((row: any) => row.class_names),
        ["English A1", "Math B1"]
      );
      assert.deepEqual(
        rows.map((row: any) => row.total_amount),
        [500000, 800000]
      );
      assert.equal(response.body.data.summary.total, 2);
      assert.equal(response.body.data.summary.total_amount, 1300000);
    } finally {
      mockedPrisma.user.findUnique = originalUserFindUnique;
      mockedPrisma.authSession.findFirst = originalAuthSessionFindFirst;
      mockedPrisma.student.findMany = originalStudentFindMany;
      mockedPrisma.monthlyFee.findMany = originalMonthlyFeeFindMany;
    }
  });
});
