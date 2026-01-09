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
    return errorResponse(res, "INVALID_ID", "Student ID is required", 400);
  }

  // GET - Get single student by ID
  if (req.method === "GET") {
    try {
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          parent: { select: { id: true, fullName: true, phone: true } },
          studentClasses: {
            where: { status: "active" },
            include: {
              class: { select: { id: true, className: true, feePerDay: true } },
            },
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
        date_of_birth: student.dateOfBirth?.toISOString?.()?.split("T")[0],
        gender: student.gender,
        phone: student.phone,
        email: student.email,
        address: student.address,
        status: student.status,
        notes: student.notes,
        enrollment_date: student.enrollmentDate,
        parent_id: student.parentId,
        parent_name: student.parent?.fullName,
        parent_phone: student.parent?.phone,
        class_ids: student.studentClasses?.map((sc: any) => sc.classId) || [],
        classes:
          student.studentClasses?.map((sc: any) => ({
            id: sc.class?.id,
            class_name: sc.class?.className,
            fee_per_day: sc.class?.feePerDay,
          })) || [],
      };

      return successResponse(res, { student: result });
    } catch (error) {
      console.error("Get student error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // PUT - Update student
  if (req.method === "PUT") {
    try {
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

      // Check if student exists
      const existing = await prisma.student.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, "NOT_FOUND", "Student not found", 404);
      }

      // Update student data
      const student = await prisma.student.update({
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
      });

      // Update class enrollments if provided
      if (class_ids && Array.isArray(class_ids)) {
        // Delete existing enrollments
        await prisma.studentClass.deleteMany({
          where: { studentId: id },
        });

        // Create new enrollments
        if (class_ids.length > 0) {
          await prisma.studentClass.createMany({
            data: class_ids.map((classId: string) => ({
              studentId: id,
              classId,
              enrollmentDate: new Date(),
              status: "active" as const,
            })),
          });
        }
      }

      return successResponse(res, {
        student: {
          id: student.id,
          full_name: student.fullName,
          status: student.status,
        },
        message: "Student updated successfully",
      });
    } catch (error) {
      console.error("Update student error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // DELETE - Delete student
  if (req.method === "DELETE") {
    // Only admin can delete
    if (authUser.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      // Check if student exists
      const existing = await prisma.student.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, "NOT_FOUND", "Student not found", 404);
      }

      // Delete student (cascade will handle related records)
      await prisma.student.delete({ where: { id } });

      return successResponse(res, { message: "Student deleted successfully" });
    } catch (error) {
      console.error("Delete student error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
