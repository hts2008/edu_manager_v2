import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  classCreateSchema,
  classUpdateSchema,
  validateBody,
} from "../../../lib/validation.js";

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
          schedule_required: classData.scheduleRequired,
          sessions_per_week: classData.sessionsPerWeek,
          session_required: classData.sessionRequired,
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
        schedule_required: c.scheduleRequired,
        sessions_per_week: c.sessionsPerWeek,
        session_required: c.sessionRequired,
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
      const body = validateBody(classCreateSchema, req.body);

      const data: any = {
          className: body.class_name,
          scheduleDays: body.schedule_days ?? null,
          scheduleRequired: body.schedule_required || false,
          sessionsPerWeek: body.sessions_per_week || null,
          sessionRequired: body.session_required || false,
          startTime: body.start_time,
          endTime: body.end_time,
          feePerDay: body.fee_per_day,
          maxStudents: body.max_students || 50,
          teacherId: body.teacher_id || null,
          notes: body.notes,
      };

      const newClass = await prisma.class.create({
        data,
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

      const body = validateBody(classUpdateSchema, req.body);

      const data: any = {
          ...(body.class_name && { className: body.class_name }),
          ...(body.schedule_days !== undefined && { scheduleDays: body.schedule_days }),
          ...(body.schedule_required !== undefined && {
            scheduleRequired: body.schedule_required,
          }),
          ...(body.sessions_per_week !== undefined && {
            sessionsPerWeek: body.sessions_per_week || null,
          }),
          ...(body.session_required !== undefined && {
            sessionRequired: body.session_required,
          }),
          ...(body.start_time && { startTime: body.start_time }),
          ...(body.end_time && { endTime: body.end_time }),
          ...(body.fee_per_day && { feePerDay: body.fee_per_day }),
          ...(body.max_students && { maxStudents: body.max_students }),
          ...(body.teacher_id !== undefined && { teacherId: body.teacher_id }),
          ...(body.status && { status: body.status }),
          ...(body.notes !== undefined && { notes: body.notes }),
      };

      const updatedClass = await prisma.class.update({
        where: { id },
        data,
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
