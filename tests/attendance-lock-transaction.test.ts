import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  attendanceFeeAdvisoryLockKeys,
  buildAttendanceLockFeePlan,
  isAttendanceLockTimeout,
  lockAttendancePeriodAndSyncFees,
} from "../lib/attendance-lock-transaction.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const endpointSource = source("server/api/attendance-periods/[id]/index.ts");
const attendanceGuardSource = source("lib/attendance-lock.ts");
const lockHelperSource = source("lib/attendance-lock-transaction.ts");

const activeStudentClasses = [
  {
    studentId: "student-1",
    classId: "class-1",
    class: {
      className: "Movers",
      feePerDay: 100_000,
      scheduleDays: "1,3,5",
      sessionsPerWeek: 3,
      teacher: { fullName: "Teacher One" },
    },
  },
  {
    studentId: "student-2",
    classId: "class-1",
    class: {
      className: "Movers",
      feePerDay: 100_000,
      scheduleDays: "1,3,5",
      sessionsPerWeek: 3,
      teacher: { fullName: "Teacher One" },
    },
  },
];

describe("attendance lock fee plan", () => {
  it("preserves confirmed, paid, and receipt-linked fee records and lines", () => {
    const protectedFees = [
      {
        id: "fee-confirmed",
        studentId: "student-1",
        month: "2026-06",
        status: "confirmed",
        receiptId: null,
        paidAt: null,
        lines: [],
      },
      {
        id: "fee-receipt-line",
        studentId: "student-2",
        month: "2026-06",
        status: "ready",
        receiptId: null,
        paidAt: null,
        lines: [
          {
            id: "line-2",
            allocationKey: "class:class-1",
            status: "ready",
            receiptId: null,
            paidAt: null,
            receiptLines: [{ id: "receipt-line-2" }],
          },
        ],
      },
      {
        id: "fee-paid",
        studentId: "student-3",
        month: "2026-06",
        status: "paid",
        receiptId: null,
        paidAt: new Date("2026-06-20T00:00:00.000Z"),
        lines: [],
      },
      {
        id: "fee-receipt",
        studentId: "student-4",
        month: "2026-06",
        status: "ready",
        receiptId: "receipt-4",
        paidAt: null,
        lines: [],
      },
    ];

    const plan = buildAttendanceLockFeePlan({
      month: "2026-06",
      targetClassId: "class-1",
      studentIds: ["student-1", "student-2", "student-3", "student-4"],
      activeStudentClasses,
      attendanceCounts: [
        { studentId: "student-1", classId: "class-1", _count: { status: 8 } },
        { studentId: "student-2", classId: "class-1", _count: { status: 7 } },
      ],
      makeUpCounts: [],
      existingFees: protectedFees,
      createId: () => "unused",
    });

    assert.deepEqual(plan.mutableLineIds, []);
    assert.deepEqual(plan.affectedFeeIds, ["fee-receipt-line"]);
    assert.deepEqual(plan.feeRows, []);
    assert.deepEqual(plan.lineRows, []);
    assert.equal(plan.metrics.fees_preserved, 3);
    assert.equal(plan.metrics.fees_created, 0);
    assert.equal(plan.metrics.fees_updated, 1);
  });

  it("replaces mutable fee aggregates and lines in one set-based plan while retaining fee ids", () => {
    let nextId = 0;
    const plan = buildAttendanceLockFeePlan({
      month: "2026-06",
      targetClassId: "class-1",
      studentIds: ["student-1", "student-2"],
      activeStudentClasses,
      attendanceCounts: [
        { studentId: "student-1", classId: "class-1", _count: { status: 8 } },
        { studentId: "student-2", classId: "class-1", _count: { status: 7 } },
      ],
      makeUpCounts: [
        { studentId: "student-2", classId: "class-1", _count: { status: 1 } },
      ],
      existingFees: [
        {
          id: "fee-existing",
          studentId: "student-1",
          month: "2026-06",
          status: "ready",
          receiptId: null,
          paidAt: null,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
          lines: [
            {
              id: "line-existing",
              allocationKey: "class:class-1",
              status: "ready",
              receiptId: null,
              paidAt: null,
              createdAt: new Date("2026-06-01T00:00:00.000Z"),
              receiptLines: [],
            },
          ],
        },
      ],
      createId: () => `generated-${++nextId}`,
    });

    assert.deepEqual(plan.mutableLineIds, ["line-existing"]);
    assert.deepEqual(plan.affectedFeeIds, ["fee-existing", "generated-1"]);
    assert.equal(plan.feeRows.length, 1);
    assert.equal(plan.lineRows.length, 2);
    assert.equal(plan.feeRows[0].id, "generated-1");
    assert.equal(plan.lineRows[0].id, "line-existing");
    assert.equal(plan.lineRows[1].makeUpSessions, 1);
    assert.deepEqual(plan.metrics, {
      students_processed: 2,
      fees_created: 1,
      fees_updated: 1,
      fees_preserved: 0,
      fee_lines_written: 2,
    });
  });

  it("preserves a protected class line while recalculating another class line", () => {
    let nextId = 0;
    const plan = buildAttendanceLockFeePlan({
      month: "2026-06",
      targetClassId: "class-2",
      studentIds: ["student-1"],
      activeStudentClasses: [
        activeStudentClasses[0],
        {
          studentId: "student-1",
          classId: "class-2",
          class: {
            className: "Flyers",
            feePerDay: 120_000,
            scheduleDays: "2,4",
            sessionsPerWeek: 2,
            teacher: { fullName: "Teacher Two" },
          },
        },
      ],
      attendanceCounts: [
        { studentId: "student-1", classId: "class-1", _count: { status: 8 } },
        { studentId: "student-1", classId: "class-2", _count: { status: 4 } },
      ],
      makeUpCounts: [],
      existingFees: [
        {
          id: "fee-existing",
          studentId: "student-1",
          month: "2026-06",
          status: "confirmed",
          receiptId: null,
          paidAt: null,
          lines: [
            {
              id: "line-paid",
              allocationKey: "class:class-1",
              status: "paid",
              receiptId: "receipt-1",
              paidAt: new Date("2026-06-20T00:00:00.000Z"),
              receiptLines: [{ id: "receipt-line-1" }],
            },
            {
              id: "line-mutable",
              allocationKey: "class:class-2",
              status: "ready",
              receiptId: null,
              paidAt: null,
              receiptLines: [],
            },
          ],
        },
      ],
      createId: () => `generated-${++nextId}`,
    });

    assert.deepEqual(plan.mutableLineIds, ["line-mutable"]);
    assert.deepEqual(plan.affectedFeeIds, ["fee-existing"]);
    assert.deepEqual(plan.feeRows, []);
    assert.equal(plan.lineRows.length, 1);
    assert.equal(plan.lineRows[0].id, "line-mutable");
    assert.equal(plan.lineRows[0].classId, "class-2");
    assert.equal(plan.metrics.fees_preserved, 0);
    assert.equal(plan.metrics.fees_updated, 1);
  });
});

