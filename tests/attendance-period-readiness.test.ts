import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeAttendancePeriodReadiness,
  getAttendancePeriodReadiness,
} from "../lib/attendance-period-readiness.js";
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
  it("rejects a partial sessions-per-week ledger before submit", () => {
    const readiness = analyzeAttendancePeriodReadiness({
      classId: "class-flexible",
      month: "2026-06",
      expectedRegularSessions: 10,
      sessions: [
        {
          id: "session-june-01",
          sessionDate: new Date("2026-06-01T00:00:00.000Z"),
          kind: "regular",
          status: "held",
        },
        {
          id: "session-june-02",
          sessionDate: new Date("2026-06-02T00:00:00.000Z"),
          kind: "regular",
          status: "held",
        },
      ],
      attendance: [],
      enrollmentPeriods: [],
      projections: [],
    });

    assert.equal(readiness.ready, false);
    assert.deepEqual(readiness.issues[0], {
      code: "MISSING_PUBLISHED_PLAN",
      message: "Regular session plan for 2026-06 is incomplete: expected 10, found 2",
      expected_sessions: 10,
      actual_sessions: 2,
      recommended_action: "Reconcile the regular session ledger with the published month plan before submitting attendance",
    });
  });

  it("rejects a published plan when the ledger has the right count on the wrong dates", () => {
    const readiness = analyzeAttendancePeriodReadiness({
      classId: "class-flexible",
      month: "2026-06",
      expectedRegularSessions: 2,
      expectedSource: "published_plan_snapshot",
      expectedDates: ["2026-06-03", "2026-06-10"],
      sessions: [
        {
          id: "session-june-03",
          sessionDate: new Date("2026-06-03T00:00:00.000Z"),
          kind: "regular",
          status: "held",
        },
        {
          id: "session-june-17",
          sessionDate: new Date("2026-06-17T00:00:00.000Z"),
          kind: "regular",
          status: "held",
        },
      ],
      attendance: [],
      enrollmentPeriods: [],
      projections: [],
    });

    assert.equal(readiness.ready, false);
    assert.equal(readiness.summary.actual, 2);
    assert.equal(readiness.summary.expected, 2);
    assert.equal(readiness.summary.missing_count, 1);
    assert.deepEqual(readiness.summary.missing_dates, ["2026-06-10"]);
    assert.equal(readiness.issues[0]?.code, "MISSING_PUBLISHED_PLAN");
  });

  it("rejects an eight-session flexible ledger without published month-plan authority", async () => {
    const sessions = Array.from({ length: 8 }, (_, index) => ({
      id: `session-${index + 1}`,
      sessionDate: new Date(Date.UTC(2026, 5, index + 1)),
      kind: "regular",
      status: "held",
    }));
    const db = {
      class: {
        findUnique: async () => {
          throw new Error("readiness must not synthesize expected sessions from class cadence");
        },
      },
      classSession: {
        findMany: async () => sessions,
      },
      attendance: { findMany: async () => [] },
      enrollmentPeriod: { findMany: async () => [] },
      studentClass: { findMany: async () => [] },
    };

    const readiness = await getAttendancePeriodReadiness(db as any, {
      classId: "class-flexible",
      month: "2026-06",
    });

    assert.equal(readiness.ready, false);
    assert.equal(readiness.summary.expected_source, "none");
    assert.equal(readiness.summary.actual, 8);
    assert.equal(readiness.summary.expected, 0);
    assert.equal(readiness.summary.missing_count, 0);
    assert.deepEqual(readiness.summary.missing_dates, []);
    assert.deepEqual(readiness.summary.weekly_deficits, []);
    assert.equal(
      readiness.summary.recommended_action,
      "Publish explicit regular session dates for the month before submitting attendance",
    );
    assert.equal(readiness.issues[0]?.code, "MISSING_PUBLISHED_PLAN");
  });

  it("does not invent a fixed or flexible plan when no explicit regular ledger exists", async () => {
    const db = {
      class: {
        findUnique: async () => {
          throw new Error("readiness must not synthesize expected sessions from class cadence");
        },
      },
      classSession: { findMany: async () => [] },
      attendance: { findMany: async () => [] },
      enrollmentPeriod: {
        findMany: async () => [{
          studentId: "student-mid-month",
          startedAt: new Date("2026-06-15T00:00:00.000Z"),
          endedAt: null,
        }],
      },
      studentClass: {
        findMany: async () => [{
          studentId: "student-mid-month",
          enrollmentDate: new Date("2026-06-15T00:00:00.000Z"),
          status: "active",
          student: { status: "active" },
        }],
      },
    };

    const readiness = await getAttendancePeriodReadiness(db as any, {
      classId: "class-mid-month",
      month: "2026-06",
    });

    assert.equal(readiness.summary.expected_regular_sessions, 0);
    assert.equal(readiness.summary.expected_source, "none");
    assert.equal(readiness.summary.actual, 0);
    assert.equal(readiness.summary.expected, 0);
    assert.equal(readiness.issues[0]?.code, "MISSING_PUBLISHED_PLAN");
  });

  it("uses the persisted month-plan denominator after the live class schedule changes", async () => {
    const db = {
      class: {
        findUnique: async () => ({ scheduleDays: null, sessionsPerWeek: 2 }),
      },
      classMonthPlan: {
        findUnique: async () => ({ id: "plan-1", revision: 2 }),
      },
      classMonthPlanRevision: {
        findUnique: async () => ({
          snapshot: {
            payload: {
              schedule_days: [1, 3],
              sessions_per_week: 2,
              expected_regular_sessions: 9,
            },
          },
        }),
      },
      classSession: { findMany: async () => [] },
      attendance: { findMany: async () => [] },
      enrollmentPeriod: { findMany: async () => [] },
      studentClass: { findMany: async () => [] },
    };

    const readiness = await getAttendancePeriodReadiness(db as any, {
      classId: "class-snapshot",
      month: "2026-06",
    });

    assert.equal(readiness.summary.expected_regular_sessions, 9);
    assert.equal(readiness.summary.expected_source, "published_plan_snapshot");
    assert.equal(readiness.summary.actual, 0);
    assert.equal(readiness.summary.expected, 9);
    assert.equal(readiness.summary.missing_count, 9);
    assert.equal(readiness.summary.missing_dates.length, 9);
    assert.ok(readiness.summary.weekly_deficits.length > 0);
    assert.equal(
      readiness.summary.weekly_deficits.reduce((sum, week) => sum + week.missing_count, 0),
      9,
    );
    assert.equal(
      readiness.summary.recommended_action,
      "Reconcile the regular session ledger with the published month plan before submitting attendance",
    );
    assert.equal(readiness.issues[0]?.code, "MISSING_PUBLISHED_PLAN");
  });

  it("ignores a persisted flexible cadence snapshot when it has no explicit plan dates", async () => {
    const sessions = Array.from({ length: 8 }, (_, index) => ({
      id: `flex-session-${index + 1}`,
      sessionDate: new Date(Date.UTC(2026, 5, index + 1)),
      kind: "regular",
      status: "held",
    }));
    const db = {
      classMonthPlan: {
        findUnique: async () => ({ id: "flex-plan", revision: 3 }),
      },
      classMonthPlanRevision: {
        findUnique: async () => ({
          snapshot: {
            payload: {
              schedule_days: [],
              sessions_per_week: 2,
              expected_regular_sessions: 10,
            },
          },
        }),
      },
      classSession: { findMany: async () => sessions },
      attendance: { findMany: async () => [] },
      enrollmentPeriod: { findMany: async () => [] },
      studentClass: { findMany: async () => [] },
    };

    const readiness = await getAttendancePeriodReadiness(db as any, {
      classId: "class-flex-cadence",
      month: "2026-06",
    });

    assert.equal(readiness.ready, false);
    assert.equal(readiness.summary.expected_source, "none");
    assert.equal(readiness.summary.actual, 8);
    assert.equal(readiness.summary.expected, 0);
    assert.equal(readiness.summary.missing_count, 0);
    assert.equal(readiness.issues[0]?.code, "MISSING_PUBLISHED_PLAN");
  });

  it("keeps the pre-reopen denominator when the latest revision has metadata only", async () => {
    let historyReads = 0;
    const sessions = Array.from({ length: 9 }, (_, index) => ({
      id: `session-${index + 1}`,
      sessionDate: new Date(Date.UTC(2026, 5, index + 1)),
      kind: "regular",
      status: "held",
    }));
    const db = {
      class: {
        findUnique: async () => ({ scheduleDays: [1, 3, 5], sessionsPerWeek: 3 }),
      },
      classMonthPlan: {
        findUnique: async () => ({ id: "plan-reopened", revision: 3 }),
      },
      classMonthPlanRevision: {
        findUnique: async () => ({
          snapshot: { payload: { attendance_period: "open" } },
        }),
        findMany: async () => {
          historyReads += 1;
          return [
            { snapshot: { payload: { attendance_period: "open" } } },
            {
              snapshot: {
                payload: {
                  schedule_days: [1, 3],
                  sessions_per_week: 2,
                  expected_regular_sessions: 9,
                  requested_dates: Array.from(
                    { length: 9 },
                    (_, index) => `2026-06-${String(index + 1).padStart(2, "0")}`,
                  ),
                },
              },
            },
          ];
        },
      },
      classSession: { findMany: async () => sessions },
      attendance: { findMany: async () => [] },
      enrollmentPeriod: { findMany: async () => [] },
      studentClass: { findMany: async () => [] },
    };

    const readiness = await getAttendancePeriodReadiness(db as any, {
      classId: "class-reopened",
      month: "2026-06",
    });

    assert.equal(historyReads, 1);
    assert.equal(readiness.ready, true);
    assert.equal(readiness.summary.expected_regular_sessions, 9);
    assert.equal(readiness.summary.regular_sessions, 9);
  });

  it("keeps a legacy backfill denominator after reopen instead of using the live schedule", async () => {
    const sessions = Array.from({ length: 8 }, (_, index) => ({
      id: `legacy-session-${index + 1}`,
      sessionDate: new Date(Date.UTC(2026, 5, index + 1)),
      kind: "regular",
      status: "held",
    }));
    const db = {
      class: {
        findUnique: async () => ({ scheduleDays: [1, 3, 5], sessionsPerWeek: 3 }),
      },
      classMonthPlan: {
        findUnique: async () => ({ id: "legacy-plan", revision: 2 }),
      },
      classMonthPlanRevision: {
        findUnique: async () => ({
          snapshot: { payload: { attendance_period: "open" } },
        }),
        findMany: async () => [
          { snapshot: { payload: { attendance_period: "open" } } },
          {
            snapshot: {
              schema_version: 1,
              source: "class_month_plan_backfill",
              class_session_count: 8,
            },
          },
        ],
      },
      classSession: { findMany: async () => sessions },
      attendance: { findMany: async () => [] },
      enrollmentPeriod: { findMany: async () => [] },
      studentClass: { findMany: async () => [] },
    };

    const readiness = await getAttendancePeriodReadiness(db as any, {
      classId: "legacy-class",
      month: "2026-06",
    });

    assert.equal(readiness.ready, true);
    assert.equal(readiness.summary.expected_regular_sessions, 8);
    assert.equal(readiness.summary.expected_source, "published_plan_snapshot");
    assert.equal(readiness.summary.regular_sessions, 8);
  });

  it("surfaces inactive historical attendance when EnrollmentPeriod history is missing", async () => {
    let projectionQuery: any;
    const db = {
      classMonthPlan: {
        findUnique: async () => ({ id: "plan-june", revision: 1 }),
      },
      classMonthPlanRevision: {
        findUnique: async () => ({
          snapshot: {
            payload: {
              requested_dates: ["2026-06-10"],
              expected_regular_sessions: 1,
            },
          },
        }),
      },
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
