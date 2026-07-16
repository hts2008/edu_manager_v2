import { Prisma } from "@prisma/client";
import { ApiError, parseMonthRange } from "./api-utils.js";
import { buildStudentTuitionV3 } from "./tuition-v3-service.js";

export type FinanceAnomalyCode =
  | "RECEIPT_WITH_ZERO_DAYS"
  | "PAID_WITH_ZERO_DAYS";

export function detectReceiptAnomaly(receipt: {
  amount?: number | null;
  daysCount?: number | null;
}) {
  if (Number(receipt.amount || 0) > 0 && Number(receipt.daysCount || 0) <= 0) {
    return "RECEIPT_WITH_ZERO_DAYS" as const;
  }
  return null;
}

export function detectMonthlyFeeAnomaly(fee?: {
  status?: string | null;
  totalAmount?: number | null;
  totalDays?: number | null;
} | null) {
  if (
    fee?.status === "paid" &&
    Number(fee.totalAmount || 0) > 0 &&
    Number(fee.totalDays || 0) <= 0
  ) {
    return "PAID_WITH_ZERO_DAYS" as const;
  }
  return null;
}

export function buildCorrectionNote(
  existingNotes: string | null | undefined,
  {
    reason,
    originalReceiptId,
  }: {
    reason: string;
    originalReceiptId: string;
  }
) {
  const prefix = existingNotes?.trim() ? `${existingNotes.trim()}\n` : "";
  return `${prefix}[CORRECTION] Voided receipt ${originalReceiptId}. Reason: ${reason}`;
}

export function isCorrectionNote(notes: string | null | undefined) {
  return Boolean(notes && /\[CORRECTION\]\s+Voided receipt/i.test(notes));
}

const MONTHLY_FEE_LINE_SNAPSHOT_FIELDS = [
  "id",
  "monthlyFeeId",
  "studentId",
  "classId",
  "allocationKey",
  "month",
  "classNameSnapshot",
  "teacherNameSnapshot",
  "expectedSessions",
  "chargedSessions",
  "makeUpSessions",
  "extraSessions",
  "feePerSession",
  "monthlyTuition",
  "amount",
  "billingMode",
  "scheduleMode",
  "status",
  "receiptId",
  "paidAt",
  "allocationConfidence",
  "contractSessions",
  "eligibleSessions",
  "deliveredSessions",
  "centerCreditSessions",
  "studentWaivedSessions",
  "calculationVersion",
  "calculationSnapshot",
  "notes",
  "createdAt",
  "updatedAt",
] as const;

const NON_MATERIAL_MONTHLY_FEE_LINE_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
]);

function toJsonValue(value: unknown): unknown {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonValuesEqual(value, right[index]))
    );
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord).sort();
    const rightKeys = Object.keys(rightRecord).sort();
    return (
      jsonValuesEqual(leftKeys, rightKeys) &&
      leftKeys.every((key) => jsonValuesEqual(leftRecord[key], rightRecord[key]))
    );
  }
  return false;
}

export function buildMonthlyFeeLineRevisionSnapshot(line: any) {
  return Object.fromEntries(
    MONTHLY_FEE_LINE_SNAPSHOT_FIELDS.map((field) => [
      field,
      toJsonValue(line?.[field]),
    ]),
  );
}

export function hasMaterialMonthlyFeeLineChange(before: any, after: any) {
  if (!before) return true;
  const beforeSnapshot = buildMonthlyFeeLineRevisionSnapshot(before);
  const afterSnapshot = buildMonthlyFeeLineRevisionSnapshot(after);
  return MONTHLY_FEE_LINE_SNAPSHOT_FIELDS.some(
    (field) =>
      !NON_MATERIAL_MONTHLY_FEE_LINE_FIELDS.has(field) &&
      !jsonValuesEqual(beforeSnapshot[field], afterSnapshot[field]),
  );
}

export async function createReceiptCorrectionLineRevisions(
  client: any,
  {
    beforeLines,
    afterLines,
    actorId,
    reason,
    runId,
  }: {
    beforeLines: any[];
    afterLines: any[];
    actorId: string;
    reason: string;
    runId: string;
  },
) {
  const beforeByAllocationKey = new Map(
    beforeLines.map((line) => [line.allocationKey, line]),
  );
  const afterIds = new Set(afterLines.map((line) => line.id));
  const removedLine = beforeLines.find((line) => !afterIds.has(line.id));
  if (removedLine) {
    throw new ApiError(
      "MONTHLY_FEE_LINE_REVISION_REQUIRED",
      "Receipt correction cannot delete a fee line without preserving revision history",
      409,
      { monthly_fee_line_id: removedLine.id },
    );
  }

  let revisionCount = 0;
  for (const afterLine of afterLines) {
    const beforeLine = beforeByAllocationKey.get(afterLine.allocationKey);
    if (!hasMaterialMonthlyFeeLineChange(beforeLine, afterLine)) continue;

    const latestRevisionNumber = Number(
      beforeLine?.revisions?.[0]?.revisionNumber || 0,
    );
    await client.monthlyFeeLineRevision.create({
      data: {
        monthlyFeeLineId: afterLine.id,
        revisionNumber: latestRevisionNumber + 1,
        runId,
        eventType: "receipt_correction",
        reason,
        beforeSnapshot: beforeLine
          ? buildMonthlyFeeLineRevisionSnapshot(beforeLine)
          : Prisma.DbNull,
        afterSnapshot: buildMonthlyFeeLineRevisionSnapshot(afterLine),
        actorId,
      },
    });
    revisionCount += 1;
  }
  return revisionCount;
}

