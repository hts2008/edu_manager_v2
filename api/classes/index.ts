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

  // GET - List all classes OR single class by ID
  if (req.method === "GET") {
    try {
      const { id, status } = req.query;

      // Single class retrieval
      if (id) {
        if (typeof id !== "string") {
          return errorResponse(
            res,
            "INVALID_ID",
            "Class ID must be a string",
            400
          );
        }

        const classData = await prisma.class.findUnique({
          where: { id },
          include: {
            teacher: { select: { id: true, fullName: true } },
            studentClasses: {
              where: { status: "active" },
              include: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    dateOfBirth: true,
                    gender: true,
                    phone: true,
                    parentId: true,
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
          teacher_name: classData.teacher?.fullName || null,
          students: classData.studentClasses.map((sc: any) => ({
            id: sc.student.id,
            full_name: sc.student.fullName,
            date_of_birth: sc.student.dateOfBirth,
            gender: sc.student.gender,
            phone: sc.student.phone,
            parent_id: sc.student.parentId,
            enrollment_status: sc.status,
          })),
          student_count: classData.studentClasses.length,
          created_at: classData.createdAt,
        };

        return successResponse(res, result);
      }

      // List all classes
      const where: any = {};
      if (status && status !== "all") {
        where.status = status as string;
      }

      const rawClasses = await prisma.class.findMany({
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

      // Map to snake_case format expected by frontend
      const classes = rawClasses.map((c: any) => ({
        id: c.id,
        class_name: c.className,
        schedule_days: c.scheduleDays,
        start_time: c.startTime,
        end_time: c.endTime,
        fee_per_day: c.feePerDay,
        max_students: c.maxStudents,
        status: c.status,
        notes: c.notes,
        teacher_id: c.teacherId,
        teacher_name: c.teacher?.fullName || null,
        student_count: c._count.studentClasses,
        created_at: c.createdAt,
      }));

      return successResponse(res, { classes });
    } catch (error) {
      console.error("Classes GET error:", error);
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

  // PUT - Update class
  if (req.method === "PUT") {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Class ID is required", 400);
      }

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
      } = req.body;

      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          ...(class_name && { className: class_name }),
          ...(schedule_days && { scheduleDays: schedule_days }),
          ...(start_time && { startTime: start_time }),
          ...(end_time && { endTime: end_time }),
          ...(fee_per_day && { feePerDay: parseFloat(fee_per_day) }),
          ...(max_students && { maxStudents: max_students }),
          ...(teacher_id !== undefined && { teacherId: teacher_id }),
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
        },
        include: { teacher: true },
      });

      return successResponse(res, { class: updatedClass });
    } catch (error) {
      console.error("Update class error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // DELETE - Delete class
  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Class ID is required", 400);
      }

      // Check if class has enrolled students
      const classWithStudents = await prisma.class.findUnique({
        where: { id },
        include: {
          _count: {
            select: { studentClasses: true },
          },
        },
      });

      if (!classWithStudents) {
        return errorResponse(res, "NOT_FOUND", "Class not found", 404);
      }

      if (classWithStudents._count.studentClasses > 0) {
        return errorResponse(
          res,
          "HAS_STUDENTS",
          "Cannot delete class with enrolled students",
          400
        );
      }

      await prisma.class.delete({ where: { id } });

      return successResponse(res, { message: "Class deleted successfully" });
    } catch (error) {
      console.error("Delete class error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
