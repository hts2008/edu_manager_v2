import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  ApiError,
  getNumber,
  getString,
  logActivity,
  resolveTemplateId,
  sendApiError,
} from "../../../lib/api-utils.js";
import { receiptCreateSchema, validateBody } from "../../../lib/validation.js";

function receiptToDto(receipt: any) {
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
    notes: receipt.notes,
    pdf_path: receipt.pdfPath,
    created_by: receipt.createdById,
    created_at: receipt.createdAt,
    deleted_at: receipt.deletedAt,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === "GET") {
    try {
      const page = Math.max(getNumber(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(getNumber(req.query.limit) || 100, 1), 500);
      const includeDeleted = req.query.include_deleted === "true";
      const where: any = includeDeleted ? {} : { deletedAt: null };
      const studentId = getString(req.query.student_id || req.query.studentId);
      const month = getString(req.query.month);
      const from = getString(req.query.from);
      const to = getString(req.query.to);

      if (studentId) where.studentId = studentId;
      if (month) where.month = month;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
        if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
      }

      const [receipts, total] = await Promise.all([
        prisma.receipt.findMany({
          where,
          include: {
            student: { include: { parent: { select: { fullName: true, phone: true } } } },
            template: { select: { templateName: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.receipt.count({ where }),
      ]);

      return successResponse(res, {
        receipts: receipts.map(receiptToDto),
        total,
        page,
        limit,
      });
    } catch (error) {
      return sendApiError(res, error, "RECEIPTS_LIST_ERROR");
    }
  }

  if (req.method === "POST") {
    try {
      const body = validateBody(receiptCreateSchema, {
        ...req.body,
        student_id: req.body?.student_id || req.body?.studentId,
        days_count: req.body?.days_count ?? req.body?.daysCount,
        fee_per_day: req.body?.fee_per_day ?? req.body?.feePerDay,
        payment_method: req.body?.payment_method || req.body?.paymentMethod,
        template_id: req.body?.template_id || req.body?.templateId,
      });

      const student = await prisma.student.findFirst({
        where: { id: body.student_id, deletedAt: null },
      });
      if (!student) throw new ApiError("STUDENT_NOT_FOUND", "Student not found", 404);

      const templateId = await resolveTemplateId(
        "receipt",
        body.template_id
      );

      const receipt = await prisma.receipt.create({
        data: {
          studentId: body.student_id,
          month: body.month,
          daysCount: body.days_count,
          feePerDay: body.fee_per_day,
          amount: body.amount,
          paymentMethod: body.payment_method,
          templateId,
          notes: getString(body.notes),
          createdById: req.user.id,
        },
        include: {
          student: { include: { parent: { select: { fullName: true, phone: true } } } },
          template: { select: { templateName: true } },
        },
      });

      await logActivity(req, req.user.id, "CREATE_RECEIPT", "receipt", receipt.id);

      return successResponse(res, receiptToDto(receipt), 201);
    } catch (error) {
      return sendApiError(res, error, "RECEIPT_CREATE_ERROR");
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
