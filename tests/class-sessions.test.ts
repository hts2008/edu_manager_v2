import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  ClassSessionError,
  assertNoAttendanceForRemovedSessions,
  assertUniqueMakeupReplacements,
  assertMonthMutable,
  assertRowVersions,
  billingMonthForDate,
  buildMonthPlan,
  generateFixedWeekdayDates,
  validateMakeupDate,
} from "../lib/class-sessions.js";

describe("class session month plans", () => {
  it("generates fixed weekdays deterministically inside the requested month", () => {
    assert.deepEqual(generateFixedWeekdayDates("2026-07", [1, 3]), [
      "2026-07-01", "2026-07-06", "2026-07-08", "2026-07-13",
      "2026-07-15", "2026-07-20", "2026-07-22", "2026-07-27",
      "2026-07-29",
    ]);
  });

  it("accepts explicit flexible dates and rejects dates outside the month", () => {
    const plan = buildMonthPlan({
      class_id: "class-1",
      month: "2026-07",
      schedule_mode: "flexible",
      dates: ["2026-07-20", "2026-07-03", "2026-07-03"],
    });
    assert.deepEqual(plan.dates, ["2026-07-03", "2026-07-20"]);
    assert.throws(
      () => buildMonthPlan({
        class_id: "class-1",
        month: "2026-07",
        schedule_mode: "flexible",
        dates: ["2026-08-01"],
      }),
      (error: unknown) => error instanceof ClassSessionError && error.code === "SESSION_DATE_OUTSIDE_MONTH",
    );
  });

  it("treats sessions_per_week as a warning and never as a generated denominator", () => {
    const plan = buildMonthPlan({
      class_id: "class-1",
      month: "2026-07",
      schedule_mode: "fixed_weekdays",
      weekdays: [1, 3],
      sessions_per_week: 3,
    });
    assert.equal(plan.dates.length, 9);
    assert.deepEqual(plan.warnings, [{
      code: "SESSIONS_PER_WEEK_MISMATCH",
      expected: 3,
      actual: 2,
    }]);
  });

  it("requires makeup sessions to remain in the original session month", () => {
    assert.doesNotThrow(() => validateMakeupDate("2026-07-05", "2026-07-27"));
    assert.throws(
      () => validateMakeupDate("2026-07-31", "2026-08-01"),
      (error: unknown) => error instanceof ClassSessionError && error.code === "MAKEUP_MUST_BE_SAME_MONTH",
    );
  });

  it("derives billing_month and rejects a conflicting supplied month", () => {
    assert.equal(billingMonthForDate("2026-07-03"), "2026-07");
    assert.throws(
      () => billingMonthForDate("2026-07-03", "2026-08"),
      (error: unknown) => error instanceof ClassSessionError && error.code === "BILLING_MONTH_MISMATCH",
    );
  });

  it("rejects protected periods through a test-first database mock", async () => {
    const db = {
      attendancePeriod: {
        findFirst: async () => ({ id: "period-1", status: "locked" }),
      },
    };
    await assert.rejects(
      () => assertMonthMutable(db, "class-1", "2026-07"),
      (error: unknown) => error instanceof ClassSessionError && error.code === "SESSION_PLAN_PROTECTED",
    );
  });

  it("treats submitted, approved, and locked attendance periods as immutable", async () => {
    for (const status of ["submitted", "approved", "locked"]) {
      const db = { attendancePeriod: { findFirst: async () => ({ id: "period-1", status }) } };
      await assert.rejects(
        () => assertMonthMutable(db, "class-1", "2026-07"),
        (error: unknown) => error instanceof ClassSessionError && error.code === "SESSION_PLAN_PROTECTED",
      );
    }
  });

  it("rejects deleting a class session that has attendance", async () => {
    const db = { attendance: { count: async () => 1 } };
    await assert.rejects(
      () => assertNoAttendanceForRemovedSessions(db, ["session-1"]),
      (error: unknown) => error instanceof ClassSessionError && error.code === "SESSION_HAS_ATTENDANCE",
    );
  });

  it("rejects duplicate makeup replacements within a month", () => {
    assert.throws(
      () => assertUniqueMakeupReplacements(
        [{ id: "makeup-1", kind: "makeup", replacementForId: "regular-1" }],
        [{ kind: "makeup", replacement_for_id: "regular-1" }],
      ),
      (error: unknown) => error instanceof ClassSessionError && error.code === "DUPLICATE_MAKEUP_REPLACEMENT",
    );
    assert.throws(
      () => assertUniqueMakeupReplacements([], [
        { kind: "makeup", replacement_for_id: "regular-1" },
        { kind: "makeup", replacement_for_id: "regular-1" },
      ]),
      (error: unknown) => error instanceof ClassSessionError && error.code === "DUPLICATE_MAKEUP_REPLACEMENT",
    );
  });

  it("rejects any stale supplied row version even when other rows are current", () => {
    assert.throws(
      () => assertRowVersions(
        [{ id: "a", version: 4 }, { id: "b", version: 4 }],
        { a: 4, b: 3 },
      ),
      (error: unknown) => error instanceof ClassSessionError && error.code === "VERSION_CONFLICT",
    );
  });
});

describe("class session API contract", () => {
  const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("wires authenticated list, month-plan, and by-id routes", () => {
    const router = source("api/router.ts");
    const monthPlan = source("server/api/class-sessions/month-plan.ts");
    assert.match(router, /\["class-sessions", "month-plan"\], routes\.classSessionsMonthPlan/);
    assert.match(router, /\["class-sessions"\], routes\.classSessionsIndex/);
    assert.match(router, /routes\.classSessionById/);
    assert.match(monthPlan, /export default requireAuth\(handler\)/);
  });

  it("keeps the HTTP boundary snake_case and uses plan plus row versions", () => {
    const monthPlan = source("server/api/class-sessions/month-plan.ts");
    const byId = source("server/api/class-sessions/[id].ts");
    assert.match(monthPlan, /expected_version/);
    assert.match(monthPlan, /row_versions/);
    assert.match(monthPlan, /billing_month/);
    assert.match(byId, /replacement_for_id/);
    assert.match(byId, /extra_fee_mode/);
  });
});
