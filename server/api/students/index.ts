import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../../../lib/prisma.js";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const authUser = verifyAuth(req);
  if (!authUser) {
    return errorResponse(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  // GET - List all students OR single student by ID
  if (req.method === "GET") {
    try {
      const { id, search, status, limit = "100", offset = "0" } = req.query;

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

        const student = await prisma.student.findUnique({
          where: { id },
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
        };

        return successResponse(res, result);
      }

      // List all students
      const where: any = {};
      if (status && status !== "all") {
        where.status = status as string;
      }
      if (search) {
        where.OR = [
          { fullName: { contains: search as string, mode: "insensitive" } },
          { phone: { contains: search as string } },
          { email: { contains: search as string, mode: "insensitive" } },
        ];
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
        created_at: s.createdAt,
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
      const {
        full_name,
        date_of_birth,
        gender,
        parent_id,
        phone,
        email,
        address,
        enrollment_date,
        notes,
        class_ids,
      } = req.body;

      if (
        !full_name ||
        !date_of_birth ||
        !gender ||
        !parent_id ||
        !enrollment_date
      ) {
        return errorResponse(
          res,
          "MISSING_FIELDS",
          "Required fields missing",
          400,
        );
      }

      // Verify parent exists
      const parent = await prisma.parent.findUnique({
        where: { id: parent_id },
      });
      if (!parent) {
        return errorResponse(res, "PARENT_NOT_FOUND", "Parent not found", 404);
      }

      const student = await prisma.student.create({
        data: {
          fullName: full_name,
          dateOfBirth: new Date(date_of_birth),
          gender,
          parentId: parent_id,
          phone,
          email,
          address,
          enrollmentDate: new Date(enrollment_date),
          notes,
        },
        include: { parent: true },
      });

      // Enroll in classes if provided
      if (class_ids && Array.isArray(class_ids) && class_ids.length > 0) {
        await prisma.studentClass.createMany({
          data: class_ids.map((classId: string) => ({
            studentId: student.id,
            classId,
            enrollmentDate: new Date(),
          })),
        });
      }

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

      const {
        full_name,
        date_of_birth,
        gender,
        parent_id,
        phone,
        email,
        address,
        status,
        notes,
        class_ids,
      } = req.body;

      const updatedStudent = await prisma.student.update({
        where: { id },
        data: {
          ...(full_name && { fullName: full_name }),
          ...(date_of_birth && { dateOfBirth: new Date(date_of_birth) }),
          ...(gender && { gender }),
          ...(parent_id && { parentId: parent_id }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(address !== undefined && { address }),
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
        },
        include: { parent: true },
      });

      // Sync class enrollments if class_ids provided
      if (class_ids !== undefined && Array.isArray(class_ids)) {
        // Get ALL enrollments (including inactive) to handle re-enrollment
        const allEnrollments = await prisma.studentClass.findMany({
          where: { studentId: id },
          select: { classId: true, id: true, status: true },
        });
        const activeEnrollments = allEnrollments.filter(
          (e: any) => e.status === "active",
        );
        const inactiveEnrollments = allEnrollments.filter(
          (e: any) => e.status === "inactive",
        );
        const activeClassIds = activeEnrollments.map((e: any) => e.classId);
        const inactiveClassIds = inactiveEnrollments.map((e: any) => e.classId);

        // Find classes to deactivate, re-activate, or create new
        const toDeactivate = activeEnrollments.filter(
          (e: any) => !class_ids.includes(e.classId),
        );
        const toReactivate = inactiveEnrollments.filter((e: any) =>
          class_ids.includes(e.classId),
        );
        const toCreate = class_ids.filter(
          (cid: string) =>
            !activeClassIds.includes(cid) && !inactiveClassIds.includes(cid),
        );

        // Deactivate removed enrollments (soft delete)
        if (toDeactivate.length > 0) {
          await prisma.studentClass.updateMany({
            where: { id: { in: toDeactivate.map((e: any) => e.id) } },
            data: { status: "inactive" },
          });
        }

        // Re-activate previously inactive enrollments
        if (toReactivate.length > 0) {
          await prisma.studentClass.updateMany({
            where: { id: { in: toReactivate.map((e: any) => e.id) } },
            data: { status: "active", enrollmentDate: new Date() },
          });
        }

        // Create truly new enrollments (never existed before)
        if (toCreate.length > 0) {
          await prisma.studentClass.createMany({
            data: toCreate.map((classId: string) => ({
              studentId: id,
              classId,
              enrollmentDate: new Date(),
            })),
          });
        }
      }

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

      // Check if student has class enrollments
      const studentWithClasses = await prisma.student.findUnique({
        where: { id },
        include: {
          _count: {
            select: { studentClasses: true },
          },
        },
      });

      if (!studentWithClasses) {
        return errorResponse(res, "NOT_FOUND", "Student not found", 404);
      }

      if (studentWithClasses._count.studentClasses > 0) {
        return errorResponse(
          res,
          "HAS_CLASSES",
          "Cannot delete student with active class enrollments",
          400,
        );
      }

      await prisma.student.delete({ where: { id } });

      return successResponse(res, { message: "Student deleted successfully" });
    } catch (error) {
      console.error("Delete student error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
