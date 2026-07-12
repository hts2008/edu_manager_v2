import type { VercelResponse } from "../../../../lib/vercel-types.js";
import prisma from "../../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../../lib/auth.js";
import { ApiError, sendApiError } from "../../../../lib/api-utils.js";
import { bulkFeePaymentResponse } from "../bulk-pay.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const id = String(req.query?.id || "").trim();
    const batch = await prisma.bulkFeePaymentBatch.findFirst({
      where: { id, actorId: req.user.id },
      include: { items: { orderBy: { position: "asc" } } },
    });
    if (!batch) throw new ApiError("BATCH_NOT_FOUND", "Bulk payment batch not found", 404);
    return successResponse(res, bulkFeePaymentResponse(batch));
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_BULK_PAY_STATUS_ERROR");
  }
}

export default requireAuth(handler);
