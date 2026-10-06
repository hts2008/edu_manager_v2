import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  getNumber,
  getString,
  parseUtcDateRange,
  sendApiError,
} from "../../../lib/api-utils.js";
import { paymentCreateSchema, validateBody } from "../../../lib/validation.js";
import { logPaymentActivity, resolvePaymentTemplateId } from "./request-db.js";

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
  const tenantId = req.user.tenantId;
  if (!tenantId) {
    return errorResponse(res, "TENANT_REQUIRED", "Tenant identity is required", 403);
  }
  if (handleCors(req, res)) return;

  if (req.method === "GET") {
    try {
      const page = Math.max(getNumber(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(getNumber(req.query.limit) || 100, 1), 500);
      const includeDeleted = req.query.include_deleted === "true";
      const where: any = includeDeleted ? {} : { deletedAt: null };
      const category = getString(req.query.category);
      const from = getString(req.query.from);
      const to = getString(req.query.to);

      if (category && category !== "all") where.category = category;
      if (from || to) {
        where.createdAt = parseUtcDateRange(from, to);
      }

      const [payments, total] = await Promise.all([
        req.db.payment.findMany({
          where,
          include: { template: { select: { templateName: true } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        req.db.payment.count({ where }),
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
      const body = validateBody(paymentCreateSchema, {
        ...req.body,
        recipient_name: req.body?.recipient_name || req.body?.recipientName,
        recipient_phone: req.body?.recipient_phone || req.body?.recipientPhone,
        template_id: req.body?.template_id || req.body?.templateId,
      });

      const templateId = await resolvePaymentTemplateId(
        req.db,
        body.template_id
      );

      const payment = await req.db.payment.create({
        data: {
          tenantId,
          category: body.category,
          amount: body.amount,
          recipientName: body.recipient_name,
          recipientPhone: getString(body.recipient_phone),
          templateId,
          notes: getString(body.notes),
          createdById: req.user.id,
        },
        include: { template: { select: { templateName: true } } },
      });

      await logPaymentActivity(req, "CREATE_PAYMENT", payment.id);
      return successResponse(res, paymentToDto(payment), 201);
    } catch (error) {
      return sendApiError(res, error, "PAYMENT_CREATE_ERROR");
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
