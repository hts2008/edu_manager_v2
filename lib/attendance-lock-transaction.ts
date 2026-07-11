import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ApiError } from "./api-utils.js";
import {
  calculateStudentMonthlyTuition,
  CHARGEABLE_ATTENDANCE_STATUSES,
} from "./tuition.js";
import { feeLineAllocationKey } from "./monthly-fee-lines.js";

type CountRow = {
  studentId: string;
  classId: string;
  _count: { status: number };
};

type StudentClassRow = {
  studentId: string;
  classId: string;
  class: {
    className?: string | null;
    feePerDay?: number | null;
    scheduleDays?: string | null;
    sessionsPerWeek?: number | null;
    enrollmentStart?: Date | string | null;
    enrollmentEnd?: Date | string | null;
    teacher?: { fullName?: string | null } | null;
  };
};

type ExistingFeeLine = {
  id: string;
  allocationKey: string;
  status: string;
  receiptId?: string | null;
  paidAt?: Date | null;
  createdAt?: Date;
  receiptLines?: Array<{ id: string }>;
};

type ExistingFee = {
  id: string;
  studentId: string;
  month: string;
  status: string;
  receiptId?: string | null;
  paidAt?: Date | null;
  createdAt?: Date;
  lines?: ExistingFeeLine[];
};

export type AttendanceLockFeeSyncMetrics = {
  students_processed: number;
  fees_created: number;
  fees_updated: number;
  fees_preserved: number;
  fee_lines_written: number;
};

type BuildPlanInput = {
  month: string;
  targetClassId: string;
  studentIds: string[];
  activeStudentClasses: StudentClassRow[];
  attendanceCounts: CountRow[];
  makeUpCounts: CountRow[];
  existingFees: ExistingFee[];
  createId?: () => string;
};

export function attendanceFeeAdvisoryLockKeys(
  studentIds: string[],
  month: string,
) {
  return [
    ...new Set(
      studentIds.map((studentId) => `attendance-fee:${month}:${studentId}`),
    ),
  ].sort();
}

