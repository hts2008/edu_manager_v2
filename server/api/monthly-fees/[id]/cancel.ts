import type { VercelResponse } from "../../../../lib/vercel-types.js";
import prisma from "../../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  logActivity,
  sendApiError,
} from "../../../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const released = await prisma.monthlyFee.updateMany({
      where: {
        id,
        status: "confirmed",
        receiptId: null,
        paidAt: null,
      },
      data: { status: "ready" },
    });

    if (released.count !== 1) {
      const current = await prisma.monthlyFee.findUnique({ where: { id } });
      if (!current) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);
      throw new ApiError(
        current.status === "paid"
          ? "MONTHLY_FEE_STATE_CONFLICT"
          : "INVALID_STATUS",
        `Cannot cancel: current status is ${current.status}`,
        current.status === "paid" || current.receiptId || current.paidAt ? 409 : 400
      );
    }

    const updated = await prisma.monthlyFee.findUniqueOrThrow({ where: { id } });
    await logActivity(req, req.user.id, "CANCEL_MONTHLY_FEE", "monthly_fee", id);

    return successResponse(res, { id: updated.id, status: updated.status });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_CANCEL_ERROR");
  }
}

export default requireAuth(handler);
