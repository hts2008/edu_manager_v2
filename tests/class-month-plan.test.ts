import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ClassMonthPlanError,
  bumpClassMonthPlan,
  freezeClassMonthPlan,
  mapAttendancePeriodStatusToPlanState,
  withClassMonthPlanRosterWrite,
} from "../lib/class-month-plan.js";
import { classMonthRosterAdvisoryLockKeys } from "../lib/attendance-lock-transaction.js";
import { runClassMonthPlanBackfill } from "../scripts/backfill-class-month-plans.js";

const schemaSource = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migrationSource = readFileSync(
  new URL("../prisma/migrations/20260713_class_month_plans/migration.sql", import.meta.url),
  "utf8",
);
const revisionGuardMigrationSource = readFileSync(
  new URL(
    "../prisma/migrations/20260713_zz_class_month_plan_revision_state_guard/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

type PlanState = "open" | "frozen";

describe("ClassMonthPlan persistence contract", () => {
  it("declares one aggregate per class-month and immutable revision history", () => {
    assert.match(schemaSource, /model ClassMonthPlan\s*\{/);
    assert.match(schemaSource, /@@unique\(\[classId, billingMonth\]\)/);
    assert.match(schemaSource, /model ClassMonthPlanRevision\s*\{/);
    assert.match(schemaSource, /@@unique\(\[planId, revision\]\)/);
    assert.match(migrationSource, /ON DELETE RESTRICT/);
    assert.match(migrationSource, /BEFORE UPDATE OR DELETE ON "class_month_plan_revisions"/);
  });

  it("adds legacy-safe month and session-date consistency checks", () => {
    assert.match(migrationSource, /class_sessions_billing_month_format_check[\s\S]*NOT VALID/);
    assert.match(migrationSource, /class_sessions_session_month_check[\s\S]*NOT VALID/);
    assert.match(migrationSource, /VALIDATE CONSTRAINT "class_sessions_billing_month_format_check"/);
    assert.match(migrationSource, /VALIDATE CONSTRAINT "class_sessions_session_month_check"/);
    assert.match(migrationSource, /IF NOT EXISTS[\s\S]*RAISE NOTICE/);
  });

  it("keeps applied migration history immutable and changes reopen policy in a follow-up", () => {
    assert.ok(
      "20260713_zz_class_month_plan_revision_state_guard" > "20260713_class_month_plans",
      "the revision guard follow-up must sort after the applied base migration",
    );
    assert.match(
      migrationSource,
      /OLD\."state" = 'frozen'[\s\S]*cannot transition from frozen to open/,
    );
    assert.match(
      revisionGuardMigrationSource,
      /NEW\."state" IS DISTINCT FROM OLD\."state"[\s\S]*NEW\."revision" <= OLD\."revision"/,
    );
    assert.doesNotMatch(
      revisionGuardMigrationSource,
      /cannot transition from frozen to open/,
    );
  });
});

function createPlanDb(initial: { revision: number; state: PlanState }) {
  const plan = {
    id: "plan-1",
    classId: "class-1",
    billingMonth: "2026-06",
    revision: initial.revision,
    state: initial.state,
    createdById: "admin-1",
    updatedById: "admin-1",
    frozenById: null as string | null,
    frozenAt: null as Date | null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
  };
  const revisions: any[] = [];
  let transactions = 0;

  const tx = {
    classMonthPlan: {
      updateMany: async ({ where, data }: any) => {
        if (
          where.id !== plan.id ||
          where.revision !== plan.revision ||
          where.state !== plan.state
        ) {
          return { count: 0 };
        }
        plan.revision += data.revision.increment;
        plan.state = data.state || plan.state;
        plan.updatedById = data.updatedById ?? plan.updatedById;
        plan.frozenById = data.frozenById ?? plan.frozenById;
        plan.frozenAt = data.frozenAt ?? plan.frozenAt;
        plan.updatedAt = data.updatedAt ?? plan.updatedAt;
        return { count: 1 };
      },
      findUnique: async () => ({ ...plan }),
    },
    classMonthPlanRevision: {
      create: async ({ data }: any) => {
        revisions.push(data);
        return data;
      },
    },
  };
  const db = {
    $transaction: async (callback: (client: typeof tx) => unknown) => {
      transactions += 1;
      return callback(tx);
    },
  };
  return { db, plan, revisions, transactionCount: () => transactions };
}

describe("ClassMonthPlan optimistic revision helper", () => {
  it("orders global roster locks before sorted class-month locks", () => {
    assert.deepEqual(
      classMonthRosterAdvisoryLockKeys(
        ["class-b", "class-a", "class-b"],
        ["2026-07", "2026-06"],
      ),
      [
        "attendance-roster:global:class-a",
        "attendance-roster:global:class-b",
        "attendance-roster:2026-06:class-a",
        "attendance-roster:2026-06:class-b",
        "attendance-roster:2026-07:class-a",
        "attendance-roster:2026-07:class-b",
      ],
    );
  });

  it("takes global and month roster locks before class-session plan reads", async () => {
    const calls: string[] = [];
    const tx = {
      $queryRaw: async ({ strings, values }: any) => {
        calls.push(`lock:${values.join(",")}`);
        calls.push(
          `ordered:${strings.join(" ").includes("WITH ORDINALITY") && strings.join(" ").includes("ORDER BY lock_position")}`,
        );
      },
    };
    const db = {
      $transaction: async (work: (client: typeof tx) => Promise<string>) => {
        calls.push("transaction");
        return work(tx);
      },
    };

    const result = await withClassMonthPlanRosterWrite(
      db,
      "class-1",
      "2026-06",
      async () => {
        calls.push("read-class-plan");
        return "ok";
      },
    );

    assert.equal(result, "ok");
    assert.deepEqual(calls, [
      "transaction",
      "lock:attendance-roster:global:class-1,attendance-roster:2026-06:class-1",
      "ordered:true",
      "read-class-plan",
    ]);
  });

  it("maps only open periods to an open plan", () => {
    assert.equal(mapAttendancePeriodStatusToPlanState("open"), "open");
    for (const status of ["submitted", "approved", "locked"] as const) {
      assert.equal(mapAttendancePeriodStatusToPlanState(status), "frozen");
    }
  });

  it("bumps revisions monotonically and snapshots each revision in its transaction", async () => {
    const fixture = createPlanDb({ revision: 1, state: "open" });

    const second = await bumpClassMonthPlan(fixture.db as any, {
      planId: "plan-1",
      expectedRevision: 1,
      actorId: "admin-2",
      reason: "session plan changed",
      snapshot: { session_ids: ["session-1"] },
    });
    const third = await bumpClassMonthPlan(fixture.db as any, {
      planId: "plan-1",
      expectedRevision: 2,
      actorId: "admin-2",
      reason: "another session added",
      snapshot: { session_ids: ["session-1", "session-2"] },
    });

    assert.equal(second.revision, 2);
    assert.equal(third.revision, 3);
    assert.deepEqual(fixture.revisions.map((row) => row.revision), [2, 3]);
    assert.equal(fixture.transactionCount(), 2);
  });

  it("rejects a stale expected revision without writing history", async () => {
    const fixture = createPlanDb({ revision: 3, state: "open" });

    await assert.rejects(
      bumpClassMonthPlan(fixture.db as any, {
        planId: "plan-1",
        expectedRevision: 2,
        actorId: "admin-2",
        snapshot: {},
      }),
      (error: unknown) =>
        error instanceof ClassMonthPlanError &&
        error.code === "CLASS_MONTH_PLAN_REVISION_CONFLICT" &&
        error.statusCode === 409,
    );
    assert.equal(fixture.revisions.length, 0);
  });

  it("rejects bump and freeze mutations after the plan is frozen", async () => {
    const fixture = createPlanDb({ revision: 4, state: "frozen" });

    for (const mutate of [bumpClassMonthPlan, freezeClassMonthPlan]) {
      await assert.rejects(
        mutate(fixture.db as any, {
          planId: "plan-1",
          expectedRevision: 4,
          actorId: "admin-2",
          snapshot: {},
        }),
        (error: unknown) =>
          error instanceof ClassMonthPlanError &&
          error.code === "CLASS_MONTH_PLAN_FROZEN",
      );
    }
    assert.equal(fixture.revisions.length, 0);
  });
});

describe("ClassMonthPlan backfill", () => {
  it("is dry-run by default, unions sessions and periods, and performs no writes", async () => {
    let transactions = 0;
    let writes = 0;
    const db = {
      classSession: {
        findMany: async () => [
          { classId: "class-1", billingMonth: "2026-06" },
          { classId: "class-1", billingMonth: "2026-06" },
          { classId: "class-2", billingMonth: "2026-07" },
        ],
      },
      attendancePeriod: {
        findMany: async () => [
          { classId: "class-1", periodMonth: "2026-06", status: "submitted" },
          { classId: "class-3", periodMonth: "2026-06", status: "open" },
        ],
      },
      classMonthPlan: {
        findMany: async () => [{ classId: "class-2", billingMonth: "2026-07" }],
        upsert: async () => {
          writes += 1;
        },
      },
      $transaction: async () => {
        transactions += 1;
      },
    };

    const result = await runClassMonthPlanBackfill(db as any, []);

    assert.equal(result.mode, "dry-run");
    assert.equal(result.candidates_total, 3);
    assert.equal(result.plans_to_create, 2);
    assert.deepEqual(result.candidates, [
      { class_id: "class-1", billing_month: "2026-06", state: "frozen" },
      { class_id: "class-3", billing_month: "2026-06", state: "open" },
    ]);
    assert.equal(transactions, 0);
    assert.equal(writes, 0);
  });

  it("aborts the apply transaction when protected finance changes", async () => {
    let fingerprintReads = 0;
    let rolledBack = false;
    const tx = {
      $queryRaw: async () => [{
        fingerprint: ++fingerprintReads === 1 ? "before" : "after",
        row_count: "4",
      }],
      classMonthPlan: { upsert: async () => ({ id: "plan-1" }) },
    };
    const db = {
      classSession: {
        findMany: async () => [{ classId: "class-1", billingMonth: "2026-06" }],
      },
      attendancePeriod: { findMany: async () => [] },
      classMonthPlan: { findMany: async () => [] },
      $transaction: async (callback: (client: typeof tx) => unknown) => {
        try {
          return await callback(tx);
        } catch (error) {
          rolledBack = true;
          throw error;
        }
      },
    };

    await assert.rejects(
      runClassMonthPlanBackfill(db as any, ["--apply"]),
      /Protected finance fingerprint changed during backfill/,
    );
    assert.equal(fingerprintReads, 2);
    assert.equal(rolledBack, true);
  });
});
