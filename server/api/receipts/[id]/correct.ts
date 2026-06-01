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
  getString,
  logActivity,
  sendApiError,
} from "../../../../lib/api-utils.js";
import {
  buildCorrectionNote,
  calculateStudentMonthlyFee,
  detectMonthlyFeeAnomaly,
  detectReceiptAnomaly,
} from "../../../../lib/finance-corrections.js";

function feeToDto(fee: any) {
  return {
    id: fee.id,
    student_id: fee.studentId,
    month: fee.month,
    total_days: fee.totalDays,
    total_amount: fee.totalAmount,
    status: fee.status,
    receipt_id: fee.receiptId,
    paid_at: fee.paidAt,
    notes: fee.notes,
    updated_at: fee.updatedAt,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  if (req.user.role !== "admin") {
    return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const reason = getString(req.body?.reason)?.trim();
    if (!reason || reason.length < 5) {
      throw new ApiError(
        "CORRECTION_REASON_REQUIRED",
        "Correction reason must be at least 5 characters",
        400
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.findFirst({
        where: { id, deletedAt: null },
        include: { monthlyFees: true },
      });
      if (!receipt) throw new ApiError("NOT_FOUND", "Receipt not found", 404);

      const linkedFee =
        receipt.monthlyFees.find((fee: any) => fee.receiptId === receipt.id) ||
        (await tx.monthlyFee.findUnique({
          where: {
            studentId_month: {
              studentId: receipt.studentId,
              month: receipt.month,
            },
          },
        }));
      const receiptAnomaly = detectReceiptAnomaly(receipt);
      const feeAnomaly = detectMonthlyFeeAnomaly(linkedFee);

      if (!receiptAnomaly && !feeAnomaly) {
        throw new ApiError(
          "RECEIPT_NOT_ANOMALOUS",
          "Receipt does not match the zero-day positive-amount correction policy",
          409
        );
      }

      if (
        linkedFee?.status === "paid" &&
        linkedFee.receiptId &&
        linkedFee.receiptId !== receipt.id
      ) {
        throw new ApiError(
          "MONTHLY_FEE_LINK_CONFLICT",
          "Monthly fee is linked to another receipt",
          409
        );
      }

      const calculated = await calculateStudentMonthlyFee(
        tx,
        receipt.studentId,
        receipt.month
      );
      const now = new Date();
      const correctionNote = buildCorrectionNote(receipt.notes, {
        reason,
        originalReceiptId: receipt.id,
      });

      await tx.receipt.update({
        where: { id: receipt.id },
        data: {
          deletedAt: now,
          notes: correctionNote,
        },
      });

      const monthlyFeeNote = buildCorrectionNote(linkedFee?.notes, {
        reason,
        originalReceiptId: receipt.id,
      });

      let fee;
      if (linkedFee) {
        const updated = await tx.monthlyFee.updateMany({
          where: {
            id: linkedFee.id,
            OR: [{ receiptId: receipt.id }, { receiptId: null }],
          },
          data: {
            totalDays: calculated.totalDays,
            totalAmount: calculated.totalAmount,
            status: "ready",
            receiptId: null,
            paidAt: null,
            notes: monthlyFeeNote,
          },
        });

        if (updated.count !== 1) {
          throw new ApiError(
            "MONTHLY_FEE_STATE_CONFLICT",
            "Monthly fee changed while correcting receipt",
            409
          );
        }

        fee = await tx.monthlyFee.findUniqueOrThrow({
          where: { id: linkedFee.id },
        });
      } else {
        fee = await tx.monthlyFee.create({
          data: {
            studentId: receipt.studentId,
            month: receipt.month,
            totalDays: calculated.totalDays,
            totalAmount: calculated.totalAmount,
            status: "ready",
            notes: monthlyFeeNote,
          },
        });
      }

      return {
        originalReceiptId: receipt.id,
        anomaly: receiptAnomaly || feeAnomaly,
        fee,
        breakdown: calculated.breakdown,
      };
    });

    await logActivity(req, req.user.id, "CORRECT_RECEIPT", "receipt", id);
    await logActivity(
      req,
      req.user.id,
      "RECALCULATE_MONTHLY_FEE_AFTER_RECEIPT_CORRECTION",
      "monthly_fee",
      result.fee.id
    );

    return successResponse(res, {
      policy: "void_receipt_recalculate_monthly_fee",
      original_receipt_id: result.originalReceiptId,
      anomaly: result.anomaly,
      recalculated_fee: feeToDto(result.fee),
      breakdown: result.breakdown,
      next_action:
        Number(result.fee.totalAmount || 0) > 0
          ? "review_and_collect_again"
          : "no_charge_after_recalculation",
    });
  } catch (error) {
    return sendApiError(res, error, "RECEIPT_CORRECTION_ERROR");
  }
}

export default requireAuth(handler);
