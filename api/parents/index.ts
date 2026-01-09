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
      const rawParents = await prisma.parent.findMany({
        orderBy: { fullName: "asc" },
        include: {
          _count: {
            select: { students: true },
          },
        },
      });

      // Transform camelCase to snake_case for frontend
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
      console.error("Get parents error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  if (req.method === "POST") {
    try {
      const { full_name, phone, email, address, relationship, notes } =
        req.body;

      if (!full_name) {
        return errorResponse(
          res,
          "VALIDATION_ERROR",
          "Parent name is required",
          400
        );
      }

      const parent = await prisma.parent.create({
        data: {
          fullName: full_name,
          phone: phone || null,
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

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