describe("attendance lock transaction", () => {
  it("builds deterministic sorted student-month advisory lock keys", () => {
    assert.deepEqual(
      attendanceFeeAdvisoryLockKeys(
        ["student-z", "student-a", "student-z", "student-b"],
        "2026-06",
      ),
      [
        "attendance-fee:2026-06:student-a",
        "attendance-fee:2026-06:student-b",
        "attendance-fee:2026-06:student-z",
      ],
    );
  });

  it("claims approved -> locked before reads and uses bounded set-based writes", async () => {
    const calls: string[] = [];
    const advisoryQueries: any[] = [];
    const studentClassQueries: any[] = [];
    const attendanceQueries: any[] = [];
    const tx = {
      $queryRaw: async (query: any) => {
        calls.push("$queryRaw");
        advisoryQueries.push(query);
        return [];
      },
      attendancePeriod: {
        updateMany: async () => {
          calls.push("attendancePeriod.updateMany");
          return { count: 1 };
        },
      },
      studentClass: {
        findMany: async (args: any) => {
          calls.push("studentClass.findMany");
          studentClassQueries.push(args);
          return args.select ? [{ studentId: "student-1" }] : activeStudentClasses.slice(0, 1);
        },
      },
      attendance: {
        groupBy: async (args: any) => {
          calls.push("attendance.groupBy");
          attendanceQueries.push(args);
          return [];
        },
      },
      monthlyFee: {
        findMany: async () => {
          calls.push("monthlyFee.findMany");
          return [];
        },
        createMany: async () => {
          calls.push("monthlyFee.createMany");
          return { count: 1 };
        },
      },
      monthlyFeeLine: {
        deleteMany: async () => {
          calls.push("monthlyFeeLine.deleteMany");
          return { count: 0 };
        },
        createMany: async () => {
          calls.push("monthlyFeeLine.createMany");
          return { count: 1 };
        },
      },
      $executeRaw: async () => {
        calls.push("$executeRaw");
        return 1;
      },
    };

    const metrics = await lockAttendancePeriodAndSyncFees(tx as any, {
      periodId: "period-1",
      classId: "class-1",
      month: "2026-06",
      userId: "admin-1",
      now: new Date("2026-06-30T00:00:00.000Z"),
      createId: () => "generated",
    });

    assert.equal(calls[0], "attendancePeriod.updateMany");
    assert.ok(
      calls.indexOf("$queryRaw") > calls.indexOf("studentClass.findMany"),
      "student ids must be discovered before acquiring their advisory locks",
    );
    assert.ok(
      calls.indexOf("$queryRaw") < calls.indexOf("monthlyFee.findMany"),
      "advisory locks must be held before reading monthly fees",
    );
    assert.equal(advisoryQueries.length, 1);
    assert.notEqual(typeof advisoryQueries[0], "string");
    assert.deepEqual(advisoryQueries[0].values, [
      "attendance-fee:2026-06:student-1",
    ]);
    assert.equal(calls.filter((call) => call === "monthlyFee.findMany").length, 1);
    assert.equal(calls.filter((call) => call === "monthlyFee.createMany").length, 1);
    assert.equal(calls.filter((call) => call === "monthlyFeeLine.createMany").length, 1);
    assert.equal(studentClassQueries.length, 2);
    assert.equal(studentClassQueries[0].where.classId, "class-1");
    assert.equal(studentClassQueries[1].where.classId, "class-1");
    assert.equal(attendanceQueries.length, 2);
    for (const query of attendanceQueries) {
      assert.equal(query.where.classId, "class-1");
      assert.equal(query.where.attendanceDate.gte.toISOString(), "2026-06-01T00:00:00.000Z");
      assert.equal(query.where.attendanceDate.lt.toISOString(), "2026-07-01T00:00:00.000Z");
      assert.equal(query.where.attendanceDate.lte, undefined);
    }
    assert.deepEqual(metrics, {
      students_processed: 1,
      fees_created: 1,
      fees_updated: 0,
      fees_preserved: 0,
      fee_lines_written: 1,
    });
  });

  it("stops immediately when another request already claimed the period", async () => {
    let reads = 0;
    const tx = {
      attendancePeriod: { updateMany: async () => ({ count: 0 }) },
      studentClass: { findMany: async () => (++reads, []) },
    };

    await assert.rejects(
      lockAttendancePeriodAndSyncFees(tx as any, {
        periodId: "period-1",
        classId: "class-1",
        month: "2026-06",
        userId: "admin-1",
      }),
      (error: any) => error?.code === "ATTENDANCE_PERIOD_STATE_CONFLICT",
    );
    assert.equal(reads, 0);
  });
});

