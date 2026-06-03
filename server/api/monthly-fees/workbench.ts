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
import {
  detectMonthlyFeeAnomaly,
  detectReceiptAnomaly,
} from "../../../lib/finance-corrections.js";
import { monthlyFeeLineToDto } from "../../../lib/monthly-fee-lines.js";

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

function feeToDto(fee: any, student: any | undefined) {
  const receipt = fee.receipt || null;
  const anomaly =
    detectReceiptAnomaly(receipt || {}) || detectMonthlyFeeAnomaly(fee);
  return {
    id: fee.id,
    student_id: fee.studentId,
    studentId: fee.studentId,
    student_name: student?.fullName || null,
    studentName: student?.fullName || null,
    parent_name: student?.parent?.fullName || null,
    parentName: student?.parent?.fullName || null,
    parent_phone: student?.parent?.phone || null,
    parentPhone: student?.parent?.phone || null,
    class_ids:
      student?.studentClasses
        ?.map((studentClass: any) => studentClass.class?.id)
        .filter(Boolean) || [],
    classIds:
      student?.studentClasses
        ?.map((studentClass: any) => studentClass.class?.id)
        .filter(Boolean) || [],
    class_names:
      student?.studentClasses
        ?.map((studentClass: any) => studentClass.class?.className)
        .filter(Boolean)
        .join(", ") || null,
    classNames:
      student?.studentClasses
        ?.map((studentClass: any) => studentClass.class?.className)
        .filter(Boolean)
        .join(", ") || null,
    month: fee.month,
    total_days: fee.totalDays,
    totalDays: fee.totalDays,
    total_amount: fee.totalAmount,
    totalAmount: fee.totalAmount,
    status: fee.status,
    receipt_id: fee.receiptId,
    receiptId: fee.receiptId,
    receipt_days: receipt?.daysCount ?? null,
    receipt_amount: receipt?.amount ?? null,
    anomaly_code: anomaly,
    anomaly_message:
      anomaly === "RECEIPT_WITH_ZERO_DAYS"
        ? "Receipt has positive amount but zero chargeable sessions"
        : anomaly === "PAID_WITH_ZERO_DAYS"
        ? "Monthly fee is paid with positive amount but zero chargeable sessions"
        : null,
    needs_admin_review: Boolean(anomaly),
    paid_at: fee.paidAt,
    paidAt: fee.paidAt,
    notes: fee.notes,
    created_at: fee.createdAt,
    createdAt: fee.createdAt,
    updated_at: fee.updatedAt,
    updatedAt: fee.updatedAt,
  };
}

function lineRowToDto(line: any, student: any | undefined) {
  const base = monthlyFeeLineToDto(line, student);
  const anomaly =
    detectReceiptAnomaly(line.receipt || {}) ||
    (Number(line.amount || 0) > 0 && Number(line.chargedSessions || 0) <= 0
      ? "PAID_WITH_ZERO_DAYS"
      : null);

  return {
    ...base,
    id: line.id,
    row_id: line.id,
    fee_id: line.monthlyFeeId,
    class_ids: line.classId ? [line.classId] : [],
    class_names: base.class_name,
    full_name: base.student_name,
    parentPhone: base.parent_phone,
    receipt_days: line.receipt?.daysCount ?? null,
    receipt_amount: line.receipt?.amount ?? null,
    anomaly_code: anomaly,
    anomaly_message:
      anomaly === "PAID_WITH_ZERO_DAYS"
        ? "Fee line has positive amount but zero chargeable sessions"
        : null,
    needs_admin_review: Boolean(anomaly),
  };
}

function pendingLinePlaceholder(student: any, enrollment: any, month: string) {
  const classRecord = enrollment?.class || null;
  const rowId = `pending:${student.id}:${classRecord?.id || "unallocated"}`;
  return {
    id: rowId,
    row_id: rowId,
    line_id: null,
    fee_id: null,
    student_id: student.id,
    studentId: student.id,
    student_name: student.fullName,
    studentName: student.fullName,
    full_name: student.fullName,
    parent_name: student.parent?.fullName || null,
    parentName: student.parent?.fullName || null,
    parent_phone: student.parent?.phone || null,
    parentPhone: student.parent?.phone || null,
    class_id: classRecord?.id || null,
    class_name: classRecord?.className || null,
    class_ids: classRecord?.id ? [classRecord.id] : [],
    class_names: classRecord?.className || null,
    month,
    total_days: 0,
    days_count: 0,
    charged_sessions: 0,
    expected_sessions: 0,
    make_up_sessions: 0,
    extra_sessions: 0,
    fee_per_day: Number(classRecord?.feePerDay || 0),
    total_amount: 0,
    amount: 0,
    status: "pending",
    receipt_id: null,
    paid_at: null,
    allocation_confidence: "not_calculated",
    needs_admin_review: false,
  };
}

