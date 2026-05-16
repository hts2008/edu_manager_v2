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

function paymentToDto(payment: any) {
  return {
    id: payment.id,
    category: payment.category,
    amount: payment.amount,
    recipient_name: payment.recipientName,
    recipient_phone: payment.recipientPhone,
    template_id: payment.templateId,
    template_name: payment.template?.templateName || null,
    notes: payment.notes,
    pdf_path: payment.pdfPath,
    created_by: payment.createdById,
    created_at: payment.createdAt,
    deleted_at: payment.deletedAt,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const id = getRequiredString(req.query.id, "id");

    if (req.method === "GET") {
      const payment = await prisma.payment.findFirst({
        where: { id, deletedAt: null },
        include: { template: { select: { templateName: true } } },
      });
      if (!payment) throw new ApiError("NOT_FOUND", "Payment not found", 404);
      return successResponse(res, { payment: paymentToDto(payment) });
    }

    if (req.method === "DELETE") {
      if (req.user.role !== "admin") {
        return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
      }

      const payment = await prisma.payment.findFirst({ where: { id, deletedAt: null } });
      if (!payment) throw new ApiError("NOT_FOUND", "Payment not found", 404);

      await prisma.payment.update({ where: { id }, data: { deletedAt: new Date() } });
      await logActivity(req, req.user.id, "DELETE_PAYMENT", "payment", id);
      return successResponse(res, { message: "Payment moved to recycle bin" });
    }

    return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  } catch (error) {
    return sendApiError(res, error, "PAYMENT_DETAIL_ERROR");
  }
}

export default requireAuth(handler);
