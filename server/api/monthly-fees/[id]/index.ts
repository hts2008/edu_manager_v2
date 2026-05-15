import type { VercelResponse } from "@vercel/node";
import prisma from "../../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  parseMonthRange,
  sendApiError,
} from "../../../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const fee = await prisma.monthlyFee.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            parent: { select: { fullName: true, phone: true } },
            studentClasses: {
              where: { status: "active" },
              include: { class: true },
            },
          },
        },
        receipt: true,
      },
    });

    if (!fee) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);

    const { startDate, endDate } = parseMonthRange(fee.month);
    const breakdown = await Promise.all(
      fee.student.studentClasses.map(async (enrollment) => {
        const daysCount = await prisma.attendance.count({
          where: {
            studentId: fee.studentId,
            classId: enrollment.classId,
            attendanceDate: { gte: startDate, lte: endDate },
            status: { in: ["present", "absent_with_fee"] },
          },
        });
        return {
          class_id: enrollment.classId,
          class_name: enrollment.class.className,
          fee_per_day: enrollment.class.feePerDay,
          days_count: daysCount,
          amount: daysCount * enrollment.class.feePerDay,
        };
      })
    );

    return successResponse(res, {
      fee: {
        id: fee.id,
        student_id: fee.studentId,
        student_name: fee.student.fullName,
        parent_name: fee.student.parent?.fullName || null,
        parent_phone: fee.student.parent?.phone || null,
        month: fee.month,
        total_days: fee.totalDays,
        total_amount: fee.totalAmount,
        status: fee.status,
        receipt_id: fee.receiptId,
        paid_at: fee.paidAt,
        notes: fee.notes,
        created_at: fee.createdAt,
        updated_at: fee.updatedAt,
      },
      breakdown,
    });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_GET_ERROR");
  }
}

export default requireAuth(handler);
