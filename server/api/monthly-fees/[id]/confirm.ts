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
import { acquireAttendanceFeeAdvisoryLocks } from "../../../../lib/attendance-lock-transaction.js";
import { runSerializableTransaction } from "../../../../lib/serializable-transaction.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const updated = await runSerializableTransaction(prisma, async (tx) => {
      const feeIdentity = await tx.monthlyFee.findUnique({
        where: { id },
        select: { studentId: true, month: true },
      });
      if (!feeIdentity) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);

      await acquireAttendanceFeeAdvisoryLocks(
        tx,
        [feeIdentity.studentId],
        feeIdentity.month,
      );
      const current = await tx.monthlyFee.findUnique({ where: { id } });
      if (!current) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);
      if (
        !["ready", "pending"].includes(current.status) ||
        current.receiptId ||
        current.paidAt
      ) {
        throw new ApiError(
          current.status === "paid"
            ? "MONTHLY_FEE_STATE_CONFLICT"
            : "INVALID_STATUS",
          `Cannot confirm: current status is ${current.status}`,
          current.status === "paid" || current.receiptId || current.paidAt ? 409 : 400,
        );
      }

      const claimed = await tx.monthlyFee.updateMany({
        where: {
          id,
          status: { in: ["ready", "pending"] },
          receiptId: null,
          paidAt: null,
        },
        data: { status: "confirmed" },
      });
      if (claimed.count !== 1) {
        throw new ApiError(
          "MONTHLY_FEE_STATE_CONFLICT",
          "Monthly fee changed while it was being confirmed",
          409,
          { retryable: true },
        );
      }

      return tx.monthlyFee.findUniqueOrThrow({ where: { id } });
    }, {
      maxAttempts: 3,
      baseDelayMs: 20,
      transactionOptions: {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 15_000,
      },
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
