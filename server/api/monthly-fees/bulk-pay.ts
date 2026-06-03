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
import {
  receiptLineDataFromMonthlyFeeLine,
  refreshMonthlyFeeAggregateFromLines,
  syncMonthlyFeeLines,
} from "../../../lib/monthly-fee-lines.js";

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
        include: { class: { include: { teacher: true } } },
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
    const makeUpSessions = await client.attendance.count({
      where: {
        studentId,
        classId: enrollment.classId,
        attendanceDate: { gte: startDate, lte: endDate },
        status: { in: [...CHARGEABLE_ATTENDANCE_STATUSES] as any },
        isMakeUp: true,
      },
    });
    const tuition = calculateTuitionForClass(enrollment.class, month, daysCount);

    breakdown.push({
      class_id: enrollment.classId,
      class_name: enrollment.class.className,
      teacher_name: enrollment.class.teacher?.fullName || null,
      days_count: daysCount,
      fee_per_day: tuition.feePerSession,
      expected_sessions: tuition.expectedSessions,
      make_up_sessions: makeUpSessions,
      extra_sessions: Math.max(0, daysCount - tuition.expectedSessions),
      billing_mode: tuition.billingMode,
      schedule_mode: tuition.scheduleStrategy,
      monthly_tuition: tuition.monthlyTuition,
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
    const lines = await syncMonthlyFeeLines(client, fee, breakdown);
    const refreshed = await refreshMonthlyFeeAggregateFromLines(client, fee.id);
    return { fee: refreshed || fee, student, breakdown, lines, alreadyPaid: false };
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
  const lines = await syncMonthlyFeeLines(client, fee, breakdown);
  const refreshed = await refreshMonthlyFeeAggregateFromLines(client, fee.id);
  return { fee: refreshed || fee, student, breakdown, lines, alreadyPaid: false };
}

async function collectFeeLine(
  client: any,
  lineId: string,
  paymentMethod: PaymentMethod,
  templateId: string,
  notes: string | undefined,
  userId: string
) {
  const line = await client.monthlyFeeLine.findUnique({
    where: { id: lineId },
    include: {
      monthlyFee: true,
      student: true,
      class: { include: { teacher: true } },
      receipt: true,
    },
  });
  if (!line) throw new ApiError("NOT_FOUND", "Monthly fee line not found", 404);

  if (line.status === "paid") {
    if (line.receipt) return { line, fee: line.monthlyFee, receipt: line.receipt, alreadyPaid: true };
    throw new ApiError(
      "FEE_LINE_ALREADY_PAID",
      "Monthly fee line is already paid but receipt linkage is missing",
      409
    );
  }

  if (!["ready", "pending", "confirmed"].includes(line.status)) {
    throw new ApiError("INVALID_STATUS", `Cannot pay line: current status is ${line.status}`, 400);
  }

  if (Number(line.amount || 0) <= 0) {
    throw new ApiError("NO_CHARGEABLE_AMOUNT", "No tuition amount to collect", 409);
  }

  if (Number(line.amount || 0) > 0 && Number(line.chargedSessions || 0) <= 0) {
    throw new ApiError(
      "ZERO_DAY_POSITIVE_RECEIPT",
      "Cannot collect a positive tuition fee line with zero chargeable sessions",
      409
    );
  }

  const receipt = await client.receipt.create({
    data: {
      studentId: line.studentId,
      month: line.month,
      daysCount: line.chargedSessions,
      feePerDay: line.feePerSession,
      amount: line.amount,
      paymentMethod,
      templateId,
      notes,
      createdById: userId,
    },
  });

  const claimed = await client.monthlyFeeLine.updateMany({
    where: {
      id: line.id,
      status: { in: ["ready", "pending", "confirmed"] },
      receiptId: null,
    },
    data: {
      status: "paid",
      receiptId: receipt.id,
      paidAt: new Date(),
      notes,
    },
  });

  if (claimed.count !== 1) {
    throw new ApiError(
      "FEE_LINE_PAYMENT_CONFLICT",
      "Monthly fee line payment is already being processed or linked",
      409
    );
  }

  await client.receiptLine.create({
    data: receiptLineDataFromMonthlyFeeLine(line, receipt.id),
  });

  const updatedLine = await client.monthlyFeeLine.findUniqueOrThrow({
    where: { id: line.id },
    include: { monthlyFee: true, receipt: true, student: true },
  });
  const refreshedFee = await refreshMonthlyFeeAggregateFromLines(
    client,
    line.monthlyFeeId
  );

  return {
    line: updatedLine,
    fee: refreshedFee || updatedLine.monthlyFee,
    receipt,
    alreadyPaid: false,
  };
}

async function monthlyFeeLineIdsForCollection(client: any, feeId: string) {
  const lines = await client.monthlyFeeLine.findMany({
    where: { monthlyFeeId: feeId },
    select: {
      id: true,
      status: true,
      amount: true,
      receiptId: true,
    },
    orderBy: [{ classNameSnapshot: "asc" }, { createdAt: "asc" }],
  });

  const collectable = lines.filter(
    (line: any) =>
      line.status === "paid" ||
      line.receiptId ||
      Number(line.amount || 0) > 0
  );

  if (!collectable.length) {
    throw new ApiError(
      "NO_CLASS_LEVEL_FEE_LINES",
      "Monthly fee has no class-level tuition lines to collect",
      409
    );
  }

  return collectable.map((line: any) => line.id);
}

async function resolveLineIdsForTarget(
  client: any,
  target: { type: "student" | "fee"; id: string },
  month: string
) {
  if (target.type === "student") {
    const calculated = await calculateFeeForStudent(client, target.id, month);
    const lineIds = await monthlyFeeLineIdsForCollection(client, calculated.fee.id);
    if (calculated.alreadyPaid && !lineIds.length) {
      throw new ApiError(
        "LEGACY_AGGREGATE_ALREADY_PAID",
        "Monthly fee was paid before class-level lines existed and cannot be collected again",
        409
      );
    }
    return lineIds;
  }

  const fee = await client.monthlyFee.findUnique({
    where: { id: target.id },
    select: {
      id: true,
      studentId: true,
      month: true,
      status: true,
      receiptId: true,
      paidAt: true,
      lines: { select: { id: true } },
    },
  });
  if (!fee) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);
  if (fee.month !== month) {
    throw new ApiError(
      "MONTH_MISMATCH",
      "Monthly fee target does not belong to the requested month",
      400
    );
  }

  if (!fee.lines.length) {
    if (fee.status === "paid" || fee.receiptId || fee.paidAt) {
      throw new ApiError(
        "LEGACY_AGGREGATE_ALREADY_PAID",
        "Monthly fee was paid before class-level lines existed and cannot be collected again",
        409
      );
    }
    await calculateFeeForStudent(client, fee.studentId, fee.month);
  }

  return monthlyFeeLineIdsForCollection(client, fee.id);
}