describe("attendance lock API contract", () => {
  it("sets bounded transaction waits and exposes fee sync metrics", () => {
    assert.match(endpointSource, /maxWait:\s*5_?000/);
    assert.match(endpointSource, /timeout:\s*15_?000/);
    assert.match(endpointSource, /fee_sync:\s*result/);
  });

  it("maps Prisma P2028 to a retryable request-scoped 503", () => {
    assert.equal(isAttendanceLockTimeout({ code: "P2028" }), true);
    assert.equal(isAttendanceLockTimeout({ code: "P2002" }), false);
    assert.match(endpointSource, /ATTENDANCE_LOCK_TIMEOUT/);
    assert.match(endpointSource, /retryable:\s*true/);
    assert.match(endpointSource, /request_id/);
  });

  it("blocks attendance writes once a period is submitted, approved, or locked", () => {
    assert.match(
      attendanceGuardSource,
      /status:\s*\{\s*in:\s*\[\s*"submitted",\s*"approved",\s*"locked"\s*\]/,
    );
  });

  it("uses one parameterized PostgreSQL advisory-lock query without unsafe or string-built SQL", () => {
    assert.match(lockHelperSource, /pg_advisory_xact_lock/);
    assert.match(
      lockHelperSource,
      /pg_advisory_xact_lock\([^)]*\)\)::text AS lock_result/,
      "Prisma cannot deserialize PostgreSQL void; advisory lock results must be cast",
    );
    assert.match(lockHelperSource, /Prisma\.sql/);
    assert.match(lockHelperSource, /Prisma\.join/);
    assert.match(lockHelperSource, /MATERIALIZED/);
    assert.doesNotMatch(lockHelperSource, /\$queryRawUnsafe|\$executeRawUnsafe/);
    assert.doesNotMatch(lockHelperSource, /Prisma\.raw/);
  });
});
