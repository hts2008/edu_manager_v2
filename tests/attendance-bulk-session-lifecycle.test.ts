import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { ApiError } from "../lib/api-utils.js";
import prisma from "../lib/prisma.js";
import { handler as attendanceHandler } from "../server/api/attendance/index.js";
import { handler as bulkAttendanceHandler } from "../server/api/attendance/bulk.js";
import {
  assertBulkAttendanceDateScopeEditable,
  buildAttendanceSessionUpdate,
  isAttendanceGeneratedSession,
  parseAttendanceDate,
  reconcileClearedAttendanceSessions,
  validateBulkAttendanceRecords,
  validateBulkAttendanceDateScope,
} from "../lib/attendance-session-lifecycle.js";

function assertApiError(error: unknown, code: string) {
  assert.ok(error instanceof ApiError);
  assert.equal(error.status, 400);
  assert.equal(error.code, code);
  return true;
}

after(async () => {
  await prisma.$disconnect();
});

describe("bulk attendance ClassSession lifecycle", () => {
  it("does not promote an attendance-created ledger into a monthly denominator", async () => {
    const mockedPrisma = prisma as any;
    const originalTransaction = mockedPrisma.$transaction;
    let regularSessions = 0;
    let revisionSnapshot: any = null;
    const attendanceDate = new Date("2026-07-06T00:00:00.000Z");
    const tx = {
      $queryRaw: async () => [],
      class: {
        findUnique: async () => ({ scheduleDays: [], sessionsPerWeek: null }),
      },
      attendancePeriod: { findMany: async () => [] },
      enrollmentPeriod: {
        findMany: async () => [{
          studentId: "student-1",
          startedAt: new Date("2026-01-01T00:00:00.000Z"),
          endedAt: null,
        }],
      },
      studentClass: { findMany: async () => [] },
      classSession: {
        findUnique: async () => null,
        upsert: async () => {
          regularSessions = 1;
          return { id: "session-1" };
        },
        count: async () => regularSessions,
      },
      attendance: {
        upsert: async () => ({
          id: "attendance-1",
          studentId: "student-1",
          classId: "class-1",
          attendanceDate,
          status: "present",
          reason: null,
          isMakeUp: false,
          makeUpReason: null,
        }),
      },
      classMonthPlan: {
        findUnique: async () => null,
        upsert: async ({ create }: any) => {
          revisionSnapshot = create.revisions.create.snapshot;
          return {
            id: "plan-1",
            classId: "class-1",
            billingMonth: "2026-07",
            state: "open",
            revision: 1,
          };
        },
      },
      monthlyFeeLine: { findFirst: async () => null },
      monthlyFee: { findFirst: async () => null },
    };
    const response = {
      statusCode: 200,
      body: undefined as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };

    try {
      mockedPrisma.$transaction = async (
        work: (transaction: any) => Promise<unknown>,
      ) => work(tx);
      await attendanceHandler({
        method: "POST",
        headers: {},
        query: {},
        body: {
          student_id: "student-1",
          class_id: "class-1",
          attendance_date: "2026-07-06",
          status: "present",
        },
        user: {
          id: "admin-1",
          userId: "admin-1",
          role: "admin",
        },
      } as any, response as any);
    } finally {
      mockedPrisma.$transaction = originalTransaction;
    }

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data.id, "attendance-1");
    assert.equal(revisionSnapshot?.payload?.expected_regular_sessions, 0);
  });

  it("records each bulk revision after replacement and cleared-session reconciliation", async () => {
    const mockedPrisma = prisma as any;
    const originals = {
      transaction: mockedPrisma.$transaction,
      classFindUnique: mockedPrisma.class.findUnique,
    };
    let attendanceRows = 1;
    let regularSessions = 1;
    let revisionSnapshot: any = null;
    const attendanceDate = new Date("2026-07-06T00:00:00.000Z");
    const classRecord = { scheduleDays: [], sessionsPerWeek: null };
    const tx = {
      $queryRaw: async () => [],
      class: { findUnique: async () => classRecord },
      attendancePeriod: { findMany: async () => [] },
      enrollmentPeriod: {
        findMany: async () => [{
          studentId: "student-1",
          startedAt: new Date("2026-01-01T00:00:00.000Z"),
          endedAt: null,
        }],
      },
      studentClass: { findMany: async () => [] },
      attendance: {
        deleteMany: async () => {
          attendanceRows = 0;
          return { count: 1 };
        },
        createMany: async () => assert.fail("clear-all must not create attendance"),
        findMany: async () => attendanceRows ? [{ attendanceDate }] : [],
      },
      classSession: {
        count: async () => regularSessions,
        findMany: async () => [{
          id: "generated-session",
          source: "attendance_bulk",
          replacementSessions: [],
        }],
        deleteMany: async () => {
          assert.equal(attendanceRows, 0);
          regularSessions = 0;
          return { count: 1 };
        },
        updateMany: async () => ({ count: 0 }),
      },
      classMonthPlan: {
        findUnique: async () => null,
        upsert: async ({ create }: any) => {
          revisionSnapshot = create.revisions.create.snapshot;
          return {
            id: "plan-1",
            classId: "class-1",
            billingMonth: "2026-07",
            state: "open",
            revision: 1,
          };
        },
      },
    };
    const response = {
      statusCode: 200,
      body: undefined as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };

    try {
      mockedPrisma.class.findUnique = async () => classRecord;
      mockedPrisma.$transaction = async (
        work: (transaction: any) => Promise<unknown>,
      ) => work(tx);
      await bulkAttendanceHandler({
        method: "POST",
        headers: {},
        query: {},
        body: {
          class_id: "class-1",
          dates: ["2026-07-06"],
          records: [],
          replacement_scope: [{
            student_id: "student-1",
            attendance_date: "2026-07-06",
          }],
        },
        user: {
          id: "admin-1",
          userId: "admin-1",
          role: "admin",
        },
      } as any, response as any);
    } finally {
      mockedPrisma.$transaction = originals.transaction;
      mockedPrisma.class.findUnique = originals.classFindUnique;
    }

    assert.equal(response.statusCode, 200);
    assert.equal(attendanceRows, 0);
    assert.equal(regularSessions, 0);
    assert.equal(revisionSnapshot?.payload?.expected_regular_sessions, 0);
  });

  it("recognizes only unreferenced attendance-generated sessions as disposable", () => {
    assert.equal(isAttendanceGeneratedSession({ source: "attendance_bulk" }), true);
    assert.equal(isAttendanceGeneratedSession({ source: "attendance_single" }), true);
    assert.equal(isAttendanceGeneratedSession({ source: "month_plan" }), false);
    assert.equal(isAttendanceGeneratedSession({
      source: "attendance_bulk",
      replacementSessions: [{ id: "makeup-1" }],
    }), false);
  });

  it("deletes a cleared attendance-generated session and retains an explicit plan", async () => {
    const calls: any[] = [];
    const tx = {
      classSession: {
        findMany: async () => [
          { id: "generated", source: "attendance_bulk", replacementSessions: [] },
          { id: "planned", source: "month_plan", replacementSessions: [] },
        ],
        deleteMany: async (args: any) => {
          calls.push(["delete", args]);
          return { count: 1 };
        },
        updateMany: async (args: any) => {
          calls.push(["update", args]);
          return { count: 1 };
        },
      },
    };

    const result = await reconcileClearedAttendanceSessions(tx, {
      classId: "class-1",
      dates: [new Date("2026-07-06T00:00:00.000Z")],
      userId: "admin-1",
    });

    assert.deepEqual(result, { deleted: 1, retained: 1 });
    assert.deepEqual(calls[0][1].where.id.in, ["generated"]);
    assert.deepEqual(calls[1][1].where.id.in, ["planned"]);
    assert.equal(calls[1][1].data.status, "planned");
  });

  it("preserves explicit session kind, source, and billing semantics", () => {
    const update = buildAttendanceSessionUpdate(
      { source: "month_plan_patch", replacementSessions: [] },
      {
        inferredKind: "regular",
        status: "held",
        userId: "admin-1",
      },
    );

    assert.deepEqual(update, {
      status: "held",
      updatedById: "admin-1",
      version: { increment: 1 },
    });
    assert.equal("kind" in update, false);
    assert.equal("source" in update, false);
    assert.equal("billingMonth" in update, false);
  });

  it("allows attendance-generated session kind to follow attendance input", () => {
    const update = buildAttendanceSessionUpdate(
      { source: "attendance_bulk", replacementSessions: [] },
      {
        inferredKind: "makeup",
        status: "held",
        userId: "admin-1",
      },
    );

    assert.deepEqual(update, {
      kind: "makeup",
      status: "held",
      updatedById: "admin-1",
      version: { increment: 1 },
    });
  });

  it("uses the same strict calendar-date parser for single attendance", () => {
    assert.equal(
      parseAttendanceDate("2026-07-06", "attendance_date", 0).toISOString(),
      "2026-07-06T00:00:00.000Z",
    );
    assert.throws(
      () => parseAttendanceDate("2026-02-30", "attendance_date", 0),
      (error) => assertApiError(error, "INVALID_ATTENDANCE_DATE"),
    );

    const source = readFileSync(
      new URL("../server/api/attendance/index.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /parseAttendanceDate\(attendance_date, "attendance_date", 0\)/);
    assert.doesNotMatch(source, /new Date\(attendance_date\)/);
  });

  it("preserves explicit ClassSession semantics in the single attendance writer", () => {
    const source = readFileSync(
      new URL("../server/api/attendance/index.ts", import.meta.url),
      "utf8",
    );
    const existingRead = source.indexOf("const existingSession = await tx.classSession.findUnique");
    const guardedUpdate = source.indexOf("buildAttendanceSessionUpdate(");
    const upsert = source.indexOf("const session = await tx.classSession.upsert");

    assert.ok(existingRead >= 0);
    assert.ok(guardedUpdate > existingRead);
    assert.ok(upsert > guardedUpdate);
    assert.match(source, /update:\s*sessionUpdate/);
  });

  it("accepts unique real YYYY-MM-DD dates and records inside the declared scope", () => {
    const scope = validateBulkAttendanceDateScope(
      ["2026-07-06", "2026-08-03"],
      [
        { attendance_date: "2026-08-03" },
        { attendance_date: "2026-07-06" },
      ],
    );

    assert.deepEqual(scope.dates, ["2026-07-06", "2026-08-03"]);
    assert.deepEqual(
      scope.dateObjects.map((date) => date.toISOString()),
      ["2026-07-06T00:00:00.000Z", "2026-08-03T00:00:00.000Z"],
    );
  });

  for (const invalidDate of [
    "2026-7-06",
    "2026-02-30",
    "2026-07-06T00:00:00.000Z",
    20260706,
  ]) {
    it(`rejects malformed declared date ${JSON.stringify(invalidDate)} with a typed 400`, () => {
      assert.throws(
        () => validateBulkAttendanceDateScope([invalidDate], []),
        (error) => assertApiError(error, "INVALID_ATTENDANCE_DATE"),
      );
    });
  }

  it("rejects duplicate declared dates instead of silently narrowing the edit scope", () => {
    assert.throws(
      () => validateBulkAttendanceDateScope(
        ["2026-07-06", "2026-07-06"],
        [],
      ),
      (error) => assertApiError(error, "DUPLICATE_ATTENDANCE_DATE"),
    );
  });

  it("rejects malformed and out-of-scope record dates with typed 400 errors", () => {
    assert.throws(
      () => validateBulkAttendanceDateScope(
        ["2026-07-06"],
        [{ attendance_date: "2026-02-30" }],
      ),
      (error) => assertApiError(error, "INVALID_ATTENDANCE_DATE"),
    );
    assert.throws(
      () => validateBulkAttendanceDateScope(
        ["2026-07-06"],
        [{ attendance_date: "2026-07-07" }],
      ),
      (error) => assertApiError(error, "ATTENDANCE_DATE_OUT_OF_SCOPE"),
    );
  });

  for (const invalidCase of [
    {
      name: "unsupported status",
      record: {
        student_id: "student-1",
        class_id: "class-1",
        attendance_date: "2026-07-06",
        status: "late",
      },
      code: "INVALID_ATTENDANCE_STATUS",
    },
    {
      name: "missing student_id",
      record: {
        class_id: "class-1",
        attendance_date: "2026-07-06",
        status: "present",
      },
      code: "MISSING_STUDENT_ID",
    },
    {
      name: "class_id mismatch",
      record: {
        student_id: "student-1",
        class_id: "class-2",
        attendance_date: "2026-07-06",
        status: "present",
      },
      code: "ATTENDANCE_CLASS_MISMATCH",
    },
  ]) {
    it(`rejects every malformed row: ${invalidCase.name}`, () => {
      assert.throws(
        () => validateBulkAttendanceRecords([invalidCase.record], "class-1"),
        (error) => assertApiError(error, invalidCase.code),
      );
    });
  }

  it("rejects a mixed valid and invalid payload instead of returning a filtered subset", () => {
    assert.throws(
      () => validateBulkAttendanceRecords(
        [
          {
            student_id: "student-valid",
            class_id: "class-1",
            attendance_date: "2026-07-06",
            status: "present",
          },
          {
            student_id: "student-invalid",
            class_id: "class-1",
            attendance_date: "2026-07-06",
            status: "late",
          },
        ],
        "class-1",
      ),
      (error) => assertApiError(error, "INVALID_ATTENDANCE_STATUS"),
    );
  });

  it("validates every row before the bulk transaction can delete attendance", () => {
    const source = readFileSync(
      new URL("../server/api/attendance/bulk.ts", import.meta.url),
      "utf8",
    );
    const validationIndex = source.indexOf("validateBulkAttendanceRecords(");
    const transactionIndex = source.indexOf("runSerializableTransaction(prisma,");
    const deleteIndex = source.indexOf("tx.attendance.deleteMany(");

    assert.ok(validationIndex >= 0, "strict row validation must be called");
    assert.ok(validationIndex < transactionIndex, "row validation must precede the transaction");
    assert.ok(validationIndex < deleteIndex, "row validation must precede attendance deletion");
    assert.doesNotMatch(source, /recordsArray\s*\.filter\(/);
  });

  it("checks every declared touched date for period editability", async () => {
    const scope = validateBulkAttendanceDateScope(
      ["2026-07-06", "2026-08-03"],
      [{ attendance_date: "2026-07-06" }],
    );
    const checked: string[][] = [];

    await assertBulkAttendanceDateScopeEditable(scope, async (dates) => {
      checked.push(dates.map((date) => date.toISOString().slice(0, 10)));
    });

    assert.deepEqual(checked, [["2026-07-06", "2026-08-03"]]);
  });
});
