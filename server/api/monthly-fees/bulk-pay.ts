import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import {
  ApiError,
  logActivity,
  parseMonthRange,
  resolveTemplateId,
  sendApiError,
} from "../../../lib/api-utils.js";
import { logApiError } from "../../../lib/observability.js";
import { acquireAttendanceFeeAdvisoryLocks } from "../../../lib/attendance-lock-transaction.js";
import { runSerializableTransaction } from "../../../lib/serializable-transaction.js";
import {
  canonicalizeBulkFeePayment,
  hashBulkFeePaymentPayload,
  receiptLineDataFromMonthlyFeeLine,
  refreshMonthlyFeeAggregateFromLines,
} from "../../../lib/monthly-fee-lines.js";

const ITEMS_PER_INVOCATION = 50;
const TERMINAL_ITEM_STATUSES = ["paid", "already_paid", "failed"];
const BULK_PAY_TRANSACTION_OPTIONS = {
  isolationLevel: "Serializable",
  maxWait: 5_000,
  timeout: 15_000,
} as const;

function idempotencyKey(req: AuthedRequest) {
  const value = req.headers?.["idempotency-key"];
  const key = String(Array.isArray(value) ? value[0] : value || "").trim();
  if (!key) {
    throw new ApiError(
      "IDEMPOTENCY_KEY_REQUIRED",
      "Idempotency-Key header is required",
      400
    );
  }
  if (key.length > 200) {
    throw new ApiError("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key is too long", 400);
  }
  return key;
}

function itemResult(item: any) {
  if (item.result && typeof item.result === "object") return item.result;
  return {
    status: item.status,
    line_id: item.lineId,
    receipt_id: item.receiptId || null,
    ...(item.errorCode ? { code: item.errorCode } : {}),
    ...(item.errorMessage ? { message: item.errorMessage } : {}),
  };
}

export function bulkFeePaymentResponse(batch: any) {
  const results = (batch.items || []).map(itemResult);
  const paid = results.filter((item: any) => item.status === "paid").length;
  const alreadyPaid = results.filter((item: any) => item.status === "already_paid").length;
  const failed = results.filter((item: any) => item.status === "failed").length;
  const processed = paid + alreadyPaid + failed;
  return {
    batch_id: batch.id,
    status: processed === batch.totalItems ? "completed" : "processing",
    month: batch.month,
    payment_method: batch.paymentMethod,
    total: batch.totalItems,
    processed,
    remaining: Math.max(0, batch.totalItems - processed),
    paid,
    already_paid: alreadyPaid,
    failed,
    results,
    receipt_ids: results
      .map((item: any) => item.receipt_id)
      .filter((value: unknown): value is string => Boolean(value)),
  };
}

async function loadBatch(batchId: string) {
  return prisma.bulkFeePaymentBatch.findUnique({
    where: { id: batchId },
    include: { items: { orderBy: { position: "asc" } } },
  });
}

