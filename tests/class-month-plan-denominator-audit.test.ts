import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  auditClassMonthPlanDenominators,
  readClassMonthPlanAuditInputs,
  type ClassMonthPlanAuditInput,
} from "../scripts/class-month-plan-denominator-audit.js";

function input(overrides: Partial<ClassMonthPlanAuditInput> = {}): ClassMonthPlanAuditInput {
  return {
    classId: "class-1",
    className: "Flexible English",
    billingMonth: "2026-06",
    planState: "open",
    planRevision: 5,
    scheduleDays: [],
    sessionsPerWeek: 2,
    persistedExpectedSessions: 10,
    regularSessionDates: [
      "2026-06-03",
      "2026-06-05",
      "2026-06-10",
      "2026-06-12",
      "2026-06-17",
      "2026-06-19",
      "2026-06-24",
      "2026-06-26",
    ],
    protectedFinanceRows: 0,
    ...overrides,
  };
}

describe("class-month plan denominator audit", () => {
  it("flags a synthetic flexible denominator without treating the week boundary as month ownership", () => {
    const [result] = auditClassMonthPlanDenominators([input()]);

    assert.equal(result.schedule_strategy, "flexible_dates");
    assert.equal(result.regular_sessions, 8);
    assert.equal(result.persisted_expected_sessions, 10);
    assert.deepEqual(result.issues, [
      "SYNTHETIC_FLEXIBLE_DENOMINATOR",
      "EXPECTED_LEDGER_MISMATCH",
    ]);
    assert.equal(result.recommended_action, "PUBLISH_EXPLICIT_MONTH_PLAN");
    assert.equal(result.apply_eligible, true);
  });

  it("does not propose mutation for frozen or finance-protected plans", () => {
    const results = auditClassMonthPlanDenominators([
      input({ planState: "frozen" }),
      input({ classId: "class-2", protectedFinanceRows: 1 }),
    ]);

    assert.equal(results[0].apply_eligible, false);
    assert.equal(results[0].recommended_action, "REVIEW_IMMUTABLE_HISTORY");
    assert.equal(results[1].apply_eligible, false);
    assert.equal(results[1].recommended_action, "REVIEW_IMMUTABLE_HISTORY");
  });

  it("accepts an explicit flexible ledger when the persisted count matches", () => {
    const [result] = auditClassMonthPlanDenominators([
      input({ persistedExpectedSessions: 8 }),
    ]);

    assert.deepEqual(result.issues, []);
    assert.equal(result.recommended_action, "NONE");
    assert.equal(result.apply_eligible, false);
  });

  it("flags a regular session whose billing month matches but session date is outside the plan month", async () => {
    let sessionWhere: any;
    const db = {
      classMonthPlan: {
        findMany: async () => [{
          id: "plan-1",
          classId: "class-1",
          billingMonth: "2026-06",
          state: "open",
          revision: 1,
          class: {
            className: "Flexible English",
            scheduleDays: [],
            sessionsPerWeek: 2,
          },
        }],
      },
      classMonthPlanRevision: {
        findUnique: async () => ({
          snapshot: {
            schedule_days: [],
            sessions_per_week: 2,
            expected_regular_sessions: 2,
          },
        }),
      },
      classSession: {
        findMany: async ({ where }: any) => {
          sessionWhere = where;
          return [
            { sessionDate: new Date("2026-06-03T00:00:00.000Z") },
            { sessionDate: new Date("2026-07-01T00:00:00.000Z") },
          ];
        },
      },
      monthlyFeeLine: { count: async () => 0 },
      monthlyFee: { count: async () => 0 },
    };

    const rows = auditClassMonthPlanDenominators(
      await readClassMonthPlanAuditInputs(db),
    );

    assert.equal(sessionWhere.billingMonth, "2026-06");
    assert.deepEqual(rows[0].out_of_month_regular_dates, ["2026-07-01"]);
    assert.deepEqual(rows[0].issues, [
      "REGULAR_SESSION_DATE_OUTSIDE_BILLING_MONTH",
    ]);
    assert.equal(rows[0].apply_eligible, true);
  });

  it("reports missing snapshot evidence without inventing a denominator", () => {
    const [result] = auditClassMonthPlanDenominators([
      input({ persistedExpectedSessions: null }),
    ]);

    assert.deepEqual(result.issues, ["MISSING_EXPECTED_SESSION_SNAPSHOT"]);
    assert.equal(result.persisted_expected_sessions, null);
    assert.equal(result.recommended_action, "PUBLISH_EXPLICIT_MONTH_PLAN");
  });

  it("classifies fixed weekday plans independently from flexible cadence", () => {
    const [result] = auditClassMonthPlanDenominators([
      input({
        scheduleDays: [3, 5],
        regularSessionDates: [
          "2026-06-03",
          "2026-06-05",
          "2026-06-10",
          "2026-06-12",
          "2026-06-17",
          "2026-06-19",
          "2026-06-24",
          "2026-06-26",
        ],
        persistedExpectedSessions: 8,
      }),
    ]);

    assert.equal(result.schedule_strategy, "fixed_weekdays");
    assert.deepEqual(result.issues, []);
  });

  it("protects plans linked to parent fee state, receipts, or payment evidence", async () => {
    let financeWhere: any;
    let aggregateFinanceWhere: any;
    const db = {
      classMonthPlan: {
        findMany: async () => [{
          id: "plan-1",
          classId: "class-1",
          billingMonth: "2026-06",
          state: "open",
          revision: 2,
          class: {
            className: "Flexible English",
            scheduleDays: [],
            sessionsPerWeek: 2,
          },
        }],
      },
      classMonthPlanRevision: {
        findUnique: async () => ({
          snapshot: {
            schedule_days: [],
            sessions_per_week: 2,
            expected_regular_sessions: 10,
          },
        }),
      },
      classSession: {
        findMany: async () => [
          { sessionDate: new Date("2026-06-03T00:00:00.000Z") },
        ],
      },
      monthlyFeeLine: {
        count: async ({ where }: any) => {
          financeWhere = where;
          return 1;
        },
      },
      monthlyFee: {
        count: async ({ where }: any) => {
          aggregateFinanceWhere = where;
          return 1;
        },
        update: async () => assert.fail("audit must remain read-only"),
      },
    };

    const [auditInput] = await readClassMonthPlanAuditInputs(db);
    const [result] = auditClassMonthPlanDenominators([auditInput]);

    assert.deepEqual(financeWhere.OR, [
      { status: { in: ["confirmed", "paid"] } },
      { receiptId: { not: null } },
      { paidAt: { not: null } },
      { receiptLines: { some: {} } },
      { monthlyFee: { status: { in: ["confirmed", "paid"] } } },
      { monthlyFee: { receiptId: { not: null } } },
      { monthlyFee: { paidAt: { not: null } } },
    ]);
    assert.equal(aggregateFinanceWhere.month, "2026-06");
    assert.deepEqual(aggregateFinanceWhere.OR, [
      { status: { in: ["confirmed", "paid"] } },
      { receiptId: { not: null } },
      { paidAt: { not: null } },
    ]);
    assert.equal(result.protected_finance_rows, 2);
    assert.equal(result.apply_eligible, false);
    assert.equal(result.recommended_action, "REVIEW_IMMUTABLE_HISTORY");
  });

  it("classifies historical plans from revision schedule metadata", async () => {
    const db = {
      classMonthPlan: {
        findMany: async () => [{
          id: "plan-1",
          classId: "class-1",
          billingMonth: "2026-06",
          state: "open",
          revision: 3,
          class: {
            className: "Changed to fixed weekdays",
            scheduleDays: [1, 3, 5],
            sessionsPerWeek: null,
          },
        }],
      },
      classMonthPlanRevision: {
        findUnique: async () => ({
          snapshot: {
            schedule_days: [],
            sessions_per_week: 2,
            expected_regular_sessions: 10,
          },
        }),
      },
      classSession: {
        findMany: async () => [
          { sessionDate: new Date("2026-06-03T00:00:00.000Z") },
        ],
      },
      monthlyFeeLine: {
        count: async () => 0,
      },
      monthlyFee: {
        count: async () => 0,
      },
      classMonthPlanRevisionMutation: {
        update: async () => assert.fail("audit must remain read-only"),
      },
    };

    const rows = auditClassMonthPlanDenominators(
      await readClassMonthPlanAuditInputs(db),
    );

    assert.equal(rows[0].schedule_strategy, "flexible_dates");
    assert.deepEqual(rows[0].schedule_days, []);
    assert.equal(rows[0].sessions_per_week, 2);
    assert.deepEqual(rows[0].issues, [
      "SYNTHETIC_FLEXIBLE_DENOMINATOR",
      "EXPECTED_LEDGER_MISMATCH",
    ]);
  });

  it("preserves a null historical cadence instead of using the current class cadence", async () => {
    const db = {
      classMonthPlan: {
        findMany: async () => [{
          id: "plan-legacy",
          classId: "class-legacy",
          billingMonth: "2026-05",
          state: "open",
          revision: 1,
          class: {
            className: "Now flexible",
            scheduleDays: [],
            sessionsPerWeek: 3,
          },
        }],
      },
      classMonthPlanRevision: {
        findUnique: async () => ({
          snapshot: {
            schedule_days: [],
            sessions_per_week: null,
            expected_regular_sessions: 2,
          },
        }),
      },
      classSession: {
        findMany: async () => [
          { sessionDate: new Date("2026-05-01T00:00:00.000Z") },
        ],
      },
      monthlyFeeLine: {
        count: async () => 0,
      },
      monthlyFee: {
        count: async () => 0,
      },
    };

    const rows = auditClassMonthPlanDenominators(
      await readClassMonthPlanAuditInputs(db),
    );

    assert.equal(rows[0].schedule_strategy, "legacy_per_session");
    assert.equal(rows[0].sessions_per_week, null);
    assert.deepEqual(rows[0].issues, ["EXPECTED_LEDGER_MISMATCH"]);
  });
});
