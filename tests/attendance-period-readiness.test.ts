import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAttendancePeriodReadiness } from "../lib/attendance-period-readiness.js";
import { calculatePeriodStats } from "../server/api/attendance-periods/[id]/index.js";

describe("attendance period stats query contract", () => {
  it("counts regular ClassSession rows using the Prisma schema field kind", async () => {
    let countQuery: any;
    const db = {
      attendance: {
        groupBy: async () => [],
      },
      classSession: {
        count: async (query: any) => {
          countQuery = query;
          return 3;
        },
      },
    };

    const totals = await calculatePeriodStats(db as any, "class-1", "2026-07");

    assert.deepEqual(countQuery, {
      where: {
        classId: "class-1",
        billingMonth: "2026-07",
        kind: "regular",
      },
    });
    assert.equal(totals.totalSessions, 3);
  });
});

describe("attendance period enrollment readiness", () => {
  it("surfaces inactive historical attendance when EnrollmentPeriod history is missing", async () => {
    let projectionQuery: any;
    const db = {
      classSession: {
        findMany: async () => [{
          id: "session-june-10",
          sessionDate: new Date("2026-06-10T00:00:00.000Z"),
          kind: "regular",
          status: "held",
        }],
      },
      attendance: {
        findMany: async () => [{
          studentId: "student-inactive",
          classSessionId: "session-june-10",
          attendanceDate: new Date("2026-06-10T00:00:00.000Z"),
        }],
      },
      enrollmentPeriod: {
        findMany: async () => [],
      },
      studentClass: {
        findMany: async (query: any) => {
          projectionQuery = query;
          if (query.where.status === "active") return [];
          return [{
            studentId: "student-inactive",
            enrollmentDate: new Date("2026-05-01T00:00:00.000Z"),
            status: "inactive",
            student: { status: "inactive" },
          }];
        },
      },
    };

    const readiness = await getAttendancePeriodReadiness(db as any, {
      classId: "class-1",
      month: "2026-06",
    });

    assert.equal(projectionQuery.where.status, undefined);
    assert.equal(projectionQuery.where.student.status, undefined);
    assert.deepEqual(projectionQuery.where.enrollmentDate, {
      lt: new Date("2026-07-01T00:00:00.000Z"),
    });
    assert.equal(projectionQuery.select.status, true);
    assert.deepEqual(projectionQuery.select.student, {
      select: { status: true },
    });
    assert.equal(readiness.ready, false);
    assert.deepEqual(readiness.issues, [{
      code: "ENROLLMENT_CONFLICT",
      message: "Attendance on 2026-06-10 has no EnrollmentPeriod history",
      session_date: "2026-06-10",
      student_ids: ["student-inactive"],
      recommended_action: "Backfill the student's EnrollmentPeriod history, then rerun readiness",
    }]);
  });
});
