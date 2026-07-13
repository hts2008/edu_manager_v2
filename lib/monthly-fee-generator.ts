import { ApiError, getBusinessMonthKey, parseMonthRange } from "./api-utils.js";
import {
  isProtectedMonthlyFee,
  monthlyFeeLineToDto,
  syncMonthlyFeeLines,
} from "./monthly-fee-lines.js";
import { acquireAttendanceFeeAdvisoryLocks } from "./attendance-lock-transaction.js";
import { buildStudentTuitionV3 } from "./tuition-v3-service.js";
import { runSerializableTransaction } from "./serializable-transaction.js";

const GENERATOR_TRANSACTION_OPTIONS = {
  isolationLevel: "Serializable" as const,
  maxWait: 5_000,
  timeout: 15_000,
};

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

const monthlyFeeProtectionInclude = {
  lines: {
    select: {
      status: true,
      receiptId: true,
      paidAt: true,
      receiptLines: { select: { id: true } },
    },
  },
};

function studentEnrollments(student: any) {
  const grouped = new Map<string, any>();
  for (const period of student.enrollmentPeriods || []) {
    const current = grouped.get(period.classId) || {
      classId: period.classId,
      class: period.class,
      periods: [],
    };
    current.periods.push({
      startedAt: period.startedAt,
      endedAt: period.endedAt,
    });
    grouped.set(period.classId, current);
  }

  for (const enrollment of student.studentClasses || []) {
    if (grouped.has(enrollment.classId)) continue;
    grouped.set(enrollment.classId, {
      classId: enrollment.classId,
      class: enrollment.class,
      periods: [{ startedAt: enrollment.enrollmentDate, endedAt: null }],
    });
  }

  return [...grouped.values()];
}

