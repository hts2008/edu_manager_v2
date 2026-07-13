import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  parseMonthRange,
  sendApiError,
} from "../../../lib/api-utils.js";
import {
  type MonthlyFeeLineInput,
  isProtectedMonthlyFee,
  monthlyFeeLineToDto,
  syncMonthlyFeeLines,
  refreshMonthlyFeeAggregateFromLines,
} from "../../../lib/monthly-fee-lines.js";
import { buildStudentTuitionV3 } from "../../../lib/tuition-v3-service.js";
import { acquireAttendanceFeeAdvisoryLocks } from "../../../lib/attendance-lock-transaction.js";
import { runSerializableTransaction } from "../../../lib/serializable-transaction.js";

const CALCULATE_TRANSACTION_OPTIONS = {
  isolationLevel: "Serializable" as const,
  maxWait: 5_000,
  timeout: 15_000,
};

type ManualFeePeriodReadiness = {
  classId: string;
  className?: string | null;
  attendancePeriodStatus?: string | null;
  classMonthPlanState?: string | null;
};

export function assertManualFeePeriodsLocked(
  classes: ManualFeePeriodReadiness[],
  month: string,
) {
  const blockedClasses = classes
    .filter(
      (classLine) =>
        classLine.attendancePeriodStatus !== "locked" ||
        classLine.classMonthPlanState !== "frozen",
    )
    .map((classLine) => ({
      class_id: classLine.classId,
      class_name: classLine.className || null,
      attendance_period_status: classLine.attendancePeriodStatus || null,
      class_month_plan_state: classLine.classMonthPlanState || null,
    }));

  if (blockedClasses.length === 0) return;

  throw new ApiError(
    "FEE_PERIOD_NOT_LOCKED",
    "Every class fee period must be locked and its month plan frozen before calculation",
    409,
    {
      month,
      required: {
        attendance_period_status: "locked",
        class_month_plan_state: "frozen",
      },
      classes: blockedClasses,
    },
  );
}

