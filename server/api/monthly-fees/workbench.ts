import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { getString, parseMonthRange, sendApiError } from "../../../lib/api-utils.js";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseLimit(value: string | undefined, fallback = 500) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 1000);
}

function studentToDto(student: any) {
  const classIds =
    student.studentClasses
      ?.map((studentClass: any) => studentClass.class?.id)
      .filter(Boolean) || [];
  const classNames =
    student.studentClasses
      ?.map((studentClass: any) => studentClass.class?.className)
      .filter(Boolean)
      .join(", ") || null;

  return {
    id: student.id,
    full_name: student.fullName,
    fullName: student.fullName,
    phone: student.phone,
    email: student.email,
    status: student.status,
    parent_id: student.parentId,
    parentId: student.parentId,
    parent_name: student.parent?.fullName || null,
    parentName: student.parent?.fullName || null,
    parent_phone: student.parent?.phone || null,
    parentPhone: student.parent?.phone || null,
    class_ids: classIds,
    classIds,
    class_names: classNames,
    classNames,
  };
}

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
    studentId: fee.studentId,
    student_name: fee.student?.fullName || null,
    studentName: fee.student?.fullName || null,
    parent_name: fee.student?.parent?.fullName || null,
    parentName: fee.student?.parent?.fullName || null,
    parent_phone: fee.student?.parent?.phone || null,
    parentPhone: fee.student?.parent?.phone || null,
    class_ids: classIds,
    classIds,
    class_names: classNames,
    classNames,
    month: fee.month,
    total_days: fee.totalDays,
    totalDays: fee.totalDays,
    total_amount: fee.totalAmount,
    totalAmount: fee.totalAmount,
    status: fee.status,
    receipt_id: fee.receiptId,
    receiptId: fee.receiptId,
    paid_at: fee.paidAt,
    paidAt: fee.paidAt,
    notes: fee.notes,
    created_at: fee.createdAt,
    createdAt: fee.createdAt,
    updated_at: fee.updatedAt,
    updatedAt: fee.updatedAt,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const month = getString(req.query.month) || currentMonthKey();
    parseMonthRange(month);

    const classId = getString(req.query.class_id || req.query.classId);
    const status = getString(req.query.status);
    const limit = parseLimit(getString(req.query.limit), 500);

    const studentWhere: any = {
      status: "active",
      deletedAt: null,
    };

    if (classId && classId !== "all") {
      studentWhere.studentClasses = {
        some: {
          classId,
          status: "active",
        },
      };
    }

    const rawStudents = await prisma.student.findMany({
      where: studentWhere,
      include: {
        parent: { select: { id: true, fullName: true, phone: true } },
        studentClasses: {
          where: { status: "active" },
          include: { class: { select: { id: true, className: true } } },
        },
      },
      orderBy: { fullName: "asc" },
      take: limit,
    });

    const studentIds = rawStudents.map((student) => student.id);
    const feeWhere: any = {
      month,
      studentId: { in: studentIds },
    };
    if (status && status !== "all") feeWhere.status = status;

    const rawFees =
      studentIds.length > 0
        ? await prisma.monthlyFee.findMany({
            where: feeWhere,
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
          })
        : [];

    const students = rawStudents.map(studentToDto);
    const fees = rawFees.map(feeToDto);
    const feeByStudentId = new Map(fees.map((fee) => [fee.student_id, fee]));
    const rows = students.map((student) => feeByStudentId.get(student.id));
    const summary = {
      month,
      class_id: classId || "all",
      total: students.length,
      pending: rows.filter((fee) => !fee || fee.status === "pending").length,
      ready: rows.filter((fee) => fee?.status === "ready").length,
      confirmed: rows.filter((fee) => fee?.status === "confirmed").length,
      paid: rows.filter((fee) => fee?.status === "paid").length,
      total_amount: rows.reduce(
        (sum, fee) => sum + Number(fee?.total_amount || 0),
        0
      ),
      paid_amount: rows
        .filter((fee) => fee?.status === "paid")
        .reduce((sum, fee) => sum + Number(fee?.total_amount || 0), 0),
    };

    return successResponse(res, {
      month,
      students,
      fees,
      summary,
    });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEES_WORKBENCH_ERROR");
  }
}

export default requireAuth(handler);
