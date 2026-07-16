import { pathToFileURL } from "node:url";
import prisma from "../lib/prisma.js";
import { loadPersistedScheduleSnapshot } from "../lib/class-month-schedule-snapshot.js";

export type ClassMonthPlanAuditInput = {
  classId: string;
  className: string;
  billingMonth: string;
  planState: "open" | "frozen";
  planRevision: number;
  scheduleDays: unknown;
  sessionsPerWeek: number | null;
  persistedExpectedSessions: number | null;
  regularSessionDates: string[];
  protectedFinanceRows: number;
};

export type ClassMonthPlanAuditIssue =
  | "REGULAR_SESSION_DATE_OUTSIDE_BILLING_MONTH"
  | "SYNTHETIC_FLEXIBLE_DENOMINATOR"
  | "EXPECTED_LEDGER_MISMATCH"
  | "MISSING_EXPECTED_SESSION_SNAPSHOT";

export type ClassMonthPlanAuditRow = {
  class_id: string;
  class_name: string;
  billing_month: string;
  state: "open" | "frozen";
  revision: number;
  schedule_strategy: "fixed_weekdays" | "flexible_dates" | "legacy_per_session";
  schedule_days: number[];
  sessions_per_week: number | null;
  persisted_expected_sessions: number | null;
  regular_sessions: number;
  regular_dates: string[];
  out_of_month_regular_dates: string[];
  protected_finance_rows: number;
  issues: ClassMonthPlanAuditIssue[];
  recommended_action:
    | "NONE"
    | "PUBLISH_EXPLICIT_MONTH_PLAN"
    | "REGENERATE_FIXED_MONTH_PLAN"
    | "REVIEW_IMMUTABLE_HISTORY";
  apply_eligible: boolean;
};

function normalizedDays(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number))]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((left, right) => left - right);
}

function strategyFor(input: ClassMonthPlanAuditInput) {
  const scheduleDays = normalizedDays(input.scheduleDays);
  if (scheduleDays.length > 0) return "fixed_weekdays" as const;
  if (Number(input.sessionsPerWeek) > 0) return "flexible_dates" as const;
  return "legacy_per_session" as const;
}

