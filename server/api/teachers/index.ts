import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  // GET - List all teachers OR single teacher by ID
  if (req.method === "GET") {
    try {
      const { id, status } = req.query;

      // Single teacher retrieval
      if (id) {
        if (typeof id !== "string") {
          return errorResponse(
            res,
            "INVALID_ID",
            "Teacher ID must be a string",
            400
          );
        }

        const teacher = await prisma.teacher.findUnique({
          where: { id },
          include: {
            classes: { select: { id: true, className: true, status: true } },
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
          classes: teacher.classes.map((c: any) => ({
            id: c.id,
            class_name: c.className,
            status: c.status,
          })),
          created_at: teacher.createdAt,
        };

        return successResponse(res, result);
      }

      // List all teachers
      const where: any = {};
      if (status && status !== "all") {
        where.status = status as string;
      } else if (!status) {
        where.status = "active";
      }
      const rawTeachers = await prisma.teacher.findMany({
        where,
        orderBy: { fullName: "asc" },
      });

      const teachers = rawTeachers.map((t: any) => ({
        id: t.id,
        full_name: t.fullName,
        phone: t.phone,
        email: t.email,
        salary_type: t.salaryType,
        salary_amount: t.salaryAmount,
        status: t.status,
        notes: t.notes,
        created_at: t.createdAt,
      }));

      return successResponse(res, { teachers });
    } catch (error) {
      console.error("Teachers GET error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // POST - Create new teacher
  if (req.method === "POST") {
    if (req.user.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      const {
        full_name,
        phone,
        email,
        salary_type,
        salary_amount,
        status,
        notes,
      } = req.body;

      if (!full_name || !phone) {
        return errorResponse(
          res,
          "VALIDATION_ERROR",
          "Teacher name and phone are required",
          400
        );
      }

      const teacher = await prisma.teacher.create({
        data: {
          fullName: full_name,
          phone,
          email: email || null,
          salaryType: salary_type || "hourly",
          salaryAmount: salary_amount || 100000,
          status: status || "active",
          notes: notes || null,
        },
      });

      return successResponse(
        res,
        {
          teacher: {
            id: teacher.id,
            full_name: teacher.fullName,
            phone: teacher.phone,
            email: teacher.email,
            salary_type: teacher.salaryType,
            salary_amount: teacher.salaryAmount,
            status: teacher.status,
          },
        },
        201
      );
    } catch (error) {
      console.error("Create teacher error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // PUT - Update teacher
  if (req.method === "PUT") {
    if (req.user.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Teacher ID is required", 400);
      }

      const {
        full_name,
        phone,
        email,
        salary_type,
        salary_amount,
        status,
        notes,
      } = req.body;

      const updatedTeacher = await prisma.teacher.update({
        where: { id },
        data: {
          ...(full_name && { fullName: full_name }),
          ...(phone && { phone }),
          ...(email !== undefined && { email }),
          ...(salary_type && { salaryType: salary_type }),
          ...(salary_amount && { salaryAmount: salary_amount }),
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
        },
      });

      return successResponse(res, { teacher: updatedTeacher });
    } catch (error) {
      console.error("Update teacher error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // DELETE - Delete teacher
  if (req.method === "DELETE") {
    if (req.user.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Teacher ID is required", 400);
      }

      const teacherWithClasses = await prisma.teacher.findUnique({
        where: { id },
        include: {
          _count: {
            select: { classes: true },
          },
        },
      });

      if (!teacherWithClasses) {
        return errorResponse(res, "NOT_FOUND", "Teacher not found", 404);
      }

      await prisma.$transaction(async (tx) => {
        await tx.class.updateMany({
          where: { teacherId: id },
          data: { teacherId: null },
        });
        await tx.teacher.update({
          where: { id },
          data: { status: "inactive" },
        });
      });

      return successResponse(res, { message: "Teacher archived successfully" });
    } catch (error) {
      console.error("Delete teacher error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
