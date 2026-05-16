import type { VercelResponse } from "../../../../lib/vercel-types.js";
import prisma from "../../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../../lib/auth.js";
import { ApiError, getString, sendApiError } from "../../../../lib/api-utils.js";
import { userUpdateSchema, validateBody } from "../../../../lib/validation.js";
import { userToDto } from "../shared.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const id = getString(req.query.id);
    if (!id) throw new ApiError("MISSING_ID", "id is required", 400);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new ApiError("USER_NOT_FOUND", "User not found", 404);

    if (req.method === "GET") {
      return successResponse(res, { user: userToDto(existing) });
    }

    if (req.method === "PUT") {
      const payload = validateBody(userUpdateSchema, req.body);
      if (id === req.user.userId && payload.status === "inactive") {
        throw new ApiError("SELF_DEACTIVATE_FORBIDDEN", "Cannot deactivate your own account", 400);
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(payload.full_name !== undefined ? { fullName: payload.full_name } : {}),
          ...(payload.role !== undefined ? { role: payload.role } : {}),
          ...(payload.email !== undefined ? { email: payload.email } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
        },
      });

      return successResponse(res, { user: userToDto(user) });
    }

    if (req.method === "DELETE") {
      if (id === req.user.userId) {
        throw new ApiError("SELF_DEACTIVATE_FORBIDDEN", "Cannot deactivate your own account", 400);
      }

      const user = await prisma.user.update({
        where: { id },
        data: { status: "inactive" },
      });

      return successResponse(res, { user: userToDto(user), message: "User deactivated" });
    }

    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET, PUT, and DELETE allowed", 405);
  } catch (error) {
    return sendApiError(res, error, "USER_DETAIL_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