function legacyFeeClassRows(fee: any, student: any, month: string) {
  const enrollments = student.studentClasses || [];
  if (!enrollments.length) {
    const aggregate = feeToDto(fee, student);
    return [
      {
        ...aggregate,
        row_id: aggregate.id,
        line_id: null,
        fee_id: null,
        needs_admin_review: true,
        anomaly_code: aggregate.anomaly_code || "LEGACY_AGGREGATE_FEE",
        anomaly_message:
          aggregate.anomaly_message ||
          "Monthly fee has no class-level lines. Recalculate before collecting.",
      },
    ];
  }

  if (fee.status === "paid" || fee.receiptId || fee.paidAt) {
    const amountShare = Math.round(Number(fee.totalAmount || 0) / enrollments.length);
    const dayShare = Math.round(Number(fee.totalDays || 0) / enrollments.length);
    return enrollments.map((enrollment: any, index: number) => {
      const row = pendingLinePlaceholder(student, enrollment, month);
      const isLast = index === enrollments.length - 1;
      const amount = isLast
        ? Number(fee.totalAmount || 0) - amountShare * (enrollments.length - 1)
        : amountShare;
      const days = isLast
        ? Number(fee.totalDays || 0) - dayShare * (enrollments.length - 1)
        : dayShare;
      return {
        ...row,
        id: `legacy-paid:${fee.id}:${row.class_id || index}`,
        row_id: `legacy-paid:${fee.id}:${row.class_id || index}`,
        monthly_fee_id: fee.id,
        status: "paid",
        receipt_id: fee.receiptId,
        receiptId: fee.receiptId,
        paid_at: fee.paidAt,
        total_days: Math.max(0, days),
        days_count: Math.max(0, days),
        charged_sessions: Math.max(0, days),
        total_amount: Math.max(0, amount),
        amount: Math.max(0, amount),
        allocation_confidence: "legacy_estimated_split",
        needs_admin_review: true,
        anomaly_code: "LEGACY_AGGREGATE_FEE",
        anomaly_message:
          "Paid before class-level fee lines existed. Amount is displayed as an estimated class split for review.",
      };
    });
  }

  return enrollments.map((enrollment: any) => ({
    ...pendingLinePlaceholder(student, enrollment, month),
    monthly_fee_id: fee.id,
    allocation_confidence: "legacy_needs_recalculation",
  }));
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
          include: {
            class: {
              select: {
                id: true,
                className: true,
                feePerDay: true,
                scheduleDays: true,
                sessionsPerWeek: true,
                teacher: { select: { fullName: true } },
              },
            },
          },
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

    const rawFees =
      studentIds.length > 0
        ? await prisma.monthlyFee.findMany({
            where: feeWhere,
            select: {
              id: true,
              studentId: true,
              month: true,
              totalDays: true,
              totalAmount: true,
              status: true,
              receiptId: true,
              paidAt: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
              receipt: {
                select: {
                  id: true,
                  daysCount: true,
                  amount: true,
                  deletedAt: true,
                },
              },
              lines: {
                include: {
                  class: { include: { teacher: true } },
                  receipt: {
                    select: {
                      id: true,
                      daysCount: true,
                      amount: true,
                      deletedAt: true,
                    },
                  },
                },
                orderBy: [{ classNameSnapshot: "asc" }, { createdAt: "asc" }],
              },
            },
            orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
          })
        : [];

    const students = rawStudents.map(studentToDto);
    const studentById = new Map(rawStudents.map((student) => [student.id, student]));
    const fees = rawFees
      .map((fee) => feeToDto(fee, studentById.get(fee.studentId)))
      .sort((a, b) => {
        const statusCompare = String(a.status).localeCompare(String(b.status));
        if (statusCompare !== 0) return statusCompare;
        return String(a.student_name || "").localeCompare(String(b.student_name || ""));
      });
    const feeByStudentId = new Map(rawFees.map((fee) => [fee.studentId, fee]));
    const rows: any[] = [];
    for (const student of rawStudents) {
      const fee = feeByStudentId.get(student.id) as any;
      const lineRows = (fee?.lines || []).map((line: any) => lineRowToDto(line, student));
      const filteredLineRows = lineRows.filter((row: any) => {
        if (classId && classId !== "all" && row.class_id !== classId) return false;
        if (status && status !== "all" && row.status !== status) return false;
        return true;
      });
      if (filteredLineRows.length > 0) {
        rows.push(...filteredLineRows);
        continue;
      }
      if (fee) {
        const legacyRows = legacyFeeClassRows(fee, student, month);
        const filteredLegacyRows = legacyRows.filter((row: any) => {
          if (classId && classId !== "all" && row.class_id !== classId) return false;
          if (status && status !== "all" && row.status !== status) return false;
          return true;
        });
        rows.push(...filteredLegacyRows);
        continue;
      }

      const placeholders = student.studentClasses
        .filter((studentClass: any) => {
          if (classId && classId !== "all") return studentClass.classId === classId;
          return true;
        })
        .map((studentClass: any) => pendingLinePlaceholder(student, studentClass, month));
      if (status && status !== "all" && status !== "pending") continue;
      rows.push(...placeholders);
    }
    const summary = {
      month,
      class_id: classId || "all",
      total: rows.length,
      pending: rows.filter((fee) => !fee || fee.status === "pending").length,
      ready: rows.filter((fee) => fee?.status === "ready").length,
      confirmed: rows.filter((fee) => fee?.status === "confirmed").length,
      paid: rows.filter((fee) => fee?.status === "paid").length,
      total_amount: rows.reduce(
        (sum, fee) => sum + Number(fee?.total_amount || fee?.amount || 0),
        0
      ),
      paid_amount: rows
        .filter((fee) => fee?.status === "paid")
        .reduce((sum, fee) => sum + Number(fee?.total_amount || fee?.amount || 0), 0),
    };

    return successResponse(res, {
      month,
      students,
      fees,
      rows,
      summary,
    });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEES_WORKBENCH_ERROR");
  }
}

export default requireAuth(handler);
