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
    return errorResponse(res, "INVALID_ID", "Parent ID is required", 400);
  }

  // GET - Get single parent by ID
  if (req.method === "GET") {
    try {
      const parent = await prisma.parent.findUnique({
        where: { id },
        include: {
          students: {
            select: {
              id: true,
              fullName: true,
              status: true,
              studentClasses: {
                where: { status: "active" },
                include: { class: { select: { className: true } } },
              },
            },
          },
        },
      });

      if (!parent) {
        return errorResponse(res, "NOT_FOUND", "Parent not found", 404);
      }

      // Transform to snake_case
      const result = {
        id: parent.id,
        full_name: parent.fullName,
        phone: parent.phone,
        email: parent.email,
        address: parent.address,
        relationship: parent.relationship,
        notes: parent.notes,
        children: parent.students.map((s: any) => ({
          id: s.id,
          full_name: s.fullName,
          status: s.status,
          class_names: s.studentClasses
            ?.map((sc: any) => sc.class?.className)
            .filter(Boolean)
            .join(", "),
        })),
        created_at: parent.createdAt,
      };

      return successResponse(res, { parent: result });
    } catch (error) {
      console.error("Get parent error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // PUT - Update parent
  if (req.method === "PUT") {
    try {
      const { full_name, phone, email, address, relationship, notes } =
        req.body;

      // Check if parent exists
      const existing = await prisma.parent.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, "NOT_FOUND", "Parent not found", 404);
      }

      // Check for phone uniqueness if changing
      if (phone && phone !== existing.phone) {
        const phoneExists = await prisma.parent.findFirst({
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

      // Update parent
      const parent = await prisma.parent.update({
        where: { id },
        data: {
          ...(full_name && { fullName: full_name }),
          ...(phone && { phone }),
          ...(email !== undefined && { email }),
          ...(address !== undefined && { address }),
          ...(relationship && { relationship }),
          ...(notes !== undefined && { notes }),
        },
      });

      return successResponse(res, {
        parent: {
          id: parent.id,
          full_name: parent.fullName,
        },
        message: "Parent updated successfully",
      });
    } catch (error) {
      console.error("Update parent error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // DELETE - Delete parent
  if (req.method === "DELETE") {
    // Only admin can delete
    if (authUser.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      // Check if parent exists
      const existing = await prisma.parent.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, "NOT_FOUND", "Parent not found", 404);
      }

      // Check if parent has children
      const childrenCount = await prisma.student.count({
        where: { parentId: id },
      });
      if (childrenCount > 0) {
        return errorResponse(
          res,
          "HAS_CHILDREN",
          `Cannot delete parent with ${childrenCount} linked students`,
          400
        );
      }

      // Delete parent
      await prisma.parent.delete({ where: { id } });

      return successResponse(res, { message: "Parent deleted successfully" });
    } catch (error) {
      console.error("Delete parent error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
