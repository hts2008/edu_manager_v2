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
import { detectReceiptAnomaly } from "../../../../lib/finance-corrections.js";

function receiptToDto(receipt: any) {
  const monthlyFee = receipt.monthlyFees?.[0] || null;
  const anomaly = detectReceiptAnomaly(receipt);
  return {
    id: receipt.id,
    student_id: receipt.studentId,
    student_name: receipt.student?.fullName || null,
    parent_name: receipt.student?.parent?.fullName || null,
    parent_phone: receipt.student?.parent?.phone || null,
    month: receipt.month,
    days_count: receipt.daysCount,
    fee_per_day: receipt.feePerDay,
    amount: receipt.amount,
    payment_method: receipt.paymentMethod,
    template_id: receipt.templateId,
    template_name: receipt.template?.templateName || null,
    monthly_fee_id: monthlyFee?.id || null,
    monthly_fee_status: monthlyFee?.status || null,
    anomaly_code: anomaly,
    anomaly_message:
      anomaly === "RECEIPT_WITH_ZERO_DAYS"
        ? "Receipt has positive amount but zero chargeable sessions"
        : null,
    can_correct: Boolean(anomaly && !receipt.deletedAt),
    notes: receipt.notes,
    pdf_path: receipt.pdfPath,
    created_by: receipt.createdById,
    created_at: receipt.createdAt,
    deleted_at: receipt.deletedAt,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const id = getRequiredString(req.query.id, "id");

    if (req.method === "GET") {
      const receipt = await prisma.receipt.findFirst({
        where: { id, deletedAt: null },
        include: {
          student: { include: { parent: { select: { fullName: true, phone: true } } } },
          template: { select: { templateName: true } },
          monthlyFees: {
            select: { id: true, status: true },
            take: 1,
          },
        },
      });
      if (!receipt) throw new ApiError("NOT_FOUND", "Receipt not found", 404);
      return successResponse(res, { receipt: receiptToDto(receipt) });
    }

    if (req.method === "DELETE") {
      if (req.user.role !== "admin") {
        return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
      }

      const receipt = await prisma.receipt.findFirst({ where: { id, deletedAt: null } });
      if (!receipt) throw new ApiError("NOT_FOUND", "Receipt not found", 404);

      await prisma.$transaction(async (tx) => {
        await tx.monthlyFee.updateMany({
          where: { receiptId: id },
          data: { receiptId: null, status: "confirmed", paidAt: null },
        });
        await tx.receipt.update({ where: { id }, data: { deletedAt: new Date() } });
      });

      await logActivity(req, req.user.id, "DELETE_RECEIPT", "receipt", id);
      return successResponse(res, { message: "Receipt moved to recycle bin" });
    }

    return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  } catch (error) {
    return sendApiError(res, error, "RECEIPT_DETAIL_ERROR");
  }
}

export default requireAuth(handler);
