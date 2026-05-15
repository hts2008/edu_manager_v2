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

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        studentClasses: {
          where: { status: "active" },
          include: { class: true },
        },
      },
    });

    if (!student) throw new ApiError("STUDENT_NOT_FOUND", "Student not found", 404);

    const breakdown = [];
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
          status: { in: ["present", "absent_with_fee"] },
        },
        _count: { status: true },
      });

      const daysCount = counts.reduce((sum, item) => sum + item._count.status, 0);
      const feePerDay = enrollment.class.feePerDay;
      const amount = daysCount * feePerDay;

      breakdown.push({
        class_id: enrollment.classId,
        class_name: enrollment.class.className,
        fee_per_day: feePerDay,
        days_count: daysCount,
        amount,
        period_status: period?.status || null,
      });

      totalDays += daysCount;
      totalAmount += amount;
    }

    if (breakdown.length === 0) {
      throw new ApiError("NO_ACTIVE_CLASS", "Student has no active class", 400);
    }

    const existing = await prisma.monthlyFee.findUnique({
      where: { studentId_month: { studentId, month } },
    });

    if (existing?.status === "paid") {
      throw new ApiError("FEE_ALREADY_PAID", "Monthly fee is already paid", 400);
    }

    const fee = await prisma.monthlyFee.upsert({
      where: { studentId_month: { studentId, month } },
      create: {
        studentId,
        month,
        totalDays,
        totalAmount,
        status: "ready",
      },
      update: {
        totalDays,
        totalAmount,
        status: "ready",
        receiptId: null,
      },
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
      totalDays,
      totalAmount,
      fee,
    });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_CALCULATE_ERROR");
  }
}

export default requireAuth(handler);
