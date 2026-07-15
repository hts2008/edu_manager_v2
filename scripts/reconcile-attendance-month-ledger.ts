import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import {
  ATTENDANCE_GENERATED_SOURCES,
  dateKey,
  findAttendanceOutsideEnrollmentPeriods,
  findEnrollmentStartCorrections,
  findStudentsWithoutEnrollmentPeriod,
  isRealAttendanceEvidence,
  monthBounds,
  parseReconciliationArgs,
  type AttendanceOutsideEnrollmentPeriod,
  type EnrollmentPeriodRow,
  type EnrollmentStartCorrection,
  type ReconciliationOptions,
} from "./attendance-month-ledger-reconcile-helpers.js";
import { readProtectedFinanceFingerprint } from "./backfill-class-month-plans.js";
import {
  attendanceFeeAdvisoryLockKeys,
  acquireClassMonthRosterAdvisoryLocks,
  classMonthRosterAdvisoryLockKeys,
} from "../lib/attendance-lock-transaction.js";
import {
  assertAttendancePeriodReopenSafe,
  ATTENDANCE_REOPEN_FINANCIAL_CONFLICT,
} from "../lib/attendance-lock.js";
import { runSerializableTransaction } from "../lib/serializable-transaction.js";

export {
  findAttendanceOutsideEnrollmentPeriods,
  findEnrollmentStartCorrections,
  parseReconciliationArgs,
} from
  "./attendance-month-ledger-reconcile-helpers.js";

type PhantomSession = { id: string; sessionDate: Date; source: string };
type FinanceFingerprint = { fingerprint: string; row_count: string };
type ReconciliationPlan = {
  phantomSessions: PhantomSession[];
  enrollmentCorrections: EnrollmentStartCorrection[];
  attendanceOutsideEnrollmentPeriods: AttendanceOutsideEnrollmentPeriod[];
  enrollmentVersions: Map<string, { startedAt: Date; endedAt: Date | null }>;
  studentsWithoutEnrollmentPeriod: string[];
  finance: FinanceFingerprint;
};

