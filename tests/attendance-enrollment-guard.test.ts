import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  assertAttendanceRecordsWithinEnrollment,
  findAttendanceEnrollmentConflicts,
} from "../lib/attendance-enrollment-guard.js";

function assertCode(error: unknown, code: string) {
  assert.equal((error as { code?: string }).code, code);
  return true;
}

describe("attendance enrollment write guard", () => {
  const periods = [
    {
      studentId: "student-1",
      startedAt: new Date("2026-06-01T00:00:00.000Z"),
      endedAt: null,
    },
  ];

  it("accepts attendance inside the authoritative half-open enrollment period", () => {
    assert.deepEqual(
      findAttendanceEnrollmentConflicts({
        records: [{ studentId: "student-1", attendanceDate: new Date("2026-06-03T00:00:00.000Z") }],
        enrollmentPeriods: periods,
        projections: [],
      }),
      [],
    );
  });

  it("rejects historical attendance before any mutation when it predates enrollment", () => {
    assert.throws(
      () => assertAttendanceRecordsWithinEnrollment({
        records: [{ studentId: "student-1", attendanceDate: new Date("2026-05-27T00:00:00.000Z") }],
        enrollmentPeriods: periods,
        projections: [],
      }),
      (error) => assertCode(error, "ATTENDANCE_OUTSIDE_ENROLLMENT"),
    );
  });

  it("uses a current-state projection only when no enrollment history exists", () => {
    assert.deepEqual(
      findAttendanceEnrollmentConflicts({
        records: [{ studentId: "legacy", attendanceDate: new Date("2026-06-10T00:00:00.000Z") }],
        enrollmentPeriods: [],
        projections: [{
          studentId: "legacy",
          enrollmentDate: new Date("2026-06-01T00:00:00.000Z"),
          status: "active",
          student: { status: "active" },
        }],
      }),
      [],
    );
  });

  it("takes the class-month roster lock before editability and enrollment guards", () => {
    for (const relativePath of [
      "../server/api/attendance/bulk.ts",
      "../server/api/attendance/index.ts",
    ]) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      const transaction = source.indexOf("runSerializableTransaction(prisma");
      const transactionBody = source.slice(transaction);
      const rosterLock = transactionBody.indexOf("await acquireClassMonthRosterAdvisoryLocks(");
      const editabilityGuard = Math.max(
        transactionBody.indexOf("assertAttendanceDatesEditable("),
        transactionBody.indexOf("assertBulkAttendanceDateScopeEditable("),
      );
      const enrollmentGuard = transactionBody.indexOf("assertAttendanceWriteEnrollment(");

      assert.ok(transaction >= 0, `${relativePath} must use a serializable transaction`);
      assert.ok(rosterLock >= 0, `${relativePath} must acquire class-month roster locks`);
      assert.ok(rosterLock < editabilityGuard, `${relativePath} must lock before editability checks`);
      assert.ok(rosterLock < enrollmentGuard, `${relativePath} must lock before enrollment checks`);
    }
  });

  it("runs the enrollment guard before month-plan, session, or attendance mutations", () => {
    for (const relativePath of [
      "../server/api/attendance/bulk.ts",
      "../server/api/attendance/index.ts",
    ]) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      const transaction = source.indexOf("runSerializableTransaction(prisma");
      const transactionBody = source.slice(transaction);
      const guard = transactionBody.indexOf("assertAttendanceWriteEnrollment(");
      const monthPlan = transactionBody.indexOf("recordClassMonthPlanWrite(");
      const sessionMutation = Math.max(
        transactionBody.indexOf("tx.classSession.create("),
        transactionBody.indexOf("tx.classSession.upsert("),
      );
      const attendanceMutation = Math.max(
        transactionBody.indexOf("tx.attendance.createMany("),
        transactionBody.indexOf("tx.attendance.upsert("),
      );
      assert.ok(guard >= 0, `${relativePath} must call the enrollment guard`);
      assert.ok(guard < monthPlan, `${relativePath} must guard before month-plan writes`);
      assert.ok(guard < sessionMutation, `${relativePath} must guard before session writes`);
      assert.ok(guard < attendanceMutation, `${relativePath} must guard before attendance writes`);
    }
  });
});
