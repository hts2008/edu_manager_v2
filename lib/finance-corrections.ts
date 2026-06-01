import { ApiError, parseMonthRange } from "./api-utils.js";
import {
  calculateTuitionForClass,
  CHARGEABLE_ATTENDANCE_STATUSES,
} from "./tuition.js";

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
        where: { status: "active" },
        include: { class: true },
      },
    },
  });

  if (!student) throw new ApiError("STUDENT_NOT_FOUND", "Student not found", 404);
  if (!student.studentClasses?.length) {
    throw new ApiError("NO_ACTIVE_CLASS", "Student has no active class", 400);
  }

  const breakdown = [];
  let totalDays = 0;
  let totalAmount = 0;

  for (const enrollment of student.studentClasses) {
    const counts = await client.attendance.groupBy({
      by: ["status"],
      where: {
        studentId,
        classId: enrollment.classId,
        attendanceDate: { gte: startDate, lte: endDate },
        status: { in: [...CHARGEABLE_ATTENDANCE_STATUSES] as any },
      },
      _count: { status: true },
    });

    const daysCount = counts.reduce(
      (sum: number, item: any) => sum + item._count.status,
      0
    );
    const tuition = calculateTuitionForClass(enrollment.class, month, daysCount);

    breakdown.push({
      class_id: enrollment.classId,
      class_name: enrollment.class.className,
      fee_per_day: tuition.feePerSession,
      days_count: daysCount,
      expected_sessions: tuition.expectedSessions,
      billing_mode: tuition.billingMode,
      monthly_tuition: tuition.monthlyTuition,
      amount: tuition.totalAmount,
    });

    totalDays += daysCount;
    totalAmount += tuition.totalAmount;
  }

  return {
    student,
    breakdown,
    totalDays,
    totalAmount,
  };
}
