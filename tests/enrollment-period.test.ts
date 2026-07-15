import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertClassDefinitionWritable,
  assertEnrollmentMutationWritable,
  deactivateEnrollmentPeriods,
  enrollmentOverlapsRange,
  syncStudentEnrollmentPeriods,
} from "../lib/enrollment.js";

describe("time-bounded enrollment ledger", () => {
  it("locks the class globally and rejects schedule or billing edits after any protected historical month", async () => {
    const calls: string[] = [];
    const tx: any = {
      $queryRaw: async () => {
        calls.push("global-lock");
      },
      attendancePeriod: {
        findFirst: async ({ where }: any) => {
          calls.push("period-check");
          assert.deepEqual(where.status.in, ["submitted", "approved", "locked"]);
          return {
            classId: "class-1",
            periodMonth: "2026-05",
            status: "locked",
          };
        },
      },
      classMonthPlan: { findFirst: async () => null },
    };

    await assert.rejects(
      assertClassDefinitionWritable(tx, ["class-1"]),
      (error: any) => {
        assert.equal(error.code, "CLASS_DEFINITION_LOCKED");
        assert.equal(error.status, 409);
        assert.equal(error.details.period_month, "2026-05");
        return true;
      },
    );
    assert.deepEqual(calls, ["global-lock", "period-check"]);
  });

  it("takes class-month roster locks and rejects enrollment changes that touch locked months", async () => {
    const calls: string[] = [];
    const tx: any = {
      $queryRaw: async () => {
        calls.push("lock");
      },
      attendancePeriod: {
        findFirst: async () => {
          calls.push("period-check");
          return { classId: "class-1", periodMonth: "2026-06", status: "locked" };
        },
      },
    };

    await assert.rejects(
      assertEnrollmentMutationWritable(
        tx,
        ["class-1"],
        new Date("2026-06-15T00:00:00.000Z"),
        new Date("2026-07-13T00:00:00.000Z"),
      ),
      (error: any) => {
        assert.match(error.code, /^ENROLLMENT_PERIOD_(?:LOCKED|PROTECTED)$/);
        assert.equal(error.status, 409);
        return true;
      },
    );
    assert.equal(calls[0], "lock");
    assert.equal(calls.at(-1), "period-check");
  });

  for (const protectedStatus of ["submitted", "approved"]) {
    it(`rejects backdates when the attendance period is ${protectedStatus}`, async () => {
      const tx: any = {
        $queryRaw: async () => undefined,
        attendancePeriod: {
          findFirst: async ({ where }: any) => {
            const acceptedStatuses = Array.isArray(where.status?.in)
              ? where.status.in
              : [where.status];
            return acceptedStatuses.includes(protectedStatus)
              ? { classId: "class-1", periodMonth: "2026-06", status: protectedStatus }
              : null;
          },
        },
        classMonthPlan: { findFirst: async () => null },
      };

      await assert.rejects(
        assertEnrollmentMutationWritable(
          tx,
          ["class-1"],
          new Date("2026-06-01T00:00:00.000Z"),
          new Date("2026-07-14T00:00:00.000Z"),
        ),
        (error: any) => {
          assert.match(error.code, /^ENROLLMENT_PERIOD_(?:LOCKED|PROTECTED)$/);
          assert.equal(error.status, 409);
          return true;
        },
      );
    });
  }

  it("rejects backdates when any affected ClassMonthPlan is frozen", async () => {
    const tx: any = {
      $queryRaw: async () => undefined,
      attendancePeriod: { findFirst: async () => null },
      classMonthPlan: {
        findFirst: async ({ where }: any) => where.state === "frozen"
          ? { classId: "class-1", billingMonth: "2026-06", state: "frozen" }
          : null,
      },
    };

    await assert.rejects(
      assertEnrollmentMutationWritable(
        tx,
        ["class-1"],
        new Date("2026-06-01T00:00:00.000Z"),
        new Date("2026-07-14T00:00:00.000Z"),
      ),
      (error: any) => {
        assert.match(error.code, /^(?:CLASS|ENROLLMENT)_MONTH_PLAN_FROZEN$/);
        assert.equal(error.status, 409);
        return true;
      },
    );
  });

  it("fails closed when the class membership set changes after roster locks are acquired", async () => {
    let reads = 0;
    let writes = 0;
    const tx: any = {
      studentClass: {
        findMany: async () => {
          reads += 1;
          return reads === 1
            ? [{ id: "link-a", studentId: "student-1", classId: "class-a", status: "active", enrollmentDate: new Date() }]
            : [
                { id: "link-a", studentId: "student-1", classId: "class-a", status: "active", enrollmentDate: new Date() },
                { id: "link-b", studentId: "student-1", classId: "class-b", status: "active", enrollmentDate: new Date() },
              ];
        },
        update: async () => { writes += 1; },
      },
      enrollmentPeriod: {},
    };

    await assert.rejects(
      syncStudentEnrollmentPeriods(tx, {
        studentId: "student-1",
        desiredClassIds: [],
        source: "student_update",
      }),
      (error: any) => {
        assert.equal(error.code, "ENROLLMENT_ROSTER_CHANGED");
        assert.equal(error.status, 409);
        return true;
      },
    );
    assert.equal(writes, 0);
  });

  it("deactivates only the roster identities revalidated under the class locks", async () => {
    let reads = 0;
    let updateWhere: any;
    const tx: any = {
      studentClass: {
        findMany: async () => {
          reads += 1;
          return reads === 1
            ? [{ id: "link-a", classId: "class-a" }]
            : [{ id: "link-a", classId: "class-a" }, { id: "link-b", classId: "class-b" }];
        },
        updateMany: async (args: any) => {
          updateWhere = args.where;
          return { count: 1 };
        },
      },
      enrollmentPeriod: { updateMany: async () => ({ count: 1 }) },
    };

    await assert.rejects(
      deactivateEnrollmentPeriods(tx, { studentId: "student-1" }),
      (error: any) => {
        assert.equal(error.code, "ENROLLMENT_ROSTER_CHANGED");
        return true;
      },
    );
    assert.equal(updateWhere, undefined);
  });

  it("uses half-open ranges so a withdrawal does not leak into the next period", () => {
    const period = {
      startedAt: new Date("2026-05-10T00:00:00.000Z"),
      endedAt: new Date("2026-06-01T00:00:00.000Z"),
    };

    assert.equal(
      enrollmentOverlapsRange(
        period,
        new Date("2026-05-01T00:00:00.000Z"),
        new Date("2026-06-01T00:00:00.000Z"),
      ),
      true,
    );
    assert.equal(
      enrollmentOverlapsRange(
        period,
        new Date("2026-06-01T00:00:00.000Z"),
        new Date("2026-07-01T00:00:00.000Z"),
      ),
      false,
    );
  });

  it("closes removed classes and opens a new period when a class is reactivated", async () => {
    const calls: Array<{ op: string; args: any }> = [];
    const tx: any = {
      studentClass: {
        findMany: async () => [
          {
            id: 1,
            studentId: "student-1",
            classId: "class-old",
            status: "active",
            enrollmentDate: new Date("2026-05-01T00:00:00.000Z"),
          },
          {
            id: 2,
            studentId: "student-1",
            classId: "class-return",
            status: "inactive",
            enrollmentDate: new Date("2026-04-01T00:00:00.000Z"),
          },
        ],
        update: async (args: any) => {
          calls.push({ op: "studentClass.update", args });
          return args;
        },
        create: async (args: any) => {
          calls.push({ op: "studentClass.create", args });
          return { id: 3, ...args.data };
        },
      },
      enrollmentPeriod: {
        findFirst: async ({ where }: any) =>
          where.classId === "class-old" ? { id: "period-old" } : null,
        update: async (args: any) => {
          calls.push({ op: "period.update", args });
          return args;
        },
        create: async (args: any) => {
          calls.push({ op: "period.create", args });
          return args;
        },
      },
    };
    const effectiveAt = new Date("2026-07-15T00:00:00.000Z");

    const result = await syncStudentEnrollmentPeriods(tx, {
      studentId: "student-1",
      desiredClassIds: ["class-return", "class-new"],
      effectiveAt,
      source: "student_update",
    });

    assert.deepEqual(result, { activated: 2, deactivated: 1, unchanged: 0 });
    assert.ok(
      calls.some(
        ({ op, args }) =>
          op === "period.update" &&
          args.where.id === "period-old" &&
          args.data.endedAt === effectiveAt,
      ),
    );
    assert.equal(
      calls.filter(({ op }) => op === "period.create").length,
      2,
    );
  });
});
