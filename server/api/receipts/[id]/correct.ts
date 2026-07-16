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
  sendApiError,
} from "../../../../lib/api-utils.js";
import {
  buildCorrectionNote,
  calculateStudentMonthlyFee,
  createReceiptCorrectionLineRevisions,
  detectMonthlyFeeAnomaly,
  detectReceiptAnomaly,
} from "../../../../lib/finance-corrections.js";
import { acquireAttendanceFeeAdvisoryLocks } from "../../../../lib/attendance-lock-transaction.js";
import {
  isProtectedMonthlyFeeLine,
  refreshMonthlyFeeAggregateFromLines,
  syncMonthlyFeeLines,
} from "../../../../lib/monthly-fee-lines.js";
import { runSerializableTransaction } from "../../../../lib/serializable-transaction.js";

const PROTECTED_FINANCE_STATUSES = new Set(["confirmed", "paid", "cancelled"]);

function monthlyFeeProtectionInclude() {
  return {
    lines: {
      include: {
        receiptLines: { select: { id: true } },
        revisions: {
          orderBy: { revisionNumber: "desc" as const },
          take: 1,
        },
      },
    },
  };
}

function throwProtectedFinanceState(message: string): never {
  throw new ApiError("PROTECTED_FINANCE_STATE", message, 409);
}

function assertCorrectionOwnsProtectedFinance(receipt: any, fee: any) {
  if (receipt.receiptLines?.length || receipt.monthlyFeeLines?.length) {
    throwProtectedFinanceState(
      "Class-level receipt finance cannot be changed by aggregate receipt correction",
    );
  }

  const protectedLine = fee?.lines?.find(
    (line: any) =>
      PROTECTED_FINANCE_STATUSES.has(line?.status) ||
      isProtectedMonthlyFeeLine(line),
  );
  if (protectedLine) {
    throwProtectedFinanceState(
      "Confirmed, paid, cancelled, or receipt-linked fee lines cannot be recalculated",
    );
  }

  if (!fee) return;
  const ownedPaidFee = fee.status === "paid" && fee.receiptId === receipt.id;
  const protectedAggregate =
    PROTECTED_FINANCE_STATUSES.has(fee.status) ||
    Boolean(fee.receiptId) ||
    Boolean(fee.paidAt);
  if (protectedAggregate && !ownedPaidFee) {
    throwProtectedFinanceState(
      "Confirmed, paid, cancelled, or receipt-linked monthly fee is not owned by this correction",
    );
  }
}

