import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { errorResponse, handleCors, successResponse } from "../../../lib/auth.js";
import { sendApiError, toDateOnly } from "../../../lib/api-utils.js";
import { verifyParentToken } from "../../../lib/parent-auth.js";

export function feeToDto(fee: any) {
  return {
    id: fee.id,
    student_id: fee.studentId,
    student_name: fee.student?.fullName || null,
    month: fee.month,
    total_days: fee.totalDays,
    total_amount: fee.totalAmount,
    status: fee.status,
    receipt_id: fee.receiptId,
    paid_at: fee.paidAt,
    lines: (fee.lines || []).map((line: any) => ({
      id: line.id,
      monthly_fee_line_id: line.id,
      monthly_fee_id: line.monthlyFeeId,
      class_id: line.classId,
      class_name: line.classNameSnapshot || line.class?.className || null,
      teacher_name: line.teacherNameSnapshot || line.class?.teacher?.fullName || null,
      charged_sessions: line.chargedSessions,
      expected_sessions: line.expectedSessions,
      fee_per_session: line.feePerSession,
      amount: line.amount,
      expected_amount: line.amount,
      paid_amount: line.status === "paid" ? line.amount : 0,
      outstanding_amount: line.status === "paid" ? 0 : line.amount,
      status: line.status,
      receipt_id: line.receiptId,
      paid_at: line.paidAt,
    })),
  };
}

function receiptToDto(receipt: any) {
  return {
    id: receipt.id,
    student_id: receipt.studentId,
    student_name: receipt.student?.fullName || null,
    month: receipt.month,
    amount: receipt.amount,
    payment_method: receipt.paymentMethod,
    created_at: receipt.createdAt,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const auth = verifyParentToken(req);
    const since = new Date();
    since.setDate(since.getDate() - 365);
    const parent = await prisma.parent.findFirst({
      where: { id: auth.parentId, deletedAt: null },
      include: {
        students: {
          where: { deletedAt: null },
          include: {
            monthlyFees: {
              orderBy: { month: "desc" },
              take: 24,
              include: {
                lines: {
                  include: { class: { include: { teacher: true } } },
                  orderBy: [{ classNameSnapshot: "asc" }, { createdAt: "asc" }],
                },
              },
            },
            receipts: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 24,
            },
            attendance: {
              where: { attendanceDate: { gte: since } },
              orderBy: { attendanceDate: "desc" },
              take: 500,
            },
          },
        },
      },
    });

    if (!parent) {
      return errorResponse(res, "PARENT_NOT_FOUND", "Parent not found", 404);
    }

    const students = parent.students.map((student: any) => ({
      id: student.id,
      full_name: student.fullName,
      date_of_birth: toDateOnly(student.dateOfBirth),
      status: student.status,
      attendance: student.attendance.map((record: any) => ({
        id: record.id,
        date: toDateOnly(record.attendanceDate),
        status: record.status,
        class_id: record.classId,
        notes: record.notes,
      })),
      fees: student.monthlyFees.map((fee: any) =>
        feeToDto({ ...fee, student })
      ),
      receipts: student.receipts.map((receipt: any) =>
        receiptToDto({ ...receipt, student })
      ),
    }));

    return successResponse(res, {
      parent: {
        id: parent.id,
        full_name: parent.fullName,
        phone: parent.phone,
        email: parent.email,
        relationship: parent.relationship,
      },
      students,
      summary: {
        student_count: students.length,
        unpaid_fee_count: students.reduce(
          (sum: number, student: any) =>
            sum + student.fees.filter((fee: any) => fee.status !== "paid").length,
          0
        ),
      },
    });
  } catch (error) {
    return sendApiError(res, error, "PARENT_PORTAL_ERROR");
  }
}
