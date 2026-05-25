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
  getRequiredString,
  getString,
  logActivity,
  parseMonthRange,
  resolveTemplateId,
  sendApiError,
} from "../../../lib/api-utils.js";
import {
  calculateTuitionForClass,
  CHARGEABLE_ATTENDANCE_STATUSES,
} from "../../../lib/tuition.js";

type PaymentMethod = "cash" | "transfer";

function readStringArray(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

async function calculateFeeForStudent(client: any, studentId: string, month: string) {
  const { startDate, endDate } = parseMonthRange(month);
  const student = await client.student.findFirst({
    where: { id: studentId, deletedAt: null },
    include: {
      studentClasses: {
        where: { status: "active" },
        include: { class: true },
      },
    },
  });

  if (!student) throw new ApiError("STUDENT_NOT_FOUND", "Student not found", 404);
  if (!student.studentClasses?.length) {
    throw new ApiError("NO_ACTIVE_CLASS", "Student has no active class", 400);
  }

  const breakdown = [];
  let totalDays = 0;
  let totalAmount = 0;

  for (const enrollment of student.studentClasses) {
    const counts = await client.attendance.groupBy({
      by: ["status"],
      where: {
        studentId,
        classId: enrollment.classId,
        attendanceDate: { gte: startDate, lte: endDate },
        status: { in: [...CHARGEABLE_ATTENDANCE_STATUSES] as any },
      },
      _count: { status: true },
    });

    const daysCount = counts.reduce(
      (sum: number, item: any) => sum + item._count.status,
      0
    );
    const tuition = calculateTuitionForClass(enrollment.class, month, daysCount);

    breakdown.push({
      class_id: enrollment.classId,
      class_name: enrollment.class.className,
      days_count: daysCount,
      fee_per_day: tuition.feePerSession,
      expected_sessions: tuition.expectedSessions,
      billing_mode: tuition.billingMode,
      amount: tuition.totalAmount,
    });

    totalDays += daysCount;
    totalAmount += tuition.totalAmount;
  }

  const existing = await client.monthlyFee.findUnique({
    where: { studentId_month: { studentId, month } },
  });

  if (existing?.status === "paid" || existing?.receiptId || existing?.paidAt) {
    return { fee: existing, student, breakdown, alreadyPaid: true };
  }

  if (!existing) {
    const fee = await client.monthlyFee.create({
      data: {
        studentId,
        month,
        totalDays,
        totalAmount,
        status: "ready",
      },
    });
    return { fee, student, breakdown, alreadyPaid: false };
  }

  const updated = await client.monthlyFee.updateMany({
    where: {
      id: existing.id,
      status: { in: ["pending", "ready", "confirmed"] },
      receiptId: null,
      paidAt: null,
    },
    data: {
      totalDays,
      totalAmount,
      status: "ready",
    },
  });

  if (updated.count !== 1) {
    throw new ApiError(
      "MONTHLY_FEE_STATE_CONFLICT",
      "Monthly fee changed while recalculating",
      409
    );
  }

  const fee = await client.monthlyFee.findUniqueOrThrow({
    where: { id: existing.id },
  });
  return { fee, student, breakdown, alreadyPaid: false };
}

async function collectFee(
  client: any,
  feeId: string,
  paymentMethod: PaymentMethod,
  templateId: string,
  notes: string | undefined,
  userId: string
) {
  const fee = await client.monthlyFee.findUnique({
    where: { id: feeId },
    include: { student: true },
  });
  if (!fee) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);

  if (fee.status === "paid") {
    if (fee.receiptId) {
      const receipt = await client.receipt.findUnique({ where: { id: fee.receiptId } });
      if (receipt) return { fee, receipt, alreadyPaid: true };
    }
    throw new ApiError(
      "FEE_ALREADY_PAID",
      "Monthly fee is already paid but receipt linkage is missing",
      409
    );
  }

  if (!["ready", "pending", "confirmed"].includes(fee.status)) {
    throw new ApiError("INVALID_STATUS", `Cannot pay: current status is ${fee.status}`, 400);
  }

  if (Number(fee.totalAmount || 0) <= 0) {
    throw new ApiError("NO_CHARGEABLE_AMOUNT", "No tuition amount to collect", 409);
  }

  if (Number(fee.totalAmount || 0) > 0 && Number(fee.totalDays || 0) <= 0) {
    throw new ApiError(
      "ZERO_DAY_POSITIVE_RECEIPT",
      "Cannot collect a positive tuition fee with zero chargeable sessions",
      409
    );
  }

  const paidAt = new Date();
  const claimed = await client.monthlyFee.updateMany({
    where: {
      id: fee.id,
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
    const current = await client.monthlyFee.findUnique({ where: { id: fee.id } });
    if (current?.status === "paid" && current.receiptId) {
      const receipt = await client.receipt.findUnique({ where: { id: current.receiptId } });
      if (receipt) return { fee: current, receipt, alreadyPaid: true };
    }
    throw new ApiError(
      "FEE_PAYMENT_CONFLICT",
      "Monthly fee payment is already being processed or linked",
      409
    );
  }

  const feePerDay = fee.totalDays > 0 ? fee.totalAmount / fee.totalDays : 0;
  const receipt = await client.receipt.create({
    data: {
      studentId: fee.studentId,
      month: fee.month,
      daysCount: fee.totalDays,
      feePerDay,
      amount: fee.totalAmount,
      paymentMethod,
      templateId,
      notes,
      createdById: userId,
    },
  });

  const updatedFee = await client.monthlyFee.update({
    where: { id: fee.id },
    data: { receiptId: receipt.id },
  });

  return { fee: updatedFee, receipt, alreadyPaid: false };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const month = getRequiredString(req.body?.month, "month");
    parseMonthRange(month);

    const paymentMethod = getRequiredString(
      req.body?.payment_method || req.body?.paymentMethod,
      "payment_method"
    ) as PaymentMethod;
    if (!["cash", "transfer"].includes(paymentMethod)) {
      throw new ApiError("INVALID_PAYMENT_METHOD", "Invalid payment method", 400);
    }

    const studentIds = readStringArray(req.body?.student_ids || req.body?.studentIds);
    const feeIds = readStringArray(req.body?.fee_ids || req.body?.feeIds);
    if (!studentIds.length && !feeIds.length) {
      throw new ApiError("NO_SELECTION", "student_ids or fee_ids is required", 400);
    }

    const notes = getString(req.body?.notes);
    const templateId = await resolveTemplateId(
      "receipt",
      req.body?.template_id || req.body?.templateId
    );
    const targets = [
      ...studentIds.map((id) => ({ type: "student" as const, id })),
      ...feeIds.map((id) => ({ type: "fee" as const, id })),
    ];

    const results = [];
    for (const target of targets) {
      try {
        const item = await prisma.$transaction(async (tx) => {
          const fee =
            target.type === "student"
              ? (await calculateFeeForStudent(tx, target.id, month)).fee
              : await tx.monthlyFee.findUnique({ where: { id: target.id } });

          if (!fee) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);
          const paid = await collectFee(
            tx,
            fee.id,
            paymentMethod,
            templateId,
            notes,
            req.user.id
          );

          return {
            status: paid.alreadyPaid ? "already_paid" : "paid",
            student_id: paid.fee.studentId,
            fee_id: paid.fee.id,
            receipt_id: paid.receipt.id,
            total_days: paid.fee.totalDays,
            total_amount: paid.fee.totalAmount,
          };
        });

        results.push(item);
      } catch (error) {
        const apiError = error as { code?: string; message?: string };
        results.push({
          status: "failed",
          target_type: target.type,
          target_id: target.id,
          code: apiError.code || "COLLECT_FAILED",
          message: apiError.message || "Cannot collect fee",
        });
      }
    }

    const paid = results.filter((item) => item.status === "paid").length;
    const alreadyPaid = results.filter((item) => item.status === "already_paid").length;
    const failed = results.filter((item) => item.status === "failed").length;

    await logActivity(req, req.user.id, "BULK_COLLECT_FEE", "monthly_fee", month);

    return successResponse(res, {
      month,
      payment_method: paymentMethod,
      paid,
      already_paid: alreadyPaid,
      failed,
      results,
      receipt_ids: results
        .filter((item: any) => item.receipt_id)
        .map((item: any) => item.receipt_id),
    });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_BULK_PAY_ERROR");
  }
}

export default requireAuth(handler);