function calculateStudentFee(
  student: any,
  sessionsByClass: Map<string, any[]>,
  attendanceByStudentClass: Map<string, any[]>,
  month: string
) {
  const breakdown = [];
  let totalDays = 0;
  let totalAmount = 0;

  for (const enrollment of studentEnrollments(student)) {
    const sessions = sessionsByClass.get(enrollment.classId) || [];
    const regularSessions = sessions.filter((session: any) => session.kind === "regular");
    if (enrollment.class.billingPolicy === "monthly_prorated" && regularSessions.length === 0) {
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
      attendance: attendanceByStudentClass.get(
        countKey(student.id, enrollment.classId),
      ) || [],
    });

    breakdown.push({
      class_id: enrollment.classId,
      class_name: enrollment.class.className,
      teacher_name: enrollment.class.teacher?.fullName || null,
      fee_per_day: tuition.feePerSession,
      days_count: tuition.chargedSessions,
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

  return { breakdown, totalDays, totalAmount };
}

function groupSessionsByClass(sessionRows: any[]) {
  const sessionsByClass = new Map<string, any[]>();
  for (const session of sessionRows) {
    const rows = sessionsByClass.get(session.classId) || [];
    rows.push(session);
    sessionsByClass.set(session.classId, rows);
  }
  return sessionsByClass;
}

function groupAttendanceByStudentClass(attendanceRows: any[]) {
  const attendanceByStudentClass = new Map<string, any[]>();
  for (const attendance of attendanceRows) {
    const key = countKey(attendance.studentId, attendance.classId);
    const rows = attendanceByStudentClass.get(key) || [];
    rows.push(attendance);
    attendanceByStudentClass.set(key, rows);
  }
  return attendanceByStudentClass;
}

function feePeriodIsLocked(
  classIds: string[],
  attendancePeriods: any[],
  classMonthPlans: any[],
) {
  const periodStatuses = new Map(
    attendancePeriods.map((period: any) => [period.classId, period.status]),
  );
  const planStates = new Map(
    classMonthPlans.map((plan: any) => [plan.classId, plan.state]),
  );
  return classIds.every((classId) =>
    periodStatuses.get(classId) === "locked" && planStates.get(classId) === "frozen",
  );
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
  const legacyEnrollmentWindow = {
    status: "active",
    enrollmentDate: { lte: endDate },
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
      monthlyFees: {
        where: { month },
        include: monthlyFeeProtectionInclude,
      },
      enrollmentPeriods: {
        where: enrollmentWindow,
        include: { class: { include: { teacher: true } } },
      },
      studentClasses: {
        where: legacyEnrollmentWindow,
        include: { class: { include: { teacher: true } } },
      },
    },
    orderBy: { fullName: "asc" },
  });
  const studentIds = students.map((student: any) => student.id);
  const classIds = Array.from(new Set<string>(
    students.flatMap((student: any) =>
      studentEnrollments(student).map((enrollment: any) => enrollment.classId),
    ),
  ));
  const [sessionRows, attendanceRows] = dryRun && studentIds.length > 0 && classIds.length > 0
    ? await Promise.all([
        prisma.classSession.findMany({
          where: { classId: { in: classIds }, billingMonth: month },
          orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
        }),
        prisma.attendance.findMany({
          where: {
            studentId: { in: studentIds },
            classId: { in: classIds },
            attendanceDate: { gte: startDate, lte: endDate },
          },
          select: {
            studentId: true,
            classId: true,
            classSessionId: true,
            attendanceDate: true,
            status: true,
          },
        }),
      ])
    : [[], []];
  const sessionsByClass = groupSessionsByClass(sessionRows);
  const attendanceByStudentClass = groupAttendanceByStudentClass(attendanceRows);

  const calculations = new Map<string, ReturnType<typeof calculateStudentFee>>();
  if (dryRun) {
    for (const student of students) {
      const existing = student.monthlyFees?.[0] || null;
      if (!studentEnrollments(student).length) continue;
      if (existing && isProtectedMonthlyFee(existing)) continue;
      calculations.set(
        student.id,
        calculateStudentFee(student, sessionsByClass, attendanceByStudentClass, month),
      );
    }
  }

  const items: GenerateItem[] = [];
  for (const student of students) {
    const existing = student.monthlyFees?.[0] || null;
    const calculation = calculations.get(student.id);
    const { breakdown = [], totalDays = 0, totalAmount = 0 } = calculation || {};

    if (dryRun && !student.enrollmentPeriods?.length && !student.studentClasses?.length) {
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

    if (dryRun) {
      if (existing && isProtectedMonthlyFee(existing)) {
        items.push({
          student_id: student.id,
          student_name: student.fullName,
          month,
          total_days: existing.totalDays,
          total_amount: existing.totalAmount,
          existing_status: existing.status,
          action: "skipped",
          reason: `PROTECTED_${existing.status.toUpperCase()}`,
        });
        continue;
      }

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

    const writeResult = await runSerializableTransaction(prisma, async (tx: any) => {
      await acquireAttendanceFeeAdvisoryLocks(tx, [student.id], month);
      let fee = await tx.monthlyFee.findUnique({
        where: { studentId_month: { studentId: student.id, month } },
        include: monthlyFeeProtectionInclude,
      });
      if (fee && isProtectedMonthlyFee(fee)) {
        return { kind: "protected" as const, fee };
      }

      const authoritativeStudent = await tx.student.findUnique({
        where: { id: student.id },
        include: {
          enrollmentPeriods: {
            where: enrollmentWindow,
            include: { class: { include: { teacher: true } } },
          },
          studentClasses: {
            where: legacyEnrollmentWindow,
            include: { class: { include: { teacher: true } } },
          },
        },
      });
      if (!authoritativeStudent || authoritativeStudent.deletedAt) {
        return { kind: "state_changed" as const, fee, reason: "STATE_CHANGED" };
      }

      const authoritativeEnrollments = studentEnrollments(authoritativeStudent);
      if (!authoritativeEnrollments.length) {
        return { kind: "state_changed" as const, fee, reason: "NO_ACTIVE_CLASS" };
      }

      const authoritativeClassIds = authoritativeEnrollments.map(
        (enrollment: any) => enrollment.classId,
      );
      const [authoritativeSessions, authoritativeAttendance, attendancePeriods, classMonthPlans] =
        await Promise.all([
          tx.classSession.findMany({
            where: {
              classId: { in: authoritativeClassIds },
              billingMonth: month,
            },
            orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
          }),
          tx.attendance.findMany({
            where: {
              studentId: student.id,
              classId: { in: authoritativeClassIds },
              attendanceDate: { gte: startDate, lte: endDate },
            },
            select: {
              studentId: true,
              classId: true,
              classSessionId: true,
              attendanceDate: true,
              status: true,
            },
          }),
          tx.attendancePeriod.findMany({
            where: {
              classId: { in: authoritativeClassIds },
              periodMonth: month,
            },
            select: { classId: true, status: true },
          }),
          tx.classMonthPlan.findMany({
            where: {
              classId: { in: authoritativeClassIds },
              billingMonth: month,
            },
            select: { classId: true, state: true },
          }),
        ]);

      if (!feePeriodIsLocked(authoritativeClassIds, attendancePeriods, classMonthPlans)) {
        return {
          kind: "fee_period_not_locked" as const,
          fee,
          reason: "FEE_PERIOD_NOT_LOCKED" as const,
        };
      }

      const authoritativeCalculation = calculateStudentFee(
        authoritativeStudent,
        groupSessionsByClass(authoritativeSessions),
        groupAttendanceByStudentClass(authoritativeAttendance),
        month,
      );
      const {
        breakdown: authoritativeBreakdown,
        totalDays: authoritativeTotalDays,
        totalAmount: authoritativeTotalAmount,
      } = authoritativeCalculation;

      const updatingExisting = Boolean(fee);
      const previousStatus = fee?.status || null;
      if (fee) {
        const updated = await tx.monthlyFee.updateMany({
          where: {
            id: fee.id,
            status: { in: ["pending", "ready"] },
            receiptId: null,
            paidAt: null,
          },
          data: {
            totalDays: authoritativeTotalDays,
            totalAmount: authoritativeTotalAmount,
            status: "ready",
          },
        });
        if (updated.count !== 1) {
          const currentFee = await tx.monthlyFee.findUnique({
            where: { studentId_month: { studentId: student.id, month } },
            include: monthlyFeeProtectionInclude,
          });
          if (currentFee && isProtectedMonthlyFee(currentFee)) {
            return { kind: "protected" as const, fee: currentFee };
          }
          return {
            kind: "state_changed" as const,
            fee: currentFee,
            reason: "STATE_CHANGED" as const,
          };
        }
        fee = await tx.monthlyFee.findUniqueOrThrow({ where: { id: fee.id } });
      } else {
        fee = await tx.monthlyFee.create({
          data: {
            studentId: student.id,
            month,
            totalDays: authoritativeTotalDays,
            totalAmount: authoritativeTotalAmount,
            status: "ready",
          },
        });
      }
      const lines = await syncMonthlyFeeLines(tx, fee, authoritativeBreakdown);
      return {
        kind: "written" as const,
        fee,
        lines,
        updatingExisting,
        previousStatus,
        student: authoritativeStudent,
        calculation: authoritativeCalculation,
      };
    }, { transactionOptions: GENERATOR_TRANSACTION_OPTIONS });

    if (writeResult.kind === "protected") {
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: writeResult.fee.totalDays,
        total_amount: writeResult.fee.totalAmount,
        existing_status: writeResult.fee.status,
        action: "skipped",
        reason: `PROTECTED_${writeResult.fee.status.toUpperCase()}`,
      });
      continue;
    }

    if (writeResult.kind === "state_changed") {
      const currentFee = writeResult.fee || existing;
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: currentFee?.totalDays || 0,
        total_amount: currentFee?.totalAmount || 0,
        existing_status: currentFee?.status || null,
        action: "skipped",
        reason: writeResult.reason,
      });
      continue;
    }

    if (writeResult.kind === "fee_period_not_locked") {
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: writeResult.fee?.totalDays || 0,
        total_amount: writeResult.fee?.totalAmount || 0,
        existing_status: writeResult.fee?.status || null,
        action: "skipped",
        reason: writeResult.reason,
      });
      continue;
    }

    const {
      totalDays: writtenTotalDays,
      totalAmount: writtenTotalAmount,
    } = writeResult.calculation;

    if (writeResult.updatingExisting) {
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: writtenTotalDays,
        total_amount: writtenTotalAmount,
        existing_status: writeResult.previousStatus,
        action: "updated",
        lines: writeResult.lines.map((line: any) =>
          monthlyFeeLineToDto(line, writeResult.student),
        ),
      });
    } else {
      items.push({
        student_id: student.id,
        student_name: student.fullName,
        month,
        total_days: writtenTotalDays,
        total_amount: writtenTotalAmount,
        existing_status: null,
        action: "created",
        lines: writeResult.lines.map((line: any) =>
          monthlyFeeLineToDto(line, writeResult.student),
        ),
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