async function acquireAttendanceFeeAdvisoryLocks(
  tx: any,
  studentIds: string[],
  month: string,
) {
  const lockKeys = attendanceFeeAdvisoryLockKeys(studentIds, month);
  if (lockKeys.length === 0) return;

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

function isProtectedFeeLine(line: ExistingFeeLine) {
  return (
    ["confirmed", "paid"].includes(line.status) ||
    Boolean(line.receiptId) ||
    Boolean(line.paidAt) ||
    Boolean(line.receiptLines?.length)
  );
}

function isProtectedFee(fee: ExistingFee) {
  return (
    !fee.lines?.length &&
    (fee.status === "paid" ||
      Boolean(fee.receiptId) ||
      Boolean(fee.paidAt) ||
      fee.status === "confirmed")
  );
}

function countMap(rows: CountRow[]) {
  return new Map(
    rows.map((row) => [
      `${row.studentId}:${row.classId}`,
      Number(row._count.status || 0),
    ]),
  );
}

export function buildAttendanceLockFeePlan(input: BuildPlanInput) {
  const createId = input.createId || randomUUID;
  const targetAllocationKey = feeLineAllocationKey(input.targetClassId);
  const existingByStudent = new Map(
    input.existingFees.map((fee) => [fee.studentId, fee]),
  );
  const classesByStudent = new Map<string, StudentClassRow[]>();
  for (const row of input.activeStudentClasses) {
    const rows = classesByStudent.get(row.studentId) || [];
    rows.push(row);
    classesByStudent.set(row.studentId, rows);
  }

  const chargedByStudentClass = countMap(input.attendanceCounts);
  const makeUpByStudentClass = countMap(input.makeUpCounts);
  const mutableLineIds: string[] = [];
  const affectedFeeIds: string[] = [];
  const feeRows: Array<Record<string, unknown>> = [];
  const lineRows: Array<Record<string, unknown>> = [];
  let feesCreated = 0;
  let feesUpdated = 0;
  let feesPreserved = 0;

  for (const studentId of input.studentIds) {
    const existing = existingByStudent.get(studentId);
    if (existing && isProtectedFee(existing)) {
      feesPreserved += 1;
      continue;
    }

    const studentClasses = (classesByStudent.get(studentId) || []).filter(
      (row) => row.classId === input.targetClassId,
    );
    const tuition = calculateStudentMonthlyTuition(
      studentClasses.map((row) => ({
        classId: row.classId,
        feePerDay: row.class.feePerDay,
        scheduleDays: row.class.scheduleDays,
        sessionsPerWeek: row.class.sessionsPerWeek,
        enrollmentStart: row.class.enrollmentStart,
        enrollmentEnd: row.class.enrollmentEnd,
        chargedSessions:
          chargedByStudentClass.get(`${studentId}:${row.classId}`) || 0,
      })),
      input.month,
    );
    const feeId = existing?.id || createId();

    if (existing) {
      affectedFeeIds.push(existing.id);
      feesUpdated += 1;
    } else {
      feesCreated += 1;
      affectedFeeIds.push(feeId);
      feeRows.push({
        id: feeId,
        studentId,
        month: input.month,
        totalDays: tuition.totalDays,
        totalAmount: tuition.totalAmount,
        status: tuition.totalAmount > 0 ? "ready" : "pending",
        receiptId: null,
        paidAt: null,
      });
    }

    const existingLines = new Map(
      (existing?.lines || []).map((line) => [line.allocationKey, line]),
    );
    for (const line of existing?.lines || []) {
      if (
        line.allocationKey === targetAllocationKey &&
        !isProtectedFeeLine(line) &&
        studentClasses.length === 0
      ) {
        mutableLineIds.push(line.id);
      }
    }

    for (const tuitionClass of tuition.classes) {
      const classRow = studentClasses.find(
        (row) => row.classId === tuitionClass.classId,
      );
      const allocationKey = feeLineAllocationKey(tuitionClass.classId);
      const existingLine = existingLines.get(allocationKey);
      if (existingLine && isProtectedFeeLine(existingLine)) {
        continue;
      }
      if (existingLine) mutableLineIds.push(existingLine.id);
      const makeUpSessions =
        makeUpByStudentClass.get(`${studentId}:${tuitionClass.classId}`) || 0;

      lineRows.push({
        id: existingLine?.id || createId(),
        monthlyFeeId: feeId,
        studentId,
        classId: tuitionClass.classId,
        allocationKey,
        month: input.month,
        classNameSnapshot: classRow?.class.className || null,
        teacherNameSnapshot: classRow?.class.teacher?.fullName || null,
        expectedSessions: tuitionClass.expectedSessions,
        chargedSessions: tuitionClass.chargedSessions,
        makeUpSessions,
        extraSessions: Math.max(
          0,
          tuitionClass.chargedSessions - tuitionClass.expectedSessions,
        ),
        feePerSession: tuitionClass.feePerSession,
        monthlyTuition: Number(tuitionClass.monthlyTuition || 0),
        amount: tuitionClass.totalAmount,
        billingMode: tuitionClass.billingMode,
        scheduleMode: tuitionClass.scheduleStrategy,
        status: tuitionClass.totalAmount > 0 ? "ready" : "pending",
        receiptId: null,
        paidAt: null,
        allocationConfidence: "calculated",
        notes: null,
        ...(existingLine?.createdAt ? { createdAt: existingLine.createdAt } : {}),
      });
    }
  }

  return {
    mutableLineIds: [...new Set(mutableLineIds)],
    affectedFeeIds: [...new Set(affectedFeeIds)],
    feeRows,
    lineRows,
    metrics: {
      students_processed: input.studentIds.length,
      fees_created: feesCreated,
      fees_updated: feesUpdated,
      fees_preserved: feesPreserved,
      fee_lines_written: lineRows.length,
    } satisfies AttendanceLockFeeSyncMetrics,
  };
}

type LockInput = {
  periodId: string;
  classId: string;
  month: string;
  userId: string;
  now?: Date;
  createId?: () => string;
};

export async function lockAttendancePeriodAndSyncFees(
  tx: any,
  input: LockInput,
): Promise<AttendanceLockFeeSyncMetrics> {
  const claimed = await tx.attendancePeriod.updateMany({
    where: { id: input.periodId, status: "approved" },
    data: {
      status: "locked",
      lockedById: input.userId,
      lockedAt: input.now || new Date(),
    },
  });
  if (claimed.count !== 1) {
    throw new ApiError(
      "ATTENDANCE_PERIOD_STATE_CONFLICT",
      "Attendance period changed while locking",
      409,
    );
  }

  const [year, monthNumber] = input.month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1));
  const impactedStudentClasses = await tx.studentClass.findMany({
    where: { classId: input.classId, status: "active" },
    select: { studentId: true },
  });
  const enrollmentPeriods = tx.enrollmentPeriod?.findMany
    ? await tx.enrollmentPeriod.findMany({
        where: {
          classId: input.classId,
          startedAt: { lt: nextMonthStart },
          OR: [{ endedAt: null }, { endedAt: { gt: startDate } }],
          student: { deletedAt: null },
        },
        include: {
          class: { include: { teacher: { select: { fullName: true } } } },
        },
      })
    : [];
  const studentIds = [
    ...new Set(
      [...impactedStudentClasses, ...enrollmentPeriods].map(
        (item: { studentId: string }) => item.studentId,
      ),
    ),
  ] as string[];
  if (studentIds.length === 0) {
    return {
      students_processed: 0,
      fees_created: 0,
      fees_updated: 0,
      fees_preserved: 0,
      fee_lines_written: 0,
    };
  }

  await acquireAttendanceFeeAdvisoryLocks(tx, studentIds, input.month);

  const projectedStudentClasses = await tx.studentClass.findMany({
    where: {
      classId: input.classId,
      studentId: { in: studentIds },
      status: "active",
      student: { status: "active", deletedAt: null },
    },
    include: {
      class: {
        include: {
          teacher: { select: { fullName: true } },
        },
      },
    },
  });
  const periodStudentIds = new Set(
    enrollmentPeriods.map((period: { studentId: string }) => period.studentId),
  );
  const activeStudentClasses = [
    ...enrollmentPeriods.map((period: any) => ({
      studentId: period.studentId,
      classId: period.classId,
      class: {
        ...period.class,
        enrollmentStart: period.startedAt,
        enrollmentEnd: period.endedAt,
      },
    })),
    ...projectedStudentClasses.filter(
      (link: { studentId: string }) => !periodStudentIds.has(link.studentId),
    ),
  ];

  const [attendanceCounts, makeUpCounts, existingFees] = await Promise.all([
    tx.attendance.groupBy({
          by: ["studentId", "classId"],
          where: {
            studentId: { in: studentIds },
            classId: input.classId,
            attendanceDate: { gte: startDate, lt: nextMonthStart },
            status: { in: [...CHARGEABLE_ATTENDANCE_STATUSES] },
          },
          _count: { status: true },
        }),
    tx.attendance.groupBy({
          by: ["studentId", "classId"],
          where: {
            studentId: { in: studentIds },
            classId: input.classId,
            attendanceDate: { gte: startDate, lt: nextMonthStart },
            status: { in: [...CHARGEABLE_ATTENDANCE_STATUSES] },
            isMakeUp: true,
          },
          _count: { status: true },
        }),
    tx.monthlyFee.findMany({
      where: {
        studentId: { in: studentIds },
        month: input.month,
      },
      include: {
        lines: {
          include: {
            receiptLines: { select: { id: true } },
          },
        },
      },
    }),
  ]);

  const plan = buildAttendanceLockFeePlan({
    month: input.month,
    targetClassId: input.classId,
    studentIds,
    activeStudentClasses,
    attendanceCounts,
    makeUpCounts,
    existingFees,
    createId: input.createId,
  });

  if (plan.mutableLineIds.length > 0) {
    await tx.monthlyFeeLine.deleteMany({
      where: { id: { in: plan.mutableLineIds } },
    });
  }
  if (plan.feeRows.length > 0) {
    await tx.monthlyFee.createMany({ data: plan.feeRows });
  }
  if (plan.lineRows.length > 0) {
    await tx.monthlyFeeLine.createMany({ data: plan.lineRows });
  }
  if (plan.affectedFeeIds.length > 0) {
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "monthly_fees" AS fee
        SET
          "total_days" = aggregate.total_days,
          "total_amount" = aggregate.total_amount,
          "status" = aggregate.next_status,
          "receipt_id" = aggregate.next_receipt_id,
          "paid_at" = aggregate.next_paid_at,
          "updated_at" = CURRENT_TIMESTAMP
        FROM (
          SELECT
            "monthly_fee_id",
            COALESCE(SUM("charged_sessions"), 0)::integer AS total_days,
            COALESCE(SUM("amount"), 0)::double precision AS total_amount,
            CASE
              WHEN COUNT(*) > 0 AND COUNT(*) FILTER (WHERE "status" = 'paid') = COUNT(*)
                THEN 'paid'::"FeeStatus"
              WHEN COUNT(*) FILTER (WHERE "status" = 'confirmed') > 0
                THEN 'confirmed'::"FeeStatus"
              WHEN COUNT(*) FILTER (WHERE "status" = 'ready') > 0
                THEN 'ready'::"FeeStatus"
              ELSE 'pending'::"FeeStatus"
            END AS next_status,
            CASE
              WHEN COUNT(*) = 1 AND COUNT(*) FILTER (WHERE "status" = 'paid') = 1
                THEN MAX("receipt_id")
              ELSE NULL
            END AS next_receipt_id,
            CASE
              WHEN COUNT(*) > 0 AND COUNT(*) FILTER (WHERE "status" = 'paid') = COUNT(*)
                THEN MAX("paid_at")
              ELSE NULL
            END AS next_paid_at
          FROM "monthly_fee_lines"
          WHERE "monthly_fee_id" IN (${Prisma.join(plan.affectedFeeIds)})
          GROUP BY "monthly_fee_id"
        ) AS aggregate
        WHERE fee."id" = aggregate."monthly_fee_id"
      `,
    );
  }

  return plan.metrics;
}

export function isAttendanceLockTimeout(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2028",
  );
}
