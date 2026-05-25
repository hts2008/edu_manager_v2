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
        monthly_fee_id: req.body?.monthly_fee_id || req.body?.monthlyFeeId,
      });

      const student = await prisma.student.findFirst({
        where: { id: body.student_id, deletedAt: null },
      });
      if (!student) throw new ApiError("STUDENT_NOT_FOUND", "Student not found", 404);

      const templateId = await resolveTemplateId(
        "receipt",
        body.template_id
      );

      const receipt = await prisma.$transaction(async (tx) => {
        let monthlyFee = null;
        if (body.monthly_fee_id) {
          monthlyFee = await tx.monthlyFee.findFirst({
            where: {
              id: body.monthly_fee_id,
              studentId: body.student_id,
              month: body.month,
            },
          });
          if (!monthlyFee) {
            throw new ApiError("MONTHLY_FEE_NOT_FOUND", "Monthly fee not found", 404);
          }
          if (monthlyFee.status === "paid" || monthlyFee.receiptId) {
            throw new ApiError("MONTHLY_FEE_ALREADY_PAID", "Monthly fee is already paid", 409);
          }
        } else {
          monthlyFee = await tx.monthlyFee.findFirst({
            where: {
              studentId: body.student_id,
              month: body.month,
              status: { in: ["pending", "ready", "confirmed"] },
              receiptId: null,
            },
            orderBy: { createdAt: "desc" },
          });
        }

        const receiptDays = monthlyFee ? monthlyFee.totalDays : body.days_count;
        const receiptAmount = monthlyFee ? monthlyFee.totalAmount : body.amount;
        const receiptFeePerDay = monthlyFee
          ? monthlyFee.totalDays > 0
            ? Math.round(monthlyFee.totalAmount / monthlyFee.totalDays)
            : 0
          : body.fee_per_day;

        if (Number(receiptAmount || 0) > 0 && Number(receiptDays || 0) <= 0) {
          throw new ApiError(
            "ZERO_DAY_POSITIVE_RECEIPT",
            "Cannot create a positive tuition receipt with zero chargeable sessions",
            409
          );
        }

        const createdReceipt = await tx.receipt.create({
          data: {
            studentId: body.student_id,
            month: body.month,
            daysCount: receiptDays,
            feePerDay: receiptFeePerDay,
            amount: receiptAmount,
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

        if (monthlyFee) {
          const linked = await tx.monthlyFee.updateMany({
            where: {
              id: monthlyFee.id,
              status: { in: ["pending", "ready", "confirmed"] },
              receiptId: null,
            },
            data: {
              status: "paid",
              receiptId: createdReceipt.id,
              paidAt: new Date(),
            },
          });

          if (linked.count !== 1) {
            throw new ApiError(
              "MONTHLY_FEE_LINK_CONFLICT",
              "Monthly fee is already linked to another receipt",
              409
            );
          }
        }

        return createdReceipt;
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
