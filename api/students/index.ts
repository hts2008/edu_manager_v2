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

  // GET - List all students
  if (req.method === "GET") {
    try {
      const { search, status, limit = "100", offset = "0" } = req.query;

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
      console.error("Students list error:", error);
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
          400
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

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
