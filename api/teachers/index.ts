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

  if (req.method === "GET") {
    try {
      const rawTeachers = await prisma.teacher.findMany({
        orderBy: { fullName: "asc" },
      });

      // Transform camelCase to snake_case for frontend
      const teachers = rawTeachers.map((t: any) => ({
        id: t.id,
        full_name: t.fullName,
        phone: t.phone,
        email: t.email,
        subject: t.subject,
        salary_type: t.salaryType,
        salary_amount: t.salaryAmount,
        status: t.status,
        notes: t.notes,
        created_at: t.createdAt,
      }));

      return successResponse(res, { teachers });
    } catch (error) {
      console.error("Get teachers error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  if (req.method === "POST") {
    // Only admin can create teachers
    if (authUser.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

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

      if (!full_name) {
        return errorResponse(
          res,
          "VALIDATION_ERROR",
          "Teacher name is required",
          400
        );
      }

      const teacher = await prisma.teacher.create({
        data: {
          fullName: full_name,
          phone: phone || null,
          email: email || null,
          subject: subject || null,
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
            subject: teacher.subject,
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

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