export async function calculateStudentMonthlyFee(
  client: any,
  studentId: string,
  month: string
) {
  const { startDate, endDate } = parseMonthRange(month);
  const student = await client.student.findFirst({
    where: { id: studentId, deletedAt: null },
    include: {
      studentClasses: {
        where: { status: "active", enrollmentDate: { lte: endDate } },
        include: { class: { include: { teacher: true } } },
      },
      enrollmentPeriods: {
        where: {
          startedAt: { lte: endDate },
          OR: [{ endedAt: null }, { endedAt: { gt: startDate } }],
        },
        include: { class: { include: { teacher: true } } },
      },
    },
  });

  if (!student) throw new ApiError("STUDENT_NOT_FOUND", "Student not found", 404);
  const enrollments = new Map<string, any>();
  for (const period of student.enrollmentPeriods || []) {
    const current = enrollments.get(period.classId) || {
      classId: period.classId,
      class: period.class,
      periods: [],
    };
    current.periods.push({ startedAt: period.startedAt, endedAt: period.endedAt });
    enrollments.set(period.classId, current);
  }
  for (const enrollment of student.studentClasses || []) {
    if (enrollments.has(enrollment.classId)) continue;
    enrollments.set(enrollment.classId, {
      classId: enrollment.classId,
      class: enrollment.class,
      periods: [{ startedAt: enrollment.enrollmentDate, endedAt: null }],
    });
  }
  if (!enrollments.size) {
    throw new ApiError("NO_ACTIVE_CLASS", "Student has no active class", 400);
  }

  const breakdown = [];
  let totalDays = 0;
  let totalAmount = 0;

  for (const enrollment of enrollments.values()) {
    const [sessions, attendance] = await Promise.all([
      client.classSession.findMany({
        where: { classId: enrollment.classId, billingMonth: month },
        orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
      }),
      client.attendance.findMany({
        where: {
          studentId,
          classId: enrollment.classId,
          attendanceDate: { gte: startDate, lte: endDate },
        },
        select: { classSessionId: true, attendanceDate: true, status: true },
      }),
    ]);
    if (
      enrollment.class.billingPolicy === "monthly_prorated" &&
      !sessions.some((session: any) => session.kind === "regular")
    ) {
      throw new ApiError(
        "MISSING_MONTH_PLAN",
        `Class ${enrollment.class.className || enrollment.classId} has no regular session ledger for ${month}`,
        409,
        { class_id: enrollment.classId, month },
      );
    }
    const tuition = buildStudentTuitionV3({
      month,
      classData: enrollment.class,
      enrollment: { periods: enrollment.periods },
      sessions,
      attendance,
    });
    const chargedLedger = tuition.calculationSnapshot.ledger.filter(
      (row: any) => Number(row.amount || 0) > 0,
    );
    const presentDays = chargedLedger.filter(
      (row: any) => row.status === "present",
    ).length;
    const absentFeeDays = chargedLedger.filter(
      (row: any) => row.status === "absent_with_fee",
    ).length;

    breakdown.push({
      class_id: enrollment.classId,
      class_name: enrollment.class.className,
      teacher_name: enrollment.class.teacher?.fullName || null,
      fee_per_day: tuition.feePerSession,
      days_count: tuition.chargedSessions,
      present_days: presentDays,
      absent_fee_days: absentFeeDays,
      expected_sessions: tuition.contractSessions,
      make_up_sessions: tuition.makeUpSessions,
      extra_sessions: tuition.extraSessions,
      billing_mode: tuition.billingMode,
      monthly_tuition: tuition.monthlyTuition,
      amount: tuition.amount,
      schedule_mode: tuition.scheduleMode,
      contract_sessions: tuition.contractSessions,
      eligible_sessions: tuition.eligibleSessions,
      delivered_sessions: tuition.deliveredSessions,
      center_credit_sessions: tuition.centerCreditSessions,
      student_waived_sessions: tuition.studentWaivedSessions,
      calculation_version: tuition.calculationVersion,
      calculation_snapshot: tuition.calculationSnapshot,
    });

    totalDays += tuition.chargedSessions;
    totalAmount += tuition.amount;
  }

  return {
    student,
    breakdown,
    totalDays,
    totalAmount,
  };
}
