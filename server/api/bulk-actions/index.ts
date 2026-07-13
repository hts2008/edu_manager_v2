import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { ApiError, logActivity, sendApiError } from "../../../lib/api-utils.js";
import { bulkActionSchema, validateBody } from "../../../lib/validation.js";
import { deactivateEnrollmentPeriods } from "../../../lib/enrollment.js";
import { acquireAttendanceFeeAdvisoryLocks } from "../../../lib/attendance-lock-transaction.js";
import { runSerializableTransaction } from "../../../lib/serializable-transaction.js";

type BulkResource = "students" | "parents" | "receipts" | "payments";
type BulkAction = "archive" | "delete";
type BulkResult = {
  id: string;
  success: boolean;
  action: BulkAction;
  error_code?: string;
  message?: string;
};

const supportedActions: Record<BulkResource, BulkAction[]> = {
  students: ["archive", "delete"],
  parents: ["delete"],
  receipts: ["delete"],
  payments: ["delete"],
};

const BULK_ACTION_TRANSACTION_OPTIONS = {
  maxAttempts: 3,
  baseDelayMs: 20,
  transactionOptions: {
    isolationLevel: "Serializable" as const,
    maxWait: 5_000,
    timeout: 15_000,
  },
};

function dependencyError(id: string, action: BulkAction, message: string): BulkResult {
  return {
    id,
    action,
    success: false,
    error_code: "HAS_DEPENDENCIES",
    message,
  };
}

function notFound(id: string, action: BulkAction): BulkResult {
  return {
    id,
    action,
    success: false,
    error_code: "NOT_FOUND",
    message: "Record not found",
  };
}

async function archiveStudent(id: string): Promise<BulkResult> {
  const student = await prisma.student.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!student) return notFound(id, "archive");

  await runSerializableTransaction(prisma, async (tx) => {
    await deactivateEnrollmentPeriods(tx, { studentId: id });
    await tx.student.update({ where: { id }, data: { status: "inactive" } });
  }, BULK_ACTION_TRANSACTION_OPTIONS);
  return { id, action: "archive", success: true };
}

async function deleteStudent(id: string): Promise<BulkResult> {
  const student = await prisma.student.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!student) return notFound(id, "delete");

  await runSerializableTransaction(prisma, async (tx) => {
    await deactivateEnrollmentPeriods(tx, { studentId: id });
    await tx.student.update({
      where: { id },
      data: { status: "inactive", deletedAt: new Date() },
    });
  }, BULK_ACTION_TRANSACTION_OPTIONS);
  return { id, action: "delete", success: true };
}

async function deleteParent(id: string): Promise<BulkResult> {
  const parent = await prisma.parent.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!parent) return notFound(id, "delete");
  const activeChildren = await prisma.student.count({
    where: { parentId: id, deletedAt: null },
  });
  if (activeChildren > 0) {
    return dependencyError(id, "delete", "Parent has linked students");
  }

  await prisma.parent.update({ where: { id }, data: { deletedAt: new Date() } });
  return { id, action: "delete", success: true };
}

async function deleteReceipt(id: string): Promise<BulkResult> {
  return runSerializableTransaction(prisma, async (tx) => {
    const receiptIdentity = await tx.receipt.findFirst({
      where: { id, deletedAt: null },
      select: { studentId: true, month: true },
    });
    if (!receiptIdentity) return notFound(id, "delete");

    await acquireAttendanceFeeAdvisoryLocks(
      tx,
      [receiptIdentity.studentId],
      receiptIdentity.month,
    );
    const receipt = await tx.receipt.findFirst({
      where: { id, deletedAt: null },
    });
    if (!receipt) return notFound(id, "delete");
    if (
      receipt.studentId !== receiptIdentity.studentId ||
      receipt.month !== receiptIdentity.month
    ) {
      throw new ApiError(
        "RECEIPT_STATE_CONFLICT",
        "Receipt identity changed while it was being deleted",
        409,
        { retryable: true },
      );
    }

    await tx.monthlyFee.updateMany({
      where: { receiptId: receipt.id },
      data: { receiptId: null, status: "confirmed", paidAt: null },
    });
    const claimed = await tx.receipt.updateMany({
      where: {
        id: receipt.id,
        deletedAt: null,
        studentId: receiptIdentity.studentId,
        month: receiptIdentity.month,
      },
      data: { deletedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new ApiError(
        "RECEIPT_STATE_CONFLICT",
        "Receipt changed while it was being deleted",
        409,
        { retryable: true },
      );
    }

    return { id, action: "delete", success: true };
  }, BULK_ACTION_TRANSACTION_OPTIONS);
}

async function deletePayment(id: string): Promise<BulkResult> {
  const payment = await prisma.payment.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!payment) return notFound(id, "delete");

  await prisma.payment.update({ where: { id }, data: { deletedAt: new Date() } });
  return { id, action: "delete", success: true };
}

async function runAction(
  resource: BulkResource,
  action: BulkAction,
  id: string
): Promise<BulkResult> {
  try {
    if (resource === "students" && action === "archive") return archiveStudent(id);
    if (resource === "students" && action === "delete") return deleteStudent(id);
    if (resource === "parents" && action === "delete") return deleteParent(id);
    if (resource === "receipts" && action === "delete") return deleteReceipt(id);
    if (resource === "payments" && action === "delete") return deletePayment(id);
  } catch (error) {
    return {
      id,
      action,
      success: false,
      error_code: "SERVER_ERROR",
      message: error instanceof Error ? error.message : "Bulk action failed",
    };
  }

  return {
    id,
    action,
    success: false,
    error_code: "UNSUPPORTED_ACTION",
    message: "Unsupported bulk action",
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  try {
    const body = validateBody(bulkActionSchema, req.body);
    const resource = body.resource as BulkResource;
    const action = body.action as BulkAction;
    const ids = [...new Set(body.ids)];

    if (!supportedActions[resource].includes(action)) {
      throw new ApiError(
        "UNSUPPORTED_ACTION",
        `${action} is not supported for ${resource}`,
        400
      );
    }

    const results: BulkResult[] = [];
    for (const id of ids) {
      results.push(await runAction(resource, action, id));
    }

    const succeeded = results.filter((result) => result.success).length;
    const failed = results.length - succeeded;

    try {
      await logActivity(
        req,
        req.user.id,
        `BULK_${action.toUpperCase()}_${resource.toUpperCase()}`,
        resource,
        ids.join(",")
      );
    } catch (error) {
      console.warn("Bulk action audit log failed", error);
    }

    return successResponse(res, {
      resource,
      action,
      requested: ids.length,
      succeeded,
      failed,
      results,
    });
  } catch (error) {
    return sendApiError(res, error, "BULK_ACTION_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
