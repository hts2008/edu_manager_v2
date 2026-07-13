import { pathToFileURL } from "node:url";
import { Prisma } from "@prisma/client";
import {
  mapAttendancePeriodStatusToPlanState,
  type AttendancePeriodPlanStatus,
  type ClassMonthPlanState,
} from "../lib/class-month-plan.js";
import prisma from "../lib/prisma.js";

type Candidate = {
  classId: string;
  billingMonth: string;
  state: ClassMonthPlanState;
  sessionCount: number;
  periodStatuses: AttendancePeriodPlanStatus[];
};

export type ClassMonthPlanBackfillResult = {
  mode: "dry-run" | "apply";
  candidates_total: number;
  existing_plans: number;
  plans_to_create: number;
  plans_created: number;
  candidates: Array<{
    class_id: string;
    billing_month: string;
    state: ClassMonthPlanState;
  }>;
  protected_finance_fingerprint: string;
  protected_finance_rows: string;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function assertBillingMonth(value: string) {
  if (!MONTH_PATTERN.test(value)) {
    throw new Error(`Invalid billing month in source data: ${value}`);
  }
}

function candidateKey(classId: string, billingMonth: string) {
  return `${classId}\u0000${billingMonth}`;
}

function buildCandidates(
  sessions: Array<{ classId: string; billingMonth: string }>,
  periods: Array<{
    classId: string;
    periodMonth: string;
    status: AttendancePeriodPlanStatus;
  }>,
) {
  const candidates = new Map<
    string,
    {
      classId: string;
      billingMonth: string;
      sessionCount: number;
      periodStatuses: Set<AttendancePeriodPlanStatus>;
    }
  >();

  const get = (classId: string, billingMonth: string) => {
    assertBillingMonth(billingMonth);
    const key = candidateKey(classId, billingMonth);
    const existing = candidates.get(key);
    if (existing) return existing;
    const created = {
      classId,
      billingMonth,
      sessionCount: 0,
      periodStatuses: new Set<AttendancePeriodPlanStatus>(),
    };
    candidates.set(key, created);
    return created;
  };

  for (const session of sessions) {
    get(session.classId, session.billingMonth).sessionCount += 1;
  }
  for (const period of periods) {
    get(period.classId, period.periodMonth).periodStatuses.add(period.status);
  }

  return [...candidates.values()]
    .map((candidate): Candidate => {
      const periodStatuses = [...candidate.periodStatuses].sort();
      const state = periodStatuses.some(
        (status) => mapAttendancePeriodStatusToPlanState(status) === "frozen",
      )
        ? "frozen"
        : "open";
      return { ...candidate, periodStatuses, state };
    })
    .sort(
      (left, right) =>
        left.classId.localeCompare(right.classId) ||
        left.billingMonth.localeCompare(right.billingMonth),
    );
}

export async function readProtectedFinanceFingerprint(db: any) {
  if (typeof db?.$queryRaw !== "function") {
    return { fingerprint: "unavailable", row_count: "0" };
  }
  const rows = await db.$queryRaw(Prisma.sql`
    WITH protected_fee_ids AS (
      SELECT mf."id"
      FROM "monthly_fees" mf
      WHERE mf."status"::text IN ('confirmed', 'paid')
        OR mf."receipt_id" IS NOT NULL
        OR mf."paid_at" IS NOT NULL
      UNION
      SELECT DISTINCT mfl."monthly_fee_id"
      FROM "monthly_fee_lines" mfl
      LEFT JOIN "receipt_lines" rl ON rl."monthly_fee_line_id" = mfl."id"
      WHERE mfl."status"::text IN ('confirmed', 'paid')
        OR mfl."receipt_id" IS NOT NULL
        OR mfl."paid_at" IS NOT NULL
        OR rl."id" IS NOT NULL
    ),
    protected_line_ids AS (
      SELECT mfl."id"
      FROM "monthly_fee_lines" mfl
      LEFT JOIN "receipt_lines" rl ON rl."monthly_fee_line_id" = mfl."id"
      WHERE mfl."monthly_fee_id" IN (SELECT "id" FROM protected_fee_ids)
        OR mfl."status"::text IN ('confirmed', 'paid')
        OR mfl."receipt_id" IS NOT NULL
        OR mfl."paid_at" IS NOT NULL
        OR rl."id" IS NOT NULL
    ),
    protected_receipt_ids AS (
      SELECT mf."receipt_id" AS "id"
      FROM "monthly_fees" mf
      WHERE mf."id" IN (SELECT "id" FROM protected_fee_ids)
        AND mf."receipt_id" IS NOT NULL
      UNION
      SELECT mfl."receipt_id"
      FROM "monthly_fee_lines" mfl
      WHERE mfl."id" IN (SELECT "id" FROM protected_line_ids)
        AND mfl."receipt_id" IS NOT NULL
      UNION
      SELECT rl."receipt_id"
      FROM "receipt_lines" rl
      WHERE rl."monthly_fee_line_id" IN (SELECT "id" FROM protected_line_ids)
    ),
    protected_rows AS (
      SELECT 'fee:' || mf."id" AS "row_key", to_jsonb(mf)::text AS "payload"
      FROM "monthly_fees" mf
      WHERE mf."id" IN (SELECT "id" FROM protected_fee_ids)
      UNION ALL
      SELECT 'line:' || mfl."id", to_jsonb(mfl)::text
      FROM "monthly_fee_lines" mfl
      WHERE mfl."id" IN (SELECT "id" FROM protected_line_ids)
      UNION ALL
      SELECT 'receipt_line:' || rl."id", to_jsonb(rl)::text
      FROM "receipt_lines" rl
      WHERE rl."monthly_fee_line_id" IN (SELECT "id" FROM protected_line_ids)
      UNION ALL
      SELECT 'receipt:' || r."id", to_jsonb(r)::text
      FROM "receipts" r
      WHERE r."id" IN (SELECT "id" FROM protected_receipt_ids)
    )
    SELECT
      md5(COALESCE(string_agg("row_key" || ':' || "payload", '|' ORDER BY "row_key"), 'empty')) AS "fingerprint",
      COUNT(*)::text AS "row_count"
    FROM protected_rows
  `) as Array<{ fingerprint: string; row_count: string }>;
  return rows[0] || { fingerprint: "d41d8cd98f00b204e9800998ecf8427e", row_count: "0" };
}

export async function runClassMonthPlanBackfill(
  db: any,
  args: string[] = process.argv.slice(2),
): Promise<ClassMonthPlanBackfillResult> {
  const apply = args.includes("--apply");
  const [sessions, periods, existingPlans, finance] = await Promise.all([
    db.classSession.findMany({
      select: { classId: true, billingMonth: true },
      orderBy: [{ classId: "asc" }, { billingMonth: "asc" }],
    }),
    db.attendancePeriod.findMany({
      select: { classId: true, periodMonth: true, status: true },
      orderBy: [{ classId: "asc" }, { periodMonth: "asc" }],
    }),
    db.classMonthPlan.findMany({
      select: { classId: true, billingMonth: true },
    }),
    readProtectedFinanceFingerprint(db),
  ]);
  const allCandidates = buildCandidates(sessions, periods);
  const existingKeys = new Set(
    existingPlans.map((plan: { classId: string; billingMonth: string }) =>
      candidateKey(plan.classId, plan.billingMonth),
    ),
  );
  const missing = allCandidates.filter(
    (candidate) => !existingKeys.has(candidateKey(candidate.classId, candidate.billingMonth)),
  );
  const result: ClassMonthPlanBackfillResult = {
    mode: apply ? "apply" : "dry-run",
    candidates_total: allCandidates.length,
    existing_plans: existingPlans.length,
    plans_to_create: missing.length,
    plans_created: 0,
    candidates: missing.map((candidate) => ({
      class_id: candidate.classId,
      billing_month: candidate.billingMonth,
      state: candidate.state,
    })),
    protected_finance_fingerprint: finance.fingerprint,
    protected_finance_rows: finance.row_count,
  };

  if (!apply) return result;

  const applied = await db.$transaction(
    async (tx: any) => {
      const before = await readProtectedFinanceFingerprint(tx);
      if (before.fingerprint === "unavailable") {
        throw new Error("Protected finance fingerprint is unavailable; refusing backfill apply");
      }
      let created = 0;
      for (const candidate of missing) {
        const frozen = candidate.state === "frozen";
        await tx.classMonthPlan.upsert({
          where: {
            classId_billingMonth: {
              classId: candidate.classId,
              billingMonth: candidate.billingMonth,
            },
          },
          create: {
            classId: candidate.classId,
            billingMonth: candidate.billingMonth,
            state: candidate.state,
            revision: 1,
            frozenAt: frozen ? new Date() : null,
            revisions: {
              create: {
                revision: 1,
                state: candidate.state,
                eventType: "backfill",
                snapshot: {
                  schema_version: 1,
                  source: "class_month_plan_backfill",
                  class_id: candidate.classId,
                  billing_month: candidate.billingMonth,
                  state: candidate.state,
                  revision: 1,
                  class_session_count: candidate.sessionCount,
                  attendance_period_statuses: candidate.periodStatuses,
                },
              },
            },
          },
          update: {},
        });
        created += 1;
      }
      const after = await readProtectedFinanceFingerprint(tx);
      if (before.fingerprint !== after.fingerprint || before.row_count !== after.row_count) {
        throw new Error(
          `Protected finance fingerprint changed during backfill: ${before.fingerprint}/${before.row_count} -> ${after.fingerprint}/${after.row_count}`,
        );
      }
      return { created, fingerprint: after.fingerprint, rowCount: after.row_count };
    },
    { isolationLevel: "ReadCommitted", maxWait: 5_000, timeout: 60_000 },
  );

  result.plans_created = applied.created;
  result.protected_finance_fingerprint = applied.fingerprint;
  result.protected_finance_rows = applied.rowCount;
  return result;
}

async function main() {
  const result = await runClassMonthPlanBackfill(prisma);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const entry = process.argv[1];
if (entry && pathToFileURL(entry).href === import.meta.url) {
  main()
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
