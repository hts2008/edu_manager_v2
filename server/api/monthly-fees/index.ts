import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { getString, sendApiError } from "../../../lib/api-utils.js";

function feeToDto(fee: any) {
  const classIds =
    fee.student?.studentClasses
      ?.map((studentClass: any) => studentClass.class?.id)
      .filter(Boolean) || [];
  const classNames =
    fee.student?.studentClasses
      ?.map((studentClass: any) => studentClass.class?.className)
      .filter(Boolean)
      .join(", ") || null;

  return {
    id: fee.id,
    student_id: fee.studentId,
    student_name: fee.student?.fullName || null,
    parent_name: fee.student?.parent?.fullName || null,
    parent_phone: fee.student?.parent?.phone || null,
    class_ids: classIds,
    class_names: classNames,
    month: fee.month,
    total_days: fee.totalDays,
    total_amount: fee.totalAmount,
    status: fee.status,
    receipt_id: fee.receiptId,
    paid_at: fee.paidAt,
    notes: fee.notes,
    created_at: fee.createdAt,
    updated_at: fee.updatedAt,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const where: any = { student: { deletedAt: null } };
    const month = getString(req.query.month);
    const status = getString(req.query.status);
    const studentId = getString(req.query.student_id || req.query.studentId);
    const classId = getString(req.query.class_id || req.query.classId);

    if (month) where.month = month;
    if (status && status !== "all") where.status = status;
    if (studentId) where.studentId = studentId;
    if (classId && classId !== "all") {
      where.student.studentClasses = {
        some: {
          classId,
          status: "active",
        },
      };
    }

    const fees = await prisma.monthlyFee.findMany({
      where,
      include: {
        student: {
          include: {
            parent: { select: { fullName: true, phone: true } },
            studentClasses: {
              where: { status: "active" },
              include: { class: { select: { id: true, className: true } } },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { student: { fullName: "asc" } }],
    });

    const mapped = fees.map(feeToDto);
    const summary = {
      total: mapped.length,
      pending: mapped.filter((fee) => fee.status === "pending").length,
      ready: mapped.filter((fee) => fee.status === "ready").length,
      confirmed: mapped.filter((fee) => fee.status === "confirmed").length,
      paid: mapped.filter((fee) => fee.status === "paid").length,
      totalAmount: mapped.reduce((sum, fee) => sum + fee.total_amount, 0),
      paidAmount: mapped
        .filter((fee) => fee.status === "paid")
        .reduce((sum, fee) => sum + fee.total_amount, 0),
    };

    return successResponse(res, { fees: mapped, summary });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEES_LIST_ERROR");
  }
}

export default requireAuth(handler);
