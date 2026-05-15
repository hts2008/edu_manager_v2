import type { VercelResponse } from "@vercel/node";
import prisma from "../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../lib/auth.js";
import {
  getRequiredString,
  parseMonthRange,
  sendApiError,
} from "../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const studentId = getRequiredString(req.query.student_id, "student_id");
    const month = getRequiredString(req.query.month, "month");
    const { startDate, endDate } = parseMonthRange(month);

    const records = await prisma.attendance.findMany({
      where: {
        studentId,
        attendanceDate: { gte: startDate, lte: endDate },
        status: { in: ["present", "absent_with_fee"] },
      },
      include: {
        class: { select: { id: true, className: true, feePerDay: true } },
      },
      orderBy: [{ class: { className: "asc" } }, { attendanceDate: "asc" }],
    });

    const classMap = new Map<
      string,
      {
        classId: string;
        className: string;
        feePerDay: number;
        presentDays: number;
        absentFeeDays: number;
      }
    >();

    for (const record of records) {
      const current =
        classMap.get(record.classId) ||
        {
          classId: record.classId,
          className: record.class.className,
          feePerDay: record.class.feePerDay,
          presentDays: 0,
          absentFeeDays: 0,
        };

      if (record.status === "present") current.presentDays += 1;
      if (record.status === "absent_with_fee") current.absentFeeDays += 1;
      classMap.set(record.classId, current);
    }

    const items = Array.from(classMap.values()).map((item) => {
      const chargedDays = item.presentDays + item.absentFeeDays;
      return {
        class_id: item.classId,
        classId: item.classId,
        class_name: item.className,
        className: item.className,
        present_days: item.presentDays,
        presentDays: item.presentDays,
        absent_fee_days: item.absentFeeDays,
        absentFeeDays: item.absentFeeDays,
        charged_days: chargedDays,
        chargedDays,
        fee_per_day: item.feePerDay,
        feePerDay: item.feePerDay,
        fee_amount: chargedDays * item.feePerDay,
        feeAmount: chargedDays * item.feePerDay,
      };
    });

    const totalDays = items.reduce((sum, item) => sum + item.charged_days, 0);
    const totalFee = items.reduce((sum, item) => sum + item.fee_amount, 0);

    return successResponse(res, {
      items,
      total: totalFee,
      days_count: totalDays,
      fee_per_day: items[0]?.fee_per_day || 0,
      total_fee: totalFee,
    });
  } catch (error) {
    return sendApiError(res, error, "CALCULATE_FEE_ERROR");
  }
}

export default requireAuth(handler);