export function buildEnrollmentMap(student: any) {
  const enrollmentMap = new Map<string, any>();

  for (const period of student?.enrollmentPeriods || []) {
    const current = enrollmentMap.get(period.classId) || {
      classId: period.classId,
      class: period.class,
      periods: [],
    };
    current.periods.push({ startedAt: period.startedAt, endedAt: period.endedAt });
    enrollmentMap.set(period.classId, current);
  }

  for (const enrollment of student?.studentClasses || []) {
    if (enrollmentMap.has(enrollment.classId)) continue;
    enrollmentMap.set(enrollment.classId, {
      classId: enrollment.classId,
      class: enrollment.class,
      periods: [{ startedAt: enrollment.enrollmentDate, endedAt: null }],
    });
  }

  return enrollmentMap;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const studentId = getRequiredString(
      req.body?.student_id || req.body?.studentId,
      "student_id"
    );
    const month = getRequiredString(req.body?.month, "month");
    const { startDate, endDate } = parseMonthRange(month);

    const result = await runSerializableTransaction(prisma, async (tx) => {
      await acquireAttendanceFeeAdvisoryLocks(tx, [studentId], month);

      const student = await tx.student.findFirst({
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

      const breakdown: MonthlyFeeLineInput[] = [];
      let totalDays = 0;
      let totalAmount = 0;
      const enrollmentMap = buildEnrollmentMap(student);
      const classIds = [...enrollmentMap.keys()];
      const [attendancePeriods, classMonthPlans] = await Promise.all([
        tx.attendancePeriod.findMany({
          where: { classId: { in: classIds }, periodMonth: month },
          select: { classId: true, status: true },
        }),
        tx.classMonthPlan.findMany({
          where: { classId: { in: classIds }, billingMonth: month },
          select: { classId: true, state: true },
        }),
      ]);
      const periodStatusByClassId = new Map<string, string>(
        attendancePeriods.map((period: any) => [period.classId, period.status]),
      );
      const planStateByClassId = new Map<string, string>(
        classMonthPlans.map((plan: any) => [plan.classId, plan.state]),
      );

      assertManualFeePeriodsLocked(
        [...enrollmentMap.values()].map((enrollment) => ({
          classId: enrollment.classId,
          className: enrollment.class.className,
          attendancePeriodStatus: periodStatusByClassId.get(enrollment.classId),
          classMonthPlanState: planStateByClassId.get(enrollment.classId),
        })),
        month,
      );

      for (const enrollment of enrollmentMap.values()) {
        const [classSessions, attendanceRows] = await Promise.all([
          tx.classSession.findMany({
            where: { classId: enrollment.classId, billingMonth: month },
            orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
          }),
          tx.attendance.findMany({
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
          !classSessions.some((session: any) => session.kind === "regular")
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
          sessions: classSessions,
          attendance: attendanceRows,
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
          schedule_mode: tuition.scheduleMode,
          monthly_tuition: tuition.monthlyTuition,
          amount: tuition.amount,
          period_status: periodStatusByClassId.get(enrollment.classId) || null,
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

      if (breakdown.length === 0) {
        throw new ApiError("NO_ACTIVE_CLASS", "Student has no active class", 400);
      }

      const existing = await tx.monthlyFee.findUnique({
        where: { studentId_month: { studentId, month } },
        include: {
          lines: {
            select: {
              status: true,
              receiptId: true,
              paidAt: true,
              receiptLines: { select: { id: true } },
            },
          },
        },
      });

      if (existing && isProtectedMonthlyFee(existing)) {
        const alreadyPaid = existing.status === "paid";
        throw new ApiError(
          alreadyPaid ? "FEE_ALREADY_PAID" : "FEE_IMMUTABLE",
          alreadyPaid
            ? "Monthly fee is already fully paid"
            : "Confirmed or receipt-linked monthly fees cannot be recalculated",
          409
        );
      }

      if (!existing) {
        const created = await tx.monthlyFee.create({
          data: {
            studentId,
            month,
            totalDays,
            totalAmount,
            status: "ready",
          },
        });
        const lineItems = await syncMonthlyFeeLines(tx, created, breakdown);
        const refreshed = await refreshMonthlyFeeAggregateFromLines(tx, created.id);
        return { student, fee: refreshed || created, lines: lineItems, breakdown, totalDays, totalAmount };
      }

      const updated = await tx.monthlyFee.updateMany({
        where: {
          id: existing.id,
          status: { in: ["pending", "ready"] },
          receiptId: null,
          paidAt: null,
        },
        data: {
          totalDays,
          totalAmount,
          status: "ready",
        },
      });

      if (updated.count !== 1) {
        throw new ApiError(
          "MONTHLY_FEE_STATE_CONFLICT",
          "Monthly fee changed while recalculating",
          409
        );
      }

      const current = await tx.monthlyFee.findUniqueOrThrow({ where: { id: existing.id } });
      const lineItems = await syncMonthlyFeeLines(tx, current, breakdown);
      const refreshed = await refreshMonthlyFeeAggregateFromLines(tx, current.id);
      return { student, fee: refreshed || current, lines: lineItems, breakdown, totalDays, totalAmount };
    }, { transactionOptions: CALCULATE_TRANSACTION_OPTIONS });

    const { student, fee, lines, breakdown, totalDays, totalAmount } = result;

    return successResponse(res, {
      id: fee.id,
      student_id: fee.studentId,
      month: fee.month,
      total_days: fee.totalDays,
      total_amount: fee.totalAmount,
      status: fee.status,
      receipt_id: fee.receiptId,
      breakdown,
      lines: lines.map((line: any) => monthlyFeeLineToDto(line, student)),
      totalDays,
      totalAmount,
      fee,
    });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_CALCULATE_ERROR");
  }
}

export default requireAuth(handler);
