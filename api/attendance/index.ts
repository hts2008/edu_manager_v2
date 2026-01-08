import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../../lib/prisma";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const authUser = verifyAuth(req);
  if (!authUser) {
    return errorResponse(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  // GET - Get attendance records
  if (req.method === "GET") {
    try {
      const { class_id, date, student_id, month } = req.query;

      const where: any = {};
      if (class_id) where.classId = class_id as string;
      if (student_id) where.studentId = student_id as string;
      if (date) where.attendanceDate = new Date(date as string);
      if (month) {
        const [year, m] = (month as string).split("-");
        const startDate = new Date(parseInt(year), parseInt(m) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(m), 0);
        where.attendanceDate = { gte: startDate, lte: endDate };
      }

      const records = await prisma.attendance.findMany({
        where,
        include: {
          student: { select: { id: true, fullName: true } },
          class: { select: { id: true, className: true } },
        },
        orderBy: [{ attendanceDate: "desc" }, { student: { fullName: "asc" } }],
      });

      return successResponse(res, records);
    } catch (error) {
      console.error("Attendance list error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // POST - Create single attendance record
  if (req.method === "POST") {
    try {
      const { student_id, class_id, attendance_date, status, reason } =
        req.body;

      if (!student_id || !class_id || !attendance_date || !status) {
        return errorResponse(
          res,
          "MISSING_FIELDS",
          "Required fields missing",
          400
        );
      }

      const record = await prisma.attendance.upsert({
        where: {
          studentId_classId_attendanceDate: {
            studentId: student_id,
            classId: class_id,
            attendanceDate: new Date(attendance_date),
          },
        },
        create: {
          studentId: student_id,
          classId: class_id,
          attendanceDate: new Date(attendance_date),
          status,
          reason,
          createdById: authUser.userId,
        },
        update: {
          status,
          reason,
        },
      });

      return res.status(201).json({ success: true, data: record });
    } catch (error) {
      console.error("Create attendance error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
