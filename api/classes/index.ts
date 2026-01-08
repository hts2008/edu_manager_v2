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

  // GET - List all classes
  if (req.method === "GET") {
    try {
      const { status } = req.query;

      const where: any = {};
      if (status && status !== "all") {
        where.status = status as string;
      }

      const classes = await prisma.class.findMany({
        where,
        include: {
          teacher: { select: { id: true, fullName: true } },
          _count: {
            select: {
              studentClasses: { where: { status: "active" } },
            },
          },
        },
        orderBy: { className: "asc" },
      });

      // Map to expected format
      const formatted = classes.map((c) => ({
        ...c,
        student_count: c._count.studentClasses,
      }));

      return successResponse(res, { classes: formatted });
    } catch (error) {
      console.error("Classes list error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // POST - Create new class
  if (req.method === "POST") {
    try {
      const {
        class_name,
        schedule_days,
        start_time,
        end_time,
        fee_per_day,
        max_students,
        teacher_id,
        notes,
      } = req.body;

      if (
        !class_name ||
        !schedule_days ||
        !start_time ||
        !end_time ||
        !fee_per_day
      ) {
        return errorResponse(
          res,
          "MISSING_FIELDS",
          "Required fields missing",
          400
        );
      }

      const newClass = await prisma.class.create({
        data: {
          className: class_name,
          scheduleDays: schedule_days,
          startTime: start_time,
          endTime: end_time,
          feePerDay: parseFloat(fee_per_day),
          maxStudents: max_students || 50,
          teacherId: teacher_id || null,
          notes,
        },
        include: { teacher: true },
      });

      return res.status(201).json({ success: true, data: newClass });
    } catch (error) {
      console.error("Create class error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
