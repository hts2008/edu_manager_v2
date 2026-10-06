import bcrypt from "bcryptjs";
import type { VercelResponse } from "../../../../lib/vercel-types.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  successResponse,
} from "../../../../lib/auth.js";
import { requirePermission } from "../../../../lib/require-permission.js";
import { ApiError, getString, sendApiError } from "../../../../lib/api-utils.js";
import { userResetPasswordSchema, validateBody } from "../../../../lib/validation.js";
import { userToDto } from "../shared.js";

export async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const id = getString(req.query.id);
    if (!id) throw new ApiError("MISSING_ID", "id is required", 400);

    const existing = await req.db.user.findUnique({ where: { id } });
    if (!existing) throw new ApiError("USER_NOT_FOUND", "User not found", 404);

    const payload = validateBody(userResetPasswordSchema, req.body);
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await req.db.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      await tx.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updatedUser;
    });

    return successResponse(res, { user: userToDto(user), message: "Password reset" });
  } catch (error) {
    return sendApiError(res, error, "USER_RESET_PASSWORD_ERROR");
  }
}

export default requirePermission("users.reset_password", handler);
