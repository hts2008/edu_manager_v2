import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { getRequiredString, parseMonthRange, sendApiError } from "../../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const classId = getRequiredString(req.query.class_id, "class_id");
    const month = getRequiredString(req.query.month, "month");
    const { startDate, endDate } = parseMonthRange(month);

    const records = await prisma.attendance.findMany({
      where: {
        classId,
        attendanceDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        student: { select: { id: true, fullName: true } },
      },
      orderBy: [{ attendanceDate: "asc" }, { student: { fullName: "asc" } }],
    });

    // Transform to snake_case for frontend compatibility
    const attendance = records.map((r) => ({
      id: r.id,
      student_id: r.studentId,
      class_id: r.classId,
      attendance_date: r.attendanceDate.toISOString().split("T")[0], // YYYY-MM-DD format
      status: r.status,
      reason: r.reason,
      student_name: r.student.fullName,
    }));

    return successResponse(res, { attendance });
  } catch (error) {
    return sendApiError(res, error);
  }
}

export default requireAuth(handler);
