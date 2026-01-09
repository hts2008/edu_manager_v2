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

  // Only admin can manage teachers
  if (authUser.role !== "admin") {
    return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return errorResponse(res, "INVALID_ID", "Teacher ID is required", 400);
  }

  // GET - Get single teacher by ID
  if (req.method === "GET") {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { id },
        include: {
          classes: {
            where: { status: "active" },
            select: { id: true, className: true },
          },
        },
      });

      if (!teacher) {
        return errorResponse(res, "NOT_FOUND", "Teacher not found", 404);
      }

      // Transform to snake_case
      const result = {
        id: teacher.id,
        full_name: teacher.fullName,
        phone: teacher.phone,
        email: teacher.email,
        salary_type: teacher.salaryType,
        salary_amount: teacher.salaryAmount,
        status: teacher.status,
        notes: teacher.notes,
        classes: teacher.classes,
        created_at: teacher.createdAt,
      };

      return successResponse(res, { teacher: result });
    } catch (error) {
      console.error("Get teacher error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // PUT - Update teacher
  if (req.method === "PUT") {
    try {
      const {
        full_name,
        phone,
        email,
        subject,
        salary_type,
        salary_amount,
        status,
        notes,
      } = req.body;

      // Check if teacher exists
      const existing = await prisma.teacher.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, "NOT_FOUND", "Teacher not found", 404);
      }

      // Check for phone uniqueness if changing
      if (phone && phone !== existing.phone) {
        const phoneExists = await prisma.teacher.findFirst({
          where: { phone, id: { not: id } },
        });
        if (phoneExists) {
          return errorResponse(
            res,
            "DUPLICATE_PHONE",
            "Phone number already exists",
            400
          );
        }
      }

      // Update teacher
      const teacher = await prisma.teacher.update({
        where: { id },
        data: {
          ...(full_name && { fullName: full_name }),
          ...(phone && { phone }),
          ...(email !== undefined && { email }),
          ...(salary_type && { salaryType: salary_type }),
          ...(salary_amount !== undefined && { salaryAmount: salary_amount }),
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
        },
      });

      return successResponse(res, {
        teacher: {
          id: teacher.id,
          full_name: teacher.fullName,
          status: teacher.status,
        },
        message: "Teacher updated successfully",
      });
    } catch (error) {
      console.error("Update teacher error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // DELETE - Delete teacher
  if (req.method === "DELETE") {
    try {
      // Check if teacher exists
      const existing = await prisma.teacher.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, "NOT_FOUND", "Teacher not found", 404);
      }

      // Check if teacher has active classes
      const activeClasses = await prisma.class.count({
        where: { teacherId: id, status: "active" },
      });
      if (activeClasses > 0) {
        return errorResponse(
          res,
          "HAS_ACTIVE_CLASSES",
          `Cannot delete teacher with ${activeClasses} active classes`,
          400
        );
      }

      // Delete teacher
      await prisma.teacher.delete({ where: { id } });

      return successResponse(res, { message: "Teacher deleted successfully" });
    } catch (error) {
      console.error("Delete teacher error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
