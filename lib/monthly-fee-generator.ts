import { getBusinessMonthKey, parseMonthRange } from "./api-utils.js";
import {
  calculateTuitionForClass,
  CHARGEABLE_ATTENDANCE_STATUSES,
} from "./tuition.js";
import {
  monthlyFeeLineToDto,
  syncMonthlyFeeLines,
} from "./monthly-fee-lines.js";

type GenerateItem = {
  student_id: string;
  student_name: string;
  month: string;
  total_days: number;
  total_amount: number;
  existing_status: string | null;
  action: "created" | "updated" | "skipped" | "would_create" | "would_update";
  lines?: any[];
  reason?: string;
};

export function currentMonth() {
  return getBusinessMonthKey();
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

  const enrollments = student.enrollmentPeriods?.length
    ? student.enrollmentPeriods.map((period: any) => ({
        classId: period.classId,
        class: {
          ...period.class,
          enrollmentStart: period.startedAt,
          enrollmentEnd: period.endedAt,
        },
      }))
    : student.studentClasses || [];

  for (const enrollment of enrollments) {
    const daysCount = attendanceCounts.get(countKey(student.id, enrollment.classId)) || 0;
    const tuition = calculateTuitionForClass(enrollment.class, month, daysCount);

    breakdown.push({
      class_id: enrollment.classId,
      class_name: enrollment.class.className,
      teacher_name: enrollment.class.teacher?.fullName || null,
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

  const enrollmentWindow = {
    startedAt: { lte: endDate },
    OR: [{ endedAt: null }, { endedAt: { gt: startDate } }],
  };
  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      OR: [
        { status: "active" },
        { enrollmentPeriods: { some: enrollmentWindow } },
      ],
    },
    include: {
      monthlyFees: { where: { month } },
      enrollmentPeriods: {
        where: enrollmentWindow,
        include: { class: { include: { teacher: true } } },
      },
      studentClasses: {
        where: { status: "active" },
        include: { class: { include: { teacher: true } } },
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
    const { breakdown, totalDays, totalAmount } = calculateStudentFee(
      student,
      attendanceCounts,
      month
    );

    if (!student.enrollmentPeriods?.length && !student.studentClasses?.length) {
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

    const writeResult = await prisma.$transaction(async (tx: any) => {
      let fee = existing;
      if (fee) {
        const updated = await tx.monthlyFee.updateMany({
          where: {
            id: fee.id,
            status: { in: ["pending", "ready"] },
            receiptId: null,
            paidAt: null,
          },
          data: { totalDays, totalAmount, status: "ready" },
        });
        if (updated.count !== 1) return null;
        fee = await tx.monthlyFee.findUniqueOrThrow({ where: { id: fee.id } });
      } else {
        fee = await tx.monthlyFee.create({
          data: { studentId: student.id, month, totalDays, totalAmount, status: "ready" },
        });
      }
      const lines = await syncMonthlyFeeLines(tx, fee, breakdown);
      return { fee, lines };
    });

    if (!writeResult) {
        items.push({
          student_id: student.id,
          student_name: student.fullName,
          month,
          total_days: existing.totalDays,
          total_amount: existing.totalAmount,
          existing_status: existing.status,
          action: "skipped",
          reason: "STATE_CHANGED",
        });
        continue;
    }

    if (existing) {
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: totalDays,
        total_amount: totalAmount,
        existing_status: existing.status,
        action: "updated",
        lines: writeResult.lines.map((line: any) => monthlyFeeLineToDto(line, student)),
      });
    } else {
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: totalDays,
        total_amount: totalAmount,
        existing_status: null,
        action: "created",
        lines: writeResult.lines.map((line: any) => monthlyFeeLineToDto(line, student)),
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
