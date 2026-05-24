import { parseMonthRange } from "./api-utils.js";
import {
  calculateTuitionForClass,
  CHARGEABLE_ATTENDANCE_STATUSES,
} from "./tuition.js";

type GenerateItem = {
  student_id: string;
  student_name: string;
  month: string;
  total_days: number;
  total_amount: number;
  existing_status: string | null;
  action: "created" | "updated" | "skipped" | "would_create" | "would_update";
  reason?: string;
};

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function countKey(studentId: string, classId: string) {
  return `${studentId}:${classId}`;
}

function calculateStudentFee(
  student: any,
  attendanceCounts: Map<string, number>,
  month: string
) {
  const breakdown = [];
  let totalDays = 0;
  let totalAmount = 0;

  for (const enrollment of student.studentClasses || []) {
    const daysCount = attendanceCounts.get(countKey(student.id, enrollment.classId)) || 0;
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

  return { breakdown, totalDays, totalAmount };
}

function summarize(items: GenerateItem[], dryRun: boolean) {
  return {
    dry_run: dryRun,
    total_students: items.length,
    created: items.filter((item) => item.action === "created").length,
    updated: items.filter((item) => item.action === "updated").length,
    skipped: items.filter((item) => item.action === "skipped").length,
    would_create: items.filter((item) => item.action === "would_create").length,
    would_update: items.filter((item) => item.action === "would_update").length,
    total_amount: items.reduce((sum, item) => sum + item.total_amount, 0),
  };
}

export async function generateMonthlyFees(
  prisma: any,
  { month = currentMonth(), dryRun = true }: { month?: string; dryRun?: boolean } = {}
) {
  const { startDate, endDate } = parseMonthRange(month);

  const students = await prisma.student.findMany({
    where: { status: "active", deletedAt: null },
    include: {
      monthlyFees: { where: { month } },
      studentClasses: {
        where: { status: "active" },
        include: { class: true },
      },
    },
    orderBy: { fullName: "asc" },
  });
  const studentIds = students.map((student: any) => student.id);
  const attendanceRows =
    studentIds.length > 0
      ? await prisma.attendance.groupBy({
          by: ["studentId", "classId"],
          where: {
            studentId: { in: studentIds },
            attendanceDate: { gte: startDate, lte: endDate },
            status: { in: [...CHARGEABLE_ATTENDANCE_STATUSES] as any },
          },
          _count: { id: true },
        })
      : [];
  const attendanceCounts = new Map<string, number>(
    attendanceRows.map((row: any): [string, number] => [
      countKey(row.studentId, row.classId),
      row._count.id,
    ])
  );

  const items: GenerateItem[] = [];
  for (const student of students) {
    const existing = student.monthlyFees?.[0] || null;
    const { totalDays, totalAmount } = calculateStudentFee(
      student,
      attendanceCounts,
      month
    );

    if (!student.studentClasses?.length) {
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: 0,
        total_amount: 0,
        existing_status: existing?.status || null,
        action: "skipped",
        reason: "NO_ACTIVE_CLASS",
      });
      continue;
    }

    if (existing && !["pending", "ready"].includes(existing.status)) {
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: existing.totalDays,
        total_amount: existing.totalAmount,
        existing_status: existing.status,
        action: "skipped",
        reason: `STATUS_${existing.status.toUpperCase()}`,
      });
      continue;
    }

    if (dryRun) {
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: totalDays,
        total_amount: totalAmount,
        existing_status: existing?.status || null,
        action: existing ? "would_update" : "would_create",
      });
      continue;
    }

    if (existing) {
      await prisma.monthlyFee.update({
        where: { id: existing.id },
        data: {
          totalDays,
          totalAmount,
          status: "ready",
          receiptId: null,
          paidAt: null,
        },
      });
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: totalDays,
        total_amount: totalAmount,
        existing_status: existing.status,
        action: "updated",
      });
    } else {
      await prisma.monthlyFee.create({
        data: {
          studentId: student.id,
          month,
          totalDays,
          totalAmount,
          status: "ready",
        },
      });
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: totalDays,
        total_amount: totalAmount,
        existing_status: null,
        action: "created",
      });
    }
  }

  return {
    month,
    dry_run: dryRun,
    items,
    summary: summarize(items, dryRun),
  };
}
