import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  // GET - List all parents OR single parent by ID
  if (req.method === "GET") {
    try {
      const { id } = req.query;
      const includeDeleted = req.query.include_deleted === "true";

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

        const parent = await prisma.parent.findFirst({
          where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
          include: {
            students: {
              where: includeDeleted ? {} : { deletedAt: null },
              select: { id: true, fullName: true, status: true },
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
          })),
          created_at: parent.createdAt,
          deleted_at: parent.deletedAt,
        };

        return successResponse(res, result);
      }

      // List all parents
      const rawParents = await prisma.parent.findMany({
        where: includeDeleted ? {} : { deletedAt: null },
        orderBy: { fullName: "asc" },
        include: {
          students: {
            where: includeDeleted ? {} : { deletedAt: null },
            select: { id: true },
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
        children_count: p.students?.length || 0,
        created_at: p.createdAt,
        deleted_at: p.deletedAt,
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

      const data = {
        fullName: full_name,
        phone,
        email: email || null,
        address: address || null,
        relationship: relationship || "father",
        notes: notes || null,
      };
      const deletedParent = await prisma.parent.findFirst({
        where: { phone, deletedAt: { not: null } },
      });
      const parent = deletedParent
        ? await prisma.parent.update({
            where: { id: deletedParent.id },
            data: { ...data, deletedAt: null },
          })
        : await prisma.parent.create({ data });

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

      const existingParent = await prisma.parent.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      if (!existingParent) {
        return errorResponse(res, "NOT_FOUND", "Parent not found", 404);
      }

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

      const parent = await prisma.parent.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });

      if (!parent) {
        return errorResponse(res, "NOT_FOUND", "Parent not found", 404);
      }

      await prisma.parent.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return successResponse(res, { message: "Parent moved to recycle bin" });
    } catch (error) {
      console.error("Delete parent error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
