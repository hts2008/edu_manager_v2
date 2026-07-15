import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  assertAttendancePeriodReopenSafe,
  reopenAttendancePeriod,
} from "../lib/attendance-lock.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("attendance period reopen", () => {
  it("refuses reopen with a typed conflict when protected class fee lines exist", async () => {
    const db = {
      monthlyFeeLine: {
        findFirst: async () => ({ id: "line-paid" }),
      },
    };

    await assert.rejects(
      assertAttendancePeriodReopenSafe("class-1", "2026-06", db as any),
      (error: any) => {
        assert.equal(error.code, "ATTENDANCE_REOPEN_FINANCIAL_CONFLICT");
        assert.equal(error.status, 409);
        return true;
      },
    );
  });

  it("refuses reopen when a class student has only a protected monthly fee aggregate", async () => {
    let aggregateQuery: any;
    const db = {
      monthlyFeeLine: { findFirst: async () => null },
      monthlyFee: {
        findFirst: async (query: any) => {
          aggregateQuery = query;
          return { id: "fee-confirmed-without-lines" };
        },
      },
    };

    await assert.rejects(
      assertAttendancePeriodReopenSafe("class-1", "2026-06", db as any),
      (error: any) => {
        assert.equal(error.code, "ATTENDANCE_REOPEN_FINANCIAL_CONFLICT");
        assert.equal(error.status, 409);
        return true;
      },
    );

    assert.equal(aggregateQuery.where.month, "2026-06");
    assert.deepEqual(aggregateQuery.where.OR, [
      { status: { in: ["confirmed", "paid"] } },
      { receiptId: { not: null } },
      { paidAt: { not: null } },
    ]);
    assert.deepEqual(aggregateQuery.where.student, {
      OR: [
        {
          attendance: {
            some: {
              classId: "class-1",
              attendanceDate: {
                gte: new Date("2026-06-01T00:00:00.000Z"),
                lt: new Date("2026-07-01T00:00:00.000Z"),
              },
            },
          },
        },
        {
          enrollmentPeriods: {
            some: {
              classId: "class-1",
              startedAt: { lt: new Date("2026-07-01T00:00:00.000Z") },
              OR: [
                { endedAt: null },
                { endedAt: { gt: new Date("2026-06-01T00:00:00.000Z") } },
              ],
            },
          },
        },
        {
          enrollmentPeriods: { none: { classId: "class-1" } },
          studentClasses: {
            some: {
              classId: "class-1",
              status: "active",
              enrollmentDate: { lt: new Date("2026-07-01T00:00:00.000Z") },
            },
          },
        },
      ],
    });
  });

  it("locks every financially affected student before running financial guards", async () => {
    const calls: string[] = [];
    const advisoryQueries: any[] = [];
    let attendanceQuery: any;
    let enrollmentPeriodQuery: any;
    let studentClassQuery: any;
    const db = {
      attendance: {
        findMany: async (query: any) => {
          calls.push("attendance.findMany");
          attendanceQuery = query;
          return [
            { studentId: "student-attendance" },
            { studentId: "student-shared" },
          ];
        },
      },
      enrollmentPeriod: {
        findMany: async (query: any) => {
          calls.push("enrollmentPeriod.findMany");
          enrollmentPeriodQuery = query;
          return [
            { studentId: "student-enrollment" },
            { studentId: "student-shared" },
          ];
        },
      },
      studentClass: {
        findMany: async (query: any) => {
          calls.push("studentClass.findMany");
          studentClassQuery = query;
          return [
            { studentId: "student-legacy" },
            { studentId: "student-shared" },
          ];
        },
      },
      $queryRaw: async (query: any) => {
        calls.push("$queryRaw");
        advisoryQueries.push(query);
        return [];
      },
      monthlyFeeLine: {
        findFirst: async () => {
          calls.push("monthlyFeeLine.findFirst");
          return null;
        },
      },
      monthlyFee: {
        findFirst: async () => {
          calls.push("monthlyFee.findFirst");
          return { id: "protected-aggregate" };
        },
      },
    };

    await assert.rejects(
      reopenAttendancePeriod(db as any, {
        periodId: "period-1",
        classId: "class-1",
        month: "2026-06",
        userId: "admin-1",
        reason: "Correct teacher entry",
      }),
      (error: any) => {
        assert.equal(error.code, "ATTENDANCE_REOPEN_FINANCIAL_CONFLICT");
        return true;
      },
    );

    assert.deepEqual(attendanceQuery.where, {
      classId: "class-1",
      attendanceDate: {
        gte: new Date("2026-06-01T00:00:00.000Z"),
        lt: new Date("2026-07-01T00:00:00.000Z"),
      },
    });
    assert.deepEqual(enrollmentPeriodQuery.where, {
      classId: "class-1",
      startedAt: { lt: new Date("2026-07-01T00:00:00.000Z") },
      OR: [
        { endedAt: null },
        { endedAt: { gt: new Date("2026-06-01T00:00:00.000Z") } },
      ],
    });
    assert.deepEqual(studentClassQuery.where, {
      classId: "class-1",
      status: "active",
      enrollmentDate: { lt: new Date("2026-07-01T00:00:00.000Z") },
      student: {
        enrollmentPeriods: { none: { classId: "class-1" } },
      },
    });
    assert.deepEqual(advisoryQueries[0].values, [
      "attendance-roster:global:class-1",
      "attendance-roster:2026-06:class-1",
    ]);
    assert.deepEqual(advisoryQueries[1].values, [
      "attendance-fee:2026-06:student-attendance",
      "attendance-fee:2026-06:student-enrollment",
      "attendance-fee:2026-06:student-legacy",
      "attendance-fee:2026-06:student-shared",
    ]);
    for (const identityRead of [
      "attendance.findMany",
      "enrollmentPeriod.findMany",
      "studentClass.findMany",
    ]) {
      assert.ok(calls.indexOf(identityRead) > calls.indexOf("$queryRaw"));
      assert.ok(calls.indexOf(identityRead) < calls.lastIndexOf("$queryRaw"));
    }
    assert.ok(calls.lastIndexOf("$queryRaw") < calls.indexOf("monthlyFeeLine.findFirst"));
    assert.ok(calls.lastIndexOf("$queryRaw") < calls.indexOf("monthlyFee.findFirst"));
  });

  it("reopens to genuinely editable open and writes the reason to the existing activity log", async () => {
    const calls: Array<{ kind: string; data: any }> = [];
    const db = {
      attendance: { findMany: async () => [{ studentId: "student-1" }] },
      enrollmentPeriod: { findMany: async () => [] },
      studentClass: { findMany: async () => [] },
      $queryRaw: async () => [],
      monthlyFeeLine: { findFirst: async () => null },
      monthlyFee: { findFirst: async () => null },
      classMonthPlan: { findUnique: async () => null },
      classMonthPlanRevision: {},
      attendancePeriod: {
        updateMany: async ({ data }: any) => {
          calls.push({ kind: "period", data });
          return { count: 1 };
        },
        findUniqueOrThrow: async () => ({ id: "period-1", status: "open" }),
      },
      activityLog: {
        create: async ({ data }: any) => {
          calls.push({ kind: "audit", data });
          return data;
        },
      },
    };

    const period = await reopenAttendancePeriod(db as any, {
      periodId: "period-1",
      classId: "class-1",
      month: "2026-06",
      userId: "admin-1",
      reason: "Correct teacher entry",
      ipAddress: "127.0.0.1",
      userAgent: "test",
    });

    assert.equal(period.status, "open");
    assert.deepEqual(calls[0].data, {
      status: "open",
      submittedById: null,
      submittedAt: null,
      approvedById: null,
      approvedAt: null,
      lockedById: null,
      lockedAt: null,
      totalSessions: 0,
      totalPresent: 0,
      totalAbsentFee: 0,
      totalAbsentNoFee: 0,
      totalHoliday: 0,
    });
    assert.match(calls[1].data.action, /Correct teacher entry/);
    assert.equal(calls[1].data.entityType, "attendance_period");
    assert.equal(calls[1].data.entityId, "period-1");
  });

  it("keeps API and UI reason, authorization, conflict, disabled, and toast contracts aligned", () => {
    const api = source("server/api/attendance-periods/[id]/index.ts");
    const ui = source("frontend/src/pages/AttendancePage.jsx");
    const periodsUi = source("frontend/src/pages/AttendancePeriodsPage.jsx");
    const correctionModal = source(
      "frontend/src/components/attendance/AttendanceCorrectionModal.jsx",
    );
    const reviewModal = source(
      "frontend/src/components/attendance/AttendanceReviewModal.jsx",
    );
    const reviewApprovalHandler = reviewModal.match(
      /const handleApprove = async \(\) => \{([\s\S]*?)\n  \};/,
    )?.[1];
    const workflow = source("frontend/src/hooks/useAttendancePeriodWorkflow.js");

    assert.match(api, /case "unlock"/);
    assert.match(api, /req\.user\.role !== "admin"/);
    assert.match(api, /REOPEN_REASON_REQUIRED/);
    assert.match(api, /reopenAttendancePeriod/);
    assert.match(source("lib/attendance-lock.ts"), /acquireAttendanceFeeAdvisoryLocks/);
    assert.match(ui, /AttendanceCorrectionModal/);
    assert.match(correctionModal, /reason\.trim\(\)/);
    assert.match(correctionModal, /disabled=\{busy/);
    assert.match(workflow, /activeActionRef\.current/);
    assert.match(workflow, /response\.error\?\.message/);
    assert.match(periodsUi, /components\/attendance\/AttendanceReviewModal/);
    assert.match(periodsUi, /return workflow\.runAction\(/);
    assert.match(periodsUi, /onApprove=\{\(\) => handleApprove\(reviewPeriod\)\}/);
    assert.match(periodsUi, /<AttendanceReadinessIssuePanel/);
    assert.match(
      periodsUi,
      /onReopen=\{\(\) => setCorrectionTarget\(workflow\.readinessIssue\?\.period\)\}/,
    );
    assert.match(reviewModal, /const response = await onApprove\?\.\(\)/);
    assert.match(reviewModal, /if \(response\?\.success\) onClose\(\)/);
    assert.doesNotMatch(reviewModal, /attendancePeriodsService\.approve/);
    assert.ok(reviewApprovalHandler);
    assert.doesNotMatch(reviewApprovalHandler, /toast\./);
    assert.match(ui, /datePeriodStatus !== "open"/);
  });
});
