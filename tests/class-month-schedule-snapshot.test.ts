import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ensureClassMonthPlan } from "../lib/class-month-plan.js";
import {
  loadPersistedScheduleSnapshot,
  scheduleSnapshotForWrite,
  scheduleSnapshotFromRevision,
} from "../lib/class-month-schedule-snapshot.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("class month schedule snapshot", () => {
  it("reads the immutable denominator from a legacy V1 backfill snapshot", () => {
    assert.deepEqual(
      scheduleSnapshotFromRevision({
        schema_version: 1,
        source: "class_month_plan_backfill",
        class_session_count: 8,
      }),
      {
        schedule_days: [],
        sessions_per_week: null,
        expected_regular_sessions: 8,
      },
    );
  });

  it("finds a legacy backfill denominator behind a metadata-only latest revision", async () => {
    let historyReads = 0;
    const db = {
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
                schema_version: 1,
                source: "class_month_plan_backfill",
                class_session_count: 8,
              },
            },
          ];
        },
      },
    };

    const snapshot = await loadPersistedScheduleSnapshot(
      db as any,
      { id: "legacy-plan", revision: 2 },
    );

    assert.equal(historyReads, 1);
    assert.deepEqual(snapshot, {
      schedule_days: [],
      sessions_per_week: null,
      expected_regular_sessions: 8,
    });
  });

  it("persists the immutable schedule denominator when attendance submit creates a plan", async () => {
    let upsertData: any;
    const db = {
      classMonthPlan: {
        findUnique: async () => null,
        upsert: async ({ create }: any) => {
          upsertData = create;
          return {
            id: "plan-1",
            classId: create.classId,
            billingMonth: create.billingMonth,
            state: create.state,
            revision: create.revision,
          };
        },
      },
    };
    const snapshot = await scheduleSnapshotForWrite(
      db as any,
      "class-1",
      "2026-06",
      { scheduleDays: ["T2", "T4"], sessionsPerWeek: 2 },
    );

    assert.deepEqual(snapshot, {
      schedule_days: [1, 3],
      sessions_per_week: 2,
      expected_regular_sessions: 9,
    });

    await ensureClassMonthPlan(db as any, {
      classId: "class-1",
      billingMonth: "2026-06",
      attendancePeriodStatus: "open",
      actorId: "teacher-1",
      snapshot: { attendance_period_id: "period-1", ...snapshot },
    });
    assert.deepEqual(upsertData.revisions.create.snapshot.payload, {
      attendance_period_id: "period-1",
      schedule_days: [1, 3],
      sessions_per_week: 2,
      expected_regular_sessions: 9,
    });

    const endpoint = source("server/api/attendance-periods/[id]/index.ts");
    const submitBranch = endpoint.slice(
      endpoint.indexOf('case "submit"'),
      endpoint.indexOf('case "approve"'),
    );
    assert.match(submitBranch, /scheduleSnapshotForWrite/);
    assert.equal(
      submitBranch.match(/\.\.\.scheduleSnapshot/g)?.length,
      2,
      "ensure and freeze revisions must both carry the immutable schedule snapshot",
    );
  });
});
