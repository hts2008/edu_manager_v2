import type { VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  logActivity,
  sendApiError,
} from "../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const oldPassword = getRequiredString(req.body?.oldPassword, "oldPassword");
    const newPassword = getRequiredString(req.body?.newPassword, "newPassword");

    if (newPassword.length < 6) {
      throw new ApiError(
        "PASSWORD_TOO_SHORT",
        "New password must be at least 6 characters",
        400
      );
    }

    if (oldPassword === newPassword) {
      throw new ApiError(
        "PASSWORD_UNCHANGED",
        "New password must be different from old password",
        400
      );
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new ApiError("USER_NOT_FOUND", "User not found", 404);

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(
        "INVALID_OLD_PASSWORD",
        "Old password is incorrect",
        400
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    await logActivity(req, req.user.id, "PASSWORD_CHANGED", "user", req.user.id);

    return successResponse(res, { message: "Password changed" });
  } catch (error) {
    return sendApiError(res, error, "CHANGE_PASSWORD_ERROR");
  }
}

export default requireAuth(handler);
