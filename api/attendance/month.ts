import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../../lib/prisma.js";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const authUser = verifyAuth(req);
  if (!authUser) {
    return errorResponse(res, "UNAUTHORIZED", "Authentication required", 401);
  }

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
