import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  studentCreateSchema,
  studentUpdateSchema,
  validateBody,
} from "../../../lib/validation.js";
import {
  deactivateEnrollmentPeriods,
  syncStudentEnrollmentPeriods,
} from "../../../lib/enrollment.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  // GET - List all students OR single student by ID
  if (req.method === "GET") {
    try {
      const { id, search, status, limit = "100", offset = "0" } = req.query;
      const fields =
        typeof req.query.fields === "string" ? req.query.fields : undefined;
      const classId =
        typeof req.query.class_id === "string"
          ? req.query.class_id
          : typeof req.query.classId === "string"
            ? req.query.classId
            : undefined;
      const parentId =
        typeof req.query.parent_id === "string"
          ? req.query.parent_id
          : typeof req.query.parentId === "string"
            ? req.query.parentId
            : undefined;
      const includeDeleted = req.query.include_deleted === "true";

      // Single student retrieval
      if (id) {
        if (typeof id !== "string") {
          return errorResponse(
            res,
            "INVALID_ID",
            "Student ID must be a string",
            400,
          );
        }

        const student = await prisma.student.findFirst({
          where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
          include: {
            parent: { select: { id: true, fullName: true, phone: true } },
            studentClasses: {
              where: { status: "active" },
              include: { class: { select: { id: true, className: true } } },
            },
          },
        });

        if (!student) {
          return errorResponse(res, "NOT_FOUND", "Student not found", 404);
        }

        // Transform to snake_case
        const result = {
          id: student.id,
          full_name: student.fullName,
          date_of_birth:
            student.dateOfBirth?.toISOString?.()?.split("T")[0] ||
            student.dateOfBirth,
          gender: student.gender,
          phone: student.phone,
          email: student.email,
          address: student.address,
          status: student.status,
          notes: student.notes,
          enrollment_date: student.enrollmentDate,
          parent_id: student.parentId,
          parent_name: student.parent?.fullName || null,
          parent_phone: student.parent?.phone || null,
          classes: student.studentClasses.map((sc: any) => ({
            id: sc.class.id,
            class_name: sc.class.className,
            enrollment_status: sc.status,
          })),
          created_at: student.createdAt,
          deleted_at: student.deletedAt,
        };

        return successResponse(res, result);
      }

      // List all students
      const where: any = includeDeleted ? {} : { deletedAt: null };
      if (status && status !== "all") {
        where.status = status as string;
      }
      if (classId && classId !== "all") {
        where.studentClasses = {
          some: {
            classId,
            status: "active",
          },
        };
      }
      if (parentId && parentId !== "all") {
        where.parentId = parentId;
      }
      if (search) {
        where.OR = [
          { fullName: { contains: search as string, mode: "insensitive" } },
          { phone: { contains: search as string } },
          { email: { contains: search as string, mode: "insensitive" } },
        ];
      }

      if (fields === "options") {
        const [rawStudents, total] = await Promise.all([
          prisma.student.findMany({
            where,
            select: {
              id: true,
              fullName: true,
              parentId: true,
              status: true,
              parent: { select: { id: true, fullName: true, phone: true } },
            },
            orderBy: { fullName: "asc" },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
          }),
          prisma.student.count({ where }),
        ]);

        const students = rawStudents.map((s) => ({
          id: s.id,
          value: s.id,
          label: s.fullName,
          full_name: s.fullName,
          fullName: s.fullName,
          parent_id: s.parentId,
          parentId: s.parentId,
          parent_name: s.parent?.fullName || null,
          parentName: s.parent?.fullName || null,
          parent_phone: s.parent?.phone || null,
          parentPhone: s.parent?.phone || null,
          status: s.status,
        }));

        return successResponse(res, { students, total });
      }

      if (fields === "table") {
        const [rawStudents, total] = await Promise.all([
          prisma.student.findMany({
            where,
            select: {
              id: true,
              fullName: true,
              dateOfBirth: true,
              gender: true,
              status: true,
              parentId: true,
              parent: { select: { id: true, fullName: true, phone: true } },
              studentClasses: {
                where: { status: "active" },
                select: { class: { select: { id: true, className: true } } },
              },
              createdAt: true,
              deletedAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
          }),
          prisma.student.count({ where }),
        ]);

        const students = rawStudents.map((s: any) => ({
          id: s.id,
          full_name: s.fullName,
          date_of_birth:
            s.dateOfBirth?.toISOString?.()?.split("T")[0] || s.dateOfBirth,
          gender: s.gender,
          status: s.status,
          parent_id: s.parentId,
          parent_name: s.parent?.fullName || null,
          parent_phone: s.parent?.phone || null,
          class_names:
            s.studentClasses
              ?.map((sc: any) => sc.class?.className)
              .filter(Boolean)
              .join(", ") || null,
          class_ids:
            s.studentClasses
              ?.map((sc: any) => sc.class?.id)
              .filter(Boolean) || [],
          created_at: s.createdAt,
          deleted_at: s.deletedAt,
        }));

        return successResponse(res, { students, total });
      }

      const [rawStudents, total] = await Promise.all([
        prisma.student.findMany({
          where,
          include: {
            parent: { select: { id: true, fullName: true, phone: true } },
            studentClasses: {
              where: { status: "active" },
              include: { class: { select: { id: true, className: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: parseInt(limit as string),
          skip: parseInt(offset as string),
        }),
        prisma.student.count({ where }),
      ]);

      // Transform camelCase to snake_case for frontend compatibility
      const students = rawStudents.map((s: any) => ({
        id: s.id,
        full_name: s.fullName,
        date_of_birth:
          s.dateOfBirth?.toISOString?.()?.split("T")[0] || s.dateOfBirth,
        gender: s.gender,
        phone: s.phone,
        email: s.email,
        address: s.address,
        status: s.status,
        notes: s.notes,
        enrollment_date: s.enrollmentDate,
        parent_id: s.parentId,
        parent_name: s.parent?.fullName || null,
        parent_phone: s.parent?.phone || null,
        class_names:
          s.studentClasses
            ?.map((sc: any) => sc.class?.className)
            .filter(Boolean)
            .join(", ") || null,
        class_ids:
          s.studentClasses
            ?.map((sc: any) => sc.class?.id)
            .filter(Boolean) || [],
        created_at: s.createdAt,
        deleted_at: s.deletedAt,
      }));

      return successResponse(res, { students, total });
    } catch (error) {
      console.error("Students GET error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // POST - Create new student
  if (req.method === "POST") {
    try {
      const body = validateBody(studentCreateSchema, req.body);

      // Verify parent exists
      const parent = await prisma.parent.findFirst({
        where: { id: body.parent_id, deletedAt: null },
      });
      if (!parent) {
        return errorResponse(res, "PARENT_NOT_FOUND", "Parent not found", 404);
      }

      const student = await prisma.$transaction(async (tx) => {
        const created = await tx.student.create({
          data: {
            fullName: body.full_name,
            dateOfBirth: new Date(body.date_of_birth),
            gender: body.gender,
            parentId: body.parent_id,
            phone: body.phone,
            email: body.email,
            address: body.address,
            enrollmentDate: new Date(body.enrollment_date),
            notes: body.notes,
          },
          include: { parent: true },
        });
        await syncStudentEnrollmentPeriods(tx, {
          studentId: created.id,
          desiredClassIds: body.class_ids,
          effectiveAt: new Date(body.enrollment_date),
          source: "student_create",
        });
        return created;
      });

      return res.status(201).json({ success: true, data: student });
    } catch (error) {
      console.error("Create student error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // PUT - Update student
  if (req.method === "PUT") {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Student ID is required", 400);
      }

      const body = validateBody(studentUpdateSchema, req.body);

      const existingStudent = await prisma.student.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!existingStudent) {
        return errorResponse(res, "NOT_FOUND", "Student not found", 404);
      }

      const updatedStudent = await prisma.$transaction(async (tx) => {
        const updated = await tx.student.update({
          where: { id },
          data: {
            ...(body.full_name && { fullName: body.full_name }),
            ...(body.date_of_birth && { dateOfBirth: new Date(body.date_of_birth) }),
            ...(body.gender && { gender: body.gender }),
            ...(body.parent_id && { parentId: body.parent_id }),
            ...(body.phone !== undefined && { phone: body.phone }),
            ...(body.email !== undefined && { email: body.email }),
            ...(body.address !== undefined && { address: body.address }),
            ...(body.status && { status: body.status }),
            ...(body.notes !== undefined && { notes: body.notes }),
          },
          include: { parent: true },
        });
        if (body.class_ids !== undefined) {
          await syncStudentEnrollmentPeriods(tx, {
            studentId: id,
            desiredClassIds: body.class_ids,
            source: "student_update",
          });
        }
        return updated;
      });

      return successResponse(res, { student: updatedStudent });
    } catch (error) {
      console.error("Update student error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // DELETE - Delete student
  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Student ID is required", 400);
      }

      const student = await prisma.student.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });

      if (!student) {
        return errorResponse(res, "NOT_FOUND", "Student not found", 404);
      }

      await prisma.$transaction(async (tx) => {
        await deactivateEnrollmentPeriods(tx, { studentId: id });
        await tx.student.update({
          where: { id },
          data: { status: "inactive", deletedAt: new Date() },
        });
      });

      return successResponse(res, { message: "Student moved to recycle bin" });
    } catch (error) {
      console.error("Delete student error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
