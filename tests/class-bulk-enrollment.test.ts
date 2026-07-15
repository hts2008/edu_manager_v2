import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildHistoricalClassRoster,
  CLASS_WRITE_TRANSACTION_OPTIONS,
  enrollStudentsInClass,
  hasClassMonthRosterImpact,
  isClassWriteTimeout,
} from "../server/api/classes/index.js";
import { classCreateSchema } from "../lib/validation.js";

const classesApiSource = readFileSync(
  new URL("../server/api/classes/index.ts", import.meta.url),
  "utf8",
);

describe("class bulk enrollment", () => {
  it("enrolls multiple students with bounded set-based writes", async () => {
    const calls: Array<{ op: string; args?: any }> = [];
    const tx: any = {
      class: { findUnique: async () => ({ id: "class-1", maxStudents: 20 }) },
      student: {
        findMany: async () => ["s1", "s2", "s3"].map((id) => ({ id })),
      },
      studentClass: {
        findMany: async () => [
          { id: 1, studentId: "s1", status: "active", enrollmentDate: new Date("2026-06-01") },
          { id: 2, studentId: "s2", status: "inactive", enrollmentDate: new Date("2026-05-01") },
        ],
        count: async () => 1,
        createMany: async (args: any) => { calls.push({ op: "studentClass.createMany", args }); return { count: 1 }; },
        updateMany: async (args: any) => { calls.push({ op: "studentClass.updateMany", args }); return { count: 1 }; },
      },
      enrollmentPeriod: {
        findMany: async () => [{ studentId: "s1" }],
        findFirst: async () => null,
        createMany: async (args: any) => { calls.push({ op: "enrollmentPeriod.createMany", args }); return { count: 2 }; },
      },
    };

    const result = await enrollStudentsInClass(tx, "class-1", ["s1", "s2", "s3"]);

    assert.deepEqual(result, { requested: 3, enrolled: 1, reactivated: 1, adjusted: 0, skipped: 1 });
    assert.equal(calls.filter((call) => call.op === "studentClass.createMany").length, 1);
    assert.equal(calls.filter((call) => call.op === "studentClass.updateMany").length, 1);
    assert.equal(calls.filter((call) => call.op === "enrollmentPeriod.createMany").length, 1);
  });

  it("uses bounded transactions and maps Prisma timeout errors", () => {
    assert.equal(CLASS_WRITE_TRANSACTION_OPTIONS.timeout, 15_000);
    assert.equal(CLASS_WRITE_TRANSACTION_OPTIONS.maxWait, 5_000);
    assert.equal(isClassWriteTimeout({ code: "P2028" }), true);
    assert.equal(isClassWriteTimeout({ code: "P2002" }), false);
  });

  it("returns historical students with half-open enrollment periods while preserving current fields", () => {
    const student = (id: string, fullName: string) => ({
      id,
      fullName,
      dateOfBirth: null,
      gender: "other",
      phone: null,
      parentId: null,
    });
    const roster = buildHistoricalClassRoster(
      [
        {
          studentId: "s-current",
          status: "active",
          enrollmentDate: new Date("2026-07-01T00:00:00.000Z"),
          student: student("s-current", "Current Student"),
        },
        {
          studentId: "s-returned",
          status: "active",
          enrollmentDate: new Date("2026-07-08T00:00:00.000Z"),
          student: student("s-returned", "Returned Student"),
        },
        {
          studentId: "s-left",
          status: "inactive",
          enrollmentDate: new Date("2026-05-01T00:00:00.000Z"),
          student: student("s-left", "Former Student"),
        },
      ],
      [
        {
          studentId: "s-left",
          startedAt: new Date("2026-05-01T00:00:00.000Z"),
          endedAt: new Date("2026-06-01T00:00:00.000Z"),
          student: student("s-left", "Former Student"),
        },
        {
          studentId: "s-returned",
          startedAt: new Date("2026-04-01T00:00:00.000Z"),
          endedAt: new Date("2026-05-01T00:00:00.000Z"),
          student: student("s-returned", "Returned Student"),
        },
        {
          studentId: "s-returned",
          startedAt: new Date("2026-07-08T00:00:00.000Z"),
          endedAt: null,
          student: student("s-returned", "Returned Student"),
        },
        {
          studentId: "s-current",
          startedAt: new Date("2026-07-01T00:00:00.000Z"),
          endedAt: null,
          student: student("s-current", "Current Student"),
        },
      ],
    );

    assert.deepEqual(roster.map((row) => row.id), ["s-current", "s-left", "s-returned"]);
    const former = roster.find((row) => row.id === "s-left");
    assert.equal(former?.enrollment_status, "inactive");
    assert.equal(former?.enrollment_date, "2026-05-01");
    assert.deepEqual(former?.enrollment_periods, [{
      started_at: "2026-05-01",
      ended_at: "2026-06-01",
    }]);
    assert.deepEqual(
      roster.find((row) => row.id === "s-returned")?.enrollment_periods,
      [
        { started_at: "2026-04-01", ended_at: "2026-05-01" },
        { started_at: "2026-07-08", ended_at: null },
      ],
    );
  });

  it("locks schedule and billing changes before class update without locking metadata-only PUTs", () => {
    assert.equal(hasClassMonthRosterImpact({ schedule_days: [1, 3, 5] }), true);
    assert.equal(hasClassMonthRosterImpact({ sessions_per_week: 3 }), true);
    assert.equal(hasClassMonthRosterImpact({ schedule_required: false }), true);
    assert.equal(hasClassMonthRosterImpact({ session_required: false }), true);
    assert.equal(hasClassMonthRosterImpact({ start_time: "18:00" }), true);
    assert.equal(hasClassMonthRosterImpact({ end_time: "19:30" }), true);
    assert.equal(hasClassMonthRosterImpact({ billing_policy: "monthly_prorated" }), true);
    assert.equal(hasClassMonthRosterImpact({ notes: "metadata only" }), false);

    const putBlock = classesApiSource.slice(
      classesApiSource.indexOf('// PUT - Update class'),
      classesApiSource.indexOf('// DELETE - Soft delete class'),
    );
    const lockIndex = putBlock.indexOf("await assertClassDefinitionWritable(");
    const updateIndex = putBlock.indexOf("await tx.class.update(");
    assert.ok(lockIndex >= 0, "schedule-impacting PUT must acquire the shared roster lock");
    assert.ok(lockIndex < updateIndex, "shared roster lock must be acquired before tx.class.update");
    assert.match(putBlock, /if \(hasClassMonthRosterImpact\(body\)\)/);
  });

  it("uses the explicit enrollment business date for new and reactivated students", async () => {
    const effectiveAt = new Date("2026-06-01T00:00:00.000Z");
    const calls: Array<{ op: string; args?: any }> = [];
    let createdPeriods: any[] = [];
    const tx: any = {
      class: { findUnique: async () => ({ id: "class-1", maxStudents: 20 }) },
      student: { findMany: async () => [{ id: "s1" }, { id: "s2" }] },
      studentClass: {
        findMany: async () => [
          { id: 2, studentId: "s2", status: "inactive", enrollmentDate: new Date("2026-05-01") },
        ],
        count: async () => 0,
        createMany: async (args: any) => { calls.push({ op: "studentClass.createMany", args }); return { count: 1 }; },
        updateMany: async (args: any) => { calls.push({ op: "studentClass.updateMany", args }); return { count: 1 }; },
      },
      enrollmentPeriod: {
        findMany: async ({ where }: any) => where.endedAt === null ? [] : createdPeriods,
        findFirst: async () => null,
        createMany: async (args: any) => {
          calls.push({ op: "enrollmentPeriod.createMany", args });
          createdPeriods = args.data.map((row: any) => ({
            ...row,
            id: `period-${row.studentId}`,
            endedAt: null,
          }));
          return { count: 2 };
        },
      },
      activityLog: {
        createMany: async (args: any) => {
          calls.push({ op: "activityLog.createMany", args });
          return { count: args.data.length };
        },
      },
    };

    await enrollStudentsInClass(tx, "class-1", ["s1", "s2"], effectiveAt, {
      actorId: "admin-1",
      actorRole: "admin",
      backdateReason: "Imported June enrollment",
    });

    const createdLinks = calls.find((call) => call.op === "studentClass.createMany")?.args.data;
    const reactivatedLink = calls.find((call) => call.op === "studentClass.updateMany")?.args.data;
    const periods = calls.find((call) => call.op === "enrollmentPeriod.createMany")?.args.data;
    assert.equal(createdLinks[0].enrollmentDate.toISOString(), effectiveAt.toISOString());
    assert.equal(reactivatedLink.enrollmentDate.toISOString(), effectiveAt.toISOString());
    assert.deepEqual(periods.map((row: any) => row.startedAt.toISOString()), [
      effectiveAt.toISOString(),
      effectiveAt.toISOString(),
    ]);
  });

  it("accepts only real YYYY-MM-DD enrollment effective dates", () => {
    const base = {
      class_name: "Historical class",
      start_time: "18:00",
      end_time: "19:30",
      fee_per_day: 900000,
    };

    assert.equal(
      classCreateSchema.parse({ ...base, enrollment_effective_date: "2026-06-01" }).enrollment_effective_date,
      "2026-06-01",
    );
    assert.equal(
      classCreateSchema.safeParse({ ...base, enrollment_effective_date: "2026-02-30" }).success,
      false,
    );
  });

  it("backdates an existing active projection and open period only when explicitly requested", async () => {
    const effectiveAt = new Date("2026-06-01T00:00:00.000Z");
    const calls: Array<{ op: string; args?: any }> = [];
    const tx: any = {
      class: { findUnique: async () => ({ id: "class-1", maxStudents: 20 }) },
      student: { findMany: async () => [{ id: "s1" }] },
      studentClass: {
        findMany: async () => [
          { id: 1, studentId: "s1", status: "active", enrollmentDate: new Date("2026-07-14") },
        ],
        count: async () => 1,
        createMany: async () => ({ count: 0 }),
        updateMany: async (args: any) => { calls.push({ op: "studentClass.updateMany", args }); return { count: 1 }; },
      },
      enrollmentPeriod: {
        findMany: async () => [
          { id: "period-1", studentId: "s1", startedAt: new Date("2026-07-14") },
        ],
        findFirst: async () => null,
        createMany: async () => ({ count: 0 }),
        updateMany: async (args: any) => { calls.push({ op: "enrollmentPeriod.updateMany", args }); return { count: 1 }; },
      },
      activityLog: {
        createMany: async (args: any) => { calls.push({ op: "activityLog.createMany", args }); return { count: args.data.length }; },
      },
    };

    const result = await enrollStudentsInClass(tx, "class-1", ["s1"], effectiveAt, {
      adjustExistingEnrollmentStart: true,
      backdateReason: "Imported June attendance",
      actorId: "admin-1",
      actorRole: "admin",
    });

    assert.equal(result.adjusted, 1);
    const projectionUpdate = calls.find((call) => call.op === "studentClass.updateMany");
    const periodUpdate = calls.find((call) => call.op === "enrollmentPeriod.updateMany");
    assert.equal(projectionUpdate?.args.data.enrollmentDate.toISOString(), effectiveAt.toISOString());
    assert.equal(periodUpdate?.args.data.startedAt.toISOString(), effectiveAt.toISOString());
    assert.equal(periodUpdate?.args.data.source, "class_bulk_backdate");
  });

  it("requires an operator reason before existing enrollments can be backdated", async () => {
    await assert.rejects(
      () => enrollStudentsInClass({}, "class-1", ["s1"], new Date("2026-06-01"), {
        adjustExistingEnrollmentStart: true,
        actorId: "admin-1",
        actorRole: "admin",
      }),
      (error) => {
        assert.equal((error as { code?: string }).code, "BACKDATE_REASON_REQUIRED");
        return true;
      },
    );
  });

  for (const scenario of [
    { name: "reactivating an inactive link", status: "inactive", adjust: false },
    { name: "backfilling a missing period", status: "active", adjust: false },
  ]) {
    it(`rejects an overlapping EnrollmentPeriod before ${scenario.name}`, async () => {
      let writes = 0;
      const effectiveAt = new Date("2026-06-01T00:00:00.000Z");
      const overlap = {
        id: "period-existing",
        studentId: "s1",
        startedAt: new Date("2026-05-01T00:00:00.000Z"),
        endedAt: new Date("2026-07-01T00:00:00.000Z"),
      };
      const tx: any = {
        class: { findUnique: async () => ({ id: "class-1", maxStudents: 20 }) },
        student: { findMany: async () => [{ id: "s1" }] },
        studentClass: {
          findMany: async () => [{
            id: 1,
            studentId: "s1",
            status: scenario.status,
            enrollmentDate: new Date("2026-06-01T00:00:00.000Z"),
          }],
          count: async () => scenario.status === "active" ? 1 : 0,
          createMany: async () => { writes += 1; return { count: 0 }; },
          updateMany: async () => { writes += 1; return { count: 1 }; },
        },
        enrollmentPeriod: {
          findMany: async (args: any) => args.where?.endedAt === null ? [] : [overlap],
          findFirst: async () => overlap,
          createMany: async () => { writes += 1; return { count: 1 }; },
          updateMany: async () => { writes += 1; return { count: 1 }; },
        },
      };

      await assert.rejects(
        () => enrollStudentsInClass(tx, "class-1", ["s1"], effectiveAt, {
          adjustExistingEnrollmentStart: scenario.adjust,
          actorId: "admin-1",
          actorRole: "admin",
          backdateReason: "Imported historical enrollment",
        }),
        (error) => {
          assert.equal((error as { code?: string }).code, "ENROLLMENT_OVERLAP");
          return true;
        },
      );
      assert.equal(writes, 0, "overlap validation must happen before projection or period writes");
    });
  }
});
