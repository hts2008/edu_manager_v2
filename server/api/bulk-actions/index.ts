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
  const student = await prisma.student.findUnique({ where: { id }, select: { id: true } });
  if (!student) return notFound(id, "archive");

  await prisma.student.update({ where: { id }, data: { status: "inactive" } });
  return { id, action: "archive", success: true };
}

async function deleteStudent(id: string): Promise<BulkResult> {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          attendance: true,
          monthlyFees: true,
          receipts: true,
          studentClasses: true,
        },
      },
    },
  });
  if (!student) return notFound(id, "delete");

  const count = student._count;
  if (count.attendance || count.monthlyFees || count.receipts || count.studentClasses) {
    return dependencyError(
      id,
      "delete",
      "Student has attendance, fee, receipt, or class records; archive instead"
    );
  }

  await prisma.student.delete({ where: { id } });
  return { id, action: "delete", success: true };
}

async function deleteParent(id: string): Promise<BulkResult> {
  const parent = await prisma.parent.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!parent) return notFound(id, "delete");
  if (parent._count.students > 0) {
    return dependencyError(id, "delete", "Parent has linked students");
  }

  await prisma.parent.delete({ where: { id } });
  return { id, action: "delete", success: true };
}

async function deleteReceipt(id: string): Promise<BulkResult> {
  const receipt = await prisma.receipt.findUnique({ where: { id }, select: { id: true } });
  if (!receipt) return notFound(id, "delete");

  await prisma.$transaction(async (tx) => {
    await tx.monthlyFee.updateMany({
      where: { receiptId: id },
      data: { receiptId: null, status: "confirmed", paidAt: null },
    });
    await tx.receipt.delete({ where: { id } });
  });
  return { id, action: "delete", success: true };
}

async function deletePayment(id: string): Promise<BulkResult> {
  const payment = await prisma.payment.findUnique({ where: { id }, select: { id: true } });
  if (!payment) return notFound(id, "delete");

  await prisma.payment.delete({ where: { id } });
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
