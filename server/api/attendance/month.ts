import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const { class_id, month } = req.query;

    if (!class_id || !month) {
      return errorResponse(
        res,
        "MISSING_PARAMS",
        "class_id and month are required",
        400
      );
    }

    // Parse month (YYYY-MM format)
    const [year, m] = (month as string).split("-");
    const startDate = new Date(parseInt(year), parseInt(m) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(m), 0); // Last day of month

    const records = await prisma.attendance.findMany({
      where: {
        classId: class_id as string,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
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
    console.error("Attendance month error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}

export default requireAuth(handler);
