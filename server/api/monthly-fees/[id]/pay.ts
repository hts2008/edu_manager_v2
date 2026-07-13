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
  resolveTemplateId,
  sendApiError,
} from "../../../../lib/api-utils.js";
import { acquireAttendanceFeeAdvisoryLocks } from "../../../../lib/attendance-lock-transaction.js";
import { runSerializableTransaction } from "../../../../lib/serializable-transaction.js";

export function assertAggregatePaymentAllowed(fee: any) {
  if (fee.lines?.length) {
    throw new ApiError(
      "CLASS_LINE_PAYMENT_REQUIRED",
      "Monthly fee has class-level lines and must be collected per class line",
      409
    );
  }
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const body = typeof req.body === "string" ? { payment_method: req.body } : req.body || {};
    const paymentMethod = getRequiredString(
      body.payment_method || body.paymentMethod,
      "payment_method"
    ) as "cash" | "transfer";

    if (!["cash", "transfer"].includes(paymentMethod)) {
      throw new ApiError("INVALID_PAYMENT_METHOD", "Invalid payment method", 400);
    }

    const notes = getString(body.notes);
    const templateId = await resolveTemplateId(
      "receipt",
      body.template_id || body.templateId
    );
    const result = await runSerializableTransaction(prisma, async (tx) => {
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
      const fee = await tx.monthlyFee.findUnique({
        where: { id },
        include: { student: true, lines: { select: { id: true }, take: 1 } },
      });
      if (!fee) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);
      assertAggregatePaymentAllowed(fee);

      if (fee.status === "paid") {
        if (fee.receiptId) {
          const receipt = await tx.receipt.findUnique({
            where: { id: fee.receiptId },
          });
          if (receipt) return { fee, receipt, alreadyPaid: true };
        }

        throw new ApiError(
          "FEE_ALREADY_PAID",
          "Monthly fee is already paid but receipt linkage is missing",
          409
        );
      }

      if (!["ready", "pending", "confirmed"].includes(fee.status)) {
        throw new ApiError(
          "INVALID_STATUS",
          `Cannot pay: current status is ${fee.status}`,
          400
        );
      }

      if (Number(fee.totalAmount || 0) > 0 && Number(fee.totalDays || 0) <= 0) {
        throw new ApiError(
          "ZERO_DAY_POSITIVE_RECEIPT",
          "Cannot collect a positive tuition fee with zero chargeable sessions",
          409
        );
      }

      const paidAt = new Date();
      const claimed = await tx.monthlyFee.updateMany({
        where: {
          id,
          status: { in: ["ready", "pending", "confirmed"] },
          receiptId: null,
        },
        data: {
          status: "paid",
          paidAt,
          notes,
        },
      });

      if (claimed.count !== 1) {
        const current = await tx.monthlyFee.findUnique({
          where: { id },
        });
        if (current?.status === "paid" && current.receiptId) {
          const receipt = await tx.receipt.findUnique({
            where: { id: current.receiptId },
          });
          if (receipt) return { fee: current, receipt, alreadyPaid: true };
        }

        throw new ApiError(
          "FEE_PAYMENT_CONFLICT",
          "Monthly fee payment is already being processed or linked",
          409
        );
      }

      const feePerDay = fee.totalDays > 0 ? fee.totalAmount / fee.totalDays : 0;
      const receipt = await tx.receipt.create({
        data: {
          studentId: fee.studentId,
          month: fee.month,
          daysCount: fee.totalDays,
          feePerDay,
          amount: fee.totalAmount,
          paymentMethod,
          templateId,
          notes,
          createdById: req.user.id,
        },
      });

      const updatedFee = await tx.monthlyFee.update({
        where: { id },
        data: {
          receiptId: receipt.id,
        },
      });

      return { fee: updatedFee, receipt };
    }, {
      maxAttempts: 3,
      baseDelayMs: 20,
      transactionOptions: {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 15_000,
      },
    });

    await logActivity(req, req.user.id, "COLLECT_FEE", "monthly_fee", id);

    return successResponse(res, {
      receiptId: result.receipt.id,
      receipt_id: result.receipt.id,
      already_paid: Boolean(result.alreadyPaid),
      fee: {
        id: result.fee.id,
        student_id: result.fee.studentId,
        month: result.fee.month,
        total_days: result.fee.totalDays,
        total_amount: result.fee.totalAmount,
        status: result.fee.status,
        receipt_id: result.fee.receiptId,
        paid_at: result.fee.paidAt,
      },
    });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_PAY_ERROR");
  }
}

export default requireAuth(handler);
