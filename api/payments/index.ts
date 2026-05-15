import type { VercelResponse } from "@vercel/node";
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
  getNumber,
  getRequiredString,
  getString,
  logActivity,
  resolveTemplateId,
  sendApiError,
} from "../../lib/api-utils.js";

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
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === "GET") {
    try {
      const page = Math.max(getNumber(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(getNumber(req.query.limit) || 100, 1), 500);
      const where: any = {};
      const category = getString(req.query.category);
      const from = getString(req.query.from);
      const to = getString(req.query.to);

      if (category && category !== "all") where.category = category;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
        if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: { template: { select: { templateName: true } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.payment.count({ where }),
      ]);

      return successResponse(res, {
        payments: payments.map(paymentToDto),
        total,
        page,
        limit,
      });
    } catch (error) {
      return sendApiError(res, error, "PAYMENTS_LIST_ERROR");
    }
  }

  if (req.method === "POST") {
    if (req.user.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      const category = getRequiredString(req.body?.category, "category") as
        | "salary"
        | "utility"
        | "office"
        | "other";
      const amount = Number(req.body?.amount ?? 0);
      const recipientName = getRequiredString(
        req.body?.recipient_name || req.body?.recipientName,
        "recipient_name"
      );

      if (!["salary", "utility", "office", "other"].includes(category)) {
        throw new ApiError("INVALID_CATEGORY", "Invalid payment category", 400);
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError("INVALID_AMOUNT", "Amount must be greater than 0", 400);
      }

      const templateId = await resolveTemplateId(
        "payment",
        req.body?.template_id || req.body?.templateId
      );

      const payment = await prisma.payment.create({
        data: {
          category,
          amount,
          recipientName,
          recipientPhone: getString(
            req.body?.recipient_phone || req.body?.recipientPhone
          ),
          templateId,
          notes: getString(req.body?.notes),
          createdById: req.user.id,
        },
        include: { template: { select: { templateName: true } } },
      });

      await logActivity(req, req.user.id, "CREATE_PAYMENT", "payment", payment.id);
      return successResponse(res, paymentToDto(payment), 201);
    } catch (error) {
      return sendApiError(res, error, "PAYMENT_CREATE_ERROR");
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
