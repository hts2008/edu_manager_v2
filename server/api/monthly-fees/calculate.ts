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
  calculateTuitionForClass,
  CHARGEABLE_ATTENDANCE_STATUSES,
} from "../../../lib/tuition.js";
import {
  type MonthlyFeeLineInput,
  monthlyFeeLineToDto,
  syncMonthlyFeeLines,
  refreshMonthlyFeeAggregateFromLines,
} from "../../../lib/monthly-fee-lines.js";

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

    const student = await prisma.student.findFirst({
      where: { id: studentId, deletedAt: null },
      include: {
        studentClasses: {
          where: { status: "active" },
          include: { class: { include: { teacher: true } } },
        },
      },
    });

    if (!student) throw new ApiError("STUDENT_NOT_FOUND", "Student not found", 404);

    const breakdown: MonthlyFeeLineInput[] = [];
    let totalDays = 0;
    let totalAmount = 0;

    for (const enrollment of student.studentClasses) {
      const period = await prisma.attendancePeriod.findUnique({
        where: {
          classId_periodMonth: {
            classId: enrollment.classId,
            periodMonth: month,
          },
        },
      });

      const counts = await prisma.attendance.groupBy({
        by: ["status"],
        where: {
          studentId,
          classId: enrollment.classId,
          attendanceDate: { gte: startDate, lte: endDate },
          status: { in: [...CHARGEABLE_ATTENDANCE_STATUSES] as any },
        },
        _count: { status: true },
      });
      const makeUpSessions = await prisma.attendance.count({
        where: {
          studentId,
          classId: enrollment.classId,
          attendanceDate: { gte: startDate, lte: endDate },
          status: { in: [...CHARGEABLE_ATTENDANCE_STATUSES] as any },
          isMakeUp: true,
        },
      });

      const daysCount = counts.reduce((sum, item) => sum + item._count.status, 0);
      const tuition = calculateTuitionForClass(enrollment.class, month, daysCount);

      breakdown.push({
        class_id: enrollment.classId,
        class_name: enrollment.class.className,
        teacher_name: enrollment.class.teacher?.fullName || null,
        fee_per_day: tuition.feePerSession,
        days_count: daysCount,
        expected_sessions: tuition.expectedSessions,
        make_up_sessions: makeUpSessions,
        extra_sessions: Math.max(0, daysCount - tuition.expectedSessions),
        billing_mode: tuition.billingMode,
        schedule_mode: tuition.scheduleStrategy,
        monthly_tuition: tuition.monthlyTuition,
        amount: tuition.totalAmount,
        period_status: period?.status || null,
      });

      totalDays += daysCount;
      totalAmount += tuition.totalAmount;
    }

    if (breakdown.length === 0) {
      throw new ApiError("NO_ACTIVE_CLASS", "Student has no active class", 400);
    }

    const { fee, lines } = await prisma.$transaction(async (tx) => {
      const existing = await tx.monthlyFee.findUnique({
        where: { studentId_month: { studentId, month } },
      });

      if (existing?.status === "paid") {
        throw new ApiError(
          "FEE_ALREADY_PAID",
          "Monthly fee is already fully paid",
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
        return { fee: refreshed || created, lines: lineItems };
      }

      const updated = await tx.monthlyFee.updateMany({
        where: {
          id: existing.id,
          status: { in: ["pending", "ready", "confirmed"] },
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
      return { fee: refreshed || current, lines: lineItems };
    });

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
