import type { VercelResponse } from "@vercel/node";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  logActivity,
  sendApiError,
} from "../../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const fee = await prisma.monthlyFee.findUnique({ where: { id } });
    if (!fee) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);
    if (!["ready", "pending"].includes(fee.status)) {
      throw new ApiError(
        "INVALID_STATUS",
        `Cannot confirm: current status is ${fee.status}`,
        400
      );
    }

    const updated = await prisma.monthlyFee.update({
      where: { id },
      data: { status: "confirmed" },
    });
    await logActivity(req, req.user.id, "CONFIRM_MONTHLY_FEE", "monthly_fee", id);

    return successResponse(res, {
      id: updated.id,
      status: updated.status,
      total_amount: updated.totalAmount,
    });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_CONFIRM_ERROR");
  }
}

export default requireAuth(handler);
