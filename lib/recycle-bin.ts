import { ApiError } from "./api-utils.js";
import { isCorrectionNote } from "./finance-corrections.js";

export type RecycleResource = "students" | "parents" | "receipts" | "payments";
export type RecycleAction = "restore" | "purge";

function toDateOnly(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function studentDto(student: any) {
  return {
    resource: "students",
    id: student.id,
    label: student.fullName,
    full_name: student.fullName,
    parent_name: student.parent?.fullName || null,
    status: student.status,
    deleted_at: toDateOnly(student.deletedAt),
    created_at: student.createdAt,
  };
}

function parentDto(parent: any) {
  return {
    resource: "parents",
    id: parent.id,
    label: parent.fullName,
    full_name: parent.fullName,
    phone: parent.phone,
    relationship: parent.relationship,
    children_count: parent.students?.length || 0,
    deleted_at: toDateOnly(parent.deletedAt),
    created_at: parent.createdAt,
  };
}

function receiptDto(receipt: any) {
  return {
    resource: "receipts",
    id: receipt.id,
    label: `${receipt.student?.fullName || "Receipt"} ${receipt.month}`,
    student_name: receipt.student?.fullName || null,
    month: receipt.month,
    amount: receipt.amount,
    is_correction: isCorrectionNote(receipt.notes),
    deleted_at: toDateOnly(receipt.deletedAt),
    created_at: receipt.createdAt,
  };
}

function paymentDto(payment: any) {
  return {
    resource: "payments",
    id: payment.id,
    label: payment.recipientName,
    category: payment.category,
    recipient_name: payment.recipientName,
    amount: payment.amount,
    deleted_at: toDateOnly(payment.deletedAt),
    created_at: payment.createdAt,
  };
}

export async function listDeletedItems(prisma: any, resource?: RecycleResource) {
  const resources: RecycleResource[] = resource
    ? [resource]
    : ["students", "parents", "receipts", "payments"];
  const result: Record<RecycleResource, any[]> = {
    students: [],
    parents: [],
    receipts: [],
    payments: [],
  };

  if (resources.includes("students")) {
    const rows = await prisma.student.findMany({
      where: { deletedAt: { not: null } },
      include: { parent: { select: { fullName: true } } },
      orderBy: { deletedAt: "desc" },
      take: 200,
    });
    result.students = rows.map(studentDto);
  }

  if (resources.includes("parents")) {
    const rows = await prisma.parent.findMany({
      where: { deletedAt: { not: null } },
      include: {
        students: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
      orderBy: { deletedAt: "desc" },
      take: 200,
    });
    result.parents = rows.map(parentDto);
  }

  if (resources.includes("receipts")) {
    const rows = await prisma.receipt.findMany({
      where: { deletedAt: { not: null } },
      include: { student: { select: { fullName: true } } },
      orderBy: { deletedAt: "desc" },
      take: 200,
    });
    result.receipts = rows.map(receiptDto);
  }

  if (resources.includes("payments")) {
    const rows = await prisma.payment.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 200,
    });
    result.payments = rows.map(paymentDto);
  }

  return {
    resource: resource || "all",
    items: resources.flatMap((key) => result[key]),
    by_resource: result,
  };
}

async function restoreStudent(prisma: any, id: string) {
  const student = await prisma.student.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!student) throw new ApiError("NOT_FOUND", "Deleted student not found", 404);
  return prisma.student.update({
    where: { id },
    data: { deletedAt: null, status: "active" },
  });
}

async function restoreParent(prisma: any, id: string) {
  const parent = await prisma.parent.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!parent) throw new ApiError("NOT_FOUND", "Deleted parent not found", 404);
  return prisma.parent.update({ where: { id }, data: { deletedAt: null } });
}

async function restoreReceipt(prisma: any, id: string) {
  const receipt = await prisma.receipt.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!receipt) throw new ApiError("NOT_FOUND", "Deleted receipt not found", 404);
  if (isCorrectionNote(receipt.notes)) {
    throw new ApiError(
      "CORRECTED_RECEIPT_CANNOT_BE_RESTORED",
      "Corrected financial receipts cannot be restored. Re-collect the recalculated monthly fee instead.",
      409
    );
  }
  return prisma.receipt.update({ where: { id }, data: { deletedAt: null } });
}

async function restorePayment(prisma: any, id: string) {
  const payment = await prisma.payment.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!payment) throw new ApiError("NOT_FOUND", "Deleted payment not found", 404);
  return prisma.payment.update({ where: { id }, data: { deletedAt: null } });
}

async function purgeStudent(prisma: any, id: string) {
  const student = await prisma.student.findFirst({
    where: { id, deletedAt: { not: null } },
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
  if (!student) throw new ApiError("NOT_FOUND", "Deleted student not found", 404);
  const count = student._count;
  if (count.attendance || count.monthlyFees || count.receipts || count.studentClasses) {
    throw new ApiError(
      "HAS_DEPENDENCIES",
      "Student has operational records and cannot be permanently purged",
      400
    );
  }
  return prisma.student.delete({ where: { id } });
}

async function purgeParent(prisma: any, id: string) {
  const parent = await prisma.parent.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!parent) throw new ApiError("NOT_FOUND", "Deleted parent not found", 404);
  const childCount = await prisma.student.count({ where: { parentId: id } });
  if (childCount > 0) {
    throw new ApiError("HAS_DEPENDENCIES", "Parent still has linked students", 400);
  }
  return prisma.parent.delete({ where: { id } });
}

async function purgeReceipt(prisma: any, id: string) {
  const receipt = await prisma.receipt.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!receipt) throw new ApiError("NOT_FOUND", "Deleted receipt not found", 404);
  return prisma.$transaction(async (tx: any) => {
    await tx.monthlyFee.updateMany({
      where: { receiptId: id },
      data: { receiptId: null, status: "confirmed", paidAt: null },
    });
    return tx.receipt.delete({ where: { id } });
  });
}

async function purgePayment(prisma: any, id: string) {
  const payment = await prisma.payment.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!payment) throw new ApiError("NOT_FOUND", "Deleted payment not found", 404);
  return prisma.payment.delete({ where: { id } });
}

export async function runRecycleAction(
  prisma: any,
  resource: RecycleResource,
  action: RecycleAction,
  id: string
) {
  if (resource === "students" && action === "restore") return restoreStudent(prisma, id);
  if (resource === "parents" && action === "restore") return restoreParent(prisma, id);
  if (resource === "receipts" && action === "restore") return restoreReceipt(prisma, id);
  if (resource === "payments" && action === "restore") return restorePayment(prisma, id);
  if (resource === "students" && action === "purge") return purgeStudent(prisma, id);
  if (resource === "parents" && action === "purge") return purgeParent(prisma, id);
  if (resource === "receipts" && action === "purge") return purgeReceipt(prisma, id);
  if (resource === "payments" && action === "purge") return purgePayment(prisma, id);
  throw new ApiError("UNSUPPORTED_ACTION", "Unsupported recycle-bin action", 400);
}
