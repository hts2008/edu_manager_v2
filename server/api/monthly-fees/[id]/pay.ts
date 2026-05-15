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
    const result = await prisma.$transaction(async (tx) => {
      const fee = await tx.monthlyFee.findUnique({
        where: { id },
        include: { student: true },
      });
      if (!fee) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);
      if (fee.status === "paid") {
        throw new ApiError("FEE_ALREADY_PAID", "Monthly fee is already paid", 400);
      }
      if (!["ready", "pending", "confirmed"].includes(fee.status)) {
        throw new ApiError(
          "INVALID_STATUS",
          `Cannot pay: current status is ${fee.status}`,
          400
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
          status: "paid",
          receiptId: receipt.id,
          paidAt: new Date(),
          notes,
        },
      });

      return { fee: updatedFee, receipt };
    });

    await logActivity(req, req.user.id, "COLLECT_FEE", "monthly_fee", id);

    return successResponse(res, {
      receiptId: result.receipt.id,
      receipt_id: result.receipt.id,
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
