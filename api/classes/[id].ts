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

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return errorResponse(res, "INVALID_ID", "Class ID is required", 400);
  }

  // GET - Get single class with enrolled students
  if (req.method === "GET") {
    try {
      const classData = await prisma.class.findUnique({
        where: { id },
        include: {
          teacher: { select: { id: true, fullName: true, phone: true } },
          studentClasses: {
            where: { status: "active" },
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                  status: true,
                  parent: { select: { fullName: true, phone: true } },
                },
              },
            },
          },
        },
      });

      if (!classData) {
        return errorResponse(res, "NOT_FOUND", "Class not found", 404);
      }

      // Transform to snake_case
      const result = {
        id: classData.id,
        class_name: classData.className,
        schedule_days: classData.scheduleDays,
        start_time: classData.startTime,
        end_time: classData.endTime,
        fee_per_day: classData.feePerDay,
        max_students: classData.maxStudents,
        status: classData.status,
        notes: classData.notes,
        teacher_id: classData.teacherId,
        teacher_name: classData.teacher?.fullName,
        teacher_phone: classData.teacher?.phone,
        students: classData.studentClasses.map((sc: any) => ({
          id: sc.student.id,
          full_name: sc.student.fullName,
          phone: sc.student.phone,
          status: sc.student.status,
          parent_name: sc.student.parent?.fullName,
          parent_phone: sc.student.parent?.phone,
          enrollment_date: sc.enrollmentDate,
        })),
        student_count: classData.studentClasses.length,
        created_at: classData.createdAt,
      };

      return successResponse(res, result);
    } catch (error) {
      console.error("Get class error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // PUT - Update class
  if (req.method === "PUT") {
    // Only admin can update classes
    if (authUser.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      const {
        class_name,
        schedule_days,
        start_time,
        end_time,
        fee_per_day,
        max_students,
        teacher_id,
        status,
        notes,
        // New flexible schedule fields
        schedule_type,
        days_per_month,
        allow_makeup_days,
      } = req.body;

      // Check if class exists
      const existing = await prisma.class.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, "NOT_FOUND", "Class not found", 404);
      }

      // Verify teacher if changing
      if (teacher_id && teacher_id !== existing.teacherId) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: teacher_id },
        });
        if (!teacher) {
          return errorResponse(
            res,
            "TEACHER_NOT_FOUND",
            "Teacher not found",
            404
          );
        }
      }

      // Update class
      const classData = await prisma.class.update({
        where: { id },
        data: {
          ...(class_name && { className: class_name }),
          ...(schedule_days !== undefined && { scheduleDays: schedule_days }),
          ...(start_time && { startTime: start_time }),
          ...(end_time && { endTime: end_time }),
          ...(fee_per_day !== undefined && { feePerDay: fee_per_day }),
          ...(max_students !== undefined && { maxStudents: max_students }),
          ...(teacher_id !== undefined && { teacherId: teacher_id || null }),
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
          // Flexible schedule fields - will be added after schema migration
          // ...(schedule_type && { scheduleType: schedule_type }),
          // ...(days_per_month !== undefined && { daysPerMonth: days_per_month }),
          // ...(allow_makeup_days !== undefined && { allowMakeupDays: allow_makeup_days }),
        },
      });

      return successResponse(res, {
        class: {
          id: classData.id,
          class_name: classData.className,
          status: classData.status,
        },
        message: "Class updated successfully",
      });
    } catch (error) {
      console.error("Update class error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // DELETE - Delete class
  if (req.method === "DELETE") {
    // Only admin can delete
    if (authUser.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      // Check if class exists
      const existing = await prisma.class.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, "NOT_FOUND", "Class not found", 404);
      }

      // Check for active students
      const activeEnrollments = await prisma.studentClass.count({
        where: { classId: id, status: "active" },
      });
      if (activeEnrollments > 0) {
        return errorResponse(
          res,
          "HAS_ACTIVE_STUDENTS",
          `Cannot delete class with ${activeEnrollments} enrolled students`,
          400
        );
      }

      // Delete class (cascade will handle related records)
      await prisma.class.delete({ where: { id } });

      return successResponse(res, { message: "Class deleted successfully" });
    } catch (error) {
      console.error("Delete class error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
