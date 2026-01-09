import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../../../lib/prisma.js";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";

// GET /api/classes/{id}/students - Get students enrolled in a class
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const authUser = verifyAuth(req);
  if (!authUser) {
    return errorResponse(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return errorResponse(res, "INVALID_ID", "Class ID is required", 400);
  }

  try {
    // Verify class exists
    const classData = await prisma.class.findUnique({
      where: { id },
      select: { id: true, className: true, status: true },
    });

    if (!classData) {
      return errorResponse(res, "NOT_FOUND", "Class not found", 404);
    }

    // Get enrolled students
    const enrollments = await prisma.studentClass.findMany({
      where: {
        classId: id,
        status: "active",
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            status: true,
            parent: {
              select: {
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        student: { fullName: "asc" },
      },
    });

    // Transform to snake_case
    const students = enrollments.map((e: any) => ({
      id: e.student.id,
      full_name: e.student.fullName,
      phone: e.student.phone,
      email: e.student.email,
      status: e.student.status,
      parent_name: e.student.parent?.fullName,
      parent_phone: e.student.parent?.phone,
      enrollment_date: e.enrollmentDate,
    }));

    return successResponse(res, {
      class_id: classData.id,
      class_name: classData.className,
      students,
      total: students.length,
    });
  } catch (error) {
    console.error("Get class students error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