function paidLineResult(paidLine: any) {
  return {
    status: paidLine.alreadyPaid ? "already_paid" : "paid",
    student_id: paidLine.line.studentId,
    student_name: paidLine.line.student?.fullName || null,
    fee_id: paidLine.fee?.id || paidLine.line.monthlyFeeId,
    line_id: paidLine.line.id,
    class_id: paidLine.line.classId,
    class_name: paidLine.line.classNameSnapshot,
    receipt_id: paidLine.receipt.id,
    total_days: paidLine.line.chargedSessions,
    total_amount: paidLine.line.amount,
  };
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
    const lineIds = readStringArray(req.body?.line_ids || req.body?.lineIds);
    if (!studentIds.length && !feeIds.length && !lineIds.length) {
      throw new ApiError("NO_SELECTION", "student_ids, fee_ids or line_ids is required", 400);
    }

    const notes = getString(req.body?.notes);
    const templateId = await resolveTemplateId(
      "receipt",
      req.body?.template_id || req.body?.templateId
    );
    const targets = [
      ...studentIds.map((id) => ({ type: "student" as const, id })),
      ...feeIds.map((id) => ({ type: "fee" as const, id })),
      ...lineIds.map((id) => ({ type: "line" as const, id })),
    ];

    const results = [];
    for (const target of targets) {
      try {
        const item = await prisma.$transaction(async (tx) => {
          if (target.type === "line") {
            const paidLine = await collectFeeLine(
              tx,
              target.id,
              paymentMethod,
              templateId,
              notes,
              req.user.id
            );

            return [paidLineResult(paidLine)];
          }

          const lineIdsForTarget = await resolveLineIdsForTarget(
            tx,
            target,
            month
          );
          const lineResults = [];
          for (const lineId of lineIdsForTarget) {
            const paidLine = await collectFeeLine(
              tx,
              lineId,
              paymentMethod,
              templateId,
              notes,
              req.user.id
            );
            lineResults.push(paidLineResult(paidLine));
          }
          return lineResults;
        });

        results.push(...item);
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
