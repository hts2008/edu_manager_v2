import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acquireStudentEnrollmentAdvisoryLock,
  assertClassDefinitionWritable,
  assertEnrollmentMutationWritable,
  deactivateEnrollmentPeriods,
  enrollmentOverlapsRange,
  syncStudentEnrollmentPeriods,
} from "../lib/enrollment.js";
import { acquireClassMonthRosterAdvisoryLocks } from "../lib/attendance-lock-transaction.js";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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

  for (const protectedStatus of ["submitted", "approved", "locked"]) {
    it(`extends roster locks through a future ${protectedStatus} attendance month`, async () => {
      const calls: string[] = [];
      const lockQueries: any[] = [];
      const protectedPeriod = {
        classId: "class-1",
        periodMonth: "2026-09",
        status: protectedStatus,
      };
      const tx: any = {
        $queryRaw: async (query: any) => {
          calls.push("lock");
          lockQueries.push(query);
        },
        attendancePeriod: {
          findFirst: async ({ where, orderBy }: any) => {
            calls.push(`period:${orderBy.periodMonth}`);
            assert.equal(where.periodMonth.gte, "2026-06");
            if (where.periodMonth.lte && protectedPeriod.periodMonth > where.periodMonth.lte) {
              return null;
            }
            return protectedPeriod;
          },
        },
        classMonthPlan: { findFirst: async () => null },
      };

      await assert.rejects(
        assertEnrollmentMutationWritable(
          tx,
          ["class-1"],
          new Date("2026-06-15T00:00:00.000Z"),
          new Date("2026-07-13T00:00:00.000Z"),
        ),
        (error: any) => {
          assert.equal(error.code, "ENROLLMENT_PERIOD_LOCKED");
          assert.equal(error.details.period_month, "2026-09");
          return true;
        },
      );

      assert.deepEqual(calls, ["lock", "period:desc", "lock", "period:asc"]);
      assert.deepEqual(lockQueries[0].values, ["attendance-roster:global:class-1"]);
      assert.deepEqual(lockQueries[1].values, [
        "attendance-roster:global:class-1",
        "attendance-roster:2026-06:class-1",
        "attendance-roster:2026-07:class-1",
        "attendance-roster:2026-08:class-1",
        "attendance-roster:2026-09:class-1",
      ]);
    });
  }

  it("extends roster locks through a future frozen class month plan", async () => {
    const calls: string[] = [];
    const lockQueries: any[] = [];
    const frozenPlan = {
      classId: "class-1",
      billingMonth: "2026-10",
      state: "frozen",
    };
    const tx: any = {
      $queryRaw: async (query: any) => {
        calls.push("lock");
        lockQueries.push(query);
      },
      attendancePeriod: {
        findFirst: async ({ orderBy }: any) => {
          calls.push(`period:${orderBy.periodMonth}`);
          return null;
        },
      },
      classMonthPlan: {
        findFirst: async ({ where, orderBy }: any) => {
          calls.push(`plan:${orderBy.billingMonth}`);
          assert.equal(where.billingMonth.gte, "2026-06");
          if (where.billingMonth.lte && frozenPlan.billingMonth > where.billingMonth.lte) {
            return null;
          }
          return frozenPlan;
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
        assert.equal(error.code, "CLASS_MONTH_PLAN_FROZEN");
        assert.equal(error.details.billing_month, "2026-10");
        return true;
      },
    );

    assert.deepEqual(calls, [
      "lock",
      "period:desc",
      "plan:desc",
      "lock",
      "period:asc",
      "plan:asc",
    ]);
    assert.deepEqual(lockQueries[1].values, [
      "attendance-roster:global:class-1",
      "attendance-roster:2026-06:class-1",
      "attendance-roster:2026-07:class-1",
      "attendance-roster:2026-08:class-1",
      "attendance-roster:2026-09:class-1",
      "attendance-roster:2026-10:class-1",
    ]);
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

  it("serializes exact roster replacement before its initial read against an unrelated-class writer", async () => {
    const studentId = "student-1";
    const links = [
      {
        id: "link-a",
        studentId,
        classId: "class-a",
        status: "active",
        enrollmentDate: new Date("2026-06-01T00:00:00.000Z"),
      },
    ];
    const lockOwners = new Map<string, string>();
    const lockWaiters = new Map<string, Array<() => void>>();
    const transactionLocks = new Map<string, Set<string>>();
    const writerAtBarrier = deferred();
    const releaseWriter = deferred();
    const exactFinished = deferred();
    const exactWaitedForStudentLock = deferred();

    async function acquireLock(transactionId: string, key: string) {
      while (lockOwners.has(key) && lockOwners.get(key) !== transactionId) {
        if (key === `enrollment-roster:student:${studentId}`) {
          exactWaitedForStudentLock.resolve();
        }
        await new Promise<void>((resolve) => {
          const waiters = lockWaiters.get(key) || [];
          waiters.push(resolve);
          lockWaiters.set(key, waiters);
        });
      }
      lockOwners.set(key, transactionId);
      const heldLocks = transactionLocks.get(transactionId) || new Set<string>();
      heldLocks.add(key);
      transactionLocks.set(transactionId, heldLocks);
    }

    function releaseLocks(transactionId: string) {
      for (const key of transactionLocks.get(transactionId) || []) {
        if (lockOwners.get(key) !== transactionId) continue;
        lockOwners.delete(key);
        for (const wake of lockWaiters.get(key) || []) wake();
        lockWaiters.delete(key);
      }
      transactionLocks.delete(transactionId);
    }

    function transaction(transactionId: string) {
      return {
        $queryRaw: async (query: any) => {
          for (const key of query.values.filter((value: unknown) => typeof value === "string")) {
            await acquireLock(transactionId, key);
          }
        },
        studentClass: {
          findMany: async () => links.map((link) => ({ ...link })),
          update: async ({ where, data }: any) => {
            const link = links.find((candidate) => candidate.id === where.id);
            if (link) Object.assign(link, data);
            return link;
          },
          create: async ({ data }: any) => {
            const link = { id: `link-${links.length + 1}`, ...data };
            links.push(link);
            return link;
          },
        },
        enrollmentPeriod: {
          findFirst: async () => null,
          create: async () => ({}),
        },
      };
    }

    async function runTransaction(transactionId: string, work: (tx: any) => Promise<void>) {
      const tx = transaction(transactionId);
      try {
        await work(tx);
      } finally {
        releaseLocks(transactionId);
      }
    }

    const writer = runTransaction("writer-c", async (tx) => {
      await acquireStudentEnrollmentAdvisoryLock(tx, studentId);
      await acquireClassMonthRosterAdvisoryLocks(tx, ["class-c"], []);
      writerAtBarrier.resolve();
      await releaseWriter.promise;
      links.push({
        id: "link-c",
        studentId,
        classId: "class-c",
        status: "active",
        enrollmentDate: new Date("2026-07-16T00:00:00.000Z"),
      });
    });
    await writerAtBarrier.promise;

    const exactReplacement = runTransaction("exact-replacement", async (tx) => {
      await syncStudentEnrollmentPeriods(tx, {
        studentId,
        desiredClassIds: ["class-b"],
        source: "student_update",
      });
      exactFinished.resolve();
    });

    await Promise.race([exactFinished.promise, exactWaitedForStudentLock.promise]);
    releaseWriter.resolve();
    await Promise.all([writer, exactReplacement]);

    assert.deepEqual(
      links.filter((link) => link.status === "active").map((link) => link.classId).sort(),
      ["class-b"],
    );
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