export function auditClassMonthPlanDenominators(
  inputs: ClassMonthPlanAuditInput[],
): ClassMonthPlanAuditRow[] {
  return inputs
    .map((input) => {
      const scheduleDays = normalizedDays(input.scheduleDays);
      const scheduleStrategy = strategyFor(input);
      const regularDates = [...new Set(input.regularSessionDates)].sort();
      const regularSessions = regularDates.length;
      const outOfMonthRegularDates = regularDates.filter(
        (date) => date.slice(0, 7) !== input.billingMonth,
      );
      const issues: ClassMonthPlanAuditIssue[] = [];

      if (outOfMonthRegularDates.length > 0) {
        issues.push("REGULAR_SESSION_DATE_OUTSIDE_BILLING_MONTH");
      }

      if (input.persistedExpectedSessions === null) {
        issues.push("MISSING_EXPECTED_SESSION_SNAPSHOT");
      } else if (input.persistedExpectedSessions !== regularSessions) {
        if (scheduleStrategy === "flexible_dates") {
          issues.push("SYNTHETIC_FLEXIBLE_DENOMINATOR");
        }
        issues.push("EXPECTED_LEDGER_MISMATCH");
      }

      const immutable = input.planState === "frozen" || input.protectedFinanceRows > 0;
      const applyEligible = issues.length > 0 && !immutable;
      const recommendedAction = issues.length === 0
        ? "NONE"
        : immutable
          ? "REVIEW_IMMUTABLE_HISTORY"
          : scheduleStrategy === "flexible_dates"
            ? "PUBLISH_EXPLICIT_MONTH_PLAN"
            : "REGENERATE_FIXED_MONTH_PLAN";

      return {
        class_id: input.classId,
        class_name: input.className,
        billing_month: input.billingMonth,
        state: input.planState,
        revision: input.planRevision,
        schedule_strategy: scheduleStrategy,
        schedule_days: scheduleDays,
        sessions_per_week: input.sessionsPerWeek,
        persisted_expected_sessions: input.persistedExpectedSessions,
        regular_sessions: regularSessions,
        regular_dates: regularDates,
        out_of_month_regular_dates: outOfMonthRegularDates,
        protected_finance_rows: input.protectedFinanceRows,
        issues,
        recommended_action: recommendedAction,
        apply_eligible: applyEligible,
      } satisfies ClassMonthPlanAuditRow;
    })
    .sort(
      (left, right) =>
        left.billing_month.localeCompare(right.billing_month) ||
        left.class_name.localeCompare(right.class_name) ||
        left.class_id.localeCompare(right.class_id),
    );
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function monthDateRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export async function readClassMonthPlanAuditInputs(db: any) {
  const plans = await db.classMonthPlan.findMany({
    select: {
      id: true,
      classId: true,
      billingMonth: true,
      state: true,
      revision: true,
      class: {
        select: {
          className: true,
          scheduleDays: true,
          sessionsPerWeek: true,
        },
      },
    },
    orderBy: [{ billingMonth: "asc" }, { classId: "asc" }],
  });

  const inputs: ClassMonthPlanAuditInput[] = [];
  for (const plan of plans) {
    const range = monthDateRange(plan.billingMonth);
    const [snapshot, sessions, protectedLineRows, protectedAggregateRows] = await Promise.all([
      loadPersistedScheduleSnapshot(db, plan),
      db.classSession.findMany({
        where: {
          classId: plan.classId,
          billingMonth: plan.billingMonth,
          kind: "regular",
        },
        select: { sessionDate: true },
        orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
      }),
      db.monthlyFeeLine.count({
        where: {
          classId: plan.classId,
          month: plan.billingMonth,
          OR: [
            { status: { in: ["confirmed", "paid"] } },
            { receiptId: { not: null } },
            { paidAt: { not: null } },
            { receiptLines: { some: {} } },
            { monthlyFee: { status: { in: ["confirmed", "paid"] } } },
            { monthlyFee: { receiptId: { not: null } } },
            { monthlyFee: { paidAt: { not: null } } },
          ],
        },
      }),
      db.monthlyFee.count({
        where: {
          month: plan.billingMonth,
          OR: [
            { status: { in: ["confirmed", "paid"] } },
            { receiptId: { not: null } },
            { paidAt: { not: null } },
          ],
          student: {
            OR: [
              {
                enrollmentPeriods: {
                  some: {
                    classId: plan.classId,
                    startedAt: { lt: range.end },
                    OR: [{ endedAt: null }, { endedAt: { gt: range.start } }],
                  },
                },
              },
              {
                studentClasses: {
                  some: {
                    classId: plan.classId,
                    status: "active",
                    enrollmentDate: { lt: range.end },
                  },
                },
              },
            ],
          },
        },
      }),
    ]);
    inputs.push({
      classId: plan.classId,
      className: plan.class.className,
      billingMonth: plan.billingMonth,
      planState: plan.state,
      planRevision: plan.revision,
      scheduleDays: snapshot?.schedule_days ?? plan.class.scheduleDays,
      sessionsPerWeek: snapshot
        ? snapshot.sessions_per_week
        : plan.class.sessionsPerWeek,
      persistedExpectedSessions: snapshot?.expected_regular_sessions ?? null,
      regularSessionDates: sessions.map((session: { sessionDate: Date }) =>
        dateKey(session.sessionDate)),
      protectedFinanceRows: protectedLineRows + protectedAggregateRows,
    });
  }
  return inputs;
}

export async function runClassMonthPlanDenominatorAudit(db: any = prisma) {
  const rows = auditClassMonthPlanDenominators(
    await readClassMonthPlanAuditInputs(db),
  );
  const candidates = rows.filter((row) => row.issues.length > 0);
  return {
    mode: "dry-run" as const,
    total_plans: rows.length,
    candidates_total: candidates.length,
    apply_eligible_total: candidates.filter((row) => row.apply_eligible).length,
    immutable_review_total: candidates.filter(
      (row) => row.recommended_action === "REVIEW_IMMUTABLE_HISTORY",
    ).length,
    candidates,
  };
}

async function main() {
  try {
    console.log(JSON.stringify(await runClassMonthPlanDenominatorAudit(), null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