async function findOrCreateBatch(
  actorId: string,
  key: string,
  payload: ReturnType<typeof canonicalizeBulkFeePayment>,
  payloadHash: string,
  templateId: string
) {
  const existing = await prisma.bulkFeePaymentBatch.findUnique({
    where: { actorId_idempotencyKey: { actorId, idempotencyKey: key } },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (existing) return existing;

  try {
    return await runSerializableTransaction(prisma, async (tx) => {
      const batch = await tx.bulkFeePaymentBatch.create({
        data: {
          actorId,
          idempotencyKey: key,
          payloadHash,
          month: payload.month,
          paymentMethod: payload.payment_method,
          templateId,
          notes: payload.notes,
          totalItems: payload.line_ids.length,
        },
      });
      await tx.bulkFeePaymentItem.createMany({
        data: payload.line_ids.map((lineId, position) => ({
          batchId: batch.id,
          lineId,
          position,
        })),
      });
      return tx.bulkFeePaymentBatch.findUniqueOrThrow({
        where: { id: batch.id },
        include: { items: { orderBy: { position: "asc" } } },
      });
    });
  } catch (error: any) {
    if (error?.code !== "P2002") throw error;
    return prisma.bulkFeePaymentBatch.findUniqueOrThrow({
      where: { actorId_idempotencyKey: { actorId, idempotencyKey: key } },
      include: { items: { orderBy: { position: "asc" } } },
    });
  }
}

async function collectItem(batch: any, item: any, userId: string) {
  try {
    return await runSerializableTransaction(prisma, async (tx) => {
      const claimedItem = await tx.bulkFeePaymentItem.updateMany({
        where: { id: item.id, status: "pending" },
        data: { status: "processing" },
      });
      if (claimedItem.count !== 1) {
        return tx.bulkFeePaymentItem.findUniqueOrThrow({ where: { id: item.id } });
      }

      // Resolve only the lock identity, then re-read authoritative fee state under the lock.
      const lineIdentity = await tx.monthlyFeeLine.findUnique({
        where: { id: item.lineId },
        select: { studentId: true, month: true },
      });
      if (!lineIdentity) throw new ApiError("NOT_FOUND", "Monthly fee line not found", 404);
      await acquireAttendanceFeeAdvisoryLocks(
        tx,
        [lineIdentity.studentId],
        lineIdentity.month,
      );

      const line = await tx.monthlyFeeLine.findUnique({
        where: { id: item.lineId },
        include: {
          monthlyFee: true,
          student: true,
          class: { include: { teacher: true } },
          receipt: true,
        },
      });
      if (!line) throw new ApiError("NOT_FOUND", "Monthly fee line not found", 404);
      if (line.month !== batch.month) {
        throw new ApiError("MONTH_MISMATCH", "Monthly fee line does not belong to the requested month", 400);
      }

      if (line.status === "paid") {
        if (!line.receipt) {
          throw new ApiError(
            "FEE_LINE_ALREADY_PAID",
            "Monthly fee line is paid but receipt linkage is missing",
            409
          );
        }
        const result = {
          status: "already_paid",
          student_id: line.studentId,
          student_name: line.student?.fullName || null,
          fee_id: line.monthlyFeeId,
          line_id: line.id,
          class_id: line.classId,
          class_name: line.classNameSnapshot,
          receipt_id: line.receipt.id,
          total_days: line.chargedSessions,
          total_amount: line.amount,
        };
        return tx.bulkFeePaymentItem.update({
          where: { id: item.id },
          data: { status: "already_paid", receiptId: line.receipt.id, result, processedAt: new Date() },
        });
      }

      if (!["ready", "pending", "confirmed"].includes(line.status)) {
        throw new ApiError("INVALID_STATUS", `Cannot pay line: current status is ${line.status}`, 400);
      }
      if (Number(line.amount || 0) <= 0) {
        throw new ApiError("NO_CHARGEABLE_AMOUNT", "No tuition amount to collect", 409);
      }
      if (Number(line.chargedSessions || 0) <= 0) {
        throw new ApiError(
          "ZERO_DAY_POSITIVE_RECEIPT",
          "Cannot collect a positive tuition fee line with zero chargeable sessions",
          409
        );
      }

      const receipt = await tx.receipt.create({
        data: {
          studentId: line.studentId,
          month: line.month,
          daysCount: line.chargedSessions,
          feePerDay: line.feePerSession,
          amount: line.amount,
          paymentMethod: batch.paymentMethod,
          templateId: batch.templateId,
          notes: batch.notes || undefined,
          createdById: userId,
        },
      });
      const claimedLine = await tx.monthlyFeeLine.updateMany({
        where: {
          id: line.id,
          status: { in: ["ready", "pending", "confirmed"] },
          receiptId: null,
        },
        data: { status: "paid", receiptId: receipt.id, paidAt: new Date(), notes: batch.notes },
      });
      if (claimedLine.count !== 1) {
        throw new ApiError(
          "FEE_LINE_PAYMENT_CONFLICT",
          "Monthly fee line is already being processed or linked",
          409
        );
      }
      await tx.receiptLine.create({ data: receiptLineDataFromMonthlyFeeLine(line, receipt.id) });
      await refreshMonthlyFeeAggregateFromLines(tx, line.monthlyFeeId);

      const result = {
        status: "paid",
        student_id: line.studentId,
        student_name: line.student?.fullName || null,
        fee_id: line.monthlyFeeId,
        line_id: line.id,
        class_id: line.classId,
        class_name: line.classNameSnapshot,
        receipt_id: receipt.id,
        total_days: line.chargedSessions,
        total_amount: line.amount,
      };
      return tx.bulkFeePaymentItem.update({
        where: { id: item.id },
        data: { status: "paid", receiptId: receipt.id, result, processedAt: new Date() },
      });
    }, { transactionOptions: BULK_PAY_TRANSACTION_OPTIONS });
  } catch (error: any) {
    return prisma.bulkFeePaymentItem.update({
      where: { id: item.id },
      data: {
        status: "failed",
        errorCode: error?.code || "COLLECT_FAILED",
        errorMessage: error?.message || "Cannot collect fee",
        result: {
          status: "failed",
          line_id: item.lineId,
          code: error?.code || "COLLECT_FAILED",
          message: error?.message || "Cannot collect fee",
        },
        processedAt: new Date(),
      },
    });
  }
}

async function processBatch(batch: any, userId: string) {
  const pending = batch.items
    .filter((item: any) => !TERMINAL_ITEM_STATUSES.includes(item.status))
    .slice(0, ITEMS_PER_INVOCATION);
  for (const item of pending) await collectItem(batch, item, userId);

  const refreshed = await loadBatch(batch.id);
  if (!refreshed) throw new ApiError("BATCH_NOT_FOUND", "Bulk payment batch not found", 404);
  const response = bulkFeePaymentResponse(refreshed);
  await prisma.bulkFeePaymentBatch.update({
    where: { id: batch.id },
    data: {
      status: response.status,
      processedItems: response.processed,
      response,
      completedAt: response.status === "completed" ? new Date() : null,
    },
  });
  return response;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const key = idempotencyKey(req);
    let payload: ReturnType<typeof canonicalizeBulkFeePayment>;
    try {
      payload = canonicalizeBulkFeePayment({
        line_ids: req.body?.line_ids,
        month: req.body?.month,
        payment_method: req.body?.payment_method,
        template_id: req.body?.template_id,
        notes: req.body?.notes,
      });
    } catch (error: any) {
      throw new ApiError("INVALID_BULK_PAY_PAYLOAD", error.message, 400);
    }
    parseMonthRange(payload.month);
    if (!["cash", "transfer"].includes(payload.payment_method)) {
      throw new ApiError("INVALID_PAYMENT_METHOD", "Invalid payment method", 400);
    }

    const payloadHash = hashBulkFeePaymentPayload(payload);
    const templateId = await resolveTemplateId("receipt", payload.template_id || undefined);
    const batch = await findOrCreateBatch(req.user.id, key, payload, payloadHash, templateId);
    if (batch.payloadHash !== payloadHash) {
      throw new ApiError(
        "IDEMPOTENCY_KEY_REUSED",
        "Idempotency-Key was already used with a different payload",
        409
      );
    }

    if (batch.status === "completed" && batch.response) {
      return successResponse(res, batch.response);
    }
    const response = await processBatch(batch, req.user.id);

    try {
      await logActivity(req, req.user.id, "BULK_COLLECT_FEE", "bulk_fee_payment_batch", batch.id);
    } catch (error) {
      logApiError(error, {
        code: "ACTIVITY_LOG_FAILED",
        batchId: batch.id,
        actorId: req.user.id,
      });
    }
    return successResponse(res, response, response.status === "completed" ? 200 : 202);
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_BULK_PAY_ERROR");
  }
}

export default requireAuth(handler);