export async function correctReceiptInTransaction(
  tx: any,
  id: string,
  reason: string,
  {
    actorId,
    ipAddress,
    userAgent,
    calculateFee = calculateStudentMonthlyFee,
  }: {
    actorId: string;
    ipAddress?: string;
    userAgent?: string;
    calculateFee?: typeof calculateStudentMonthlyFee;
  },
) {
  if (
    !actorId ||
    typeof tx.monthlyFeeLineRevision?.create !== "function" ||
    typeof tx.activityLog?.createMany !== "function"
  ) {
    throw new ApiError(
      "CORRECTION_AUDIT_UNAVAILABLE",
      "Receipt correction requires transactional revision and activity audit writers",
      500,
    );
  }

  const receiptIdentity = await tx.receipt.findFirst({
    where: { id, deletedAt: null },
    select: { studentId: true, month: true },
  });
  if (!receiptIdentity) throw new ApiError("NOT_FOUND", "Receipt not found", 404);

  await acquireAttendanceFeeAdvisoryLocks(
    tx,
    [receiptIdentity.studentId],
    receiptIdentity.month,
  );
  const receipt = await tx.receipt.findFirst({
    where: { id, deletedAt: null },
    include: {
      monthlyFees: { include: monthlyFeeProtectionInclude() },
      monthlyFeeLines: { select: { id: true } },
      receiptLines: { select: { id: true } },
    },
  });
  if (!receipt) {
    throw new ApiError(
      "RECEIPT_STATE_CONFLICT",
      "Receipt changed while it was being corrected",
      409,
      { retryable: true },
    );
  }

  const linkedFee =
    receipt.monthlyFees.find((fee: any) => fee.receiptId === receipt.id) ||
    (await tx.monthlyFee.findUnique({
      where: {
        studentId_month: {
          studentId: receipt.studentId,
          month: receipt.month,
        },
      },
      include: monthlyFeeProtectionInclude(),
    }));
  const receiptAnomaly = detectReceiptAnomaly(receipt);
  const feeAnomaly = detectMonthlyFeeAnomaly(linkedFee);

  if (!receiptAnomaly && !feeAnomaly) {
    throw new ApiError(
      "RECEIPT_NOT_ANOMALOUS",
      "Receipt does not match the zero-day positive-amount correction policy",
      409,
    );
  }

  assertCorrectionOwnsProtectedFinance(receipt, linkedFee);

  const calculated = await calculateFee(
    tx,
    receipt.studentId,
    receipt.month,
  );
  const now = new Date();
  const correctionNote = buildCorrectionNote(receipt.notes, {
    reason,
    originalReceiptId: receipt.id,
  });

  await tx.receipt.update({
    where: { id: receipt.id },
    data: {
      deletedAt: now,
      notes: correctionNote,
    },
  });

  const monthlyFeeNote = buildCorrectionNote(linkedFee?.notes, {
    reason,
    originalReceiptId: receipt.id,
  });

  let fee;
  if (linkedFee) {
    const ownsPaidFee =
      linkedFee.status === "paid" && linkedFee.receiptId === receipt.id;
    const updated = await tx.monthlyFee.updateMany({
      where: ownsPaidFee
        ? {
            id: linkedFee.id,
            status: "paid",
            receiptId: receipt.id,
          }
        : {
            id: linkedFee.id,
            status: { in: ["pending", "ready"] },
            receiptId: null,
            paidAt: null,
          },
      data: {
        totalDays: calculated.totalDays,
        totalAmount: calculated.totalAmount,
        status: "ready",
        receiptId: null,
        paidAt: null,
        notes: monthlyFeeNote,
      },
    });

    if (updated.count !== 1) {
      throw new ApiError(
        "MONTHLY_FEE_STATE_CONFLICT",
        "Monthly fee changed while correcting receipt",
        409,
        { retryable: true },
      );
    }

    fee = await tx.monthlyFee.findUniqueOrThrow({
      where: { id: linkedFee.id },
    });
  } else {
    fee = await tx.monthlyFee.create({
      data: {
        studentId: receipt.studentId,
        month: receipt.month,
        totalDays: calculated.totalDays,
        totalAmount: calculated.totalAmount,
        status: "ready",
        notes: monthlyFeeNote,
      },
    });
  }

  const syncedLines = await syncMonthlyFeeLines(tx, fee, calculated.breakdown);
  await createReceiptCorrectionLineRevisions(tx, {
    beforeLines: linkedFee?.lines || [],
    afterLines: syncedLines,
    actorId,
    reason,
    runId: `receipt-correction:${receipt.id}`,
  });
  const refreshedFee = await refreshMonthlyFeeAggregateFromLines(tx, fee.id);
  if (
    !refreshedFee ||
    !["pending", "ready"].includes(refreshedFee.status) ||
    refreshedFee.receiptId ||
    refreshedFee.paidAt ||
    Number(refreshedFee.totalDays) !== Number(calculated.totalDays) ||
    Number(refreshedFee.totalAmount) !== Number(calculated.totalAmount)
  ) {
    throw new ApiError(
      "MONTHLY_FEE_LINE_AGGREGATE_MISMATCH",
      "Monthly fee aggregate does not match recalculated fee lines",
      409,
    );
  }

  await tx.activityLog.createMany({
    data: [
      {
        userId: actorId,
        action: "CORRECT_RECEIPT",
        entityType: "receipt",
        entityId: receipt.id,
        ipAddress,
        userAgent,
      },
      {
        userId: actorId,
        action: "RECALCULATE_MONTHLY_FEE_AFTER_RECEIPT_CORRECTION",
        entityType: "monthly_fee",
        entityId: refreshedFee.id,
        ipAddress,
        userAgent,
      },
    ],
  });

  return {
    originalReceiptId: receipt.id,
    anomaly: receiptAnomaly || feeAnomaly,
    fee: refreshedFee,
    breakdown: calculated.breakdown,
  };
}

function feeToDto(fee: any) {
  return {
    id: fee.id,
    student_id: fee.studentId,
    month: fee.month,
    total_days: fee.totalDays,
    total_amount: fee.totalAmount,
    status: fee.status,
    receipt_id: fee.receiptId,
    paid_at: fee.paidAt,
    notes: fee.notes,
    updated_at: fee.updatedAt,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  if (req.user.role !== "admin") {
    return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const reason = getString(req.body?.reason)?.trim();
    if (!reason || reason.length < 5) {
      throw new ApiError(
        "CORRECTION_REASON_REQUIRED",
        "Correction reason must be at least 5 characters",
        400
      );
    }

    const result = await runSerializableTransaction(prisma, (tx) =>
      correctReceiptInTransaction(tx, id, reason, {
        actorId: req.user.id,
        ipAddress:
          getString(req.headers["x-forwarded-for"]) ||
          getString(req.headers["x-real-ip"]),
        userAgent: getString(req.headers["user-agent"]),
      }), {
      maxAttempts: 3,
      baseDelayMs: 20,
      transactionOptions: {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 15_000,
      },
    });

    return successResponse(res, {
      policy: "void_receipt_recalculate_monthly_fee",
      original_receipt_id: result.originalReceiptId,
      anomaly: result.anomaly,
      recalculated_fee: feeToDto(result.fee),
      breakdown: result.breakdown,
      next_action:
        Number(result.fee.totalAmount || 0) > 0
          ? "review_and_collect_again"
          : "no_charge_after_recalculation",
    });
  } catch (error) {
    return sendApiError(res, error, "RECEIPT_CORRECTION_ERROR");
  }
}

export default requireAuth(handler);