function monthsInClosedRange(startMonth: string, endMonth: string) {
  const [startYear, startNumber] = startMonth.split("-").map(Number);
  const [endYear, endNumber] = endMonth.split("-").map(Number);
  const cursor = new Date(Date.UTC(startYear, startNumber - 1, 1));
  const end = new Date(Date.UTC(endYear, endNumber - 1, 1));
  const months: string[] = [];
  while (cursor <= end) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function reconciliationAffectedMonths(
  targetMonth: string,
  corrections: EnrollmentStartCorrection[],
) {
  const months = new Set([targetMonth]);
  for (const correction of corrections) {
    const proposedMonth = correction.proposed_started_at.slice(0, 7);
    const currentMonth = correction.current_started_at.slice(0, 7);
    for (const month of monthsInClosedRange(proposedMonth, currentMonth)) months.add(month);
  }
  return [...months].sort();
}

async function acquireAffectedClassMonthRosterAdvisoryLocks(
  tx: any,
  classId: string,
  months: string[],
) {
  const globalLockKeys = new Set(classMonthRosterAdvisoryLockKeys([classId], []));
  const lockKeys = classMonthRosterAdvisoryLockKeys([classId], months)
    .filter((lockKey) => !globalLockKeys.has(lockKey));
  if (lockKeys.length === 0 || typeof tx.$queryRaw !== "function") return;

  await tx.$queryRaw(
    Prisma.sql`
      WITH ordered_keys(lock_key) AS MATERIALIZED (
        SELECT lock_key
        FROM unnest(ARRAY[${Prisma.join(lockKeys)}]::text[]) AS keys(lock_key)
        ORDER BY lock_key
      )
      SELECT pg_advisory_xact_lock(hashtextextended(lock_key, 0))::text AS lock_result
      FROM ordered_keys
      ORDER BY lock_key
    `,
  );
}

async function readAffectedFinanceStudentIds(
  tx: any,
  classId: string,
  months: string[],
) {
  const firstMonth = monthBounds(months[0]);
  const lastMonth = monthBounds(months.at(-1) || months[0]);
  const [attendanceStudents, enrollmentStudents, legacyStudents, feeLineStudents] =
    await Promise.all([
      tx.attendance.findMany({
        where: {
          classId,
          attendanceDate: {
            gte: firstMonth.startDate,
            lt: lastMonth.nextMonth,
          },
        },
        distinct: ["studentId"],
        select: { studentId: true },
      }),
      tx.enrollmentPeriod.findMany({
        where: {
          classId,
          startedAt: { lt: lastMonth.nextMonth },
          OR: [
            { endedAt: null },
            { endedAt: { gt: firstMonth.startDate } },
          ],
        },
        distinct: ["studentId"],
        select: { studentId: true },
      }),
      tx.studentClass.findMany({
        where: {
          classId,
          status: "active",
          enrollmentDate: { lt: lastMonth.nextMonth },
          student: { enrollmentPeriods: { none: { classId } } },
        },
        distinct: ["studentId"],
        select: { studentId: true },
      }),
      tx.monthlyFeeLine.findMany({
        where: { classId, month: { in: months } },
        distinct: ["studentId"],
        select: { studentId: true },
      }),
    ]);

  return [
    ...new Set(
      [...attendanceStudents, ...enrollmentStudents, ...legacyStudents, ...feeLineStudents]
        .map((row) => row.studentId),
    ),
  ].sort();
}

async function acquireAffectedAttendanceFeeAdvisoryLocks(
  tx: any,
  studentIds: string[],
  months: string[],
) {
  const lockKeys = [
    ...new Set(
      months.flatMap((month) => attendanceFeeAdvisoryLockKeys(studentIds, month)),
    ),
  ].sort();
  if (lockKeys.length === 0 || typeof tx.$queryRaw !== "function") return;

  await tx.$queryRaw(
    Prisma.sql`
      WITH ordered_keys(lock_key) AS MATERIALIZED (
        SELECT lock_key
        FROM unnest(ARRAY[${Prisma.join(lockKeys)}]::text[]) AS keys(lock_key)
        ORDER BY lock_key
      )
      SELECT pg_advisory_xact_lock(hashtextextended(lock_key, 0))::text AS lock_result
      FROM ordered_keys
      ORDER BY lock_key
    `,
  );
}

export type AttendanceMonthLedgerReconciliationResult = {
  mode: "dry-run" | "apply";
  run_id: string;
  class_id: string;
  month: string;
  reason: string | null;
  actor_id: string | null;
  protected_finance_fingerprint: string;
  protected_finance_rows: string;
  phantom_sessions_to_delete: number;
  phantom_sessions_deleted: number;
  phantom_sessions: Array<{ id: string; session_date: string; source: string }>;
  enrollment_periods_to_update: number;
  enrollment_periods_updated: number;
  enrollment_period_changes: EnrollmentStartCorrection[];
  attendance_outside_enrollment_periods_count: number;
  attendance_outside_enrollment_periods: AttendanceOutsideEnrollmentPeriod[];
  students_without_enrollment_period: string[];
  audit_rows_created: number;
};

async function readPlan(
  db: any,
  options: ReconciliationOptions,
  includeFinance = true,
): Promise<ReconciliationPlan> {
  const targetClass = await db.class.findUnique({
    where: { id: options.classId },
    select: { id: true },
  });
  if (!targetClass) throw new Error(`Class not found: ${options.classId}`);

  const { startDate, nextMonth } = monthBounds(options.month);
  const [phantomSessions, attendance, finance] = await Promise.all([
    db.classSession.findMany({
      where: phantomSessionWhere(options),
      select: { id: true, sessionDate: true, source: true },
      orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
    }),
    db.attendance.findMany({
      where: {
        classId: options.classId,
        attendanceDate: { gte: startDate, lt: nextMonth },
        status: { in: ["present", "absent_with_fee", "absent_no_fee"] },
        classSession: {
          is: {
            classId: options.classId,
            billingMonth: options.month,
            kind: "regular",
            status: "held",
            sessionDate: { gte: startDate, lt: nextMonth },
          },
        },
      },
      select: {
        id: true,
        studentId: true,
        classSessionId: true,
        classSession: { select: { sessionDate: true } },
        attendanceDate: true,
        status: true,
      },
      orderBy: [{ studentId: "asc" }, { attendanceDate: "asc" }, { id: "asc" }],
    }),
    includeFinance
      ? readProtectedFinanceFingerprint(db)
      : Promise.resolve({ fingerprint: "pending-lock", row_count: "0" }),
  ]);
  const attendanceEvidence = attendance.map((row: any) => ({
    id: row.id,
    studentId: row.studentId,
    classSessionId: row.classSessionId,
    classSessionDate: row.classSession?.sessionDate || null,
    attendanceDate: row.attendanceDate,
    status: row.status,
  }));
  const validAttendanceEvidence = attendanceEvidence.filter(isRealAttendanceEvidence);
  const attendanceStudentIds = [
    ...new Set(validAttendanceEvidence.map((row: any) => row.studentId)),
  ].sort();
  const periods = attendanceStudentIds.length === 0
    ? []
    : await db.enrollmentPeriod.findMany({
        where: {
          classId: options.classId,
          studentId: { in: attendanceStudentIds },
        },
        select: { id: true, studentId: true, startedAt: true, endedAt: true, source: true },
        orderBy: [{ studentId: "asc" }, { startedAt: "asc" }, { id: "asc" }],
      });
  const enrollmentCorrections = findEnrollmentStartCorrections(validAttendanceEvidence, periods);
  const attendanceOutsideEnrollmentPeriods = findAttendanceOutsideEnrollmentPeriods(
    validAttendanceEvidence,
    periods,
    enrollmentCorrections,
  );
  return {
    phantomSessions,
    enrollmentCorrections,
    attendanceOutsideEnrollmentPeriods,
    enrollmentVersions: new Map(
      periods.map((period: EnrollmentPeriodRow) => [
        period.id,
        { startedAt: period.startedAt, endedAt: period.endedAt },
      ]),
    ),
    studentsWithoutEnrollmentPeriod: findStudentsWithoutEnrollmentPeriod(
      validAttendanceEvidence,
      periods,
      enrollmentCorrections,
    ),
    finance,
  };
}

function phantomSessionWhere(options: ReconciliationOptions) {
  const { startDate, nextMonth } = monthBounds(options.month);
  return {
    classId: options.classId,
    billingMonth: options.month,
    sessionDate: { gte: startDate, lt: nextMonth },
    kind: "regular",
    status: "planned",
    source: { in: [...ATTENDANCE_GENERATED_SOURCES] },
    attendance: { none: {} },
    replacementForId: null,
    replacementSessions: { none: {} },
  };
}

function resultFromPlan(
  options: ReconciliationOptions,
  runId: string,
  plan: ReconciliationPlan,
): AttendanceMonthLedgerReconciliationResult {
  return {
    mode: options.apply ? "apply" : "dry-run",
    run_id: runId,
    class_id: options.classId,
    month: options.month,
    reason: options.reason,
    actor_id: options.actorId,
    protected_finance_fingerprint: plan.finance.fingerprint,
    protected_finance_rows: plan.finance.row_count,
    phantom_sessions_to_delete: plan.phantomSessions.length,
    phantom_sessions_deleted: 0,
    phantom_sessions: plan.phantomSessions.map((session) => ({
      id: session.id,
      session_date: dateKey(session.sessionDate),
      source: session.source,
    })),
    enrollment_periods_to_update: plan.enrollmentCorrections.length,
    enrollment_periods_updated: 0,
    enrollment_period_changes: plan.enrollmentCorrections,
    attendance_outside_enrollment_periods_count:
      plan.attendanceOutsideEnrollmentPeriods.length,
    attendance_outside_enrollment_periods: plan.attendanceOutsideEnrollmentPeriods,
    students_without_enrollment_period: plan.studentsWithoutEnrollmentPeriod,
    audit_rows_created: 0,
  };
}

async function audit(
  tx: any,
  options: ReconciliationOptions,
  input: { action: string; entityType: string; entityId: string },
) {
  await tx.activityLog.create({
    data: {
      userId: options.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userAgent: "operator-script/reconcile-attendance-month-ledger",
    },
  });
}

async function deletePhantomSessions(
  tx: any,
  options: ReconciliationOptions,
  runId: string,
  plan: ReconciliationPlan,
) {
  if (!plan.phantomSessions.length) return { deleted: 0, audits: 0 };
  const deleted = await tx.classSession.deleteMany({
    where: {
      id: { in: plan.phantomSessions.map((session) => session.id) },
      ...phantomSessionWhere(options),
    },
  });
  if (deleted.count !== plan.phantomSessions.length) {
    throw new Error(
      `Phantom session set changed during reconciliation: expected ${plan.phantomSessions.length}, deleted ${deleted.count}`,
    );
  }
  for (const session of plan.phantomSessions) {
    await audit(tx, options, {
      action: `RECONCILE_ATTENDANCE_MONTH_LEDGER_DELETE_SESSION run=${runId} class=${options.classId} month=${options.month} date=${dateKey(session.sessionDate)} source=${session.source} finance=${plan.finance.fingerprint}/${plan.finance.row_count} reason=${options.reason}`,
      entityType: "class_session",
      entityId: session.id,
    });
  }
  return { deleted: deleted.count, audits: plan.phantomSessions.length };
}

async function updateEnrollmentPeriods(
  tx: any,
  options: ReconciliationOptions,
  runId: string,
  plan: ReconciliationPlan,
) {
  let updatedCount = 0;
  for (const correction of plan.enrollmentCorrections) {
    const expected = plan.enrollmentVersions.get(correction.enrollment_period_id);
    if (!expected) throw new Error(`Missing version: ${correction.enrollment_period_id}`);
    const updated = await tx.enrollmentPeriod.updateMany({
      where: {
        id: correction.enrollment_period_id,
        studentId: correction.student_id,
        classId: options.classId,
        startedAt: expected.startedAt,
        endedAt: expected.endedAt,
      },
      data: { startedAt: new Date(`${correction.proposed_started_at}T00:00:00.000Z`) },
    });
    if (updated.count !== 1) {
      throw new Error(`EnrollmentPeriod changed during reconciliation: ${correction.enrollment_period_id}`);
    }
    await audit(tx, options, {
      action: `RECONCILE_ENROLLMENT_PERIOD_START run=${runId} class=${options.classId} month=${options.month} ${correction.current_started_at}->${correction.proposed_started_at} evidence=${correction.evidence_attendance_id}:${correction.evidence_attendance_status} finance=${plan.finance.fingerprint}/${plan.finance.row_count} reason=${options.reason}`,
      entityType: "enrollment_period",
      entityId: correction.enrollment_period_id,
    });
    updatedCount += 1;
  }
  return { updated: updatedCount, audits: updatedCount };
}

async function assertFinanceUnchanged(tx: any, before: FinanceFingerprint) {
  const after = await readProtectedFinanceFingerprint(tx);
  if (after.fingerprint !== before.fingerprint || after.row_count !== before.row_count) {
    throw new Error(
      `Protected finance fingerprint changed during reconciliation: ${before.fingerprint}/${before.row_count} -> ${after.fingerprint}/${after.row_count}`,
    );
  }
  return after;
}

async function assertReconciliationTargetMutable(
  tx: any,
  options: ReconciliationOptions,
  month = options.month,
) {
  const protectedPeriod = await tx.attendancePeriod.findFirst({
    where: {
      classId: options.classId,
      periodMonth: month,
      status: { in: ["submitted", "approved", "locked"] },
    },
    select: { id: true, status: true },
  });
  if (protectedPeriod) {
    throw new Error(
      `Attendance period ${month} is ${protectedPeriod.status}; refusing reconciliation apply`,
    );
  }

  const frozenPlan = await tx.classMonthPlan.findFirst({
    where: {
      classId: options.classId,
      billingMonth: month,
      state: "frozen",
    },
    select: { id: true, state: true },
  });
  if (frozenPlan) {
    throw new Error(
      `Class month plan ${month} is frozen; refusing reconciliation apply`,
    );
  }

  try {
    await assertAttendancePeriodReopenSafe(options.classId, month, tx);
  } catch (error) {
    if ((error as { code?: string })?.code !== ATTENDANCE_REOPEN_FINANCIAL_CONFLICT) {
      throw error;
    }
    throw new Error(
      `Protected finance exists for class ${options.classId} month ${month}; refusing reconciliation apply`,
    );
  }
}

async function applyPlan(
  tx: any,
  options: ReconciliationOptions,
  runId: string,
  plan: ReconciliationPlan,
) {
  if (plan.finance.fingerprint === "unavailable") {
    throw new Error("Protected finance fingerprint is unavailable; refusing reconciliation apply");
  }
  if (plan.studentsWithoutEnrollmentPeriod.length > 0) {
    throw new Error(
      `Unresolved enrollment periods: ${plan.studentsWithoutEnrollmentPeriod.join(", ")}; refusing partial reconciliation apply`,
    );
  }
  const actor = await tx.user.findUnique({ where: { id: options.actorId }, select: { id: true } });
  if (!actor) throw new Error(`Audit actor not found: ${options.actorId}`);
  const result = resultFromPlan(options, runId, plan);
  const sessions = await deletePhantomSessions(tx, options, runId, plan);
  const enrollments = await updateEnrollmentPeriods(tx, options, runId, plan);
  const finance = await assertFinanceUnchanged(tx, plan.finance);
  result.phantom_sessions_deleted = sessions.deleted;
  result.enrollment_periods_updated = enrollments.updated;
  result.audit_rows_created = sessions.audits + enrollments.audits;
  result.protected_finance_fingerprint = finance.fingerprint;
  result.protected_finance_rows = finance.row_count;
  return result;
}

export async function runAttendanceMonthLedgerReconciliation(
  db: any,
  args: string[] = process.argv.slice(2),
): Promise<AttendanceMonthLedgerReconciliationResult> {
  const options = parseReconciliationArgs(args);
  const runId = `attendance-month-ledger-${options.month}-${randomUUID()}`;
  if (!options.apply) return resultFromPlan(options, runId, await readPlan(db, options));
  return runSerializableTransaction(db, async (tx: any) => {
    // Stabilize the plan-derived month set before taking its ordered month locks.
    await acquireClassMonthRosterAdvisoryLocks(
      tx,
      [options.classId],
      [],
    );
    const plan = await readPlan(tx, options, false);
    const affectedMonths = reconciliationAffectedMonths(
      options.month,
      plan.enrollmentCorrections,
    );
    await acquireAffectedClassMonthRosterAdvisoryLocks(
      tx,
      options.classId,
      affectedMonths,
    );
    const financeStudentIds = await readAffectedFinanceStudentIds(
      tx,
      options.classId,
      affectedMonths,
    );
    await acquireAffectedAttendanceFeeAdvisoryLocks(
      tx,
      financeStudentIds,
      affectedMonths,
    );
    plan.finance = await readProtectedFinanceFingerprint(tx);
    for (const month of affectedMonths) {
      await assertReconciliationTargetMutable(tx, options, month);
    }
    return applyPlan(tx, options, runId, plan);
  }, {
    maxAttempts: 3,
    baseDelayMs: 20,
    transactionOptions: {
      isolationLevel: "Serializable",
      maxWait: 5_000,
      timeout: 60_000,
    },
  });
}

async function main() {
  process.stdout.write(`${JSON.stringify(await runAttendanceMonthLedgerReconciliation(prisma))}\n`);
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
