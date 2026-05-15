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

  // GET - List all parents OR single parent by ID
  if (req.method === "GET") {
    try {
      const { id } = req.query;

      // Single parent retrieval
      if (id) {
        if (typeof id !== "string") {
          return errorResponse(
            res,
            "INVALID_ID",
            "Parent ID must be a string",
            400
          );
        }

        const parent = await prisma.parent.findUnique({
          where: { id },
          include: {
            students: { select: { id: true, fullName: true, status: true } },
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
          })),
          created_at: parent.createdAt,
        };

        return successResponse(res, result);
      }

      // List all parents
      const rawParents = await prisma.parent.findMany({
        orderBy: { fullName: "asc" },
        include: {
          _count: {
            select: { students: true },
          },
        },
      });

      const parents = rawParents.map((p: any) => ({
        id: p.id,
        full_name: p.fullName,
        phone: p.phone,
        email: p.email,
        address: p.address,
        relationship: p.relationship,
        notes: p.notes,
        children_count: p._count?.students || 0,
        created_at: p.createdAt,
      }));

      return successResponse(res, { parents });
    } catch (error) {
      console.error("Parents GET error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // POST - Create new parent
  if (req.method === "POST") {
    try {
      const { full_name, phone, email, address, relationship, notes } =
        req.body;

      if (!full_name || !phone) {
        return errorResponse(
          res,
          "VALIDATION_ERROR",
          "Parent name and phone are required",
          400
        );
      }

      const parent = await prisma.parent.create({
        data: {
          fullName: full_name,
          phone,
          email: email || null,
          address: address || null,
          relationship: relationship || "father",
          notes: notes || null,
        },
      });

      return successResponse(
        res,
        {
          parent: {
            id: parent.id,
            full_name: parent.fullName,
            phone: parent.phone,
            email: parent.email,
            address: parent.address,
            relationship: parent.relationship,
          },
        },
        201
      );
    } catch (error) {
      console.error("Create parent error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // PUT - Update parent
  if (req.method === "PUT") {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Parent ID is required", 400);
      }

      const { full_name, phone, email, address, relationship, notes } =
        req.body;

      const updatedParent = await prisma.parent.update({
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

      return successResponse(res, { parent: updatedParent });
    } catch (error) {
      console.error("Update parent error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // DELETE - Delete parent
  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Parent ID is required", 400);
      }

      // Check if parent has children
      const parentWithChildren = await prisma.parent.findUnique({
        where: { id },
        include: {
          _count: {
            select: { students: true },
          },
        },
      });

      if (!parentWithChildren) {
        return errorResponse(res, "NOT_FOUND", "Parent not found", 404);
      }

      if (parentWithChildren._count.students > 0) {
        return errorResponse(
          res,
          "HAS_CHILDREN",
          "Cannot delete parent with registered children",
          400
        );
      }

      await prisma.parent.delete({ where: { id } });

      return successResponse(res, { message: "Parent deleted successfully" });
    } catch (error) {
      console.error("Delete parent error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
